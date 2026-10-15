'use strict';

const { chatPipeline } = require('../engine/chatPipeline');
const { realtimeDbService } = require('../services/firebase/realtimeDbService');
const { conversationMemory } = require('../services/memory/conversationMemory');
const { localStorageEngine } = require('../services/storage/localStorageEngine');
const crypto = require('crypto');

class ChatController {
  /**
   * Render Main Chat Interface
   */
  async renderChat(req, res) {
    const user = req.session.user;
    const conversationId = req.query.c || `conv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // Get previous messages if existing
    const messages = await realtimeDbService.getMessages(user.uid, conversationId);

    // Get user's conversation list
    const userConvs = localStorageEngine.getAll(`user_convs_${user.uid}`) || [];

    res.render('chat/index', {
      title: 'Not an AI — Local-First Intelligent Chatbot',
      conversationId,
      messages,
      conversations: userConvs,
      user
    });
  }

  /**
   * Send a message through the deterministic chat pipeline
   */
  async sendMessage(req, res) {
    const user = req.session.user;
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const convId = conversationId || `conv_${Date.now()}`;

    // Save user message in RTDB / local store
    const userMsg = await realtimeDbService.saveMessage(user.uid, convId, {
      sender: 'user',
      text: message.trim()
    });

    // Update conversation record
    const convTitle = message.trim().slice(0, 40);
    localStorageEngine.set(`user_convs_${user.uid}`, convId, {
      id: convId,
      title: convTitle,
      updatedAt: Date.now()
    });

    // Process through pipeline
    const pipelineResult = await chatPipeline.process(message, {
      conversationId: convId,
      userId: user.uid
    });

    // Save bot response in RTDB / local store
    const botMsg = await realtimeDbService.saveMessage(user.uid, convId, {
      sender: 'bot',
      text: pipelineResult.text,
      confidence: pipelineResult.confidence,
      format: pipelineResult.format,
      explanation: pipelineResult.explanation,
      recordId: pipelineResult.recordId
    });

    res.json({
      success: true,
      userMessage: userMsg,
      botMessage: botMsg
    });
  }

  /**
   * Stream response processing steps via Server-Sent Events (SSE)
   */
  async streamMessage(req, res) {
    const user = req.session.user;
    const { message, conversationId } = req.query;

    if (!message) {
      return res.status(400).send('Query parameter "message" is required');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('status', { stage: 'Input Validation & Normalization' });
    const convId = conversationId || `conv_${Date.now()}`;

    setTimeout(async () => {
      try {
        sendEvent('status', { stage: 'Language Detection & Tokenization' });
        sendEvent('status', { stage: 'Intent Classification & Entity Resolution' });
        sendEvent('status', { stage: 'Deterministic Knowledge Retrieval & BM25 Scoring' });

        const result = await chatPipeline.process(message, {
          conversationId: convId,
          userId: user.uid
        });

        sendEvent('status', { stage: 'Response Composition Complete' });
        sendEvent('complete', result);
        res.end();
      } catch (err) {
        sendEvent('error', { error: err.message });
        res.end();
      }
    }, 50);
  }

  /**
   * Clear conversation history
   */
  async clearConversation(req, res) {
    const user = req.session.user;
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

    localStorageEngine.clearCollection(`rtdb_chatMessages_${user.uid}_${conversationId}`);
    localStorageEngine.delete(`user_convs_${user.uid}`, conversationId);

    res.json({ success: true });
  }
}

const chatController = new ChatController();

module.exports = {
  ChatController,
  chatController
};
