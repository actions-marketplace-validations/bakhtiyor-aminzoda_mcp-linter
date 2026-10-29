import { describe, expect, it } from "vitest";
import { calculateScorecard } from "../../src/audit/report.js";
import { generateFixes } from "../../src/rules/autofix.js";
import { formatMarkdown } from "../../src/report/markdown.js";
import type { Finding } from "../../src/audit/finding.js";
import type { Report } from "../../src/audit/report.js";

describe("Health Scorecard & Autofix Engine", () => {
  it("computes accurate health scores and letter grades", () => {
    expect(calculateScorecard({ error: 0, warn: 0, info: 0 })).toEqual({
      score: 100,
      grade: "A+",
      status: "PASS",
    });

    expect(calculateScorecard({ error: 0, warn: 1, info: 0 })).toEqual({
      score: 90,
      grade: "B",
      status: "WARN",
    });

    expect(calculateScorecard({ error: 1, warn: 0, info: 0 })).toEqual({
      score: 75,
      grade: "D",
      status: "FAIL",
    });

    expect(calculateScorecard({ error: 4, warn: 2, info: 3 })).toEqual({
      score: 0,
      grade: "F",
      status: "FAIL",
    });
  });

  it("generates automated patches for missing annotations and schemas", () => {
    const findings: Finding[] = [
      {
        ruleId: "tools/annotations-missing",
        severity: "info",
        subject: "test_tool",
        subjectKind: "tool",
        message: "missing annotations",
      },
      {
        ruleId: "tools/destructive-without-hint",
        severity: "error",
        subject: "drop_db",
        subjectKind: "tool",
        message: "looks destructive",
      },
      {
        ruleId: "protocol/instructions-missing",
        severity: "info",
        subjectKind: "server",
        message: "missing instructions",
      },
    ];

    const fixes = generateFixes(findings);
    expect(fixes).toHaveLength(3);
    const [fix0, fix1, fix2] = fixes;
    if (!fix0 || !fix1 || !fix2) throw new Error("Expected 3 fixes");

    expect(fix0.ruleId).toBe("tools/annotations-missing");
    expect(fix0.patch).toHaveProperty("annotations.readOnlyHint", false);

    expect(fix1.ruleId).toBe("tools/destructive-without-hint");
    expect(fix1.patch).toHaveProperty("annotations.destructiveHint", true);

    expect(fix2.ruleId).toBe("protocol/instructions-missing");
    expect(fix2.patch).toHaveProperty("instructions");
  });

  it("renders structured markdown report with shield badges", () => {
    const report: Report = {
      toolVersion: "0.1.0",
      server: {
        command: "node server.js",
        name: "demo",
        version: "1.0.0",
        protocolVersion: "2024-11-05",
        requestedProtocolVersion: "2024-11-05",
      },
      counts: { tools: 2, resources: 0, resourceTemplates: 0, prompts: 0 },
      findings: [
        {
          ruleId: "tools/title-missing",
          severity: "info",
          subject: "run",
          subjectKind: "tool",
          message: "tool has no title",
          hint: "Add title",
        },
      ],
      summary: { error: 0, warn: 0, info: 1, total: 1 },
      scorecard: { score: 98, grade: "A+", status: "PASS" },
      configured: {},
    };

    const md = formatMarkdown(report);
    expect(md).toContain("# 🩺 MCP Security & Conformance Audit Report");
    expect(md).toContain("Health Grade");
    expect(md).toContain("**Score**: `98/100`");
    expect(md).toContain("tools/title-missing");
  });
});
