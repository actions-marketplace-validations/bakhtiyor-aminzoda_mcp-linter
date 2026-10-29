# `prompts/argument-description-missing`

> prompt argument has no description

- **Category**: `prompts`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/prompts](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/prompts)

---

## Rationale

Prompt arguments are filled in by a user or by the model. An undescribed argument such as `mode: string` leaves both guessing the accepted values.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `prompts/argument-description-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "prompts/argument-description-missing": "off"
  }
}
```
