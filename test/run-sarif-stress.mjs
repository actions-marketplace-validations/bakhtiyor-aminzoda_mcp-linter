import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { formatSarif, resolveArtifactUri } from '../dist/report/sarif.js';
import { ALL_RULES } from '../dist/rules/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize AJV with OASIS SARIF v2.1.0 JSON Schema
const schemaPath = path.join(__dirname, 'fixtures', 'sarif-2.1.0.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

console.log('================================================================');
console.log('CHALLENGER 2: EMPIRICAL SARIF v2.1.0 & GITHUB INGESTION HARNESS');
console.log('================================================================\n');

const testResults = [];

function recordTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '--> ' + details : ''}`);
}

function validateSarif(sarifJsonString, contextName) {
  let parsed;
  try {
    parsed = JSON.parse(sarifJsonString);
  } catch (err) {
    recordTest(`${contextName}: Valid JSON parse`, false, err.message);
    return false;
  }

  // Schema conformance
  const valid = validateSchema(parsed);
  if (!valid) {
    const errorDetails = validateSchema.errors
      ? validateSchema.errors.map(e => `${e.instancePath} ${e.message}`).join('; ')
      : 'Unknown schema error';
    recordTest(`${contextName}: OASIS SARIF v2.1.0 Schema Conformance`, false, errorDetails);
  } else {
    recordTest(`${contextName}: OASIS SARIF v2.1.0 Schema Conformance`, true);
  }

  // GitHub Code Scanning specific requirements
  let ghConstraintsPassed = true;
  const ghIssues = [];

  if (!parsed.runs || !Array.isArray(parsed.runs) || parsed.runs.length === 0) {
    ghIssues.push('Missing runs array');
    ghConstraintsPassed = false;
  } else {
    const run = parsed.runs[0];
    if (!run.tool || !run.tool.driver || !run.tool.driver.name) {
      ghIssues.push('Missing tool.driver.name');
      ghConstraintsPassed = false;
    }

    const results = run.results || [];
    for (let i = 0; i < results.length; i++) {
      const res = results[i];

      // Constraint: NO 'help' property inside result object (OASIS & GitHub scanning violation)
      if ('help' in res) {
        ghIssues.push(`Result[${i}] contains forbidden 'help' property`);
        ghConstraintsPassed = false;
      }

      // Constraint: locations with physicalLocation.artifactLocation.uri with forward slashes
      if (!res.locations || !Array.isArray(res.locations) || res.locations.length === 0) {
        ghIssues.push(`Result[${i}] missing locations array`);
        ghConstraintsPassed = false;
      } else {
        const loc = res.locations[0];
        if (!loc.physicalLocation || !loc.physicalLocation.artifactLocation) {
          ghIssues.push(`Result[${i}] missing physicalLocation.artifactLocation`);
          ghConstraintsPassed = false;
        } else {
          const uri = loc.physicalLocation.artifactLocation.uri;
          if (typeof uri !== 'string' || uri.trim() === '') {
            ghIssues.push(`Result[${i}] invalid or empty uri`);
            ghConstraintsPassed = false;
          } else if (uri.includes('\\')) {
            ghIssues.push(`Result[${i}] uri contains backslash: "${uri}" (must use forward slashes only)`);
            ghConstraintsPassed = false;
          }
        }

        // Region startLine and startColumn
        if (!loc.physicalLocation?.region || loc.physicalLocation.region.startLine < 1 || loc.physicalLocation.region.startColumn < 1) {
          ghIssues.push(`Result[${i}] invalid region coordinates`);
          ghConstraintsPassed = false;
        }
      }

      // Rule index cannot be negative
      if ('ruleIndex' in res && (typeof res.ruleIndex !== 'number' || res.ruleIndex < 0)) {
        ghIssues.push(`Result[${i}] invalid ruleIndex: ${res.ruleIndex} (must be non-negative)`);
        ghConstraintsPassed = false;
      }
    }
  }

  if (ghConstraintsPassed) {
    recordTest(`${contextName}: GitHub Code Scanning Ingestion Constraints`, true);
  } else {
    recordTest(`${contextName}: GitHub Code Scanning Ingestion Constraints`, false, ghIssues.join('; '));
  }

  return valid && ghConstraintsPassed;
}

function makeReport(overrides = {}) {
  return {
    toolVersion: '0.1.0',
    server: {
      command: 'node dist/server.js',
      name: 'test-server',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      requestedProtocolVersion: '2024-11-05',
    },
    counts: { tools: 1, resources: 0, resourceTemplates: 0, prompts: 0 },
    findings: [],
    summary: { error: 0, warn: 0, info: 0, total: 0 },
    configured: {},
    ...overrides,
  };
}

// -------------------------------------------------------------
// Test Category 1: Real CLI Output Verification
// -------------------------------------------------------------
console.log('--- CATEGORY 1: Real CLI Execution Scenarios ---');

// 1.1 Demo Server
try {
  let demoOutput = '';
  try {
    demoOutput = execSync('node dist/cli.js --format sarif -- node test/fixtures/demo-server.js', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    demoOutput = err.stdout; // exit code 1 because demo server has errors
  }
  validateSarif(demoOutput, 'CLI Demo Server');
} catch (e) {
  recordTest('CLI Demo Server Execution', false, e.message);
}

// 1.2 Empty Server
try {
  let emptyOutput = '';
  try {
    emptyOutput = execSync('node dist/cli.js --format sarif -- node test/fixtures/empty-server.js', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    emptyOutput = err.stdout; // exit code 1 because empty server has protocol/no-capabilities
  }
  validateSarif(emptyOutput, 'CLI Empty Server');
} catch (e) {
  recordTest('CLI Empty Server Execution', false, e.message);
}

// -------------------------------------------------------------
// Test Category 2: Core Rule & Findings Variations
// -------------------------------------------------------------
console.log('\n--- CATEGORY 2: Findings & Rule Coverage Variations ---');

// 2.1 Zero findings (Clean server)
{
  const cleanReport = makeReport({ findings: [], summary: { error: 0, warn: 0, info: 0, total: 0 } });
  const sarif = formatSarif(cleanReport);
  validateSarif(sarif, 'Zero Findings (Clean server)');
}

// 2.2 Single rule finding
{
  const singleReport = makeReport({
    findings: [
      {
        ruleId: 'protocol/version-missing',
        severity: 'error',
        subjectKind: 'server',
        message: 'initialize result has no protocolVersion',
        hint: 'Return a protocolVersion in initialize result.',
      },
    ],
    summary: { error: 1, warn: 0, info: 0, total: 1 },
  });
  const sarif = formatSarif(singleReport);
  validateSarif(sarif, 'Single Rule Finding');
}

// 2.3 All 34 Rules Generated
{
  const allFindings = ALL_RULES.map((rule, idx) => ({
    ruleId: rule.id,
    severity: rule.defaultSeverity,
    subjectKind: 'tool',
    subject: `subject_${idx}`,
    message: `Finding triggered for rule ${rule.id}: ${rule.summary}`,
    hint: `Remediation guidance for rule ${rule.id}`,
    pointer: `/tools/${idx}/schema`,
  }));
  const allRulesReport = makeReport({
    findings: allFindings,
    summary: {
      error: allFindings.filter(f => f.severity === 'error').length,
      warn: allFindings.filter(f => f.severity === 'warn').length,
      info: allFindings.filter(f => f.severity === 'info').length,
      total: allFindings.length,
    },
  });
  const sarif = formatSarif(allRulesReport);
  validateSarif(sarif, 'All 34 Rules Finding Coverage');

  const parsed = JSON.parse(sarif);
  recordTest('All 34 Rules: Descriptor count in tool.driver.rules', parsed.runs[0].tool.driver.rules.length === 34, `Count: ${parsed.runs[0].tool.driver.rules.length}`);
  recordTest('All 34 Rules: Results count matches findings', parsed.runs[0].results.length === 34, `Count: ${parsed.runs[0].results.length}`);

  let allRuleIndicesValid = true;
  for (let i = 0; i < parsed.runs[0].results.length; i++) {
    const res = parsed.runs[0].results[i];
    if (res.ruleIndex !== i) {
      allRuleIndicesValid = false;
      break;
    }
  }
  recordTest('All 34 Rules: ruleIndex matches index in driver.rules', allRuleIndicesValid);
}

// 2.4 Unknown / Custom rule not in ALL_RULES (missing rule)
{
  const customRuleReport = makeReport({
    findings: [
      {
        ruleId: 'custom-vendor/unknown-check',
        severity: 'warn',
        subjectKind: 'server',
        message: 'third-party inspection finding',
      },
    ],
  });
  const sarif = formatSarif(customRuleReport);
  validateSarif(sarif, 'Unknown / Unregistered Rule');

  const parsed = JSON.parse(sarif);
  const result = parsed.runs[0].results[0];
  recordTest('Unknown Rule: ruleIndex is undefined (never -1)', result.ruleIndex === undefined, `ruleIndex: ${result.ruleIndex}`);
}

// 2.5 Findings with missing optional fields (no hint, no pointer, no subject)
{
  const minimalReport = makeReport({
    findings: [
      {
        ruleId: 'protocol/stdout-pollution',
        severity: 'error',
        subjectKind: 'server',
        message: 'stdout polluted with raw logs',
      },
    ],
  });
  const sarif = formatSarif(minimalReport);
  validateSarif(sarif, 'Minimal Finding (No hint, no pointer, no subject)');

  const parsed = JSON.parse(sarif);
  const res = parsed.runs[0].results[0];
  recordTest('Minimal Finding: properties.hint is undefined', res.properties.hint === undefined);
  recordTest('Minimal Finding: message text has no trailing "Fix: "', !res.message.text.includes('Fix: '));
}

// -------------------------------------------------------------
// Test Category 3: Command Line Edge Cases & Path Normalization
// -------------------------------------------------------------
console.log('\n--- CATEGORY 3: Command Line Resolution & Edge Cases ---');

const commandEdgeCases = [
  { name: 'Standard node path', input: 'node dist/index.js', expected: 'dist/index.js' },
  { name: 'Windows backslashes', input: 'node test\\fixtures\\demo-server.js', expected: 'test/fixtures/demo-server.js' },
  { name: 'Windows drive letter with backslashes', input: 'node C:\\projects\\claude-gpt\\server.js', expected: 'C:/projects/claude-gpt/server.js' },
  { name: 'Command with quotes around path', input: 'node "src/server.ts" --port 8080', expected: 'src/server.ts' },
  { name: 'Command with single quotes', input: "node 'path/to/server.js'", expected: 'path/to/server.js' },
  { name: 'Python server', input: 'python3 -u server.py', expected: 'server.py' },
  { name: 'Python with Windows drive', input: 'python D:\\apps\\mcp\\service.py', expected: 'D:/apps/mcp/service.py' },
  { name: 'NPX runner with flags', input: 'npx --yes tsx src/index.ts', expected: 'src/index.ts' },
  { name: 'Direct executable relative', input: './bin/mcp-server', expected: 'bin/mcp-server' },
  { name: 'Direct executable with .exe', input: 'bin/mcp-server.exe', expected: 'bin/mcp-server.exe' },
  { name: 'Docker container (no script file)', input: 'docker run -i --rm my-server', expected: 'mcp-server.json' },
  { name: 'Empty command string', input: '', expected: 'mcp-server.json' },
  { name: 'Whitespace only command', input: '     ', expected: 'mcp-server.json' },
  { name: 'Shell script', input: 'bash run_server.sh', expected: 'run_server.sh' },
  { name: 'YAML configuration runner', input: 'mcp-gateway config.yaml', expected: 'config.yaml' },
  { name: 'JSON configuration runner', input: 'mcp-runner server-config.json', expected: 'server-config.json' },
];

for (const tc of commandEdgeCases) {
  const resolved = resolveArtifactUri(tc.input);
  const matches = resolved === tc.expected;
  const hasForwardSlashesOnly = !resolved.includes('\\');
  recordTest(
    `resolveArtifactUri: ${tc.name}`,
    matches && hasForwardSlashesOnly,
    `input: "${tc.input}" => "${resolved}" (expected: "${tc.expected}")`
  );

  // Validate full SARIF document using this command
  const report = makeReport({
    server: { command: tc.input },
    findings: [{ ruleId: 'protocol/version-missing', severity: 'error', subjectKind: 'server', message: 'test' }],
  });
  const sarif = formatSarif(report);
  validateSarif(sarif, `SARIF document with command: "${tc.input}"`);
}

// -------------------------------------------------------------
// Test Category 4: Spaces in Paths & Quoted Filenames
// -------------------------------------------------------------
console.log('\n--- CATEGORY 4: Spaces in Paths & Quoted Filenames Stress Testing ---');

const spacesCases = [
  { name: 'Quoted Windows path with spaces', input: 'node "C:\\Program Files\\My Server\\server.js"' },
  { name: 'Quoted path with spaces without drive', input: 'node "path with spaces/server.js"' },
  { name: 'Path with spaces in filename', input: 'node "my test server.js"' },
];

for (const sc of spacesCases) {
  const resolved = resolveArtifactUri(sc.input);
  const hasNoBackslash = !resolved.includes('\\');
  const isNonEmpty = typeof resolved === 'string' && resolved.length > 0;
  recordTest(`Spaces test: ${sc.name}`, hasNoBackslash && isNonEmpty, `result: "${resolved}"`);

  const report = makeReport({
    server: { command: sc.input },
    findings: [{ ruleId: 'protocol/version-missing', severity: 'error', subjectKind: 'server', message: 'test' }],
  });
  const sarif = formatSarif(report);
  validateSarif(sarif, `SARIF with spaced command: ${sc.name}`);
}

// -------------------------------------------------------------
// Test Category 5: Explicit sourceFile Option Variations
// -------------------------------------------------------------
console.log('\n--- CATEGORY 5: Explicit sourceFile Option Variations ---');

const sourceFileCases = [
  { name: 'Relative forward-slash', input: 'src/custom.ts', expectedNoBackslash: true },
  { name: 'Windows backslashes', input: 'src\\custom.ts', expectedNoBackslash: true },
  { name: 'Windows absolute path', input: 'C:\\projects\\custom.ts', expectedNoBackslash: true },
];

for (const sfc of sourceFileCases) {
  const report = makeReport({
    findings: [{ ruleId: 'protocol/version-missing', severity: 'error', subjectKind: 'server', message: 'test' }],
  });
  const sarif = formatSarif(report, { sourceFile: sfc.input });
  const parsed = JSON.parse(sarif);
  const uri = parsed.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;

  const hasBackslash = uri.includes('\\');
  recordTest(
    `sourceFile option: ${sfc.name}`,
    !hasBackslash,
    `input: "${sfc.input}" => uri: "${uri}" (hasBackslash: ${hasBackslash})`
  );
  validateSarif(sarif, `SARIF with sourceFile: "${sfc.input}"`);
}

// -------------------------------------------------------------
// Test Category 6: Boundary Values, Encoding & Stress
// -------------------------------------------------------------
console.log('\n--- CATEGORY 6: Boundary Values, Encoding & Stress ---');

// 6.1 Unicode, emojis, and special chars in messages and subjects
{
  const unicodeReport = makeReport({
    findings: [
      {
        ruleId: 'tools/description-injection',
        severity: 'error',
        subjectKind: 'tool',
        subject: '🚀_execute_<admin>&"quoted"',
        message: 'Special characters: <>&"\' \n \t \r \\ / and emojis: 🔥🎉⚡',
        hint: 'Use safe encoding: <tag> & "quotes"',
        pointer: '/tools/0/inputSchema/properties/"quoted.field"',
      },
    ],
  });
  const sarif = formatSarif(unicodeReport);
  validateSarif(sarif, 'Unicode & Special Characters Stress');
}

// 6.2 Very large finding volume (1,000 findings)
{
  const largeFindings = [];
  for (let i = 0; i < 1000; i++) {
    largeFindings.push({
      ruleId: ALL_RULES[i % ALL_RULES.length].id,
      severity: (i % 3 === 0 ? 'error' : i % 3 === 1 ? 'warn' : 'info'),
      subjectKind: 'tool',
      subject: `tool_scale_${i}`,
      message: `Scale finding message #${i} with long description to test memory and JSON streaming bounds.`,
      hint: `Scale hint #${i}`,
      pointer: `/tools/${i}/description`,
    });
  }
  const largeReport = makeReport({
    findings: largeFindings,
    summary: { error: 334, warn: 333, info: 333, total: 1000 },
  });

  const startTime = Date.now();
  const sarif = formatSarif(largeReport);
  const duration = Date.now() - startTime;
  recordTest(`Stress test: 1,000 findings formatSarif duration (${duration}ms)`, duration < 1000, `Duration: ${duration}ms, Size: ${Math.round(sarif.length / 1024)} KB`);
  validateSarif(sarif, 'Stress Test: 1,000 Findings Document');
}

// -------------------------------------------------------------
// Final Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log('SUMMARY OF EMPIRICAL TEST RESULTS');
console.log('================================================================');

const passedCount = testResults.filter(t => t.passed).length;
const failedCount = testResults.filter(t => !t.passed).length;
console.log(`Total tests executed: ${testResults.length}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedCount}`);

if (failedCount > 0) {
  console.log('\nFAILED TESTS:');
  for (const t of testResults.filter(t => !t.passed)) {
    console.log(`- ${t.name}: ${t.details}`);
  }
}

process.exit(failedCount > 0 ? 1 : 0);
