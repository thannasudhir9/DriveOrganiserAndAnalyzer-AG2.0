import React, { useState } from 'react';
import { Sparkles, Trash2, FolderSync, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert, FileText, Info } from 'lucide-react';
import { ScanSummary, OrganizeMove, OrganizeResponse } from '../types';
import { formatBytes, API_BASE } from './DiskSelector';

interface OptimizerTabProps {
  summary: ScanSummary;
  currentPath: string;
  onRefreshScan: () => void;
}

export const OptimizerTab: React.FC<OptimizerTabProps> = ({ summary, currentPath, onRefreshScan }) => {
  // Organizer state
  const [organizePreview, setOrganizePreview] = useState<OrganizeMove[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewFetched, setPreviewFetched] = useState<boolean>(false);
  const [organizing, setOrganizing] = useState<boolean>(false);
  const [organizedCount, setOrganizedCount] = useState<number | null>(null);

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

  // Fetch organizer preview
  const handlePreviewOrganize = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    setOrganizedCount(null);
    try {
      const res = await fetch(`${API_BASE}/api/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, simulate: true })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to simulate directory organization');
      }
      const data: OrganizeResponse = await res.json();
      setOrganizePreview(data.moves);
      setPreviewFetched(true);
    } catch (err: any) {
      setPreviewError(err.message || 'Error simulating organization.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Run actual organizer sorting
  const handleExecuteOrganize = async () => {
    setOrganizing(true);
    setPreviewError(null);
    try {
      const res = await fetch(`${API_BASE}/api/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, simulate: false })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to execute folder organization');
      }
      const data: OrganizeResponse = await res.json();
      setOrganizedCount(data.moved_count);
      setPreviewFetched(false);
      setOrganizePreview([]);
      
      // Auto refresh the scanning view so the filesystem reflects folders
      onRefreshScan();
    } catch (err: any) {
      setPreviewError(err.message || 'Error during file organization execution.');
    } finally {
      setOrganizing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
      
      {/* Column Left: Space Optimization Recommendations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkles size={18} style={{ color: 'var(--neon-purple)' }} /> Space Optimization Center
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Diagnostic recommendations based on your directory index.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Advice 1: Duplicates */}
            <div className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)' }}>
                <Trash2 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recover Redundant Copies</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Wasted duplicate files consume space that can be freed safely.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--neon-rose)', fontWeight: 700 }}>
                    Safe Recovery: {formatBytes(wastedDuplicatesSpace)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {duplicateSets.length} duplicate groups
                  </span>
                </div>
              </div>
            </div>

            {/* Advice 2: Log Caches */}
            <div className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--neon-amber)' }}>
                <AlertTriangle size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Temporary System Caches & Logfiles</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Files with extensions `.log`, `.tmp`, and `.bak` can be purged to clean up space.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--neon-amber)', fontWeight: 700 }}>
                    Estimated Recovery: {formatBytes(cacheTotalSize)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {cacheFiles.length} temporary files detected
                  </span>
                </div>
              </div>
            </div>

            {/* Advice 3: Developer node_modules */}
            <div className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--neon-indigo)' }}>
                <FolderSync size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Developer Project node_modules Cleanup</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Recursive nested dependency directories are often massive and can be cleared in inactive projects.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--neon-indigo)', fontWeight: 700 }}>
                    Project Recovery: {formatBytes(nodeModulesTotalSize)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {nodeModulesFolders.length} node_modules locations
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Column Right: Secure File Organizer Wizard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <FolderSync size={18} style={{ color: 'var(--neon-cyan)' }} /> Secure Folder Organizer
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Cleans clutter in the active folder by sorting loose files into custom subdirectories by file type.
            </p>
          </div>

          <div 
            className="glass-card" 
            style={{ 
              padding: '0.85rem 1rem', 
              background: 'rgba(255,255,255,0.01)', 
              borderColor: 'rgba(255,255,255,0.03)',
              marginBottom: '1.25rem',
              borderRadius: '8px'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Directory to Organize:</span>
            <code style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', wordBreak: 'break-all' }}>{currentPath}</code>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <button 
              className="btn-primary" 
              onClick={handlePreviewOrganize} 
              disabled={loadingPreview || organizing}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {loadingPreview ? 'Analyzing...' : 'Preview Folder Organization'} <ArrowRight size={16} />
            </button>
          </div>

          {previewError && (
            <div 
              style={{ 
                padding: '0.75rem 1rem', 
                background: 'rgba(244, 63, 94, 0.05)', 
                border: '1px solid rgba(244, 63, 94, 0.2)', 
                color: 'var(--neon-rose)', 
                fontSize: '0.8rem', 
                borderRadius: '6px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldAlert size={14} /> {previewError}
            </div>
          )}

          {organizedCount !== null && (
            <div 
              style={{ 
                padding: '1rem', 
                background: 'rgba(45, 212, 191, 0.05)', 
                border: '1px solid rgba(45, 212, 191, 0.2)', 
                color: 'var(--neon-cyan)', 
                fontSize: '0.9rem', 
                borderRadius: '8px',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <CheckCircle2 size={18} /> Folder Organization Completed!
              </div>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', paddingLeft: '1.5rem' }}>
                Sorted and moved <strong>{organizedCount} loose files</strong> into their categorized directories safely.
              </p>
            </div>
          )}

          {/* Organizer Preview Panel */}
          {previewFetched && (
            <div 
              className="animate-fade-in" 
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                background: 'rgba(0,0,0,0.15)', 
                border: '1px solid rgba(255,255,255,0.03)',
                padding: '1rem', 
                borderRadius: '8px',
                maxHeight: '260px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
                  Organization Preview ({organizePreview.length} files)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Simulated Dry-Run</span>
              </div>

              {organizePreview.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', textAlign: 'center', gap: '0.5rem', padding: '1rem' }}>
                  <Info size={24} />
                  <span>No loose files matching organization categories found directly under this folder.</span>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', paddingRight: '0.25rem' }}>
                    {organizePreview.map((move, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          background: 'rgba(255,255,255,0.02)',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          border: '1px solid rgba(255,255,255,0.01)'
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                          <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{move.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({formatBytes(move.size)})</span>
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '0.1rem 0.4rem', 
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--neon-indigo)'
                            }}
                          >
                            &rarr; /{move.target_folder}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    className="btn-primary animate-pulse-neon" 
                    onClick={handleExecuteOrganize} 
                    disabled={organizing}
                    style={{ justifyContent: 'center', padding: '0.6rem' }}
                  >
                    {organizing ? 'Organizing Files...' : 'Approve & Execute Sorting'}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
export default OptimizerTab;
