import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli/args.js";

describe("parseArgs", () => {
  it("parses server command and arguments after separator", () => {
    const result = parseArgs(["--format", "json", "--env", "MODE=test", "--", "node", "server.js"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.format).toBe("json");
    expect(result.options.env).toEqual({ MODE: "test" });
    expect(result.options.command).toBe("node");
    expect(result.options.commandArgs).toEqual(["server.js"]);
  });

  it("rejects arguments outside the server separator", () => {
    expect(parseArgs(["server.js"])).toEqual({
      ok: false,
      error: 'unexpected argument "server.js". Put the server command after a -- separator, e.g. `mcp-doctor -- npx -y @modelcontextprotocol/server-filesystem .`',
    });
  });

  it("validates timeout and max pages", () => {
    expect(parseArgs(["--timeout", "0"])).toEqual({
      ok: false,
      error: "--timeout must be a positive number of milliseconds",
    });
    expect(parseArgs(["--max-pages", "2.5"])).toEqual({
      ok: false,
      error: "--max-pages must be a positive integer",
    });
  });

  it("rejects missing option values and unknown format", () => {
    expect(parseArgs(["--format"])).toEqual({ ok: false, error: "--format requires a value" });
    expect(parseArgs(["--format", "xml"])).toEqual({
      ok: false,
      error: "--format must be one of pretty, json, sarif, markdown",
    });
  });

  it("parses --init flag", () => {
    const res = parseArgs(["--init"]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.options.init).toBe(true);
  });
});
