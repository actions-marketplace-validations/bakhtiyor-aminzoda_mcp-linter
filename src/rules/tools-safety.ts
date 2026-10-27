import { classifyName, findInjectionPatterns } from "./helpers.js";
import { defineRule, issue, type Rule } from "./rule.js";

/**
 * Rules about what a tool can do to the world, and whether it says so. A client
 * cannot ask for confirmation on a destructive call it was never told is
 * destructive, so these findings are the difference between a prompt and a
 * silent deletion.
 */
export const toolSafetyRules: readonly Rule[] = [
  defineRule({
    id: "tools/annotations-missing",
    category: "tools",
    defaultSeverity: "info",
    summary: "tool has no annotations at all",
    rationale:
      "annotations is how a server describes the blast radius of a call — read-only, destructive, idempotent, open-world. Clients use it for confirmation prompts, and hosts use it for policy.",
    spec: "server/tools#tool-annotations",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.annotations === undefined)
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" has no annotations`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Set readOnlyHint and destructiveHint, and openWorldHint when the tool reaches the network.",
          }),
        ),
  }),

  defineRule({
    id: "tools/destructive-without-hint",
    category: "tools",
    defaultSeverity: "error",
    summary: "tool name implies a destructive action but destructiveHint is not set",
    rationale:
      "A client only warns the user or requires confirmation when destructiveHint is true. A delete_* tool that omits it gets called silently, and the first evidence of the problem is missing data.",
    spec: "server/tools#tool-annotations",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.name !== undefined && classifyName(tool.name) === "destructive")
        .filter((tool) => tool.annotations?.destructiveHint !== true)
        .map((tool) =>
          issue({
            message: `tool "${tool.name}" looks destructive but does not set destructiveHint`,
            subject: tool.name,
            subjectKind: "tool",
            hint: 'Set annotations.destructiveHint = true, or rename the tool if it is not destructive.',
          }),
        ),
  }),

  defineRule({
    id: "tools/read-only-without-hint",
    category: "tools",
    defaultSeverity: "warn",
    summary: "tool name implies a read-only action but readOnlyHint is not set",
    rationale:
      "Without readOnlyHint the client treats the call as potentially mutating: it may prompt the user, skip parallel execution, or block the call entirely in a locked-down host.",
    spec: "server/tools#tool-annotations",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.name !== undefined && classifyName(tool.name) === "read-only")
        .filter((tool) => tool.annotations?.readOnlyHint !== true)
        .map((tool) =>
          issue({
            message: `tool "${tool.name}" looks read-only but does not set readOnlyHint`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Set annotations.readOnlyHint = true so clients can call it without confirmation.",
          }),
        ),
  }),

  defineRule({
    id: "tools/annotation-conflict",
    category: "tools",
    defaultSeverity: "error",
    summary: "tool claims to be both read-only and destructive",
    rationale:
      "readOnlyHint and destructiveHint contradict each other. Clients resolve the contradiction differently, so the same server gets a confirmation dialog in one host and none in another.",
    spec: "server/tools#tool-annotations",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter(
          (tool) =>
            tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === true,
        )
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" sets readOnlyHint and destructiveHint together`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "A destructive tool cannot be read-only. Keep destructiveHint and drop readOnlyHint.",
          }),
        ),
  }),

  defineRule({
    id: "tools/description-injection",
    category: "security",
    defaultSeverity: "error",
    summary: "tool description contains text that reads as prompt injection",
    rationale:
      "Tool descriptions are model input, not documentation. Text that tells the model to ignore instructions, hide an action from the user, or send data to a URL is tool poisoning: the user sees a harmless-looking tool while the description drives the model.",
    spec: "security/tool-poisoning",
    check: ({ snapshot }) =>
      snapshot.tools.flatMap((tool) => {
        const description = tool.description;
        if (description === undefined) return [];
        return findInjectionPatterns(description).map((pattern) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" description ${pattern.label}`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Describe what the tool does. Never address the model, and never ask it to hide anything from the user.",
          }),
        );
      }),
  }),

  defineRule({
    id: "tools/title-missing",
    category: "tools",
    defaultSeverity: "info",
    summary: "tool has no human-readable title",
    rationale:
      "Some clients show the title in a permission prompt instead of the machine name, so a user is asked to approve `exec_sql_v2` rather than something they can judge.",
    spec: "server/tools",
    check: ({ snapshot }) =>
      snapshot.tools
        .filter((tool) => tool.title === undefined && tool.annotations?.title === undefined)
        .map((tool) =>
          issue({
            message: `tool "${tool.name ?? "(unnamed)"}" has no title`,
            subject: tool.name,
            subjectKind: "tool",
            hint: "Add a short title such as \"Run SQL query\".",
          }),
        ),
  }),
];
