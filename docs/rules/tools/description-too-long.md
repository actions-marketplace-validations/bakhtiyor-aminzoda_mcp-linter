# `tools/description-too-long`

> description longer than 1024 characters

- **Category**: `tools`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

Every description is resent on every turn. One verbose tool can dominate the context window and crowd out the conversation it was meant to help with.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/description-too-long`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/description-too-long": "off"
  }
}
```
