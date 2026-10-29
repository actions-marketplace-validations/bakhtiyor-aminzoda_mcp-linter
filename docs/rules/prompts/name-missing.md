# `prompts/name-missing`

> prompt has no name

- **Category**: `prompts`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/prompts](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/prompts)

---

## Rationale

A prompt is retrieved by name when the user picks it from a slash menu. Without a name it can be listed but never invoked.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `prompts/name-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "prompts/name-missing": "off"
  }
}
```
