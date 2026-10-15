'use strict';

/**
 * TextNormalizer
 * Deterministic Unicode, punctuation, and case normalization.
 */
class TextNormalizer {
  /**
   * Normalize input string
   * @param {string} text - Raw input text
   * @param {Object} options - Normalization options
   * @returns {string} - Clean normalized text
   */
  static normalize(text, options = {}) {
    if (!text || typeof text !== 'string') return '';

    const {
      lowercase = true,
      stripAccents = true,
      normalizePunctuation = true,
      collapseWhitespace = true
    } = options;

    let res = text.normalize('NFKC');

    if (stripAccents) {
      // Decompose and strip diacritical marks
      res = res.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    if (normalizePunctuation) {
      // Standardize smart quotes, apostrophes, dashes, ellipses
      res = res
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2013\u2014\u2015\u2212]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    }

    if (lowercase) {
      res = res.toLowerCase();
    }

    if (collapseWhitespace) {
      res = res.replace(/\s+/g, ' ').trim();
    }

    return res;
  }

  /**
   * Strip all punctuation, keeping letters, digits, and spaces
   */
  static stripPunctuation(text) {
    if (!text) return '';
    return text.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Split text into sentences deterministically
   */
  static splitSentences(text) {
    if (!text || typeof text !== 'string') return [];
    // Protect common abbreviations (Mr., Dr., e.g., i.e., etc., vs., St.)
    const protectedText = text
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\./gi, '$1__DOT__');

    // Split on sentence boundaries: ., !, ?, followed by whitespace or end
    const rawSentences = protectedText.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);

    return rawSentences
      .map(s => s.replace(/__DOT__/g, '.').trim())
      .filter(s => s.length > 0);
  }
}

module.exports = TextNormalizer;
