import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const docsRulesDir = path.join(rootDir, 'docs', 'rules');

const distIndex = path.join(rootDir, 'dist', 'index.js');
const { ALL_RULES } = await import(`file://${distIndex.replace(/\\/g, '/')}`);

for (const rule of ALL_RULES) {
  const [category, ruleName] = rule.id.split('/');
  const categoryDir = path.join(docsRulesDir, category);
  fs.mkdirSync(categoryDir, { recursive: true });

  const filePath = path.join(docsRulesDir, `${rule.id}.md`);
  const specRef = rule.spec
    ? `\n- **MCP Spec Reference**: [${rule.spec}](https://spec.modelcontextprotocol.io/specification/2024-11-05/${rule.spec})`
    : '';

  const content = `# \`${rule.id}\`

> ${rule.summary}

- **Category**: \`${rule.category}\`
- **Default Severity**: \`${rule.defaultSeverity.toUpperCase()}\`${specRef}

---

## Rationale

${rule.rationale}

## How to Fix

Ensure your MCP server implementation properly adheres to the protocol specification for \`${rule.id}\`.

When returning data or implementing lifecycle handlers:
- Verify that required schema fields and annotations are provided.
- Avoid contradictory or ambiguous tool parameters.
- Provide clear descriptions so LLM hosts can generate accurate tool calls.

## Configuration

To override the severity or disable this rule in your project's \`.mcp-doctor.json\`:

\`\`\`json
{
  "rules": {
    "${rule.id}": "off"
  }
}
\`\`\`
`;

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log(`Generated docs for ${ALL_RULES.length} rules.`);
