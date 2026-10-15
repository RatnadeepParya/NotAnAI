'use strict';

const firebaseConfig = require('../../../config/firebase');
const { localStorageEngine } = require('../storage/localStorageEngine');
const { offlineSyncManager } = require('../sync/offlineSyncManager');

/**
 * FirestoreService
 * Dual-layer data access: interacts directly with Cloud Firestore when online,
 * falls back to durable LocalStorageEngine when offline or credentials absent,
 * and maintains continuous consistency via OfflineSyncManager.
 */
class FirestoreService {
  constructor() {
    this.localStorage = localStorageEngine;
    this.syncManager = offlineSyncManager;
  }

  /**
   * Save or update document
   */
  async set(collection, docId, data, options = { merge: true }) {
    if (!docId) throw new Error('docId is required');

    // 1. Always update local storage first for instant zero-latency retrieval
    const localRecord = this.localStorage.set(collection, docId, data);

    // 2. If online and Firestore available, write to Firestore
    if (firebaseConfig.isOnline()) {
      try {
        const firestore = firebaseConfig.getFirestore();
        const adminApp = firebaseConfig.getAdminApp();

        const writePromise = (async () => {
          if (adminApp) {
            await firestore.collection(collection).doc(docId).set(data, options);
          } else if (firestore) {
            const { doc, setDoc } = require('firebase/firestore');
            await setDoc(doc(firestore, collection, docId), data, options);
          }
        })();

        await Promise.race([
          writePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 1500))
        ]);

        return localRecord;
      } catch (err) {
        console.warn(`[FirestoreService] Write to ${collection}/${docId} failed, queuing for offline sync:`, err.message);
        this.syncManager.enqueue({ action: 'update', collection, docId, data });
      }
    } else {
      // Offline: enqueue sync item
      this.syncManager.enqueue({ action: 'update', collection, docId, data });
    }

    return localRecord;
  }

  /**
   * Get document by ID
   */
  async get(collection, docId) {
    if (!docId) return null;

    // First check local store
    const localDoc = this.localStorage.get(collection, docId);
    if (localDoc) return localDoc;

    // If not in local store and online, fetch from remote Firestore
    if (firebaseConfig.isOnline()) {
      try {
        const firestore = firebaseConfig.getFirestore();
        const adminApp = firebaseConfig.getAdminApp();

        const readPromise = (async () => {
          if (adminApp) {
            const snapshot = await firestore.collection(collection).doc(docId).get();
            if (snapshot.exists) {
              const data = { id: snapshot.id, ...snapshot.data() };
              this.localStorage.set(collection, docId, data);
              return data;
            }
          } else if (firestore) {
            const { doc, getDoc } = require('firebase/firestore');
            const snapshot = await getDoc(doc(firestore, collection, docId));
            if (snapshot.exists()) {
              const data = { id: snapshot.id, ...snapshot.data() };
              this.localStorage.set(collection, docId, data);
              return data;
            }
          }
          return null;
        })();

        return await Promise.race([
          readPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 1500))
        ]);
      } catch (err) {
        console.warn(`[FirestoreService] Remote read ${collection}/${docId} failed:`, err.message);
      }
    }

    return null;
  }

  /**
   * Delete document
   */
  async delete(collection, docId) {
    if (!docId) return false;

    // Delete locally
    this.localStorage.delete(collection, docId);

    // Delete remotely or queue
    if (firebaseConfig.isOnline()) {
      try {
        const firestore = firebaseConfig.getFirestore();
        const adminApp = firebaseConfig.getAdminApp();

        const deletePromise = (async () => {
          if (adminApp) {
            await firestore.collection(collection).doc(docId).delete();
          } else if (firestore) {
            const { doc, deleteDoc } = require('firebase/firestore');
            await deleteDoc(doc(firestore, collection, docId));
          }
        })();

        await Promise.race([
          deletePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore delete timeout')), 1500))
        ]);

        return true;
      } catch (err) {
        console.warn(`[FirestoreService] Remote delete ${collection}/${docId} failed:`, err.message);
        this.syncManager.enqueue({ action: 'delete', collection, docId, data: null });
      }
    } else {
      this.syncManager.enqueue({ action: 'delete', collection, docId, data: null });
    }

    return true;
  }

  /**
   * Query or list documents in collection
   */
  async getAll(collection, filterFn = null) {
    // Return all local records matching filter
    return this.localStorage.getAll(collection, filterFn);
  }

  /**
   * Count documents in collection
   */
  count(collection) {
    return this.localStorage.count(collection);
  }

  /**
   * Batch set documents
   */
  async batchSet(collection, documents) {
    const results = [];
    for (const doc of documents) {
      if (doc && doc.id) {
        const res = await this.set(collection, doc.id, doc);
        results.push(res);
      }
    }
    return results;
  }
}

const firestoreService = new FirestoreService();

module.exports = {
  FirestoreService,
  firestoreService
};
