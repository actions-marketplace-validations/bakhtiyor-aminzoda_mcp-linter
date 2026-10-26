/**
 * Wire types for the subset of the Model Context Protocol that mcp-doctor
 * inspects. Intentionally structural: fields are optional because the whole
 * point of the audit is to tolerate servers that omit them.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export const SUPPORTED_PROTOCOL_VERSIONS = [
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
] as const;

export type SupportedProtocolVersion = (typeof SUPPORTED_PROTOCOL_VERSIONS)[number];

export const PREFERRED_PROTOCOL_VERSION: SupportedProtocolVersion = "2025-06-18";

export interface Implementation {
  name?: string;
  version?: string;
  title?: string;
}

export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: JsonObject;
  completions?: JsonObject;
  experimental?: JsonObject;
  [key: string]: unknown;
}

export interface InitializeResult {
  protocolVersion?: string;
  capabilities?: ServerCapabilities;
  serverInfo?: Implementation;
  instructions?: string;
}

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  [key: string]: unknown;
}

export interface Tool {
  name?: string;
  title?: string;
  description?: string;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
  annotations?: ToolAnnotations;
  [key: string]: unknown;
}

export interface Resource {
  uri?: string;
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  [key: string]: unknown;
}

export interface ResourceTemplate {
  uriTemplate?: string;
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  [key: string]: unknown;
}

export interface PromptArgument {
  name?: string;
  description?: string;
  required?: boolean;
  [key: string]: unknown;
}

export interface Prompt {
  name?: string;
  title?: string;
  description?: string;
  arguments?: PromptArgument[];
  [key: string]: unknown;
}

export interface ListResult<T> {
  items: T[];
  nextCursor?: string;
}
