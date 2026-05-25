import React, { useState } from 'react';
import { Database, FolderTree, BarChart3, Search, Copy, RefreshCw, Layers, ShieldAlert, Timer, Sparkles, Download, CheckCircle2, FileText, Pause, Play, FolderSync } from 'lucide-react';
import { ScanSummary, DirectoryContent, ScanStatus } from '../types';
import { formatBytes, API_BASE } from './DiskSelector';
import { Breadcrumbs } from './Breadcrumbs';
import { FileExplorer } from './FileExplorer';
import { Treemap } from './Treemap';
import { SearchFilter } from './SearchFilter';
import { DuplicatesTab } from './DuplicatesTab';
import { FileTypeChart } from './FileTypeChart';
import { OptimizerTab } from './OptimizerTab';
import { OrganizerTab } from './OrganizerTab';
import { DocsTab } from './DocsTab';
import { FeaturesTab } from './FeaturesTab';

interface DashboardProps {
  summary: ScanSummary;
  activeNode: DirectoryContent | null;
  onNavigate: (path: string) => void;
  onGoBack: () => void;
  currentPath: string;
  rootPath: string;
  onScanNew: () => void;
  scanId: string;
  progress: ScanStatus | null;
  handlePauseScan: () => void;
  handleResumeScan: () => void;
  handleCancelScan: () => void;
  theme: 'dark' | 'light';
  activeTab?: 'explorer' | 'search' | 'duplicates' | 'analytics' | 'optimizer' | 'organizer' | 'docs' | 'features';
  onTabChange?: (tab: 'explorer' | 'search' | 'duplicates' | 'analytics' | 'optimizer' | 'organizer' | 'docs' | 'features') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  activeNode,
  onNavigate,
  onGoBack,
  currentPath,
  rootPath,
  onScanNew,
  scanId,
  progress,
  handlePauseScan,
  handleResumeScan,
  handleCancelScan,
  activeTab: propActiveTab,
  onTabChange,
}) => {
  const [activeTab, setActiveTabState] = useState<'explorer' | 'search' | 'duplicates' | 'analytics' | 'optimizer' | 'organizer' | 'docs' | 'features'>(propActiveTab || 'explorer');

  React.useEffect(() => {
    if (propActiveTab) {
      setActiveTabState(propActiveTab);
    }
  }, [propActiveTab]);

  const setActiveTab = (tab: 'explorer' | 'search' | 'duplicates' | 'analytics' | 'optimizer' | 'organizer' | 'docs' | 'features') => {
    setActiveTabState(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportReport = async () => {
    setExporting(true);
    setExportSuccess(null);
    setExportError(null);
    try {
      const res = await fetch(`${API_BASE}/api/scan/${scanId}/export`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to save JSON report on your local drive');
      }
      const data = await res.json();
      setExportSuccess(data.filename);
      setTimeout(() => setExportSuccess(null), 6000);
    } catch (err: any) {
      setExportError(err.message || 'Error exporting scan report.');
    } finally {
      setExporting(false);
    }
  };

  // Compute files scan speed
  const scanSpeed = summary.elapsed_time > 0 
    ? Math.round((summary.scanned_files + summary.scanned_folders) / summary.elapsed_time)
    : 0;

  // Prepare treemap items combining activeNode folders and files
  const treemapItems = React.useMemo(() => {
    if (!activeNode) return [];
    
    const folders = activeNode.folders.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      is_dir: true
    }));
    
    const files = activeNode.files.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      is_dir: false
    }));
    
    return [...folders, ...files];
  }, [activeNode]);

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Active Scanning HUD Banner */}
      {progress && (progress.status === 'scanning' || progress.status === 'paused') && (() => {
        // Calculate scan percentage
        let scanPercent = 0;
        if (progress.is_drive_root && progress.drive_used_size) {
          scanPercent = Math.min(99, Math.round((progress.total_size / progress.drive_used_size) * 100));
        } else {
          scanPercent = Math.min(99, Math.round((1 - Math.exp(-progress.scanned_files / 1800)) * 100));
        }

        // Calculate scanning speeds
        const bps = progress.elapsed_time > 0 ? progress.total_size / progress.elapsed_time : 0;
        const fps = progress.elapsed_time > 0 ? (progress.scanned_files + progress.scanned_folders) / progress.elapsed_time : 0;

        // ETA Estimations
        const etaSec = (() => {
          if (progress.elapsed_time < 2 || progress.status !== 'scanning') return null;
          if (progress.is_drive_root && progress.drive_used_size && progress.total_size > 1024 * 1024) {
            const fraction = progress.total_size / progress.drive_used_size;
            if (fraction >= 1) return null;
            return Math.max(1, Math.round((progress.elapsed_time / fraction) - progress.elapsed_time));
          } else {
            const totalItems = progress.scanned_files + progress.scanned_folders;
            if (totalItems < 100) return null;
            const rate = totalItems / progress.elapsed_time;
            const remainingItems = Math.max(totalItems * 1.4, 800) - totalItems;
            return Math.max(1, Math.round(remainingItems / rate));
          }
        })();

        const formatClock = (seconds: number) => {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        return (
          <div 
            className="glass-panel animate-pulse-neon" 
            style={{ 
              padding: '1.25rem 1.5rem', 
              marginBottom: '2rem', 
              borderColor: progress.status === 'paused' ? 'rgba(245, 158, 11, 0.4)' : 'var(--hud-border)',
              background: 'var(--hud-bg)',
              boxShadow: progress.status === 'paused' 
                ? '0 8px 32px rgba(0,0,0,0.25), 0 0 15px rgba(245, 158, 11, 0.1)' 
                : '0 8px 32px rgba(0,0,0,0.25), 0 0 15px rgba(99, 102, 241, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              borderRadius: '12px'
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className={progress.status === 'paused' ? '' : 'animate-spin-neon'} style={{ display: 'flex', color: progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-cyan)' }}>
                  <RefreshCw size={18} />
                </span>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {progress.status === 'paused' ? 'Scanning Paused' : 'Active Indexing Ongoing...'}
                    <span style={{ fontSize: '0.75rem', background: progress.status === 'paused' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(45, 212, 191, 0.15)', color: progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-cyan)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 700 }}>
                      {scanPercent}%
                    </span>
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '450px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    Path: <span style={{ fontFamily: 'monospace' }}>{progress.current_folder}</span>
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {progress.status === 'scanning' ? (
                  <button 
                    className="btn-secondary" 
                    onClick={handlePauseScan}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                  >
                    <Pause size={12} style={{ color: 'var(--neon-amber)' }} /> Pause
                  </button>
                ) : (
                  <button 
                    className="btn-primary" 
                    onClick={handleResumeScan}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(45, 212, 191, 0.1)', borderColor: 'var(--neon-cyan)' }}
                  >
                    <Play size={12} style={{ color: 'var(--neon-cyan)' }} /> Resume
                  </button>
                )}

                <button 
                  className="btn-danger" 
                  onClick={handleCancelScan}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                >
                  Abort
                </button>
              </div>
            </div>

            {/* Progress Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Progress bar */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ 
                  height: '8px', 
                  borderRadius: '4px', 
                  background: 'var(--bar-bg)', 
                  overflow: 'hidden',
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ 
                     height: '100%', 
                     width: `${scanPercent}%`,
                     background: progress.status === 'paused'
                       ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                       : 'linear-gradient(90deg, var(--neon-indigo), var(--neon-cyan))',
                     boxShadow: progress.status === 'paused'
                       ? '0 0 6px rgba(245, 158, 11, 0.4)'
                       : '0 0 8px rgba(45, 212, 191, 0.3)',
                     transition: 'width 0.4s ease-out'
                  }} />
                </div>
              </div>

              {/* Fast Stats */}
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <div>
                  Clock: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{formatClock(progress.elapsed_time)}</strong>
                </div>
                <div>
                  ETA: <strong style={{ color: 'var(--text-primary)' }}>{etaSec ? `~${etaSec}s` : 'Calculating...'}</strong>
                </div>
                <div>
                  Objects: <strong style={{ color: 'var(--neon-indigo)' }}>{(progress.scanned_files + progress.scanned_folders).toLocaleString()}</strong>
                </div>
                <div>
                  Discovered: <strong style={{ color: 'var(--neon-cyan)' }}>{formatBytes(progress.total_size)}</strong>
                </div>
                <div>
                  Speed: <strong>{progress.status === 'paused' ? '0' : Math.round(fps).toLocaleString()}</strong> items/s
                </div>
              </div>
            </div>

          </div>
        );
      })()}

      {/* Top Banner Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Analysis Report</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Target: <code style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem' }}>{summary.root_path}</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={handleExportReport} disabled={exporting}>
            {exporting ? (
              <RefreshCw className="animate-spin-neon" size={16} />
            ) : (
              <Download size={16} />
            )}
            {exporting ? 'Saving...' : 'Save Scan Report'}
          </button>
          <button className="btn-primary" onClick={onScanNew}>
            <RefreshCw size={16} /> Scan Another Directory
          </button>
        </div>
      </div>

      {/* Export Success Notification Banner */}
      {exportSuccess && (
        <div 
          className="glass-panel animate-fade-in" 
          style={{ 
            padding: '0.85rem 1.25rem', 
            borderColor: 'rgba(45, 212, 191, 0.25)', 
            background: 'rgba(45, 212, 191, 0.05)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            marginBottom: '1.5rem',
            borderRadius: '10px',
            fontSize: '0.85rem'
          }}
        >
          <CheckCircle2 size={18} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
          <p style={{ color: '#cbd5e1' }}>
            Report logged successfully! Saved JSON document as <strong style={{ color: 'var(--neon-cyan)' }}>{exportSuccess}</strong> inside your project's <code>/reports</code> workspace folder.
          </p>
        </div>
      )}

      {/* Export Error Notification Banner */}
      {exportError && (
        <div 
          className="glass-panel animate-fade-in" 
          style={{ 
            padding: '0.85rem 1.25rem', 
            borderColor: 'rgba(244, 63, 94, 0.25)', 
            background: 'rgba(244, 63, 94, 0.05)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            marginBottom: '1.5rem',
            borderRadius: '10px',
            fontSize: '0.85rem'
          }}
        >
          <ShieldAlert size={18} style={{ color: 'var(--neon-rose)', flexShrink: 0 }} />
          <p style={{ color: 'var(--neon-rose)' }}>{exportError}</p>
        </div>
      )}

      {/* 4 Stat Summary Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        
        {/* Stat 1: Total Space */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(45, 212, 191, 0.1)', color: 'var(--neon-cyan)' }}>
            <Database size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Space Scanned
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatBytes(summary.total_size)}
            </span>
          </div>
        </div>

        {/* Stat 2: Folders count */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--neon-indigo)' }}>
            <FolderTree size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Folders Traversed
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {summary.scanned_folders.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stat 3: Files count */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--neon-purple)' }}>
            <Layers size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Files Cataloged
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {summary.scanned_files.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stat 4: Speed / duration */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--neon-amber)' }}>
            <Timer size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Time / Scan Speed
            </span>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {summary.elapsed_time}s &bull; <span style={{ fontSize: '0.95rem', color: 'var(--neon-cyan)' }}>{scanSpeed}/s</span>
            </span>
          </div>
        </div>
      </div>

      {/* Permission Warnings Alert if applicable */}
      {summary.permission_errors_count > 0 && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '0.85rem 1.25rem', 
            borderColor: 'rgba(245, 158, 11, 0.25)', 
            background: 'rgba(245, 158, 11, 0.05)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            marginBottom: '1.5rem',
            borderRadius: '10px'
          }}
        >
          <ShieldAlert size={20} style={{ color: 'var(--neon-amber)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.85rem', color: '#d97706' }}>
            Skipped <strong>{summary.permission_errors_count} protected directories</strong> during system traversal due to administrative file access constraints.
          </p>
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '0.4rem', 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '2rem',
          borderRadius: '12px',
          background: 'var(--tabs-bg)' 
        }}
      >
        <button
          onClick={() => setActiveTab('explorer')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'explorer' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'explorer' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'explorer' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <FolderTree size={16} /> Directory Explorer
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'search' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'search' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'search' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <Search size={16} /> Top Space Consumers
        </button>

        <button
          onClick={() => setActiveTab('duplicates')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'duplicates' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'duplicates' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'duplicates' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <Copy size={16} /> Duplicate Finder
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'analytics' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'analytics' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'analytics' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <BarChart3 size={16} /> Analytics & Charts
        </button>

        <button
          onClick={() => setActiveTab('optimizer')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'optimizer' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'optimizer' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'optimizer' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <Sparkles size={16} /> Space Optimizer
        </button>

        <button
          onClick={() => setActiveTab('organizer')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'organizer' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'organizer' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'organizer' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <FolderSync size={16} /> File Organizer
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'docs' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'docs' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'docs' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <FileText size={16} /> Docs Viewer
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'features' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: 'transparent',
            boxShadow: activeTab === 'features' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: activeTab === 'features' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <Sparkles size={16} /> Features Guide
        </button>
      </div>

      {/* Main content viewport */}
      <div className="animate-fade-in">
        
        {/* Tab 1: Directory Explorer */}
        {activeTab === 'explorer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Breadcrumbs currentPath={currentPath} onNavigate={onNavigate} rootPath={rootPath} />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }} className="responsive-split-grid">
              {/* Left Explorer Table */}
              <div>
                {activeNode ? (
                  <FileExplorer
                    currentPath={currentPath}
                    rootPath={rootPath}
                    folders={activeNode.folders}
                    files={activeNode.files}
                    parentSize={activeNode.size}
                    onNavigate={onNavigate}
                    onGoBack={onGoBack}
                  />
                ) : (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    Loading folder details...
                  </div>
                )}
              </div>
              
              {/* Right Visual Treemap */}
              <div>
                <Treemap
                  items={treemapItems}
                  onNavigate={onNavigate}
                  currentPath={currentPath}
                  rootPath={rootPath}
                  onGoBack={currentPath !== rootPath ? onGoBack : undefined}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Top Space Consumers Search */}
        {activeTab === 'search' && (
          <SearchFilter 
            topFiles={summary.top_files}
            topFolders={summary.top_folders}
            onNavigate={(path) => {
              // Direct navigation to clicked subfolder
              onNavigate(path);
              setActiveTab('explorer'); // jump back to explorer
            }}
          />
        )}

        {/* Tab 3: Duplicate Finder */}
        {activeTab === 'duplicates' && (
          <DuplicatesTab duplicates={summary.duplicates} />
        )}

        {/* Tab 4: Analytics and Charts */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* File category distribution bar chart */}
            <FileTypeChart data={summary.file_types} />

            {/* List of top 10 largest folders */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Largest Folders Summary</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Absolute largest folders scanned across directory index.</p>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: '260px' }}>
                <table className="explorer-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Folder Path</th>
                      <th style={{ textAlign: 'right' }}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_folders.slice(0, 10).map((f, i) => (
                      <tr key={i}>
                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          <span 
                            onClick={() => {
                              onNavigate(f.path);
                              setActiveTab('explorer');
                            }}
                            style={{ cursor: 'pointer', color: 'var(--neon-indigo)', textDecoration: 'underline' }}
                          >
                            {f.path}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatBytes(f.size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Space Optimizer & Secure Organizer */}
        {activeTab === 'optimizer' && (
          <OptimizerTab 
            summary={summary}
            currentPath={currentPath}
            onRefreshScan={() => onNavigate(currentPath)}
          />
        )}

        {/* Tab 5.5: Dedicated File Organizer */}
        {activeTab === 'organizer' && (
          <OrganizerTab 
            currentPath={currentPath}
            onRefreshScan={() => onNavigate(currentPath)}
          />
        )}

        {/* Tab 6: Project Documents & Guides Viewer */}
        {activeTab === 'docs' && (
          <DocsTab />
        )}

        {/* Tab 7: Application Features Tour */}
        {activeTab === 'features' && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px' }}>
            <FeaturesTab />
          </div>
        )}

      </div>
    </div>
  );
};
