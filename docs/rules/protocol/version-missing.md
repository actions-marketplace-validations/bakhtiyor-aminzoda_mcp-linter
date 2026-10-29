# `protocol/version-missing`

> initialize result has no protocolVersion

- **Category**: `protocol`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [lifecycle/initialization](https://spec.modelcontextprotocol.io/specification/2024-11-05/lifecycle/initialization)

---

## Rationale

Clients negotiate behaviour from the version the server reports. Without it the client cannot know which features are safe to use and may fall back to an incompatible code path.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `protocol/version-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "protocol/version-missing": "off"
  }
}
```
