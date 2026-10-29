# E2E Test Infra: mcp-doctor

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on internal module implementations.
- Exercised strictly via the CLI entrypoint (`node dist/cli.js`) and public programmatic API (`import { auditServer } from 'mcp-doctor'`).
- Systematic 4-tier methodology:
  - **Tier 1**: Feature Coverage (Isolated happy paths, verifying each feature in isolation).
  - **Tier 2**: Boundary & Corner Cases (Process crashes, malformed JSON-RPC frames, empty streams, signal timeouts, bad flags).
  - **Tier 3**: Cross-Feature Combinations (Flags interacting with formats, severities, rule overrides, autofix, and mock profiles).
  - **Tier 4**: Real-World Application Scenarios (Auditing realistic MCP servers: Memory, Filesystem, SQLite, Fetch, GitHub, Claude Desktop configs).

## Feature Inventory & Test Matrix
| # | Feature | Source | Tier 1 (>=5) | Tier 2 (>=5) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|--------|:------------:|:------------:|:-----------------:|:-------------------:|
| 1 | CLI Arguments & Flags | `src/cli/args.ts` | 5 | 5 | ✓ | ✓ |
| 2 | Protocol Diagnostics | `src/rules/protocol.ts` | 5 | 5 | ✓ | ✓ |
| 3 | Tool Quality Diagnostics | `src/rules/tools-quality.ts` | 5 | 5 | ✓ | ✓ |
| 4 | Tool Safety/Security | `src/rules/tools-safety.ts` | 5 | 5 | ✓ | ✓ |
| 5 | Resource Diagnostics | `src/rules/resources.ts` | 5 | 5 | ✓ | ✓ |
| 6 | Prompt Diagnostics | `src/rules/prompts.ts` | 5 | 5 | ✓ | ✓ |
| 7 | Console / Pretty Reporter | `src/report/pretty.ts` | 5 | 5 | ✓ | ✓ |
| 8 | JSON Reporter | `src/report/json.ts` | 5 | 5 | ✓ | ✓ |
| 9 | SARIF v2.1.0 Reporter | `src/report/sarif.ts` | 5 | 5 | ✓ | ✓ |
| 10| Markdown Reporter | `src/report/markdown.ts` | 5 | 5 | ✓ | ✓ |
| 11| Health Scorecard (0-100, A-F) | `src/report/score.ts` | 5 | 5 | ✓ | ✓ |
| 12| Autofix Engine (`--fix`) | `src/rules/autofix.ts` | 5 | 5 | ✓ | ✓ |
| 13| Mock Server Synthesizer | `src/mock/synthesizer.ts` | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner**: Vitest (`npx vitest run`) and custom automated E2E test harness (`test/e2e-harness/run-all.mjs`).
- **Pass/Fail Semantics**: Clean exit code matches `--fail-on` criteria, output valid JSON/SARIF where requested, zero schema validation errors.
- **Directory Layout**:
  - `test/unit/`: Pure function unit tests (rules, reporters, score, args).
  - `test/integration/`: Stdio process communication and handshake tests.
  - `test/e2e/`: Full CLI binary execution tests across input matrices and formats.
  - `test/fixtures/`: Realistic mock servers, fault injection scripts, and reference server snapshots.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Target Environment |
|---|----------|--------------------|--------------------|
| 1 | Reference Memory Server Conformance | Protocol, Tools, Pretty, JSON, SARIF | Standard in-memory graph server |
| 2 | Reference SQLite Server Conformance | Protocol, SQL Tool Safety, Annotations | Database server with read/write operations |
| 3 | Reference Filesystem Server Conformance | Path safety, destructive hints, resources | File manager server with file/dir resources |
| 4 | Hostile Injection & Malformed Server | Security rules, injection detection, stdio pollution | Adversarial server attempting stdout hijack |
| 5 | Claude Desktop Configuration Audit | Config parsing, PATH validation, command resolution | Simulated `claude_desktop_config.json` |

## Coverage Thresholds
- Tier 1: Minimum 65 test cases across 13 features (≥5 each).
- Tier 2: Minimum 65 boundary/corner test cases across 13 features (≥5 each).
- Tier 3: Minimum 25 combinatorial interaction tests.
- Tier 4: Minimum 5 realistic end-to-end workload scenarios.
- **Total Minimum Target**: ≥ 160 comprehensive automated tests.
