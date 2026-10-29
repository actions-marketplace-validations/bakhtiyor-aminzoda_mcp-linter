import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import type { Report } from "../../src/audit/report.js";
import { formatSarif, resolveArtifactUri } from "../../src/report/sarif.js";
import { ALL_RULES } from "../../src/rules/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMockReport(overrides?: Partial<Report>): Report {
  return {
    toolVersion: "0.1.0",
    server: {
      command: "node dist/server.js",
      name: "test-server",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      requestedProtocolVersion: "2024-11-05",
    },
    counts: { tools: 2, resources: 1, resourceTemplates: 0, prompts: 1 },
    findings: [
      {
        ruleId: "tools/description-missing",
        severity: "error",
        subjectKind: "tool",
        subject: "calculate",
        message: "tool has no description",
        hint: "Add a 1-2 sentence description explaining what the tool does.",
        pointer: "/tools/0/description",
      },
      {
        ruleId: "protocol/instructions-missing",
        severity: "warn",
        subjectKind: "server",
        message: "initialize result did not include instructions",
      },
    ],
    summary: { error: 1, warn: 1, info: 0, total: 2 },
    configured: {},
    ...overrides,
  };
}

describe("SARIF v2.1.0 Reporter Conformance", () => {
  it("emits a valid SARIF v2.1.0 envelope and correct tool metadata", () => {
    const report = createMockReport();
    const sarifJson = formatSarif(report);
    const parsed = JSON.parse(sarifJson);

    expect(parsed.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs).toHaveLength(1);

    const driver = parsed.runs[0].tool.driver;
    expect(driver.name).toBe("mcp-doctor");
    expect(driver.version).toBe("0.1.0");
    expect(driver.semanticVersion).toBe("0.1.0");
    expect(driver.informationUri).toBe("https://github.com/bakhtiyor-aminzoda/mcp-doctor");
    expect(driver.rules.length).toBe(ALL_RULES.length);
  });

  it("populates rule descriptors with valid help, helpUri, descriptions, and tags", () => {
    const report = createMockReport();
    const parsed = JSON.parse(formatSarif(report));
    const rules = parsed.runs[0].tool.driver.rules;

    for (const rule of rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBe(rule.id);
      expect(rule.shortDescription?.text).toBeTruthy();
      expect(rule.shortDescription.text.length).toBeLessThanOrEqual(1024);
      expect(rule.fullDescription?.text).toBeTruthy();
      expect(rule.fullDescription.text.length).toBeLessThanOrEqual(1024);
      expect(rule.defaultConfiguration?.level).toMatch(/^(error|warning|note)$/);

      // helpUri links to GitHub docs
      expect(rule.helpUri).toBe(
        `https://github.com/bakhtiyor-aminzoda/mcp-doctor/blob/main/docs/rules/${rule.id}.md`,
      );

      // help object has both text and markdown
      expect(rule.help?.text).toBeTruthy();
      expect(rule.help?.markdown).toBeTruthy();
      expect(rule.help.text).toContain(rule.shortDescription.text);

      // tags and problem/security properties
      expect(rule.properties?.tags).toBeInstanceOf(Array);
      expect(rule.properties.tags).toContain(rule.properties.category);
      expect(new Set(rule.properties.tags).size).toBe(rule.properties.tags.length);
      expect(rule.properties.precision).toBe("very-high");
      expect(rule.properties["problem.severity"]).toMatch(/^(error|warning|recommendation)$/);
    }
  });

  it("guarantees strictly unique tags across all 34 rule descriptors (OASIS schema compliance)", () => {
    const report = createMockReport();
    const parsed = JSON.parse(formatSarif(report));
    const rules = parsed.runs[0].tool.driver.rules;

    expect(rules).toHaveLength(ALL_RULES.length);
    expect(rules.length).toBe(34);

    for (const rule of rules) {
      const tags: string[] = rule.properties?.tags;
      expect(tags).toBeInstanceOf(Array);
      expect(tags.length).toBeGreaterThan(0);
      const uniqueTags = new Set(tags);
      expect(uniqueTags.size).toBe(tags.length);
    }

    // Specific regression assertion for rule tools/description-injection (category: security)
    const injectionRule = rules.find((r: { id: string }) => r.id === "tools/description-injection");
    expect(injectionRule).toBeDefined();
    expect(injectionRule.properties.tags).toEqual(["security"]);
  });

  it("strictly omits the illegal 'help' property from all result objects", () => {
    const report = createMockReport();
    const parsed = JSON.parse(formatSarif(report));
    const results = parsed.runs[0].results;

    expect(results).toHaveLength(2);
    for (const result of results) {
      // OASIS SARIF v2.1.0 Section 3.27 forbids 'help' on result objects
      expect("help" in result).toBe(false);
    }
  });

  it("embeds actionable hints in result messages and properties", () => {
    const report = createMockReport();
    const parsed = JSON.parse(formatSarif(report));
    const findingWithHint = parsed.runs[0].results[0];

    expect(findingWithHint.message.text).toBe(
      "tool has no description Fix: Add a 1-2 sentence description explaining what the tool does.",
    );
    expect(findingWithHint.properties?.hint).toBe(
      "Add a 1-2 sentence description explaining what the tool does.",
    );
    expect(findingWithHint.properties?.pointer).toBe("/tools/0/description");

    const findingWithoutHint = parsed.runs[0].results[1];
    expect(findingWithoutHint.message.text).toBe(
      "initialize result did not include instructions",
    );
    expect(findingWithoutHint.properties?.hint).toBeUndefined();
  });

  it("includes physicalLocation with valid artifactLocation.uri and line 1 region", () => {
    const report = createMockReport();
    const parsed = JSON.parse(formatSarif(report));
    const results = parsed.runs[0].results;

    for (const result of results) {
      expect(result.locations).toHaveLength(1);
      const loc = result.locations[0];

      // Physical location required by GitHub Code Scanning
      expect(loc.physicalLocation).toBeDefined();
      expect(loc.physicalLocation.artifactLocation.uri).toBe("dist/server.js");
      expect(loc.physicalLocation.region.startLine).toBe(1);
      expect(loc.physicalLocation.region.startColumn).toBe(1);

      // Logical locations preserved for MCP semantics
      expect(loc.logicalLocations).toBeDefined();
      expect(loc.logicalLocations[0].kind).toMatch(/^(server|tool|resource|resourceTemplate|prompt)$/);
    }
  });

  it("resolves artifactLocation.uri from command line patterns across platforms", () => {
    expect(resolveArtifactUri("node dist/index.js")).toBe("dist/index.js");
    expect(resolveArtifactUri("node test\\fixtures\\demo-server.js")).toBe("test/fixtures/demo-server.js");
    expect(resolveArtifactUri("npx tsx src/server.ts --port 3000")).toBe("src/server.ts");
    expect(resolveArtifactUri("python3 -u server.py")).toBe("server.py");
    expect(resolveArtifactUri("./bin/mcp-server")).toBe("bin/mcp-server");
    expect(resolveArtifactUri("docker run -i --rm my-server")).toBe("mcp-server.json");
    expect(resolveArtifactUri("")).toBe("mcp-server.json");
  });

  it("honors explicit sourceFile option when provided", () => {
    const report = createMockReport();
    const sarifJson = formatSarif(report, { sourceFile: "configs/custom-server.ts" });
    const parsed = JSON.parse(sarifJson);

    expect(parsed.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(
      "configs/custom-server.ts",
    );
  });

  it("normalizes Windows backslashes and leading relative prefixes in explicit sourceFile option", () => {
    const report = createMockReport();

    // Windows backslash path
    const sarifBackslash = formatSarif(report, { sourceFile: "src\\tools\\index.ts" });
    const parsedBackslash = JSON.parse(sarifBackslash);
    const uriBackslash =
      parsedBackslash.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(uriBackslash).toBe("src/tools/index.ts");
    expect(uriBackslash).not.toContain("\\");

    // Relative Windows path with leading .\
    const sarifRelative = formatSarif(report, { sourceFile: ".\\src\\server.ts" });
    const parsedRelative = JSON.parse(sarifRelative);
    const uriRelative =
      parsedRelative.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(uriRelative).toBe("src/server.ts");
    expect(uriRelative).not.toContain("\\");
    expect(uriRelative.startsWith("./")).toBe(false);

    // Windows absolute path with drive letter
    const sarifDrive = formatSarif(report, { sourceFile: "C:\\projects\\claude-gpt\\server.js" });
    const parsedDrive = JSON.parse(sarifDrive);
    const uriDrive =
      parsedDrive.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(uriDrive).toBe("C:/projects/claude-gpt/server.js");
    expect(uriDrive).not.toContain("\\");

    // Mixed slashes
    const sarifMixed = formatSarif(report, { sourceFile: "src/subdir\\runner.ts" });
    const parsedMixed = JSON.parse(sarifMixed);
    const uriMixed =
      parsedMixed.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(uriMixed).toBe("src/subdir/runner.ts");
    expect(uriMixed).not.toContain("\\");
  });

  it("emits non-negative ruleIndex or omits it if rule is not found (never -1)", () => {
    const report = createMockReport({
      findings: [
        {
          ruleId: "custom/unknown-rule",
          severity: "error",
          subjectKind: "server",
          message: "custom issue",
        },
      ],
    });
    const parsed = JSON.parse(formatSarif(report));
    const result = parsed.runs[0].results[0];

    // Under SARIF v2.1.0, ruleIndex must be >= 0 or omitted; -1 is forbidden
    expect(result.ruleIndex).toBeUndefined();
  });

  it("strictly validates against the official OASIS SARIF v2.1.0 JSON Schema", () => {
    const schemaPath = path.resolve(__dirname, "../fixtures/sarif-2.1.0.json");
    const schemaContent = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

    const AjvClass: any = (Ajv as any).default ?? Ajv;
    const ajv = new AjvClass({ allErrors: true, strict: false });
    const addFormatsFn: any = (addFormats as any).default ?? addFormats;
    addFormatsFn(ajv);
    const validate = ajv.compile(schemaContent);

    const report = createMockReport({
      findings: [
        {
          ruleId: "tools/description-injection",
          severity: "error",
          subjectKind: "tool",
          subject: "eval_code",
          message: "Prompt injection detected in description",
          hint: "Remove instructions directed at the model.",
          pointer: "/tools/0/description",
        },
      ],
    });

    const sarifJson = formatSarif(report, { sourceFile: "src\\server.ts" });
    const parsed = JSON.parse(sarifJson);

    const isValid = validate(parsed);
    if (!isValid) {
      console.error("SARIF Schema Errors:", validate.errors);
    }
    expect(isValid).toBe(true);
    expect(validate.errors).toBeNull();
  });
});
