import type { JsonValue } from "../mcp/types.js";

/**
 * JSON-RPC 2.0 over newline-delimited JSON, as the MCP stdio transport defines
 * it: one complete JSON message per line, no Content-Length framing.
 */

export interface RpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: JsonValue;
}

export interface RpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: JsonValue;
}

export interface RpcErrorObject {
  code: number;
  message: string;
  data?: JsonValue;
}

export interface RpcSuccess {
  jsonrpc: "2.0";
  id: number | string | null;
  result: JsonValue;
}

export interface RpcFailure {
  jsonrpc: "2.0";
  id: number | string | null;
  error: RpcErrorObject;
}

export type RpcResponse = RpcSuccess | RpcFailure;

/** JSON-RPC standard code for "method exists but is not available here". */
export const METHOD_NOT_FOUND = -32601;

export function isRpcResponse(message: unknown): message is RpcResponse {
  if (typeof message !== "object" || message === null) return false;
  const candidate = message as Record<string, unknown>;
  if (candidate.jsonrpc !== "2.0") return false;
  if (!("id" in candidate)) return false;
  return "result" in candidate || "error" in candidate;
}

export class RpcError extends Error {
  readonly code: number;
  readonly data: JsonValue | undefined;

  constructor(error: RpcErrorObject) {
    super(error.message);
    this.name = "RpcError";
    this.code = error.code;
    this.data = error.data;
  }

  get isMethodNotFound(): boolean {
    return this.code === METHOD_NOT_FOUND;
  }
}

/**
 * Splits an arbitrary stream of stdout chunks into whole lines. A chunk may end
 * mid-line, contain several lines, or contain a trailing partial line.
 */
export class LineBuffer {
  private pending = "";

  push(chunk: string): string[] {
    this.pending += chunk;
    const lines = this.pending.split("\n");
    this.pending = lines.pop() ?? "";
    return lines;
  }

  /** Returns and clears whatever is left over, if it holds a complete message. */
  flush(): string[] {
    const rest = this.pending.trim();
    this.pending = "";
    return rest.length > 0 ? [rest] : [];
  }
}
