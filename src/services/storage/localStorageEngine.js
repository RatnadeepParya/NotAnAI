'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../../../config/app');

/**
 * LocalStorageEngine
 * Provides durable, atomic JSON-based local persistence on disk.
 * Supports collections (knowledge, users, conversations, feedback, rules, etc.),
 * document CRUD, atomic file swapping to prevent corruption, and fast lookups.
 */
class LocalStorageEngine {
  constructor(baseDir = config.paths.data) {
    this.baseDir = path.resolve(baseDir);
    this._ensureDirectories();
  }

  _ensureDirectories() {
    const dirs = [
      this.baseDir,
      config.paths.indexes,
      config.paths.cache,
      config.paths.snapshots,
      config.paths.imports,
      config.paths.seeds,
      config.paths.dictionaries,
      path.join(this.baseDir, 'collections')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  _getCollectionDir(collectionName) {
    const dir = path.join(this.baseDir, 'collections', collectionName);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  _getDocumentPath(collectionName, docId) {
    // Sanitize docId to prevent path traversal
    const safeDocId = String(docId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this._getCollectionDir(collectionName), `${safeDocId}.json`);
  }

  /**
   * Atomic file write using temporary file and atomic rename
   */
  _atomicWrite(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Save or overwrite a document
   */
  set(collectionName, docId, data) {
    if (!docId) throw new Error('docId is required');
    const filePath = this._getDocumentPath(collectionName, docId);
    const record = {
      ...data,
      id: docId,
      _localUpdatedAt: new Date().toISOString()
    };
    this._atomicWrite(filePath, record);
    return record;
  }

  /**
   * Retrieve a document by ID
   */
  get(collectionName, docId) {
    if (!docId) return null;
    const filePath = this._getDocumentPath(collectionName, docId);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[LocalStorageEngine] Error reading document ${collectionName}/${docId}:`, err.message);
      return null;
    }
  }

  /**
   * Delete a document
   */
  delete(collectionName, docId) {
    if (!docId) return false;
    const filePath = this._getDocumentPath(collectionName, docId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * List all documents in a collection
   */
  getAll(collectionName, filterFn = null) {
    const dir = this._getCollectionDir(collectionName);
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const results = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf8');
        const doc = JSON.parse(raw);
        if (!filterFn || filterFn(doc)) {
          results.push(doc);
        }
      } catch (err) {
        console.warn(`[LocalStorageEngine] Error parsing ${file}:`, err.message);
      }
    }
    return results;
  }

  /**
   * Batch upsert documents
   */
  batchSet(collectionName, documents) {
    const saved = [];
    for (const doc of documents) {
      if (doc && doc.id) {
        saved.push(this.set(collectionName, doc.id, doc));
      }
    }
    return saved;
  }

  /**
   * Count documents in collection
   */
  count(collectionName) {
    const dir = this._getCollectionDir(collectionName);
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter(f => f.endsWith('.json')).length;
  }

  /**
   * Clear an entire collection
   */
  clearCollection(collectionName) {
    const dir = this._getCollectionDir(collectionName);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  }

  /**
   * Create a full snapshot of all collections
   */
  createSnapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFile = path.join(config.paths.snapshots, `snapshot-${timestamp}.json`);
    const collectionsDir = path.join(this.baseDir, 'collections');
    const snapshotData = {
      timestamp: new Date().toISOString(),
      collections: {}
    };

    if (fs.existsSync(collectionsDir)) {
      const collections = fs.readdirSync(collectionsDir);
      for (const col of collections) {
        snapshotData.collections[col] = this.getAll(col);
      }
    }

    this._atomicWrite(snapshotFile, snapshotData);
    return { snapshotFile, timestamp, collectionCount: Object.keys(snapshotData.collections).length };
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(snapshotPath) {
    if (!fs.existsSync(snapshotPath)) throw new Error(`Snapshot not found: ${snapshotPath}`);
    const raw = fs.readFileSync(snapshotPath, 'utf8');
    const data = JSON.parse(raw);

    for (const [colName, docs] of Object.entries(data.collections || {})) {
      this.clearCollection(colName);
      this.batchSet(colName, docs);
    }
    return { restored: true, collections: Object.keys(data.collections || {}) };
  }
}

// Export singleton instance
const localStorageEngine = new LocalStorageEngine();

module.exports = {
  LocalStorageEngine,
  localStorageEngine
};
