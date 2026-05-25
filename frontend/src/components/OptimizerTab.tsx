import React from 'react';
import { Sparkles, Trash2, AlertTriangle, FolderSync } from 'lucide-react';
import { ScanSummary } from '../types';
import { formatBytes } from './DiskSelector';

interface OptimizerTabProps {
  summary: ScanSummary;
  currentPath: string;
  onRefreshScan: () => void;
}

export const OptimizerTab: React.FC<OptimizerTabProps> = ({ summary }) => {
  // Compute stats for suggestions
  // 1. Redundant duplicate files space
  const duplicateSets = summary.duplicates || [];
  const wastedDuplicatesSpace = duplicateSets.reduce((acc, curr) => {
    return acc + (curr.size * (curr.paths.length - 1));
  }, 0);

  // 2. Estimate cache and log spaces inside top_files
  const cacheFiles = (summary.top_files || []).filter(file => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['log', 'tmp', 'bak', 'cache'].includes(ext || '');
  });
  const cacheTotalSize = cacheFiles.reduce((acc, curr) => acc + curr.size, 0);

  // 3. Estimate node_modules project sizes
  const nodeModulesFolders = (summary.top_folders || []).filter(f => 
    f.path.toLowerCase().endsWith('node_modules') || f.name.toLowerCase() === 'node_modules'
  );
  const nodeModulesTotalSize = nodeModulesFolders.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={20} style={{ color: 'var(--neon-purple)' }} /> Space Optimization Recommendations
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
          Our traversal engine has analyzed your folder structures and compiled high-impact actions to recover storage capacity.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Advice 1: Duplicates */}
          <div className="glass-card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'start', padding: '1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)' }}>
              <Trash2 size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>Recover Redundant Duplicates</h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Identical files exist across multiple subdirectories. Removing these redundant copies recovers significant space without losing any data.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--neon-rose)', fontWeight: 800 }}>
                  Potential Savings: {formatBytes(wastedDuplicatesSpace)}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {duplicateSets.length} duplicate groups discovered
                </span>
              </div>
            </div>
          </div>

          {/* Advice 2: Log Caches */}
          <div className="glass-card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'start', padding: '1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--neon-amber)' }}>
              <AlertTriangle size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>Purge Temporary Caches & Logfiles</h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Temporary documents (like `.log`, `.tmp`, and `.bak` files) are created during active operations and can be safely deleted once processes close.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--neon-amber)', fontWeight: 800 }}>
                  Estimated Recovery: {formatBytes(cacheTotalSize)}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {cacheFiles.length} temporary files cataloged
                </span>
              </div>
            </div>
          </div>

          {/* Advice 3: Developer node_modules */}
          <div className="glass-card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'start', padding: '1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--neon-indigo)' }}>
              <FolderSync size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>Clean Developer Project Dependencies</h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Recursive third-party library dependencies (like `node_modules` subfolders) take up massive chunks of space and can be safely cleaned up in archived/inactive projects.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--neon-indigo)', fontWeight: 800 }}>
                  Project Savings: {formatBytes(nodeModulesTotalSize)}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {nodeModulesFolders.length} node_modules folders detected
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
export default OptimizerTab;
