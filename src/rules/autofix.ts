import type { Finding } from "../audit/finding.js";

export interface FixSuggestion {
  readonly ruleId: string;
  readonly subject: string;
  readonly title: string;
  readonly description: string;
  readonly patch: Record<string, unknown>;
}

export function generateFixes(findings: readonly Finding[]): readonly FixSuggestion[] {
  const suggestions: FixSuggestion[] = [];

  for (const finding of findings) {
    const subject = finding.subject ?? "server";

    switch (finding.ruleId) {
      case "tools/annotations-missing":
        suggestions.push({
          ruleId: finding.ruleId,
          subject,
          title: `Add default safety annotations to tool "${subject}"`,
          description: "Declare readOnlyHint and destructiveHint to inform model and host of tool impact.",
          patch: {
            annotations: {
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: false,
            },
          },
        });
        break;

      case "tools/destructive-without-hint":
        suggestions.push({
          ruleId: finding.ruleId,
          subject,
          title: `Mark tool "${subject}" as destructive`,
          description: "Enforce destructiveHint = true so hosts like Claude Desktop request user confirmation.",
          patch: {
            annotations: {
              destructiveHint: true,
              readOnlyHint: false,
            },
          },
        });
        break;

      case "tools/read-only-without-hint":
        suggestions.push({
          ruleId: finding.ruleId,
          subject,
          title: `Mark tool "${subject}" as read-only`,
          description: "Set readOnlyHint = true to enable safe parallel execution without confirmation popups.",
          patch: {
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
            },
          },
        });
        break;

      case "tools/annotation-conflict":
        suggestions.push({
          ruleId: finding.ruleId,
          subject,
          title: `Resolve contradictory hints on tool "${subject}"`,
          description: "A destructive tool cannot be read-only. Remove readOnlyHint and keep destructiveHint.",
          patch: {
            annotations: {
              destructiveHint: true,
              readOnlyHint: false,
            },
          },
        });
        break;

      case "tools/input-schema-missing":
      case "tools/input-schema-not-object":
        suggestions.push({
          ruleId: finding.ruleId,
          subject,
          title: `Add valid object inputSchema for tool "${subject}"`,
          description: "Define a JSON Schema of type 'object' with declared properties.",
          patch: {
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        });
        break;

      case "tools/parameter-description-missing":
        suggestions.push({
          ruleId: finding.ruleId,
          subject,
          title: `Add parameter description in tool "${subject}"`,
          description: "Provide an informative description for the declared parameter.",
          patch: {
            description: "A clear description of the expected argument value and constraints.",
          },
        });
        break;

      case "protocol/instructions-missing":
        suggestions.push({
          ruleId: finding.ruleId,
          subject: "(server)",
          title: "Add top-level server instructions",
          description: "Explain the server's purpose to LLM models during initialization.",
          patch: {
            instructions: "This MCP server provides capabilities and tools to assist with tasks.",
          },
        });
        break;

      case "protocol/server-info-incomplete":
        suggestions.push({
          ruleId: finding.ruleId,
          subject: "(server)",
          title: "Specify serverInfo name and version",
          description: "Identify the server package name and semantic version in initialize response.",
          patch: {
            serverInfo: {
              name: "my-mcp-server",
              version: "1.0.0",
            },
          },
        });
        break;

      default:
        // Other rules do not have an automated patch template
        break;
    }
  }

  return suggestions;
}
