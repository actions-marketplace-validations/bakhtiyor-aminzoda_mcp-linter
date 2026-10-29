import type { Report } from "../audit/report.js";
import type { Severity } from "../audit/severity.js";
import { ALL_RULES } from "../rules/registry.js";
import type { Rule } from "../rules/rule.js";

const SARIF_VERSION = "2.1.0";
const SARIF_SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";
const REPOSITORY_BASE_URI = "https://github.com/bakhtiyor-aminzoda/mcp-linter";
const DOCS_BASE_URI = `${REPOSITORY_BASE_URI}/blob/main/docs/rules`;

const LEVEL: Record<Severity, "error" | "warning" | "note"> = {
  error: "error",
  warn: "warning",
  info: "note",
};

export interface SarifOptions {
  /**
   * Source file to associate findings with in physicalLocation.artifactLocation.uri.
   * If omitted, mcp-doctor infers the target file from the server command,
   * falling back to "mcp-server.json" if no file can be determined.
   */
  readonly sourceFile?: string;
}

/**
 * Resolves a valid, forward-slash relative URI for SARIF artifactLocation.uri.
 * GitHub Code Scanning requires every alert to reference an artifactLocation.uri.
 */
export function resolveArtifactUri(command: string): string {
  if (!command || !command.trim()) {
    return "mcp-server.json";
  }

  // Normalize backslashes (Windows) to forward slashes
  const normalized = command.replace(/\\/g, "/").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);

  // Common file extensions for server scripts and configurations
  const fileExtensionRegex = /\.(?:js|mjs|cjs|ts|mts|cts|py|json|jsonc|yaml|yml|sh|bash|rb|rs|go|exe)$/i;

  for (const token of tokens) {
    const unquoted = token.replace(/^["']|["']$/g, "");
    if (fileExtensionRegex.test(unquoted)) {
      return unquoted.replace(/^\.\//, "");
    }
  }

  // Check if first token looks like an executable path other than common interpreters
  const firstToken = tokens[0];
  if (firstToken !== undefined) {
    const first = firstToken.replace(/^["']|["']$/g, "").replace(/^\.\//, "");
    const runnerInterpreters = new Set([
      "node",
      "nodejs",
      "npx",
      "python",
      "python3",
      "py",
      "deno",
      "bun",
      "pnpm",
      "npm",
      "yarn",
      "docker",
      "sh",
      "bash",
      "cmd",
      "powershell",
    ]);
    if (!runnerInterpreters.has(first.toLowerCase()) && !first.startsWith("-")) {
      return first;
    }
  }

  return "mcp-server.json";
}

function buildRuleDescriptor(rule: Rule) {
  const isSecurity =
    rule.category === "security" ||
    rule.id.includes("injection") ||
    rule.id.includes("safety");
  const helpUri = `${DOCS_BASE_URI}/${rule.id}.md`;
  const helpText = `${rule.summary}. ${rule.rationale}\n\nDocumentation: ${helpUri}`;
  const helpMarkdown = `### ${rule.summary}\n\n${rule.rationale}\n\n**Documentation**: [Rule Documentation](${helpUri})`;

  return {
    id: rule.id,
    name: rule.id,
    shortDescription: { text: rule.summary },
    fullDescription: { text: rule.rationale },
    defaultConfiguration: { level: LEVEL[rule.defaultSeverity] },
    helpUri,
    help: {
      text: helpText,
      markdown: helpMarkdown,
    },
    properties: {
      category: rule.category,
      tags: Array.from(new Set([rule.category, ...(isSecurity ? ["security"] : [])])),
      precision: "very-high",
      "problem.severity":
        rule.defaultSeverity === "error"
          ? "error"
          : rule.defaultSeverity === "warn"
            ? "warning"
            : "recommendation",
      ...(isSecurity ? { "security-severity": rule.defaultSeverity === "error" ? "8.5" : "6.0" } : {}),
      ...(rule.spec === undefined ? {} : { spec: rule.spec }),
    },
  };
}

/**
 * Format audit report as OASIS SARIF v2.1.0 compliant with GitHub Code Scanning.
 */
export function formatSarif(report: Report, options?: SarifOptions): string {
  const ruleIndex = new Map(ALL_RULES.map((rule, index) => [rule.id, index] as const));
  const artifactUri =
    options?.sourceFile && options.sourceFile.trim().length > 0
      ? options.sourceFile.replace(/\\/g, "/").replace(/^\.\//, "").trim()
      : resolveArtifactUri(report.server.command);

  const sarif = {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: "mcp-doctor",
            version: report.toolVersion,
            semanticVersion: report.toolVersion,
            informationUri: REPOSITORY_BASE_URI,
            rules: ALL_RULES.map(buildRuleDescriptor),
          },
        },
        columnKind: "utf16CodeUnits",
        properties: {
          server: report.server.name ?? null,
          serverVersion: report.server.version ?? null,
          protocolVersion: report.server.protocolVersion ?? null,
          command: report.server.command,
          counts: report.counts,
        },
        results: report.findings.map((finding) => {
          const index = ruleIndex.get(finding.ruleId);
          const messageText =
            finding.hint !== undefined
              ? `${finding.message} Fix: ${finding.hint}`
              : finding.message;

          return {
            ruleId: finding.ruleId,
            ...(index !== undefined && index >= 0 ? { ruleIndex: index } : {}),
            level: LEVEL[finding.severity],
            message: { text: messageText },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: artifactUri,
                  },
                  region: {
                    startLine: 1,
                    startColumn: 1,
                  },
                },
                logicalLocations: [
                  {
                    fullyQualifiedName: `${finding.subjectKind}:${finding.subject ?? "(server)"}`,
                    kind: finding.subjectKind,
                    ...(finding.subject === undefined ? {} : { name: finding.subject }),
                  },
                ],
              },
            ],
            partialFingerprints: {
              "mcpDoctor/v1": `${finding.ruleId}|${finding.subjectKind}|${finding.subject ?? ""}`,
            },
            properties: {
              ...(finding.hint !== undefined ? { hint: finding.hint } : {}),
              ...(finding.pointer !== undefined ? { pointer: finding.pointer } : {}),
            },
          };
        }),
      },
    ],
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}
