'use strict';

const { invertedIndex } = require('./invertedIndex');
const { localStorageEngine } = require('../../services/storage/localStorageEngine');
const TextNormalizer = require('../nlp/normalizer');
const Tokenizer = require('../nlp/tokenizer');
const Lemmatizer = require('../nlp/lemmatizer');
const { spellChecker } = require('../nlp/spellChecker');
const SimilarityMetrics = require('../nlp/similarity');
const config = require('../../../config/app');

/**
 * LRUCache
 * Bounded in-memory query cache with LRU eviction policy.
 */
class LRUCache {
  constructor(capacity = config.engine.lruCacheCapacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (first item in map)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * HybridSearchEngine
 * Multi-stage candidate retrieval combining:
 * 1. Exact phrase & question pattern matching
 * 2. BM25 statistical full-text inverted index search
 * 3. Spell correction & query expansion
 * 4. Fuzzy term matching (Damerau-Levenshtein)
 * 5. Entity overlap & context-aware boosting
 * 6. Transparent explanation generation
 */
class HybridSearchEngine {
  constructor() {
    this.index = invertedIndex;
    this.cache = new LRUCache(config.engine.lruCacheCapacity);
    this.collectionName = 'knowledge';
  }

  /**
   * Main search method
   * @param {string} query - Raw user query
   * @param {Object} options - { domainFilter: null, language: 'en', context: {}, topK: 5 }
   * @returns {Promise<Array<{ record: Object, score: number, confidence: number, explanation: Object }>>}
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    if (!query || typeof query !== 'string') return [];

    const {
      domainFilter = null,
      language = 'en',
      context = {},
      topK = 5
    } = options;

    const cacheKey = `${query.toLowerCase().trim()}|${domainFilter || ''}|${language}|${context.lastTopic || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const normalizedQuery = TextNormalizer.normalize(query);
    const rawTokens = Tokenizer.tokenize(normalizedQuery, { removeStopwords: false });
    const contentTokens = Tokenizer.tokenize(normalizedQuery, { removeStopwords: true, minLength: 2 });
    const lemmaTokens = Lemmatizer.lemmatizeTokens(contentTokens);

    // 1. Check for spelling corrections if needed
    const { corrected, hasCorrection } = spellChecker.correctSentence(normalizedQuery);
    const correctedTokens = hasCorrection
      ? Lemmatizer.lemmatizeTokens(Tokenizer.tokenize(corrected, { removeStopwords: true, minLength: 2 }))
      : [];

    // Search terms pool: original lemmas + corrected lemmas
    const searchTerms = Array.from(new Set([...lemmaTokens, ...correctedTokens]));

    // 2. Stage 1: Fast BM25 candidate retrieval from inverted index
    const bm25Candidates = this.index.searchBM25(searchTerms, {
      topK: Math.max(20, topK * 4),
      domainFilter
    });

    // 3. Stage 2: Direct pattern matching against all knowledge records
    const allRecords = localStorageEngine.getAll(this.collectionName);
    const candidateMap = new Map();

    // Map BM25 candidates first
    for (const cand of bm25Candidates) {
      const fullDoc = localStorageEngine.get(this.collectionName, cand.docId);
      if (fullDoc && fullDoc.verificationStatus !== 'rejected') {
        candidateMap.set(cand.docId, {
          record: fullDoc,
          bm25Score: cand.score,
          exactMatch: 0,
          phraseMatch: 0,
          entityOverlap: 0,
          contextBoost: 0,
          matchedKeywords: []
        });
      }
    }

    // Direct scan for exact matches or question patterns
    const queryLower = normalizedQuery.toLowerCase().trim();
    for (const doc of allRecords) {
      if (doc.verificationStatus === 'rejected') continue;
      if (domainFilter && doc.domain !== domainFilter) continue;
      if (language && doc.language && doc.language !== language) continue;

      let exactScore = 0;
      let phraseScore = 0;

      // Check title match
      if (doc.title && doc.title.toLowerCase().trim() === queryLower) {
        exactScore = 1.0;
      }

      // Check questionPatterns match
      if (Array.isArray(doc.questionPatterns)) {
        for (const pattern of doc.questionPatterns) {
          const patLower = TextNormalizer.normalize(pattern).toLowerCase().trim();
          if (patLower === queryLower) {
            exactScore = 1.0;
            break;
          } else if (patLower.includes(queryLower) || queryLower.includes(patLower)) {
            phraseScore = Math.max(phraseScore, 0.85);
          }
        }
      }

      if (exactScore > 0 || phraseScore > 0) {
        if (!candidateMap.has(doc.id)) {
          candidateMap.set(doc.id, {
            record: doc,
            bm25Score: 0,
            exactMatch: exactScore,
            phraseMatch: phraseScore,
            entityOverlap: 0,
            contextBoost: 0,
            matchedKeywords: []
          });
        } else {
          const cand = candidateMap.get(doc.id);
          cand.exactMatch = Math.max(cand.exactMatch, exactScore);
          cand.phraseMatch = Math.max(cand.phraseMatch, phraseScore);
        }
      }
    }

    // 4. Multi-factor Scoring and Re-ranking
    const scoredResults = [];
    const maxBM25 = bm25Candidates.length > 0 ? Math.max(...bm25Candidates.map(c => c.score), 4.0) : 4.0;

    for (const [, cand] of candidateMap.entries()) {
      const doc = cand.record;

      // Normalized BM25 score (0.0 to 1.0)
      const normBM25 = Math.min(1.0, cand.bm25Score / maxBM25);

      // Entity overlap
      const docEntities = Array.isArray(doc.entities) ? doc.entities : [];
      const entityOverlapScore = SimilarityMetrics.entityOverlap(rawTokens, docEntities);
      cand.entityOverlap = entityOverlapScore;

      // Matched keywords tracking
      const matched = [];
      const docKeywords = new Set([
        ...(doc.keywords || []).map(k => k.toLowerCase()),
        ...(doc.entities || []).map(e => e.toLowerCase())
      ]);

      for (const term of searchTerms) {
        if (docKeywords.has(term)) {
          matched.push(term);
        }
      }
      cand.matchedKeywords = matched;

      // Contextual topic boost (if current conversation topic matches document topic)
      if (context.lastTopic && doc.topic && doc.topic.toLowerCase() === context.lastTopic.toLowerCase()) {
        cand.contextBoost = 0.15;
      }
      if (context.lastEntity && doc.entities && doc.entities.includes(context.lastEntity.toLowerCase())) {
        cand.contextBoost = Math.max(cand.contextBoost, 0.20);
      }

      // Verification confidence weight
      const verifiedWeight = doc.verificationStatus === 'verified' ? 1.0 : 0.7;

      // Combined Final Score Calculation:
      let finalScore = 0;
      if (cand.exactMatch > 0) {
        finalScore = 0.95 + (0.05 * normBM25);
      } else if (cand.phraseMatch > 0) {
        finalScore = (cand.phraseMatch * 0.6) + (normBM25 * 0.3) + (cand.contextBoost * 0.1);
      } else if (matched.length > 0) {
        const termCoverage = matched.length / Math.max(1, searchTerms.length);
        if (searchTerms.length >= 3 && matched.length < 2 && cand.bm25Score < 3.0) {
          finalScore = 0.0;
        } else {
          finalScore = (normBM25 * 0.50) +
                       (cand.entityOverlap * 0.20) +
                       (cand.contextBoost * 0.15) +
                       (termCoverage * 0.15);
        }
      } else {
        // Zero matches on significant terms: reject candidate
        finalScore = 0.0;
      }

      finalScore = Math.min(1.0, finalScore * verifiedWeight);
      const confidence = Math.round(finalScore * 100) / 100;

      scoredResults.push({
        record: doc,
        score: Math.round(finalScore * 1000) / 1000,
        confidence,
        explanation: {
          strategy: cand.exactMatch > 0 ? 'Exact Question Pattern' : (cand.phraseMatch > 0 ? 'Phrase Match' : 'BM25 Hybrid'),
          matchedKeywords: cand.matchedKeywords,
          bm25Score: Math.round(cand.bm25Score * 100) / 100,
          exactMatch: cand.exactMatch > 0,
          phraseMatch: cand.phraseMatch > 0,
          contextBoostApplied: cand.contextBoost > 0,
          latencyMs: Date.now() - startTime
        }
      });
    }

    // Sort by score DESC
    scoredResults.sort((a, b) => b.score - a.score);
    const topResults = scoredResults.slice(0, topK);

    // Save to LRU cache
    this.cache.set(cacheKey, topResults);
    return topResults;
  }
}

const hybridSearchEngine = new HybridSearchEngine();

module.exports = {
  HybridSearchEngine,
  hybridSearchEngine,
  LRUCache
};
