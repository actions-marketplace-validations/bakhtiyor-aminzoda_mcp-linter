import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { exitCodeFor, EXIT_CLEAN, EXIT_ERROR, EXIT_FINDINGS } from "../src/cli/main.js";
import { loadConfig } from "../src/config.js";
import { runRules } from "../src/rules/engine.js";
import type { ServerSnapshot } from "../src/mcp/session.js";
import { helpText, listRulesText } from "../src/cli/help.js";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function emptySnapshot(): ServerSnapshot {
  return {
    command: "demo",
    protocolVersion: "2025-06-18",
    requestedProtocolVersion: "2025-06-18",
    capabilities: { tools: {} },
    serverInfo: { name: "demo" },
    instructions: undefined,
    tools: [{ name: "run", inputSchema: { type: "object" } }],
    resources: [],
    resourceTemplates: [],
    prompts: [],
    listErrors: [],
    strayStdout: [],
  };
}

describe("rules and CLI", () => {
  it("runs rules and can disable a rule through severity overrides", () => {
    const snapshot = emptySnapshot();
    const all = runRules(snapshot);
    const disabled = runRules(snapshot, { "tools/description-missing": "off" });
    expect(disabled.length).toBeLessThanOrEqual(all.length);
    expect(disabled.some((finding) => finding.ruleId === "tools/description-missing")).toBe(false);
  });

  it("selects exit code based on fail-on severity", () => {
    const report = {
      toolVersion: "0.1.0",
      server: { command: "demo", name: "demo", version: undefined, protocolVersion: undefined, requestedProtocolVersion: "2025-06-18" },
      counts: { tools: 1, resources: 0, resourceTemplates: 0, prompts: 0 },
      findings: [{ ruleId: "test", severity: "warn" as const, subjectKind: "server" as const, message: "warning" }],
      summary: { error: 0, warn: 1, info: 0, total: 1 },
      configured: {},
    };
    expect(exitCodeFor(report, "error")).toBe(EXIT_CLEAN);
    expect(exitCodeFor(report, "warn")).toBe(EXIT_FINDINGS);
    expect(exitCodeFor(report, "none")).toBe(EXIT_CLEAN);
  });

  it("loads valid config and validates rule overrides", () => {
    const dir = mkdtempSync(join(tmpdir(), "mcp-doctor-"));
    tempDirs.push(dir);
    const file = join(dir, ".mcp-doctor.json");
    writeFileSync(file, JSON.stringify({ timeout: 5000, failOn: "warn", rules: { "tools/description-missing": "off" } }));
    expect(loadConfig(file)).toEqual({
      rules: { "tools/description-missing": "off" },
      timeoutMs: 5000,
      failOn: "warn",
    });
  });

  it("exposes help and rule documentation", () => {
    expect(helpText()).toContain("--list-rules");
    expect(listRulesText()).not.toHaveLength(0);
  });

  it("exports stable process exit constants", () => {
    expect(EXIT_CLEAN).toBe(0);
    expect(EXIT_FINDINGS).toBe(1);
    expect(EXIT_ERROR).toBe(2);
  });

  describe("protocol/no-capabilities rule", () => {
    function emptyCapabilitiesSnapshot(): ServerSnapshot {
      return {
        command: "node server.js",
        protocolVersion: "2024-11-05",
        requestedProtocolVersion: "2024-11-05",
        capabilities: {},
        serverInfo: { name: "empty-server", version: "1.0.0" },
        instructions: "instructions",
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
        listErrors: [],
        strayStdout: [],
      };
    }

    it("detects empty capabilities with default error severity", () => {
      const snapshot = emptyCapabilitiesSnapshot();
      const findings = runRules(snapshot);
      const noCapFinding = findings.find((f) => f.ruleId === "protocol/no-capabilities");
      expect(noCapFinding).toBeDefined();
      expect(noCapFinding?.severity).toBe("error");
      expect(noCapFinding?.message).toBe("server declared none of tools, resources or prompts");
    });

    it("supports suppressing protocol/no-capabilities via override", () => {
      const snapshot = emptyCapabilitiesSnapshot();
      const findings = runRules(snapshot, { "protocol/no-capabilities": "off" });
      expect(findings.some((f) => f.ruleId === "protocol/no-capabilities")).toBe(false);
    });

    it("supports downgrading protocol/no-capabilities via override", () => {
      const snapshot = emptyCapabilitiesSnapshot();
      const findings = runRules(snapshot, { "protocol/no-capabilities": "warn" });
      const noCapFinding = findings.find((f) => f.ruleId === "protocol/no-capabilities");
      expect(noCapFinding?.severity).toBe("warn");
    });

    it("does not report protocol/no-capabilities when tools capability is declared", () => {
      const snapshot: ServerSnapshot = {
        ...emptyCapabilitiesSnapshot(),
        capabilities: { tools: {} },
      };
      const findings = runRules(snapshot);
      expect(findings.some((f) => f.ruleId === "protocol/no-capabilities")).toBe(false);
    });
  });
});
