'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const TextNormalizer = require('../../src/engine/nlp/normalizer');
const Tokenizer = require('../../src/engine/nlp/tokenizer');
const PorterStemmer = require('../../src/engine/nlp/stemmer');
const Lemmatizer = require('../../src/engine/nlp/lemmatizer');
const { SpellChecker } = require('../../src/engine/nlp/spellChecker');
const { IntentClassifier, INTENTS } = require('../../src/engine/nlp/intentClassifier');
const LanguageDetector = require('../../src/engine/nlp/languageDetector');
const SimilarityMetrics = require('../../src/engine/nlp/similarity');

describe('NLP Preprocessing & Normalization', () => {
  test('TextNormalizer standardizes Unicode and strips diacritics', () => {
    const raw = 'Café “résumé” —  ELITE\u00A0Text…';
    const norm = TextNormalizer.normalize(raw);
    assert.equal(norm, 'cafe "resume" - elite text...');
  });

  test('TextNormalizer splits sentences correctly', () => {
    const text = 'Hello Dr. Smith! What is a database? It is an organized collection of data.';
    const sentences = TextNormalizer.splitSentences(text);
    assert.equal(sentences.length, 3);
    assert.equal(sentences[0], 'Hello Dr. Smith!');
    assert.equal(sentences[1], 'What is a database?');
    assert.equal(sentences[2], 'It is an organized collection of data.');
  });

  test('Tokenizer tokenizes and filters stopwords', () => {
    const text = 'What is the speed of light?';
    const allTokens = Tokenizer.tokenize(text, { removeStopwords: false });
    const contentTokens = Tokenizer.tokenize(text, { removeStopwords: true });

    assert.deepEqual(allTokens, ['what', 'is', 'the', 'speed', 'of', 'light']);
    assert.deepEqual(contentTokens, ['what', 'speed', 'light']);
  });

  test('PorterStemmer reduces words to canonical morphological stems', () => {
    assert.equal(PorterStemmer.stem('programming'), 'program');
    assert.equal(PorterStemmer.stem('relational'), 'relat');
    assert.equal(PorterStemmer.stem('connected'), 'connect');
    assert.equal(PorterStemmer.stem('databases'), 'databas');
  });

  test('Lemmatizer returns base dictionary forms for irregular words', () => {
    assert.equal(Lemmatizer.lemmatize('ran'), 'run');
    assert.equal(Lemmatizer.lemmatize('written'), 'write');
    assert.equal(Lemmatizer.lemmatize('databases'), 'database');
    assert.equal(Lemmatizer.lemmatize('better'), 'good');
    assert.equal(Lemmatizer.lemmatize('children'), 'child');
  });
});

describe('Spelling Correction Engine', () => {
  test('Calculates Levenshtein and Damerau-Levenshtein distances correctly', () => {
    // Adjacent transposition: "teh" -> "the" has Damerau distance 1, but Levenshtein distance 2
    assert.equal(SpellChecker.levenshteinDistance('teh', 'the'), 2);
    assert.equal(SpellChecker.damerauLevenshteinDistance('teh', 'the'), 1);

    assert.equal(SpellChecker.damerauLevenshteinDistance('database', 'database'), 0);
    assert.equal(SpellChecker.damerauLevenshteinDistance('databaes', 'database'), 1);
  });

  test('Ranks corrections with frequency weighting and n-gram candidate filtering', () => {
    const checker = new SpellChecker();
    checker.addWord('database', 100);
    checker.addWord('data', 50);
    checker.addWord('base', 20);

    const suggestions = checker.correct('databaes', 2, 1);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].word, 'database');
    assert.equal(suggestions[0].distance, 1);
  });
});

describe('Intent Classification & Language Detection', () => {
  const classifier = new IntentClassifier();

  test('Detects Greeting intent', () => {
    assert.equal(classifier.classify('Hello there!').intent, INTENTS.GREETING);
    assert.equal(classifier.classify('Hi good morning').intent, INTENTS.GREETING);
  });

  test('Detects Definition intent', () => {
    assert.equal(classifier.classify('What is a database?').intent, INTENTS.DEFINITION);
    assert.equal(classifier.classify('Define JavaScript').intent, INTENTS.DEFINITION);
  });

  test('Detects Calculation intent', () => {
    assert.equal(classifier.classify('calculate 50 * 4').intent, INTENTS.CALCULATION);
    assert.equal(classifier.classify('convert 10 km to miles').intent, INTENTS.CALCULATION);
  });

  test('Detects Comparison intent', () => {
    assert.equal(classifier.classify('compare SQL and NoSQL').intent, INTENTS.COMPARISON);
    assert.equal(classifier.classify('difference between TCP and UDP').intent, INTENTS.COMPARISON);
  });

  test('Detects languages based on n-gram profiles', () => {
    const en = LanguageDetector.detect('The quick brown fox jumps over the lazy dog');
    assert.equal(en.language, 'en');

    const es = LanguageDetector.detect('El rapido zorro marron salta sobre el perro perezoso');
    assert.equal(es.language, 'es');
  });
});

describe('Similarity Metrics', () => {
  test('Jaccard similarity', () => {
    const s1 = ['database', 'sql', 'tables'];
    const s2 = ['database', 'sql', 'queries'];
    const j = SimilarityMetrics.jaccard(s1, s2);
    // Intersection: 2, Union: 4 -> 0.5
    assert.equal(j, 0.5);
  });

  test('Exact phrase matching', () => {
    const score = SimilarityMetrics.exactPhraseMatch('relational database', 'PostgreSQL is a relational database system');
    assert.ok(score >= 0.7);
  });
});
