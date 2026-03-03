'use client';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';

const AGENT_CARDS = [
  { icon: '📋', name: 'Requirement Agent', model: 'Claude 3.5', desc: 'Structures natural language into specs', color: '#6366f1' },
  { icon: '🏛️', name: 'Architecture Agent', model: 'GPT-4o', desc: 'Designs scalable systems & APIs', color: '#8b5cf6' },
  { icon: '⚡', name: 'Code Gen Agent', model: 'GPT-4o', desc: 'Generates production-ready MERN code', color: '#06b6d4' },
  { icon: '🐛', name: 'Debug Agent', model: 'GPT-4o', desc: 'Root-cause analysis & auto-fixes', color: '#f59e0b' },
  { icon: '🧪', name: 'Testing Agent', model: 'GPT-4o', desc: 'Jest/Supertest unit & integration tests', color: '#10b981' },
  { icon: '⚖️', name: 'Critique Agent', model: 'GPT-4o', desc: 'Multi-agent Critic↔Defender debate', color: '#ef4444' },
  { icon: '📝', name: 'Doc Agent', model: 'Claude 3.5', desc: 'README, API docs & onboarding guides', color: '#a78bfa' },
  { icon: '🧠', name: 'Memory Agent', model: 'Ollama/Gemini', desc: 'Distills insights to vector store', color: '#fb923c' },
];

const STAT_CARDS = [
  { label: 'Total Agents', value: '8', icon: '🤖', color: 'var(--accent-primary)' },
  { label: 'AI Providers', value: '4', icon: '⚡', color: 'var(--accent-secondary)' },
  { label: 'Refactor Loop', value: '3x', icon: '🔄', color: 'var(--accent-tertiary)' },
  { label: 'Memory Store', value: 'pgVector', icon: '🧠', color: 'var(--accent-success)' },
];

export default function DashboardHome() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          <span className="gradient-text">Agents Unleashed</span> 🚀
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Your autonomous multi-agent developer platform. 8 specialized AI agents working in a continuous improvement loop.
        </p>
      </motion.div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {STAT_CARDS.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Workflow diagram */}
      <div className="card">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🔄 Continuous Improvement Loop</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {['Requirements', 'Architecture', 'Code Gen', 'Debug', 'Testing', 'Critique', '< 7 → Refactor', 'Docs', 'Memory'].map((step, i, arr) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                background: step.includes('Refactor') ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)',
                color: step.includes('Refactor') ? '#ef4444' : 'var(--text-accent)',
                border: `1px solid ${step.includes('Refactor') ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)'}`,
              }}>{step}</div>
              {i < arr.length - 1 && <span style={{ color: 'var(--text-muted)', margin: '0 4px', fontSize: 16 }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Agent Cards */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🤖 Specialized Agents</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {AGENT_CARDS.map((agent, i) => (
            <motion.div key={agent.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ padding: '20px', borderRadius: 14, background: 'var(--bg-elevated)', border: `1px solid ${agent.color}22`, transition: 'all 0.2s', cursor: 'default' }}
              whileHover={{ borderColor: agent.color + '44', boxShadow: `0 4px 20px ${agent.color}15` }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{agent.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{agent.name}</div>
              <div style={{ fontSize: 11, color: agent.color, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>{agent.model}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{agent.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Ready to build something amazing?</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Head to Agent Workspace and describe your project. The agents will take care of the rest.</p>
        </div>
        <Link to="/dashboard/workspace" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Launch Workspace →</Link>
      </motion.div>
    </div>
  );
}
