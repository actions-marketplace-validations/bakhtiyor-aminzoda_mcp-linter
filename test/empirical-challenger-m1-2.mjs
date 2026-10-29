import fs from 'node:fs';
import path from 'node:path';
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

console.log('✓ Loaded and compiled official OASIS SARIF v2.1.0 JSON Schema');

const testResults = [];

function recordTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
}

function validateSarifDocument(sarifJsonString, contextName) {
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

// ---------------------------------------------------------
// Helper: Create Mock Report
// ---------------------------------------------------------
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

console.log('\n--- SCENARIO 1: Empty server CLI execution ---');
{
  const output = fs.readFileSync('test/fixtures/empty-server.js', 'utf8');
  // We will run this via child_process
}

// Export runner for node execution
export { validateSarifDocument, makeReport, recordTest, testResults };
