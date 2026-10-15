'use strict';

/**
 * Curated dictionary of irregular lemmas: verbs, nouns, adjectives
 */
const IRREGULAR_LEMMAS = {
  // Verbs
  'am': 'be', 'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be', 'been': 'be', 'being': 'be',
  'has': 'have', 'had': 'have', 'having': 'have',
  'does': 'do', 'did': 'do', 'done': 'do', 'doing': 'do',
  'goes': 'go', 'went': 'go', 'gone': 'go', 'going': 'go',
  'ran': 'run', 'running': 'run', 'runs': 'run',
  'wrote': 'write', 'written': 'write', 'writing': 'write', 'writes': 'write',
  'read': 'read', 'reading': 'read', 'reads': 'read',
  'spoke': 'speak', 'spoken': 'speak', 'speaking': 'speak',
  'took': 'take', 'taken': 'take', 'taking': 'take', 'takes': 'take',
  'made': 'make', 'making': 'make', 'makes': 'make',
  'knew': 'know', 'known': 'know', 'knowing': 'know', 'knows': 'know',
  'thought': 'think', 'thinking': 'think', 'thinks': 'think',
  'saw': 'see', 'seen': 'see', 'seeing': 'see', 'sees': 'see',
  'came': 'come', 'coming': 'come', 'comes': 'come',
  'gave': 'give', 'given': 'give', 'giving': 'give', 'gives': 'give',
  'found': 'find', 'finding': 'find', 'finds': 'find',
  'told': 'tell', 'telling': 'tell', 'tells': 'tell',
  'became': 'become', 'becoming': 'become', 'becomes': 'become',
  'showed': 'show', 'shown': 'show', 'showing': 'show', 'shows': 'show',
  'left': 'leave', 'leaving': 'leave', 'leaves': 'leave',
  'felt': 'feel', 'feeling': 'feel', 'feels': 'feel',
  'put': 'put', 'putting': 'put', 'puts': 'put',
  'brought': 'bring', 'bringing': 'bring', 'brings': 'bring',
  'began': 'begin', 'begun': 'begin', 'beginning': 'begin', 'begins': 'begin',
  'kept': 'keep', 'keeping': 'keep', 'keeps': 'keep',
  'held': 'hold', 'holding': 'hold', 'holds': 'hold',
  'bought': 'buy', 'buying': 'buy', 'buys': 'buy',
  'built': 'build', 'building': 'build', 'builds': 'build',
  'understood': 'understand', 'understanding': 'understand', 'understands': 'understand',
  'meant': 'mean', 'meaning': 'mean', 'means': 'mean',
  'computed': 'compute', 'computing': 'compute', 'computes': 'compute',
  'programmed': 'program', 'programming': 'program', 'programs': 'program',
  'queried': 'query', 'querying': 'query', 'queries': 'query',

  // Nouns
  'children': 'child', 'men': 'man', 'women': 'woman', 'people': 'person',
  'mice': 'mouse', 'feet': 'foot', 'teeth': 'tooth', 'geese': 'goose',
  'oxen': 'ox', 'matrices': 'matrix', 'vertices': 'vertex', 'indices': 'index',
  'criteria': 'criterion', 'phenomena': 'phenomenon', 'data': 'data',
  'analyses': 'analysis', 'hypotheses': 'hypothesis', 'theses': 'thesis',
  'databases': 'database', 'servers': 'server', 'queries': 'query',
  'entities': 'entity', 'properties': 'property', 'categories': 'category',

  // Adjectives
  'better': 'good', 'best': 'good',
  'worse': 'bad', 'worst': 'bad',
  'more': 'many', 'most': 'many',
  'less': 'little', 'least': 'little',
  'further': 'far', 'furthest': 'far'
};

class Lemmatizer {
  /**
   * Lemmatize word to its canonical dictionary base form
   */
  static lemmatize(word) {
    if (!word || typeof word !== 'string') return '';
    const clean = word.toLowerCase().trim();

    // Check direct dictionary lookup
    if (IRREGULAR_LEMMAS[clean]) {
      return IRREGULAR_LEMMAS[clean];
    }

    // Rule-based morphological fallback
    if (clean.length > 4) {
      if (clean.endsWith('ies')) {
        return clean.slice(0, -3) + 'y';
      }
      if (clean.endsWith('es') && (clean.endsWith('ches') || clean.endsWith('shes') || clean.endsWith('sses') || clean.endsWith('xes') || clean.endsWith('zes'))) {
        return clean.slice(0, -2);
      }
      if (clean.endsWith('ing') && clean.length > 5) {
        const base = clean.slice(0, -3);
        // Double consonant reduction: running -> run, programming -> program
        if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
          return base.slice(0, -1);
        }
        return base;
      }
      if (clean.endsWith('ed') && clean.length > 4) {
        const base = clean.slice(0, -2);
        if (base.endsWith('i')) return base.slice(0, -1) + 'y';
        if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
          return base.slice(0, -1);
        }
        return base;
      }
      if (clean.endsWith('s') && !clean.endsWith('ss') && !clean.endsWith('us') && !clean.endsWith('is')) {
        return clean.slice(0, -1);
      }
    }

    return clean;
  }

  /**
   * Lemmatize an array of tokens
   */
  static lemmatizeTokens(tokens) {
    if (!Array.isArray(tokens)) return [];
    return tokens.map(t => Lemmatizer.lemmatize(t));
  }
}

module.exports = Lemmatizer;
