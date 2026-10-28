import type { Report } from "../audit/report.js";
import type { Severity } from "../audit/severity.js";
import { ALL_RULES } from "../rules/registry.js";

const SARIF_VERSION = "2.1.0";
const SARIF_SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";
const INFORMATION_URI = "https://github.com/mcp-doctor/mcp-doctor";

const LEVEL: Record<Severity, "error" | "warning" | "note"> = {
  error: "error",
  warn: "warning",
  info: "note",
};

/**
 * SARIF for GitHub code scanning. Findings are attached to a logical location
 * rather than a file: the subject is a tool, resource or prompt inside a server
 * that has no source file in the scanned repository.
 */
export function formatSarif(report: Report): string {
  const ruleIndex = new Map(ALL_RULES.map((rule, index) => [rule.id, index] as const));

  const sarif = {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: "mcp-doctor",
            version: report.toolVersion,
            informationUri: INFORMATION_URI,
            rules: ALL_RULES.map((rule) => ({
              id: rule.id,
              name: rule.id,
              shortDescription: { text: rule.summary },
              fullDescription: { text: rule.rationale },
              defaultConfiguration: { level: LEVEL[rule.defaultSeverity] },
              properties: {
                category: rule.category,
                ...(rule.spec === undefined ? {} : { spec: rule.spec }),
              },
            })),
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
        results: report.findings.map((finding) => ({
          ruleId: finding.ruleId,
          ruleIndex: ruleIndex.get(finding.ruleId) ?? -1,
          level: LEVEL[finding.severity],
          message: { text: finding.message },
          ...(finding.hint === undefined ? {} : { help: { text: finding.hint } }),
          locations: [
            {
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
        })),
      },
    ],
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}
