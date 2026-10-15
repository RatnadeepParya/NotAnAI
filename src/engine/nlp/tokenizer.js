'use strict';

const TextNormalizer = require('./normalizer');

const DEFAULT_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could', 'couldn\'t',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'i', 'i\'d', 'i\'ll',
  'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no',
  'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d',
  'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than',
  'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
  'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were',
  'weren\'t', 'while', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

class Tokenizer {
  /**
   * Tokenize string into array of word tokens
   * @param {string} text - Input text
   * @param {Object} options - { removeStopwords: false, minLength: 1 }
   * @returns {string[]} - Array of tokens
   */
  static tokenize(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const {
      removeStopwords = false,
      minLength = 1,
      customStopwords = DEFAULT_STOPWORDS
    } = options;

    const normalized = TextNormalizer.normalize(text);

    // Regex matching words, numbers, and identifiers (e.g. c++, c#, node.js, 100km, etc.)
    const matches = normalized.match(/[a-z0-9]+(?:[-_'][a-z0-9]+)*|\b[a-z0-9]+\b/gi) || [];

    const tokens = [];
    for (const match of matches) {
      const clean = match.toLowerCase();
      if (clean.length < minLength) continue;
      if (removeStopwords && customStopwords.has(clean)) continue;
      tokens.push(clean);
    }

    return tokens;
  }

  /**
   * Tokenize with token offsets and positions
   */
  static tokenizeWithPositions(text) {
    if (!text || typeof text !== 'string') return [];
    const normalized = TextNormalizer.normalize(text, { lowercase: true });
    const regex = /[a-z0-9]+(?:[-_'][a-z0-9]+)*|\b[a-z0-9]+\b/gi;
    const tokens = [];
    let match;

    let index = 0;
    while ((match = regex.exec(normalized)) !== null) {
      tokens.push({
        token: match[0],
        start: match.index,
        end: match.index + match[0].length,
        position: index++
      });
    }

    return tokens;
  }

  static getStopwords() {
    return DEFAULT_STOPWORDS;
  }
}

module.exports = Tokenizer;
