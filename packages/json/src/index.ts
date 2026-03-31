import type { Graph } from '@repo-xray/core';

export function serializeGraph(graph: Graph): string {
  const output = {
    nodes: Array.from(graph.nodes.values()).map(node => ({
      id: node.id,
      symbols: node.symbols.map(s => ({
        name: s.name, kind: s.kind, exported: s.exported, line: s.line,
        ...(s.signature ? { signature: s.signature } : {}),
      })),
      inDegree: node.inDegree,
      outDegree: node.outDegree,
      ...(node.layer ? { layer: node.layer } : {}),
    })),
    edges: graph.edges.map(e => ({
      from: e.from, to: e.to, type: e.type, symbols: e.symbols,
    })),
    meta: { ...graph.meta },
  };
  return JSON.stringify(output, null, 2);
}
