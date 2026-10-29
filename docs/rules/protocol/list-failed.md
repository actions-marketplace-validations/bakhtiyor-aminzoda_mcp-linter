# `protocol/list-failed`

> a list method declared by capabilities failed

- **Category**: `protocol`
- **Default Severity**: `ERROR`

---

## Rationale

Declaring a capability and then failing the matching list call leaves the client with a half-loaded server, usually with no explanation beyond a generic error.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `protocol/list-failed`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "protocol/list-failed": "off"
  }
}
```
