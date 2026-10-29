import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const docsRulesDir = path.join(rootDir, 'docs', 'rules');

// Dynamically import compiled library
const distIndex = path.join(rootDir, 'dist', 'index.js');
if (!fs.existsSync(distIndex)) {
  console.error('Error: dist/index.js not found. Please run `npm run build` first.');
  process.exit(1);
}

const { ALL_RULES } = await import(`file://${distIndex.replace(/\\/g, '/')}`);

let missing = 0;
let errors = 0;

for (const rule of ALL_RULES) {
  const docPath = path.join(docsRulesDir, `${rule.id}.md`);
  if (!fs.existsSync(docPath)) {
    console.error(`MISSING DOC: docs/rules/${rule.id}.md`);
    missing++;
    continue;
  }

  const content = fs.readFileSync(docPath, 'utf8');
  if (!content.includes(rule.id)) {
    console.warn(`WARNING: docs/rules/${rule.id}.md does not mention rule id "${rule.id}"`);
  }
  if (content.trim().length < 50) {
    console.error(`TOO SHORT: docs/rules/${rule.id}.md has insufficient explanation`);
    errors++;
  }
}

if (missing > 0 || errors > 0) {
  console.error(`\nFound ${missing} missing rule doc(s) and ${errors} rule doc(s) with errors.`);
  process.exit(1);
}

console.log(`✓ All ${ALL_RULES.length} rules are fully documented in docs/rules/`);
