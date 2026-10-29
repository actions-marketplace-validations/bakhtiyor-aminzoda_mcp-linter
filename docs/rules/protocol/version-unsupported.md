# `protocol/version-unsupported`

> server reports a protocol version mcp-doctor does not know

- **Category**: `protocol`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [lifecycle/initialization](https://spec.modelcontextprotocol.io/specification/2024-11-05/lifecycle/initialization)

---

## Rationale

An unknown version string usually means the server hard-coded a version instead of echoing the client's, or it is newer than the client and the negotiation silently failed.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `protocol/version-unsupported`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "protocol/version-unsupported": "off"
  }
}
```
