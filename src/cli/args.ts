import { isFailOn, type Severity } from "../audit/severity.js";
import { DEFAULT_TIMEOUT_MS } from "../transport/stdio.js";

export const OUTPUT_FORMATS = ["pretty", "json", "sarif"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const DEFAULT_MAX_PAGES = 50;

export interface CliOptions {
  readonly command: string | undefined;
  readonly commandArgs: readonly string[];
  readonly format: OutputFormat;
  readonly output: string | undefined;
  readonly timeoutMs: number | undefined;
  readonly cwd: string | undefined;
  readonly env: Readonly<Record<string, string>>;
  readonly failOn: Severity | "none" | undefined;
  readonly configPath: string | undefined;
  readonly maxPages: number;
  readonly color: boolean;
  readonly help: boolean;
  readonly version: boolean;
  readonly listRules: boolean;
  readonly explain: string | undefined;
}

export type ParseResult = { ok: true; options: CliOptions } | { ok: false; error: string };

const EMPTY: CliOptions = {
  command: undefined,
  commandArgs: [],
  format: "pretty",
  output: undefined,
  timeoutMs: undefined,
  cwd: undefined,
  env: {},
  failOn: undefined,
  configPath: undefined,
  maxPages: DEFAULT_MAX_PAGES,
  color: true,
  help: false,
  version: false,
  listRules: false,
  explain: undefined,
};

/**
 * Hand-rolled because the flag surface is small and a zero-dependency CLI is a
 * feature: `npx mcp-doctor` pulls exactly one package into the user's tree.
 */
export function parseArgs(argv: readonly string[]): ParseResult {
  const options = { ...EMPTY, env: {} as Record<string, string> };
  const commandArgs: string[] = [];
  let command: string | undefined;
  let index = 0;

  const nextValue = (flag: string): string | ParseResult => {
    const value = argv[index + 1];
    if (value === undefined) return { ok: false, error: `${flag} requires a value` };
    index += 1;
    return value;
  };

  while (index < argv.length) {
    const token = argv[index] as string;

    if (token === "--") {
      const rest = argv.slice(index + 1);
      if (rest.length === 0) return { ok: false, error: "no server command after --" };
      command = rest[0];
      commandArgs.push(...rest.slice(1));
      break;
    }

    if (!token.startsWith("-") || token === "-") {
      return {
        ok: false,
        error: `unexpected argument "${token}". Put the server command after a -- separator, e.g. \`mcp-doctor -- npx -y @modelcontextprotocol/server-filesystem .\``,
      };
    }

    switch (token) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-V":
      case "--version":
        options.version = true;
        break;
      case "--list-rules":
        options.listRules = true;
        break;
      case "--no-color":
        options.color = false;
        break;
      case "-f":
      case "--format": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        if (!(OUTPUT_FORMATS as readonly string[]).includes(value)) {
          return { ok: false, error: `--format must be one of ${OUTPUT_FORMATS.join(", ")}` };
        }
        options.format = value as OutputFormat;
        break;
      }
      case "-o":
      case "--output": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        options.output = value;
        break;
      }
      case "-t":
      case "--timeout": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return { ok: false, error: "--timeout must be a positive number of milliseconds" };
        }
        options.timeoutMs = parsed;
        break;
      }
      case "--cwd": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        options.cwd = value;
        break;
      }
      case "--env": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        const separator = value.indexOf("=");
        if (separator <= 0) return { ok: false, error: "--env expects KEY=VALUE" };
        options.env[value.slice(0, separator)] = value.slice(separator + 1);
        break;
      }
      case "--fail-on": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        if (!isFailOn(value)) {
          return { ok: false, error: "--fail-on must be error, warn, info or none" };
        }
        options.failOn = value;
        break;
      }
      case "--config": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        options.configPath = value;
        break;
      }
      case "--max-pages": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return { ok: false, error: "--max-pages must be a positive integer" };
        }
        options.maxPages = parsed;
        break;
      }
      case "--explain": {
        const value = nextValue(token);
        if (typeof value !== "string") return value;
        options.explain = value;
        break;
      }
      default:
        return { ok: false, error: `unknown option "${token}". Run \`mcp-doctor --help\`.` };
    }

    index += 1;
  }

  return {
    ok: true,
    options: { ...options, command, commandArgs, timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS },
  };
}
