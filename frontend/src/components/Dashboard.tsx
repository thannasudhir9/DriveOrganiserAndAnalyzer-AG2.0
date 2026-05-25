import React, { useState } from 'react';
import { Database, FolderTree, BarChart3, Search, Copy, RefreshCw, Layers, ShieldAlert, Timer, Sparkles, Download, CheckCircle2, FileText } from 'lucide-react';
import { ScanSummary, DirectoryContent } from '../types';
import { formatBytes, API_BASE } from './DiskSelector';
import { Breadcrumbs } from './Breadcrumbs';
import { FileExplorer } from './FileExplorer';
import { Treemap } from './Treemap';
import { SearchFilter } from './SearchFilter';
import { DuplicatesTab } from './DuplicatesTab';
import { FileTypeChart } from './FileTypeChart';
import { OptimizerTab } from './OptimizerTab';
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
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'search' | 'duplicates' | 'analytics' | 'optimizer' | 'docs' | 'features'>('explorer');
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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Space Scanned
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Folders Traversed
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Files Cataloged
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Time / Scan Speed
            </span>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>
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
          background: 'rgba(10, 15, 30, 0.7)' 
        }}
      >
        <button
          onClick={() => setActiveTab('explorer')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'explorer' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: activeTab === 'explorer' ? 'transparent' : 'transparent',
            boxShadow: activeTab === 'explorer' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: 'white',
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
            borderColor: activeTab === 'search' ? 'transparent' : 'transparent',
            boxShadow: activeTab === 'search' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: 'white',
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
            borderColor: activeTab === 'duplicates' ? 'transparent' : 'transparent',
            boxShadow: activeTab === 'duplicates' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: 'white',
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
            borderColor: activeTab === 'analytics' ? 'transparent' : 'transparent',
            boxShadow: activeTab === 'analytics' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: 'white',
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
            borderColor: activeTab === 'optimizer' ? 'transparent' : 'transparent',
            boxShadow: activeTab === 'optimizer' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: 'white',
            fontWeight: 600,
            borderRadius: '8px'
          }}
        >
          <Sparkles size={16} /> Space Optimizer
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className="btn-secondary"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: activeTab === 'docs' ? 'linear-gradient(135deg, var(--neon-indigo), var(--neon-purple))' : 'transparent',
            borderColor: activeTab === 'docs' ? 'transparent' : 'transparent',
            boxShadow: activeTab === 'docs' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: 'white',
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
            borderColor: activeTab === 'features' ? 'transparent' : 'transparent',
            boxShadow: activeTab === 'features' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            color: 'white',
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
            <Breadcrumbs currentPath={currentPath} onNavigate={onNavigate} />
            
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
