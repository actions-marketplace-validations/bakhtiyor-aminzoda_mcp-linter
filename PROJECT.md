# Project: mcp-doctor

## Architecture
`mcp-doctor` is a zero-runtime-dependency CLI and diagnostic engine for Model Context Protocol (MCP) servers. It spawns the server via stdio transport, performs initialization handshake, catalogs capabilities (tools, resources, prompts), inspects JSON-RPC 2.0 frames and schemas, and evaluates a registry of audit rules to detect protocol non-compliance, security vulnerabilities, schema fragility, and tool design flaws.

### Data Flow
1. **Invocation**: CLI parses arguments (`src/cli/args.ts`) -> determines command and formatting options.
2. **Session / Transport**: `StdioClient` (`src/transport/stdio.ts`) spawns target process, sends `initialize` request, collects server info and capabilities, and queries `tools/list`, `resources/list`, `prompts/list`.
3. **Snapshot**: `McpSnapshot` captures server metadata, capabilities, tools, resources, prompts, and transport telemetry (stdout/stderr frames).
4. **Rule Execution**: `RuleEngine` (`src/rules/engine.ts`) executes registered rules across 5 categories against the snapshot.
5. **Autofix / Remediation**: Autofix engine generates fixes or scaffolds for eligible findings.
6. **Reporting**: Formats findings into Pretty Console, JSON, Markdown, or SARIF v2.1.0 (`src/report/`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dead Rule Fix (`protocol/no-capabilities`) | Remove premature exception in `audit-command.ts` so `protocol/no-capabilities` is evaluated and reported | M1 | Survey |
| 2 | SARIF v2.1.0 Compliance & GitHub Scanning | Fix schema violations (`result.help`), add `physicalLocation` with repository URI, add `helpUri` and correct repo URL | M1 | Survey |
| 3 | Documentation & Severity Alignment | Reconcile 6 severity discrepancies between `README.md` and rule definitions | M1 | Survey |
| 4 | Version Synchronization Test | Add `test/version.test.ts` to keep `package.json` and `src/version.ts` in sync | M1 | Survey |
| 5 | Full 34-Rule Automated Test Coverage | Unit test coverage for all 34 rules across protocol, tools-quality, tools-safety, resources, and prompts | M2 | Survey |
| 6 | Reporter & Transport Unit Tests | Dedicated unit test suites for SARIF, Pretty, JSON reporters and stdio error paths | M2 | Survey |
| 7 | Protocol Framing & Annotation Diagnostic Rules | Deepen rule engine with advanced protocol framing checks and safety annotations | M2 | Survey |
| 8 | Autofix Engine (`--fix`) | Generate automated remediation patches, scaffold suggestions, and parameter descriptions | M3 | Survey |
| 9 | Health Scorecard & CLI UX Polish | Compute 0-100 Health Score, letter grades (A+ to F), and rich terminal summary with OSC 8 hyperlinks | M3 | Survey |
| 10| GitHub Action `$GITHUB_STEP_SUMMARY` & Markdown Report | Emits PR-ready Markdown summaries for CI workflows and GitHub Actions | M3 | Survey |
| 11| Mock MCP Server Synthesizer (`mock` / `generate-mock`) | Built-in mock MCP server utility supporting 5 configurable fault profiles for CI and testing | M4 | Survey |
| 12| Reference MCP Server Benchmark Suite (`BENCHMARK.md`) | Automated test fixtures and benchmark audit results for 5 official MCP reference servers | M4 | Survey |
| 13| 100% E2E Test Suite Pass (Tiers 1-4) | Comprehensive opaque-box test suite passing across all output formats and commands | M5 | Survey |
| 14| Adversarial Coverage Hardening (Tier 5) | White-box adversarial testing and gap analysis ensuring zero regressions and high robustness | M5 | Survey |
| 15| Audit Report & Improvement Roadmap | Detailed repository documents `AUDIT_REPORT.md` and `ROADMAP.md` | M6 | Survey |
| 16| Grant Readiness Package & Launch Kit | Document `GRANT_APPLICATIONS.md` aligning with Anthropic & OpenAI grant requirements, plus health files (`CONTRIBUTING.md`, `SECURITY.md`) | M6 | Survey |
| 17| Documentation Polish (`README.md`) | Complete overhaul of `README.md` reflecting all new features, scorecard, autofix, and benchmarks | M6 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Critical Bug Fixes & Engine Hardening | Fix dead rule in `audit-command.ts`, fix SARIF compliance, align rule severities, add `version.test.ts` | none | IN_PROGRESS |
| 2 | Rule Engine Deepening & Comprehensive Test Suite | Complete test coverage for all 34 rules, reporter unit tests, protocol framing rules | M1 | PLANNED |
| 3 | Autofix Engine & Interactive UX Polish | Implement `--fix`, health scorecard (0-100, A-F), Markdown report & CI step summary | M1 | PLANNED |
| 4 | Mock Synthesizer & Reference Benchmark Suite | Implement mock server generator with 5 fault profiles, reference server fixtures & `BENCHMARK.md` | M2, M3 | PLANNED |
| 5 | E2E Verification & Adversarial Coverage Hardening | Pass 100% of Tiers 1-4 E2E tests, Tier 5 white-box adversarial stress tests | M1, M2, M3, M4 | PLANNED |
| 6 | Grant Readiness Package & Community Polish | `AUDIT_REPORT.md`, `ROADMAP.md`, `GRANT_APPLICATIONS.md`, health files, `README.md` update | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts

### Audit Engine & CLI
- Function: `auditServer(request: AuditRequest): Promise<AuditResult>`
  - Request: `{ target: ProcessTarget, timeoutMs?: number, ruleOverrides?: Record<string, Severity>, sourceFile?: string }`
  - Result: `{ report: AuditReport, exitCode: number, score: number, grade: string }`
- Error handling: Non-fatal server issues (such as empty capabilities or protocol anomalies) MUST NOT throw `DoctorError`; they must be recorded as findings in `AuditReport`. Fatal process startup errors (e.g., binary not found `ENOENT`) throw `ProcessSpawnError`.

### Autofix Engine
- Function: `generateFixes(findings: Finding[], snapshot: McpSnapshot): AutofixResult`
  - Output: List of patches / suggestions with target subject, diff or guidance text, and rule ID.

### SARIF Reporter (`src/report/sarif.ts`)
- Function: `formatSarif(report: AuditReport, options?: SarifOptions): string`
  - Schema: `https://json.schemastore.org/sarif-2.1.0.json`
  - Rules: descriptors contain `id`, `name`, `shortDescription`, `fullDescription`, `help`, `helpUri`, `properties`.
  - Results: contain `ruleId`, `level`, `message`, `locations` with valid `physicalLocation` (`artifactLocation.uri`) and `logicalLocations`. No `help` property inside result.

### Mock Server Synthesizer
- CLI Command: `mcp-doctor mock [profile]`
- Profiles: `"clean"`, `"empty-capabilities"`, `"stdio-pollution"`, `"schema-invalid"`, `"injection-vulnerable"`.

## Code Layout
```
src/
├── cli.ts                     # Binary entrypoint
├── index.ts                   # Library API entrypoint
├── version.ts                 # Version constant
├── cli/
│   ├── main.ts                # CLI router
│   ├── args.ts                # Argument parsing & flags (--fix, --format, etc.)
│   ├── audit-command.ts       # Audit execution orchestrator
│   ├── mock-command.ts        # Mock server command
│   └── help.ts                # CLI help text
├── mcp/
│   ├── session.ts             # MCP client handshake & capability queries
│   ├── types.ts               # MCP protocol types
│   └── parse.ts               # JSON-RPC parser
├── transport/
│   ├── stdio.ts               # Stdio process manager
│   ├── jsonrpc.ts             # JSON-RPC frame serialization
│   ├── resolve-command.ts     # Process command resolution
│   └── errors.ts              # Error definitions
├── rules/
│   ├── rule.ts                # Rule definition interfaces
│   ├── registry.ts            # Rule catalog
│   ├── engine.ts              # Rule execution runner
│   ├── helpers.ts             # Inspection utility functions
│   ├── autofix.ts             # Autofix engine
│   ├── protocol.ts            # Protocol rules
│   ├── tools-quality.ts       # Tool quality rules
│   ├── tools-safety.ts        # Tool safety/security rules
│   ├── resources.ts           # Resource rules
│   └── prompts.ts             # Prompt rules
├── report/
│   ├── pretty.ts              # Rich console output with scorecard
│   ├── json.ts                # JSON report output
│   ├── sarif.ts               # SARIF v2.1.0 report output
│   ├── markdown.ts            # Markdown report output (CI summary)
│   ├── score.ts               # Health score calculation (0-100, A-F)
│   └── color.ts               # Terminal ANSI styling
└── mock/
    └── synthesizer.ts         # Mock server implementations
test/
├── unit/                      # Granular unit tests per rule and module
├── integration/               # Integration tests with mock/stdio
├── e2e/                       # End-to-end CLI tests across formats
├── fixtures/                  # Fixture servers and reference snapshots
│   ├── demo-server.js
│   ├── mock-profiles.js
│   └── reference/             # Offline snapshots of official reference servers
└── e2e-harness/               # E2E test runner and validator
```
