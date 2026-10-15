'use strict';

const { localStorageEngine } = require('../storage/localStorageEngine');
const KeywordExtractor = require('../../engine/nlp/keywordExtractor');

/**
 * ConversationMemoryManager
 * Manages dual-tier memory:
 * 1. Short-Term Memory: Ephemeral in-memory context per conversation/session
 * 2. Long-Term Memory: Durable, user-scoped persistent memory
 */
class ConversationMemoryManager {
  constructor() {
    // conversationId -> ShortTermContext
    this.shortTermSessions = new Map();
    this.memoryCollection = 'userMemories';
  }

  /**
   * Get or initialize short-term context for a conversation
   */
  getShortTermContext(conversationId) {
    if (!conversationId) return this._createEmptyContext(null);

    if (!this.shortTermSessions.has(conversationId)) {
      this.shortTermSessions.set(conversationId, this._createEmptyContext(conversationId));
    }
    return this.shortTermSessions.get(conversationId);
  }

  _createEmptyContext(conversationId) {
    return {
      conversationId,
      lastTopic: null,
      lastEntity: null,
      lastQuestion: null,
      lastAnswer: null,
      recentEntities: [],
      recentMessages: [],
      messageCount: 0,
      updatedAt: Date.now()
    };
  }

  /**
   * Update short-term context after a conversation turn
   */
  updateShortTermContext(conversationId, userQuery, botResponse, metadata = {}) {
    const ctx = this.getShortTermContext(conversationId);

    // Extract recognized entities
    const extractedEntities = KeywordExtractor.extractEntityCandidates(userQuery);
    const keywords = KeywordExtractor.extractKeywords(userQuery);

    if (metadata.topic) {
      ctx.lastTopic = metadata.topic;
    }

    if (extractedEntities.length > 0) {
      ctx.lastEntity = extractedEntities[0];
      for (const ent of extractedEntities) {
        if (!ctx.recentEntities.includes(ent)) {
          ctx.recentEntities.unshift(ent);
        }
      }
      ctx.recentEntities = ctx.recentEntities.slice(0, 10);
    }

    ctx.lastQuestion = userQuery;
    ctx.lastAnswer = botResponse;
    ctx.messageCount += 2;
    ctx.updatedAt = Date.now();

    // Maintain recent window (last 6 turns)
    ctx.recentMessages.push({ role: 'user', content: userQuery, timestamp: Date.now() });
    ctx.recentMessages.push({ role: 'bot', content: botResponse, timestamp: Date.now() });
    if (ctx.recentMessages.length > 12) {
      ctx.recentMessages = ctx.recentMessages.slice(-12);
    }

    return ctx;
  }

  /**
   * Resolve pronouns ("it", "its", "that") using short-term entity memory
   */
  resolveQueryContext(query, conversationId) {
    if (!query || typeof query !== 'string') return query;
    const ctx = this.getShortTermContext(conversationId);

    if (!ctx.lastEntity) return query;

    // Check if query contains unresolved demonstratives/pronouns
    const pronounRegex = /\b(it|its|that|this)\b/gi;
    if (pronounRegex.test(query)) {
      // Create resolved expanded query
      const expanded = query.replace(pronounRegex, ctx.lastEntity);
      return {
        originalQuery: query,
        resolvedQuery: expanded,
        resolvedEntity: ctx.lastEntity,
        isContextResolved: true
      };
    }

    return {
      originalQuery: query,
      resolvedQuery: query,
      resolvedEntity: null,
      isContextResolved: false
    };
  }

  /**
   * Add an approved long-term memory for a user
   */
  saveUserMemory(userId, memoryItem) {
    if (!userId) throw new Error('userId is required');
    if (!memoryItem || !memoryItem.content) throw new Error('Memory content is required');

    const memId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: memId,
      userId,
      content: String(memoryItem.content).trim(),
      category: memoryItem.category || 'fact', // 'preference', 'fact', 'correction'
      approvedByUser: true,
      createdAt: new Date().toISOString()
    };

    localStorageEngine.set(this.memoryCollection, memId, record);
    return record;
  }

  /**
   * Get all long-term memories for a specific user
   */
  getUserMemories(userId) {
    if (!userId) return [];
    return localStorageEngine.getAll(this.memoryCollection, m => m.userId === userId);
  }

  /**
   * Delete a specific memory
   */
  deleteUserMemory(userId, memoryId) {
    const mem = localStorageEngine.get(this.memoryCollection, memoryId);
    if (!mem || mem.userId !== userId) return false;
    return localStorageEngine.delete(this.memoryCollection, memoryId);
  }

  /**
   * Export all user memory as JSON
   */
  exportUserMemory(userId) {
    const memories = this.getUserMemories(userId);
    return {
      userId,
      exportedAt: new Date().toISOString(),
      count: memories.length,
      memories
    };
  }

  /**
   * Clear all memories for a user
   */
  clearAllUserMemories(userId) {
    const userMemories = this.getUserMemories(userId);
    let deleted = 0;
    for (const mem of userMemories) {
      if (localStorageEngine.delete(this.memoryCollection, mem.id)) {
        deleted++;
      }
    }
    return { deleted };
  }
}

const conversationMemory = new ConversationMemoryManager();

module.exports = {
  ConversationMemoryManager,
  conversationMemory
};
