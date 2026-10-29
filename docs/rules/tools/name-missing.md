# `tools/name-missing`

> tool has no name

- **Category**: `tools`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

The name is the identifier the model calls. A tool without one is unreachable and is usually a serialization bug in the server's list handler.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/name-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/name-missing": "off"
  }
}
```
