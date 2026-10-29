# `tools/input-schema-missing`

> tool has no inputSchema

- **Category**: `tools`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

inputSchema is required by the specification. Without it a strict client rejects the tool outright and a lenient one lets the model invent arguments.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/input-schema-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/input-schema-missing": "off"
  }
}
```
