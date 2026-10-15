'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../../config/app');
const Tokenizer = require('../nlp/tokenizer');
const Lemmatizer = require('../nlp/lemmatizer');
const SimilarityMetrics = require('../nlp/similarity');

/**
 * InvertedIndex
 * High-performance, disk-persistent inverted index with BM25 ranking.
 */
class InvertedIndex {
  constructor(indexPath = null) {
    this.indexPath = indexPath || path.join(config.paths.indexes, 'inverted_index.json');
    // term -> Map<docId, { tf: number, positions: number[] }>
    this.postings = new Map();
    // docId -> { docLength: number, title: string, domain: string, topic: string }
    this.docMetadata = new Map();
    // term -> docFrequency
    this.docFrequencies = new Map();
    this.totalDocs = 0;
    this.avgDocLength = 0;
    this.totalLength = 0;
    this.version = 1;
    this.isDirty = false;
  }

  /**
   * Tokenize and lemmatize text into canonical index tokens
   */
  _extractIndexTokens(text) {
    if (!text) return [];
    const tokens = Tokenizer.tokenize(text, { removeStopwords: true, minLength: 2 });
    return Lemmatizer.lemmatizeTokens(tokens);
  }

  /**
   * Index or re-index a knowledge document
   */
  indexDocument(doc) {
    if (!doc || !doc.id) return;
    const docId = doc.id;

    // If document already exists, remove it first
    if (this.docMetadata.has(docId)) {
      this.removeDocument(docId);
    }

    // Extract terms from multiple document fields with field multipliers
    const termCounts = new Map();
    let docTokenCount = 0;

    const addTerms = (text, weight = 1.0) => {
      const tokens = this._extractIndexTokens(text);
      for (const token of tokens) {
        docTokenCount++;
        termCounts.set(token, (termCounts.get(token) || 0) + weight);
      }
    };

    // Index title with 2.5x weight
    addTerms(doc.title, 2.5);

    // Index question patterns with 2.0x weight
    if (Array.isArray(doc.questionPatterns)) {
      for (const p of doc.questionPatterns) {
        addTerms(p, 2.0);
      }
    }

    // Index keywords with 2.0x weight
    if (Array.isArray(doc.keywords)) {
      for (const kw of doc.keywords) {
        addTerms(kw, 2.0);
      }
    }

    // Index synonyms with 1.5x weight
    if (Array.isArray(doc.synonyms)) {
      for (const syn of doc.synonyms) {
        addTerms(syn, 1.5);
      }
    }

    // Index entities with 2.0x weight
    if (Array.isArray(doc.entities)) {
      for (const ent of doc.entities) {
        addTerms(ent, 2.0);
      }
    }

    // Index answer with 1.0x weight
    addTerms(doc.answer, 1.0);

    const docLength = Math.max(1, docTokenCount);
    this.docMetadata.set(docId, {
      docLength,
      title: doc.title,
      domain: doc.domain,
      topic: doc.topic,
      verificationStatus: doc.verificationStatus,
      confidence: doc.confidence || 0.95
    });

    for (const [term, tf] of termCounts.entries()) {
      if (!this.postings.has(term)) {
        this.postings.set(term, new Map());
      }
      this.postings.get(term).set(docId, { tf, positions: [] });
      this.docFrequencies.set(term, (this.docFrequencies.get(term) || 0) + 1);
    }

    this.totalDocs++;
    this.totalLength += docLength;
    this.avgDocLength = this.totalLength / this.totalDocs;
    this.isDirty = true;
  }

  /**
   * Alias for indexDocument
   */
  addDocument(doc) {
    return this.indexDocument(doc);
  }

  /**
   * Remove a document from index
   */
  removeDocument(docId) {
    const meta = this.docMetadata.get(docId);
    if (!meta) return;

    for (const [term, postingMap] of this.postings.entries()) {
      if (postingMap.has(docId)) {
        postingMap.delete(docId);
        const currentDF = this.docFrequencies.get(term) || 1;
        if (currentDF <= 1) {
          this.docFrequencies.delete(term);
          this.postings.delete(term);
        } else {
          this.docFrequencies.set(term, currentDF - 1);
        }
      }
    }

    this.totalDocs--;
    this.totalLength -= meta.docLength;
    this.avgDocLength = this.totalDocs > 0 ? this.totalLength / this.totalDocs : 0;
    this.docMetadata.delete(docId);
    this.isDirty = true;
  }

  /**
   * Calculate Robertson-Spärck Jones IDF for term
   */
  getIdf(term) {
    const df = this.docFrequencies.get(term) || 0;
    if (df === 0) return 0;
    return SimilarityMetrics.calculateIDF(this.totalDocs, df);
  }

  /**
   * BM25 search
   * @param {string|string[]} queryInput - Query string or preprocessed query tokens
   * @param {Object} options - { topK: 10, domainFilter: null, k1: 1.5, b: 0.75 }
   * @returns {Array<{ docId: string, score: number, meta: Object }>}
   */
  searchBM25(queryInput, options = {}) {
    if (!queryInput || this.totalDocs === 0) return [];

    const queryTokens = Array.isArray(queryInput)
      ? queryInput.map(t => Lemmatizer.lemmatize(String(t).toLowerCase()))
      : this._extractIndexTokens(queryInput);

    if (queryTokens.length === 0) return [];

    const {
      topK = 10,
      domainFilter = null,
      k1 = config.engine.bm25.k1,
      b = config.engine.bm25.b
    } = options;

    const candidateScores = new Map();
    const idfMap = new Map();

    for (const term of queryTokens) {
      idfMap.set(term, this.getIdf(term));
    }

    for (const term of queryTokens) {
      const termPostings = this.postings.get(term);
      if (!termPostings) continue;

      const idf = idfMap.get(term);
      if (idf <= 0) continue;

      for (const [docId, { tf }] of termPostings.entries()) {
        const meta = this.docMetadata.get(docId);
        if (!meta) continue;
        if (domainFilter && meta.domain !== domainFilter) continue;

        const docLen = meta.docLength;
        const lengthNorm = (1 - b) + b * (docLen / this.avgDocLength);
        const termScore = idf * ((tf * (k1 + 1)) / (tf + k1 * lengthNorm));

        candidateScores.set(docId, (candidateScores.get(docId) || 0) + termScore);
      }
    }

    const results = [];
    for (const [docId, score] of candidateScores.entries()) {
      results.push({
        docId,
        score: Math.round(score * 1000) / 1000,
        meta: this.docMetadata.get(docId)
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Save index to disk atomically with checksum
   */
  saveToDisk() {
    const serializedPostings = {};
    for (const [term, docMap] of this.postings.entries()) {
      serializedPostings[term] = Array.from(docMap.entries()).map(([docId, { tf }]) => [docId, tf]);
    }

    const indexPayload = {
      version: this.version,
      updatedAt: new Date().toISOString(),
      totalDocs: this.totalDocs,
      totalLength: this.totalLength,
      avgDocLength: this.avgDocLength,
      docMetadata: Array.from(this.docMetadata.entries()),
      postings: serializedPostings
    };

    const jsonStr = JSON.stringify(indexPayload);
    const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');

    const wrapper = {
      checksum: hash,
      payload: indexPayload
    };

    const tmpFile = `${this.indexPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(wrapper), 'utf8');
      fs.renameSync(tmpFile, this.indexPath);
      this.isDirty = false;
    } catch (err) {
      // If temporary file exists, clean up
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
      // Fallback: direct write if rename collided
      try {
        fs.writeFileSync(this.indexPath, JSON.stringify(wrapper), 'utf8');
        this.isDirty = false;
      } catch (_) {}
    }
  }

  /**
   * Load index from disk with corruption detection
   */
  loadFromDisk() {
    if (!fs.existsSync(this.indexPath)) return false;

    try {
      const raw = fs.readFileSync(this.indexPath, 'utf8');
      const data = JSON.parse(raw);

      // Verify checksum
      if (data.checksum && data.payload) {
        const computed = crypto.createHash('sha256').update(JSON.stringify(data.payload)).digest('hex');
        if (computed !== data.checksum) {
          console.error('[InvertedIndex] Checksum mismatch! Corrupt index detected.');
          return false;
        }
        return this._hydrate(data.payload);
      } else {
        return this._hydrate(data);
      }
    } catch (err) {
      console.error('[InvertedIndex] Error loading index from disk:', err.message);
      return false;
    }
  }

  _hydrate(payload) {
    this.totalDocs = payload.totalDocs || 0;
    this.totalLength = payload.totalLength || 0;
    this.avgDocLength = payload.avgDocLength || 0;
    this.version = payload.version || 1;

    this.docMetadata = new Map(payload.docMetadata || []);
    this.postings = new Map();
    this.docFrequencies = new Map();

    for (const [term, entries] of Object.entries(payload.postings || {})) {
      const postingMap = new Map();
      for (const [docId, tf] of entries) {
        postingMap.set(docId, { tf, positions: [] });
      }
      this.postings.set(term, postingMap);
      this.docFrequencies.set(term, postingMap.size);
    }

    this.isDirty = false;
    return true;
  }
}

const invertedIndex = new InvertedIndex();

module.exports = {
  InvertedIndex,
  invertedIndex
};
