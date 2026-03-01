const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { supabase } = require('../config/db');
const { orchestratorUrl } = require('../config/env');
const logger = require('../utils/logger');

// In-memory SSE client registry: sessionId -> [res objects]
const sseClients = new Map();

// POST /api/agents/run
const runAgents = async (req, res) => {
  const { projectId, requirements, options = {} } = req.body;
  if (!projectId || !requirements) {
    return res.status(400).json({ success: false, message: 'projectId and requirements required' });
  }

  const { data: project, error: fetchErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', req.user._id)
    .single();

  if (fetchErr || !project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const sessionId = uuidv4();
  
  const { error: updateErr } = await supabase
    .from('projects')
    .update({ 
      current_session_id: sessionId, 
      status: 'planning', 
      requirements 
    })
    .eq('id', projectId);

  if (updateErr) {
    return res.status(500).json({ success: false, message: 'Failed to update project session' });
  }

  // Forward to Python orchestrator (non-blocking)
  axios
    .post(`${orchestratorUrl}/run`, {
      session_id: sessionId,
      project_id: projectId.toString(),
      requirements,
      options,
      user_id: req.user._id.toString(),
    })
    .catch((err) => logger.error(`Orchestrator call failed: ${err.message}`));

  res.json({ success: true, data: { sessionId } });
};

// GET /api/agents/stream/:sessionId — SSE
const streamAgentActivity = (req, res) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send SSE keepalive comment
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 20000);

  if (!sseClients.has(sessionId)) sseClients.set(sessionId, []);
  sseClients.get(sessionId).push(res);

  req.on('close', () => {
    clearInterval(keepAlive);
    const clients = sseClients.get(sessionId) || [];
    sseClients.set(
      sessionId,
      clients.filter((c) => c !== res)
    );
    if (sseClients.get(sessionId).length === 0) sseClients.delete(sessionId);
  });
};

// Internal function: called by orchestrator webhook to broadcast events
const broadcastEvent = async (req, res) => {
  const { sessionId, event } = req.body;
  if (!sessionId || !event) {
    return res.status(400).json({ success: false, message: 'sessionId and event required' });
  }

  // Persist activity to Supabase
  try {
    await supabase.from('activities').insert([{
      project_id: event.project_id,
      session_id: sessionId,
      agent_name: event.agent || 'System',
      action: event.action || 'output',
      content: event.content || '',
      metadata: event.metadata || {},
      model_used: event.model,
      duration_ms: event.duration_ms,
    }]);
  } catch (err) {
    logger.warn('Activity log failed:', err.message);
  }

  // Broadcast to SSE clients
  const clients = sseClients.get(sessionId) || [];
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(data);
    } catch {}
  });

  res.json({ success: true, broadcasted: clients.length });
};

// GET /api/agents/status/:sessionId
const getSessionStatus = async (req, res) => {
  const { sessionId } = req.params;
  
  const { data: activities = [] } = await supabase
    .from('activities')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const { data: project } = await supabase
    .from('projects')
    .select('status, name')
    .eq('current_session_id', sessionId)
    .single();

  res.json({ success: true, data: { project, activities } });
};

// GET /api/agents/results/:sessionId
const getSessionResults = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const { data } = await axios.get(`${orchestratorUrl}/results/${sessionId}`);
    res.json({ success: true, data });
  } catch (err) {
    if (err.response && err.response.status === 202) {
      return res.status(202).json({ success: true, message: 'Processing' });
    }
    logger.error(`Orchestrator results failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
};

module.exports = { runAgents, streamAgentActivity, broadcastEvent, getSessionStatus, getSessionResults };
