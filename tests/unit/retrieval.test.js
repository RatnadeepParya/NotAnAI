'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { InvertedIndex } = require('../../src/engine/retrieval/invertedIndex');
const { HybridSearchEngine } = require('../../src/engine/retrieval/hybridSearch');

describe('Inverted Index & BM25 Scoring', () => {
  test('Indexes documents and calculates Okapi BM25 scores', () => {
    const index = new InvertedIndex();

    index.indexDocument({
      id: 'doc_1',
      title: 'What is a database?',
      domain: 'database-administration',
      topic: 'databases',
      questionPatterns: ['What is a database?'],
      answer: 'A database is an organized collection of data.',
      keywords: ['database', 'data', 'storage']
    });

    index.indexDocument({
      id: 'doc_2',
      title: 'What is JavaScript?',
      domain: 'programming',
      topic: 'javascript',
      questionPatterns: ['What is JavaScript?'],
      answer: 'JavaScript is a programming language.',
      keywords: ['javascript', 'programming', 'code']
    });

    assert.equal(index.totalDocs, 2);

    // Search for "database"
    const results = index.searchBM25(['database']);
    assert.ok(results.length > 0);
    assert.equal(results[0].docId, 'doc_1');
    assert.ok(results[0].score > 0);
  });

  test('Removes document cleanly and adjusts corpus length', () => {
    const index = new InvertedIndex();
    index.indexDocument({
      id: 'doc_test',
      title: 'Testing Index Deletion',
      domain: 'general-knowledge',
      topic: 'test',
      questionPatterns: ['test'],
      answer: 'test answer'
    });

    assert.equal(index.totalDocs, 1);
    index.removeDocument('doc_test');
    assert.equal(index.totalDocs, 0);

    const searchRes = index.searchBM25(['test']);
    assert.equal(searchRes.length, 0);
  });
});
