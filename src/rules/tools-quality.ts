import { asRecord } from "../util/json.js";
import {
  MAX_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  NAME_PATTERN,
  findFragileKeywords,
  schemaProperties,
  schemaType,
} from "./helpers.js";
import { defineRule, issue, type Rule, type RuleIssue } from "./rule.js";

/**
 * Rules about whether a model can actually use the tools: is there a name, does
 * it look like every other tool, does the description say enough to choose the
 * tool and enough to call it correctly.
 */
export const toolQualityRules: readonly Rule[] = [
  defineRule({
    id: "tools/name-missing",
    category: "tools",
    defaultSeverity: "error",
    summary: "tool has no name",
    rationale:
      "The name is the identifier the model calls. A tool without one is unreachable and is usually a serialization bug in the server's list handler.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .map((tool, index) =>
          tool.name === undefined
            ? issue({
                message: `tool at index ${index} has no name`,
                subject: `#${index}`,
                subjectKind: "tool",
                hint: "Give every tool a unique, stable name.",
                pointer: `/tools/${index}/name`,
              })
            : null,
        )
        .filter((entry): entry is RuleIssue => entry !== null),
  }),

  defineRule({
    id: "tools/name-format",
    category: "tools",
    defaultSeverity: "warn",
    summary: "tool name uses characters outside [a-zA-Z0-9_-] or exceeds 64 chars",
    rationale:
      "Several clients and model APIs reject or transliterate names with dots, spaces, slashes or non-ASCII characters, which turns a working server into one that fails only on some hosts.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.name !== undefined && !NAME_PATTERN.test(tool.name))
        .map((tool) =>
          issue({
            message: `tool name "${tool.name}" does not match ${NAME_PATTERN.source}`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Rename using lowercase letters, digits, underscore or hyphen, at most 64 characters.",
          }),
        ),
  }),

  defineRule({
    id: "tools/duplicate-name",
    category: "tools",
    defaultSeverity: "error",
    summary: "two tools share the same name",
    rationale:
      "With duplicate names the model's call is ambiguous and the client resolves it arbitrarily, so one of the two tools can never be invoked.",
    spec: "server/tools",
    check: ({ snapshot }) => {
      const seen = new Map<string, number>();
      for (const tool of snapshot.tools) {
        if (tool.name === undefined) continue;
        seen.set(tool.name, (seen.get(tool.name) ?? 0) + 1);
      }
      return [...seen.entries()]
        .filter(([, count]) => count > 1)
        .map(([name, count]) =>
          issue({
            message: `tool name "${name}" is used by ${count} tools`,
            subject: name,
            subjectKind: "tool",
            hint: "Tool names must be unique within a server.",
          }),
        );
    },
  }),

  defineRule({
    id: "tools/description-missing",
    category: "tools",
    defaultSeverity: "error",
    summary: "tool has no description",
    rationale:
      "The description is the only thing the model sees when choosing between tools. Without it the model either never calls the tool or calls it with guessed arguments.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.description === undefined || tool.description.trim().length === 0)
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" has no description`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Describe what the tool does, when to use it, and what it returns.",
          }),
        ),
  }),

  defineRule({
    id: "tools/description-too-short",
    category: "tools",
    defaultSeverity: "warn",
    summary: `description shorter than ${MIN_DESCRIPTION_LENGTH} characters`,
    rationale:
      "A two-word description such as \"gets data\" gives the model no basis to prefer this tool over a similar one, which shows up as erratic tool selection rather than an obvious bug.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => {
          const description = tool.description?.trim();
          return description !== undefined && description.length > 0 && description.length < MIN_DESCRIPTION_LENGTH;
        })
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" description is ${tool.description?.trim().length ?? 0} characters`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Say what the tool does and what the model gets back, in a full sentence.",
          }),
        ),
  }),

  defineRule({
    id: "tools/description-too-long",
    category: "tools",
    defaultSeverity: "warn",
    summary: `description longer than ${MAX_DESCRIPTION_LENGTH} characters`,
    rationale:
      "Every description is resent on every turn. One verbose tool can dominate the context window and crowd out the conversation it was meant to help with.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => (tool.description?.length ?? 0) > MAX_DESCRIPTION_LENGTH)
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" description is ${tool.description?.length ?? 0} characters`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Move detail into the parameter descriptions or a resource instead.",
          }),
        ),
  }),

  defineRule({
    id: "tools/input-schema-missing",
    category: "tools",
    defaultSeverity: "error",
    summary: "tool has no inputSchema",
    rationale:
      "inputSchema is required by the specification. Without it a strict client rejects the tool outright and a lenient one lets the model invent arguments.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.inputSchema === undefined)
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" has no inputSchema`,
            subject: tool.name,
            subjectKind: "tool",
            hint: 'Use { "type": "object", "properties": {}, "additionalProperties": false } for a no-argument tool.',
          }),
        ),
  }),

  defineRule({
    id: "tools/input-schema-not-object",
    category: "tools",
    defaultSeverity: "error",
    summary: "inputSchema does not describe an object",
    rationale:
      "Tool arguments are always a JSON object. A schema typed as string or array makes the model emit a shape the server cannot parse.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.inputSchema !== undefined && schemaType(tool.inputSchema) !== "object")
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" inputSchema type is "${schemaType(tool.inputSchema) ?? "absent"}"`,
            subject: tool.name,
            subjectKind: "tool",
            hint: 'Wrap the arguments in an object schema: { "type": "object", "properties": { ... } }.',
          }),
        ),
  }),

  defineRule({
    id: "tools/parameter-description-missing",
    category: "tools",
    defaultSeverity: "warn",
    summary: "a declared parameter has no description",
    rationale:
      "Parameter names alone rarely disambiguate: is `id` a numeric row id, a UUID or a slug? Models fill that gap by guessing, and the guess is invisible until the call fails.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools.flatMap((tool) =>
        schemaProperties(tool.inputSchema)
          .filter((property) => typeof property.schema["description"] !== "string")
          .map((property) =>
            issue({
              message: `tool "${tool.name ?? "(unnamed)"}" parameter "${property.name}" has no description`,
              subject: tool.name,
              subjectKind: "tool",
              hint: "Describe the expected value and, where useful, give an example.",
              pointer: `/tools/…/inputSchema/properties/${property.name}`,
            }),
          ),
      ),
  }),

  defineRule({
    id: "tools/schema-fragile-keywords",
    category: "tools",
    defaultSeverity: "info",
    summary: "inputSchema uses keywords many tool-call clients handle poorly",
    rationale:
      "Composition keywords such as $ref, oneOf and allOf are valid JSON Schema but are frequently flattened or ignored by client-side validators, so the model sees a looser contract than the one you wrote.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools.flatMap((tool) => {
        const schema = asRecord(tool.inputSchema);
        if (schema === undefined) return [];
        const keywords = [...new Set(findFragileKeywords(schema))];
        if (keywords.length === 0) return [];
        return [
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" inputSchema uses ${keywords.join(", ")}`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Prefer a flat object schema with primitive properties where you can.",
          }),
        ];
      }),
  }),
];
