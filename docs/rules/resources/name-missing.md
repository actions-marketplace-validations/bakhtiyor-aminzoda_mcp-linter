# `resources/name-missing`

> resource has no name

- **Category**: `resources`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/resources](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources)

---

## Rationale

The name is what a user sees in a client's resource picker. Without it the picker shows a raw URI, which users cannot tell apart or judge before attaching.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `resources/name-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "resources/name-missing": "off"
  }
}
```
