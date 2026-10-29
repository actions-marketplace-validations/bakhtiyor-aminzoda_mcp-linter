/**
 * Programmatic API. The CLI is the primary interface; this export exists so a
 * project can run the same audit inside its own test suite without spawning a
 * second node process.
 */
export { run, exitCodeFor, type CliEnvironment } from "./cli/main.js";
export { parseArgs, type CliOptions } from "./cli/args.js";
export { auditServer, type AuditRequest } from "./cli/audit-command.js";
export { collectSnapshot, type ServerSnapshot } from "./mcp/session.js";
export { runRules, type SeverityOverrides } from "./rules/engine.js";
export { ALL_RULES, RULE_BY_ID, ruleIds } from "./rules/registry.js";
export type { Rule } from "./rules/rule.js";
export { buildReport, type Report } from "./audit/report.js";
export type { Finding } from "./audit/finding.js";
export { formatJson } from "./report/json.js";
export { formatSarif, type SarifOptions, resolveArtifactUri } from "./report/sarif.js";
export { loadConfig, type DoctorConfig } from "./config.js";
export { VERSION } from "./version.js";
