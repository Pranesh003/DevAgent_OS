'use client';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../../store/useAgentStore';

const AGENT_COLORS: Record<string, string> = {
  RequirementAgent: '#6366f1',
  ArchitectureAgent: '#8b5cf6',
  CodeGenAgent: '#06b6d4',
  DebugAgent: '#f59e0b',
  TestingAgent: '#10b981',
  CritiqueAgent: '#ef4444',
  DocumentationAgent: '#a78bfa',
  MemoryAgent: '#fb923c',
  System: '#94a3b8',
  requirement: '#6366f1',
  architecture: '#8b5cf6',
  codegen: '#06b6d4',
  debug: '#f59e0b',
  testing: '#10b981',
  critique: '#ef4444',
  documentation: '#a78bfa',
  memory: '#fb923c',
};

const AGENT_ICONS: Record<string, string> = {
  RequirementAgent: '📋', ArchitectureAgent: '🏛️', CodeGenAgent: '⚡',
  DebugAgent: '🐛', TestingAgent: '🧪', CritiqueAgent: '⚖️',
  DocumentationAgent: '📝', MemoryAgent: '🧠', System: '🤖',
};

export default function AgentActivityFeed() {
  const { messages, status, currentPhase, critiqueScore } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const color = (agent: string) => AGENT_COLORS[agent] || '#818cf8';

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Agent Activity Feed</span>
          <span className={`badge ${status === 'running' ? 'badge-info' : status === 'completed' ? 'badge-success' : 'badge-idle'}`}>
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

      {/* Messages */}
      <div style={{ height: 420, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <p>Run agents to see live activity here</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* Icon */}
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color(msg.agent)}18`, border: `1px solid ${color(msg.agent)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {AGENT_ICONS[msg.agent] || '🤖'}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: color(msg.agent) }}>{msg.agent}</span>
                  {msg.action && <span className="badge badge-idle" style={{ fontSize: 10, padding: '1px 6px' }}>{msg.action}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, wordBreak: 'break-word' }}>{msg.content}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
