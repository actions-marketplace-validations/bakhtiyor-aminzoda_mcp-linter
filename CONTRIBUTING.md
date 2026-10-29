# Contributing to mcp-doctor

Thank you for your interest in contributing to **mcp-doctor**! We welcome bug reports, feature requests, documentation improvements, and new audit rules.

---

## 🛠️ Development Setup

`mcp-doctor` is written in TypeScript and designed with **zero runtime dependencies**.

```bash
# 1. Clone the repository
git clone https://github.com/bakhtiyor-aminzoda/mcp-linter.git
cd mcp-doctor

# 2. Install dev dependencies
npm install

# 3. Build TypeScript to dist/
npm run build

# 4. Run test suites
npm test

# 5. Validate rule documentation
npm run lint:docs
```

---

## 📐 Adding a New Rule

All rules live in `src/rules/` and implement the `Rule` interface.

1. **Pick the category:**
   - `protocol`: initialization, handshake, stdio transport framing, list methods.
   - `tools`: schema structure, naming, descriptions, arguments.
   - `security`: prompt-injection heuristics, destructive action hints, blast radius.
   - `resources`: URIs, templates, MIME-types.
   - `prompts`: argument definitions and descriptions.

2. **Define the rule:**
   ```typescript
   import { defineRule, issue } from "./rule.js";

   export const myNewRule = defineRule({
     id: "category/rule-name",
     category: "tools",
     defaultSeverity: "error", // "error" | "warn" | "info"
     summary: "short one-sentence description",
     rationale: "detailed explanation of why this rule protects users and models",
     spec: "server/tools", // optional link to MCP specification
     check: ({ snapshot }) => {
       // Inspect snapshot.tools, snapshot.resources, etc.
       return issues;
     },
   });
   ```

3. **Register the rule:**
   Add your rule to `ALL_RULES` in `src/rules/registry.ts`.

4. **Document the rule:**
   Run the doc generator or create `docs/rules/<category>/<rule-name>.md`:
   ```bash
   node scripts/generate-rule-docs.mjs
   npm run lint:docs
   ```

5. **Write tests:**
   Add unit and integration tests in `test/`.

---

## 🧪 Pull Request Checklist

Before submitting a Pull Request:
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run build` compiles cleanly.
- [ ] `npm test` passes all tests.
- [ ] `npm run lint:docs` verifies all rules have up-to-date documentation.
- [ ] No external runtime dependencies were added to `dependencies` in `package.json`.
