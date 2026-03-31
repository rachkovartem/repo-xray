import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseFile } from '../parser.js';

const FIXTURE_SRC = resolve(__dirname, '../../../../fixtures/simple-app/src');

describe('parseFile', () => {
  it('extracts exported functions from utils.ts', async () => {
    const result = await parseFile(resolve(FIXTURE_SRC, 'utils.ts'));
    const fns = result.symbols.filter((s) => s.kind === 'function');
    expect(fns).toHaveLength(2);
    expect(fns.every((f) => f.exported)).toBe(true);

    const names = fns.map((f) => f.name);
    expect(names).toContain('formatName');
    expect(names).toContain('slugify');
  });

  it('extracts exported interfaces from types.ts', async () => {
    const result = await parseFile(resolve(FIXTURE_SRC, 'types.ts'));
    const interfaces = result.symbols.filter((s) => s.kind === 'interface');
    expect(interfaces).toHaveLength(2);
    expect(interfaces.every((i) => i.exported)).toBe(true);

    const names = interfaces.map((i) => i.name);
    expect(names).toContain('User');
    expect(names).toContain('ApiResponse');
  });

  it('extracts imports from handler.ts including type-only', async () => {
    const result = await parseFile(resolve(FIXTURE_SRC, 'handler.ts'));

    // Regular import
    const utilsImport = result.imports.find((i) => i.source === './utils.js');
    expect(utilsImport).toBeDefined();
    expect(utilsImport!.symbols).toContain('formatName');
    expect(utilsImport!.isTypeOnly).toBe(false);

    // Type-only import
    const typesImport = result.imports.find((i) => i.source === './types.js');
    expect(typesImport).toBeDefined();
    expect(typesImport!.symbols).toContain('User');
    expect(typesImport!.symbols).toContain('ApiResponse');
    expect(typesImport!.isTypeOnly).toBe(true);
  });

  it('extracts exported function from router.ts', async () => {
    const result = await parseFile(resolve(FIXTURE_SRC, 'router.ts'));
    const exported = result.symbols.filter((s) => s.exported);
    expect(exported).toHaveLength(1);
    expect(exported[0].name).toBe('createRouter');
    expect(exported[0].kind).toBe('function');
  });

  it('extracts imports and re-exports from index.ts', async () => {
    const result = await parseFile(resolve(FIXTURE_SRC, 'index.ts'));

    // Has imports
    expect(result.imports.length).toBeGreaterThanOrEqual(2);

    const routerImport = result.imports.find((i) => i.source === './router.js');
    expect(routerImport).toBeDefined();
    expect(routerImport!.symbols).toContain('createRouter');

    const typesImport = result.imports.find((i) => i.source === './types.js');
    expect(typesImport).toBeDefined();
  });

  it('includes function signatures', async () => {
    const result = await parseFile(resolve(FIXTURE_SRC, 'utils.ts'));
    const formatName = result.symbols.find((s) => s.name === 'formatName');
    expect(formatName?.signature).toBeDefined();
    expect(formatName?.signature).toContain('first');
    expect(formatName?.signature).toContain('string');
  });
});
