# `tools/title-missing`

> tool has no human-readable title

- **Category**: `tools`
- **Default Severity**: `INFO`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

Some clients show the title in a permission prompt instead of the machine name, so a user is asked to approve `exec_sql_v2` rather than something they can judge.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/title-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/title-missing": "off"
  }
}
```
