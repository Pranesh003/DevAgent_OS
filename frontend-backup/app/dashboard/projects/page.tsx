'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get('/api/projects');
        setProjects(data.data || []);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will permanently remove all associated agent activities and data.`)) {
      return;
    }

    try {
      await api.delete(`/api/projects/${id}`);
      setProjects(projects.filter(p => p._id !== id));
      toast.success('Project deleted successfully');
    } catch (err) {
      console.error('Failed to delete project:', err);
      toast.error('Failed to delete project');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <motion.div 
        initial={{ opacity: 0, y: -16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            My <span className="gradient-text">Projects</span> 📁
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Manage and browse your autonomous builds.
          </p>
        </div>
        <Link href="/dashboard/workspace" className="btn btn-primary">
          + New Project
        </Link>
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="loader"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No projects yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Start your first autonomous build in the workspace.</p>
          <Link href="/dashboard/workspace" className="btn btn-primary">Go to Workspace</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {projects.map((project, i) => (
            <motion.div
              key={project._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="card"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', cursor: 'default', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 24 }}>📦</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ 
                    fontSize: 10, 
                    fontWeight: 800, 
                    padding: '4px 8px', 
                    borderRadius: 6, 
                    background: project.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                    color: project.status === 'completed' ? '#10b981' : '#6366f1',
                    textTransform: 'uppercase'
                  }}>
                    {project.status}
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, project._id, project.name)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontSize: 16, 
                      padding: '4px',
                      borderRadius: '4px',
                      color: 'var(--text-muted)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    title="Delete Project"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{project.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, flex: 1, lineHeight: 1.6 }}>
                {project.description || 'No description provided.'}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--bg-border)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </span>
                <Link 
                  href={`/dashboard/workspace?projectId=${project._id}`}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}
                >
                  Open Workspace →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
