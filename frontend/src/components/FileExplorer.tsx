import React from 'react';
import { Folder, File, ArrowUp, HardDrive } from 'lucide-react';
import { FolderItem, FileItem } from '../types';
import { formatBytes } from './DiskSelector';

interface FileExplorerProps {
  currentPath: string;
  rootPath: string;
  folders: FolderItem[];
  files: FileItem[];
  parentSize: number;
  onNavigate: (path: string) => void;
  onGoBack: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  currentPath,
  rootPath,
  folders,
  files,
  parentSize,
  onNavigate,
  onGoBack,
}) => {
  const combinedItems = [
    ...folders.map(f => ({ ...f, is_dir: true as const })),
    ...files.map(f => ({ ...f, is_dir: false as const }))
  ];

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-light)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
          <HardDrive size={18} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap' }}>Folder Contents</span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            ({combinedItems.length} items)
          </span>
        </div>
        {currentPath !== rootPath && (
          <button 
            className="btn-secondary" 
            onClick={onGoBack}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <ArrowUp size={12} /> Up One Level
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="explorer-table">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>Name</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Size</th>
              <th style={{ width: '30%' }}>Space Allocation</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {combinedItems.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  This directory is empty.
                </td>
              </tr>
            ) : (
              combinedItems.map((item, index) => {
                const percentOfParent = parentSize > 0 ? (item.size / parentSize) * 100 : 0;
                
                // Color codes for item bars
                let barColor = 'linear-gradient(90deg, var(--neon-indigo), var(--neon-cyan))';
                if (percentOfParent > 50) {
                  barColor = 'linear-gradient(90deg, #ec4899, #f43f5e)'; // Rose for >50% space consumers
                } else if (percentOfParent > 20) {
                  barColor = 'linear-gradient(90deg, var(--neon-purple), var(--neon-indigo))';
                }

                return (
                  <tr key={`${item.path}-${index}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {item.is_dir ? (
                          <div style={{ color: 'var(--neon-indigo)', display: 'flex', alignItems: 'center' }}>
                            <Folder size={18} fill="rgba(99, 102, 241, 0.15)" />
                          </div>
                        ) : (
                          <div style={{ color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center' }}>
                            <File size={18} />
                          </div>
                        )}
                        <span 
                          onClick={() => item.is_dir && onNavigate(item.path)}
                          style={{ 
                            fontWeight: 500, 
                            cursor: item.is_dir ? 'pointer' : 'default',
                            color: item.is_dir ? 'white' : '#cbd5e1',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '350px'
                          }}
                          onMouseEnter={(e) => {
                            if (item.is_dir) {
                              e.currentTarget.style.color = 'var(--neon-cyan)';
                              e.currentTarget.style.textDecoration = 'underline';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (item.is_dir) {
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.textDecoration = 'none';
                            }
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatBytes(item.size)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="explorer-progress-bar" style={{ flex: 1 }}>
                          <div 
                            className="explorer-progress-fill" 
                            style={{ 
                              width: `${Math.max(0.5, percentOfParent)}%`,
                              background: barColor
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', width: '38px', textAlign: 'right', fontWeight: 600 }}>
                          {percentOfParent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                      {item.is_dir ? (
                        <span>{item.files_count} files</span>
                      ) : (
                        <span>.{item.name.split('.').pop() || 'file'}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
