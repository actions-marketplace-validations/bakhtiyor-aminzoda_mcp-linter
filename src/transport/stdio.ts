import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { JsonValue } from "../mcp/types.js";
import { RequestTimeoutError, ServerExitError, ServerStartError } from "./errors.js";
import { isRpcResponse, LineBuffer, METHOD_NOT_FOUND, RpcError, type RpcResponse } from "./jsonrpc.js";
import { resolveCommand } from "./resolve-command.js";

export const DEFAULT_TIMEOUT_MS = 10_000;
const STDERR_TAIL_CHARS = 8_192;

export interface StdioServerConfig {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly cwd: string;
  readonly timeoutMs: number;
}

interface PendingCall {
  readonly reject: (error: Error) => void;
  readonly resolve: (result: JsonValue) => void;
  readonly timer: NodeJS.Timeout;
}

/**
 * A JSON-RPC client for one stdio MCP server. Owns the child process: stdout is
 * the message channel, stderr is diagnostic output kept only as a tail for
 * error messages, and anything on stdout that is not JSON-RPC is recorded
 * rather than thrown away, because that noise breaks real clients too.
 */
export class StdioClient {
  private nextId = 1;
  private readonly pending = new Map<number, PendingCall>();
  private readonly lines = new LineBuffer();
  private readonly unparsedStdout: string[] = [];
  private stderrTail = "";
  private exitError: ServerExitError | null = null;

  private constructor(
    private readonly child: ChildProcessWithoutNullStreams,
    private readonly config: StdioServerConfig,
  ) {
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      for (const line of this.lines.push(chunk)) this.handleLine(line);
    });
    child.stderr.on("data", (chunk: string) => {
      this.stderrTail = (this.stderrTail + chunk).slice(-STDERR_TAIL_CHARS);
    });
    child.on("exit", (code, signal) => this.handleExit(code, signal));
    child.on("error", (error) => this.handleSpawnFailure(error));
  }

  static start(config: StdioServerConfig): Promise<StdioClient> {
    const env = { ...process.env, ...config.env };
    const resolved = resolveCommand(config.command, env);
    const child = spawn(resolved, [...config.args], {
      cwd: config.cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    return new Promise<StdioClient>((resolve, reject) => {
      const onSpawn = (): void => {
        detach();
        resolve(new StdioClient(child, config));
      };
      const onError = (error: Error): void => {
        detach();
        reject(new ServerStartError(config.command, error));
      };
      const detach = (): void => {
        child.off("spawn", onSpawn);
        child.off("error", onError);
      };
      child.once("spawn", onSpawn);
      child.once("error", onError);
    });
  }

  async request(method: string, params?: JsonValue): Promise<JsonValue> {
    if (this.exitError !== null) throw this.exitError;
    const id = this.nextId;
    this.nextId += 1;

    const reply = new Promise<JsonValue>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RequestTimeoutError(method, this.config.timeoutMs));
      }, this.config.timeoutMs);
      timer.unref();
      this.pending.set(id, { resolve, reject, timer });
    });

    const message = params === undefined
      ? { jsonrpc: "2.0", id, method }
      : { jsonrpc: "2.0", id, method, params };
    this.write(JSON.stringify(message));

    return reply;
  }

  notify(method: string, params?: JsonValue): void {
    const message = params === undefined
      ? { jsonrpc: "2.0", method }
      : { jsonrpc: "2.0", method, params };
    this.write(JSON.stringify(message));
  }

  getUnparsedStdout(): readonly string[] {
    return this.unparsedStdout;
  }

  getStderrTail(): string {
    return this.stderrTail;
  }

  async close(): Promise<void> {
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.stdin.end();
      this.child.kill();
      await this.waitForExit(2_000);
      if (this.child.exitCode === null && this.child.signalCode === null) {
        this.child.kill("SIGKILL");
      }
    }
    this.failPending(new ServerExitError(this.child.exitCode, null, this.stderrTail));
  }

  private waitForExit(timeoutMs: number): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.child.off("exit", onExit);
        resolve();
      }, timeoutMs);
      timer.unref();
      const onExit = (): void => {
        clearTimeout(timer);
        resolve();
      };
      this.child.once("exit", onExit);
    });
  }

  private write(serialized: string): void {
    if (this.child.stdin.destroyed) return;
    this.child.stdin.write(`${serialized}\n`);
  }

  private handleLine(rawLine: string): void {
    const line = rawLine.trim();
    if (line.length === 0) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      this.unparsedStdout.push(line);
      return;
    }

    if (isRpcResponse(parsed)) this.settle(parsed);
    else this.answerServerRequest(parsed);
  }

  private settle(response: RpcResponse): void {
    const id = typeof response.id === "string" ? Number(response.id) : response.id;
    if (id === null || !Number.isInteger(id)) return;
    const call = this.pending.get(id);
    if (call === undefined) return;

    this.pending.delete(id);
    clearTimeout(call.timer);
    if ("error" in response) call.reject(new RpcError(response.error));
    else call.resolve(response.result);
  }

  /** Servers may call back into the client (sampling, roots). We support none. */
  private answerServerRequest(message: unknown): void {
    if (typeof message !== "object" || message === null) return;
    const candidate = message as Record<string, unknown>;
    if (typeof candidate.method !== "string") return;
    if (candidate.id === undefined || candidate.id === null) return;

    this.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: candidate.id,
        error: { code: METHOD_NOT_FOUND, message: `mcp-doctor does not implement ${candidate.method}` },
      }),
    );
  }

  private handleExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.exitError = new ServerExitError(code, signal, this.stderrTail);
    this.failPending(this.exitError);
  }

  private handleSpawnFailure(error: Error): void {
    this.exitError = new ServerExitError(null, null, error.message);
    this.failPending(this.exitError);
  }

  private failPending(error: Error): void {
    for (const call of this.pending.values()) {
      clearTimeout(call.timer);
      call.reject(error);
    }
    this.pending.clear();
  }
}
