import { describe, it, expect } from 'vitest';
import { serializeGraph } from './index.js';
import { buildGraph } from '@repo-xray/core';
import { resolve } from 'node:path';

const FIXTURE = resolve(import.meta.dirname, '../../../fixtures/simple-app');

describe('serializeGraph', () => {
  it('produces valid JSON with nodes and edges', async () => {
    const graph = await buildGraph(FIXTURE);
    const json = serializeGraph(graph);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toBeInstanceOf(Array);
    expect(parsed.edges).toBeInstanceOf(Array);
    expect(parsed.meta).toBeDefined();
    expect(parsed.nodes.length).toBe(5);
  });

  it('converts Map nodes to array', async () => {
    const graph = await buildGraph(FIXTURE);
    const json = serializeGraph(graph);
    const parsed = JSON.parse(json);
    const indexNode = parsed.nodes.find((n: any) => n.id === 'src/index.ts');
    expect(indexNode).toBeDefined();
    expect(indexNode.symbols).toBeInstanceOf(Array);
    expect(typeof indexNode.inDegree).toBe('number');
  });
});
