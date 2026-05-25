import React, { useState } from 'react';
import { Copy, MapPin, ChevronDown, ChevronUp, Trash2, Search, AlertCircle } from 'lucide-react';
import { DuplicateSet } from '../types';
import { formatBytes } from './DiskSelector';

interface DuplicatesTabProps {
  duplicates: DuplicateSet[];
}

export const DuplicatesTab: React.FC<DuplicatesTabProps> = ({ duplicates }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const toggleExpand = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };

  const filteredDuplicates = duplicates.filter(set => 
    set.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total redundant space: SUM of size * (number of copies - 1)
  const totalWastedSpace = duplicates.reduce((acc, curr) => {
    return acc + (curr.size * (curr.paths.length - 1));
  }, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.65), rgba(99, 102, 241, 0.05))',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Duplicate File Finder</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Lists files with identical names and byte sizes found in different directories.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
            Total Redundant Space
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--neon-rose)' }}>
            {formatBytes(totalWastedSpace)}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Filter duplicates by name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '0.65rem 1rem 0.65rem 2.5rem',
            color: 'white',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'var(--transition-smooth)'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--neon-indigo)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
        />
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
      </div>

      {filteredDuplicates.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <AlertCircle size={32} style={{ color: '#475569', marginBottom: '0.75rem' }} />
          <p>No duplicate file candidates found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {filteredDuplicates.map((dupSet, idx) => {
            const isExpanded = expandedIndex === idx;
            const wasted = dupSet.size * (dupSet.paths.length - 1);
            return (
              <div 
                key={idx} 
                className="glass-panel" 
                style={{ 
                  padding: '1rem',
                  borderColor: isExpanded ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-light)'
                }}
              >
                <div 
                  onClick={() => toggleExpand(idx)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ color: 'var(--neon-purple)', flexShrink: 0 }}>
                      <Copy size={18} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {dupSet.name}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Size: {formatBytes(dupSet.size)} &bull; {dupSet.paths.length} copies
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Redundant size</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--neon-rose)' }}>{formatBytes(wasted)}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div 
                    className="animate-fade-in"
                    style={{ 
                      marginTop: '1rem', 
                      paddingTop: '0.85rem', 
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      File Locations:
                    </span>
                    {dupSet.paths.map((path, pathIdx) => (
                      <div 
                        key={pathIdx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'start', 
                          gap: '0.5rem', 
                          background: 'rgba(255,255,255,0.02)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.03)'
                        }}
                      >
                        <MapPin size={14} style={{ color: '#64748b', marginTop: '0.2rem', flexShrink: 0 }} />
                        <code style={{ fontSize: '0.8rem', color: '#cbd5e1', wordBreak: 'break-all' }}>{path}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
