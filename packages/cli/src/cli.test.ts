import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '../dist/index.js');
const FIXTURE = resolve(import.meta.dirname, '../../../fixtures/simple-app');

describe('repo-xray CLI', () => {
  afterEach(() => {
    for (const f of ['CLAUDE.md', '.cursorrules', 'AGENTS.md']) {
      const p = resolve(FIXTURE, f);
      if (existsSync(p)) unlinkSync(p);
    }
  });

  it('outputs JSON to stdout', () => {
    const output = execSync(`node ${CLI} ${FIXTURE} --json`, { encoding: 'utf-8' });
    const data = JSON.parse(output);
    expect(data.nodes.length).toBe(5);
    expect(data.edges.length).toBeGreaterThan(0);
    expect(data.meta.language).toBe('typescript');
  });

  it('generates CLAUDE.md', () => {
    execSync(`node ${CLI} ${FIXTURE} --agent claude`, { encoding: 'utf-8' });
    const content = readFileSync(resolve(FIXTURE, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# simple-app');
    expect(content).toContain('## Project Structure');
    expect(content).toContain('## Key Modules');
  });

  it('generates .cursorrules', () => {
    execSync(`node ${CLI} ${FIXTURE} --agent cursor`, { encoding: 'utf-8' });
    const content = readFileSync(resolve(FIXTURE, '.cursorrules'), 'utf-8');
    expect(content).toContain('Project Structure');
    expect(content).toContain('Coding Conventions');
  });

  it('generates AGENTS.md', () => {
    execSync(`node ${CLI} ${FIXTURE} --agent agents`, { encoding: 'utf-8' });
    const content = readFileSync(resolve(FIXTURE, 'AGENTS.md'), 'utf-8');
    expect(content).toContain('Codebase Overview');
    expect(content).toContain('Key Modules');
  });

  it('generates all agent files at once', () => {
    execSync(`node ${CLI} ${FIXTURE} --agent all`, { encoding: 'utf-8' });
    expect(existsSync(resolve(FIXTURE, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(resolve(FIXTURE, '.cursorrules'))).toBe(true);
    expect(existsSync(resolve(FIXTURE, 'AGENTS.md'))).toBe(true);
  });

  it('writes JSON to file with -o flag', () => {
    const outPath = resolve(FIXTURE, 'test-output.json');
    try {
      execSync(`node ${CLI} ${FIXTURE} --json -o ${outPath}`, { encoding: 'utf-8' });
      const content = readFileSync(outPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.nodes.length).toBe(5);
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  });
});
