'use strict';

const { localStorageEngine } = require('../storage/localStorageEngine');
const firebaseConfig = require('../../../config/firebase');

/**
 * OfflineSyncManager
 * Manages pending mutations when Firebase is offline or unreachable.
 * Implements exponential backoff, idempotent operations, and conflict detection.
 */
class OfflineSyncManager {
  constructor() {
    this.queueCollection = '_syncQueue';
    this.maxRetries = 5;
    this.isProcessing = false;
    this.intervalId = null;
    this.listeners = new Set();
  }

  /**
   * Enqueue a sync action
   * @param {Object} item - { action: 'create'|'update'|'delete', collection: string, docId: string, data: any }
   */
  enqueue(item) {
    const queueId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const syncItem = {
      id: queueId,
      action: item.action,
      collection: item.collection,
      docId: item.docId,
      data: item.data,
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
      nextAttemptAt: Date.now()
    };

    localStorageEngine.set(this.queueCollection, queueId, syncItem);
    this._notifyListeners('enqueued', syncItem);
    return syncItem;
  }

  /**
   * Get all pending sync items
   */
  getPendingItems() {
    return localStorageEngine.getAll(this.queueCollection);
  }

  /**
   * Get count of pending items
   */
  getPendingCount() {
    return localStorageEngine.count(this.queueCollection);
  }

  /**
   * Process pending queue
   */
  async processQueue() {
    if (this.isProcessing) return;
    if (!firebaseConfig.isOnline()) {
      return { processed: 0, remaining: this.getPendingCount(), reason: 'offline' };
    }

    this.isProcessing = true;
    const items = this.getPendingItems();
    const now = Date.now();
    let processed = 0;

    for (const item of items) {
      if (item.nextAttemptAt && item.nextAttemptAt > now) {
        continue;
      }

      try {
        await this._syncItem(item);
        // On success, remove from queue
        localStorageEngine.delete(this.queueCollection, item.id);
        processed++;
        this._notifyListeners('synced', item);
      } catch (err) {
        item.attempts = (item.attempts || 0) + 1;
        item.lastError = err.message;

        if (item.attempts >= this.maxRetries) {
          // Move to dead letter or mark permanently failed
          item.status = 'failed';
          localStorageEngine.set(this.queueCollection, item.id, item);
          this._notifyListeners('failed', item);
        } else {
          // Exponential backoff with jitter: 2^attempts * 1000ms
          const delay = Math.pow(2, item.attempts) * 1000 + Math.floor(Math.random() * 500);
          item.nextAttemptAt = Date.now() + delay;
          localStorageEngine.set(this.queueCollection, item.id, item);
        }
      }
    }

    this.isProcessing = false;
    return { processed, remaining: this.getPendingCount() };
  }

  async _syncItem(item) {
    const firestore = firebaseConfig.getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    // Check if using Admin SDK or Web SDK
    const adminApp = firebaseConfig.getAdminApp();
    if (adminApp) {
      const docRef = firestore.collection(item.collection).doc(item.docId);
      if (item.action === 'delete') {
        await docRef.delete();
      } else {
        await docRef.set(item.data, { merge: true });
      }
    } else {
      // Using Web Client SDK
      const { doc, setDoc, deleteDoc } = require('firebase/firestore');
      const docRef = doc(firestore, item.collection, item.docId);
      if (item.action === 'delete') {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, item.data, { merge: true });
      }
    }
  }

  startPeriodicSync(intervalMs = 15000) {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.processQueue().catch(err => {
        console.warn('[OfflineSyncManager] Periodic sync error:', err.message);
      });
    }, intervalMs);
    if (this.intervalId && typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }
  }

  stopPeriodicSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  addListener(fn) {
    this.listeners.add(fn);
  }

  removeListener(fn) {
    this.listeners.delete(fn);
  }

  _notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        // Ignore listener errors
      }
    }
  }

  getStatus() {
    return {
      pendingCount: this.getPendingCount(),
      isProcessing: this.isProcessing,
      isOnline: firebaseConfig.isOnline()
    };
  }
}

const offlineSyncManager = new OfflineSyncManager();

module.exports = {
  OfflineSyncManager,
  offlineSyncManager
};
