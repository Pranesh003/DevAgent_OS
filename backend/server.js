'use strict';
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const { port, env } = require('./config/env');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const agentRoutes = require('./routes/agent.routes');
const projectRoutes = require('./routes/project.routes');
const memoryRoutes = require('./routes/memory.routes');

const app = express();

// ── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(morgan(env === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'agents-unleashed-api', timestamp: new Date().toISOString() })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/memory', memoryRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method}`);
  res.status(err.status || 500).json({
    success: false,
    message: env === 'production' ? 'Internal server error' : err.message,
    ...(env === 'development' && { stack: err.stack }),
  });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(port, () => {
    logger.info(`🚀 Agents Unleashed API running on port ${port} [${env}]`);
  });
};

start();

module.exports = app;
