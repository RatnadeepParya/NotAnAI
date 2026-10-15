'use strict';

/**
 * PorterStemmer
 * Deterministic Porter Stemming Algorithm (Porter 1980) implemented in pure JavaScript.
 * Standard in Information Retrieval for term canonicalization.
 */
class PorterStemmer {
  static isConsonant(str, i) {
    const char = str[i];
    if (char === 'a' || char === 'e' || char === 'i' || char === 'o' || char === 'u') {
      return false;
    }
    if (char === 'y') {
      return i === 0 ? true : !PorterStemmer.isConsonant(str, i - 1);
    }
    return true;
  }

  static getMeasure(str) {
    let count = 0;
    let length = str.length;
    let i = 0;

    while (i < length) {
      if (!PorterStemmer.isConsonant(str, i)) break;
      i++;
    }
    i++;
    while (i < length) {
      while (i < length) {
        if (PorterStemmer.isConsonant(str, i)) break;
        i++;
      }
      i++;
      while (i < length) {
        if (!PorterStemmer.isConsonant(str, i)) break;
        i++;
      }
      i++;
      count++;
    }
    return count;
  }

  static containsVowel(str) {
    for (let i = 0; i < str.length; i++) {
      if (!PorterStemmer.isConsonant(str, i)) return true;
    }
    return false;
  }

  static endsWithDoubleConsonant(str) {
    const len = str.length;
    if (len < 2) return false;
    return str[len - 1] === str[len - 2] && PorterStemmer.isConsonant(str, len - 1);
  }

  static cvc(str) {
    const len = str.length;
    if (len < 3) return false;
    if (
      PorterStemmer.isConsonant(str, len - 1) &&
      !PorterStemmer.isConsonant(str, len - 2) &&
      PorterStemmer.isConsonant(str, len - 3)
    ) {
      const last = str[len - 1];
      return last !== 'w' && last !== 'x' && last !== 'y';
    }
    return false;
  }

  static stem(word) {
    if (!word || typeof word !== 'string' || word.length < 3) return word;
    let w = word.toLowerCase();

    // Step 1a
    if (w.endsWith('sses')) w = w.slice(0, -2);
    else if (w.endsWith('ies')) w = w.slice(0, -2);
    else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0, -1);

    // Step 1b
    let step1bExtra = false;
    if (w.endsWith('eed')) {
      if (PorterStemmer.getMeasure(w.slice(0, -3)) > 0) w = w.slice(0, -1);
    } else if (w.endsWith('ed')) {
      const stem = w.slice(0, -2);
      if (PorterStemmer.containsVowel(stem)) {
        w = stem;
        step1bExtra = true;
      }
    } else if (w.endsWith('ing')) {
      const stem = w.slice(0, -3);
      if (PorterStemmer.containsVowel(stem)) {
        w = stem;
        step1bExtra = true;
      }
    }

    if (step1bExtra) {
      if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) {
        w += 'e';
      } else if (PorterStemmer.endsWithDoubleConsonant(w)) {
        const last = w[w.length - 1];
        if (last !== 'l' && last !== 's' && last !== 'z') {
          w = w.slice(0, -1);
        }
      } else if (PorterStemmer.getMeasure(w) === 1 && PorterStemmer.cvc(w)) {
        w += 'e';
      }
    }

    // Step 1c
    if (w.endsWith('y')) {
      const stem = w.slice(0, -1);
      if (PorterStemmer.containsVowel(stem)) w = stem + 'i';
    }

    // Step 2
    const step2Map = [
      ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
      ['izer', 'ize'], ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'],
      ['eli', 'e'], ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'],
      ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'],
      ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble']
    ];
    for (const [suf, repl] of step2Map) {
      if (w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length);
        if (PorterStemmer.getMeasure(stem) > 0) w = stem + repl;
        break;
      }
    }

    // Step 3
    const step3Map = [
      ['icate', 'ic'], ['ative', ''], ['alize', 'al'], ['iciti', 'ic'],
      ['ical', 'ic'], ['ful', ''], ['ness', '']
    ];
    for (const [suf, repl] of step3Map) {
      if (w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length);
        if (PorterStemmer.getMeasure(stem) > 0) w = stem + repl;
        break;
      }
    }

    // Step 4
    const step4List = [
      'al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement',
      'ment', 'ent', 'ou', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize'
    ];
    for (const suf of step4List) {
      if (w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length);
        if (PorterStemmer.getMeasure(stem) > 1) w = stem;
        break;
      }
    }

    // Step 5a & 5b
    if (w.endsWith('e')) {
      const stem = w.slice(0, -1);
      const m = PorterStemmer.getMeasure(stem);
      if (m > 1 || (m === 1 && !PorterStemmer.cvc(stem))) {
        w = stem;
      }
    }
    if (PorterStemmer.getMeasure(w) > 1 && PorterStemmer.endsWithDoubleConsonant(w) && w.endsWith('l')) {
      w = w.slice(0, -1);
    }

    return w;
  }
}

module.exports = PorterStemmer;
