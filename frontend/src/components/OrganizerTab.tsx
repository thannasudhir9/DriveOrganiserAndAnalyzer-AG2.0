import React, { useState } from 'react';
import { FolderSync, ArrowRight, ShieldAlert, CheckCircle2, Info, FileText, FolderOpen } from 'lucide-react';
import { OrganizeMove, OrganizeResponse } from '../types';
import { formatBytes, API_BASE } from './DiskSelector';

interface OrganizerTabProps {
  currentPath: string;
  onRefreshScan: () => void;
}

export const OrganizerTab: React.FC<OrganizerTabProps> = ({ currentPath, onRefreshScan }) => {
  const [targetPath, setTargetPath] = useState<string>(currentPath);
  const [organizePreview, setOrganizePreview] = useState<OrganizeMove[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewFetched, setPreviewFetched] = useState<boolean>(false);
  const [organizing, setOrganizing] = useState<boolean>(false);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [movedCount, setMovedCount] = useState<number | null>(null);
  const [browsing, setBrowsing] = useState<boolean>(false);

  // Fetch organizer dry-run simulation
  const handlePreviewOrganize = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    setReportPath(null);
    setReportContent(null);
    setMovedCount(null);
    try {
      const res = await fetch(`${API_BASE}/api/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath, simulate: true })
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

  // Run actual organizer rearrangement
  const handleExecuteOrganize = async () => {
    setOrganizing(true);
    setPreviewError(null);
    try {
      const res = await fetch(`${API_BASE}/api/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath, simulate: false })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to execute folder organization');
      }
      const data: OrganizeResponse = await res.json();
      
      setMovedCount(data.moved_count);
      setReportPath(data.report_path || null);
      setReportContent(data.report_content || null);
      setPreviewFetched(false);
      setOrganizePreview([]);
      
      // Auto refresh the scanning view so the filesystem explorer matches
      onRefreshScan();
    } catch (err: any) {
      setPreviewError(err.message || 'Error during file organization execution.');
    } finally {
      setOrganizing(false);
    }
  };

  // Group previews by category for beautiful visualization
  const groupedPreview = React.useMemo(() => {
    const groups: { [key: string]: OrganizeMove[] } = {};
    organizePreview.forEach(move => {
      if (!groups[move.target_folder]) {
        groups[move.target_folder] = [];
      }
      groups[move.target_folder].push(move);
    });
    return groups;
  }, [organizePreview]);

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Column Left: Control Panel and Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FolderSync size={20} style={{ color: 'var(--neon-cyan)' }} /> Secure Folder Organizer
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
            Group loose files in any active folder into categorized subdirectories (Documents, Images, Videos, Audio, Archives, Installers) automatically. 
          </p>

          {/* Directory Select Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Folder Location
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text" 
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--input-color)',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
                placeholder="E.g. C:\Users\Username\Downloads"
              />
              <button 
                type="button" 
                className="btn-secondary"
                disabled={browsing || organizing}
                onClick={async () => {
                  setBrowsing(true);
                  try {
                    const res = await fetch(`${API_BASE}/api/select-folder`, { method: 'POST' });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.success && data.path) {
                        setTargetPath(data.path);
                      }
                    }
                  } catch (err) {
                    console.error('Failed to select folder:', err);
                  } finally {
                    setBrowsing(false);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              >
                <FolderOpen size={16} /> {browsing ? 'Selecting...' : 'Browse'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn-primary" 
              onClick={handlePreviewOrganize} 
              disabled={loadingPreview || organizing || !targetPath.trim()}
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
                fontSize: '0.85rem', 
                borderRadius: '8px',
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldAlert size={16} /> {previewError}
            </div>
          )}

          {/* Success Summary View */}
          {movedCount !== null && (
            <div 
              style={{ 
                padding: '1.25rem', 
                background: 'rgba(45, 212, 191, 0.05)', 
                border: '1px solid rgba(45, 212, 191, 0.25)', 
                color: 'var(--neon-cyan)', 
                fontSize: '0.9rem', 
                borderRadius: '8px',
                marginTop: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1rem' }}>
                <CheckCircle2 size={20} /> Folder Rearrangement Successful!
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Moved <strong>{movedCount} loose files</strong> into their respective subfolders.
              </p>
              {reportPath && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  Report generated: <span style={{ fontFamily: 'monospace', color: 'var(--neon-cyan)' }}>{reportPath.split(/[\\/]/).pop()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Column Right: Interactive Preview & Track Logs Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Simulation Preview Mode */}
        {previewFetched && (
          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              padding: '1.5rem',
              display: 'flex', 
              flexDirection: 'column',
              minHeight: '400px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Organization Preview ({organizePreview.length} files)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Simulated Dry-Run</span>
            </div>

            {organizePreview.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', gap: '0.5rem', padding: '2rem' }}>
                <Info size={32} />
                <span>No loose files matching organization categories found directly under this folder.</span>
              </div>
            ) : (
              <>
                {/* Categorized Preview Groups */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem', paddingRight: '0.25rem', maxHeight: '350px' }}>
                  {Object.keys(groupedPreview).map(category => (
                    <div key={category} style={{ background: 'var(--card-inner-bg)', border: '1px solid var(--card-inner-border)', borderRadius: '8px', padding: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--neon-cyan)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        &rarr; Move to /{category} ({groupedPreview[category].length} items)
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {groupedPreview[category].map((move, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.25rem 0.5rem', background: 'var(--btn-secondary-bg)', border: '1px solid var(--btn-secondary-border)', borderRadius: '4px' }}>
                            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                              {move.name}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {formatBytes(move.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  className="btn-primary animate-pulse-neon" 
                  onClick={handleExecuteOrganize} 
                  disabled={organizing}
                  style={{ justifyContent: 'center', padding: '0.85rem' }}
                >
                  {organizing ? 'Rearranging Files...' : 'Approve & Execute Sorting'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Real-time Track Logs Panel */}
        {reportContent && (
          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              padding: '1.5rem',
              display: 'flex', 
              flexDirection: 'column',
              minHeight: '400px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} /> Rearrangement Tracking Log
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>Generated Track File</span>
            </div>

            <div 
              style={{ 
                flex: 1,
                background: 'var(--input-bg)', 
                border: '1px solid var(--input-border)',
                padding: '1rem', 
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                overflowY: 'auto',
                maxHeight: '350px',
                whiteSpace: 'pre-wrap',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {reportContent}
            </div>
          </div>
        )}

        {/* Placeholder state */}
        {!previewFetched && !reportContent && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', minHeight: '400px' }}>
            <FolderSync size={48} style={{ color: 'rgba(255,255,255,0.04)' }} />
            <h4 style={{ color: '#475569', fontWeight: 700 }}>Dry-Run Simulated Preview Area</h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '280px' }}>
              Trigger organization preview on the left to see which loose files will be rearranged by categories.
            </p>
          </div>
        )}

      </div>

    </div>
  );
};

export default OrganizerTab;
