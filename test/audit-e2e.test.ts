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
});
