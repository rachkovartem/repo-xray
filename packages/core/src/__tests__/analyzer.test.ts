import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildGraph } from '../graph-builder.js';
import { analyze } from '../analyzer.js';

const FIXTURE_DIR = resolve(__dirname, '../../../../fixtures/simple-app');

describe('analyze', () => {
  it('detects src/index.ts as entry point', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    const result = analyze(graph);
    expect(result.entryPoints).toContain('src/index.ts');
  });

  it('identifies key modules by connectivity', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    const result = analyze(graph);

    expect(result.keyModules.length).toBeGreaterThan(0);

    // Key modules should be sorted by total connections (descending)
    for (let i = 1; i < result.keyModules.length; i++) {
      const prev = result.keyModules[i - 1];
      const curr = result.keyModules[i];
      expect(prev.inDegree + prev.outDegree).toBeGreaterThanOrEqual(curr.inDegree + curr.outDegree);
    }
  });

  it('assigns correct layers', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    const result = analyze(graph);

    // index.ts should be in entry layer
    expect(result.layers['entry']).toContain('src/index.ts');

    // types.ts should be in type layer
    expect(result.layers['type']).toContain('src/types.ts');

    // utils.ts should be in util layer
    expect(result.layers['util']).toContain('src/utils.ts');
  });

  it('detects named export convention', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    const result = analyze(graph);
    expect(result.conventions.exportStyle).toBe('named');
  });

  it('detects camelCase function naming', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    const result = analyze(graph);
    expect(result.conventions.namingFunctions).toBe('camelCase');
  });

  it('reports no circular dependencies in fixture', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    const result = analyze(graph);
    expect(result.circularDeps).toHaveLength(0);
  });
});
