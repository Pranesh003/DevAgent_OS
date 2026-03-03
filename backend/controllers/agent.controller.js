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

    // If workflow is complete, persist final results to the project record
    if (event.action === 'complete') {
      const results = {
        code_files: event.code_files || [],
        documentation: event.documentation || {},
        architecture: event.architecture || {},
        tests: event.tests || [],
        critique_score: event.critique_score,
        reflections: event.reflections || [],
      };

      await supabase
        .from('projects')
        .update({ status: 'completed', architecture: event.architecture })
        .eq('id', event.project_id);

      // We might want to store results in a separate column or just files
      // Since 'files' exists, let's update it too
      if (results.code_files.length > 0) {
        await supabase
          .from('projects')
          .update({ files: results.code_files })
          .eq('id', event.project_id);
      }
    }
  } catch (err) {
    logger.warn('Activity log or result persistence failed:', err.message);
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
    .select('status, name, current_session_id')
    .eq('current_session_id', sessionId)
    .or(`current_session_id.eq.${sessionId}`) // Ensure we find it
    .single();

  res.json({ success: true, data: { project, activities } });
};

// GET /api/agents/results/:sessionId
const getSessionResults = async (req, res) => {
  const { sessionId } = req.params;
  try {
    // 1. Try orchestrator (memory) first for speed and live data
    try {
      const { data } = await axios.get(`${orchestratorUrl}/results/${sessionId}`);
      if (data && (data.code_files?.length > 0 || Object.keys(data.documentation || {}).length > 0)) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      logger.debug(`Orchestrator results 404/error for ${sessionId}, checking DB...`);
    }

    // 2. Fallback to Supabase projects table (files column)
    const { data: project } = await supabase
      .from('projects')
      .select('files, architecture, status')
      .eq('current_session_id', sessionId)
      .single();

    if (project && project.files?.length > 0) {
      return res.json({
        success: true,
        data: {
          session_id: sessionId,
          status: project.status,
          code_files: project.files,
          documentation: {}, // Future: Add doc column to DB if needed
          architecture: project.architecture,
          tests: [],
          errors: []
        }
      });
    }

    res.status(404).json({ success: false, message: 'Results not found in memory or database' });
  } catch (err) {
    logger.error(`Get session results failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { runAgents, streamAgentActivity, broadcastEvent, getSessionStatus, getSessionResults };
