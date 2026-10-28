import type { Report } from "../audit/report.js";

/**
 * Machine-readable output. No timestamps: a byte-identical report for an
 * unchanged server is what makes `diff` useful in CI.
 */
export function formatJson(report: Report): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
