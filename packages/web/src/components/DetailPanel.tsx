import React from 'react';
import type { GraphNode, GraphEdge } from '../types.js';

const KIND_COLORS: Record<string, string> = {
  function: '#d2a8ff', class: '#f0883e', interface: '#3fb950',
  type: '#3fb950', enum: '#f778ba', variable: '#58a6ff',
};

interface DetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ node, edges, onClose, onNavigate }) => {
  const outgoing = edges.filter(e => e.from === node.id);
  const incoming = edges.filter(e => e.to === node.id);
  const exportedSymbols = node.symbols.filter(s => s.exported);

  return (
    <div style={{
      width: 360, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
      padding: 20, overflowY: 'auto', height: '100vh', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, color: 'var(--accent)', wordBreak: 'break-all' }}>{node.id}</h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 18, padding: 4,
        }}>x</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
        <span style={{ marginRight: 12 }}>Layer: <strong style={{ color: 'var(--text)' }}>{node.layer ?? 'unknown'}</strong></span>
        <span style={{ marginRight: 12 }}>In: <strong style={{ color: 'var(--text)' }}>{node.inDegree}</strong></span>
        <span>Out: <strong style={{ color: 'var(--text)' }}>{node.outDegree}</strong></span>
      </div>

      {exportedSymbols.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Exported Symbols</h3>
          {exportedSymbols.map(s => (
            <div key={s.name} style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: KIND_COLORS[s.kind] ?? 'var(--text)', marginRight: 6 }}>{s.kind}</span>
              <span style={{ color: 'var(--text)' }}>{s.name}</span>
              {s.signature && <span style={{ color: 'var(--text-secondary)', marginLeft: 4, fontSize: 11 }}>{s.signature}</span>}
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Imports ({outgoing.length})</h3>
          {outgoing.map(e => (
            <div key={e.to} style={{ fontSize: 12, marginBottom: 4 }}>
              <a onClick={() => onNavigate(e.to)} style={{
                color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none',
              }}>{e.to}</a>
              {e.symbols.length > 0 && (
                <span style={{ color: 'var(--text-secondary)', marginLeft: 6, fontSize: 11 }}>
                  ({e.symbols.join(', ')})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <h3 style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Imported By ({incoming.length})</h3>
          {incoming.map(e => (
            <div key={e.from} style={{ fontSize: 12, marginBottom: 4 }}>
              <a onClick={() => onNavigate(e.from)} style={{
                color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none',
              }}>{e.from}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
