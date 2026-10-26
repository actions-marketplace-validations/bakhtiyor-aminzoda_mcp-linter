import type {
  InitializeResult,
  JsonObject,
  Prompt,
  PromptArgument,
  Resource,
  ResourceTemplate,
  ServerCapabilities,
  Tool,
  ToolAnnotations,
} from "./types.js";
import { asArray, asBoolean, asRecord, asString } from "../util/json.js";

/**
 * Normalizers from arbitrary server JSON to the structural types the rules read.
 * They never throw and never invent values: a missing field stays missing, so
 * rules can report on the absence rather than on a default we made up.
 */

function defined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;
}

function parseAnnotations(raw: unknown): ToolAnnotations | undefined {
  const record = asRecord(raw);
  if (record === undefined) return undefined;
  return defined<ToolAnnotations>({
    title: asString(record["title"]),
    readOnlyHint: asBoolean(record["readOnlyHint"]),
    destructiveHint: asBoolean(record["destructiveHint"]),
    idempotentHint: asBoolean(record["idempotentHint"]),
    openWorldHint: asBoolean(record["openWorldHint"]),
  });
}

export function parseTool(raw: unknown): Tool {
  const record = asRecord(raw) ?? {};
  return defined<Tool>({
    name: asString(record["name"]),
    title: asString(record["title"]),
    description: asString(record["description"]),
    inputSchema: asRecord(record["inputSchema"]) as JsonObject | undefined,
    outputSchema: asRecord(record["outputSchema"]) as JsonObject | undefined,
    annotations: parseAnnotations(record["annotations"]),
  });
}

export function parseResource(raw: unknown): Resource {
  const record = asRecord(raw) ?? {};
  return defined<Resource>({
    uri: asString(record["uri"]),
    name: asString(record["name"]),
    title: asString(record["title"]),
    description: asString(record["description"]),
    mimeType: asString(record["mimeType"]),
  });
}

export function parseResourceTemplate(raw: unknown): ResourceTemplate {
  const record = asRecord(raw) ?? {};
  return defined<ResourceTemplate>({
    uriTemplate: asString(record["uriTemplate"]),
    name: asString(record["name"]),
    title: asString(record["title"]),
    description: asString(record["description"]),
    mimeType: asString(record["mimeType"]),
  });
}

function parsePromptArgument(raw: unknown): PromptArgument {
  const record = asRecord(raw) ?? {};
  return defined<PromptArgument>({
    name: asString(record["name"]),
    description: asString(record["description"]),
    required: asBoolean(record["required"]),
  });
}

export function parsePrompt(raw: unknown): Prompt {
  const record = asRecord(raw) ?? {};
  return defined<Prompt>({
    name: asString(record["name"]),
    title: asString(record["title"]),
    description: asString(record["description"]),
    arguments: asArray(record["arguments"]).map(parsePromptArgument),
  });
}

export function parseInitializeResult(raw: unknown): InitializeResult {
  const record = asRecord(raw) ?? {};
  const capabilities = asRecord(record["capabilities"]);
  const serverInfo = asRecord(record["serverInfo"]);
  return defined<InitializeResult>({
    protocolVersion: asString(record["protocolVersion"]),
    capabilities: capabilities as ServerCapabilities | undefined,
    serverInfo: serverInfo === undefined
      ? undefined
      : defined({ name: asString(serverInfo["name"]), version: asString(serverInfo["version"]) }),
    instructions: asString(record["instructions"]),
  });
}
