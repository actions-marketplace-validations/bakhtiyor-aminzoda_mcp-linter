import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { run, EXIT_CLEAN, EXIT_FINDINGS, EXIT_ERROR } from '../../dist/cli/main.js';
import { ALL_RULES } from '../../dist/rules/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const fixturesDir = path.resolve(rootDir, 'test', 'fixtures');
const sarifSchemaPath = path.resolve(fixturesDir, 'sarif-2.1.0.json');

// Initialize Ajv for SARIF validation
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const sarifSchema = JSON.parse(fs.readFileSync(sarifSchemaPath, 'utf8'));
const validateSarifSchema = ajv.compile(sarifSchema);

let totalPassed = 0;
let totalFailed = 0;
const failureDetails = [];

function assert(condition, message, detail = null) {
  if (condition) {
    totalPassed++;
    console.log(`  [PASS] ${message}`);
  } else {
    totalFailed++;
    console.error(`  [FAIL] ${message}`);
    if (detail) {
      console.error(`         Detail: ${JSON.stringify(detail)}`);
      failureDetails.push({ message, detail });
    } else {
      failureDetails.push({ message });
    }
  }
}

function createMockEnv(cwd = rootDir, isTty = false) {
  const stdout = [];
  const stderr = [];
  return {
    stdout,
    stderr,
    env: {
      cwd,
      isTty,
      write: (text) => stdout.push(text),
      writeError: (text) => stderr.push(text),
    },
    getCombinedStdout: () => stdout.join(''),
    getCombinedStderr: () => stderr.join(''),
  };
}

console.log('================================================================');
console.log('EMPIRICAL CLI & REGRESSION TEST HARNESS (CHALLENGER 1, M1-IT2)');
console.log('================================================================\n');

// -------------------------------------------------------------
// SECTION 1: Informational & Discovery CLI Commands
// -------------------------------------------------------------
console.log('--- SECTION 1: Informational & Discovery Commands ---');

{
  // 1.1 --help and -h
  const env1 = createMockEnv();
  const code1 = await run(['--help'], env1.env);
  assert(code1 === EXIT_CLEAN, '--help returns exit code 0');
  assert(env1.getCombinedStdout().includes('Usage\n  mcp-doctor'), '--help stdout contains Usage section');
  assert(env1.getCombinedStderr() === '', '--help emits no stderr');

  const env1Short = createMockEnv();
  const code1Short = await run(['-h'], env1Short.env);
  assert(code1Short === EXIT_CLEAN, '-h returns exit code 0');
  assert(env1Short.getCombinedStdout().includes('Usage\n  mcp-doctor'), '-h stdout contains Usage section');

  // 1.2 --version and -V
  const env2 = createMockEnv();
  const code2 = await run(['--version'], env2.env);
  assert(code2 === EXIT_CLEAN, '--version returns exit code 0');
  assert(env2.getCombinedStdout().trim() === 'mcp-doctor 0.1.0', '--version emits exact version string "mcp-doctor 0.1.0"');

  const env2Short = createMockEnv();
  const code2Short = await run(['-V'], env2Short.env);
  assert(code2Short === EXIT_CLEAN, '-V returns exit code 0');
  assert(env2Short.getCombinedStdout().trim() === 'mcp-doctor 0.1.0', '-V emits exact version string');

  // 1.3 --list-rules
  const env3 = createMockEnv();
  const code3 = await run(['--list-rules'], env3.env);
  assert(code3 === EXIT_CLEAN, '--list-rules returns exit code 0');
  const rulesOutput = env3.getCombinedStdout();
  const ruleCount = ALL_RULES.length;
  assert(ruleCount === 34, `Rule registry contains 34 rules (got ${ruleCount})`);
  let allRulesListed = true;
  for (const rule of ALL_RULES) {
    if (!rulesOutput.includes(rule.id)) {
      allRulesListed = false;
      break;
    }
  }
  assert(allRulesListed, '--list-rules includes all 34 rule IDs');

  // 1.4 --explain for all 34 rules
  let explainPassed = 0;
  for (const rule of ALL_RULES) {
    const envRule = createMockEnv();
    const codeRule = await run(['--explain', rule.id], envRule.env);
    if (
      codeRule === EXIT_CLEAN &&
      envRule.getCombinedStdout().includes(rule.id) &&
      envRule.getCombinedStdout().includes(rule.summary)
    ) {
      explainPassed++;
    }
  }
  assert(explainPassed === 34, `--explain succeeded for all 34 rules (${explainPassed}/34)`);

  // 1.5 --explain unknown rule
  const envExplainBad = createMockEnv();
  const codeExplainBad = await run(['--explain', 'non-existent/bogus-rule'], envExplainBad.env);
  assert(codeExplainBad === EXIT_ERROR, '--explain on unknown rule returns exit code 2');
  assert(
    envExplainBad.getCombinedStderr().includes('unknown rule "non-existent/bogus-rule"'),
    '--explain on unknown rule emits descriptive error message'
  );
}

// -------------------------------------------------------------
// SECTION 2: Initialization (--init)
// -------------------------------------------------------------
console.log('\n--- SECTION 2: Configuration Initialization (--init) ---');

{
  const tempDir = path.resolve(rootDir, 'test', 'temp-init-test');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const configFile = path.resolve(tempDir, '.mcp-doctor.json');
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);

  // Fresh init
  const envInit = createMockEnv(tempDir);
  const codeInit = await run(['--init'], envInit.env);
  assert(codeInit === EXIT_CLEAN, '--init in empty dir returns exit code 0');
  assert(fs.existsSync(configFile), '.mcp-doctor.json was created');
  const parsedConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  assert(parsedConfig.failOn === 'error' && parsedConfig.timeout === 15000, '.mcp-doctor.json has valid starter config structure');

  // Duplicate init should fail with exit code 2
  const envInitDup = createMockEnv(tempDir);
  const codeInitDup = await run(['--init'], envInitDup.env);
  assert(codeInitDup === EXIT_ERROR, '--init when file already exists returns exit code 2');
  assert(
    envInitDup.getCombinedStderr().includes('already exists'),
    '--init collision emits "already exists" error'
  );

  // Cleanup temp dir
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
  if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
}

// -------------------------------------------------------------
// SECTION 3: CLI Error Handling & Invalid Arguments (Exit Code 2)
// -------------------------------------------------------------
console.log('\n--- SECTION 3: CLI Error Handling & Invalid Arguments (Exit Code 2) ---');

{
  const invalidCases = [
    { args: [], expectedMsg: 'no server command given', label: 'No command given' },
    { args: ['foo'], expectedMsg: 'unexpected argument "foo"', label: 'Positional argument before --' },
    { args: ['--'], expectedMsg: 'no server command after --', label: 'Empty -- separator' },
    { args: ['--bad-flag'], expectedMsg: 'unknown option "--bad-flag"', label: 'Unknown option' },
    { args: ['--format'], expectedMsg: '--format requires a value', label: 'Flag missing value' },
    { args: ['--format', 'xml', '--', 'node', 'foo.js'], expectedMsg: '--format must be one of pretty, json, sarif', label: 'Invalid format value' },
    { args: ['--fail-on', 'critical', '--', 'node', 'foo.js'], expectedMsg: '--fail-on must be error, warn, info or none', label: 'Invalid --fail-on value' },
    { args: ['--timeout', '-100', '--', 'node', 'foo.js'], expectedMsg: '--timeout must be a positive number', label: 'Negative timeout' },
    { args: ['--timeout', 'abc', '--', 'node', 'foo.js'], expectedMsg: '--timeout must be a positive number', label: 'Non-numeric timeout' },
    { args: ['--max-pages', '0', '--', 'node', 'foo.js'], expectedMsg: '--max-pages must be a positive integer', label: 'Zero max-pages' },
    { args: ['--env', 'INVALID', '--', 'node', 'foo.js'], expectedMsg: '--env expects KEY=VALUE', label: 'Malformed env string' },
    { args: ['--', 'non-existent-binary-xy987z'], expectedMsg: '', label: 'Non-existent command execution failure' },
  ];

  for (const c of invalidCases) {
    const env = createMockEnv();
    const code = await run(c.args, env.env);
    const stderr = env.getCombinedStderr();
    assert(code === EXIT_ERROR, `${c.label}: returns EXIT_ERROR (2)`);
    if (c.expectedMsg) {
      assert(stderr.includes(c.expectedMsg), `${c.label}: stderr contains "${c.expectedMsg}"`);
    } else {
      assert(stderr.length > 0, `${c.label}: stderr is non-empty`);
    }
  }
}

// -------------------------------------------------------------
// SECTION 4: Output Formats Verification (Pretty, JSON, SARIF)
// -------------------------------------------------------------
console.log('\n--- SECTION 4: Output Formats Verification (Pretty, JSON, SARIF) ---');

{
  const demoServer = path.join(fixturesDir, 'demo-server.js');

  // 4.1 Pretty Format (with color and without color)
  const envPretty = createMockEnv(rootDir, true);
  const codePretty = await run(['--format', 'pretty', '--', 'node', demoServer], envPretty.env);
  assert(codePretty === EXIT_FINDINGS, 'Pretty format on demo-server returns EXIT_FINDINGS (1)');
  const prettyOut = envPretty.getCombinedStdout();
  assert(prettyOut.includes('mcp-doctor'), 'Pretty output contains title header');
  assert(prettyOut.includes('demo-vulnerable-server'), 'Pretty output contains server name');
  assert(prettyOut.includes('error') || prettyOut.includes('occurrence'), 'Pretty output formats findings');

  const envNoColor = createMockEnv(rootDir, false);
  const codeNoColor = await run(['--no-color', '--format', 'pretty', '--', 'node', demoServer], envNoColor.env);
  assert(codeNoColor === EXIT_FINDINGS, 'Pretty with --no-color returns EXIT_FINDINGS (1)');
  // Verify no ANSI escape codes
  const hasAnsi = /\u001b\[[0-9;]*m/.test(envNoColor.getCombinedStdout());
  assert(!hasAnsi, 'Pretty with --no-color contains zero ANSI escape sequences');

  // 4.2 JSON Format
  const envJson = createMockEnv();
  const codeJson = await run(['--format', 'json', '--', 'node', demoServer], envJson.env);
  assert(codeJson === EXIT_FINDINGS, 'JSON format on demo-server returns EXIT_FINDINGS (1)');
  let parsedJson;
  try {
    parsedJson = JSON.parse(envJson.getCombinedStdout());
    assert(true, 'JSON output parses cleanly as JSON');
  } catch (e) {
    assert(false, 'JSON output failed to parse', e.message);
  }

  if (parsedJson) {
    assert(parsedJson.toolVersion === '0.1.0', 'JSON report toolVersion matches package version');
    assert(parsedJson.server?.name === 'demo-vulnerable-server', 'JSON report contains server name');
    assert(Array.isArray(parsedJson.findings) && parsedJson.findings.length > 0, 'JSON report contains findings array');
    assert(typeof parsedJson.counts?.tools === 'number', 'JSON report contains tool counts');
    const hasInjection = parsedJson.findings.some(f => f.ruleId === 'tools/description-injection');
    assert(hasInjection, 'JSON findings include detected prompt injection rule');
  }

  // 4.3 SARIF Format
  const envSarif = createMockEnv();
  const codeSarif = await run(['--format', 'sarif', '--', 'node', demoServer], envSarif.env);
  assert(codeSarif === EXIT_FINDINGS, 'SARIF format on demo-server returns EXIT_FINDINGS (1)');
  let parsedSarif;
  try {
    parsedSarif = JSON.parse(envSarif.getCombinedStdout());
    assert(true, 'SARIF output parses cleanly as JSON');
  } catch (e) {
    assert(false, 'SARIF output failed to parse', e.message);
  }

  if (parsedSarif) {
    // Validate against official OASIS schema
    const isValidSchema = validateSarifSchema(parsedSarif);
    assert(isValidSchema === true, 'SARIF output strictly complies with OASIS SARIF v2.1.0 schema');
    if (!isValidSchema) {
      console.error('Validation errors:', validateSarifSchema.errors);
    }

    // Verify GitHub Code Scanning requirements
    const run = parsedSarif.runs?.[0];
    assert(run?.tool?.driver?.name === 'mcp-doctor', 'SARIF tool driver name is "mcp-doctor"');
    assert(run?.tool?.driver?.version === '0.1.0', 'SARIF driver version is "0.1.0"');
    assert(Array.isArray(run?.tool?.driver?.rules) && run.tool.driver.rules.length > 0, 'SARIF rules catalog is populated');

    // Verify tag uniqueness on every rule descriptor
    let allTagsUnique = true;
    for (const rule of run.tool.driver.rules) {
      const tags = rule.properties?.tags;
      if (tags && new Set(tags).size !== tags.length) {
        allTagsUnique = false;
        break;
      }
    }
    assert(allTagsUnique, 'SARIF rule descriptors have strictly unique tags');

    // Verify results
    assert(Array.isArray(run?.results) && run.results.length > 0, 'SARIF results array has findings');
    let validLocations = true;
    for (const result of run.results) {
      const loc = result.locations?.[0]?.physicalLocation?.artifactLocation?.uri;
      if (!loc || loc.includes('\\')) {
        validLocations = false;
        break;
      }
    }
    assert(validLocations, 'SARIF physicalLocation URI is valid RFC 3986 without backslashes');
  }

  // 4.4 File Output via -o / --output
  const testOutFile = path.resolve(rootDir, 'test', 'temp-output.sarif');
  if (fs.existsSync(testOutFile)) fs.unlinkSync(testOutFile);
  const envOut = createMockEnv();
  const codeOut = await run(['--format', 'sarif', '-o', testOutFile, '--', 'node', demoServer], envOut.env);
  assert(codeOut === EXIT_FINDINGS, 'SARIF with -o returns EXIT_FINDINGS (1)');
  assert(fs.existsSync(testOutFile), 'Output file was written to disk');
  const fileContent = fs.readFileSync(testOutFile, 'utf8');
  assert(validateSarifSchema(JSON.parse(fileContent)) === true, 'Output file content is valid OASIS SARIF v2.1.0');
  if (fs.existsSync(testOutFile)) fs.unlinkSync(testOutFile);
}

// -------------------------------------------------------------
// SECTION 5: Empty & Omitted Capability Servers (Dead Rule Verification)
// -------------------------------------------------------------
console.log('\n--- SECTION 5: Empty & Omitted Capabilities (Dead Rule Verification) ---');

{
  const emptyServer = path.join(fixturesDir, 'empty-server.js');
  const omittedServer = path.join(fixturesDir, 'omitted-capabilities-server.js');
  const declaredEmptyServer = path.join(fixturesDir, 'declared-empty-lists-server.js');

  // 5.1 empty-server.js (capabilities: {})
  const envEmptyDefault = createMockEnv();
  const codeEmptyDefault = await run(['--format', 'json', '--', 'node', emptyServer], envEmptyDefault.env);
  assert(codeEmptyDefault === EXIT_FINDINGS, 'empty-server with default --fail-on returns EXIT_FINDINGS (1)');
  const jsonEmpty = JSON.parse(envEmptyDefault.getCombinedStdout());
  const hasNoCapsEmpty = jsonEmpty.findings.some(f => f.ruleId === 'protocol/no-capabilities' && f.severity === 'error');
  assert(hasNoCapsEmpty, 'empty-server triggers protocol/no-capabilities with error severity');

  // Test across all 3 formats for empty-server
  const envEmptyPretty = createMockEnv();
  const codeEmptyPretty = await run(['--format', 'pretty', '--', 'node', emptyServer], envEmptyPretty.env);
  assert(codeEmptyPretty === EXIT_FINDINGS, 'empty-server pretty format returns EXIT_FINDINGS (1)');
  assert(envEmptyPretty.getCombinedStdout().includes('protocol/no-capabilities'), 'empty-server pretty output displays rule ID');

  const envEmptySarif = createMockEnv();
  const codeEmptySarif = await run(['--format', 'sarif', '--', 'node', emptyServer], envEmptySarif.env);
  assert(codeEmptySarif === EXIT_FINDINGS, 'empty-server SARIF format returns EXIT_FINDINGS (1)');
  const parsedEmptySarif = JSON.parse(envEmptySarif.getCombinedStdout());
  assert(validateSarifSchema(parsedEmptySarif) === true, 'empty-server SARIF validates against OASIS schema');
  const hasSarifNoCaps = parsedEmptySarif.runs[0].results.some(r => r.ruleId === 'protocol/no-capabilities');
  assert(hasSarifNoCaps, 'empty-server SARIF results contain protocol/no-capabilities');

  // 5.2 omitted-capabilities-server.js (capabilities key omitted entirely)
  const envOmitted = createMockEnv();
  const codeOmitted = await run(['--format', 'json', '--', 'node', omittedServer], envOmitted.env);
  assert(codeOmitted === EXIT_FINDINGS, 'omitted-capabilities-server returns EXIT_FINDINGS (1)');
  const jsonOmitted = JSON.parse(envOmitted.getCombinedStdout());
  const hasNoCapsOmitted = jsonOmitted.findings.some(f => f.ruleId === 'protocol/no-capabilities');
  assert(hasNoCapsOmitted, 'omitted-capabilities-server triggers protocol/no-capabilities');

  const envOmittedSarif = createMockEnv();
  await run(['--format', 'sarif', '--', 'node', omittedServer], envOmittedSarif.env);
  assert(validateSarifSchema(JSON.parse(envOmittedSarif.getCombinedStdout())) === true, 'omitted-capabilities SARIF validates against OASIS schema');

  // 5.3 declared-empty-lists-server.js ({ tools: {}, resources: {}, prompts: {} })
  const envDeclaredEmpty = createMockEnv();
  const codeDeclaredEmpty = await run(['--format', 'json', '--', 'node', declaredEmptyServer], envDeclaredEmpty.env);
  assert(codeDeclaredEmpty === EXIT_CLEAN, 'declared-empty-lists-server returns EXIT_CLEAN (0)');
  const jsonDeclaredEmpty = JSON.parse(envDeclaredEmpty.getCombinedStdout());
  assert(!jsonDeclaredEmpty.findings.some(f => f.ruleId === 'protocol/no-capabilities'), 'declared-empty-lists does NOT trigger protocol/no-capabilities');
  assert(!jsonDeclaredEmpty.findings.some(f => f.ruleId === 'protocol/list-failed'), 'declared-empty-lists does NOT trigger protocol/list-failed');
}

// -------------------------------------------------------------
// SECTION 6: Partial Capabilities Verification
// -------------------------------------------------------------
console.log('\n--- SECTION 6: Partial Capabilities (Tools, Resources, Prompts Only) ---');

{
  const partialTools = path.join(fixturesDir, 'partial-tools-server.js');
  const partialResources = path.join(fixturesDir, 'partial-resources-server.js');
  const partialPrompts = path.join(fixturesDir, 'partial-prompts-server.js');

  // 6.1 Tools only
  const envTools = createMockEnv();
  const codeTools = await run(['--format', 'json', '--', 'node', partialTools], envTools.env);
  assert(codeTools === EXIT_CLEAN, 'partial-tools-server exits CLEAN (0)');
  const jsonTools = JSON.parse(envTools.getCombinedStdout());
  assert(!jsonTools.findings.some(f => f.ruleId === 'protocol/no-capabilities'), 'partial-tools does NOT trigger protocol/no-capabilities');
  assert(jsonTools.counts.tools === 1 && jsonTools.counts.resources === 0 && jsonTools.counts.prompts === 0, 'partial-tools counts match exactly (tools=1, res=0, prompts=0)');

  // 6.2 Resources only
  const envResources = createMockEnv();
  const codeResources = await run(['--format', 'json', '--', 'node', partialResources], envResources.env);
  assert(codeResources === EXIT_CLEAN, 'partial-resources-server exits CLEAN (0)');
  const jsonResources = JSON.parse(envResources.getCombinedStdout());
  assert(!jsonResources.findings.some(f => f.ruleId === 'protocol/no-capabilities'), 'partial-resources does NOT trigger protocol/no-capabilities');
  assert(jsonResources.counts.tools === 0 && jsonResources.counts.resources === 1 && jsonResources.counts.prompts === 0, 'partial-resources counts match exactly');

  // 6.3 Prompts only
  const envPrompts = createMockEnv();
  const codePrompts = await run(['--format', 'json', '--', 'node', partialPrompts], envPrompts.env);
  assert(codePrompts === EXIT_CLEAN, 'partial-prompts-server exits CLEAN (0)');
  const jsonPrompts = JSON.parse(envPrompts.getCombinedStdout());
  assert(!jsonPrompts.findings.some(f => f.ruleId === 'protocol/no-capabilities'), 'partial-prompts does NOT trigger protocol/no-capabilities');
  assert(jsonPrompts.counts.tools === 0 && jsonPrompts.counts.resources === 0 && jsonPrompts.counts.prompts === 1, 'partial-prompts counts match exactly');

  // SARIF validation on all partial capability servers
  for (const s of [partialTools, partialResources, partialPrompts]) {
    const envS = createMockEnv();
    await run(['--format', 'sarif', '--', 'node', s], envS.env);
    assert(validateSarifSchema(JSON.parse(envS.getCombinedStdout())) === true, `SARIF schema conforms for ${path.basename(s)}`);
  }
}

// -------------------------------------------------------------
// SECTION 7: Exit Code Matrix under --fail-on Options
// -------------------------------------------------------------
console.log('\n--- SECTION 7: Exit Code Matrix under --fail-on Options ---');

{
  const emptyServer = path.join(fixturesDir, 'empty-server.js');
  const partialToolsServer = path.join(fixturesDir, 'partial-tools-server.js');

  // Server with error finding (emptyServer has protocol/no-capabilities = error)
  const codeFailError = await run(['--fail-on', 'error', '--', 'node', emptyServer], createMockEnv().env);
  assert(codeFailError === EXIT_FINDINGS, 'empty-server with --fail-on error -> EXIT_FINDINGS (1)');

  const codeFailWarn = await run(['--fail-on', 'warn', '--', 'node', emptyServer], createMockEnv().env);
  assert(codeFailWarn === EXIT_FINDINGS, 'empty-server with --fail-on warn -> EXIT_FINDINGS (1)');

  const codeFailInfo = await run(['--fail-on', 'info', '--', 'node', emptyServer], createMockEnv().env);
  assert(codeFailInfo === EXIT_FINDINGS, 'empty-server with --fail-on info -> EXIT_FINDINGS (1)');

  const codeFailNone = await run(['--fail-on', 'none', '--', 'node', emptyServer], createMockEnv().env);
  assert(codeFailNone === EXIT_CLEAN, 'empty-server with --fail-on none -> EXIT_CLEAN (0)');

  // Clean server with no errors or warnings (partialToolsServer)
  const codeCleanError = await run(['--fail-on', 'error', '--', 'node', partialToolsServer], createMockEnv().env);
  assert(codeCleanError === EXIT_CLEAN, 'partial-tools with --fail-on error -> EXIT_CLEAN (0)');

  const codeCleanWarn = await run(['--fail-on', 'warn', '--', 'node', partialToolsServer], createMockEnv().env);
  assert(codeCleanWarn === EXIT_CLEAN, 'partial-tools with --fail-on warn -> EXIT_CLEAN (0)');

  const codeCleanNone = await run(['--fail-on', 'none', '--', 'node', partialToolsServer], createMockEnv().env);
  assert(codeCleanNone === EXIT_CLEAN, 'partial-tools with --fail-on none -> EXIT_CLEAN (0)');
}

// -------------------------------------------------------------
// SECTION 8: Real Process Execution of CLI Binary (dist/cli.js)
// -------------------------------------------------------------
console.log('\n--- SECTION 8: Real Process Spawn Execution (dist/cli.js) ---');

{
  const cliBinary = path.resolve(rootDir, 'dist', 'cli.js');
  const demoServer = path.join(fixturesDir, 'demo-server.js');
  const emptyServer = path.join(fixturesDir, 'empty-server.js');

  // 8.1 node dist/cli.js --version
  const resVer = spawnSync('node', [cliBinary, '--version'], { encoding: 'utf8' });
  assert(resVer.status === 0, 'Binary spawn: --version exits with 0');
  assert(resVer.stdout.trim() === 'mcp-doctor 0.1.0', 'Binary spawn: --version prints "mcp-doctor 0.1.0"');

  // 8.2 node dist/cli.js --list-rules
  const resRules = spawnSync('node', [cliBinary, '--list-rules'], { encoding: 'utf8' });
  assert(resRules.status === 0, 'Binary spawn: --list-rules exits with 0');
  assert(resRules.stdout.includes('protocol/no-capabilities'), 'Binary spawn: --list-rules output contains protocol/no-capabilities');

  // 8.3 node dist/cli.js --format json -- node test/fixtures/empty-server.js
  const resEmpty = spawnSync('node', [cliBinary, '--format', 'json', '--', 'node', emptyServer], { encoding: 'utf8' });
  assert(resEmpty.status === 1, 'Binary spawn: empty-server exits with 1');
  const parsedSpawnJson = JSON.parse(resEmpty.stdout);
  assert(parsedSpawnJson.findings.some(f => f.ruleId === 'protocol/no-capabilities'), 'Binary spawn: JSON stdout contains protocol/no-capabilities');

  // 8.4 node dist/cli.js --fail-on none --format json -- node test/fixtures/empty-server.js
  const resEmptyNone = spawnSync('node', [cliBinary, '--fail-on', 'none', '--format', 'json', '--', 'node', emptyServer], { encoding: 'utf8' });
  assert(resEmptyNone.status === 0, 'Binary spawn: empty-server with --fail-on none exits with 0');

  // 8.5 node dist/cli.js --format sarif -- node test/fixtures/demo-server.js
  const resSarif = spawnSync('node', [cliBinary, '--format', 'sarif', '--', 'node', demoServer], { encoding: 'utf8' });
  assert(resSarif.status === 1, 'Binary spawn: demo-server exits with 1');
  const parsedSpawnSarif = JSON.parse(resSarif.stdout);
  assert(validateSarifSchema(parsedSpawnSarif) === true, 'Binary spawn: SARIF stdout strictly validates against OASIS schema');
}

// -------------------------------------------------------------
// SECTION 9: Advanced Adversarial Edge Cases
// -------------------------------------------------------------
console.log('\n--- SECTION 9: Advanced Adversarial Edge Cases ---');

{
  const crashingServer = path.join(fixturesDir, 'crashing-server.js');
  const pagingServer = path.join(fixturesDir, 'paging-server.js');
  const largeServer = path.join(fixturesDir, 'large-server.js');
  const emptyServer = path.join(fixturesDir, 'empty-server.js');

  // 9.1 Crashing server on startup
  const envCrash = createMockEnv();
  const codeCrash = await run(['--', 'node', crashingServer], envCrash.env);
  assert(codeCrash === EXIT_ERROR, 'Crashing server returns EXIT_ERROR (2)');
  assert(
    envCrash.getCombinedStderr().includes('exited') || envCrash.getCombinedStderr().includes('crash'),
    'Crashing server error message captured in stderr'
  );

  // 9.2 Non-existent config file
  const envNoConfig = createMockEnv();
  const codeNoConfig = await run(['--config', 'nonexistent-config.json', '--', 'node', emptyServer], envNoConfig.env);
  assert(codeNoConfig === EXIT_ERROR, 'Non-existent --config returns EXIT_ERROR (2)');
  assert(envNoConfig.getCombinedStderr().includes('Could not read config'), 'Non-existent config emits clear error');

  // 9.3 Invalid JSON config file
  const badConfigFile = path.resolve(rootDir, 'test', 'bad-config.json');
  fs.writeFileSync(badConfigFile, '{ unquoted_key: invalid JSON', 'utf8');
  const envBadConfig = createMockEnv();
  const codeBadConfig = await run(['--config', badConfigFile, '--', 'node', emptyServer], envBadConfig.env);
  assert(codeBadConfig === EXIT_ERROR, 'Malformed JSON in --config returns EXIT_ERROR (2)');
  assert(envBadConfig.getCombinedStderr().includes('not valid JSON'), 'Malformed config emits JSON parse error');
  if (fs.existsSync(badConfigFile)) fs.unlinkSync(badConfigFile);

  // 9.4 Rule silencing via config (empty-server with protocol/no-capabilities: off)
  const silenceConfigFile = path.resolve(rootDir, 'test', 'silence-config.json');
  fs.writeFileSync(
    silenceConfigFile,
    JSON.stringify({ rules: { 'protocol/no-capabilities': 'off' } }),
    'utf8'
  );
  const envSilence = createMockEnv();
  const codeSilence = await run(['--config', silenceConfigFile, '--format', 'json', '--', 'node', emptyServer], envSilence.env);
  assert(codeSilence === EXIT_CLEAN, 'empty-server with protocol/no-capabilities: off exits CLEAN (0)');
  const jsonSilence = JSON.parse(envSilence.getCombinedStdout());
  assert(!jsonSilence.findings.some(f => f.ruleId === 'protocol/no-capabilities'), 'protocol/no-capabilities is omitted when silenced');
  assert(jsonSilence.findings.some(f => f.ruleId === 'protocol/instructions-missing'), 'Remaining rules (protocol/instructions-missing) still evaluate');
  assert(jsonSilence.configured['protocol/no-capabilities'] === 'off', 'Configured override recorded in report.configured');
  if (fs.existsSync(silenceConfigFile)) fs.unlinkSync(silenceConfigFile);

  // 9.5 CLI --fail-on precedence over config failOn
  const failOnConfigFile = path.resolve(rootDir, 'test', 'failon-config.json');
  fs.writeFileSync(
    failOnConfigFile,
    JSON.stringify({ failOn: 'none' }),
    'utf8'
  );
  const envPrecedence = createMockEnv();
  const codePrecedence = await run(
    ['--config', failOnConfigFile, '--fail-on', 'error', '--format', 'json', '--', 'node', emptyServer],
    envPrecedence.env
  );
  assert(codePrecedence === EXIT_FINDINGS, 'CLI --fail-on takes precedence over config failOn');
  if (fs.existsSync(failOnConfigFile)) fs.unlinkSync(failOnConfigFile);

  // 9.6 Non-existent parent directory for -o flag
  const envBadOut = createMockEnv();
  const codeBadOut = await run(
    ['-o', 'non_existent_folder_abc123/subfolder/report.sarif', '--', 'node', emptyServer],
    envBadOut.env
  );
  assert(codeBadOut === EXIT_ERROR, 'Unwritable output path returns EXIT_ERROR (2)');

  // 9.7 Pagination with default --max-pages (both pages collected)
  const envPagingDefault = createMockEnv();
  const codePagingDefault = await run(['--format', 'json', '--', 'node', pagingServer], envPagingDefault.env);
  assert(codePagingDefault === EXIT_CLEAN, 'paging-server default pagination exits CLEAN (0)');
  const jsonPaging = JSON.parse(envPagingDefault.getCombinedStdout());
  assert(jsonPaging.counts.tools === 2, 'Collected all 2 pages of tools (count = 2)');

  // 9.8 Pagination with --max-pages 1 (page limit exceeded, list-failed triggered)
  const envPagingLimit = createMockEnv();
  const codePagingLimit = await run(['--max-pages', '1', '--format', 'json', '--', 'node', pagingServer], envPagingLimit.env);
  assert(codePagingLimit === EXIT_FINDINGS, 'paging-server exceeding --max-pages 1 returns EXIT_FINDINGS (1)');
  const jsonPagingLimit = JSON.parse(envPagingLimit.getCombinedStdout());
  assert(jsonPagingLimit.counts.tools === 1, 'Only 1 page of tools collected');
  const hasListFailed = jsonPagingLimit.findings.some(f => f.ruleId === 'protocol/list-failed');
  assert(hasListFailed, 'protocol/list-failed triggered when page limit exceeded');

  // 9.9 Large server (50 tools) performance and schema validity
  const envLarge = createMockEnv();
  const t0 = Date.now();
  const codeLarge = await run(['--format', 'sarif', '--', 'node', largeServer], envLarge.env);
  const duration = Date.now() - t0;
  assert(codeLarge === EXIT_CLEAN, 'large-server (50 tools) exits CLEAN (0)');
  assert(duration < 3000, `Audit of 50 tools completed in ${duration}ms (< 3000ms)`);
  const parsedLargeSarif = JSON.parse(envLarge.getCombinedStdout());
  assert(validateSarifSchema(parsedLargeSarif) === true, 'large-server SARIF strictly complies with OASIS schema');
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log('SUMMARY OF EMPIRICAL CLI & REGRESSION RESULTS');
console.log('================================================================');
console.log(`Total assertions evaluated: ${totalPassed + totalFailed}`);
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalFailed}`);

if (totalFailed > 0) {
  console.error('\nFAILURES ENCOUNTERED:');
  for (const f of failureDetails) {
    console.error(`- ${f.message}`);
  }
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL TESTS PASSED WITH ZERO REGRESSIONS!');
  process.exit(0);
}
