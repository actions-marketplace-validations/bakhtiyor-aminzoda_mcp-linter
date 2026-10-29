import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cliPath = resolve('dist/cli.js');
let passed = 0;
let failed = 0;

function runCli(args) {
  const result = spawnSync('node', [cliPath, ...args], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    if (details) console.error(`    Details: ${details}`);
    failed++;
  }
}

console.log('=== Empirical Challenger Verification Suite for Milestone 1 ===\n');

// -----------------------------------------------------------------------------
// Group 1: Empty Capabilities Server (empty-server.js)
// -----------------------------------------------------------------------------
console.log('--- Group 1: Empty capabilities server (capabilities: {}) ---');

{
  const res = runCli(['--fail-on', 'error', '--format', 'pretty', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 1, 'Default --fail-on error returns exit code 1 on empty capabilities', `Exit code: ${res.status}`);
  assert(res.stdout.includes('protocol/no-capabilities'), 'Pretty output contains protocol/no-capabilities');
}

{
  const res = runCli(['--fail-on', 'none', '--format', 'pretty', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 0, '--fail-on none returns exit code 0 on empty capabilities', `Exit code: ${res.status}`);
  assert(res.stdout.includes('protocol/no-capabilities'), 'Output still contains finding even with --fail-on none');
}

{
  const res = runCli(['--fail-on', 'warn', '--format', 'json', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 1, '--fail-on warn returns exit code 1 because error >= warn', `Exit code: ${res.status}`);
  let json;
  try {
    json = JSON.parse(res.stdout);
  } catch (e) {
    json = null;
  }
  assert(json !== null, 'Output is valid JSON');
  assert(json?.findings?.some(f => f.ruleId === 'protocol/no-capabilities' && f.severity === 'error'),
    'JSON contains protocol/no-capabilities finding with error severity');
  assert(json?.summary?.error >= 1, 'Summary reflects at least 1 error');
}

{
  const res = runCli(['--format', 'sarif', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 1, 'SARIF format returns exit code 1 with findings', `Exit code: ${res.status}`);
  let sarif;
  try {
    sarif = JSON.parse(res.stdout);
  } catch (e) {
    sarif = null;
  }
  assert(sarif !== null, 'Output is valid SARIF JSON');
  assert(sarif?.version === '2.1.0', 'SARIF version is 2.1.0');
  const result = sarif?.runs?.[0]?.results?.find(r => r.ruleId === 'protocol/no-capabilities');
  assert(result !== undefined, 'SARIF results include protocol/no-capabilities');
  assert(result?.level === 'error', 'SARIF result level is error');
  assert(result?.help === undefined, 'SARIF result has NO illegal help property');
  assert(result?.locations?.[0]?.physicalLocation?.artifactLocation?.uri !== undefined,
    'SARIF result includes valid physicalLocation artifact URI');
}

// -----------------------------------------------------------------------------
// Group 2: Omitted Capabilities Server (omitted-capabilities-server.js)
// -----------------------------------------------------------------------------
console.log('\n--- Group 2: Omitted capabilities server (no capabilities key) ---');

{
  const res = runCli(['--fail-on', 'error', '--format', 'json', '--', 'node', 'test/fixtures/omitted-capabilities-server.js']);
  assert(res.status === 1, 'Omitted capabilities returns exit code 1 on --fail-on error', `Exit code: ${res.status}`);
  const json = JSON.parse(res.stdout);
  assert(json.findings.some(f => f.ruleId === 'protocol/no-capabilities'),
    'Omitted capabilities triggers protocol/no-capabilities rule');
}

{
  const res = runCli(['--fail-on', 'none', '--format', 'json', '--', 'node', 'test/fixtures/omitted-capabilities-server.js']);
  assert(res.status === 0, 'Omitted capabilities with --fail-on none returns exit code 0', `Exit code: ${res.status}`);
}

// -----------------------------------------------------------------------------
// Group 3: Partial Capabilities - Tools Only (partial-tools-server.js)
// -----------------------------------------------------------------------------
console.log('\n--- Group 3: Partial capabilities - Tools only ---');

{
  const res = runCli(['--fail-on', 'error', '--format', 'json', '--', 'node', 'test/fixtures/partial-tools-server.js']);
  assert(res.status === 0, 'Clean tools-only server returns exit code 0 on --fail-on error', `Exit code: ${res.status}`);
  const json = JSON.parse(res.stdout);
  assert(!json.findings.some(f => f.ruleId === 'protocol/no-capabilities'),
    'protocol/no-capabilities is NOT triggered when tools capability is declared');
  assert(json.counts.tools === 1, 'Tools count is 1');
  assert(json.counts.resources === 0, 'Resources count is 0');
  assert(json.counts.prompts === 0, 'Prompts count is 0');
}

// -----------------------------------------------------------------------------
// Group 4: Partial Capabilities - Resources Only (partial-resources-server.js)
// -----------------------------------------------------------------------------
console.log('\n--- Group 4: Partial capabilities - Resources only ---');

{
  const res = runCli(['--fail-on', 'error', '--format', 'json', '--', 'node', 'test/fixtures/partial-resources-server.js']);
  assert(res.status === 0, 'Clean resources-only server returns exit code 0 on --fail-on error', `Exit code: ${res.status}`);
  const json = JSON.parse(res.stdout);
  assert(!json.findings.some(f => f.ruleId === 'protocol/no-capabilities'),
    'protocol/no-capabilities is NOT triggered when resources capability is declared');
  assert(json.counts.tools === 0, 'Tools count is 0');
  assert(json.counts.resources === 1, 'Resources count is 1');
  assert(json.counts.prompts === 0, 'Prompts count is 0');
}

// -----------------------------------------------------------------------------
// Group 5: Partial Capabilities - Prompts Only (partial-prompts-server.js)
// -----------------------------------------------------------------------------
console.log('\n--- Group 5: Partial capabilities - Prompts only ---');

{
  const res = runCli(['--fail-on', 'error', '--format', 'json', '--', 'node', 'test/fixtures/partial-prompts-server.js']);
  assert(res.status === 0, 'Clean prompts-only server returns exit code 0 on --fail-on error', `Exit code: ${res.status}`);
  const json = JSON.parse(res.stdout);
  assert(!json.findings.some(f => f.ruleId === 'protocol/no-capabilities'),
    'protocol/no-capabilities is NOT triggered when prompts capability is declared');
  assert(json.counts.tools === 0, 'Tools count is 0');
  assert(json.counts.resources === 0, 'Resources count is 0');
  assert(json.counts.prompts === 1, 'Prompts count is 1');
}

// -----------------------------------------------------------------------------
// Group 6: Declared Capabilities with Empty Lists (declared-empty-lists-server.js)
// -----------------------------------------------------------------------------
console.log('\n--- Group 6: Declared capabilities with empty lists ---');

{
  const res = runCli(['--fail-on', 'error', '--format', 'json', '--', 'node', 'test/fixtures/declared-empty-lists-server.js']);
  assert(res.status === 0, 'Server with declared capabilities but empty lists returns exit code 0 on --fail-on error', `Exit code: ${res.status}`);
  const json = JSON.parse(res.stdout);
  assert(!json.findings.some(f => f.ruleId === 'protocol/no-capabilities'),
    'protocol/no-capabilities is NOT triggered when capabilities are declared');
  assert(!json.findings.some(f => f.ruleId === 'protocol/list-failed'),
    'protocol/list-failed is NOT triggered when lists succeed cleanly with empty arrays');
  assert(json.counts.tools === 0 && json.counts.resources === 0 && json.counts.prompts === 0,
    'All item counts are 0');
}

{
  const res = runCli(['--fail-on', 'warn', '--format', 'pretty', '--', 'node', 'test/fixtures/declared-empty-lists-server.js']);
  assert(res.status === 0, 'Returns exit code 0 on --fail-on warn when zero warnings/errors', `Exit code: ${res.status}`);
}

// -----------------------------------------------------------------------------
// Group 7: List Call RPC Error (list-error-server.js)
// -----------------------------------------------------------------------------
console.log('\n--- Group 7: Declared capability with RPC error during list ---');

{
  const res = runCli(['--fail-on', 'error', '--format', 'json', '--', 'node', 'test/fixtures/list-error-server.js']);
  assert(res.status === 1, 'List RPC failure returns exit code 1 on --fail-on error', `Exit code: ${res.status}`);
  const json = JSON.parse(res.stdout);
  assert(json.findings.some(f => f.ruleId === 'protocol/list-failed' && f.severity === 'error'),
    'protocol/list-failed is triggered with error severity');
}

{
  const res = runCli(['--fail-on', 'none', '--format', 'json', '--', 'node', 'test/fixtures/list-error-server.js']);
  assert(res.status === 0, 'List RPC failure returns exit code 0 on --fail-on none', `Exit code: ${res.status}`);
}

// -----------------------------------------------------------------------------
// Group 8: Exit Code 2 on Invalid Target Command / Spawn Error
// -----------------------------------------------------------------------------
console.log('\n--- Group 8: Exit Code 2 on Invalid Target Command / Spawn Error ---');

{
  const res = runCli(['--', 'non-existent-executable-xyz-987654321', 'arg1']);
  assert(res.status === 2, 'Non-existent command returns exit code 2', `Exit code: ${res.status}`);
  assert(res.stderr.toLowerCase().includes('process') || res.stderr.toLowerCase().includes('failed') || res.stderr.toLowerCase().includes('not found') || res.stderr.toLowerCase().includes('enoent'),
    'stderr reports process spawn failure');
}

// -----------------------------------------------------------------------------
// Group 9: Exit Code 2 on Invalid CLI Flags / Invocation Errors
// -----------------------------------------------------------------------------
console.log('\n--- Group 9: Exit Code 2 on Invalid CLI Invocations ---');

{
  const res = runCli(['--invalid-unknown-flag', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 2, 'Unknown flag returns exit code 2', `Exit code: ${res.status}`);
  assert(res.stderr.includes('unknown option'), 'stderr reports unknown option');
}

{
  const res = runCli(['--fail-on', 'invalid-severity', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 2, 'Invalid --fail-on returns exit code 2', `Exit code: ${res.status}`);
  assert(res.stderr.includes('--fail-on must be'), 'stderr reports valid fail-on choices');
}

{
  const res = runCli(['--format', 'invalid-fmt', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 2, 'Invalid --format returns exit code 2', `Exit code: ${res.status}`);
  assert(res.stderr.includes('--format must be'), 'stderr reports valid format choices');
}

{
  const res = runCli([]);
  assert(res.status === 2, 'No command returns exit code 2', `Exit code: ${res.status}`);
  assert(res.stderr.includes('no server command given'), 'stderr reports no server command given');
}

{
  const res = runCli(['--']);
  assert(res.status === 2, 'Empty command after -- returns exit code 2', `Exit code: ${res.status}`);
  assert(res.stderr.includes('no server command after --'), 'stderr reports no server command after --');
}

// -----------------------------------------------------------------------------
// Group 10: File Output Flag (-o / --output)
// -----------------------------------------------------------------------------
console.log('\n--- Group 10: File Output Flag (-o / --output) ---');

{
  const tempOut = resolve('test_output_sarif.json');
  if (existsSync(tempOut)) rmSync(tempOut);
  const res = runCli(['--format', 'sarif', '-o', 'test_output_sarif.json', '--fail-on', 'none', '--', 'node', 'test/fixtures/empty-server.js']);
  assert(res.status === 0, 'CLI returns 0 when output written to file with --fail-on none');
  assert(existsSync(tempOut), 'Output file was created on disk');
  if (existsSync(tempOut)) {
    const content = readFileSync(tempOut, 'utf8');
    const parsed = JSON.parse(content);
    assert(parsed.version === '2.1.0', 'File contains valid SARIF v2.1.0');
    rmSync(tempOut);
  }
}

console.log(`\n===============================================================`);
console.log(`Total tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`===============================================================`);

if (failed > 0) {
  process.exit(1);
}
