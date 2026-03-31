export interface GraphNode {
  id: string;
  symbols: { name: string; kind: string; exported: boolean; line: number; signature?: string }[];
  inDegree: number;
  outDegree: number;
  layer?: string;
  x?: number; y?: number;
  fx?: number | null; fy?: number | null;
}

export interface GraphEdge {
  from: string; to: string; type: string; symbols: string[];
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: { language: string; totalModules: number; totalSymbols: number };
}

export type ZoomLevel = 'repo' | 'module' | 'symbol';
