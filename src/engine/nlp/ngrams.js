'use strict';

class NGramGenerator {
  /**
   * Generate word n-grams from array of tokens
   * @param {string[]} tokens - Array of words
   * @param {number} n - N-gram order (1=unigram, 2=bigram, 3=trigram, etc.)
   * @returns {string[]} - Array of n-gram strings joined by space
   */
  static getWordNGrams(tokens, n = 2) {
    if (!Array.isArray(tokens) || tokens.length < n || n < 1) return [];
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  /**
   * Generate all word n-grams from minN to maxN
   */
  static getAllWordNGrams(tokens, minN = 1, maxN = 3) {
    const results = [];
    for (let n = minN; n <= maxN; n++) {
      results.push(...NGramGenerator.getWordNGrams(tokens, n));
    }
    return results;
  }

  /**
   * Generate character n-grams (q-grams) from a word
   * E.g. "database", n=3 -> ["$$d", "$da", "dat", "ata", "tab", "aba", "bas", "ase", "se$", "e$$"]
   */
  static getCharNGrams(text, n = 3, pad = true) {
    if (!text || typeof text !== 'string') return [];
    const clean = text.toLowerCase();
    const str = pad ? '$'.repeat(n - 1) + clean + '$'.repeat(n - 1) : clean;
    if (str.length < n) return [str];

    const ngrams = [];
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.push(str.substring(i, i + n));
    }
    return ngrams;
  }
}

module.exports = NGramGenerator;
