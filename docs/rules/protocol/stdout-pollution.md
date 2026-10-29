# `protocol/stdout-pollution`

> non JSON-RPC output written to stdout

- **Category**: `protocol`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [transports/stdio](https://spec.modelcontextprotocol.io/specification/2024-11-05/transports/stdio)

---

## Rationale

stdout is the message channel. A log line, banner or progress dot on stdout corrupts the stream and, depending on the client, either breaks parsing or silently drops the message that followed.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `protocol/stdout-pollution`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "protocol/stdout-pollution": "off"
  }
}
```
