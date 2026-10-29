import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ALL_RULES } from '../dist/rules/registry.js';
import { resolveArtifactUri } from '../dist/report/sarif.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sarif-2.1.0.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const LEVEL = { error: 'error', warn: 'warning', info: 'note' };
const SARIF_VERSION = '2.1.0';
const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';
const REPOSITORY_BASE_URI = 'https://github.com/bakhtiyor-aminzoda/mcp-doctor';
const DOCS_BASE_URI = `${REPOSITORY_BASE_URI}/blob/main/docs/rules`;

function buildRuleDescriptorFixed(rule) {
  const isSecurity =
    rule.category === 'security' ||
    rule.id.includes('injection') ||
    rule.id.includes('safety');
  const helpUri = `${DOCS_BASE_URI}/${rule.id}.md`;
  const helpText = `${rule.summary}. ${rule.rationale}\n\nDocumentation: ${helpUri}`;
  const helpMarkdown = `### ${rule.summary}\n\n${rule.rationale}\n\n**Documentation**: [Rule Documentation](${helpUri})`;

  return {
    id: rule.id,
    name: rule.id,
    shortDescription: { text: rule.summary },
    fullDescription: { text: rule.rationale },
    defaultConfiguration: { level: LEVEL[rule.defaultSeverity] },
    helpUri,
    help: { text: helpText, markdown: helpMarkdown },
    properties: {
      category: rule.category,
      tags: Array.from(new Set([rule.category, ...(isSecurity ? ['security'] : [])])),
      precision: 'very-high',
      'problem.severity':
        rule.defaultSeverity === 'error'
          ? 'error'
          : rule.defaultSeverity === 'warn'
            ? 'warning'
            : 'recommendation',
      ...(isSecurity ? { 'security-severity': rule.defaultSeverity === 'error' ? '8.5' : '6.0' } : {}),
      ...(rule.spec === undefined ? {} : { spec: rule.spec }),
    },
  };
}

function formatSarifFixed(report, options) {
  const ruleIndex = new Map(ALL_RULES.map((rule, index) => [rule.id, index]));
  const artifactUri = options?.sourceFile
    ? options.sourceFile.replace(/\\/g, '/').replace(/^\.\//, '')
    : resolveArtifactUri(report.server.command);

  const sarif = {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: 'mcp-doctor',
            version: report.toolVersion,
            semanticVersion: report.toolVersion,
            informationUri: REPOSITORY_BASE_URI,
            rules: ALL_RULES.map(buildRuleDescriptorFixed),
          },
        },
        columnKind: 'utf16CodeUnits',
        properties: {
          server: report.server.name ?? null,
          serverVersion: report.server.version ?? null,
          protocolVersion: report.server.protocolVersion ?? null,
          command: report.server.command,
          counts: report.counts,
        },
        results: report.findings.map((finding) => {
          const index = ruleIndex.get(finding.ruleId);
          const messageText =
            finding.hint !== undefined
              ? `${finding.message} Fix: ${finding.hint}`
              : finding.message;

          return {
            ruleId: finding.ruleId,
            ...(index !== undefined && index >= 0 ? { ruleIndex: index } : {}),
            level: LEVEL[finding.severity],
            message: { text: messageText },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: artifactUri },
                  region: { startLine: 1, startColumn: 1 },
                },
                logicalLocations: [
                  {
                    fullyQualifiedName: `${finding.subjectKind}:${finding.subject ?? '(server)'}`,
                    kind: finding.subjectKind,
                    ...(finding.subject === undefined ? {} : { name: finding.subject }),
                  },
                ],
              },
            ],
            partialFingerprints: {
              'mcpDoctor/v1': `${finding.ruleId}|${finding.subjectKind}|${finding.subject ?? ''}`,
            },
            properties: {
              ...(finding.hint !== undefined ? { hint: finding.hint } : {}),
              ...(finding.pointer !== undefined ? { pointer: finding.pointer } : {}),
            },
          };
        }),
      },
    ],
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}

// Test with demo server finding
const demoReport = {
  toolVersion: '0.1.0',
  server: { command: 'node test/fixtures/demo-server.js' },
  counts: { tools: 1, resources: 0, resourceTemplates: 0, prompts: 0 },
  findings: [
    { ruleId: 'tools/description-injection', severity: 'error', subjectKind: 'tool', subject: 'weather', message: 'test' }
  ],
  summary: { error: 1, warn: 0, info: 0, total: 1 },
  configured: {}
};

const sarif = formatSarifFixed(demoReport);
const valid = validateSchema(JSON.parse(sarif));
console.log('Fixed formatSarif valid against OASIS schema:', valid);
if (!valid) console.log(validateSchema.errors);

// Test with sourceFile containing backslashes
const sarifBackslash = formatSarifFixed(demoReport, { sourceFile: 'src\\server.ts' });
const parsedBackslash = JSON.parse(sarifBackslash);
console.log('Fixed sourceFile URI:', parsedBackslash.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri);
const validBackslash = validateSchema(parsedBackslash);
console.log('Fixed sourceFile backslash valid against OASIS schema:', validBackslash);
