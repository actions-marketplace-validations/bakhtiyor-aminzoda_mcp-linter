import { buildReport, type Report } from "../audit/report.js";
import { collectSnapshot } from "../mcp/session.js";
import { PREFERRED_PROTOCOL_VERSION } from "../mcp/types.js";
import { runRules } from "../rules/engine.js";
import { StdioClient } from "../transport/stdio.js";
import { VERSION } from "../version.js";

export interface AuditRequest {
  readonly command: string;
  readonly commandArgs: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly maxPages: number;
  readonly ruleOverrides: Readonly<Record<string, string>>;
}

/**
 * One audit: start the server, handshake, drain its lists, run the rules, and
 * always shut the process down — including when the handshake itself throws,
 * because a leaked child process hangs a CI job forever.
 */
export async function auditServer(request: AuditRequest): Promise<Report> {
  const client = await StdioClient.start({
    command: request.command,
    args: request.commandArgs,
    env: request.env,
    cwd: request.cwd,
    timeoutMs: request.timeoutMs,
  });

  try {
    const snapshot = await collectSnapshot(client, formatCommand(request), {
      requestedProtocolVersion: PREFERRED_PROTOCOL_VERSION,
      maxPages: request.maxPages,
    });

    const findings = runRules(snapshot, request.ruleOverrides);
    return buildReport(snapshot, findings, request.ruleOverrides, VERSION);
  } finally {
    await client.close();
  }
}

export function formatCommand(request: Pick<AuditRequest, "command" | "commandArgs">): string {
  return [request.command, ...request.commandArgs].join(" ");
}
