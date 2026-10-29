# `prompts/argument-name-missing`

> prompt argument has no name

- **Category**: `prompts`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [server/prompts](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/prompts)

---

## Rationale

An unnamed argument cannot be supplied: the client has no key to put in the arguments object, so the prompt always runs with that value missing.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `prompts/argument-name-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "prompts/argument-name-missing": "off"
  }
}
```
