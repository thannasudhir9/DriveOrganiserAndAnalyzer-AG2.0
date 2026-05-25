import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, RefreshCw, XCircle, HardDrive, Cpu, Circle, Database, Layers, Sun, Moon, Pause, Play, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { DiskSelector, API_BASE, formatBytes } from './components/DiskSelector';
import { Dashboard } from './components/Dashboard';
import { ScanStatus, ScanSummary, DirectoryContent } from './types';
import { DocsTab } from './components/DocsTab';
import { FeaturesTab } from './components/FeaturesTab';

export const App: React.FC = () => {
  const [viewState, setViewState] = useState<'selector' | 'scanning' | 'dashboard'>('selector');
  const [scanId, setScanId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [homeTab, setHomeTab] = useState<'scan' | 'docs' | 'features'>('scan');
  
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

  // Poll scan progress
  const startPolling = (id: string, initialRoot: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scan/${id}/status`);
        if (!res.ok) {
          throw new Error('Failed to fetch scan progress');
        }
        const data: ScanStatus = await res.json();
        setProgress(data);

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
  const handleStartScan = async (path: string) => {
    setErrorMsg(null);
    setViewState('scanning');
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

    try {
      const res = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
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
    if (parts.length <= 1) return; // already at root drive

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
      <header className="app-header" style={{ padding: '1rem 2rem', background: 'rgba(9, 14, 30, 0.4)', backdropFilter: 'blur(10px)' }}>
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
          </div>
        )}

        {/* View 2: Background scanning active */}
        {viewState === 'scanning' && progress && (() => {
          // Calculate scan percentage
          let scanPercent = 0;
          if (progress.status === 'completed') {
            scanPercent = 100;
          } else if (progress.is_drive_root && progress.drive_used_size) {
            scanPercent = Math.min(99, Math.round((progress.total_size / progress.drive_used_size) * 100));
          } else {
            scanPercent = Math.min(99, Math.round((1 - Math.exp(-progress.scanned_files / 1800)) * 100));
          }

          // Calculate scanning speeds
          const bps = progress.elapsed_time > 0 ? progress.total_size / progress.elapsed_time : 0;
          const fps = progress.elapsed_time > 0 ? (progress.scanned_files + progress.scanned_folders) / progress.elapsed_time : 0;

          // Format dynamic remaining time ETA
          const calculateETASeconds = () => {
            if (progress.elapsed_time < 2 || progress.status !== 'scanning') return null;
            if (progress.is_drive_root && progress.drive_used_size && progress.total_size > 1024 * 1024) {
              const fraction = progress.total_size / progress.drive_used_size;
              if (fraction >= 1) return null;
              const estimatedTotalTime = progress.elapsed_time / fraction;
              const remainingSeconds = estimatedTotalTime - progress.elapsed_time;
              return Math.max(1, Math.round(remainingSeconds));
            } else {
              const totalItems = progress.scanned_files + progress.scanned_folders;
              if (totalItems < 100) return null;
              const rate = totalItems / progress.elapsed_time;
              if (rate <= 0) return null;
              let estimatedTotalItems = Math.max(totalItems * 1.4, 800);
              if (totalItems > 1200) estimatedTotalItems = totalItems + 400;
              if (totalItems > 6000) estimatedTotalItems = totalItems + 1000;
              const remainingItems = estimatedTotalItems - totalItems;
              return Math.max(1, Math.round(remainingItems / rate));
            }
          };

          const etaSec = calculateETASeconds();

          const formatETA = (seconds: number | null) => {
            if (seconds === null) return 'Estimating remaining time...';
            if (seconds < 60) return `~${seconds}s remaining`;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `~${mins}m ${secs}s remaining`;
          };

          const formatClock = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          };

          return (
            <div 
              className="animate-fade-in" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '65vh', 
                padding: '2rem' 
              }}
            >
              <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '2.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                
                {/* Spinning Neon Glowing Scan radar circle - freezes on paused */}
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem auto' }}>
                  <div 
                    className={progress.status === 'paused' ? '' : 'animate-spin-neon'} 
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: '3px solid transparent',
                      borderTopColor: progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-indigo)',
                      borderRightColor: progress.status === 'paused' ? 'rgba(245, 158, 11, 0.4)' : 'var(--neon-cyan)',
                      borderRadius: '50%',
                      boxShadow: progress.status === 'paused' 
                        ? '0 0 15px rgba(245, 158, 11, 0.15)' 
                        : '0 0 15px rgba(99, 102, 241, 0.25)',
                      transition: 'all 0.5s ease'
                    }} 
                  />
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    color: progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-cyan)'
                  }}>
                    <HardDrive size={36} className={progress.status === 'paused' ? '' : 'animate-pulse'} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                    {progress.status === 'paused' ? 'Scan Paused' : 'Analyzing Storage'}
                  </h3>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '20px',
                    background: progress.status === 'paused' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(45, 212, 191, 0.15)',
                    color: progress.status === 'paused' ? 'var(--neon-amber)' : 'var(--neon-cyan)',
                    transition: 'all 0.3s ease'
                  }}>
                    {progress.status === 'paused' ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
                
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {progress.is_drive_root 
                    ? `Traversing system partition drive...` 
                    : `Traversing directory and mapping folders size...`}
                </p>

                {/* visual premium progress bar */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Catalog Progress</span>
                    <strong style={{ color: 'var(--neon-cyan)', fontSize: '0.95rem' }}>{scanPercent}%</strong>
                  </div>
                  <div style={{ 
                    height: '10px', 
                    borderRadius: '5px', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    border: '1px solid rgba(255,255,255,0.03)',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${scanPercent}%`,
                      background: progress.status === 'paused'
                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                        : 'linear-gradient(90deg, var(--neon-indigo), var(--neon-cyan))',
                      borderRadius: '5px',
                      boxShadow: progress.status === 'paused'
                        ? '0 0 8px rgba(245, 158, 11, 0.5)'
                        : '0 0 10px rgba(45, 212, 191, 0.4)',
                      transition: 'width 0.4s ease-out, background-color 0.5s'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                    <span>{progress.is_drive_root && progress.drive_used_size ? `Of ${formatBytes(progress.drive_used_size)} Used Disk Capacity` : 'Custom Directory Scope'}</span>
                    <span style={{ fontWeight: 600, color: progress.status === 'paused' ? '#64748b' : 'white' }}>
                      {formatETA(etaSec)}
                    </span>
                  </div>
                </div>

                {/* Progress metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.15rem' }}>
                      Space Discovered
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Database size={16} /> {formatBytes(progress.total_size)}
                    </span>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.15rem' }}>
                      Objects Indexed
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-indigo)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Layers size={16} /> {(progress.scanned_files + progress.scanned_folders).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Live path log */}
                <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem' }}>
                    <span>Currently scanning:</span>
                    <span>
                      Speed: <strong>{progress.status === 'paused' ? '0' : Math.round(fps).toLocaleString()}</strong> items/s 
                      ({progress.status === 'paused' ? '0 Bytes' : formatBytes(bps)}/s)
                    </span>
                  </div>
                  <div 
                    style={{ 
                      background: 'rgba(0, 0, 0, 0.25)', 
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      padding: '0.65rem 0.85rem', 
                      borderRadius: '6px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.8rem',
                      color: '#cbd5e1',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {progress.current_folder}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Elapsed Clock</span>
                    <strong style={{ fontSize: '1.15rem', color: 'white', fontFamily: 'monospace' }}>
                      {formatClock(progress.elapsed_time)}
                    </strong>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setViewState('selector')}
                      style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
                    >
                      Minimize Scan
                    </button>
                    
                    {progress.status === 'scanning' ? (
                      <button 
                        className="btn-secondary" 
                        onClick={handlePauseScan}
                        style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                      >
                        <Pause size={14} style={{ color: 'var(--neon-amber)' }} /> Pause Scan
                      </button>
                    ) : (
                      <button 
                        className="btn-primary" 
                        onClick={handleResumeScan}
                        style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(45, 212, 191, 0.1)', borderColor: 'var(--neon-cyan)' }}
                      >
                        <Play size={14} style={{ color: 'var(--neon-cyan)' }} /> Resume Scan
                      </button>
                    )}

                    <button 
                      className="btn-danger" 
                      onClick={handleCancelScan}
                      style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
                    >
                      Abort Scan
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* View 3: Complete Results Summary Dashboard */}
        {viewState === 'dashboard' && summary && (
          <Dashboard
            summary={summary}
            activeNode={activeNode}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
            currentPath={currentPath}
            rootPath={rootPath}
            onScanNew={() => setViewState('selector')}
            scanId={scanId || ''}
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
                onClick={() => setViewState('scanning')} 
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
