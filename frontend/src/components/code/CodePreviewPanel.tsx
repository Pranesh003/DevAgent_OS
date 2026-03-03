import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAgentStore } from '../../store/useAgentStore';

export default function CodePreviewPanel() {
  const { codeFiles, selectedFile } = useAgentStore();

  if (!selectedFile && (!codeFiles || codeFiles.length === 0)) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💻</div>
        <p style={{ fontSize: 14 }}>Click any agent module to view its detailed output here.</p>
      </div>
    );
  }

  // If no specific file is selected but we have code files, default to the first one
  const fileToDisplay: any = selectedFile || codeFiles[0];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', height: 480 }}>
        {/* Code viewer */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* File header */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>{fileToDisplay.type === 'code' ? '📄' : fileToDisplay.type === 'documentation' ? '📝' : fileToDisplay.type === 'architecture' ? '🏛️' : fileToDisplay.type === 'testing' ? '🧪' : '🐛'}</span>
            <code style={{ fontSize: 12, color: 'var(--accent-tertiary)' }}>{fileToDisplay.path || fileToDisplay.filename || 'Output'}</code>
            <span className="badge badge-idle" style={{ fontSize: 10, marginLeft: 'auto' }}>
              {fileToDisplay.type === 'code' ? fileToDisplay.language : fileToDisplay.type === 'documentation' ? 'markdown' : 'json'}
            </span>
          </div>
          {/* Syntax highlighted content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <SyntaxHighlighter
              language={fileToDisplay.language || (fileToDisplay.type === 'architecture' || fileToDisplay.type === 'debug' || fileToDisplay.type === 'testing' ? 'json' : 'markdown')}
              style={vscDarkPlus}
              customStyle={{ margin: 0, background: 'var(--bg-base)', fontSize: 12, lineHeight: 1.7, minHeight: '100%', borderRadius: 0 }}
              showLineNumbers
              lineNumberStyle={{ color: 'var(--text-muted)', minWidth: '2.5em' }}
            >
              {fileToDisplay.content || '// No content generated yet'}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </div>
  );
}
