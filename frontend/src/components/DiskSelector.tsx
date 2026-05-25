import React, { useEffect, useState } from 'react';
import { HardDrive, FolderOpen, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, Database, Layers } from 'lucide-react';
import { Drive } from '../types';

// Dynamically resolve API base: local relative paths if served locally, fallback to local port 8000 if hosted remotely
export const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
  ? '' 
  : 'http://localhost:8000';

interface DiskSelectorProps {
  onStartScan: (path: string, skipHidden: boolean, skipPackages: boolean, skipCode: boolean) => void;
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const DiskSelector: React.FC<DiskSelectorProps> = ({ onStartScan }) => {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState<string>('');
  const [skipHidden, setSkipHidden] = useState<boolean>(false);
  const [skipPackages, setSkipPackages] = useState<boolean>(false);
  const [skipCode, setSkipCode] = useState<boolean>(false);
  const [browsing, setBrowsing] = useState<boolean>(false);

  const fetchDrives = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/drives`);
      if (!res.ok) {
        throw new Error('Failed to retrieve system drives');
      }
      const data = await res.json();
      setDrives(data);

      // Check administrative privileges
      const adminRes = await fetch(`${API_BASE}/api/check-admin`);
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        setIsAdmin(adminData.is_admin);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching drives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim()) {
      onStartScan(customPath.trim(), skipHidden, skipPackages, skipCode);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 800 }}>
          Select a Drive to <span style={{ background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-indigo))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analyze</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
          Nova scans your local storage directories and identifies large folders and files wasting space.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem' }}>
          <RefreshCw className="animate-spin-neon" size={40} style={{ color: 'var(--neon-indigo)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Detecting local system drives...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'rgba(244, 63, 94, 0.25)', marginBottom: '2rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--neon-rose)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Failed to Load Drives</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          
          {window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: '1.25rem',
              maxWidth: '650px',
              margin: '0 auto 1.5rem auto',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: 'var(--neon-amber)', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                🌐 GitHub Pages Security Block detected
              </strong>
              <p style={{ marginBottom: '0.75rem' }}>
                Browsers block secure HTTPS sites (like GitHub Pages) from making insecure local calls (like <code style={{ color: 'var(--neon-cyan)' }}>http://localhost:8000</code>) due to <strong>Mixed Content Security constraints</strong>.
              </p>
              <span style={{ fontWeight: 700, display: 'block', marginBottom: '0.35rem', color: 'white' }}>Quick Solutions:</span>
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>
                  <strong>Option A (Easiest):</strong> Run Nova locally in your terminal using <code style={{ color: 'var(--neon-indigo)' }}>python run.py</code>. It loads the app on a single unified local host, avoiding all browser security blocks entirely!
                </li>
                <li>
                  <strong>Option B:</strong> Click the site lock/settings icon in your browser URL address bar, open <strong>Site Settings</strong>, find <strong>Insecure Content</strong>, and change it to <strong>Allow</strong>. Then reload this page!
                </li>
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={fetchDrives}>
              <RefreshCw size={16} /> Try Again
            </button>
            {window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
              <button 
                className="btn-primary" 
                onClick={() => {
                  setError(null);
                }}
                style={{ background: 'linear-gradient(135deg, var(--neon-indigo), var(--neon-cyan))' }}
              >
                Scan Manually &rarr;
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Administrator / User privilege status banner */}
          {isAdmin ? (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '0.85rem 1.25rem', 
                borderColor: 'rgba(45, 212, 191, 0.25)', 
                background: 'rgba(45, 212, 191, 0.05)', 
                borderRadius: '10px', 
                marginBottom: '2rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center' }}>
                <CheckCircle2 size={16} />
              </div>
              <div>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, marginRight: '0.4rem' }}>
                  Administrator Mode Elevated:
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Nova is running with elevated read privileges and can index 100% of your disk drives without permission blocks.
                </span>
              </div>
            </div>
          ) : (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '0.85rem 1.25rem', 
                borderColor: 'rgba(245, 158, 11, 0.25)', 
                background: 'rgba(245, 158, 11, 0.05)', 
                borderRadius: '10px', 
                marginBottom: '2rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ color: 'var(--neon-amber)', display: 'flex', alignItems: 'center' }}>
                <ShieldAlert size={16} />
              </div>
              <div>
                <span style={{ color: 'var(--neon-amber)', fontWeight: 700, marginRight: '0.4rem' }}>
                  Standard Privilege Mode:
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  System-protected folders or lockfiles may be skipped. Right-click your terminal and select <strong>"Run as Administrator"</strong> before launching <code>python run.py</code> to avoid permission warnings.
                </span>
              </div>
            </div>
          )}

          {/* Scan Settings & Skip Optimizations */}
          <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem 1.5rem', borderRadius: '12px', marginBottom: '2rem', background: 'var(--hud-bg)', borderColor: 'var(--hud-border)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              <Layers size={16} style={{ color: 'var(--neon-cyan)' }} /> Scan Settings & Speed Options
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={skipHidden} 
                  onChange={(e) => setSkipHidden(e.target.checked)}
                  style={{ accentColor: 'var(--neon-cyan)', width: '16px', height: '16px' }}
                />
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Skip Hidden Folders</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Do not traverse .git, .vscode, etc.</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={skipPackages} 
                  onChange={(e) => setSkipPackages(e.target.checked)}
                  style={{ accentColor: 'var(--neon-cyan)', width: '16px', height: '16px' }}
                />
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Skip Heavy Dependency Folders</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Do not index node_modules, venv, env</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={skipCode} 
                  onChange={(e) => setSkipCode(e.target.checked)}
                  style={{ accentColor: 'var(--neon-cyan)', width: '16px', height: '16px' }}
                />
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Skip Source Code Files</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ignore .js, .py, .cpp, .ts files</span>
                </div>
              </label>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Virtual System-Wide Concurrent Drives Card */}
            <div 
              className="glass-panel animate-pulse-neon" 
              onClick={() => onStartScan('ALL_SYSTEM_DRIVES', skipHidden, skipPackages, skipCode)}
              style={{ 
                padding: '1.5rem', 
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--neon-cyan)',
                background: 'var(--card-inner-bg)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 0 10px rgba(45, 212, 191, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ 
                      padding: '0.65rem', 
                      borderRadius: '10px', 
                      background: 'rgba(45, 212, 191, 0.1)', 
                      color: 'var(--neon-cyan)'
                    }}>
                      <Database size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>All Local Drives</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full System Scan</p>
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '20px',
                    background: 'rgba(45, 212, 191, 0.15)',
                    color: 'var(--neon-cyan)'
                  }}>
                    Unified Analytics
                  </span>
                </div>

                <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Traverses all detected partition drives concurrently and aggregates storage diagnostics under one virtual root.
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                fontSize: '0.85rem', 
                fontWeight: 600,
                color: 'var(--neon-cyan)',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.03)'
              }}>
                <span>Scan All Drives</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {drives.map((drive) => {
              const freeSpace = drive.total - drive.used;
              const isWarning = drive.percent > 90;
              return (
                <div 
                  key={drive.device} 
                  className="glass-panel" 
                  onClick={() => onStartScan(drive.mountpoint, skipHidden, skipPackages, skipCode)}
                  style={{ 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ 
                        padding: '0.65rem', 
                        borderRadius: '10px', 
                        background: 'rgba(99, 102, 241, 0.1)', 
                        color: isWarning ? 'var(--neon-rose)' : 'var(--neon-indigo)' 
                      }}>
                        <HardDrive size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.15rem' }}>{drive.device}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Format: {drive.fstype}</p>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '20px',
                      background: isWarning ? 'rgba(244, 63, 94, 0.15)' : 'rgba(45, 212, 191, 0.15)',
                      color: isWarning ? 'var(--neon-rose)' : 'var(--neon-cyan)'
                    }}>
                      {drive.percent}% Used
                    </span>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      height: '8px', 
                      borderRadius: '4px', 
                      background: 'var(--bar-bg)', 
                      overflow: 'hidden',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${drive.percent}%`,
                        background: isWarning 
                          ? 'linear-gradient(90deg, #f43f5e, #e11d48)' 
                          : 'linear-gradient(90deg, var(--neon-indigo), var(--neon-cyan))',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>{formatBytes(drive.used)} used</span>
                      <span>{formatBytes(freeSpace)} free</span>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    color: 'var(--neon-cyan)',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-light)'
                  }}>
                    <span>Scan Drive</span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-panel" style={{ padding: '2rem', marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <FolderOpen size={22} style={{ color: 'var(--neon-cyan)' }} />
              <h3 style={{ fontSize: '1.25rem' }}>Scan a Specific Directory</h3>
            </div>
            
            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="e.g. C:\Users\YourName\Documents" 
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '280px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: 'var(--input-color)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'var(--transition-smooth)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--neon-indigo)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
              />
              <button 
                type="button" 
                className="btn-secondary"
                disabled={browsing}
                onClick={async () => {
                  setBrowsing(true);
                  try {
                    const res = await fetch(`${API_BASE}/api/select-folder`, { method: 'POST' });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.success && data.path) {
                         setCustomPath(data.path);
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
                <FolderOpen size={16} /> {browsing ? 'Selecting...' : 'Select Folder'}
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!customPath.trim()}
                style={{ opacity: customPath.trim() ? 1 : 0.6 }}
              >
                Start Custom Scan <ArrowRight size={16} />
              </button>
            </form>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem' }}>
              Enter any absolute path on your system. Note: scanning highly protected system directories might trigger permission warnings.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
