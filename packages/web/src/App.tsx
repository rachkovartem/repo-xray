import React, { useCallback } from 'react';
import { useGraph } from './hooks/use-graph.js';
import { ForceGraph } from './components/ForceGraph.js';
import { DetailPanel } from './components/DetailPanel.js';
import { SearchBar } from './components/SearchBar.js';
import { FilterBar } from './components/FilterBar.js';
import type { GraphNode } from './types.js';

export const App: React.FC = () => {
  const {
    data, loading, error,
    selectedNode, setSelectedNode,
    searchQuery, setSearchQuery,
    activeFilters, toggleFilter,
    layers,
    filteredNodes, filteredEdges,
    totalNodes,
  } = useGraph();

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const handleNavigate = useCallback((nodeId: string) => {
    if (!data) return;
    const node = data.nodes.find(n => n.id === nodeId);
    if (node) setSelectedNode(node);
  }, [data, setSelectedNode]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#f85149' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', position: 'relative' }}>
      <SearchBar
        query={searchQuery}
        onChange={setSearchQuery}
        filteredCount={filteredNodes.length}
        totalCount={totalNodes}
      />
      <FilterBar
        layers={layers}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        rightOffset={selectedNode ? 376 : 16}
      />
      <div style={{ flex: 1 }}>
        <ForceGraph
          nodes={filteredNodes}
          edges={filteredEdges}
          selectedNode={selectedNode}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
        />
      </div>
      {selectedNode && data && (
        <DetailPanel
          node={selectedNode}
          edges={data.edges}
          onClose={() => setSelectedNode(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
};
