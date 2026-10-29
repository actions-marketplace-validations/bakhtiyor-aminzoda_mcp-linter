# `tools/parameter-description-missing`

> a declared parameter has no description

- **Category**: `tools`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

Parameter names alone rarely disambiguate: is `id` a numeric row id, a UUID or a slug? Models fill that gap by guessing, and the guess is invisible until the call fails.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/parameter-description-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/parameter-description-missing": "off"
  }
}
```
