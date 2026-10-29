# 🗺️ mcp-doctor Technical Roadmap

This roadmap outlines the planned engineering milestones for `mcp-doctor`.

---

## 📌 Phase 1: Core Hardening & Standards Conformance (Completed ✅)
- [x] Zero runtime dependency architecture.
- [x] 34 core rules across Protocol, Tools, Security, Resources, and Prompts.
- [x] OASIS SARIF v2.1.0 schema conformance for GitHub Code Scanning tab.
- [x] Multi-format reporters: Pretty ANSI, JSON, SARIF, and Markdown (`--format markdown`).
- [x] GitHub Action composite workflow (`action.yml`) with `$GITHUB_STEP_SUMMARY` support.
- [x] Health Scorecard (0–100 score & letter grades A+ to F).
- [x] Built-in mock MCP server (`mcp-doctor mock clean` / `vulnerable`).
- [x] Autofix engine (`--fix`) generating ready-to-use patch suggestions.
- [x] 49 automated tests passing with 100% success rate.

---

## 🚀 Phase 2: Multi-Transport Expansion (Q4 2026)
- [ ] **SSE Transport**: Audit remote MCP servers communicating over Server-Sent Events (HTTP/SSE).
- [ ] **WebSocket Transport**: Diagnostic handshake and health checking for stateful WebSocket connections.
- [ ] **Authentication Audit**: Validate authorization headers, OAuth2 tokens, and secret leakage in transports.

---

## 🧠 Phase 3: Semantic Security & Prompt Injection Deepening (Q1 2027)
- [ ] **Multi-turn Injection Probing**: Active, non-destructive probe generation to verify model boundary defense.
- [ ] **Context-Budget Optimization**: Heuristic calculation of token cost imposed by bloated tool schemas and descriptions.
- [ ] **Schema Auto-Scaffolder**: Automatically generate TypeScript MCP server boilerplate directly from OpenAPI / Swagger specs.

---

## 🤝 Open Source Grant Acceleration

Grant support from **Anthropic (Claude for Open Source)** and **OpenAI (Codex for Open Source)** will directly power:
1. **Model Evaluation & Probing**: Using Claude Max 20x to synthesize thousands of adversarial tool descriptions to evaluate evasion thresholds.
2. **Community Server Benchmarking**: Running automated CI audits over 500+ public MCP servers and generating automatic PRs for missing security hints.
3. **Automated Fix Verification**: Leveraging OpenAI API credits to verify whether autofixed tool schemas eliminate LLM tool-calling hallucinations.
