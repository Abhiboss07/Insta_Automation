require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const webhookRouter = require('./routes/webhook');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & Logging ───────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

// ── Rate limiting ─────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api', limiter);

// ── Body parser ───────────────────────────────────────────────────
// Webhook needs raw body for X-Hub-Signature-256 verification
app.use('/webhook', express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Process-level crash handlers ──────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │   Instagram Automation Backend          │
  │   Running on http://localhost:${PORT}      │
  │                                         │
  │   Webhook URL: /webhook                 │
  │   API:         /api                     │
  └─────────────────────────────────────────┘
  `);
});
