# `tools/annotations-missing`

> tool has no annotations at all

- **Category**: `tools`
- **Default Severity**: `INFO`
- **MCP Spec Reference**: [server/tools#tool-annotations](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools#tool-annotations)

---

## Rationale

annotations is how a server describes the blast radius of a call — read-only, destructive, idempotent, open-world. Clients use it for confirmation prompts, and hosts use it for policy.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/annotations-missing`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/annotations-missing": "off"
  }
}
```
