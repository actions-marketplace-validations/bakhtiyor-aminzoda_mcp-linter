# `resources/template-uri-invalid`

> resource template uriTemplate is not a valid URI template

- **Category**: `resources`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/resources#resource-templates](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources#resource-templates)

---

## Rationale

A template without a scheme, or with an unclosed brace, cannot be expanded by the client. The resource silently never appears even though the server believes it published it.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `resources/template-uri-invalid`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "resources/template-uri-invalid": "off"
  }
}
```
