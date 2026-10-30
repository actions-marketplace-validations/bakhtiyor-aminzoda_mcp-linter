import type { JsonObject } from "../mcp/types.js";
import { asArray, asRecord, asString } from "../util/json.js";

/** Tool/argument names, per the MCP spec recommendation. */
export const NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** Below this length a description carries no usable information for a model. */
export const MIN_DESCRIPTION_LENGTH = 20;

/**
 * Above this length a description starts eating the client's context budget on
 * every single turn, which is the real cost of an over-long tool description.
 */
export const MAX_DESCRIPTION_LENGTH = 1024;

const DESTRUCTIVE_TOKENS = new Set([
  "delete",
  "remove",
  "drop",
  "destroy",
  "purge",
  "truncate",
  "erase",
  "wipe",
  "kill",
  "reset",
  "clear",
  "unlink",
  "revoke",
  "overwrite",
  "terminate",
  "shutdown",
]);

const READ_ONLY_TOKENS = new Set([
  "get",
  "list",
  "read",
  "search",
  "find",
  "fetch",
  "show",
  "describe",
  "count",
  "query",
  "view",
  "inspect",
  "lookup",
  "stat",
  "export",
  "preview",
]);
// "download" is deliberately absent: download_* tools usually write the file to
// disk (e.g. Figma's download_figma_images), so they are not read-only.

export type NameIntent = "destructive" | "read-only" | "unknown";

/**
 * Classifies a tool name by its verb. Used to compare what the name promises
 * against what the annotations claim, which is where real incidents come from:
 * a `delete_*` tool that never tells the client it is destructive.
 */
export function classifyName(name: string): NameIntent {
  const tokens = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);

  for (const token of tokens) {
    if (DESTRUCTIVE_TOKENS.has(token)) return "destructive";
  }
  for (const token of tokens) {
    if (READ_ONLY_TOKENS.has(token)) return "read-only";
  }
  return "unknown";
}

export interface InjectionPattern {
  readonly id: string;
  readonly pattern: RegExp;
  readonly label: string;
}

/**
 * Tool descriptions are model input. Text that instructs the model, hides an
 * action from the user, or points at a URL is tool poisoning — the description
 * becomes a prompt-injection vector the user never sees in the UI.
 */
export const INJECTION_PATTERNS: readonly InjectionPattern[] = [
  {
    id: "override-instructions",
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
    label: "tries to override prior instructions",
  },
  {
    id: "disregard-system",
    pattern: /disregard\s+(the\s+)?(system|developer|previous|above)/i,
    label: "tells the model to disregard the system prompt",
  },
  {
    id: "conceal-from-user",
    pattern: /(do\s+not|don'?t|never)\s+(tell|inform|notify|mention\s+to|reveal\s+to|disclose\s+to)\s+the\s+user/i,
    label: "instructs the model to hide something from the user",
  },
  {
    id: "conceal-without-asking",
    pattern: /without\s+(telling|informing|asking|notifying)\s+the\s+user/i,
    label: "instructs the model to act without the user noticing",
  },
  {
    id: "system-prompt-reference",
    pattern: /\b(system\s+prompt|developer\s+message|your\s+instructions\s+are)\b/i,
    label: "references the model's system prompt",
  },
  {
    id: "identity-override",
    pattern: /\byou\s+are\s+now\b|\bfrom\s+now\s+on\s+you\b/i,
    label: "attempts to replace the model's persona",
  },
  {
    id: "embedded-command-tags",
    pattern: /<\s*\/?\s*(important|system|secret|admin|override)\s*>/i,
    label: "embeds pseudo-system markup",
  },
  {
    id: "exfiltration-endpoint",
    pattern: /\b(send|post|upload|transmit|forward)\b[^.]{0,60}\bhttps?:\/\//i,
    label: "asks the model to send data to a URL",
  },
];

export function findInjectionPatterns(text: string): InjectionPattern[] {
  return INJECTION_PATTERNS.filter((candidate) => candidate.pattern.test(text));
}

export interface SchemaProperty {
  readonly name: string;
  readonly schema: Record<string, unknown>;
  readonly required: boolean;
}

/**
 * Reads `properties` out of an object schema without validating the schema
 * itself. Anything unexpected yields an empty list; a dedicated rule reports
 * the schema problem.
 */
export function schemaProperties(schema: JsonObject | undefined): SchemaProperty[] {
  const record = asRecord(schema);
  if (record === undefined) return [];

  const properties = asRecord(record["properties"]);
  if (properties === undefined) return [];

  const required = new Set(
    asArray(record["required"]).filter((entry): entry is string => typeof entry === "string"),
  );

  return Object.entries(properties).map(([name, rawSchema]) => ({
    name,
    schema: asRecord(rawSchema) ?? {},
    required: required.has(name),
  }));
}

export function schemaType(schema: JsonObject | undefined): string | undefined {
  return asString(asRecord(schema)?.["type"]);
}

/** Keywords that are valid JSON Schema but poorly supported by tool-call clients. */
export const FRAGILE_SCHEMA_KEYWORDS = ["$ref", "oneOf", "anyOf", "allOf", "not", "if", "patternProperties"] as const;

export function findFragileKeywords(schema: Record<string, unknown>, depth = 0): string[] {
  const found: string[] = [];
  if (depth > 6) return found;

  for (const keyword of FRAGILE_SCHEMA_KEYWORDS) {
    if (keyword in schema) found.push(keyword);
  }

  for (const value of Object.values(schema)) {
    const nested = asRecord(value);
    if (nested !== undefined) found.push(...findFragileKeywords(nested, depth + 1));
  }
  for (const entry of asArray(asRecord(schema["items"]) === undefined ? undefined : [schema["items"]])) {
    const nested = asRecord(entry);
    if (nested !== undefined) found.push(...findFragileKeywords(nested, depth + 1));
  }

  return found;
}
