export type SymbolKind = 'function' | 'class' | 'type' | 'interface' | 'variable' | 'enum';

export interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  exported: boolean;
  line: number;
  signature?: string;
}

export interface GraphNode {
  id: string;
  filePath: string;
  symbols: SymbolInfo[];
  inDegree: number;
  outDegree: number;
  layer?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'import';
  symbols: string[];
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  rootDir: string;
  meta: {
    language: string;
    totalModules: number;
    totalSymbols: number;
  };
}

export interface AnalysisResult {
  entryPoints: string[];
  keyModules: KeyModule[];
  layers: Record<string, string[]>;
  circularDeps: [string, string][];
  conventions: Conventions;
}

export interface KeyModule {
  id: string;
  reason: string;
  inDegree: number;
  outDegree: number;
}

export interface Conventions {
  exportStyle: 'named' | 'default' | 'mixed';
  namingFunctions: string;
  namingClasses: string;
  fileStructure: string;
  testPattern: string;
}
