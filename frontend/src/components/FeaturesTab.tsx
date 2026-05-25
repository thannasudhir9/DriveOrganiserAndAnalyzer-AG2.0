import React from 'react';
import { 
  FolderTree, 
  Sparkles, 
  Pause, 
  Layers, 
  FolderOpen, 
  Activity, 
  FileText, 
  ArrowRight,
  HardDrive
} from 'lucide-react';

interface FeatureItem {
  icon: any;
  title: string;
  badge: string;
  badgeColor: string;
  desc: string;
  details: string[];
}

const APP_FEATURES: FeatureItem[] = [
  {
    icon: FolderTree,
    title: 'WinDirStat SVG Treemap',
    badge: 'Interactive Layout',
    badgeColor: 'var(--neon-cyan)',
    desc: 'Pure React aspect-ratio-optimized squarified treemap representing storage distribution visually.',
    details: [
      'Interactive color-coded extension blocks',
      'Dynamic tooltip sizing and depth drills',
      'Full SVG rendering with layout momentum transitions'
    ]
  },
  {
    icon: Sparkles,
    title: 'Vibrant Dual Themes',
    badge: 'Glassmorphism UI',
    badgeColor: 'var(--neon-indigo)',
    desc: 'Seamlessly shift between deep space dark mode and high-contrast frosted glass light mode.',
    details: [
      'Dynamic border glows and backdrop-filters',
      'Harmonized color tokens (HSL tailored shifts)',
      'Instant fluid theme coordinate toggles'
    ]
  },
  {
    icon: Pause,
    title: 'Zero-Overhead Thread Pauser',
    badge: 'Thread Events',
    badgeColor: 'var(--neon-amber)',
    desc: 'Low-overhead Python thread Event blocks that freeze recursive scanner cycles instantly.',
    details: [
      'Digital elapsed clock suspension',
      'Drift adjusters that halt time progression',
      'Instant wake/sleep multi-threaded controllers'
    ]
  },
  {
    icon: Layers,
    title: 'Non-Blocking Background Scan',
    badge: 'Dual Thread HUD',
    badgeColor: 'var(--neon-rose)',
    desc: 'Minimize full screen scans and navigate other tabs cleanly while scanner works in the background.',
    details: [
      'Click header logo to minimize scans',
      'Pulsating mini floating badge in corner',
      'Single-tap restore scan views, speed monitors'
    ]
  },
  {
    icon: FolderOpen,
    title: 'Secure File Organizer',
    badge: 'Atomic Sorter',
    badgeColor: 'var(--neon-cyan)',
    desc: 'Secure folder sorting engine grouping loose cluttered items into category directories.',
    details: [
      'Simulated dry-run Badge preview',
      'Safe atomic file move system',
      'System lockfile bypass & safety checks'
    ]
  },
  {
    icon: Activity,
    title: 'Space Optimization HUD',
    badge: 'Action Center',
    badgeColor: 'var(--neon-indigo)',
    desc: 'Diagnostic panels suggesting data purge operations to recover gigabytes of storage space.',
    details: [
      'Redundant duplicate candidates summaries',
      'Log files & temporary system cache diagnostics',
      'Inactive developer node_modules folders lists'
    ]
  },
  {
    icon: FileText,
    title: 'Interactive Project Docs',
    badge: 'Markdown Parser',
    badgeColor: 'var(--neon-cyan)',
    desc: 'Lightweight in-app Markdown-to-HTML parser rendering system manuals and checklists.',
    details: [
      'Sidebar selectors for README and checklists',
      'High-contrast code highlights & alerts formatting',
      'Local FastAPI endpoint stream logs access'
    ]
  }
];

export const FeaturesTab: React.FC = () => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title Header */}
      <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Explore Nova <span style={{ background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-indigo))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>App Features</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Nova combines high-performance multi-threaded Python disk traversal with beautiful glassmorphic visual diagnostics. Discover its capabilities below.
        </p>
      </div>

      {/* Grid of Features Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {APP_FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div 
              key={idx} 
              className="glass-panel" 
              style={{ 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                border: '1px solid var(--border-light)',
                background: 'var(--card-inner-bg)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = feat.badgeColor;
                e.currentTarget.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.08), 0 0 12px ${feat.badgeColor}33`;
                e.currentTarget.style.background = 'var(--panel-bg-hover)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = 'var(--card-inner-bg)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Card top details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ 
                  padding: '0.6rem', 
                  borderRadius: '10px', 
                  background: 'var(--btn-secondary-bg)', 
                  border: '1px solid var(--border-light)',
                  color: feat.badgeColor
                }}>
                  <Icon size={22} />
                </div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  padding: '0.2rem 0.55rem', 
                  borderRadius: '20px',
                  background: `${feat.badgeColor}1a`,
                  color: feat.badgeColor,
                  border: `1px solid ${feat.badgeColor}33`
                }}>
                  {feat.badge}
                </span>
              </div>

              {/* Title & Desc */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>{feat.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{feat.desc}</p>
              </div>

              {/* Bullet points list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', flex: 1 }}>
                {feat.details.map((det, dIdx) => (
                  <div key={dIdx} style={{ display: 'flex', alignItems: 'start', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ color: feat.badgeColor, fontSize: '0.9rem', lineHeight: 1, marginTop: '-0.1rem' }}>&bull;</div>
                    <span>{det}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
};
export default FeaturesTab;
