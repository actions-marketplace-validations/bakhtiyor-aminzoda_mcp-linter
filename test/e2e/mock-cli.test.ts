import { describe, expect, it } from "vitest";
import { auditServer } from "../../src/cli/audit-command.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateFixes } from "../../src/rules/autofix.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, "../../dist/cli.js");

describe("Built-in Mock Server E2E Verification", () => {
  it("audits clean mock server with 100/100 score and Grade A+", async () => {
    const report = await auditServer({
      command: "node",
      commandArgs: [cliPath, "mock", "clean"],
      cwd: process.cwd(),
      env: {},
      timeoutMs: 5000,
      maxPages: 10,
      ruleOverrides: {},
    });

    expect(report.server.name).toBe("mock-clean-server");
    expect(report.counts.tools).toBe(2);
    expect(report.findings).toHaveLength(0);
    expect(report.scorecard.score).toBe(100);
    expect(report.scorecard.grade).toBe("A+");
    expect(report.scorecard.status).toBe("PASS");
  });

  it("audits vulnerable mock server and generates autofix suggestions", async () => {
    const report = await auditServer({
      command: "node",
      commandArgs: [cliPath, "mock", "vulnerable"],
      cwd: process.cwd(),
      env: {},
      timeoutMs: 5000,
      maxPages: 10,
      ruleOverrides: {},
    });

    expect(report.server.name).toBe("mock-vulnerable-server");
    expect(report.summary.error).toBeGreaterThanOrEqual(3);
    expect(report.scorecard.grade).toBe("F");
    expect(report.scorecard.status).toBe("FAIL");

    const fixes = generateFixes(report.findings);
    expect(fixes.length).toBeGreaterThan(0);
    const patchedRules = fixes.map((f) => f.ruleId);
    expect(patchedRules).toContain("tools/destructive-without-hint");
    expect(patchedRules).toContain("protocol/instructions-missing");
  });
});
