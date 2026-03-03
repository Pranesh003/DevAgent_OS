'use client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function RootPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true });
  }, [isAuthenticated, navigate]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}
