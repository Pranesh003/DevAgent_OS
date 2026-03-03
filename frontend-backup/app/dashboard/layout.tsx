'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { href: '/dashboard/projects', icon: '📁', label: 'Projects' },
  { href: '/dashboard/workspace', icon: '🤖', label: 'Agent Workspace' },
  { href: '/dashboard/memory', icon: '🧠', label: 'Memory Insights' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
];

interface Project {
  _id: string;
  name: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get('/api/projects');
        setRecentProjects((data.data || []).slice(0, 5));
      } catch (err) {
        console.error('Sidebar fetch projects failed:', err);
      }
    };
    if (user) fetchProjects();
  }, [user, pathname]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--bg-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>🤖</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }} className="gradient-text">Agents Unleashed</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>v1.0 · {user?.role}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '0 14px 8px' }}>Menu</div>
          {NAV_ITEMS.map(({ href, icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 3 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                    background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                    color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
                    fontSize: 14, fontWeight: isActive ? 600 : 400, transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                  {isActive && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                </motion.div>
              </Link>
            );
          })}

          {recentProjects.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '24px 14px 8px' }}>Recent Projects</div>
              {recentProjects.map((project) => (
                <div key={project._id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="sidebar-project-item">
                  <Link href={`/dashboard/workspace?projectId=${project._id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <motion.div
                      whileHover={{ x: 3 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderRadius: 10,
                        color: 'var(--text-secondary)', fontSize: 13, transition: 'all 0.2s', cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 14, opacity: 0.7 }}>📦</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                    </motion.div>
                  </Link>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      if (window.confirm(`Delete "${project.name}"?`)) {
                        try {
                          await api.delete(`/api/projects/${project._id}`);
                          setRecentProjects(recentProjects.filter(p => p._id !== project._id));
                          toast.success('Project deleted');
                        } catch {
                          toast.error('Delete failed');
                        }
                      }
                    }}
                    style={{
                      position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, opacity: 0, transition: 'opacity 0.2s', padding: '4px'
                    }}
                    className="sidebar-delete-btn"
                    title="Delete Project"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--bg-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
            🚪 Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

