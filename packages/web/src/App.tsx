import React, { useCallback, useMemo, useState } from 'react';
import { useGraph } from './hooks/use-graph.js';
import { DirGraph, FileGraph } from './components/ForceGraph.js';
import { DetailPanel } from './components/DetailPanel.js';
import { SearchBar } from './components/SearchBar.js';
import { type GraphNode, type HealthInfo, getNodeHealth } from './types.js';

export const App: React.FC = () => {
  const {
    data, loading, error,
    selectedNode, setSelectedNode,
    expandedDir, setExpandedDir, goBack,
    searchQuery, setSearchQuery,
    dirNodes, dirEdges, dirColorMap,
    fileNodes, fileEdges,
    totalNodes,
  } = useGraph();

  const handleDirClick = useCallback((dirId: string) => {
    setExpandedDir(dirId);
    setSelectedNode(null);
  }, [setExpandedDir, setSelectedNode]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const handleNavigate = useCallback((nodeId: string) => {
    if (!data) return;
    const node = data.nodes.find(n => n.id === nodeId);
    if (node) setSelectedNode(node);
  }, [data, setSelectedNode]);

  // Hooks MUST be before any conditional returns
  const [showWarnings, setShowWarnings] = useState(true);
  const warnings = useMemo(() => {
    if (!data) return [];
    const result: { node: GraphNode; health: HealthInfo }[] = [];
    for (const node of data.nodes) {
      const health = getNodeHealth(node);
      if (health.level !== 'ok') result.push({ node, health });
    }
    result.sort((a, b) => (a.health.level === 'critical' ? 0 : 1) - (b.health.level === 'critical' ? 0 : 1));
    return result;
  }, [data]);

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

  const isFileView = expandedDir !== null;
  const currentDirColor = expandedDir ? (dirColorMap.get(expandedDir) ?? '#58a6ff') : '#58a6ff';

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: selectedNode ? 360 : 0,
        zIndex: 10, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(180deg, var(--bg) 60%, transparent)',
        pointerEvents: 'none',
      }}>
        {isFileView && (
          <button
            onClick={goBack}
            style={{
              pointerEvents: 'auto',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 12px', color: 'var(--text)',
              cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>←</span> All directories
          </button>
        )}

        <div style={{
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {isFileView && (
            <span style={{
              color: currentDirColor, fontWeight: 600, fontSize: 14,
              background: currentDirColor + '18', padding: '4px 10px',
              borderRadius: 6, border: `1px solid ${currentDirColor}40`,
            }}>
              {expandedDir} ({fileNodes.length} files)
            </span>
          )}
          {!isFileView && (
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {dirNodes.length} directories, {totalNodes} modules — click a directory to explore
            </span>
          )}
        </div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1 }}>
        {isFileView ? (
          <FileGraph
            nodes={fileNodes}
            edges={fileEdges}
            dirColor={currentDirColor}
            selectedNodeId={selectedNode?.id ?? null}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <DirGraph
            nodes={dirNodes}
            edges={dirEdges}
            onDirClick={handleDirClick}
          />
        )}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '12px 16px',
        fontSize: 12, color: 'var(--text-secondary)',
        pointerEvents: 'none', maxWidth: 280,
      }}>
        {!isFileView ? (
          <>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Directory View</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <LegendItem>
                <LegendCircle size={20} filled opacity={0.15} stroke /> Circle size = number of files
              </LegendItem>
              <LegendItem>
                <LegendLine thick /> Thicker line = more cross-directory imports
              </LegendItem>
              <LegendItem>
                <span style={{ color: '#6e7681' }}>↔ N</span> = external connections (in + out)
              </LegendItem>
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, color: '#6e7681' }}>
              Click a directory to see its files
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>File View</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <LegendItem>
                <LegendCircle size={14} filled color={currentDirColor} /> Larger = more connections
              </LegendItem>
              <LegendItem>
                <LegendCircle size={14} filled color="#f85149" /> God Object (high in + out)
              </LegendItem>
              <LegendItem>
                <LegendCircle size={14} filled color="#d29922" /> Needs attention
              </LegendItem>
              <LegendItem>
                <LegendArrow /> Arrow = import direction
              </LegendItem>
            </div>
            <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, color: '#6e7681' }}>
              Click a file for details · Hover to highlight connections
            </div>
          </>
        )}
      </div>

      {/* Warnings panel */}
      {warnings.length > 0 && showWarnings && !selectedNode && (
        <div style={{
          position: 'absolute', top: 50, right: 16, zIndex: 10,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '12px 16px', maxWidth: 380,
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
              Issues ({warnings.length})
            </span>
            <button onClick={() => setShowWarnings(false)} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, padding: 2,
            }}>x</button>
          </div>
          {warnings.map(({ node, health }) => {
            const color = health.level === 'critical' ? '#f85149' : '#d29922';
            const label = health.level === 'critical' ? 'CRITICAL' : 'WARNING';
            const fileName = node.id.split('/').pop()?.replace(/\.[^.]+$/, '') ?? node.id;
            return (
              <div key={node.id} style={{
                marginBottom: 8, padding: '8px 10px', borderRadius: 6,
                background: color + '10', border: `1px solid ${color}30`,
                cursor: 'pointer',
              }} onClick={() => {
                // Navigate to the directory containing this file
                const dirKey = node.id.split('/').slice(0, -1).join('/');
                setExpandedDir(dirKey);
                setSelectedNode(node);
                setShowWarnings(false);
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5,
                    background: color + '20', padding: '1px 5px', borderRadius: 3,
                  }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{fileName}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {health.reason}
                </div>
                <div style={{ fontSize: 10, color: '#6e7681', marginTop: 4 }}>
                  {node.id}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings badge (when panel is collapsed) */}
      {warnings.length > 0 && !showWarnings && !selectedNode && (
        <button onClick={() => setShowWarnings(true)} style={{
          position: 'absolute', top: 50, right: 16, zIndex: 10,
          background: warnings.some(w => w.health.level === 'critical') ? '#f8514920' : '#d2992220',
          border: `1px solid ${warnings.some(w => w.health.level === 'critical') ? '#f8514950' : '#d2992250'}`,
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
          color: warnings.some(w => w.health.level === 'critical') ? '#f85149' : '#d29922',
          fontSize: 13, fontWeight: 600,
        }}>
          {warnings.filter(w => w.health.level === 'critical').length > 0
            ? `${warnings.filter(w => w.health.level === 'critical').length} critical`
            : ''
          }
          {warnings.filter(w => w.health.level === 'critical').length > 0 && warnings.filter(w => w.health.level === 'warning').length > 0 ? ' · ' : ''}
          {warnings.filter(w => w.health.level === 'warning').length > 0
            ? `${warnings.filter(w => w.health.level === 'warning').length} warnings`
            : ''
          }
        </button>
      )}

      {/* Detail panel */}
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

// ─── Legend helper components ───

function LegendItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
    </div>
  );
}

function LegendCircle({ size = 12, filled, dashed, color = '#58a6ff', opacity = 0.4, stroke }: {
  size?: number; filled?: boolean; dashed?: boolean; color?: string; opacity?: number; stroke?: boolean;
}) {
  return (
    <svg width={size + 4} height={size + 4} style={{ flexShrink: 0 }}>
      <circle
        cx={(size + 4) / 2} cy={(size + 4) / 2} r={size / 2}
        fill={filled ? color : 'none'}
        fillOpacity={opacity}
        stroke={stroke || dashed ? (dashed ? '#6e7681' : color) : 'none'}
        strokeWidth={dashed ? 1 : 1.5}
        strokeDasharray={dashed ? '2,2' : undefined}
        strokeOpacity={0.8}
      />
    </svg>
  );
}

function LegendLine({ thick }: { thick?: boolean }) {
  return (
    <svg width={24} height={8} style={{ flexShrink: 0 }}>
      <line x1={2} y1={4} x2={22} y2={4}
        stroke="#484f58" strokeWidth={thick ? 3 : 1} strokeOpacity={0.6}
      />
    </svg>
  );
}

function LegendArrow() {
  return (
    <svg width={24} height={8} style={{ flexShrink: 0 }}>
      <line x1={2} y1={4} x2={18} y2={4} stroke="#484f58" strokeWidth={1} />
      <polygon points="18,1 24,4 18,7" fill="#484f58" />
    </svg>
  );
}
