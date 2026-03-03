'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

interface MemoryEntry {
  id: string;
  content: string;
  type: string;
  similarity: number;
  metadata?: any;
  created_at?: string;
}

export default function MemoryInsightsPanel({ projectId }: { projectId?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/memory/search', { params: { q: query, projectId, limit: 8 } });
      setResults(data.data || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const TYPE_COLORS: Record<string, string> = {
    architectural_decision: '#6366f1',
    bug_pattern: '#ef4444',
    code_pattern: '#06b6d4',
    key_lesson: '#10b981',
    session_summary: '#f59e0b',
    developer_insight: '#8b5cf6',
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🧠</span>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Memory Insights</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>Semantic search over agent memory</span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <input id="memory-search-input" className="input" placeholder="Search memory: architectural decisions, bug patterns, code patterns..." value={query}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} style={{ flex: 1 }} />
        <button id="memory-search-btn" onClick={search} disabled={loading} className="btn btn-primary" style={{ padding: '10px 20px', flexShrink: 0 }}>
          {loading ? '⏳' : '🔍 Search'}
        </button>
      </div>

      <AnimatePresence>
        {results.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🧠</div>
            <p>Search your agent&apos;s accumulated knowledge and memory</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map((entry, i) => (
            <motion.div key={entry.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: `1px solid ${(TYPE_COLORS[entry.type] || '#818cf8')}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: TYPE_COLORS[entry.type] || '#818cf8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {entry.type?.replace(/_/g, ' ')}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {(entry.similarity * 100).toFixed(0)}% match
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content, null, 2)}
              </p>
              {entry.created_at && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
