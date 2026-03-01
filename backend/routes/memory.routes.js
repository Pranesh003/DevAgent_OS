const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const memoryService = require('../services/memory.service');
const { supabase } = require('../config/db');

router.use(authenticate);

// GET /api/memory/search?q=&projectId=
router.get('/search', async (req, res) => {
  const { q, projectId, limit = 5 } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Query q is required' });
  const results = await memoryService.searchMemory(q, projectId, parseInt(limit));
  res.json({ success: true, data: results });
});

// POST /api/memory/store
router.post('/store', async (req, res) => {
  const { content, type, projectId, metadata } = req.body;
  if (!content || !type) return res.status(400).json({ success: false, message: 'content and type required' });
  const result = await memoryService.storeMemory({ content, type, projectId, metadata, userId: req.user._id });
  res.status(201).json({ success: true, data: result });
});

// GET /api/memory/history/:projectId
router.get('/history/:projectId', async (req, res) => {
  const { limit = 50, page = 1 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const { data: activities, count } = await supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('project_id', req.params.projectId)
    .order('created_at', { ascending: false })
    .range(skip, skip + parseInt(limit) - 1);

  // Maintain frontend compatibility mapping project_id to projectId
  const mappedActivities = (activities || []).map(a => ({
    ...a,
    _id: a.id,
    projectId: a.project_id,
    sessionId: a.session_id,
    agentName: a.agent_name,
    modelUsed: a.model_used,
    durationMs: a.duration_ms,
    createdAt: a.created_at
  }));

  res.json({ success: true, data: mappedActivities, pagination: { total: count || 0, page: parseInt(page), limit: parseInt(limit) } });
});

module.exports = router;
