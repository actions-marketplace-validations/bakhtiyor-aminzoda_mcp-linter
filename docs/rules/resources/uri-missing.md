# `resources/uri-missing`

> resource has no uri

- **Category**: `resources`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/resources](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources)

---

## Rationale

The uri is how a resource is read and how it is referenced from a prompt or a tool result. A resource without one can be listed but never fetched.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `resources/uri-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "resources/uri-missing": "off"
  }
}
```
