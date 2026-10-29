# `protocol/no-capabilities`

> server declares none of tools, resources or prompts

- **Category**: `protocol`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [lifecycle/initialization](https://spec.modelcontextprotocol.io/specification/2024-11-05/lifecycle/initialization)

---

## Rationale

A server with no capabilities exposes nothing to the model. This is almost always a wiring bug — a handler registered on the wrong object, or an early return before registration.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `protocol/no-capabilities`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "protocol/no-capabilities": "off"
  }
}
```
