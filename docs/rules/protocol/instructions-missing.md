# `protocol/instructions-missing`

> no initialize instructions provided

- **Category**: `protocol`
- **Default Severity**: `INFO`
- **MCP Spec Reference**: [lifecycle/initialization](https://spec.modelcontextprotocol.io/specification/2024-11-05/lifecycle/initialization)

---

## Rationale

instructions is the one place a server can explain itself to the model without spending a tool description on it. Omitting it is allowed but the model then guesses how the tools fit together.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `protocol/instructions-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "protocol/instructions-missing": "off"
  }
}
```
