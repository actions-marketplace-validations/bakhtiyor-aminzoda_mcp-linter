# `tools/read-only-without-hint`

> tool name implies a read-only action but readOnlyHint is not set

- **Category**: `tools`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/tools#tool-annotations](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools#tool-annotations)

---

## Rationale

Without readOnlyHint the client treats the call as potentially mutating: it may prompt the user, skip parallel execution, or block the call entirely in a locked-down host.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/read-only-without-hint`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/read-only-without-hint": "off"
  }
}
```
