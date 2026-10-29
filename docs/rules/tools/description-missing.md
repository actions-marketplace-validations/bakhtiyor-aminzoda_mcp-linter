# `tools/description-missing`

> tool has no description

- **Category**: `tools`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

The description is the only thing the model sees when choosing between tools. Without it the model either never calls the tool or calls it with guessed arguments.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/description-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/description-missing": "off"
  }
}
```
