# `resources/uri-not-absolute`

> resource uri has no scheme

- **Category**: `resources`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/resources](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources)

---

## Rationale

Relative URIs collide across servers: two servers both exposing `config.json` become indistinguishable once a client merges their resource lists.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `resources/uri-not-absolute`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "resources/uri-not-absolute": "off"
  }
}
```
