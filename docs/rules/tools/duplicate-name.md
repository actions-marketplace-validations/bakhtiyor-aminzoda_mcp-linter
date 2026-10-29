# `tools/duplicate-name`

> two tools share the same name

- **Category**: `tools`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

With duplicate names the model's call is ambiguous and the client resolves it arbitrarily, so one of the two tools can never be invoked.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/duplicate-name`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/duplicate-name": "off"
  }
}
```
