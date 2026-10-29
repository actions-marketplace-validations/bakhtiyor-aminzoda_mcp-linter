# `prompts/description-missing`

> prompt has no description

- **Category**: `prompts`
- **Default Severity**: `WARN`
- **MCP Spec Reference**: [server/prompts](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/prompts)

---

## Rationale

Users choose prompts from a list. A description is the only thing distinguishing `review` from `review-deep` in that list.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `prompts/description-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "prompts/description-missing": "off"
  }
}
```
