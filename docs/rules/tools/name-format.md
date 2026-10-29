# `tools/name-format`

> tool name uses characters outside [a-zA-Z0-9_-] or exceeds 64 chars

- **Category**: `tools`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

Several clients and model APIs reject or transliterate names with dots, spaces, slashes or non-ASCII characters, which turns a working server into one that fails only on some hosts.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/name-format`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/name-format": "off"
  }
}
```
