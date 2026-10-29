# `prompts/duplicate-name`

> two prompts share the same name

- **Category**: `prompts`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/prompts](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/prompts)

---

## Rationale

Duplicate prompt names make selection order-dependent: whichever the server lists first wins, and the other becomes unreachable without any error.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `prompts/duplicate-name`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "prompts/duplicate-name": "off"
  }
}
```
