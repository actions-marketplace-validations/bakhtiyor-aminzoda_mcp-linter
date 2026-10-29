import { existsSync, appendFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { severityAtLeast, type Severity } from "../audit/severity.js";
import type { Report } from "../audit/report.js";
import { CONFIG_FILENAME, EMPTY_CONFIG, loadConfig, type DoctorConfig } from "../config.js";
import { createPalette } from "../report/color.js";
import { formatJson } from "../report/json.js";
import { formatPretty } from "../report/pretty.js";
import { formatSarif } from "../report/sarif.js";
import { formatMarkdown } from "../report/markdown.js";
import { generateFixes } from "../rules/autofix.js";
import { DoctorError } from "../transport/errors.js";
import { DEFAULT_TIMEOUT_MS } from "../transport/stdio.js";
import { VERSION } from "../version.js";
import { parseArgs, type CliOptions } from "./args.js";
import { auditServer } from "./audit-command.js";
import { explainText, helpText, listRulesText } from "./help.js";
import { runMockServer, type MockProfile } from "./mock-command.js";

export interface CliEnvironment {
  readonly cwd: string;
  readonly isTty: boolean;
  readonly write: (text: string) => void;
  readonly writeError: (text: string) => void;
}

export const EXIT_CLEAN = 0;
export const EXIT_FINDINGS = 1;
export const EXIT_ERROR = 2;

export async function run(argv: readonly string[], environment: CliEnvironment): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    environment.writeError(`${parsed.error}\n`);
    return EXIT_ERROR;
  }
  const options = parsed.options;

  if (options.mock !== undefined) {
    runMockServer(options.mock as MockProfile);
    return EXIT_CLEAN;
  }
  if (options.help) {
    environment.write(`${helpText()}\n`);
    return EXIT_CLEAN;
  }
  if (options.version) {
    environment.write(`mcp-doctor ${VERSION}\n`);
    return EXIT_CLEAN;
  }
  if (options.listRules) {
    environment.write(`${listRulesText()}\n`);
    return EXIT_CLEAN;
  }
  if (options.explain !== undefined) {
    const explanation = explainText(options.explain);
    if (explanation === undefined) {
      environment.writeError(`unknown rule "${options.explain}". Run \`mcp-doctor --list-rules\`.\n`);
      return EXIT_ERROR;
    }
    environment.write(`${explanation}\n`);
    return EXIT_CLEAN;
  }
  if (options.init) {
    const targetFile = join(environment.cwd, CONFIG_FILENAME);
    if (existsSync(targetFile)) {
      environment.writeError(`Configuration file already exists: ${targetFile}\n`);
      return EXIT_ERROR;
    }
    const starterConfig = {
      $schema: "https://raw.githubusercontent.com/bakhtiyor-aminzoda/mcp-doctor/main/docs/schema.json",
      timeout: 15000,
      failOn: "error",
      rules: {
        "tools/title-missing": "info",
        "protocol/instructions-missing": "info",
      },
    };
    writeFileSync(targetFile, JSON.stringify(starterConfig, null, 2) + "\n", "utf8");
    environment.write(`✓ Created ${CONFIG_FILENAME} configuration file.\n`);
    return EXIT_CLEAN;
  }
  if (options.command === undefined) {
    environment.writeError(`no server command given. Example:\n  mcp-doctor -- npx -y @modelcontextprotocol/server-filesystem .\n  mcp-doctor -- mcp-doctor mock clean\n`);
    return EXIT_ERROR;
  }

  try {
    const config = resolveConfig(options, environment.cwd);
    const report = await auditServer({
      command: options.command,
      commandArgs: options.commandArgs,
      cwd: options.cwd === undefined ? environment.cwd : resolve(environment.cwd, options.cwd),
      env: options.env,
      timeoutMs: options.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxPages: options.maxPages,
      ruleOverrides: config.rules,
    });

    const palette = createPalette({ color: options.color, isTty: environment.isTty });
    const rendered = render(report, options, palette);
    writeRendered(rendered, options, environment);

    if (options.fix) {
      const fixes = generateFixes(report.findings);
      if (fixes.length === 0) {
        environment.write(palette.green("\nNo autofixable issues found.\n"));
      } else {
        environment.write(`\n${palette.bold("🔧 Autofix Suggestions")} (${fixes.length} available):\n`);
        for (const fix of fixes) {
          environment.write(`  ${palette.cyan(fix.subject)} ${palette.bold(fix.title)}\n`);
          environment.write(`    ${palette.dim(fix.description)}\n`);
          environment.write(`    ${palette.dim("Suggested Patch:")} ${JSON.stringify(fix.patch)}\n`);
        }
      }
    }

    if (process.env.GITHUB_STEP_SUMMARY) {
      try {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatMarkdown(report) + "\n\n", "utf8");
      } catch {
        // ignore
      }
    }

    return exitCodeFor(report, options.failOn ?? config.failOn ?? "error");
  } catch (error) {
    if (error instanceof DoctorError) {
      environment.writeError(`${error.message}\n`);
      return EXIT_ERROR;
    }
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    environment.writeError(`unexpected failure: ${message}\n`);
    return EXIT_ERROR;
  }
}

function resolveConfig(options: CliOptions, cwd: string): DoctorConfig {
  if (options.configPath !== undefined) return loadConfig(options.configPath);
  const discovered = join(cwd, CONFIG_FILENAME);
  return existsSync(discovered) ? loadConfig(discovered) : EMPTY_CONFIG;
}

function render(report: Report, options: CliOptions, palette: ReturnType<typeof createPalette>): string {
  if (options.format === "json") return formatJson(report);
  if (options.format === "sarif") return formatSarif(report);
  if (options.format === "markdown") return formatMarkdown(report);
  return formatPretty(report, palette);
}

function writeRendered(text: string, options: CliOptions, environment: CliEnvironment): void {
  if (options.output === undefined) {
    environment.write(text);
    return;
  }
  const target = resolve(environment.cwd, options.output);
  writeFileSync(target, text, "utf8");
  environment.write(`${options.format} report written to ${target}\n`);
}

export function exitCodeFor(report: Report, failOn: Severity | "none"): number {
  if (failOn === "none") return EXIT_CLEAN;
  const failing = report.findings.some((finding) => severityAtLeast(finding.severity, failOn));
  return failing ? EXIT_FINDINGS : EXIT_CLEAN;
}
