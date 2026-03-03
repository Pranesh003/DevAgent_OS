'use client';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Animated background orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', bottom: '10%', right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass"
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, borderRadius: 24, padding: '48px 40px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'var(--gradient-primary)', marginBottom: 16, boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
            <span style={{ fontSize: 24 }}>🤖</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }} className="gradient-text">Agents Unleashed</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sign in to your developer workspace</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Password</label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <motion.button
            id="login-submit"
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 8 }}
          >
            {loading ? <span className="animate-spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : '🚀 Sign In'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-secondary)' }}>
          No account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Create one free →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
