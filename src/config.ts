import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isConfigurableSeverity, isFailOn, type Severity } from "./audit/severity.js";
import { invalidSeverities, unknownRuleIds } from "./rules/engine.js";
import { ruleIds } from "./rules/registry.js";
import { asRecord } from "./util/json.js";
import { DoctorError } from "./transport/errors.js";

export const CONFIG_FILENAME = ".mcp-doctor.json";

export interface DoctorConfig {
  /** Rule id → severity, including `off`. Empty when nothing is overridden. */
  readonly rules: Readonly<Record<string, string>>;
  readonly timeoutMs: number | undefined;
  readonly failOn: Severity | "none" | undefined;
}

export const EMPTY_CONFIG: DoctorConfig = {
  rules: {},
  timeoutMs: undefined,
  failOn: undefined,
};

export function loadConfig(path: string): DoctorConfig {
  const absolute = resolve(path);
  let raw: string;
  try {
    raw = readFileSync(absolute, "utf8");
  } catch (error) {
    throw new DoctorError(`Could not read config ${absolute}: ${(error as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new DoctorError(`${absolute} is not valid JSON: ${(error as Error).message}`);
  }

  const record = asRecord(parsed);
  if (record === undefined) {
    throw new DoctorError(`${absolute} must contain a JSON object`);
  }

  const rulesRaw = record["rules"];
  const rules: Record<string, string> = {};
  if (rulesRaw !== undefined) {
    const rulesRecord = asRecord(rulesRaw);
    if (rulesRecord === undefined) {
      throw new DoctorError(`${absolute}: "rules" must be an object of rule id to severity`);
    }
    for (const [ruleId, value] of Object.entries(rulesRecord)) {
      if (typeof value !== "string") {
        throw new DoctorError(`${absolute}: severity for "${ruleId}" must be a string`);
      }
      rules[ruleId] = value;
    }
  }

  const unknown = unknownRuleIds(rules);
  if (unknown.length > 0) {
    throw new DoctorError(
      `${absolute}: unknown rule ${unknown.map((id) => `"${id}"`).join(", ")}. ` +
        `Run \`mcp-doctor --list-rules\` to see every rule id.`,
    );
  }

  const invalid = invalidSeverities(rules);
  if (invalid.length > 0) {
    throw new DoctorError(
      `${absolute}: severity for ${invalid.map((id) => `"${id}"`).join(", ")} must be one of ` +
        `error, warn, info, off`,
    );
  }

  const timeoutRaw = record["timeout"];
  let timeoutMs: number | undefined;
  if (timeoutRaw !== undefined) {
    if (typeof timeoutRaw !== "number" || !Number.isFinite(timeoutRaw) || timeoutRaw <= 0) {
      throw new DoctorError(`${absolute}: "timeout" must be a positive number of milliseconds`);
    }
    timeoutMs = timeoutRaw;
  }

  const failOnRaw = record["failOn"];
  let failOn: Severity | "none" | undefined;
  if (failOnRaw !== undefined) {
    if (typeof failOnRaw !== "string" || !isFailOn(failOnRaw)) {
      throw new DoctorError(`${absolute}: "failOn" must be error, warn, info or none`);
    }
    failOn = failOnRaw;
  }

  return { rules, timeoutMs, failOn };
}

/** Exposed for the docs check: every rule id a config may reference. */
export function configurableRuleIds(): readonly string[] {
  return ruleIds();
}

export function assertSeverity(value: string): Severity | "off" {
  if (!isConfigurableSeverity(value)) {
    throw new DoctorError(`Unknown severity "${value}"`);
  }
  return value;
}
