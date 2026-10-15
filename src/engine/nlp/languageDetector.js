'use strict';

const NGramGenerator = require('./ngrams');

/**
 * Deterministic character trigram and stopword profile-based language detector.
 */
const LANGUAGE_PROFILES = {
  en: {
    name: 'English',
    stopwords: new Set(['the', 'and', 'is', 'in', 'it', 'you', 'that', 'was', 'for', 'are', 'with', 'as', 'at', 'be', 'this', 'have', 'from']),
    topTrigrams: new Set(['the', 'and', 'ing', 'ion', 'tio', 'ent', 'ati', 'for', 'her', 'ter', 'hat', 'tha', 'ere', 'ate', 'his', 'con'])
  },
  es: {
    name: 'Spanish',
    stopwords: new Set(['el', 'la', 'de', 'que', 'en', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'es']),
    topTrigrams: new Set(['que', 'del', 'ent', 'ion', 'ado', 'par', 'con', 'tra', 'aci', 'cio', 'por', 'ara', 'ien', 'nte', 'est'])
  },
  fr: {
    name: 'French',
    stopwords: new Set(['le', 'de', 'un', 'à', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'qui', 'sur', 'se', 'pas', 'plus', 'des', 'les']),
    topTrigrams: new Set(['les', 'des', 'ent', 'que', 'tion', 'qui', 'ous', 'ion', 'eme', 'our', 'dan', 'ans', 'pou', 'our', 'par'])
  },
  de: {
    name: 'German',
    stopwords: new Set(['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein']),
    topTrigrams: new Set(['der', 'ein', 'ich', 'den', 'und', 'sch', 'cht', 'die', 'nde', 'ter', 'ver', 'das', 'ung', 'gen', 'hen'])
  }
};

class LanguageDetector {
  /**
   * Detect language of given text
   * @param {string} text - Input text
   * @returns {{ language: string, name: string, confidence: number }}
   */
  static detect(text) {
    if (!text || typeof text !== 'string') {
      return { language: 'en', name: 'English', confidence: 1.0 };
    }

    const clean = text.toLowerCase().trim();
    const tokens = clean.split(/\s+/).map(t => t.replace(/[^\p{L}]/gu, '')).filter(t => t.length > 0);
    const trigrams = NGramGenerator.getCharNGrams(clean, 3, false);

    const scores = {};
    for (const [lang, profile] of Object.entries(LANGUAGE_PROFILES)) {
      let stopwordMatches = 0;
      let trigramMatches = 0;

      for (const token of tokens) {
        if (profile.stopwords.has(token)) stopwordMatches++;
      }

      for (const tg of trigrams) {
        if (profile.topTrigrams.has(tg)) trigramMatches++;
      }

      const swScore = tokens.length > 0 ? (stopwordMatches / tokens.length) * 3 : 0;
      const tgScore = trigrams.length > 0 ? (trigramMatches / trigrams.length) : 0;
      scores[lang] = swScore + tgScore;
    }

    let topLang = 'en';
    let maxScore = -1;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        topLang = lang;
      }
    }

    // Default to 'en' if low signal
    if (maxScore <= 0.05) {
      topLang = 'en';
    }

    const profile = LANGUAGE_PROFILES[topLang];
    const confidence = Math.min(0.98, Math.max(0.5, Math.round((maxScore / 1.5) * 100) / 100));

    return {
      language: topLang,
      name: profile ? profile.name : 'Unknown',
      confidence
    };
  }
}

module.exports = LanguageDetector;
