'use client';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAgentStore } from '../../store/useAgentStore';

const AGENT_COLORS: Record<string, string> = {
  RequirementAgent: '#6366f1', ArchitectureAgent: '#8b5cf6', CodeGenAgent: '#06b6d4',
  DebugAgent: '#f59e0b', TestingAgent: '#10b981', CritiqueAgent: '#ef4444',
  DocumentationAgent: '#a78bfa', MemoryAgent: '#fb923c', System: '#94a3b8',
  requirement: '#6366f1', architecture: '#8b5cf6', codegen: '#06b6d4',
  debug: '#f59e0b', testing: '#10b981', critique: '#ef4444',
  documentation: '#a78bfa', memory: '#fb923c',
};

const AGENT_ICONS: Record<string, string> = {
  RequirementAgent: '📋', ArchitectureAgent: '🏛️', CodeGenAgent: '⚡',
  DebugAgent: '🐛', TestingAgent: '🧪', CritiqueAgent: '⚖️',
  DocumentationAgent: '📝', MemoryAgent: '🧠', System: '🤖',
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  RequirementAgent: 'Analyzed and structured project requirements',
  ArchitectureAgent: 'Designed the system architecture',
  CodeGenAgent: 'Generated production-ready code',
  DebugAgent: 'Reviewed code for bugs and security issues',
  TestingAgent: 'Generated test suites and test cases',
  CritiqueAgent: 'Evaluated quality via multi-agent debate',
  DocumentationAgent: 'Produced project documentation',
  MemoryAgent: 'Extracted and stored session insights',
  System: 'System event',
};

/* ── Collapsible code block ─────────────────────────────────────────── */
function CodeBlock({ file, defaultOpen }: { file: any; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={{ border: '1px solid var(--bg-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', textAlign: 'left', padding: '8px 12px', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, borderBottom: open ? '1px solid var(--bg-border)' : 'none',
      }}>
        <span style={{ fontSize: 12, color: 'var(--accent-primary)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
        <code style={{ fontSize: 11, color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>{file.path || file.filename}</code>
        <span className="badge badge-idle" style={{ fontSize: 9, marginLeft: 'auto', padding: '1px 6px' }}>{file.language}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ maxHeight: 350, overflow: 'auto' }}>
              <SyntaxHighlighter
                language={file.language || 'javascript'}
                style={vscDarkPlus}
                customStyle={{ margin: 0, background: '#0d1117', fontSize: 11, lineHeight: 1.6, borderRadius: 0 }}
                showLineNumbers
                lineNumberStyle={{ color: '#3b4048', minWidth: '2.5em' }}
              >
                {file.content || '// No content'}
              </SyntaxHighlighter>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── JSON/Architecture detail block ─────────────────────────────────── */
function DetailBlock({ title, icon, data }: { title: string; icon: string; data: any }) {
  const [open, setOpen] = useState(false);
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <div style={{ border: '1px solid var(--bg-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', textAlign: 'left', padding: '8px 12px', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, borderBottom: open ? '1px solid var(--bg-border)' : 'none',
      }}>
        <span style={{ fontSize: 12, color: 'var(--accent-primary)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ maxHeight: 300, overflow: 'auto', padding: 12, background: '#0d1117', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Document preview ───────────────────────────────────────────────── */
function DocBlock({ filename, content }: { filename: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--bg-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', textAlign: 'left', padding: '8px 12px', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, borderBottom: open ? '1px solid var(--bg-border)' : 'none',
      }}>
        <span style={{ fontSize: 12, color: 'var(--accent-primary)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
        <span style={{ fontSize: 12 }}>📄</span>
        <code style={{ fontSize: 11, color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>{filename}</code>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ maxHeight: 400, overflow: 'auto', padding: 16, background: '#0d1117', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'var(--font-mono)' }}>
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Agent output section — shows results specific to each agent ──── */
function AgentOutputSection({ agent }: { agent: string }) {
  const { codeFiles, documentation, architecture, debugOutput, tests } = useAgentStore();

  if (agent === 'ArchitectureAgent' && architecture && Object.keys(architecture).length > 0) {
    return (
      <div style={{ padding: '0 16px 12px', marginTop: -4 }}>
        <DetailBlock title="System Architecture" icon="🏛️" data={architecture} />
      </div>
    );
  }

  if (agent === 'CodeGenAgent' && codeFiles && codeFiles.length > 0) {
    return (
      <div style={{ padding: '0 16px 12px', marginTop: -4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Generated Files ({codeFiles.length})
        </div>
        {codeFiles.map((file, i) => (
          <CodeBlock key={i} file={file} defaultOpen={i === 0} />
        ))}
      </div>
    );
  }

  if (agent === 'DebugAgent' && debugOutput && Object.keys(debugOutput).length > 0) {
    return (
      <div style={{ padding: '0 16px 12px', marginTop: -4 }}>
        <DetailBlock title="Debug Analysis" icon="🐛" data={debugOutput} />
      </div>
    );
  }

  if (agent === 'TestingAgent' && tests && tests.length > 0) {
    return (
      <div style={{ padding: '0 16px 12px', marginTop: -4 }}>
        <DetailBlock title={`Test Cases (${tests.length})`} icon="🧪" data={tests} />
      </div>
    );
  }

  if (agent === 'DocumentationAgent' && documentation && Object.keys(documentation).length > 0) {
    return (
      <div style={{ padding: '0 16px 12px', marginTop: -4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Documentation ({Object.keys(documentation).length} files)
        </div>
        {Object.entries(documentation).map(([filename, content]) => (
          <DocBlock key={filename} filename={filename} content={content as string} />
        ))}
      </div>
    );
  }

  return null;
}

/* ── Main Unified Feed ──────────────────────────────────────────────── */
export default function UnifiedAgentFeed() {
  const { messages, status, currentPhase, critiqueScore, codeFiles, documentation, architecture, tests } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, codeFiles, documentation]);

  const color = (agent: string) => AGENT_COLORS[agent] || '#818cf8';

  if (!messages) return null;

  // Group consecutive messages by agent
  const groupedMessages: { agent: string; messages: typeof messages; index: number }[] = [];
  messages.forEach((msg, i) => {
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.agent === msg.agent) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ agent: msg.agent, messages: [msg], index: i });
    }
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Agent Pipeline Output</span>
          <span className={`badge ${status === 'running' ? 'badge-info' : status === 'completed' ? 'badge-success' : status === 'failed' ? 'badge-error' : 'badge-idle'}`}>
            {status === 'running' && <span className="animate-spin" style={{ display: 'inline-block', width: 7, height: 7, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', marginRight: 5 }} />}
            {status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {currentPhase && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>→ {currentPhase}</span>}
          {critiqueScore !== null && (
            <span className={`badge ${critiqueScore >= 7 ? 'badge-success' : 'badge-warning'}`}>{critiqueScore}/10</span>
          )}
        </div>
      </div>

      {/* Unified feed */}
      <div style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 400, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Run agents to see live activity here</p>
            <p style={{ fontSize: 12 }}>Each agent&apos;s output — code, architecture, docs — will appear inline below</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {groupedMessages.map((group) => (
            <motion.div key={`${group.agent}-${group.index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              style={{ borderRadius: 12, border: `1px solid ${color(group.agent)}20`, background: `${color(group.agent)}06`, overflow: 'hidden' }}>
              
              {/* Agent header */}
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${color(group.agent)}15` }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: `${color(group.agent)}18`, border: `1px solid ${color(group.agent)}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
                }}>
                  {AGENT_ICONS[group.agent] || '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: color(group.agent) }}>{group.agent}</span>
                    {group.messages[0]?.action && (
                      <span className="badge badge-idle" style={{ fontSize: 9, padding: '1px 6px' }}>{group.messages[0].action}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {AGENT_DESCRIPTIONS[group.agent] || 'Agent output'}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {new Date(group.messages[0].timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Agent messages */}
              <div style={{ padding: '10px 16px 12px' }}>
                {group.messages.map((msg, mi) => (
                  <div key={mi} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, wordBreak: 'break-word', padding: '4px 0' }}>
                    {msg.content}
                  </div>
                ))}
              </div>

              {/* Inline output for this agent */}
              <AgentOutputSection agent={group.agent} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Summary section after completion */}
        {status === 'completed' && (codeFiles?.length > 0 || Object.keys(documentation || {}).length > 0) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{
            borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.06)', padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#10b981' }}>Pipeline Complete</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>{codeFiles?.length || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Code Files</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-secondary)' }}>{Object.keys(documentation || {}).length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Doc Files</div>
              </div>
              {critiqueScore !== null && (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: critiqueScore >= 7 ? '#10b981' : '#f59e0b' }}>{critiqueScore}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Quality Score</div>
                </div>
              )}
              <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-secondary)' }}>{messages.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Agent Steps</div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
