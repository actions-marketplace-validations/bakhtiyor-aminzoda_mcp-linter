import { describe, expect, it } from "vitest";
import { buildReport } from "../src/audit/report.js";
import { countBySeverity, sortFindings } from "../src/audit/finding.js";
import { parseInitializeResult, parsePrompt, parseTool } from "../src/mcp/parse.js";
import type { ServerSnapshot } from "../src/mcp/session.js";

describe("MCP parsing and reports", () => {
  it("normalizes malformed and partial server payloads without throwing", () => {
    expect(parseTool(null)).toEqual({});
    expect(parseTool({ name: "run", annotations: "bad", inputSchema: [] })).toEqual({ name: "run" });
    expect(parsePrompt({ name: "review", arguments: "bad" })).toEqual({ name: "review", arguments: [] });
  });

  it("accepts nullable initialization fields and filters unknown types", () => {
    const initialized = parseInitializeResult({
      protocolVersion: "2025-06-18",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "demo", version: 42 },
      instructions: false,
    });
    expect(initialized).toEqual({
      protocolVersion: "2025-06-18",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "demo" },
    });
  });

  it("sorts findings and counts severities deterministically", () => {
    const findings = [
      { ruleId: "z", severity: "warn" as const, subjectKind: "server" as const, message: "z" },
      { ruleId: "a", severity: "error" as const, subjectKind: "tool" as const, subject: "b", message: "b" },
      { ruleId: "a", severity: "info" as const, subjectKind: "tool" as const, subject: "a", message: "a" },
    ];
    expect(sortFindings(findings).map((finding) => finding.ruleId + ":" + (finding.subject ?? ""))).toEqual(["a:a", "a:b", "z:"]);
    expect(countBySeverity(sortFindings(findings))).toEqual({ error: 1, warn: 1, info: 1, total: 3 });
  });

  it("builds a report with stable server metadata and counts", () => {
    const snapshot: ServerSnapshot = {
      command: "node server.js",
      protocolVersion: "2025-06-18",
      requestedProtocolVersion: "2025-06-18",
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: "demo", version: "1.0.0" },
      instructions: undefined,
      tools: [{ name: "run" }],
      resources: [{ uri: "file:///one" }],
      resourceTemplates: [],
      prompts: [],
      listErrors: [],
      strayStdout: [],
    };
    const report = buildReport(snapshot, [], {}, "0.1.0");
    expect(report.server).toEqual({
      command: "node server.js",
      name: "demo",
      version: "1.0.0",
      protocolVersion: "2025-06-18",
      requestedProtocolVersion: "2025-06-18",
    });
    expect(report.counts).toEqual({ tools: 1, resources: 1, resourceTemplates: 0, prompts: 0 });
  });
});
