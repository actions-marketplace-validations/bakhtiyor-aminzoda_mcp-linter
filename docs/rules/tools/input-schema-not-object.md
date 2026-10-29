# `tools/input-schema-not-object`

> inputSchema does not describe an object

- **Category**: `tools`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

Tool arguments are always a JSON object. A schema typed as string or array makes the model emit a shape the server cannot parse.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/input-schema-not-object`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/input-schema-not-object": "off"
  }
}
```
