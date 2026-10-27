import type { SubjectKind } from "../audit/finding.js";
import type { Severity } from "../audit/severity.js";
import type { ServerSnapshot } from "../mcp/session.js";

export type RuleCategory = "protocol" | "tools" | "resources" | "prompts" | "security";

/**
 * A problem a rule found, before it is tied to a rule id and a configured
 * severity. Rules stay ignorant of configuration so they remain pure and easy
 * to test: the engine owns severity and silencing.
 */
export interface RuleIssue {
  readonly message: string;
  readonly subject?: string;
  readonly subjectKind: SubjectKind;
  readonly hint?: string;
  readonly pointer?: string;
}

export interface RuleContext {
  readonly snapshot: ServerSnapshot;
}

export interface Rule {
  /** Stable id, `category/kebab-name`. Never renamed after release. */
  readonly id: string;
  readonly category: RuleCategory;
  readonly defaultSeverity: Severity;
  /** One line, shown by `--list-rules` and used as the docs heading. */
  readonly summary: string;
  /** Why this matters in practice — shown in `--explain` output. */
  readonly rationale: string;
  /** MCP specification section this rule enforces, when there is one. */
  readonly spec?: string;
  check(context: RuleContext): RuleIssue[];
}

export function defineRule(rule: Rule): Rule {
  return rule;
}

export function issue(values: RuleIssue): RuleIssue {
  return values;
}

/** Shared guard: rules that only make sense with tools present. */
export function toolsOf(context: RuleContext): ServerSnapshot["tools"] {
  return context.snapshot.tools;
}
