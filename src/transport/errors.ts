/**
 * Errors raised by the transport layer. The CLI maps all of them to exit code 2
 * ("the server could not be audited"), which is distinct from exit code 1
 * ("the server was audited and has findings").
 */

export class DoctorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DoctorError";
  }
}

export class ServerStartError extends DoctorError {
  constructor(
    readonly command: string,
    readonly reason: Error,
  ) {
    super(`Could not start \`${command}\`: ${reason.message}`);
    this.cause = reason;
    this.name = "ServerStartError";
  }
}

export class ServerExitError extends DoctorError {
  constructor(
    readonly code: number | null,
    readonly signal: string | null,
    readonly stderrTail: string,
  ) {
    const how = signal !== null ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    const detail = stderrTail.trim().length > 0 ? `\nServer stderr:\n${stderrTail.trim()}` : "";
    super(`Server process exited with ${how} before replying.${detail}`);
    this.name = "ServerExitError";
  }
}

export class RequestTimeoutError extends DoctorError {
  constructor(
    readonly method: string,
    readonly timeoutMs: number,
  ) {
    super(
      `\`${method}\` did not respond within ${timeoutMs}ms. Raise the limit with --timeout, ` +
        `or check that the server speaks JSON-RPC over stdio on stdout.`,
    );
    this.name = "RequestTimeoutError";
  }
}

/**
 * @deprecated Empty capabilities are evaluated as an audit finding by rule `protocol/no-capabilities`
 * and reported in `AuditReport` rather than thrown as a fatal transport exception.
 */
export class NoCapabilitiesError extends DoctorError {
  constructor() {
    super(
      "The server declared none of tools, resources or prompts. There is nothing to audit — " +
        "is this the right command?",
    );
    this.name = "NoCapabilitiesError";
  }
}
