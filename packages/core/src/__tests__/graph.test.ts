import { describe, it, expect } from 'vitest';
import type { Graph, GraphNode, GraphEdge } from '../types.js';

function createEmptyGraph(rootDir = '/tmp/test'): Graph {
  return {
    nodes: new Map(),
    edges: [],
    rootDir,
    meta: {
      language: 'typescript',
      totalModules: 0,
      totalSymbols: 0,
    },
  };
}

function createNode(id: string, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    filePath: `/tmp/test/${id}`,
    symbols: [],
    inDegree: 0,
    outDegree: 0,
    ...overrides,
  };
}

describe('Graph data structure', () => {
  it('creates an empty graph', () => {
    const graph = createEmptyGraph();
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges).toHaveLength(0);
    expect(graph.meta.totalModules).toBe(0);
  });

  it('adds nodes to graph', () => {
    const graph = createEmptyGraph();
    const node = createNode('src/index.ts');
    graph.nodes.set(node.id, node);
    graph.meta.totalModules = graph.nodes.size;

    expect(graph.nodes.size).toBe(1);
    expect(graph.nodes.get('src/index.ts')).toBeDefined();
    expect(graph.meta.totalModules).toBe(1);
  });

  it('adds edges and updates degree counts', () => {
    const graph = createEmptyGraph();
    const nodeA = createNode('src/a.ts');
    const nodeB = createNode('src/b.ts');
    graph.nodes.set(nodeA.id, nodeA);
    graph.nodes.set(nodeB.id, nodeB);

    const edge: GraphEdge = {
      from: 'src/a.ts',
      to: 'src/b.ts',
      type: 'import',
      symbols: ['foo'],
    };
    graph.edges.push(edge);

    // Update degrees
    nodeA.outDegree++;
    nodeB.inDegree++;

    expect(graph.edges).toHaveLength(1);
    expect(nodeA.outDegree).toBe(1);
    expect(nodeA.inDegree).toBe(0);
    expect(nodeB.inDegree).toBe(1);
    expect(nodeB.outDegree).toBe(0);
  });

  it('tracks multiple edges and degrees correctly', () => {
    const graph = createEmptyGraph();
    const nodeA = createNode('src/a.ts');
    const nodeB = createNode('src/b.ts');
    const nodeC = createNode('src/c.ts');
    graph.nodes.set(nodeA.id, nodeA);
    graph.nodes.set(nodeB.id, nodeB);
    graph.nodes.set(nodeC.id, nodeC);

    // A imports B and C
    graph.edges.push({ from: 'src/a.ts', to: 'src/b.ts', type: 'import', symbols: ['foo'] });
    graph.edges.push({ from: 'src/a.ts', to: 'src/c.ts', type: 'import', symbols: ['bar'] });
    // B imports C
    graph.edges.push({ from: 'src/b.ts', to: 'src/c.ts', type: 'import', symbols: ['baz'] });

    nodeA.outDegree = 2;
    nodeB.inDegree = 1;
    nodeB.outDegree = 1;
    nodeC.inDegree = 2;

    expect(nodeA.outDegree).toBe(2);
    expect(nodeB.inDegree).toBe(1);
    expect(nodeB.outDegree).toBe(1);
    expect(nodeC.inDegree).toBe(2);
    expect(graph.edges).toHaveLength(3);
  });
});
