# `tools/destructive-without-hint`

> tool name implies a destructive action but destructiveHint is not set

- **Category**: `tools`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/tools#tool-annotations](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools#tool-annotations)

---

## Rationale

A client only warns the user or requires confirmation when destructiveHint is true. A delete_* tool that omits it gets called silently, and the first evidence of the problem is missing data.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/destructive-without-hint`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/destructive-without-hint": "off"
  }
}
```
