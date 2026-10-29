# `resources/mime-type-missing`

> resource has no mimeType

- **Category**: `resources`
- **Default Severity**: `INFO`
- **MCP Spec Reference**: [server/resources](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources)

---

## Rationale

Clients pick a renderer from the mime type. Without it a markdown document may be shown as plain text and a binary blob may be pushed into the context as mojibake.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `resources/mime-type-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "resources/mime-type-missing": "off"
  }
}
```
