# `tools/annotation-conflict`

> tool claims to be both read-only and destructive

- **Category**: `tools`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/tools#tool-annotations](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools#tool-annotations)

---

## Rationale

readOnlyHint and destructiveHint contradict each other. Clients resolve the contradiction differently, so the same server gets a confirmation dialog in one host and none in another.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/annotation-conflict`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/annotation-conflict": "off"
  }
}
```
