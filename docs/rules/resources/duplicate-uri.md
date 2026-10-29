# `resources/duplicate-uri`

> two resources share the same uri

- **Category**: `resources`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/resources](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources)

---

## Rationale

A read request by uri returns one of them, chosen by the server's own ordering. The other resource is unreachable and nothing in the protocol exposes that.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `resources/duplicate-uri`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "resources/duplicate-uri": "off"
  }
}
```
