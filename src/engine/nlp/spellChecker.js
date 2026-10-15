'use strict';

const NGramGenerator = require('./ngrams');

/**
 * SpellChecker
 * Deterministic spelling correction utilizing:
 * 1. Levenshtein distance (insertion, deletion, substitution)
 * 2. Damerau-Levenshtein distance (including adjacent transposition)
 * 3. Character n-gram index for sub-linear candidate generation
 * 4. Frequency-weighted ranking of candidate corrections
 */
class SpellChecker {
  constructor() {
    // word -> frequency count
    this.dictionary = new Map();
    // qgram -> Set of words
    this.qgramIndex = new Map();
    this.q = 3;

    // Pre-seed with dictionary lemmas and fundamental vocabulary
    const Lemmatizer = require('./lemmatizer');
    const Tokenizer = require('./tokenizer');
    for (const w of Tokenizer.getStopwords()) {
      this.addWord(w, 20);
    }

    const commonBaseWords = [
      'make', 'made', 'take', 'took', 'time', 'year', 'secret', 'recipe', 'ancient',
      'space', 'world', 'planet', 'earth', 'system', 'water', 'light', 'high', 'highest',
      'mountain', 'speed', 'formula', 'chemical', 'first', 'second', 'name', 'know',
      'work', 'works', 'write', 'written', 'code', 'build', 'using', 'create', 'learn'
    ];
    for (const w of commonBaseWords) {
      this.addWord(w, 15);
    }
  }

  /**
   * Calculate standard Levenshtein distance
   */
  static levenshteinDistance(s1, s2) {
    if (s1 === s2) return 0;
    if (!s1) return s2.length;
    if (!s2) return s1.length;

    const m = s1.length;
    const n = s2.length;
    let prevRow = new Array(n + 1);
    let currRow = new Array(n + 1);

    for (let j = 0; j <= n; j++) prevRow[j] = j;

    for (let i = 1; i <= m; i++) {
      currRow[0] = i;
      const c1 = s1[i - 1];

      for (let j = 1; j <= n; j++) {
        const c2 = s2[j - 1];
        const cost = c1 === c2 ? 0 : 1;
        currRow[j] = Math.min(
          prevRow[j] + 1,      // deletion
          currRow[j - 1] + 1,  // insertion
          prevRow[j - 1] + cost // substitution
        );
      }

      for (let j = 0; j <= n; j++) prevRow[j] = currRow[j];
    }

    return prevRow[n];
  }

  /**
   * Calculate Damerau-Levenshtein distance (with transpositions)
   */
  static damerauLevenshteinDistance(source, target) {
    if (source === target) return 0;
    const sLen = source.length;
    const tLen = target.length;
    if (sLen === 0) return tLen;
    if (tLen === 0) return sLen;

    const matrix = Array.from({ length: sLen + 2 }, () => new Array(tLen + 2).fill(0));
    const maxDist = sLen + tLen;
    matrix[0][0] = maxDist;

    for (let i = 0; i <= sLen; i++) {
      matrix[i + 1][0] = maxDist;
      matrix[i + 1][1] = i;
    }
    for (let j = 0; j <= tLen; j++) {
      matrix[0][j + 1] = maxDist;
      matrix[1][j + 1] = j;
    }

    const lastRow = new Map();

    for (let i = 1; i <= sLen; i++) {
      let db = 0;
      for (let j = 1; j <= tLen; j++) {
        const i1 = lastRow.get(target[j - 1]) || 0;
        const j1 = db;
        let cost = 1;
        if (source[i - 1] === target[j - 1]) {
          cost = 0;
          db = j;
        }

        matrix[i + 1][j + 1] = Math.min(
          matrix[i][j] + cost,                      // substitution
          matrix[i + 1][j] + 1,                     // insertion
          matrix[i][j + 1] + 1,                     // deletion
          matrix[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // transposition
        );
      }
      lastRow.set(source[i - 1], i);
    }

    return matrix[sLen + 1][tLen + 1];
  }

  /**
   * Add word to vocabulary with frequency
   */
  addWord(word, frequency = 1) {
    if (!word || typeof word !== 'string') return;
    const clean = word.toLowerCase().trim();
    if (clean.length < 2) return;

    const currentFreq = this.dictionary.get(clean) || 0;
    this.dictionary.set(clean, currentFreq + frequency);

    // Index character q-grams
    const qgrams = NGramGenerator.getCharNGrams(clean, this.q, true);
    for (const qg of qgrams) {
      if (!this.qgramIndex.has(qg)) {
        this.qgramIndex.set(qg, new Set());
      }
      this.qgramIndex.get(qg).add(clean);
    }
  }

  /**
   * Seed vocabulary from words array or frequency map
   */
  loadVocabulary(words) {
    if (Array.isArray(words)) {
      for (const w of words) this.addWord(w, 1);
    } else if (typeof words === 'object') {
      for (const [w, freq] of Object.entries(words)) {
        this.addWord(w, freq);
      }
    }
  }

  /**
   * Find candidate corrections using character n-gram inverted index
   */
  _getCandidates(word, minOverlap = 0.2) {
    const qgrams = NGramGenerator.getCharNGrams(word, this.q, true);
    const candidateCounts = new Map();

    for (const qg of qgrams) {
      const matches = this.qgramIndex.get(qg);
      if (matches) {
        for (const candidate of matches) {
          candidateCounts.set(candidate, (candidateCounts.get(candidate) || 0) + 1);
        }
      }
    }

    const filtered = [];
    for (const [candidate, count] of candidateCounts.entries()) {
      const candQGrams = Math.max(1, candidate.length + this.q - 1);
      const jaccard = count / (qgrams.length + candQGrams - count);
      if (jaccard >= minOverlap) {
        filtered.push(candidate);
      }
    }

    return filtered;
  }

  /**
   * Suggest best corrections for a word
   * @param {string} word - Target word
   * @param {number} maxDistance - Maximum edit distance allowed (default 2)
   * @param {number} topK - Number of suggestions to return
   * @returns {Array<{ word: string, distance: number, score: number }>}
   */
  correct(word, maxDistance = 2, topK = 3) {
    if (!word) return [];
    const clean = word.toLowerCase().trim();

    // If word is exact match in dictionary, it's correct
    if (this.dictionary.has(clean)) {
      return [{ word: clean, distance: 0, score: 1.0, exact: true }];
    }

    // Get candidate pool
    let candidates = this._getCandidates(clean);
    if (candidates.length === 0 && this.dictionary.size < 5000) {
      // Fallback: check all dictionary keys if pool is small
      candidates = Array.from(this.dictionary.keys());
    }

    const scored = [];
    const totalWords = Math.max(1, this.dictionary.size);

    for (const cand of candidates) {
      // Quick length filter
      if (Math.abs(cand.length - clean.length) > maxDistance) continue;

      const dist = SpellChecker.damerauLevenshteinDistance(clean, cand);
      if (dist <= maxDistance) {
        const freq = this.dictionary.get(cand) || 1;
        // Frequency component (logarithmic smoothing)
        const freqScore = Math.log10(freq + 1) / Math.log10(totalWords + 10);
        // Distance penalty: dist 1 -> 0.8, dist 2 -> 0.5
        const distScore = 1.0 - (dist * 0.35);
        // Combined score
        const score = (distScore * 0.7) + (freqScore * 0.3);

        scored.push({ word: cand, distance: dist, score: Math.round(score * 1000) / 1000 });
      }
    }

    // Sort by score DESC, then distance ASC
    scored.sort((a, b) => b.score - a.score || a.distance - b.distance);
    return scored.slice(0, topK);
  }

  /**
   * Correct an entire sentence / query
   */
  correctSentence(sentence) {
    const Tokenizer = require('./tokenizer');
    const stopwords = Tokenizer.getStopwords();
    const tokens = sentence.split(/\s+/);
    let hasCorrection = false;
    const correctedTokens = tokens.map(token => {
      // Strip punctuation for checking
      const match = token.match(/^([^\w]*)(\w+)([^\w]*)$/);
      if (!match) return token;

      const [, prefix, word, suffix] = match;
      const lowerWord = word.toLowerCase();
      if (word.length <= 2 || !/^[a-zA-Z]+$/.test(word)) return token;
      if (stopwords.has(lowerWord)) return token;

      const suggestions = this.correct(word, 2, 1);
      if (suggestions.length > 0 && suggestions[0].distance > 0 && suggestions[0].distance <= 2) {
        hasCorrection = true;
        return `${prefix}${suggestions[0].word}${suffix}`;
      }
      return token;
    });

    return {
      corrected: correctedTokens.join(' '),
      hasCorrection
    };
  }
}

// Global singleton instance
const spellChecker = new SpellChecker();

module.exports = {
  SpellChecker,
  spellChecker
};
