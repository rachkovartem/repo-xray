import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildGraph } from '../graph-builder.js';

const FIXTURE_DIR = resolve(__dirname, '../../../../fixtures/simple-app');

describe('buildGraph', () => {
  it('builds graph with 5 nodes from fixture', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    expect(graph.nodes.size).toBe(5);
  });

  it('creates correct import edges', async () => {
    const graph = await buildGraph(FIXTURE_DIR);

    // handler → utils
    expect(graph.edges.some((e) => e.from === 'src/handler.ts' && e.to === 'src/utils.ts')).toBe(
      true,
    );
    // handler → types
    expect(graph.edges.some((e) => e.from === 'src/handler.ts' && e.to === 'src/types.ts')).toBe(
      true,
    );
    // router → handler
    expect(graph.edges.some((e) => e.from === 'src/router.ts' && e.to === 'src/handler.ts')).toBe(
      true,
    );
    // index → router
    expect(graph.edges.some((e) => e.from === 'src/index.ts' && e.to === 'src/router.ts')).toBe(
      true,
    );
    // index → types (re-export)
    expect(graph.edges.some((e) => e.from === 'src/index.ts' && e.to === 'src/types.ts')).toBe(
      true,
    );
  });

  it('resolves .js imports to .ts files', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    // All edges should point to .ts files (not .js)
    for (const edge of graph.edges) {
      expect(edge.to).toMatch(/\.ts$/);
    }
  });

  it('calculates correct degree counts', async () => {
    const graph = await buildGraph(FIXTURE_DIR);

    // types.ts: imported by handler and index → inDegree 2
    const types = graph.nodes.get('src/types.ts');
    expect(types?.inDegree).toBe(2);
    expect(types?.outDegree).toBe(0);

    // utils.ts: imported by handler → inDegree 1
    const utils = graph.nodes.get('src/utils.ts');
    expect(utils?.inDegree).toBe(1);
    expect(utils?.outDegree).toBe(0);

    // handler.ts: imports utils+types, imported by router → inDegree 1, outDegree 2
    const handler = graph.nodes.get('src/handler.ts');
    expect(handler?.inDegree).toBe(1);
    expect(handler?.outDegree).toBe(2);

    // router.ts: imports handler, imported by index → inDegree 1, outDegree 1
    const router = graph.nodes.get('src/router.ts');
    expect(router?.inDegree).toBe(1);
    expect(router?.outDegree).toBe(1);

    // index.ts: imports router + types → outDegree 2
    const index = graph.nodes.get('src/index.ts');
    expect(index?.inDegree).toBe(0);
    expect(index?.outDegree).toBeGreaterThanOrEqual(2);
  });

  it('sets correct meta information', async () => {
    const graph = await buildGraph(FIXTURE_DIR);
    expect(graph.meta.language).toBe('typescript');
    expect(graph.meta.totalModules).toBe(5);
    expect(graph.meta.totalSymbols).toBeGreaterThan(0);
  });
});
