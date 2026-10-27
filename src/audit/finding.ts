import type { Severity } from "./severity.js";

/**
 * The thing a finding is about. Used by reporters to group findings and to
 * build stable, human-meaningful keys (SARIF fingerprints, JSON output).
 */
export type SubjectKind = "server" | "tool" | "resource" | "resourceTemplate" | "prompt";

export interface Finding {
  /** Stable rule identifier, e.g. `tools/description-missing`. */
  readonly ruleId: string;
  readonly severity: Severity;
  /** What is wrong, in one sentence. */
  readonly message: string;
  /** What the finding is about, e.g. the tool name. `undefined` for server-level. */
  readonly subject?: string;
  readonly subjectKind: SubjectKind;
  /** Concrete, actionable fix. */
  readonly hint?: string;
  /** JSON path inside the audited payload, used by SARIF for locating. */
  readonly pointer?: string;
}

/**
 * Deterministic ordering so two runs over the same server produce byte-identical
 * output — required for CI diffs and SARIF result matching.
 */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const byRule = a.ruleId.localeCompare(b.ruleId);
    if (byRule !== 0) return byRule;
    const bySubject = (a.subject ?? "").localeCompare(b.subject ?? "");
    if (bySubject !== 0) return bySubject;
    return a.message.localeCompare(b.message);
  });
}

export function countBySeverity(findings: readonly Finding[]): {
  error: number;
  warn: number;
  info: number;
  total: number;
} {
  let error = 0;
  let warn = 0;
  let info = 0;
  for (const finding of findings) {
    if (finding.severity === "error") error += 1;
    else if (finding.severity === "warn") warn += 1;
    else info += 1;
  }
  return { error, warn, info, total: findings.length };
}
