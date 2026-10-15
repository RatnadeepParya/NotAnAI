'use strict';

const Tokenizer = require('./tokenizer');
const Lemmatizer = require('./lemmatizer');
const NGramGenerator = require('./ngrams');

class KeywordExtractor {
  /**
   * Extract ranked keywords from text
   * @param {string} text - Input text
   * @param {Object} options - { maxKeywords: 8, minLength: 3 }
   * @returns {Array<{ term: string, weight: number }>}
   */
  static extractKeywords(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const {
      maxKeywords = 8,
      minLength = 3
    } = options;

    const tokens = Tokenizer.tokenize(text, { removeStopwords: true, minLength });
    if (tokens.length === 0) return [];

    const termFreqs = new Map();
    const positionBoosts = new Map();

    tokens.forEach((token, idx) => {
      const lemma = Lemmatizer.lemmatize(token);
      termFreqs.set(lemma, (termFreqs.get(lemma) || 0) + 1);

      // Positional weight: terms in the first 30% of text receive a modest boost
      const posWeight = 1.0 + Math.max(0, 0.5 * (1 - (idx / tokens.length)));
      positionBoosts.set(lemma, Math.max(positionBoosts.get(lemma) || 1, posWeight));
    });

    const totalWords = tokens.length;
    const scored = [];

    for (const [term, freq] of termFreqs.entries()) {
      // Sublinear TF calculation
      const tf = 1 + Math.log(freq);
      const posBoost = positionBoosts.get(term) || 1.0;
      // Length bonus for technical / domain terms (> 5 chars)
      const lenBonus = term.length > 5 ? 1.15 : 1.0;

      const score = (tf / totalWords) * posBoost * lenBonus;
      scored.push({ term, weight: Math.round(score * 1000) / 1000 });
    }

    scored.sort((a, b) => b.weight - a.weight);
    return scored.slice(0, maxKeywords);
  }

  /**
   * Extract multi-word keyphrases (e.g. "relational database", "operating system")
   */
  static extractKeyphrases(text, maxPhrases = 5) {
    if (!text) return [];

    // Extract noun phrase candidates using tokenization preserving sentence structure
    const allTokens = Tokenizer.tokenize(text, { removeStopwords: false });
    const stopwords = Tokenizer.getStopwords();

    const phrases = [];
    let currentPhrase = [];

    for (const token of allTokens) {
      if (stopwords.has(token)) {
        if (currentPhrase.length >= 2) {
          phrases.push(currentPhrase.join(' '));
        }
        currentPhrase = [];
      } else {
        currentPhrase.push(token);
        if (currentPhrase.length > 4) {
          phrases.push(currentPhrase.slice(0, 4).join(' '));
          currentPhrase = currentPhrase.slice(1);
        }
      }
    }

    if (currentPhrase.length >= 2) {
      phrases.push(currentPhrase.join(' '));
    }

    // Count phrase frequencies
    const counts = new Map();
    for (const phrase of phrases) {
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([phrase]) => phrase);
  }

  /**
   * Extract recognized entity candidates from text
   */
  static extractEntityCandidates(text) {
    if (!text) return [];

    const entities = new Set();

    // 1. Capitalized words/phrases in original text (Named Entities)
    const capitalizedMatches = text.match(/\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*\b/g) || [];
    for (const match of capitalizedMatches) {
      const clean = match.trim();
      // Skip sentence starter false positives if single common word
      if (clean.split(/\s+/).length > 1 || clean.length > 3) {
        entities.add(clean.toLowerCase());
      }
    }

    // 2. Technical identifiers (camelCase, snake_case, acronyms)
    const techMatches = text.match(/\b(?:[a-z]+[A-Z][a-z]+|[A-Z]{2,}|[a-z]+_[a-z0-9_]+)\b/g) || [];
    for (const match of techMatches) {
      entities.add(match.toLowerCase());
    }

    return Array.from(entities);
  }
}

module.exports = KeywordExtractor;
