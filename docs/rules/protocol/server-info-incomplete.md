# `protocol/server-info-incomplete`

> serverInfo is missing name or version

- **Category**: `protocol`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [lifecycle/initialization](https://spec.modelcontextprotocol.io/specification/2024-11-05/lifecycle/initialization)

---

## Rationale

Clients show this to users and write it to logs. Without it, an incident report cannot tell which server produced a bad tool call.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `protocol/server-info-incomplete`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "protocol/server-info-incomplete": "off"
  }
}
```
