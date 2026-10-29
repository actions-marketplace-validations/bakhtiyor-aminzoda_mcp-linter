import type { ServerSnapshot } from "../mcp/session.js";
import { countBySeverity, sortFindings, type Finding } from "./finding.js";

export interface ReportServer {
  readonly command: string;
  readonly name: string | undefined;
  readonly version: string | undefined;
  readonly protocolVersion: string | undefined;
  readonly requestedProtocolVersion: string;
}

export interface ReportCounts {
  readonly tools: number;
  readonly resources: number;
  readonly resourceTemplates: number;
  readonly prompts: number;
}

export interface ReportScore {
  readonly score: number;
  readonly grade: "A+" | "A" | "B" | "C" | "D" | "F";
  readonly status: "PASS" | "WARN" | "FAIL";
}

export interface Report {
  readonly toolVersion: string;
  readonly server: ReportServer;
  readonly counts: ReportCounts;
  readonly findings: readonly Finding[];
  readonly summary: { error: number; warn: number; info: number; total: number };
  readonly scorecard: ReportScore;
  /** Rule ids silenced or downgraded by configuration, for transparency. */
  readonly configured: Readonly<Record<string, string>>;
}

export function calculateScorecard(summary: { error: number; warn: number; info: number }): ReportScore {
  const penalty = summary.error * 25 + summary.warn * 10 + summary.info * 2;
  const score = Math.max(0, Math.min(100, 100 - penalty));

  let grade: "A+" | "A" | "B" | "C" | "D" | "F";
  let status: "PASS" | "WARN" | "FAIL";

  if (summary.error > 0) {
    status = "FAIL";
    grade = score >= 50 ? "D" : "F";
  } else if (summary.warn > 0) {
    status = "WARN";
    grade = score >= 85 ? "B" : "C";
  } else {
    status = "PASS";
    grade = score >= 98 ? "A+" : "A";
  }

  return { score, grade, status };
}

export function buildReport(
  snapshot: ServerSnapshot,
  findings: readonly Finding[],
  configured: Readonly<Record<string, string>>,
  toolVersion: string,
): Report {
  const sorted = sortFindings(findings);
  const summary = countBySeverity(sorted);
  const scorecard = calculateScorecard(summary);

  return {
    toolVersion,
    server: {
      command: snapshot.command,
      name: snapshot.serverInfo.name,
      version: snapshot.serverInfo.version,
      protocolVersion: snapshot.protocolVersion,
      requestedProtocolVersion: snapshot.requestedProtocolVersion,
    },
    counts: {
      tools: snapshot.tools.length,
      resources: snapshot.resources.length,
      resourceTemplates: snapshot.resourceTemplates.length,
      prompts: snapshot.prompts.length,
    },
    findings: sorted,
    summary,
    scorecard,
    configured,
  };
}
