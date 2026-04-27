const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const store = require('../store');

// ── STATS ────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  res.json({
    ...store.stats,
    activeTriggersCount: store.triggers.filter(t => t.active).length,
    totalTriggersCount: store.triggers.length
  });
});

// ── ACTIVITY LOG ─────────────────────────────────────────────────
router.get('/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  res.json({
    total: store.activity.length,
    data: store.activity.slice(offset, offset + limit)
  });
});

// ── TEMPLATES ────────────────────────────────────────────────────
router.get('/templates', (req, res) => {
  res.json(store.templates);
});

router.post('/templates', (req, res) => {
  const { name, message, type } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'name and message are required' });

  const template = { id: uuidv4(), name, message, type: type || 'text', createdAt: new Date().toISOString() };
  store.templates.push(template);
  res.status(201).json(template);
});

router.put('/templates/:id', (req, res) => {
  const idx = store.templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });

  // Whitelist only editable fields — protect id, createdAt
  const { name, message, type } = req.body;
  if (name) store.templates[idx].name = name;
  if (message) store.templates[idx].message = message;
  if (type) store.templates[idx].type = type;
  res.json(store.templates[idx]);
});

router.delete('/templates/:id', (req, res) => {
  const idx = store.templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });

  // Prevent deleting a template that is in use by a trigger
  const inUse = store.triggers.some(t => t.templateId === req.params.id);
  if (inUse) {
    return res.status(409).json({ error: 'Template is in use by a trigger. Remove the trigger first.' });
  }

  store.templates.splice(idx, 1);
  res.json({ success: true });
});

// ── TRIGGERS ─────────────────────────────────────────────────────
router.get('/triggers', (req, res) => {
  // Enrich with template names
  const enriched = store.triggers.map(t => ({
    ...t,
    templateName: store.templates.find(tmpl => tmpl.id === t.templateId)?.name || 'None'
  }));
  res.json(enriched);
});

router.post('/triggers', (req, res) => {
  const { keyword, matchType, triggerOn, templateId } = req.body;
  if (!keyword || !templateId) return res.status(400).json({ error: 'keyword and templateId are required' });

  // Validate that the referenced template exists
  const templateExists = store.templates.some(t => t.id === templateId);
  if (!templateExists) return res.status(400).json({ error: 'templateId does not match any existing template' });

  const trigger = {
    id: uuidv4(),
    keyword,
    matchType: matchType || 'exact',
    triggerOn: triggerOn || 'comment',
    templateId,
    active: true,
    totalFired: 0,
    createdAt: new Date().toISOString()
  };
  store.triggers.push(trigger);
  res.status(201).json(trigger);
});

router.put('/triggers/:id', (req, res) => {
  const idx = store.triggers.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Trigger not found' });

  // Whitelist only editable fields — protect id, totalFired, createdAt, active
  const { keyword, matchType, triggerOn, templateId } = req.body;
  if (keyword) store.triggers[idx].keyword = keyword;
  if (matchType) store.triggers[idx].matchType = matchType;
  if (triggerOn) store.triggers[idx].triggerOn = triggerOn;
  if (templateId) {
    const templateExists = store.templates.some(t => t.id === templateId);
    if (!templateExists) return res.status(400).json({ error: 'templateId does not match any existing template' });
    store.triggers[idx].templateId = templateId;
  }
  res.json(store.triggers[idx]);
});

router.delete('/triggers/:id', (req, res) => {
  const idx = store.triggers.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Trigger not found' });

  store.triggers.splice(idx, 1);
  res.json({ success: true });
});

// Toggle trigger active state
router.patch('/triggers/:id/toggle', (req, res) => {
  const trigger = store.triggers.find(t => t.id === req.params.id);
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });

  trigger.active = !trigger.active;
  res.json(trigger);
});

// ── TEST SEND ─────────────────────────────────────────────────────
// Simulate a comment event without a real webhook (for testing)
router.post('/test/comment', async (req, res) => {
  const { commentText, commenterUsername, commenterId } = req.body;
  const { handleCommentEvent } = require('../services/automation');

  try {
    const result = await handleCommentEvent({
      commentId: 'test_' + Date.now(),
      commentText,
      commenterId: commenterId || 'test_user_id',
      commenterUsername: commenterUsername || 'test_user',
      mediaId: 'test_media',
      mediaType: 'REEL'
    });
    res.json(result);
  } catch (err) {
    console.error('[Test] Error simulating comment:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
