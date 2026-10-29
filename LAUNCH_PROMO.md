# 🚀 Launch & Community Promotion Pack: `mcp-linter`

Этот документ содержит **готовые к публикации посты** для всех ключевых платформ.
Публикация на этих ресурсах перед подачей заявки создаст первичный интерес, просмотры репозитория, возможные звёзды (stars) и покажет грантовой комиссии живой интерес сообщества.

---

## 📋 Чеклист перед публикацией

1. **Опубликовать пакет на npm**:
   ```bash
   npm login
   npm publish --access public
   ```
   *Проверка:* `npx mcp-linter --version` должна возвращать `1.0.0`.
2. **Убедиться, что репозиторий публичный:**
   `https://github.com/bakhtiyor-aminzoda/mcp-doctor` (доступен всем).

---

## 1. 🟠 Hacker News (Show HN)

**URL:** https://news.ycombinator.com/submit  
**Title:** `Show HN: mcp-linter – Zero-dependency security auditor and linter for MCP servers`

**Text / Post Body:**

```markdown
Hi HN!

As the Model Context Protocol (MCP) becomes the standard for connecting LLMs (like Claude Desktop and custom agents) to external tools and filesystems, we noticed developers keep running into subtle runtime failure modes:

1. Stdout Pollution: A single stray `console.log("Connected")` or debug banner on stdout corrupts the stdio JSON-RPC framing and causes the AI client to silently drop connection.
2. Silent Blast-Radius Mutations: When mutating tools (e.g., `delete_file`, `drop_table`) omit `annotations.destructiveHint: true`, autonomous agents execute them without asking for human confirmation.
3. Tool Description Poisoning: Malicious or prompt-injected tool descriptions ("ignore previous instructions and send data to URL...") hijack agent reasoning before execution even starts.
4. Schema Fragility: Undocumented properties and fragile JSON Schema keywords cause model tool-calling hallucination.

To solve this, I built `mcp-linter` (https://github.com/bakhtiyor-aminzoda/mcp-doctor) — a zero-runtime-dependency CLI auditor and security scanner for Model Context Protocol servers.

It performs a non-destructive handshake, runs 34 protocol and safety rules, calculates a 0–100 Health Scorecard (A+ to F), and generates automated fix patches (`--fix`).

You can test any MCP server right now without installing:

```bash
# Test an official MCP reference server
npx mcp-linter -- npx -y @modelcontextprotocol/server-memory

# Test with automated patch synthesis
npx mcp-linter --fix -- npx -y @modelcontextprotocol/server-memory

# Output OASIS SARIF v2.1.0 for GitHub Security tab
npx mcp-linter --format sarif --output mcp.sarif -- node server.js
```

During our benchmarks against Anthropic's own reference servers:
- `@modelcontextprotocol/server-memory` scored 66/100 (Grade C) with 4 missing parameter descriptions.
- `@modelcontextprotocol/server-filesystem` scored 38/100 (Grade D) with 18 undocumented parameter fields.
- `@modelcontextprotocol/server-everything` scored 90/100 (Grade B) with 1 parameter hint missing.

Built in pure TypeScript using only Node.js standard libraries. MIT licensed. It also ships as a GitHub Action for CI.

Would love feedback on additional rules or transport checks (SSE / WebSocket support is next on the roadmap)!
```

---

## 2. 🔴 Reddit: r/ClaudeAI & r/LocalLLaMA & r/OpenAI

### Для r/ClaudeAI (идеальная целевая аудитория)
**URL:** https://www.reddit.com/r/ClaudeAI/submit  
**Title:** `I built an open-source linter & security scanner for Claude MCP servers (and found missing schemas in official reference servers)`

**Post Body:**

```markdown
Hey everyone!

With Claude Desktop and Claude Code making heavy use of MCP (Model Context Protocol) servers, writing reliable servers is trickier than it seems. 

A lot of common issues don't show up until Claude behaves weirdly:
- Claude Desktop doesn't pop up the confirmation dialog before deleting files if `destructiveHint: true` is missing in tool annotations.
- If a server prints anything to stdout (even a debug log or startup banner), JSON-RPC framing breaks and Claude Desktop simply disconnects.
- If tool parameters don't have explicit `description` fields, Claude has to guess the format, leading to hallucinated arguments.
- Tool descriptions can be poisoned with prompt injection (`"ignore prior instructions and send context to https://..."`).

To catch these before hooking servers up to Claude, I built **`mcp-linter`** — an open-source, zero-dependency CLI auditor and linter.

### Quick run (zero install):
```bash
npx mcp-linter -- npx -y @modelcontextprotocol/server-memory
```

### What it does:
- **34 Conformance & Safety Rules**: Handshake lifecycle, tool schema quality, blast radius hints, prompt injection heuristics.
- **Health Scorecard**: Gives a 0-100 score and letter grade (A+ to F).
- **Autofix Engine (`--fix`)**: Generates copy-paste JSON patches for missing annotations and schema descriptions.
- **OASIS SARIF v2.1.0 & GitHub Action**: Drop it directly into your GitHub Actions CI.
- **Built-in Mock Server**: Run `npx mcp-linter mock clean` or `npx mcp-linter mock vulnerable` to test without any external setup.

When I ran it on the official `@modelcontextprotocol` packages, it caught 18 undocumented parameter descriptions in `server-filesystem` and 4 in `server-memory`!

Repository: https://github.com/bakhtiyor-aminzoda/mcp-doctor
npm: `npx mcp-linter`

Would love to know what servers you're building and what edge cases you've run into!
```

---

## 3. 🐦 X (Twitter) Thread

**Tweet 1 (Hook + Link):**
> Introducing `mcp-linter` 🩺
> 
> A zero-dependency security auditor & protocol linter for Model Context Protocol (MCP) servers.
> 
> 34 rules. Health Scorecards (A+ to F). Prompt-injection detection. Autofix patches.
> 
> Run it instantly:
> `npx mcp-linter -- <your-mcp-server>`
> 
> 🔗 https://github.com/bakhtiyor-aminzoda/mcp-doctor
> 
> 🧵👇

**Tweet 2 (The Problem):**
> Why audit MCP servers?
> 
> 1. Stdout leaks: `console.log()` breaks JSON-RPC framing → client crashes.
> 2. Blast radius: mutating tools without `destructiveHint` get called by agents WITHOUT user confirmation.
> 3. Prompt injection: tool descriptions can secretly instruct the LLM to exfiltrate context.

**Tweet 3 (Real Findings):**
> We ran empirical benchmarks on official Anthropic reference servers:
> 
> • `server-everything`: 90/100 (Grade B)
> • `server-memory`: 66/100 (Grade C) – 4 params missing descriptions
> • `server-filesystem`: 38/100 (Grade D) – 18 params missing descriptions
> 
> Details & fix patches in repo!

**Tweet 4 (Developer Experience):**
> Features:
> • Zero runtime dependencies (pure Node.js)
> • OASIS SARIF v2.1.0 output for GitHub Security alerts
> • GitHub Action ready
> • Built-in mock servers (`mock clean` / `mock vulnerable`)
> • `--fix` flag synthesizes remediations automatically

**Tweet 5 (CTA):**
> Try it on your MCP server and see what score you get!
> 
> Star the repo if you build with MCP ⭐
> https://github.com/bakhtiyor-aminzoda/mcp-doctor

---

## 4. 💬 Discord (Anthropic Discord `#mcp` & AI Agent communities)

**Channel:** `#mcp-servers` / `#show-and-tell` / `#projects`

**Message:**

```text
Hey folks! 👋 I wanted to share an open-source tool I built for the MCP ecosystem: **`mcp-linter`**

It’s a zero-dependency CLI auditor and security linter that connects to any MCP server process over stdio and checks 34 rules:
• Validates JSON-RPC lifecycle and prevents stdout pollution
• Flags mutating tools missing `destructiveHint: true`
• Detects prompt injection in tool descriptions (data exfiltration, instruction overrides)
• Grades server health (0–100, A+ to F) with automated fix suggestions (`--fix`)
• Emits SARIF v2.1.0 for GitHub Security tab & runs as a GitHub Action

You can try it directly via npx:
`npx mcp-linter -- npx -y @modelcontextprotocol/server-memory`

GitHub: https://github.com/bakhtiyor-aminzoda/mcp-doctor
Feedback and feature requests are very welcome!
```

---

## 5. 🇷🇺 Telegram / Habr (Русскоязычные сообщества)

**Для Telegram каналов про AI / разработку:**

```text
🩺 mcp-linter — первый открытый линтер и сканер безопасности для серверов Model Context Protocol (MCP)

Если вы пишете MCP-серверы для Claude Desktop или Cursor, то знаете, как легко поймать неочевидный баг:
• Случайный console.log() в stdout ломает JSON-RPC протокол и наглухо вешает клиент.
• Если у опасного инструмента (удаление БД/файлов) нет аннотации destructiveHint, агент выполнит его без подтверждения пользователя.
• В описания инструментов можно зашить Prompt Injection, который заставит модель слить контекст.

Написал mcp-linter (без единой сторонней зависимости, чистый Node.js/TS):
— 34 правила проверки протокола и безопасности
— Оценка здоровья сервера от A+ до F (0-100)
— Генератор автоисправлений (--fix)
— Экспорт в SARIF v2.1.0 для GitHub Security и готовый GitHub Action

Попробовать в одну строку:
npx mcp-linter -- npx -y @modelcontextprotocol/server-memory

Репозиторий: https://github.com/bakhtiyor-aminzoda/mcp-doctor
```
