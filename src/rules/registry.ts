import { promptRules } from "./prompts.js";
import { protocolRules } from "./protocol.js";
import { resourceRules } from "./resources.js";
import type { Rule } from "./rule.js";
import { toolQualityRules } from "./tools-quality.js";
import { toolSafetyRules } from "./tools-safety.js";

/**
 * Every rule, in documentation order. Ids are a public API: they appear in
 * config files, in CI output and in suppression comments, so they are never
 * renamed once released — only deprecated.
 */
export const ALL_RULES: readonly Rule[] = [
  ...protocolRules,
  ...toolQualityRules,
  ...toolSafetyRules,
  ...resourceRules,
  ...promptRules,
];

export const RULE_BY_ID: ReadonlyMap<string, Rule> = new Map(
  ALL_RULES.map((rule) => [rule.id, rule] as const),
);

const DUPLICATE_IDS = ALL_RULES.map((rule) => rule.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index,
);
if (DUPLICATE_IDS.length > 0) {
  throw new Error(`Duplicate rule ids: ${DUPLICATE_IDS.join(", ")}`);
}

export function ruleIds(): readonly string[] {
  return ALL_RULES.map((rule) => rule.id);
}
