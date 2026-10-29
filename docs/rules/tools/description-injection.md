# `tools/description-injection`

> tool description contains text that reads as prompt injection

- **Category**: `security`
- **Default Severity**: `ERROR`
- **MCP Spec Reference**: [security/tool-poisoning](https://spec.modelcontextprotocol.io/specification/2024-11-05/security/tool-poisoning)

---

## Rationale

Tool descriptions are model input, not documentation. Text that tells the model to ignore instructions, hide an action from the user, or send data to a URL is tool poisoning: the user sees a harmless-looking tool while the description drives the model.

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for `tools/description-injection`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's `.mcp-doctor.json`:

```json
{
  "rules": {
    "tools/description-injection": "off"
  }
}
```
