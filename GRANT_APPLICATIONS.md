# 📝 Open Source Grant Application Dossiers

This file contains application dossiers for the Anthropic and OpenAI open-source programs.

---

## 1. Anthropic: Claude for Open Source
**Portal:** [https://claude.com/contact-sales/claude-for-oss](https://claude.com/contact-sales/claude-for-oss)  
**Benefit Target:** 6 Months of Claude Max (20x tier)

### Form Fields & Responses

- **First Name:** `Bakhtior`
- **Last Name:** `Aminzoda`
- **Email:** `bakhtiyor.aminzoda@gmail.com`
- **Project Name:** `mcp-linter` (Repository: `mcp-doctor`)
- **Repository URL:** `https://github.com/bakhtiyor-aminzoda/mcp-doctor`
- **License:** `MIT License`
- **Your Role:** `Creator & Lead Maintainer`

- **Project Description:**
  > `mcp-linter` (published on npm as `mcp-linter`, runnable via `npx mcp-linter`) is a zero-runtime-dependency security auditor, protocol linter, and SARIF reporter for Anthropic's Model Context Protocol (MCP). It runs diagnostic handshakes over stdio, evaluates 34 rules spanning protocol conformance, tool annotations (`readOnlyHint`, `destructiveHint`), and detects prompt-injection vectors (tool description poisoning) before servers interact with Claude Desktop or autonomous agents.

- **Why is this project important to the Anthropic / MCP ecosystem?**
  > As the Model Context Protocol becomes the foundational standard for AI agent tools, developers frequently encounter silent failures: non-JSON-RPC stdout leaks corrupting transports, missing destructive annotations causing unprompted data mutations, and malicious description injections. `mcp-linter` provides standalone CI guardrails with OASIS SARIF v2.1.0 output for GitHub Security alerts, protecting users of Claude Desktop and agent environments. It includes an autofix engine (`--fix`), health scorecard (0-100, A+ to F), and built-in mock synthesizer (`npx mcp-linter mock clean`).

- **How will Claude Max 20x accelerate your work?**
  > Access to Claude Max 20x will enable us to:
  > 1. Synthesize thousands of edge-case adversarial tool descriptions to benchmark evasion thresholds for prompt-injection detection.
  > 2. Implement semantic auto-repair routines that rewrite ambiguous tool schemas and parameter descriptions into clear prompt definitions.
  > 3. Expand `mcp-linter` to audit HTTP/SSE and WebSocket MCP transports.

---

## 2. OpenAI: Codex for Open Source
**Portal:** [https://openai.com/form/codex-for-oss/](https://openai.com/form/codex-for-oss/)  
**Benefit Target:** 6 Months of ChatGPT Pro + Codex API Credits

### Form Fields & Responses

- **Full Name:** `Bakhtior Aminzoda`
- **Email:** `bakhtiyor.aminzoda@gmail.com`
- **Repository URL:** `https://github.com/bakhtiyor-aminzoda/mcp-doctor`
- **Primary Language / Ecosystem:** `TypeScript / Node.js / AI Developer Tooling & Agent Security`
- **License Type:** `MIT License (OSI-Approved)`

- **What does the project do & your maintainer role:**
  > I am the creator and maintainer of `mcp-linter` (repo: `mcp-doctor`), an open-source static/runtime linter and security scanner for agent tool protocols. It inspects JSON schemas, prevents prompt injection inside tool descriptions, enforces blast-radius safety annotations, calculates a 0-100 Health Scorecard, and generates SARIF v2.1.0 security alerts in CI pipelines. Zero runtime dependencies, runnable directly via `npx mcp-linter` with automated fix synthesis.

- **How will ChatGPT Pro and API credits be utilized?**
  > Access to ChatGPT Pro and Codex Open Source API credits will be used to:
  > 1. Run automated schema benchmarks against public agent tool repositories to measure tool-calling reliability.
  > 2. Automate triage, synthetic test-case generation, and pull request synthesis for third-party MCP servers.
  > 3. Expand the auditor to support remote streaming transports (SSE/WebSocket) and token context-budget auditing.
