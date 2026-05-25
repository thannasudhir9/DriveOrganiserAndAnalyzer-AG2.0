import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, RefreshCw, XCircle, HardDrive, Cpu, Circle, Database, Layers, Sun, Moon, Pause, Play, FileText, CheckCircle2, Sparkles, FolderSync, Camera } from 'lucide-react';
import { DiskSelector, API_BASE, formatBytes } from './components/DiskSelector';
import { Dashboard } from './components/Dashboard';
import { ScanStatus, ScanSummary, DirectoryContent } from './types';
import { DocsTab } from './components/DocsTab';
import { FeaturesTab } from './components/FeaturesTab';
import { OrganizerTab } from './components/OrganizerTab';

export const App: React.FC = () => {
  const [viewState, setViewState] = useState<'selector' | 'scanning' | 'dashboard'>('selector');
  const [scanId, setScanId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [homeTab, setHomeTab] = useState<'scan' | 'docs' | 'features' | 'organize'>('scan');
  const [activeTab, setActiveTab] = useState<'explorer' | 'search' | 'duplicates' | 'analytics' | 'optimizer' | 'organizer' | 'docs' | 'features'>('explorer');
  const [screenshotting, setScreenshotting] = useState<boolean>(false);
  const [screenshotNotice, setScreenshotNotice] = useState<string | null>(null);
  
  // Progress & results
  const [progress, setProgress] = useState<ScanStatus | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);

  // Pause scanning
  const handlePauseScan = async () => {
    if (!scanId) return;
    try {
      const res = await fetch(`${API_BASE}/api/scan/${scanId}/pause`, { method: 'POST' });
      if (res.ok) {
        setProgress(prev => prev ? { ...prev, status: 'paused' } : null);
      }
    } catch (err) {
      console.error('Failed to pause scan:', err);
    }
  };

  // Resume scanning
  const handleResumeScan = async () => {
    if (!scanId) return;
    try {
      const res = await fetch(`${API_BASE}/api/scan/${scanId}/resume`, { method: 'POST' });
      if (res.ok) {
        setProgress(prev => prev ? { ...prev, status: 'scanning' } : null);
      }
    } catch (err) {
      console.error('Failed to resume scan:', err);
    }
  };
  
  // Navigation
  const [rootPath, setRootPath] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [activeNode, setActiveNode] = useState<DirectoryContent | null>(null);

  // Ref to hold current path for interval access without closures
  const currentPathRef = useRef<string>('');
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Error logging
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Load URL query parameters on startup to recreate exact view for automated screenshots
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramTheme = params.get('theme');
    const paramViewState = params.get('viewState');
    const paramHomeTab = params.get('homeTab');
    const paramActiveTab = params.get('activeTab');
    const paramCurrentPath = params.get('currentPath');
    const paramScanId = params.get('scanId');

    if (paramTheme === 'light' || paramTheme === 'dark') {
      setTheme(paramTheme);
      if (paramTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
    if (paramViewState === 'selector' || paramViewState === 'scanning' || paramViewState === 'dashboard') {
      setViewState(paramViewState);
    }
    if (paramHomeTab === 'scan' || paramHomeTab === 'docs' || paramHomeTab === 'features' || paramHomeTab === 'organize') {
      setHomeTab(paramHomeTab);
    }
    if (paramActiveTab) {
      setActiveTab(paramActiveTab as any);
    }
    if (paramCurrentPath) {
      setCurrentPath(paramCurrentPath);
      currentPathRef.current = paramCurrentPath;
    }
    if (paramScanId) {
      setScanId(paramScanId);
      fetchIntermediateResults(paramScanId, paramCurrentPath || '');
    }
  }, []);

  const takeScreenshot = async () => {
    setScreenshotting(true);
    setScreenshotNotice(null);
    try {
      const res = await fetch(`${API_BASE}/api/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          view_state: viewState,
          home_tab: homeTab,
          active_tab: activeTab,
          current_path: currentPath,
          scan_id: scanId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScreenshotNotice(`Screenshot captured successfully as /screenshots/${data.filename}!`);
          setTimeout(() => setScreenshotNotice(null), 6000);
        } else {
          console.error("Screenshot capture failed:", data);
        }
      } else {
        console.error("Failed to call screenshot API:", res.statusText);
      }
    } catch (err) {
      console.error("Error capturing screenshot:", err);
    } finally {
      setScreenshotting(false);
    }
  };

  // Fetch intermediate results live
  const fetchIntermediateResults = async (id: string, defaultPath: string) => {
    try {
      const targetPath = currentPathRef.current || defaultPath;
      
      // 1. Fetch intermediate summary statistics
      const summaryRes = await fetch(`${API_BASE}/api/scan/${id}/summary`);
      if (summaryRes.ok) {
        const summaryData: ScanSummary = await summaryRes.json();
        setSummary(summaryData);
      }

      // 2. Fetch the viewed folder contents
      const nodeRes = await fetch(`${API_BASE}/api/scan/${id}/node?path=${encodeURIComponent(targetPath)}`);
      if (nodeRes.ok) {
        const nodeData: DirectoryContent = await nodeRes.json();
        setActiveNode(nodeData);
      }
    } catch (err) {
      console.error('Failed to retrieve intermediate scanning results:', err);
    }
  };

  // Poll scan progress
  const startPolling = (id: string, initialRoot: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    let intermediateCounter = 0;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scan/${id}/status`);
        if (!res.ok) {
          throw new Error('Failed to fetch scan progress');
        }
        const data: ScanStatus = await res.json();
        setProgress(data);

        // Fetch intermediate results (summary + active node) every 1.5 seconds (every 3rd poll)
        intermediateCounter++;
        if ((data.status === 'scanning' || data.status === 'paused') && intermediateCounter % 3 === 0) {
          fetchIntermediateResults(id, initialRoot);
        }

        if (data.status === 'completed') {
          clearInterval(pollIntervalRef.current);
          fetchResults(id, initialRoot);
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setViewState('selector');
          setErrorMsg(data.error || 'The filesystem scan encountered a fatal error.');
        } else if (data.status === 'cancelled') {
          clearInterval(pollIntervalRef.current);
          setViewState('selector');
        }
      } catch (err: any) {
        console.error('Error polling status:', err);
      }
    }, 500); // Poll every 500ms for high responsiveness
  };

  // Fetch final reports once completed
  const fetchResults = async (id: string, initialRoot: string) => {
    try {
      // 1. Fetch full report summary
      const summaryRes = await fetch(`${API_BASE}/api/scan/${id}/summary`);
      if (!summaryRes.ok) {
        throw new Error('Failed to retrieve scan summary data');
      }
      const summaryData: ScanSummary = await summaryRes.json();
      setSummary(summaryData);

      // 2. Fetch the root folder contents
      const nodeRes = await fetch(`${API_BASE}/api/scan/${id}/node?path=${encodeURIComponent(initialRoot)}`);
      if (!nodeRes.ok) {
        throw new Error('Failed to retrieve root directory layout');
      }
      const nodeData: DirectoryContent = await nodeRes.json();
      setActiveNode(nodeData);

      setViewState('dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while compiling analysis results.');
      setViewState('selector');
    }
  };

  // Cancel scanner
  const handleCancelScan = async () => {
    if (!scanId) return;
    try {
      await fetch(`${API_BASE}/api/scan/${scanId}/cancel`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to cancel scan:', err);
    } finally {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      setViewState('selector');
      setScanId(null);
      setProgress(null);
    }
  };

  // Start a new scan on a drive or path
  const handleStartScan = async (
    path: string, 
    skipHidden: boolean = false, 
    skipPackages: boolean = false, 
    skipCode: boolean = false
  ) => {
    setErrorMsg(null);
    
    // Set placeholder blank summary immediately to avoid dashboard crashes
    const placeholderSummary: ScanSummary = {
      root_path: path,
      status: 'scanning',
      total_size: 0,
      scanned_folders: 0,
      scanned_files: 0,
      elapsed_time: 0,
      top_files: [],
      top_folders: [],
      file_types: [],
      duplicates: [],
      permission_errors_count: 0
    };
    setSummary(placeholderSummary);
    setProgress({
      status: 'scanning',
      error: null,
      scanned_folders: 0,
      scanned_files: 0,
      total_size: 0,
      current_folder: path,
      elapsed_time: 0,
      permission_errors_count: 0
    });
    
    // Transition to dashboard IMMEDIATELY so the user sees results live!
    setViewState('dashboard');
    setRootPath(path);
    setCurrentPath(path);

    try {
      const res = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path,
          skip_hidden: skipHidden,
          skip_packages: skipPackages,
          skip_code: skipCode
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to initialize directory scan');
      }

      const data = await res.json();
      setScanId(data.scan_id);
      setRootPath(data.path);
      setCurrentPath(data.path);
      
      startPolling(data.scan_id, data.path);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while starting filesystem scan.');
      setViewState('selector');
    }
  };

  // Navigate deeper inside active directories
  const handleNavigate = async (path: string) => {
    if (!scanId) return;
    
    // Clear activeNode first to trigger clean skeleton screens
    setActiveNode(null);
    setCurrentPath(path);

    try {
      const res = await fetch(`${API_BASE}/api/scan/${scanId}/node?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        throw new Error('Failed to explore directory partition');
      }
      const data: DirectoryContent = await res.json();
      setActiveNode(data);
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  // Jump up one folder level
  const handleGoBack = () => {
    const isWindows = currentPath.includes('\\') || currentPath.includes(':');
    const separator = isWindows ? '\\' : '/';
    
    // Split and slice off last item
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    if (parts.length <= 1) {
      if (rootPath === "All System Drives" && currentPath !== "All System Drives") {
        handleNavigate("All System Drives");
      }
      return;
    }

    let parentPath = '';
    if (isWindows && parts[0].includes(':')) {
      const remainingParts = parts.slice(1, -1);
      parentPath = parts[0] + separator + remainingParts.join(separator);
    } else {
      parentPath = separator + parts.slice(0, -1).join(separator);
    }

    handleNavigate(parentPath);
  };

  // Clean interval references
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header bar */}
      <header className="app-header" style={{ padding: '1rem 2rem', background: theme === 'dark' ? 'rgba(9, 14, 30, 0.4)' : 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div 
            onClick={() => {
              if (progress && (progress.status === 'scanning' || progress.status === 'paused')) {
                setViewState('selector');
              } else {
                setViewState('selector');
                setScanId(null);
                setProgress(null);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
          >
            <div style={{ 
              padding: '0.5rem', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, var(--neon-indigo), var(--neon-cyan))', 
              color: 'white',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
            }}>
              <HardDrive size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Nova <span style={{ color: 'var(--neon-cyan)', fontWeight: 500, fontSize: '0.8rem', background: 'rgba(45, 212, 191, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>v2.0</span>
              </h1>
              <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Advanced Local Storage Analyzer</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {viewState === 'scanning' && (
              <div className="glass-panel" style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', borderColor: 'var(--border-glow)' }}>
                <Circle size={8} fill="var(--neon-rose)" style={{ color: 'var(--neon-rose)' }} className="animate-pulse" />
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Active Scan Underway</span>
              </div>
            )}
            
            {/* Take Screenshot Button */}
            <button
               onClick={takeScreenshot}
               disabled={screenshotting}
               style={{
                 background: 'rgba(255, 255, 255, 0.04)',
                 border: '1px solid rgba(255, 255, 255, 0.08)',
                 borderRadius: '50%',
                 width: '32px',
                 height: '32px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 cursor: 'pointer',
                 color: 'white',
                 transition: 'var(--transition-smooth)',
                 opacity: screenshotting ? 0.6 : 1
               }}
               onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
               onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
               title="Take Screenshot of Current View"
             >
               {screenshotting ? (
                 <RefreshCw size={14} style={{ color: 'var(--neon-rose)' }} className="animate-spin-neon" />
               ) : (
                 <Camera size={14} style={{ color: 'var(--neon-cyan)' }} />
               )}
             </button>

            {/* Theme Toggler Button */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun size={14} style={{ color: 'var(--neon-cyan)' }} /> : <Moon size={14} style={{ color: 'var(--neon-indigo)' }} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
              <Cpu size={12} /> Local Node
            </div>
          </div>
        </div>
      </header>

      {/* Main View Manager */}
      <main style={{ flex: 1 }}>
        {screenshotNotice && (
          <div style={{ maxWidth: '1000px', margin: '1.5rem auto 0 auto', padding: '0 1rem' }}>
            <div 
              className="glass-panel animate-pulse-neon" 
              style={{ 
                padding: '1rem 1.25rem', 
                borderColor: 'rgba(45, 212, 191, 0.3)', 
                background: 'rgba(45, 212, 191, 0.05)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderRadius: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--neon-cyan)' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', fontWeight: 600 }}>{screenshotNotice}</p>
              </div>
              <button 
                onClick={() => setScreenshotNotice(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center' }}
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ maxWidth: '1000px', margin: '1.5rem auto 0 auto', padding: '0 1rem' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1rem 1.25rem', 
                borderColor: 'rgba(244, 63, 94, 0.3)', 
                background: 'rgba(244, 63, 94, 0.05)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderRadius: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert size={20} style={{ color: 'var(--neon-rose)' }} />
                <p style={{ fontSize: '0.85rem', color: '#f43f5e' }}>{errorMsg}</p>
              </div>
              <button 
                onClick={() => setErrorMsg(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        )}

        {/* View 1: Selector */}
        {viewState === 'selector' && (
          <div style={{ maxWidth: '1000px', margin: '1rem auto', padding: '0 1rem' }} className="animate-fade-in">
            {/* Elegant Sub-Tab Selector for Home Page */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1rem', 
              marginBottom: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              paddingBottom: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setHomeTab('scan')}
                style={{
                  background: homeTab === 'scan' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: homeTab === 'scan' ? '2px solid var(--neon-indigo)' : '2px solid transparent',
                  padding: '0.6rem 1.25rem',
                  color: homeTab === 'scan' ? 'white' : '#64748b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.25s ease'
                }}
              >
                <HardDrive size={16} style={{ color: homeTab === 'scan' ? 'var(--neon-indigo)' : '#64748b' }} />
                Scan Analyzer Hub
              </button>
              <button
                onClick={() => setHomeTab('docs')}
                style={{
                  background: homeTab === 'docs' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: homeTab === 'docs' ? '2px solid var(--neon-indigo)' : '2px solid transparent',
                  padding: '0.6rem 1.25rem',
                  color: homeTab === 'docs' ? 'white' : '#64748b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.25s ease'
                }}
              >
                <FileText size={16} style={{ color: homeTab === 'docs' ? 'var(--neon-indigo)' : '#64748b' }} />
                Interactive Project Docs
              </button>
              <button
                onClick={() => setHomeTab('features')}
                style={{
                  background: homeTab === 'features' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: homeTab === 'features' ? '2px solid var(--neon-indigo)' : '2px solid transparent',
                  padding: '0.6rem 1.25rem',
                  color: homeTab === 'features' ? 'white' : '#64748b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.25s ease'
                }}
              >
                <Sparkles size={16} style={{ color: homeTab === 'features' ? 'var(--neon-indigo)' : '#64748b' }} />
                Application Features
              </button>
              <button
                onClick={() => setHomeTab('organize')}
                style={{
                  background: homeTab === 'organize' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: homeTab === 'organize' ? '2px solid var(--neon-indigo)' : '2px solid transparent',
                  padding: '0.6rem 1.25rem',
                  color: homeTab === 'organize' ? 'white' : '#64748b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.25s ease'
                }}
              >
                <FolderSync size={16} style={{ color: homeTab === 'organize' ? 'var(--neon-indigo)' : '#64748b' }} />
                File Organizer
              </button>
            </div>

            {homeTab === 'scan' && (
              <DiskSelector onStartScan={handleStartScan} />
            )}
            {homeTab === 'docs' && (
              <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
                <DocsTab />
              </div>
            )}
            {homeTab === 'features' && (
              <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px' }}>
                <FeaturesTab />
              </div>
            )}
            {homeTab === 'organize' && (
              <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px' }}>
                <OrganizerTab currentPath="" onRefreshScan={() => {}} />
              </div>
            )}
          </div>
        )}

        {/* View 3: Complete Results Summary Dashboard */}
        {viewState === 'dashboard' && summary && (
          <Dashboard
            summary={summary}
            activeNode={activeNode}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
            currentPath={currentPath}
            rootPath={rootPath}
            onScanNew={() => {
              setViewState('selector');
              setScanId(null);
              setProgress(null);
            }}
            scanId={scanId || ''}
            progress={progress}
            handlePauseScan={handlePauseScan}
            handleResumeScan={handleResumeScan}
            handleCancelScan={handleCancelScan}
            theme={theme}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </main>

      {/* Footer bar */}
      <footer style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', textAlign: 'center', fontSize: '0.75rem', color: '#475569', background: 'rgba(9, 14, 30, 0.2)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>Nova Storage Analyzer &bull; Locally Sandboxed Operations Only</span>
          <span>&copy; {new Date().getFullYear()} Google DeepMind Partner Project</span>
        </div>
      </footer>

      {/* Floating mini background scan monitor card */}
      {viewState !== 'scanning' && progress && (progress.status === 'scanning' || progress.status === 'paused') && (() => {
        let scanPercent = 0;
        if (progress.is_drive_root && progress.drive_used_size) {
          scanPercent = Math.min(99, Math.round((progress.total_size / progress.drive_used_size) * 100));
        } else {
          scanPercent = Math.min(99, Math.round((1 - Math.exp(-progress.scanned_files / 1800)) * 100));
        }

        return (
          <div 
            className="glass-panel animate-fade-in"
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              width: '320px',
              padding: '1.25rem',
              borderRadius: '12px',
              zIndex: 1000,
              border: progress.status === 'paused' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--neon-indigo)',
              boxShadow: progress.status === 'paused'
                ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(245, 158, 11, 0.15)'
                : '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(99, 102, 241, 0.25)',
              background: 'rgba(9, 14, 30, 0.85)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'border 0.5s, box-shadow 0.5s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Circle 
                  size={8} 
                  fill={progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-cyan)'} 
                  style={{ color: progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-cyan)' }} 
                  className={progress.status === 'paused' ? '' : 'animate-pulse'} 
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>
                  Scan {progress.status === 'paused' ? 'Paused' : 'in Progress'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-cyan)', fontWeight: 700 }}>
                {scanPercent}%
              </span>
            </div>

            {/* Small Progress bar */}
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${scanPercent}%`, 
                background: progress.status === 'paused' 
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
                  : 'linear-gradient(90deg, var(--neon-indigo), var(--neon-cyan))' 
              }} />
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Path: <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{progress.current_folder}</span>
              </div>
              <div>
                Discovered: <strong style={{ color: 'white' }}>{formatBytes(progress.total_size)}</strong> ({ (progress.scanned_files + progress.scanned_folders).toLocaleString() } items)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button 
                onClick={() => setViewState('dashboard')} 
                className="btn-primary" 
                style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                Restore View
              </button>
              {progress.status === 'scanning' ? (
                <button 
                  onClick={handlePauseScan} 
                  className="btn-secondary" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Pause Scan"
                >
                  <Pause size={12} />
                </button>
              ) : (
                <button 
                  onClick={handleResumeScan} 
                  className="btn-primary" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(45, 212, 191, 0.1)', borderColor: 'var(--neon-cyan)' }}
                  title="Resume Scan"
                >
                  <Play size={12} style={{ color: 'var(--neon-cyan)' }} />
                </button>
              )}
              <button 
                onClick={handleCancelScan} 
                className="btn-danger" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Abort Scan"
              >
                Abort
              </button>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
export default App;
