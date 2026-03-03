'use client';
import { motion } from 'framer-motion';
import MemoryInsightsPanel from '../../../components/memory/MemoryInsightsPanel';

export default function MemoryPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <motion.div 
        initial={{ opacity: 0, y: -16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          Memory <span className="gradient-text">Insights</span> 🧠
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Explore the collective knowledge and architectural patterns distilled by your agents.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <MemoryInsightsPanel />
      </motion.div>
    </div>
  );
}
