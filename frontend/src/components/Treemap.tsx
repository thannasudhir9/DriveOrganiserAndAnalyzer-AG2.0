import React, { useMemo, useState } from 'react';
import { File, Folder, ArrowUp } from 'lucide-react';
import { formatBytes } from './DiskSelector';

interface TreemapProps {
  items: { name: string; path: string; size: number; is_dir: boolean }[];
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
  currentPath: string;
  rootPath: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TreemapRenderNode {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  rect: Rect;
  color: string;
}

export const Treemap: React.FC<TreemapProps> = ({ 
  items, 
  onNavigate, 
  onGoBack, 
  currentPath, 
  rootPath 
}) => {
  const [hoveredNode, setHoveredNode] = useState<TreemapRenderNode | null>(null);

  // Set SVG dimensions
  const width = 800;
  const height = 450;

  // Filter out items that are tiny (e.g. 0 bytes) to avoid dividing by zero
  const validItems = useMemo(() => {
    return items
      .filter(item => item.size > 0)
      .sort((a, b) => b.size - a.size)
      .slice(0, 50); // limit to top 50 for performance and rendering clarity
  }, [items]);

  // Color generator based on file extension / item type
  const getNodeColor = (name: string, is_dir: boolean, index: number): string => {
    if (is_dir) {
      // Sleek blues, indigos, purples for directories
      const colors = [
        '#6366f1', // indigo
        '#4f46e5', // dark indigo
        '#8b5cf6', // purple
        '#7c3aed', // dark purple
        '#3b82f6', // blue
        '#2563eb', // dark blue
      ];
      return colors[index % colors.length];
    } else {
      // Cyan, teal, orange, rose for files depending on extension
      const ext = name.split('.').pop()?.toLowerCase();
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
        return '#f59e0b'; // amber/orange for archives
      }
      if (['mp4', 'mkv', 'avi', 'mov', 'mp3', 'wav', 'flac'].includes(ext || '')) {
        return '#ec4899'; // pink/magenta for media
      }
      if (['exe', 'msi', 'sys', 'dll'].includes(ext || '')) {
        return '#f43f5e'; // rose/red for binaries
      }
      if (['py', 'js', 'ts', 'tsx', 'html', 'css', 'go', 'rs'].includes(ext || '')) {
        return '#14b8a6'; // teal for source code
      }
      // Standard files: cyans and slates
      const standardColors = ['#0d9488', '#06b6d4', '#0891b2', '#475569'];
      return standardColors[index % standardColors.length];
    }
  };

  const treemapNodes = useMemo(() => {
    if (validItems.length === 0) return [];

    const divideRect = (rect: Rect, nodes: typeof validItems): TreemapRenderNode[] => {
      if (nodes.length === 0) return [];
      if (nodes.length === 1) {
        return [{
          name: nodes[0].name,
          path: nodes[0].path,
          size: nodes[0].size,
          is_dir: nodes[0].is_dir,
          rect,
          color: getNodeColor(nodes[0].name, nodes[0].is_dir, 0)
        }];
      }

      // Find optimal split point (near 50/50 size division)
      const total = nodes.reduce((sum, n) => sum + n.size, 0);
      let cumulativeSum = 0;
      let splitIndex = 1;

      for (let i = 0; i < nodes.length; i++) {
        cumulativeSum += nodes[i].size;
        if (cumulativeSum >= total / 2) {
          splitIndex = i + 1;
          break;
        }
      }

      // Constrain split indices
      if (splitIndex >= nodes.length) splitIndex = nodes.length - 1;
      if (splitIndex <= 0) splitIndex = 1;

      const leftPart = nodes.slice(0, splitIndex);
      const rightPart = nodes.slice(splitIndex);

      const leftSum = leftPart.reduce((sum, n) => sum + n.size, 0);
      const leftRatio = leftSum / total;

      let rect1: Rect;
      let rect2: Rect;

      // Split horizontally or vertically depending on which side is longer
      if (rect.w >= rect.h) {
        const w1 = Number((rect.w * leftRatio).toFixed(2));
        rect1 = { x: rect.x, y: rect.y, w: w1, h: rect.h };
        rect2 = { x: Number((rect.x + w1).toFixed(2)), y: rect.y, w: Number((rect.w - w1).toFixed(2)), h: rect.h };
      } else {
        const h1 = Number((rect.h * leftRatio).toFixed(2));
        rect1 = { x: rect.x, y: rect.y, w: rect.w, h: h1 };
        rect2 = { x: rect.x, y: Number((rect.y + h1).toFixed(2)), w: rect.w, h: Number((rect.h - h1).toFixed(2)) };
      }

      // Recursively partition, passing correct indices down for colors
      const leftResults = divideRect(rect1, leftPart);
      const rightResults = divideRect(rect2, rightPart);

      return [...leftResults, ...rightResults];
    };

    // Initial root rectangle
    const rootRect: Rect = { x: 0, y: 0, w: width, h: height };
    
    // Divide and map appropriate index colors
    const results = divideRect(rootRect, validItems);
    return results.map((node, index) => ({
      ...node,
      color: getNodeColor(node.name, node.is_dir, index)
    }));
  }, [validItems]);

  const handleNodeClick = (node: TreemapRenderNode) => {
    if (node.is_dir) {
      onNavigate(node.path);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Visual Space Treemap</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            WinDirStat-style relative sizing. Hover to inspect, click folders to drill down.
          </p>
        </div>
        {onGoBack && currentPath !== rootPath && (
          <button 
            className="btn-secondary" 
            onClick={onGoBack}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowUp size={14} /> Parent Folder
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', padding: '0.5rem', position: 'relative' }}>
        {validItems.length === 0 ? (
          <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            No visualizable contents in this directory.
          </div>
        ) : (
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
          >
            {treemapNodes.map((node, i) => {
              const showText = node.rect.w > 65 && node.rect.h > 24;
              return (
                <g key={`${node.path}-${i}`} onClick={() => handleNodeClick(node)}>
                  <rect
                    x={node.rect.x}
                    y={node.rect.y}
                    width={node.rect.w - 1} // thin border
                    height={node.rect.h - 1}
                    fill={node.color}
                    className="treemap-node"
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      fillOpacity: 0.8,
                      rx: '3px',
                      ry: '3px'
                    }}
                  />
                  {showText && (
                    <text
                      x={node.rect.x + 6}
                      y={node.rect.y + 18}
                      className="treemap-text"
                      fontSize="10px"
                      clipPath="ellipsis"
                    >
                      {node.name.length > Math.floor(node.rect.w / 6) 
                        ? node.name.slice(0, Math.floor(node.rect.w / 6) - 2) + '..' 
                        : node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover details overlay card inside Treemap */}
        {hoveredNode && (
          <div 
            className="animate-fade-in"
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
              background: 'rgba(9, 15, 30, 0.95)',
              border: '1px solid var(--neon-indigo)',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              {hoveredNode.is_dir ? (
                <Folder size={18} style={{ color: 'var(--neon-indigo)', flexShrink: 0 }} />
              ) : (
                <File size={18} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
              )}
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{hoveredNode.name}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem', display: 'block' }}>
                  {hoveredNode.path}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontWeight: 800, color: 'var(--neon-cyan)', fontSize: '0.95rem' }}>
                {formatBytes(hoveredNode.size)}
              </span>
              {hoveredNode.is_dir && (
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>
                  Click to explore
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
