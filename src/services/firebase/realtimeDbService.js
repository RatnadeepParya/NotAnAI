'use strict';

const firebaseConfig = require('../../../config/firebase');
const { localStorageEngine } = require('../storage/localStorageEngine');

/**
 * RealtimeDbService
 * Manages rapidly changing conversational state:
 * - Presence
 * - Active chat messages
 * - Typing indicators
 * - Session context
 * - Processing status
 */
class RealtimeDbService {
  constructor() {
    this.localStorage = localStorageEngine;
  }

  _getCollectionForPath(pathStr) {
    return `rtdb_${pathStr.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  /**
   * Helper to perform remote RTDB operation with short timeout to prevent blocking local execution
   */
  async _remoteOp(opFn, timeoutMs = 800) {
    if (!firebaseConfig.isOnline()) return null;
    return Promise.race([
      opFn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB remote timeout')), timeoutMs))
    ]).catch(err => {
      // Non-fatal; RTDB is transient and mirrors local cache
      return null;
    });
  }

  /**
   * Set data at a specific path
   */
  async set(pathStr, data) {
    // 1. Store in local storage cache immediately
    const colName = this._getCollectionForPath(pathStr);
    this.localStorage.set(colName, 'current', { data, updatedAt: Date.now() });

    // 2. Perform remote write asynchronously without blocking
    this._remoteOp(async () => {
      const rtdb = firebaseConfig.getRealtimeDb();
      const adminApp = firebaseConfig.getAdminApp();

      if (adminApp && rtdb) {
        await rtdb.ref(pathStr).set(data);
      } else if (rtdb) {
        const { ref, set } = require('firebase/database');
        await set(ref(rtdb, pathStr), data);
      }
    });

    return data;
  }

  /**
   * Push a new child to a list
   */
  async push(pathStr, data) {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const colName = this._getCollectionForPath(pathStr);
    const record = { id, ...data, timestamp: data.timestamp || Date.now() };

    // 1. Store locally immediately
    this.localStorage.set(colName, id, record);

    // 2. Mirror to remote RTDB in background
    this._remoteOp(async () => {
      const rtdb = firebaseConfig.getRealtimeDb();
      const adminApp = firebaseConfig.getAdminApp();

      if (adminApp && rtdb) {
        await rtdb.ref(`${pathStr}/${id}`).set(record);
      } else if (rtdb) {
        const { ref, set } = require('firebase/database');
        await set(ref(rtdb, `${pathStr}/${id}`), record);
      }
    });

    return record;
  }

  /**
   * Get data at a path
   */
  async get(pathStr) {
    const colName = this._getCollectionForPath(pathStr);
    const local = this.localStorage.get(colName, 'current');
    if (local && local.data !== undefined) return local.data;

    // Check if list of documents
    const list = this.localStorage.getAll(colName);
    if (list && list.length > 0) return list;

    // If not found locally, attempt fast remote read
    const remoteData = await this._remoteOp(async () => {
      const rtdb = firebaseConfig.getRealtimeDb();
      const adminApp = firebaseConfig.getAdminApp();

      if (adminApp && rtdb) {
        const snapshot = await rtdb.ref(pathStr).once('value');
        return snapshot.val();
      } else if (rtdb) {
        const { ref, get } = require('firebase/database');
        const snapshot = await get(ref(rtdb, pathStr));
        return snapshot.val();
      }
      return null;
    }, 1000);

    return remoteData;
  }

  /**
   * Get messages for conversation
   */
  async getMessages(uid, conversationId) {
    const pathStr = `chatMessages/${uid}/${conversationId}`;
    const colName = this._getCollectionForPath(pathStr);
    const localMsgs = this.localStorage.getAll(colName);

    // Sort by timestamp ASC
    return localMsgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }

  /**
   * Save a chat message
   */
  async saveMessage(uid, conversationId, message) {
    const pathStr = `chatMessages/${uid}/${conversationId}`;
    const colName = this._getCollectionForPath(pathStr);
    const msgId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullMsg = {
      ...message,
      id: msgId,
      timestamp: message.timestamp || Date.now()
    };

    // 1. Save locally immediately
    this.localStorage.set(colName, msgId, fullMsg);

    // 2. Mirror remotely asynchronously in background
    this._remoteOp(async () => {
      const rtdb = firebaseConfig.getRealtimeDb();
      const adminApp = firebaseConfig.getAdminApp();

      if (adminApp && rtdb) {
        await rtdb.ref(`${pathStr}/${msgId}`).set(fullMsg);
      } else if (rtdb) {
        const { ref, set } = require('firebase/database');
        await set(ref(rtdb, `${pathStr}/${msgId}`), fullMsg);
      }
    });

    return fullMsg;
  }

  /**
   * Update presence status
   */
  async updatePresence(uid, status = 'online') {
    return this.set(`presence/${uid}`, {
      status,
      lastSeen: Date.now()
    });
  }

  /**
   * Update typing status
   */
  async updateTyping(uid, conversationId, isTyping) {
    return this.set(`typing/${uid}/${conversationId}`, !!isTyping);
  }
}

const realtimeDbService = new RealtimeDbService();

module.exports = {
  RealtimeDbService,
  realtimeDbService
};
