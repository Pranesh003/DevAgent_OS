'use client';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function SignupPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/signup', {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <motion.div animate={{ x: [0, 60, 0], y: [0, -40, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '5%', right: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <motion.div animate={{ x: [0, -30, 0], y: [0, 50, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{ position: 'absolute', bottom: '5%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, borderRadius: 24, padding: '48px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'var(--gradient-primary)', marginBottom: 16, boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
            <span style={{ fontSize: 24 }}>⚡</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }} className="gradient-text">Get Started Free</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Deploy your first AI agent in minutes</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { id: 'signup-username', label: 'Username', type: 'text', key: 'username', placeholder: 'devhero' },
            { id: 'signup-email', label: 'Email', type: 'email', key: 'email', placeholder: 'you@company.com' },
            { id: 'signup-password', label: 'Password', type: 'password', key: 'password', placeholder: '••••••••' },
            { id: 'signup-confirm', label: 'Confirm Password', type: 'password', key: 'confirmPassword', placeholder: '••••••••' },
          ].map(({ id, label, type, key, placeholder }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</label>
              <input id={id} type={type} className="input" placeholder={placeholder}
                value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
            </div>
          ))}
          <motion.button id="signup-submit" type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 8 }}>
            {loading ? <span className="animate-spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : '🚀 Create Account'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in →</Link>
        </p>
      </motion.div>
    </div>
  );
}
