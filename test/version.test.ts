import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version.js";
import { helpText } from "../src/cli/help.js";
import { run, EXIT_CLEAN } from "../src/cli/main.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("version synchronization", () => {
  it("keeps src/version.ts in sync with package.json", () => {
    const packageJsonPath = resolve(__dirname, "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string };

    expect(VERSION).toBe(packageJson.version);
  });

  it("exports a valid semantic version string", () => {
    // Official SemVer 2.0.0 regex specification
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    expect(VERSION).toMatch(semverRegex);
  });

  it("includes VERSION in CLI --version and help text", async () => {
    let stdout = "";
    const exitCode = await run(["--version"], {
      cwd: process.cwd(),
      isTty: false,
      write: (chunk) => {
        stdout += chunk;
      },
      writeError: () => {},
    });

    expect(exitCode).toBe(EXIT_CLEAN);
    expect(stdout.trim()).toBe(`mcp-doctor ${VERSION}`);
    expect(helpText()).toContain(`mcp-doctor ${VERSION}`);
  });
});
