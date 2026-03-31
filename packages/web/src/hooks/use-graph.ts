import { useState, useEffect, useMemo, useCallback } from 'react';
import type { GraphData, GraphNode, GraphEdge, DirNode, DirEdge } from '../types.js';

// Stable color palette for directories
const DIR_COLORS = [
  '#58a6ff', '#f0883e', '#3fb950', '#d2a8ff', '#f778ba',
  '#79c0ff', '#d29922', '#56d364', '#bc8cff', '#ff9bce',
  '#a5d6ff', '#e3b341', '#7ee787', '#e2c5ff', '#ffb1d2',
];

function getDirKey(fileId: string): string {
  const parts = fileId.split('/');
  // e.g. "src/components/Foo.tsx" → "src/components"
  // e.g. "middleware.ts" → "."
  if (parts.length <= 1) return '.';
  return parts.slice(0, -1).join('/');
}

function getDirLabel(dirKey: string): string {
  if (dirKey === '.') return 'root';
  const parts = dirKey.split('/');
  // Show last 2 parts for readability: "src/components" → "components"
  // But "src/app/[locale]/app" → "[locale]/app"
  if (parts.length <= 2) return parts[parts.length - 1];
  return parts.slice(-2).join('/');
}

export function useGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [expandedDir, setExpandedDir] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/graph')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((graph: GraphData) => {
        setData(graph);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Build directory-level graph
  const { dirNodes, dirEdges, dirColorMap } = useMemo(() => {
    if (!data) return { dirNodes: [], dirEdges: [], dirColorMap: new Map<string, string>() };

    // Group files by directory
    const dirMap = new Map<string, GraphNode[]>();
    for (const node of data.nodes) {
      const dir = getDirKey(node.id);
      if (!dirMap.has(dir)) dirMap.set(dir, []);
      dirMap.get(dir)!.push(node);
    }

    // Assign colors to directories
    const dirColorMap = new Map<string, string>();
    const sortedDirs = [...dirMap.keys()].sort();
    sortedDirs.forEach((dir, i) => {
      dirColorMap.set(dir, DIR_COLORS[i % DIR_COLORS.length]);
    });

    // Calculate cross-directory edges
    const edgeWeights = new Map<string, number>();
    for (const edge of data.edges) {
      const fromDir = getDirKey(edge.from);
      const toDir = getDirKey(edge.to);
      if (fromDir === toDir) continue; // skip internal edges
      const key = `${fromDir}::${toDir}`;
      edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
    }

    // Build dir nodes
    const dirNodes: DirNode[] = [];
    for (const [dir, files] of dirMap) {
      // Calculate external degrees
      let totalIn = 0;
      let totalOut = 0;
      for (const edge of data.edges) {
        const fromDir = getDirKey(edge.from);
        const toDir = getDirKey(edge.to);
        if (fromDir === toDir) continue;
        if (toDir === dir) totalIn++;
        if (fromDir === dir) totalOut++;
      }

      dirNodes.push({
        id: dir,
        label: getDirLabel(dir),
        fileCount: files.length,
        totalInDegree: totalIn,
        totalOutDegree: totalOut,
        color: dirColorMap.get(dir) ?? '#8b949e',
        files,
      });
    }

    // Build dir edges
    const dirEdges: DirEdge[] = [];
    for (const [key, weight] of edgeWeights) {
      const [from, to] = key.split('::');
      dirEdges.push({ from, to, weight });
    }

    return { dirNodes, dirEdges, dirColorMap };
  }, [data]);

  // File-level view for expanded directory
  const { fileNodes, fileEdges } = useMemo(() => {
    if (!data || !expandedDir) return { fileNodes: [], fileEdges: [] };

    const fileNodes = data.nodes.filter(n => getDirKey(n.id) === expandedDir);
    const fileIds = new Set(fileNodes.map(n => n.id));
    const fileEdges = data.edges.filter(e => fileIds.has(e.from) || fileIds.has(e.to));

    return { fileNodes, fileEdges };
  }, [data, expandedDir]);

  // Search
  const searchResults = useMemo(() => {
    if (!data || !searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return data.nodes.filter(n =>
      n.id.toLowerCase().includes(q) ||
      n.symbols.some(s => s.name.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const goBack = useCallback(() => {
    setExpandedDir(null);
    setSelectedNode(null);
  }, []);

  return {
    data, loading, error,
    selectedNode, setSelectedNode,
    expandedDir, setExpandedDir,
    goBack,
    searchQuery, setSearchQuery,
    searchResults,
    dirNodes, dirEdges, dirColorMap,
    fileNodes, fileEdges,
    totalNodes: data?.nodes.length ?? 0,
  };
}
