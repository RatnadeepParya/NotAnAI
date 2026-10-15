'use strict';

const SpellChecker = require('./spellChecker').SpellChecker;
const NGramGenerator = require('./ngrams');

/**
 * SimilarityMetrics
 * Comprehensive collection of deterministic text and vector similarity algorithms.
 */
class SimilarityMetrics {
  /**
   * Jaccard Similarity between two sets or token arrays
   * J(A, B) = |A ∩ B| / |A ∪ B|
   */
  static jaccard(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return 0;
    if (arr1.length === 0 && arr2.length === 0) return 1.0;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    let intersectionSize = 0;
    for (const item of set1) {
      if (set2.has(item)) intersectionSize++;
    }

    const unionSize = set1.size + set2.size - intersectionSize;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
  }

  /**
   * Character N-Gram Jaccard similarity between two strings
   */
  static charNGramSimilarity(s1, s2, n = 3) {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    const ng1 = NGramGenerator.getCharNGrams(s1, n, true);
    const ng2 = NGramGenerator.getCharNGrams(s2, n, true);
    return SimilarityMetrics.jaccard(ng1, ng2);
  }

  /**
   * Cosine similarity between two numerical vectors
   */
  static cosineVector(vec1, vec2) {
    if (!Array.isArray(vec1) || !Array.isArray(vec2) || vec1.length !== vec2.length) return 0;

    let dot = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dot += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    if (mag1 === 0 || mag2 === 0) return 0;
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Cosine similarity between two sparse term-frequency maps
   */
  static cosineSparse(tfMap1, tfMap2) {
    let dot = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const [term, val] of tfMap1.entries()) {
      mag1 += val * val;
      if (tfMap2.has(term)) {
        dot += val * tfMap2.get(term);
      }
    }

    for (const [, val] of tfMap2.entries()) {
      mag2 += val * val;
    }

    if (mag1 === 0 || mag2 === 0) return 0;
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Okapi BM25 Score calculation for a single document
   * @param {string[]} queryTokens - Query terms
   * @param {Object} doc - Document representation { termFreqs: Map<term, count>, docLength: number }
   * @param {Map<term, idf>} idfMap - Inverse Document Frequency table
   * @param {number} avgDocLength - Average document length in corpus
   * @param {number} k1 - Term frequency saturation parameter (default 1.5)
   * @param {number} b - Length penalization parameter (default 0.75)
   */
  static bm25(queryTokens, doc, idfMap, avgDocLength, k1 = 1.5, b = 0.75) {
    if (!Array.isArray(queryTokens) || !doc || !idfMap) return 0;

    const docLength = doc.docLength || 1;
    const avgLen = Math.max(1, avgDocLength);
    const lengthNorm = (1 - b) + b * (docLength / avgLen);

    let score = 0;

    for (const term of queryTokens) {
      const tf = doc.termFreqs.get(term) || 0;
      if (tf === 0) continue;

      const idf = idfMap.get(term) || 0;
      // Okapi BM25 TF formula: (tf * (k1 + 1)) / (tf + k1 * ((1 - b) + b * (docLength / avgLen)))
      const tfWeight = (tf * (k1 + 1)) / (tf + k1 * lengthNorm);
      score += idf * tfWeight;
    }

    return score;
  }

  /**
   * Calculate standard Robertson-Spärck Jones IDF
   * IDF(q) = ln((N - n(q) + 0.5) / (n(q) + 0.5) + 1)
   */
  static calculateIDF(totalDocs, docFrequency) {
    return Math.log(((totalDocs - docFrequency + 0.5) / (docFrequency + 0.5)) + 1);
  }

  /**
   * Exact phrase matching score
   * Checks if target phrase exists verbatim in text, returns boosted score
   */
  static exactPhraseMatch(phrase, text) {
    if (!phrase || !text) return 0;
    const cleanPhrase = phrase.toLowerCase().trim();
    const cleanText = text.toLowerCase().trim();

    if (cleanText === cleanPhrase) return 1.0;
    if (cleanText.includes(cleanPhrase)) {
      // Fraction of total text occupied by phrase
      return 0.7 + (0.3 * (cleanPhrase.length / cleanText.length));
    }
    return 0;
  }

  /**
   * Weighted keyword overlap
   * @param {Map<string, number>} queryWeights - keyword -> importance weight
   * @param {Set<string>|Array<string>} docKeywords - keywords in document
   */
  static weightedKeywordOverlap(queryWeights, docKeywords) {
    if (!queryWeights || queryWeights.size === 0) return 0;
    const docSet = docKeywords instanceof Set ? docKeywords : new Set(docKeywords);

    let matchedWeight = 0;
    let totalWeight = 0;

    for (const [kw, weight] of queryWeights.entries()) {
      totalWeight += weight;
      if (docSet.has(kw.toLowerCase())) {
        matchedWeight += weight;
      }
    }

    return totalWeight === 0 ? 0 : matchedWeight / totalWeight;
  }

  /**
   * Entity overlap score between query recognized entities and document entities
   */
  static entityOverlap(queryEntities, docEntities) {
    if (!Array.isArray(queryEntities) || !Array.isArray(docEntities)) return 0;
    if (queryEntities.length === 0) return 0;
    return SimilarityMetrics.jaccard(
      queryEntities.map(e => e.toLowerCase()),
      docEntities.map(e => e.toLowerCase())
    );
  }
}

module.exports = SimilarityMetrics;
