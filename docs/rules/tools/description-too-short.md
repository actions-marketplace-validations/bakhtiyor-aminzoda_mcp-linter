# `tools/description-too-short`

> description shorter than 20 characters

- **Category**: `tools`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/tools](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools)

---

## Rationale

A two-word description such as "gets data" gives the model no basis to prefer this tool over a similar one, which shows up as erratic tool selection rather than an obvious bug.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/description-too-short`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/description-too-short": "off"
  }
}
```
