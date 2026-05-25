import React from 'react';
import { ChevronRight, Folder, Home } from 'lucide-react';

interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  rootPath?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPath, onNavigate, rootPath }) => {
  const isWindows = currentPath.includes('\\') || currentPath.includes(':');
  const separator = isWindows ? '\\' : '/';

  const crumbs = React.useMemo(() => {
    if (currentPath === 'All System Drives') return [];
    
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    const result = [];
    let cumulative = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // On Windows, the first item is the drive letter (e.g. C:)
      if (i === 0 && isWindows && part.includes(':')) {
        cumulative = part + separator;
      } else {
        if (!cumulative) {
          cumulative = part;
        } else {
          // Add separator if cumulative doesn't already end with it
          const needsSeparator = !cumulative.endsWith(separator);
          cumulative = cumulative + (needsSeparator ? separator : '') + part;
        }
      }

      result.push({
        name: part,
        path: cumulative
      });
    }

    if (result.length === 0 && currentPath) {
      result.push({
        name: currentPath,
        path: currentPath
      });
    }

    return result;
  }, [currentPath, isWindows, separator]);

  return (
    <div 
      className="glass-panel" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.4rem', 
        padding: '0.65rem 1rem', 
        fontSize: '0.85rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        width: '100%'
      }}
    >
      <div 
        onClick={() => {
          if (rootPath === 'All System Drives') {
            onNavigate('All System Drives');
          } else if (crumbs.length > 0) {
            onNavigate(crumbs[0].path);
          }
        }}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.35rem', 
          color: 'var(--text-muted)', 
          cursor: (crumbs.length > 1 || rootPath === 'All System Drives') ? 'pointer' : 'default',
          flexShrink: 0
        }}
        onMouseEnter={(e) => (crumbs.length > 1 || rootPath === 'All System Drives') && (e.currentTarget.style.color = 'var(--neon-cyan)')}
        onMouseLeave={(e) => (crumbs.length > 1 || rootPath === 'All System Drives') && (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <Home size={14} />
        <span>{rootPath === 'All System Drives' ? 'All System Drives' : 'Root'}</span>
      </div>

      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <React.Fragment key={`${crumb.path}-${idx}`}>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.6, flexShrink: 0 }} />
            <div 
              onClick={() => !isLast && onNavigate(crumb.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: isLast ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: isLast ? 700 : 500,
                cursor: isLast ? 'default' : 'pointer',
                flexShrink: 0
              }}
              onMouseEnter={(e) => !isLast && (e.currentTarget.style.color = 'var(--neon-indigo)')}
              onMouseLeave={(e) => !isLast && (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Folder size={14} style={{ color: isLast ? 'var(--neon-cyan)' : '#64748b' }} />
              <span>{crumb.name}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
