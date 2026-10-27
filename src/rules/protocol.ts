import { SUPPORTED_PROTOCOL_VERSIONS } from "../mcp/types.js";
import { hasAnyCapability } from "../mcp/session.js";
import { defineRule, issue, type Rule } from "./rule.js";

const KNOWN_VERSIONS = new Set<string>(SUPPORTED_PROTOCOL_VERSIONS);

export const protocolRules: readonly Rule[] = [
  defineRule({
    id: "protocol/version-missing",
    category: "protocol",
    defaultSeverity: "error",
    summary: "initialize result has no protocolVersion",
    rationale:
      "Clients negotiate behaviour from the version the server reports. Without it the client cannot know which features are safe to use and may fall back to an incompatible code path.",
    spec: "lifecycle/initialization",
    check: ({ snapshot }) =>
      snapshot.protocolVersion === undefined
        ? [
            issue({
              message: "initialize result did not include protocolVersion",
              subjectKind: "server",
              hint: "Echo the protocolVersion the client requested in your initialize result.",
              pointer: "/protocolVersion",
            }),
          ]
        : [],
  }),

  defineRule({
    id: "protocol/version-unsupported",
    category: "protocol",
    defaultSeverity: "error",
    summary: "server reports a protocol version mcp-doctor does not know",
    rationale:
      "An unknown version string usually means the server hard-coded a version instead of echoing the client's, or it is newer than the client and the negotiation silently failed.",
    spec: "lifecycle/initialization",
    check: ({ snapshot }) => {
      const version = snapshot.protocolVersion;
      if (version === undefined || KNOWN_VERSIONS.has(version)) return [];
      return [
        issue({
          message: `server reported protocol version "${version}", which is not a released MCP version`,
          subjectKind: "server",
          hint: `Return one of: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")}.`,
          pointer: "/protocolVersion",
        }),
      ];
    },
  }),

  defineRule({
    id: "protocol/stdout-pollution",
    category: "protocol",
    defaultSeverity: "error",
    summary: "non JSON-RPC output written to stdout",
    rationale:
      "stdout is the message channel. A log line, banner or progress dot on stdout corrupts the stream and, depending on the client, either breaks parsing or silently drops the message that followed.",
    spec: "transports/stdio",
    check: ({ snapshot }) =>
      snapshot.strayStdout.map((line) =>
        issue({
          message: `stdout received a line that is not JSON-RPC: ${truncate(line, 120)}`,
          subjectKind: "server",
          hint: "Write diagnostics to stderr, never stdout.",
        }),
      ),
  }),

  defineRule({
    id: "protocol/list-failed",
    category: "protocol",
    defaultSeverity: "error",
    summary: "a list method declared by capabilities failed",
    rationale:
      "Declaring a capability and then failing the matching list call leaves the client with a half-loaded server, usually with no explanation beyond a generic error.",
    check: ({ snapshot }) =>
      snapshot.listErrors.map((error) =>
        issue({
          message: `${error.method} failed: ${error.message}`,
          subjectKind: "server",
          hint: "Return an empty list rather than an error when the capability is declared but has no entries.",
        }),
      ),
  }),

  defineRule({
    id: "protocol/no-capabilities",
    category: "protocol",
    defaultSeverity: "error",
    summary: "server declares none of tools, resources or prompts",
    rationale:
      "A server with no capabilities exposes nothing to the model. This is almost always a wiring bug — a handler registered on the wrong object, or an early return before registration.",
    spec: "lifecycle/initialization",
    check: ({ snapshot }) =>
      hasAnyCapability(snapshot)
        ? []
        : [
            issue({
              message: "server declared none of tools, resources or prompts",
              subjectKind: "server",
              hint: "Register at least one tool, resource or prompt, or check that startup did not exit early.",
            }),
          ],
  }),

  defineRule({
    id: "protocol/server-info-incomplete",
    category: "protocol",
    defaultSeverity: "warn",
    summary: "serverInfo is missing name or version",
    rationale:
      "Clients show this to users and write it to logs. Without it, an incident report cannot tell which server produced a bad tool call.",
    spec: "lifecycle/initialization",
    check: ({ snapshot }) => {
      const issues = [];
      if (snapshot.serverInfo.name === undefined) {
        issues.push(
          issue({
            message: "serverInfo.name is missing",
            subjectKind: "server",
            hint: "Set serverInfo.name to the package name.",
            pointer: "/serverInfo/name",
          }),
        );
      }
      if (snapshot.serverInfo.version === undefined) {
        issues.push(
          issue({
            message: "serverInfo.version is missing",
            subjectKind: "server",
            hint: "Set serverInfo.version to the package version.",
            pointer: "/serverInfo/version",
          }),
        );
      }
      return issues;
    },
  }),

  defineRule({
    id: "protocol/instructions-missing",
    category: "protocol",
    defaultSeverity: "info",
    summary: "no initialize instructions provided",
    rationale:
      "instructions is the one place a server can explain itself to the model without spending a tool description on it. Omitting it is allowed but the model then guesses how the tools fit together.",
    spec: "lifecycle/initialization",
    check: ({ snapshot }) =>
      snapshot.instructions === undefined || snapshot.instructions.trim().length === 0
        ? [
            issue({
              message: "initialize result has no instructions",
              subjectKind: "server",
              hint: "Add a short instructions string describing what this server is for.",
              pointer: "/instructions",
            }),
          ]
        : [],
  }),
];

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}
