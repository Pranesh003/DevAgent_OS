'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAgentStore } from '../../store/useAgentStore';

const PHASES = [
  'requirement',
  'architecture',
  'codegen',
  'debug',
  'testing',
  'documentation',
  'memory',
  'completed'
];

const AGENT_DISPLAY: Record<string, { color: string, icon: string, label: string }> = {
  RequirementAgent: { color: '#6366f1', icon: '📋', label: 'Analyzing Requirements' },
  ArchitectureAgent: { color: '#8b5cf6', icon: '🏛️', label: 'Planning Architecture' },
  CodeGenAgent: { color: '#06b6d4', icon: '⚡', label: 'Generating Code' },
  DebugAgent: { color: '#f59e0b', icon: '🐛', label: 'Debugging' },
  TestingAgent: { color: '#10b981', icon: '🧪', label: 'Writing Tests' },
  CritiqueAgent: { color: '#ef4444', icon: '⚖️', label: 'Reviewing Quality' },
  DocumentationAgent: { color: '#a78bfa', icon: '📝', label: 'Writing Docs' },
  MemoryAgent: { color: '#fb923c', icon: '🧠', label: 'Saving Memory' },
  System: { color: '#94a3b8', icon: '🤖', label: 'System Processing' },
};

export default function AgentProgressBar() {
  const { status, currentPhase, messages, sessionStartTime } = useAgentStore();
  const [elapsedTime, setElapsedTime] = useState('00:00');

  // Timer logic
  useEffect(() => {
    if (status !== 'running' || !sessionStartTime) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - sessionStartTime) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsedTime(`${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, sessionStartTime]);

  if (status === 'idle') return null;

  // Calculate generic progress based on pipeline phase
  const currentIndex = PHASES.indexOf(currentPhase || 'requirement');
  let progress = 0;
  if (status === 'completed') progress = 100;
  else if (currentIndex >= 0 && PHASES.length > 1) {
    progress = Math.max(5, (currentIndex / (PHASES.length - 1)) * 100);
  }

  // Find the exact active agent from the latest activity feed message
  const lastMessage = messages[messages.length - 1];
  const activeAgent = lastMessage?.agent || 'System';
  const displayData = AGENT_DISPLAY[activeAgent] || AGENT_DISPLAY['System'];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, y: -10 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      className="card" 
      style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden', borderLeft: `4px solid ${displayData.color}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {/* Active Agent Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `${displayData.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20
          }}>
            {displayData.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Current Task
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              {status === 'completed' ? 'Pipeline Complete 🎉' : displayData.label}
              {status === 'running' && (
                <span className="animate-spin" style={{ 
                  display: 'inline-block', width: 14, height: 14, 
                  border: `2px solid ${displayData.color}`, 
                  borderTopColor: 'transparent', borderRadius: '50%' 
                }} />
              )}
            </div>
            {lastMessage?.content && status === 'running' && (
               <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lastMessage.content}
               </div>
            )}
          </div>
        </div>

        {/* Phase & Timer Stats */}
        <div style={{ textAlign: 'right' }}>
           <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                 PHASE: <span style={{ color: 'var(--text-accent)' }}>{currentPhase.toUpperCase() || 'INITIALIZING'}</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                 TIME: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{elapsedTime}</span>
              </span>
           </div>
           <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {Math.round(progress)}% Total Flow
           </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div style={{ height: 6, background: 'var(--bg-elevation-2)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeInOut', duration: 0.5 }}
          style={{ 
            height: '100%', 
            background: status === 'completed' ? 'var(--success-color)' : `linear-gradient(90deg, ${displayData.color}, ${displayData.color}dd)`, 
            borderRadius: 4
          }} 
        />
      </div>
    </motion.div>
  );
}
