import type { Finding } from "../audit/finding.js";
import { isConfigurableSeverity, type ConfigurableSeverity } from "../audit/severity.js";
import type { ServerSnapshot } from "../mcp/session.js";
import { ALL_RULES, RULE_BY_ID } from "./registry.js";
import type { RuleIssue } from "./rule.js";

export type SeverityOverrides = Readonly<Record<string, string>>;

/** Rule ids in `overrides` that no rule defines — almost always a typo. */
export function unknownRuleIds(overrides: SeverityOverrides): string[] {
  return Object.keys(overrides).filter((id) => !RULE_BY_ID.has(id));
}

export function invalidSeverities(overrides: SeverityOverrides): string[] {
  return Object.entries(overrides)
    .filter(([, value]) => !isConfigurableSeverity(value))
    .map(([id]) => id);
}

export function resolveSeverity(
  overrides: SeverityOverrides,
  ruleId: string,
  fallback: ConfigurableSeverity,
): ConfigurableSeverity {
  const configured = overrides[ruleId];
  if (configured === undefined) return fallback;
  return isConfigurableSeverity(configured) ? configured : fallback;
}

/**
 * Runs every enabled rule and turns issues into findings. Severity lives here
 * rather than in the rules so a project can downgrade a rule it disagrees with
 * without forking the tool.
 */
export function runRules(
  snapshot: ServerSnapshot,
  overrides: SeverityOverrides = {},
): Finding[] {
  const findings: Finding[] = [];

  for (const rule of ALL_RULES) {
    const severity = resolveSeverity(overrides, rule.id, rule.defaultSeverity);
    if (severity === "off") continue;

    let issues: RuleIssue[];
    try {
      issues = rule.check({ snapshot });
    } catch (error) {
      findings.push({
        ruleId: "internal/rule-error",
        severity: "error",
        subjectKind: "server",
        subject: rule.id,
        message: `rule ${rule.id} threw: ${error instanceof Error ? error.message : String(error)}`,
        hint: "This is a bug in mcp-doctor. Please report it with the server you audited.",
      });
      continue;
    }

    for (const entry of issues) {
      findings.push({
        ruleId: rule.id,
        severity,
        message: entry.message,
        subjectKind: entry.subjectKind,
        ...(entry.subject === undefined ? {} : { subject: entry.subject }),
        ...(entry.hint === undefined ? {} : { hint: entry.hint }),
        ...(entry.pointer === undefined ? {} : { pointer: entry.pointer }),
      });
    }
  }

  return findings;
}
