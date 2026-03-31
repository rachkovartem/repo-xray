import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scanFiles } from '../scanner.js';

const FIXTURE_DIR = resolve(__dirname, '../../../../fixtures/simple-app');

describe('scanFiles', () => {
  it('finds all 5 TypeScript files in fixture', async () => {
    const files = await scanFiles(FIXTURE_DIR);
    expect(files).toHaveLength(5);
  });

  it('returns sorted absolute paths', async () => {
    const files = await scanFiles(FIXTURE_DIR);
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);

    // All paths should be absolute
    for (const f of files) {
      expect(f).toMatch(/^\//);
    }
  });

  it('includes expected fixture files', async () => {
    const files = await scanFiles(FIXTURE_DIR);
    const basenames = files.map((f) => f.split('/').pop());
    expect(basenames).toContain('index.ts');
    expect(basenames).toContain('handler.ts');
    expect(basenames).toContain('router.ts');
    expect(basenames).toContain('utils.ts');
    expect(basenames).toContain('types.ts');
  });

  it('excludes node_modules and dist', async () => {
    const files = await scanFiles(FIXTURE_DIR);
    for (const f of files) {
      expect(f).not.toContain('node_modules');
      expect(f).not.toContain('/dist/');
    }
  });
});
