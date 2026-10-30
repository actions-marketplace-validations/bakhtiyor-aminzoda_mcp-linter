import { asArray, asRecord, asString } from "../util/json.js";
import type { JsonValue } from "./types.js";
import {
  parseInitializeResult,
  parsePrompt,
  parseResource,
  parseResourceTemplate,
  parseTool,
} from "./parse.js";
import type {
  InitializeResult,
  Prompt,
  Resource,
  ResourceTemplate,
  ServerCapabilities,
  Tool,
} from "./types.js";
import { InitializeRejectedError } from "../transport/errors.js";
import { RpcError } from "../transport/jsonrpc.js";
import type { StdioClient } from "../transport/stdio.js";
import { VERSION } from "../version.js";

export interface ListError {
  readonly method: string;
  readonly message: string;
  readonly code: number | undefined;
}

export interface ServerSnapshot {
  readonly command: string;
  readonly protocolVersion: string | undefined;
  readonly requestedProtocolVersion: string;
  readonly capabilities: ServerCapabilities;
  readonly serverInfo: { name?: string; version?: string };
  readonly instructions: string | undefined;
  readonly tools: readonly Tool[];
  readonly resources: readonly Resource[];
  readonly resourceTemplates: readonly ResourceTemplate[];
  readonly prompts: readonly Prompt[];
  readonly listErrors: readonly ListError[];
  readonly strayStdout: readonly string[];
}

export interface CollectOptions {
  readonly requestedProtocolVersion: string;
  readonly maxPages: number;
}

const CLIENT_INFO = { name: "mcp-doctor", version: VERSION } as const;

export async function collectSnapshot(
  client: StdioClient,
  command: string,
  options: CollectOptions,
): Promise<ServerSnapshot> {
  let initializeRaw: JsonValue;
  try {
    initializeRaw = await client.request("initialize", {
      protocolVersion: options.requestedProtocolVersion,
      capabilities: { roots: { listChanged: false } },
      clientInfo: CLIENT_INFO,
    });
  } catch (error) {
    if (error instanceof RpcError) throw new InitializeRejectedError(error.code, error.message);
    throw error;
  }
  const initialize = parseInitializeResult(initializeRaw);
  client.notify("notifications/initialized");

  const capabilities = initialize.capabilities ?? {};
  const listErrors: ListError[] = [];

  const tools = capabilities.tools === undefined
    ? []
    : await listAll(client, "tools/list", "tools", parseTool, listErrors, options.maxPages);
  const resources = capabilities.resources === undefined
    ? []
    : await listAll(client, "resources/list", "resources", parseResource, listErrors, options.maxPages);
  const resourceTemplates = capabilities.resources === undefined
    ? []
    : await listAll(
        client,
        "resources/templates/list",
        "resourceTemplates",
        parseResourceTemplate,
        listErrors,
        options.maxPages,
        true,
      );
  const prompts = capabilities.prompts === undefined
    ? []
    : await listAll(client, "prompts/list", "prompts", parsePrompt, listErrors, options.maxPages);

  return {
    command,
    protocolVersion: initialize.protocolVersion,
    requestedProtocolVersion: options.requestedProtocolVersion,
    capabilities,
    serverInfo: initialize.serverInfo ?? {},
    instructions: initialize.instructions,
    tools,
    resources,
    resourceTemplates,
    prompts,
    listErrors,
    strayStdout: client.getUnparsedStdout(),
  };
}

/**
 * Drains one paginated list method. A failure is recorded and the items collected
 * so far are kept: a server that cannot page its second page still has an
 * auditable first page.
 */
async function listAll<T>(
  client: StdioClient,
  method: string,
  key: string,
  parse: (raw: unknown) => T,
  errors: ListError[],
  maxPages: number,
  optional = false,
): Promise<T[]> {
  const collected: T[] = [];
  let cursor: string | undefined;

  const pageLimit = Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 50;
  for (let page = 0; page < pageLimit; page += 1) {
    let result: JsonValue;
    try {
      result = await client.request(method, cursor === undefined ? {} : { cursor });
    } catch (error) {
      if (optional && error instanceof RpcError && error.isMethodNotFound) return collected;
      errors.push(toListError(method, error));
      return collected;
    }

    const record = asRecord(result);
    if (record === undefined) {
      errors.push({ method, message: "returned a result that is not an object", code: undefined });
      return collected;
    }

    for (const item of asArray(record[key])) collected.push(parse(item));

    const next = asString(record["nextCursor"]);
    if (next === undefined || next.length === 0) return collected;
    cursor = next;
  }

  errors.push({ method, message: `exceeded ${maxPages} pages of results`, code: undefined });
  return collected;
}

function toListError(method: string, error: unknown): ListError {
  if (error instanceof RpcError) {
    return { method, message: error.message, code: error.code };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { method, message, code: undefined };
}

export function describeServer(snapshot: ServerSnapshot): string {
  const name = snapshot.serverInfo.name ?? "unnamed server";
  const version = snapshot.serverInfo.version;
  return version === undefined ? name : `${name}@${version}`;
}

export function totalItems(snapshot: ServerSnapshot): number {
  return (
    snapshot.tools.length +
    snapshot.resources.length +
    snapshot.resourceTemplates.length +
    snapshot.prompts.length
  );
}

export function hasAnyCapability(snapshot: ServerSnapshot): boolean {
  const { tools, resources, prompts } = snapshot.capabilities;
  return tools !== undefined || resources !== undefined || prompts !== undefined;
}
