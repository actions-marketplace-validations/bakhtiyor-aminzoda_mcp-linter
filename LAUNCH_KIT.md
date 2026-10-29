# 🚀 mcp-doctor Community Launch Kit

Use these ready-to-post drafts to introduce `mcp-doctor` to developer communities, gather feedback, and collect initial GitHub stars.

---

## 1. Reddit Post (`r/ClaudeAI`, `r/LocalLLaMA`, `r/node`)

**Title**: *I built mcp-doctor: A zero-dependency security auditor & linter for Model Context Protocol servers*

**Body**:
```markdown
Hey everyone!

With Claude Desktop and autonomous agent frameworks embracing Anthropic's Model Context Protocol (MCP), I noticed a recurring issue when building and testing custom MCP servers:

1. A single stray `console.log` on `stdout` breaks JSON-RPC 2.0 framing and silently kills the connection.
2. If a mutating tool (like `delete_record` or `drop_table`) forgets `annotations.destructiveHint = true`, the agent executes it silently without asking for user confirmation.
3. Hidden prompt-injection vectors inside tool descriptions can hijack agent behavior (Tool Poisoning).
4. Bad schema definitions cause models to hallucinate parameter values.

To solve this, I built **`mcp-doctor`** — an open-source, zero-dependency CLI auditor and GitHub Action.

### Quick Test:
```bash
npx mcp-doctor -- npx -y @modelcontextprotocol/server-filesystem .
```

### Key Highlights:
- **34 Built-in Rules**: Protocol handshake, JSON Schema validation, tool safety hints (`readOnlyHint`, `destructiveHint`), and prompt-injection detection.
- **Zero Runtime Dependencies**: Written in pure Node.js built-ins.
- **GitHub Action & SARIF v2.1.0**: Automatically uploads findings directly to your GitHub repository's "Security > Code scanning" tab.

Repo: https://github.com/bakhtiyor-aminzoda/mcp-doctor

I’d love your feedback! Are there specific MCP edge cases or failure modes you'd like to see added?
```

---

## 2. Hacker News: Show HN

**Title**: *Show HN: MCP-Doctor – Zero-dependency security auditor and linter for MCP servers*

**URL / Text**:
```markdown
Link: https://github.com/bakhtiyor-aminzoda/mcp-doctor

Hi HN!

As the Model Context Protocol (MCP) gains adoption for connecting frontier LLMs to local tools and APIs, maintaining protocol hygiene and agent safety is becoming critical.

I created `mcp-doctor`, an open-source diagnostic CLI and CI scanner for MCP servers. It starts the server over stdio, performs a safe handshake, inspects tools, resources, and prompts, and evaluates 34 rules covering:

1. Protocol conformance (version negotiation, stray stdout logs corrupting RPC framing).
2. Blast radius annotations (enforcing `destructiveHint` on destructive tools to ensure human-in-the-loop prompts in Claude Desktop).
3. Tool poisoning heuristics (detecting prompt-injection overrides hidden in tool descriptions).
4. Schema quality for reliable tool calling.

Outputs colored terminal findings, raw JSON, or OASIS SARIF v2.1.0 for GitHub code scanning. Zero runtime dependencies.

Would love feedback on additional protocol edge cases or security heuristics!
```

---

## 3. Twitter / X Thread

```text
🚀 Introducing mcp-doctor — a zero-dependency security auditor and linter for Anthropic's Model Context Protocol (MCP) servers.

Built to solve 3 big pain points:
1. Stray stdout logs crashing JSON-RPC
2. Missing destructive hints causing unprompted deletions
3. Tool description prompt injection

Features:
✅ 34 validation rules
✅ Zero runtime deps (pure Node)
✅ SARIF 2.1.0 for GitHub Security tab
✅ GitHub Action ready

Audit your server in 5 seconds:
npx mcp-doctor -- <your-server-command>

⭐ GitHub: https://github.com/bakhtiyor-aminzoda/mcp-doctor

#MCP #Anthropic #Claude #AIagents #CyberSecurity #OpenSource
```
