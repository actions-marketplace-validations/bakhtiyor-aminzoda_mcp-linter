import { describe, expect, it } from "vitest";
import { toolSafetyRules } from "../../src/rules/tools-safety.js";
import type { RuleContext } from "../../src/rules/rule.js";

const rule = toolSafetyRules.find((r) => r.id === "tools/read-only-without-hint")!;

function check(annotations?: Record<string, unknown>) {
  const snapshot = { tools: [{ name: "get_network_request", annotations }] };
  return rule.check({ snapshot } as unknown as RuleContext);
}

describe("tools/read-only-without-hint", () => {
  it("flags a read-only-looking tool with no readOnlyHint", () => {
    expect(check()).toHaveLength(1);
    expect(check({ title: "Get request" })).toHaveLength(1);
  });

  it("respects an explicit readOnlyHint: false", () => {
    expect(check({ readOnlyHint: false })).toHaveLength(0);
  });

  it("passes when readOnlyHint is true", () => {
    expect(check({ readOnlyHint: true })).toHaveLength(0);
  });
});
