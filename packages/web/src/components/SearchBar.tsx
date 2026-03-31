import React from 'react';

interface SearchBarProps {
  query: string;
  onChange: (query: string) => void;
  filteredCount: number;
  totalCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ query, onChange, filteredCount, totalCount }) => {
  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Search modules, functions..."
        style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 12px', color: 'var(--text)',
          fontSize: 13, width: 260, outline: 'none',
        }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        {filteredCount}/{totalCount} modules
      </span>
    </div>
  );
};
