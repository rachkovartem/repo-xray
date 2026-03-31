import React from 'react';

const LAYER_COLORS: Record<string, string> = {
  entry: '#f0883e', core: '#58a6ff', util: '#8b949e',
  type: '#3fb950', config: '#d2a8ff', test: '#f778ba',
};

interface FilterBarProps {
  layers: string[];
  activeFilters: Set<string>;
  onToggle: (layer: string) => void;
  rightOffset: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({ layers, activeFilters, onToggle, rightOffset }) => {
  return (
    <div style={{
      position: 'absolute', top: 16, right: rightOffset, zIndex: 10,
      display: 'flex', gap: 6,
    }}>
      {layers.map(layer => {
        const active = activeFilters.size === 0 || activeFilters.has(layer);
        return (
          <button
            key={layer}
            onClick={() => onToggle(layer)}
            style={{
              background: LAYER_COLORS[layer] ?? 'var(--text-secondary)',
              opacity: active ? 1 : 0.5,
              border: 'none', borderRadius: 12, padding: '4px 10px',
              color: '#ffffff', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
          >
            {layer}
          </button>
        );
      })}
    </div>
  );
};
