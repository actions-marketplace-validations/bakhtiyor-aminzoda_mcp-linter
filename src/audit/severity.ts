/**
 * Severity model. Four states: three reportable levels plus `off`, which only
 * ever appears in configuration files to silence a rule.
 */

export const SEVERITIES = ["error", "warn", "info"] as const;

export type Severity = (typeof SEVERITIES)[number];
export type ConfigurableSeverity = Severity | "off";

/** Lower index wins. `off` sorts last so it never becomes the "worst" finding. */
const RANK: Record<ConfigurableSeverity, number> = {
  error: 0,
  warn: 1,
  info: 2,
  off: 3,
};

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export function isConfigurableSeverity(value: string): value is ConfigurableSeverity {
  return value === "off" || isSeverity(value);
}

export function compareSeverity(a: ConfigurableSeverity, b: ConfigurableSeverity): number {
  return RANK[a] - RANK[b];
}

export function severityAtLeast(actual: Severity, threshold: ConfigurableSeverity): boolean {
  return compareSeverity(actual, threshold) <= 0;
}

export function isFailOn(value: string): value is Severity | "none" {
  return value === "none" || isSeverity(value);
}
