'use client';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAgentStore } from '../../store/useAgentStore';

export default function CodePreviewPanel() {
  const { codeFiles } = useAgentStore();
  const [selectedFile, setSelectedFile] = useState<number>(0);

  if (!codeFiles || codeFiles.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💻</div>
        <p style={{ fontSize: 14 }}>Generated code files will appear here</p>
      </div>
    );
  }

  const file = codeFiles[selectedFile];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 480 }}>
        {/* File tree */}
        <div style={{ borderRight: '1px solid var(--bg-border)', overflowY: 'auto', padding: '12px 0' }}>
          <div style={{ padding: '0 12px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Files ({codeFiles.length})
          </div>
          {codeFiles.map((f, i) => (
            <button key={i} id={`file-tab-${i}`} onClick={() => setSelectedFile(i)}
              style={{ width: '100%', textAlign: 'left', background: selectedFile === i ? 'rgba(99,102,241,0.12)' : 'transparent', border: 'none', padding: '8px 12px', cursor: 'pointer', borderLeft: selectedFile === i ? '2px solid var(--accent-primary)' : '2px solid transparent', transition: 'all 0.15s' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: selectedFile === i ? 'var(--text-accent)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.filename || f.path?.split('/').pop()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{f.language}</div>
            </button>
          ))}
        </div>

        {/* Code viewer */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* File header */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', flexShrink: 0 }}>
            <code style={{ fontSize: 12, color: 'var(--accent-tertiary)' }}>{file.path}</code>
            <span className="badge badge-idle" style={{ fontSize: 10, marginLeft: 'auto' }}>{file.language}</span>
          </div>
          {/* Syntax highlighted content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <SyntaxHighlighter
              language={file.language || 'javascript'}
              style={vscDarkPlus}
              customStyle={{ margin: 0, background: 'var(--bg-base)', fontSize: 12, lineHeight: 1.7, minHeight: '100%', borderRadius: 0 }}
              showLineNumbers
              lineNumberStyle={{ color: 'var(--text-muted)', minWidth: '2.5em' }}
            >
              {file.content || '// No content generated yet'}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </div>
  );
}
