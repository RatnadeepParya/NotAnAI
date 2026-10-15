'use strict';

const express = require('express');
const router = express.Router();
const { chatController } = require('../controllers/chatController');
const { requirePermission } = require('../middleware/authMiddleware');

router.get('/', (req, res) => chatController.renderChat(req, res));
router.post('/api/chat/message', requirePermission('chat'), (req, res) => chatController.sendMessage(req, res));
router.get('/api/chat/stream', requirePermission('chat'), (req, res) => chatController.streamMessage(req, res));
router.post('/api/chat/clear', requirePermission('chat'), (req, res) => chatController.clearConversation(req, res));

module.exports = router;
