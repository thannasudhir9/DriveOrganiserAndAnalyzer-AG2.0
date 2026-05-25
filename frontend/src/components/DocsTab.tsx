import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, FileCode, CheckSquare, Calendar, ChevronRight, ExternalLink, ShieldAlert } from 'lucide-react';
import { API_BASE } from './DiskSelector';

interface DocItem {
  key: string;
  name: string;
  desc: string;
  icon: any;
}

const DOCUMENTS: DocItem[] = [
  { key: 'readme', name: 'README.md', desc: 'Project overview & startup guide', icon: FileText },
  { key: 'implementation_plan', name: 'implementation_plan.md', desc: 'Architectural blueprints & design tokens', icon: FileCode },
  { key: 'task', name: 'task.md', desc: 'Checklist checklist tracker', icon: CheckSquare },
  { key: 'walkthrough', name: 'walkthrough.md', desc: 'Features completion summary', icon: FileText },
  { key: 'prompts_log', name: 'prompts_log.md', desc: 'Conversation timeline prompts history', icon: Calendar },
];

export const DocsTab: React.FC = () => {
  const [activeDocKey, setActiveDocKey] = useState<string>('readme');
  const [content, setContent] = useState<string>('');
  const [lastModified, setLastModified] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoc = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/docs?file=${key}`);
      if (!res.ok) {
        throw new Error('Failed to retrieve project documentation');
      }
      const data = await res.json();
      setContent(data.content);
      setLastModified(data.last_modified);
    } catch (err: any) {
      setError(err.message || 'Failed to load document.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc(activeDocKey);
  }, [activeDocKey]);

  // Lightweight custom markdown renderer for beautiful custom glassmorphic styled outputs
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    let insideCodeBlock = false;
    let codeContent: string[] = [];

    const elements: React.ReactNode[] = [];

    const parseInlineStyles = (line: string): React.ReactNode => {
      // Basic inline code replacement `code`
      // Bold replacement **text**
      // Simple regex parser
      let parts: React.ReactNode[] = [];
      let temp = line;

      // Handle bold and inline code by character splitting
      // For simplicity, handle standard markdown matching
      // If no special characters, return line text
      if (!temp.includes('**') && !temp.includes('`')) {
        return <span>{temp}</span>;
      }

      // Quick inline parser
      let i = 0;
      let buffer = '';
      while (i < temp.length) {
        if (temp.substring(i, i + 2) === '**') {
          if (buffer) {
            parts.push(<span key={i + '-text'}>{buffer}</span>);
            buffer = '';
          }
          let boldEnd = temp.indexOf('**', i + 2);
          if (boldEnd !== -1) {
            parts.push(<strong key={i + '-bold'} style={{ color: 'white', fontWeight: 700 }}>{temp.substring(i + 2, boldEnd)}</strong>);
            i = boldEnd + 2;
            continue;
          }
        }
        
        if (temp[i] === '`') {
          if (buffer) {
            parts.push(<span key={i + '-text'}>{buffer}</span>);
            buffer = '';
          }
          let codeEnd = temp.indexOf('`', i + 1);
          if (codeEnd !== -1) {
            parts.push(
              <code 
                key={i + '-code'} 
                style={{ 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.04)',
                  padding: '0.15rem 0.35rem', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem',
                  color: 'var(--neon-cyan)',
                  fontFamily: 'monospace' 
                }}
              >
                {temp.substring(i + 1, codeEnd)}
              </code>
            );
            i = codeEnd + 1;
            continue;
          }
        }

        buffer += temp[i];
        i++;
      }
      if (buffer) {
        parts.push(<span key={i + '-text'}>{buffer}</span>);
      }

      return <>{parts}</>;
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // Code Block Delimiters
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          // Close block
          elements.push(
            <pre 
              key={`code-${idx}`} 
              style={{ 
                background: 'var(--card-inner-bg)', 
                border: '1px solid var(--card-inner-border)', 
                padding: '1rem', 
                borderRadius: '8px', 
                overflowX: 'auto',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                margin: '1rem 0'
              }}
            >
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          insideCodeBlock = false;
        } else {
          // Open block
          insideCodeBlock = true;
        }
        continue;
      }

      // If inside code block, accumulate lines
      if (insideCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 
            key={idx} 
            style={{ 
              fontSize: '1.8rem', 
              fontWeight: 800, 
              borderBottom: '1px solid rgba(255,255,255,0.08)', 
              paddingBottom: '0.5rem', 
              margin: '2rem 0 1.25rem 0',
              color: 'white'
            }}
          >
            {parseInlineStyles(line.slice(2))}
          </h1>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 
            key={idx} 
            style={{ 
              fontSize: '1.35rem', 
              fontWeight: 700, 
              margin: '1.75rem 0 0.85rem 0',
              color: 'white'
            }}
          >
            {parseInlineStyles(line.slice(3))}
          </h2>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 
            key={idx} 
            style={{ 
              fontSize: '1.1rem', 
              fontWeight: 700, 
              margin: '1.25rem 0 0.75rem 0',
              color: 'white'
            }}
          >
            {parseInlineStyles(line.slice(4))}
          </h3>
        );
        continue;
      }

      // Blockquotes / Alerts
      if (line.startsWith('> ')) {
        elements.push(
          <div 
            key={idx} 
            style={{ 
              padding: '0.85rem 1.25rem', 
              background: 'rgba(99, 102, 241, 0.03)', 
              borderLeft: '4px solid var(--neon-indigo)', 
              borderRadius: '0 8px 8px 0', 
              margin: '1rem 0',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}
          >
            {parseInlineStyles(line.slice(2))}
          </div>
        );
        continue;
      }

      // Bullets list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li 
            key={idx} 
            style={{ 
              marginLeft: '1.5rem', 
              marginBottom: '0.35rem', 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)' 
            }}
          >
            {parseInlineStyles(line.slice(2))}
          </li>
        );
        continue;
      }

      // Dividers
      if (line.trim() === '---') {
        elements.push(
          <hr 
            key={idx} 
            style={{ 
              border: 'none', 
              borderTop: '1px solid var(--border-light)', 
              margin: '1.5rem 0' 
            }} 
          />
        );
        continue;
      }

      // Empty Lines
      if (!line.trim()) {
        elements.push(<div key={idx} style={{ height: '0.5rem' }} />);
        continue;
      }

      // Standard Paragraph
      elements.push(
        <p 
          key={idx} 
          style={{ 
            fontSize: '0.85rem', 
            lineHeight: 1.6, 
            color: 'var(--text-secondary)', 
            marginBottom: '0.75rem' 
          }}
        >
          {parseInlineStyles(line)}
        </p>
      );
    }

    return <div style={{ display: 'flex', flexDirection: 'column' }}>{elements}</div>;
  };

  return (
    <div className="animate-fade-in responsive-split-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
      
      {/* Sidebar Selector (Left) */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="docs-sidebar-pane">
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nova Documentation</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
            System instructions, checklists, blueprints, and timeline logs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {DOCUMENTS.map((doc) => {
              const isActive = activeDocKey === doc.key;
              const Icon = doc.icon;
              return (
                <div
                  key={doc.key}
                  onClick={() => setActiveDocKey(doc.key)}
                  className="glass-card"
                  style={{
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    borderColor: isActive ? 'var(--neon-indigo)' : 'rgba(255,255,255,0.03)',
                    background: isActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.01)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ color: isActive ? 'var(--neon-indigo)' : '#64748b', flexShrink: 0 }}>
                       <Icon size={18} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {doc.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: isActive ? 'var(--neon-cyan)' : '#475569', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content pane viewer (Right) */}
      <div style={{ gridColumn: 'span 8' }} className="docs-content-pane">
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', minHeight: '520px', maxHeight: '680px' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#64748b' }}>
              <RefreshCw className="animate-spin-neon" size={32} style={{ color: 'var(--neon-indigo)' }} />
              <p style={{ fontSize: '0.85rem' }}>Loading document...</p>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--neon-rose)', textAlign: 'center' }}>
              <ShieldAlert size={48} />
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Failed to Load Document</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Document header info */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingBottom: '0.85rem', 
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <FileText size={14} style={{ color: 'var(--neon-cyan)' }} />
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{DOCUMENTS.find(d => d.key === activeDocKey)?.name}</span>
                </div>
                <div>
                  Last Modified: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{lastModified}</span>
                </div>
              </div>

              {/* Styled markdown view viewport container */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="docs-markdown-viewport">
                {renderMarkdown(content)}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
};
export default DocsTab;
