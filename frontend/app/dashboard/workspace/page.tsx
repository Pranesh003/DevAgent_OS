'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { useAgentStore } from '../../../store/useAgentStore';
import AgentProgressBar from '../../../components/agents/AgentProgressBar';

// Dynamically import the feed to avoid SSR/hydration issues with SyntaxHighlighter
const UnifiedAgentFeed = dynamic(() => import('../../../components/agents/UnifiedAgentFeed'), { ssr: false });

const PHASES = ['requirement', 'architecture', 'codegen', 'debug', 'testing', 'critique', 'documentation', 'memory', 'complete'];

export default function WorkspacePage() {
  const [requirement, setRequirement] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  const { sessionId, status, messages, startSession, addMessage, setStatus, setCodeFiles, setDocumentation, setArchitecture, setDebugOutput, setTests, documentation } = useAgentStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryPid = params.get('projectId');
    
    api.get('/api/projects').then(({ data }) => {
      const p = data.data || [];
      setProjects(p);
      if (queryPid) {
        setSelectedProject(queryPid);
      } else if (p.length > 0) {
        setSelectedProject(p[0]._id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const project = projects.find((p) => p._id === selectedProject);
      if (project?.current_session_id) {
        const sid = project.current_session_id;
        startSession(sid, project._id);
        
        api.get(`/api/agents/status/${sid}`).then(({ data }) => {
          const activities = data.data.activities || [];
          activities.forEach((act: any) => {
            addMessage({ 
              agent: act.agent_name, content: act.content, timestamp: act.created_at, 
              action: act.action, phase: act.metadata?.phase, critique_score: act.metadata?.critique_score 
            });
          });

          const isCompleted = data.data.project?.status === 'completed' || activities.some((a: any) => a.action === 'complete');
          const isFailed = data.data.project?.status === 'failed' || activities.some((a: any) => a.action === 'error');

          if (isCompleted) {
            setStatus('completed');
            api.get(`/api/agents/results/${sid}`)
              .then((res) => {
                const d = res.data?.data || res.data;
                if (d?.code_files) setCodeFiles(d.code_files);
                if (d?.documentation) setDocumentation(d.documentation);
                if (d?.architecture) setArchitecture(d.architecture);
                if (d?.debug_output) setDebugOutput(d.debug_output);
                if (d?.tests) setTests(d.tests);
              })
              .catch(() => {});
          } else if (isFailed) {
            setStatus('failed');
          } else {
            setStatus('running');
            connectSSE(sid);
          }
        }).catch(err => console.error('Failed to load session history', err));
      } else {
        useAgentStore.getState().reset();
      }
    }
  }, [selectedProject]);

  // Progressive polling: fetch results every 10s while running + on completion
  useEffect(() => {
    if (!sessionId) return;
    
    const fetchResults = () => {
      api.get(`/api/agents/results/${sessionId}`)
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data?.code_files) setCodeFiles(data.code_files);
          if (data?.documentation) setDocumentation(data.documentation);
          if (data?.architecture) setArchitecture(data.architecture);
          if (data?.debug_output) setDebugOutput(data.debug_output);
          if (data?.tests) setTests(data.tests);
        })
        .catch(() => {});
    };

    if (status === 'completed') {
      fetchResults();
      return;
    }

    if (status === 'running') {
      const interval = setInterval(fetchResults, 10000);
      return () => clearInterval(interval);
    }
  }, [status, sessionId, setCodeFiles, setDocumentation]);

  const connectSSE = (sid: string) => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('accessToken');
    const es = new EventSource(`${API}/api/agents/stream/${sid}?token=${token}`);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        addMessage({ 
          agent: event.agent, 
          content: event.content, 
          timestamp: event.timestamp, 
          action: event.action, 
          phase: event.phase || event.metadata?.phase, 
          critique_score: event.critique_score || event.metadata?.critique_score 
        });
        if (event.action === 'complete') { 
          setStatus('completed'); 
          es.close();
          api.get(`/api/agents/results/${sid}`)
            .then((res) => {
              const d = res.data?.data || res.data;
              if (d?.code_files) setCodeFiles(d.code_files);
              if (d?.documentation) setDocumentation(d.documentation);
              if (d?.architecture) setArchitecture(d.architecture);
              if (d?.debug_output) setDebugOutput(d.debug_output);
              if (d?.tests) setTests(d.tests);
            })
            .catch(() => {});
        }
        if (event.action === 'error') { setStatus('failed'); }
      } catch {}
    };
    es.onerror = () => es.close();
    eventSourceRef.current = es;
  };

  const handleRun = async () => {
    if (!requirement.trim()) { toast.error('Please describe your project requirements'); return; }
    let projectId = selectedProject;
    try {
      if (!projectId) {
        const { data } = await api.post('/api/projects', { name: projectName || 'Untitled Project', description: requirement.slice(0, 200) });
        projectId = data.data._id;
        setProjects((p) => [data.data, ...p]);
        setSelectedProject(projectId!);
      }
      const { data } = await api.post('/api/agents/run', { projectId, requirements: requirement });
      startSession(data.data.sessionId, projectId!);
      connectSSE(data.data.sessionId);
      toast.success('🚀 Agents activated!');

      // Fallback polling
      const pollInterval = setInterval(async () => {
        const currentStatus = useAgentStore.getState().status;
        if (currentStatus !== 'running') {
          clearInterval(pollInterval);
          return;
        }
        try {
          const { data: statusData } = await api.get(`/api/agents/status/${data.data.sessionId}`);
          const activities = statusData.data.activities || [];
          const existingCount = useAgentStore.getState().messages.length;
          if (activities.length > existingCount) {
             const missed = activities.slice(existingCount);
             missed.forEach((act: any) => {
                addMessage({ 
                  agent: act.agent_name, content: act.content, timestamp: act.created_at, 
                  action: act.action, phase: act.metadata?.phase, critique_score: act.metadata?.critique_score 
                });
                if (act.action === 'error') setStatus('failed');
                if (act.action === 'complete') setStatus('completed');
             });
          }
        } catch {}
      }, 3000);

    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start agents');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>🤖 <span className="gradient-text">Agent Workspace</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Describe your project and watch 8 AI agents build it autonomously</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>PROJECT NAME</label>
            <input id="project-name" className="input" placeholder="My Awesome App" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>EXISTING PROJECT (optional)</label>
            <select id="project-select" className="input" value={selectedProject || ''} onChange={(e) => setSelectedProject(e.target.value || null)}>
              <option value="">— Create new project —</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>REQUIREMENTS</label>
          <textarea id="requirements-input" className="input textarea" rows={6} placeholder="Describe your project..."
            value={requirement} onChange={(e) => setRequirement(e.target.value)} style={{ minHeight: 140 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <motion.button id="run-agents-btn" onClick={handleRun} disabled={status === 'running'} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="btn btn-primary" style={{ padding: '12px 28px' }}>
            {status === 'running' ? '⏳ Agents Running...' : '🚀 Run Agents'}
          </motion.button>
        </div>
      </div>

      {status !== 'idle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AgentProgressBar />
          <UnifiedAgentFeed />
        </motion.div>
      )}
    </div>
  );
}
