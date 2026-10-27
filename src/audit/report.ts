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

export interface Report {
  readonly toolVersion: string;
  readonly server: ReportServer;
  readonly counts: ReportCounts;
  readonly findings: readonly Finding[];
  readonly summary: { error: number; warn: number; info: number; total: number };
  /** Rule ids silenced or downgraded by configuration, for transparency. */
  readonly configured: Readonly<Record<string, string>>;
}

export function buildReport(
  snapshot: ServerSnapshot,
  findings: readonly Finding[],
  configured: Readonly<Record<string, string>>,
  toolVersion: string,
): Report {
  const sorted = sortFindings(findings);
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
    summary: countBySeverity(sorted),
    configured,
  };
}
