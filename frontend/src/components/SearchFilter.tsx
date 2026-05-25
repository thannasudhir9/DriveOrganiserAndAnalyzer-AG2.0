import React, { useState, useMemo } from 'react';
import { Search, Filter, File, Folder, Database } from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes } from './DiskSelector';

interface SearchFilterProps {
  topFiles: FileItem[];
  topFolders: { name: string; path: string; size: number }[];
  onNavigate: (path: string) => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({ topFiles, topFolders, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [minSize, setMinSize] = useState<number>(0); // in bytes
  const [itemType, setItemType] = useState<'all' | 'folders' | 'files'>('all');

  // Combine top files and folders into a search index
  const searchIndex = useMemo(() => {
    const folders = topFolders.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      is_dir: true
    }));
    const files = topFiles.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      is_dir: false
    }));
    return [...folders, ...files].sort((a, b) => b.size - a.size);
  }, [topFiles, topFolders]);

  const filteredResults = useMemo(() => {
    return searchIndex.filter(item => {
      // 1. Text filter
      const matchesText = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.path.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Size filter
      const matchesSize = item.size >= minSize;

      // 3. Type filter
      const matchesType = itemType === 'all' || 
                         (itemType === 'folders' && item.is_dir) || 
                         (itemType === 'files' && !item.is_dir);

      return matchesText && matchesSize && matchesType;
    });
  }, [searchIndex, searchTerm, minSize, itemType]);

  const handleSizeFilterChange = (sizeInMB: number) => {
    setMinSize(sizeInMB * 1024 * 1024);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          
          {/* Search bar */}
          <div style={{ flex: 2, minWidth: '280px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search major space consumers by name or path..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: '8px',
                padding: '0.65rem 1rem 0.65rem 2.5rem',
                color: 'var(--input-color)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'var(--transition-smooth)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--neon-indigo)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          </div>

          {/* Type Selector */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as any)}
              style={{
                width: '100%',
                background: 'var(--panel-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                color: 'var(--input-color)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Types</option>
              <option value="folders">Folders Only</option>
              <option value="files">Files Only</option>
            </select>
          </div>

          {/* Size Selectors */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Filter size={14} /> Min Size:
            </span>
            {[0, 10, 100, 1024].map((size) => {
              const label = size === 0 ? 'Any' : size === 1024 ? '> 1 GB' : `> ${size} MB`;
              const isSelected = minSize === size * 1024 * 1024;
              return (
                <button
                  key={size}
                  onClick={() => handleSizeFilterChange(size)}
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '20px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--btn-secondary-bg)',
                    borderColor: isSelected ? 'var(--neon-indigo)' : 'var(--btn-secondary-border)',
                    color: isSelected ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Database size={14} />
          <span>Showing {filteredResults.length} matches from top drive consumers list</span>
        </div>
      </div>

      <div className="glass-panel" style={{ maxHeight: '450px', overflowY: 'auto' }}>
        <table className="explorer-table">
          <thead>
            <tr>
              <th style={{ width: '60%' }}>Name / Path</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Size</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No files or folders match your search query.
                </td>
              </tr>
            ) : (
              filteredResults.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                      <div style={{ 
                        color: item.is_dir ? 'var(--neon-indigo)' : 'var(--neon-cyan)', 
                        marginTop: '0.2rem',
                        flexShrink: 0
                      }}>
                        {item.is_dir ? <Folder size={16} /> : <File size={16} />}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                        <code style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', wordBreak: 'break-all' }}>
                          {item.path}
                        </code>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatBytes(item.size)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.is_dir ? (
                      <button 
                        className="btn-secondary" 
                        onClick={() => onNavigate(item.path)}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Navigate
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>File</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
