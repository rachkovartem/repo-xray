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
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: { language: string; totalModules: number; totalSymbols: number };
}

// Directory-level aggregated node
export interface DirNode {
  id: string;        // directory path, e.g. "src/components"
  label: string;     // display name, e.g. "components"
  fileCount: number;
  totalInDegree: number;  // sum of external inDegree
  totalOutDegree: number; // sum of external outDegree
  color: string;
  files: GraphNode[];
  x?: number; y?: number;
  fx?: number | null; fy?: number | null;
}

export interface DirEdge {
  from: string;
  to: string;
  weight: number; // number of file-level edges between these dirs
}

export type HealthLevel = 'critical' | 'warning' | 'ok';

export interface HealthInfo {
  level: HealthLevel;
  reason: string;
}

export function getNodeHealth(node: GraphNode): HealthInfo {
  // God Object: high in AND high out
  if (node.inDegree >= 10 && node.outDegree >= 10) {
    return { level: 'critical', reason: `God Object — ${node.inDegree} dependents, imports ${node.outDegree} modules. Consider splitting.` };
  }
  // Excessive fan-out
  if (node.outDegree >= 15) {
    return { level: 'warning', reason: `High fan-out — imports ${node.outDegree} modules. Doing too much?` };
  }
  // Unstable hub
  if (node.inDegree >= 15 && node.outDegree >= 3) {
    return { level: 'warning', reason: `Unstable hub — ${node.inDegree} dependents but imports ${node.outDegree} modules. Hard to change safely.` };
  }
  return { level: 'ok', reason: '' };
}
