import { OUTPUT_FORMATS } from "./args.js";
import { ALL_RULES, RULE_BY_ID } from "../rules/registry.js";
import { VERSION } from "../version.js";

export function helpText(): string {
  return [
    `mcp-doctor ${VERSION} — audit a Model Context Protocol server`,
    "",
    "Usage",
    "  mcp-doctor [options] -- <command> [args...]",
    "",
    "Examples",
    "  mcp-doctor -- npx -y @modelcontextprotocol/server-filesystem .",
    "  mcp-doctor --format sarif --output mcp.sarif -- node ./build/server.js",
    "  mcp-doctor --fail-on none -- node server.js   # report without failing CI",
    "",
    "Options",
    "  -f, --format <fmt>     output format: " + OUTPUT_FORMATS.join(", ") + " (default: pretty)",
    "  -o, --output <file>    write the report to a file instead of stdout",
    "  -t, --timeout <ms>     per-request timeout (default: 10000)",
    "      --cwd <dir>        working directory for the server process",
    "      --env <KEY=VALUE>  extra environment variable (repeatable)",
    "      --fail-on <level>  exit 1 when findings reach: error, warn, info, none",
    "                         (default: error)",
    "      --config <file>    path to .mcp-doctor.json",
    "      --init             generate a starter .mcp-doctor.json in current directory",
    "      --max-pages <n>    cap on paginated list calls (default: 50)",
    "      --no-color         disable ANSI colour",
    "      --list-rules       print every rule id and exit",
    "      --explain <rule>   print one rule's rationale and exit",
    "  -V, --version          print the version and exit",
    "  -h, --help             print this text and exit",
    "",
    "Exit codes",
    "  0  no findings at or above the threshold",
    "  1  findings at or above the threshold",
    "  2  the server could not be audited (did not start, timed out, bad config)",
    "",
    "Configuration",
    "  .mcp-doctor.json in the current directory, or --config <file>:",
    '    { "rules": { "tools/title-missing": "off" }, "timeout": 15000, "failOn": "warn" }',
  ].join("\n");
}

export function listRulesText(): string {
  const rows = ALL_RULES.map((rule) => `${rule.id.padEnd(38)} ${rule.defaultSeverity.padEnd(6)} ${rule.summary}`);
  return [`${ALL_RULES.length} rules`, "", ...rows].join("\n");
}

export function explainText(ruleId: string): string | undefined {
  const rule = RULE_BY_ID.get(ruleId);
  if (rule === undefined) return undefined;

  const lines = [
    rule.id,
    "",
    rule.summary,
    "",
    "Why it matters",
    wrap(rule.rationale, 88, "  "),
    "",
    `Category   ${rule.category}`,
    `Severity   ${rule.defaultSeverity}`,
  ];
  if (rule.spec !== undefined) lines.push(`Spec       ${rule.spec}`);
  return lines.join("\n");
}

function wrap(text: string, width: number, indent: string): string {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = indent;

  for (const word of words) {
    if (current.length + word.length + 1 > width && current.trim().length > 0) {
      lines.push(current.trimEnd());
      current = indent;
    }
    current += `${word} `;
  }
  if (current.trim().length > 0) lines.push(current.trimEnd());
  return lines.join("\n");
}
