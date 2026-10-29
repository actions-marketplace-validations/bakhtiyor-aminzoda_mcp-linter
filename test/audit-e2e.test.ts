import { describe, expect, it } from 'vitest';
import { auditServer } from '../src/cli/audit-command.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoServerPath = path.resolve(__dirname, 'fixtures', 'demo-server.js');

describe('End-to-End MCP Audit', () => {
  it('detects protocol pollution, missing destructive hints, and prompt injections', async () => {
    const report = await auditServer({
      command: 'node',
      commandArgs: [demoServerPath],
      cwd: process.cwd(),
      env: {},
      timeoutMs: 10000,
      maxPages: 50,
      ruleOverrides: {},
    });

    expect(report.server.name).toBe('demo-vulnerable-server');
    expect(report.server.protocolVersion).toBe('2024-11-05');
    expect(report.counts.tools).toBe(2);

    const ruleIds = report.findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('protocol/stdout-pollution');
    expect(ruleIds).toContain('tools/destructive-without-hint');
    expect(ruleIds).toContain('tools/description-injection');
    expect(ruleIds).toContain('tools/parameter-description-missing');
    expect(ruleIds).toContain('protocol/instructions-missing');

    expect(report.summary.error).toBeGreaterThanOrEqual(3);
    expect(report.summary.warn).toBeGreaterThanOrEqual(1);
  });

  it('evaluates and reports protocol/no-capabilities on empty server without crashing', async () => {
    const emptyServerPath = path.resolve(__dirname, 'fixtures', 'empty-server.js');
    const report = await auditServer({
      command: 'node',
      commandArgs: [emptyServerPath],
      cwd: process.cwd(),
      env: {},
      timeoutMs: 10000,
      maxPages: 50,
      ruleOverrides: {},
    });

    expect(report.server.name).toBe('demo-empty-server');
    expect(report.counts.tools).toBe(0);
    expect(report.counts.resources).toBe(0);
    expect(report.counts.prompts).toBe(0);

    const ruleIds = report.findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('protocol/no-capabilities');

    const finding = report.findings.find((f) => f.ruleId === 'protocol/no-capabilities');
    expect(finding?.severity).toBe('error');
    expect(report.summary.error).toBeGreaterThanOrEqual(1);
  });
});
