'use strict';

const express = require('express');
const router = express.Router();
const { learningService } = require('../services/learning/learningService');
const { conversationMemory } = require('../services/memory/conversationMemory');
const { offlineSyncManager } = require('../services/sync/offlineSyncManager');
const firebaseConfig = require('../../config/firebase');
const { requirePermission } = require('../middleware/authMiddleware');

// Health Check
router.get('/health', async (req, res) => {
  const health = await firebaseConfig.checkConnectionHealth();
  res.json({
    status: 'ok',
    application: 'Not an AI',
    timestamp: new Date().toISOString(),
    firebase: health
  });
});

// Feedback API
router.post('/feedback', requirePermission('submit_feedback'), (req, res) => {
  const { messageId, knowledgeId, query, rating, correction, comment } = req.body;
  const user = req.session.user;

  try {
    const feedback = learningService.submitFeedback({
      userId: user.uid,
      messageId,
      knowledgeId,
      query,
      rating,
      correction,
      comment
    });
    res.json({ success: true, feedback });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// User Memory APIs
router.get('/memory', requirePermission('manage_memory'), (req, res) => {
  const user = req.session.user;
  const memories = conversationMemory.getUserMemories(user.uid);
  res.json({ success: true, memories });
});

router.post('/memory', requirePermission('manage_memory'), (req, res) => {
  const user = req.session.user;
  const { content, category } = req.body;
  try {
    const saved = conversationMemory.saveUserMemory(user.uid, { content, category });
    res.json({ success: true, memory: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/memory/:id', requirePermission('manage_memory'), (req, res) => {
  const user = req.session.user;
  const deleted = conversationMemory.deleteUserMemory(user.uid, req.params.id);
  res.json({ success: deleted });
});

router.get('/memory/export', requirePermission('manage_memory'), (req, res) => {
  const user = req.session.user;
  const exported = conversationMemory.exportUserMemory(user.uid);
  res.json(exported);
});

router.delete('/memory/clear-all', requirePermission('manage_memory'), (req, res) => {
  const user = req.session.user;
  const result = conversationMemory.clearAllUserMemories(user.uid);
  res.json({ success: true, ...result });
});

// Sync Status & Processing
router.get('/sync/status', (req, res) => {
  res.json({
    success: true,
    sync: offlineSyncManager.getStatus(),
    firebase: firebaseConfig.getStatus()
  });
});

router.post('/sync/trigger', async (req, res) => {
  const result = await offlineSyncManager.processQueue();
  res.json({ success: true, ...result });
});

module.exports = router;
