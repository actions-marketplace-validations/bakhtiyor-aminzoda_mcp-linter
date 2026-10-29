import { describe, expect, it } from 'vitest';
import { run, EXIT_CLEAN, EXIT_FINDINGS, EXIT_ERROR, type CliEnvironment } from '../../src/cli/main.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '..', 'fixtures');

function createMockEnv(): { env: CliEnvironment; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    env: {
      cwd: process.cwd(),
      isTty: false,
      write: (text: string) => stdout.push(text),
      writeError: (text: string) => stderr.push(text),
    },
  };
}

describe('Challenger M1: Adversarial CLI & Dead Rule Verification', () => {
  describe('Empty & Omitted Capabilities (protocol/no-capabilities)', () => {
    it('returns EXIT_FINDINGS (1) on empty capabilities with default --fail-on error', async () => {
      const { env, stdout } = createMockEnv();
      const serverPath = path.join(fixturesDir, 'empty-server.js');
      const code = await run(['--format', 'json', '--', 'node', serverPath], env);

      expect(code).toBe(EXIT_FINDINGS);
      const json = JSON.parse(stdout.join(''));
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/no-capabilities' && f.severity === 'error')).toBe(true);
    });

    it('returns EXIT_CLEAN (0) on empty capabilities with --fail-on none', async () => {
      const { env, stdout } = createMockEnv();
      const serverPath = path.join(fixturesDir, 'empty-server.js');
      const code = await run(['--fail-on', 'none', '--format', 'json', '--', 'node', serverPath], env);

      expect(code).toBe(EXIT_CLEAN);
      const json = JSON.parse(stdout.join(''));
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/no-capabilities')).toBe(true);
    });

    it('returns EXIT_FINDINGS (1) on omitted capabilities in initialize response', async () => {
      const { env, stdout } = createMockEnv();
      const serverPath = path.join(fixturesDir, 'omitted-capabilities-server.js');
      const code = await run(['--format', 'json', '--', 'node', serverPath], env);

      expect(code).toBe(EXIT_FINDINGS);
      const json = JSON.parse(stdout.join(''));
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/no-capabilities')).toBe(true);
    });
  });

  describe('Partial Capabilities (tools only, resources only, prompts only)', () => {
    it('does NOT trigger protocol/no-capabilities on tools-only server', async () => {
      const { env, stdout } = createMockEnv();
      const serverPath = path.join(fixturesDir, 'partial-tools-server.js');
      const code = await run(['--format', 'json', '--', 'node', serverPath], env);

      expect(code).toBe(EXIT_CLEAN);
      const json = JSON.parse(stdout.join(''));
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/no-capabilities')).toBe(false);
      expect(json.counts.tools).toBe(1);
      expect(json.counts.resources).toBe(0);
      expect(json.counts.prompts).toBe(0);
    });

    it('does NOT trigger protocol/no-capabilities on resources-only server', async () => {
      const { env, stdout } = createMockEnv();
      const serverPath = path.join(fixturesDir, 'partial-resources-server.js');
      const code = await run(['--format', 'json', '--', 'node', serverPath], env);

      expect(code).toBe(EXIT_CLEAN);
      const json = JSON.parse(stdout.join(''));
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/no-capabilities')).toBe(false);
      expect(json.counts.tools).toBe(0);
      expect(json.counts.resources).toBe(1);
      expect(json.counts.prompts).toBe(0);
    });

    it('does NOT trigger protocol/no-capabilities on prompts-only server', async () => {
      const { env, stdout } = createMockEnv();
      const serverPath = path.join(fixturesDir, 'partial-prompts-server.js');
      const code = await run(['--format', 'json', '--', 'node', serverPath], env);

      expect(code).toBe(EXIT_CLEAN);
      const json = JSON.parse(stdout.join(''));
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/no-capabilities')).toBe(false);
      expect(json.counts.tools).toBe(0);
      expect(json.counts.resources).toBe(0);
      expect(json.counts.prompts).toBe(1);
    });
  });

  describe('Declared Capabilities with Empty Lists', () => {
    it('does NOT trigger protocol/no-capabilities or protocol/list-failed and exits 0', async () => {
      const { env, stdout } = createMockEnv();
      const serverPath = path.join(fixturesDir, 'declared-empty-lists-server.js');
      const code = await run(['--format', 'json', '--', 'node', serverPath], env);

      expect(code).toBe(EXIT_CLEAN);
      const json = JSON.parse(stdout.join(''));
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/no-capabilities')).toBe(false);
      expect(json.findings.some((f: any) => f.ruleId === 'protocol/list-failed')).toBe(false);
      expect(json.counts.tools).toBe(0);
      expect(json.counts.resources).toBe(0);
      expect(json.counts.prompts).toBe(0);
    });
  });

  describe('Exit Code Contract (0, 1, 2)', () => {
    it('returns EXIT_ERROR (2) on non-existent command', async () => {
      const { env, stderr } = createMockEnv();
      const code = await run(['--', 'non-existent-executable-12345'], env);

      expect(code).toBe(EXIT_ERROR);
      expect(stderr.join('').length).toBeGreaterThan(0);
    });

    it('returns EXIT_ERROR (2) on invalid arguments', async () => {
      const { env, stderr } = createMockEnv();
      const code = await run(['--fail-on', 'invalid-level', '--', 'node', 'server.js'], env);

      expect(code).toBe(EXIT_ERROR);
      expect(stderr.join('')).toContain('--fail-on must be');
    });

    it('returns EXIT_ERROR (2) when no command is provided', async () => {
      const { env, stderr } = createMockEnv();
      const code = await run([], env);

      expect(code).toBe(EXIT_ERROR);
      expect(stderr.join('')).toContain('no server command given');
    });
  });
});
