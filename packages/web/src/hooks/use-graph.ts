import { useState, useEffect, useMemo, useCallback } from 'react';
import type { GraphData, GraphNode, GraphEdge } from '../types.js';

export function useGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

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

  const layers = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const node of data.nodes) {
      if (node.layer) set.add(node.layer);
    }
    return Array.from(set).sort();
  }, [data]);

  const toggleFilter = useCallback((layer: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    let nodes = data.nodes;
    if (activeFilters.size > 0) {
      nodes = nodes.filter(n => n.layer && activeFilters.has(n.layer));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(n =>
        n.id.toLowerCase().includes(q) ||
        n.symbols.some(s => s.name.toLowerCase().includes(q))
      );
    }
    return nodes;
  }, [data, searchQuery, activeFilters]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!data) return [];
    return data.edges.filter(e => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to));
  }, [data, filteredNodeIds]);

  return {
    data, loading, error,
    selectedNode, setSelectedNode,
    searchQuery, setSearchQuery,
    activeFilters, toggleFilter,
    layers,
    filteredNodes, filteredEdges,
    totalNodes: data?.nodes.length ?? 0,
  };
}
