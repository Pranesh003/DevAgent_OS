const express = require('express');
const router = express.Router();
const { runAgents, streamAgentActivity, broadcastEvent, getSessionStatus, getSessionResults } = require('../controllers/agent.controller');
const { authenticate } = require('../middleware/auth');

// Internal webhook (called by Python orchestrator to push events)
router.post('/broadcast', broadcastEvent);

// Protected routes
router.use(authenticate);
router.post('/run', runAgents);
router.get('/stream/:sessionId', streamAgentActivity);
router.get('/status/:sessionId', getSessionStatus);
router.get('/results/:sessionId', getSessionResults);

module.exports = router;
