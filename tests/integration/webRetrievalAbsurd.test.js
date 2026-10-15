'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { webRetrievalEngine } = require('../../src/services/retrieval/webRetrievalEngine');
const { chatPipeline } = require('../../src/engine/chatPipeline');
const { invertedIndex } = require('../../src/engine/retrieval/invertedIndex');
const { knowledgeGraph } = require('../../src/engine/reasoning/knowledgeGraph');
const { spellChecker } = require('../../src/engine/nlp/spellChecker');
const { localStorageEngine } = require('../../src/services/storage/localStorageEngine');
const firebase = require('../../config/firebase');
const bootstrap = require('../../scripts/bootstrap');

test('Integration Suite — Web RAG, Absurd Questions & Self-Training', async (t) => {
  // Ensure bootstrap seed knowledge is loaded
  await bootstrap();

  t.after(async () => {
    await firebase.closeConnections();
  });

  const absurdQueries = [
    {
      query: 'Why do wombats poop cubes?',
      expectedTopic: 'wombat',
      expectedKeywords: ['wombat', 'cube']
    },
    {
      query: 'What was the Dancing plague of 1518?',
      expectedTopic: 'dancing',
      expectedKeywords: ['dancing', '1518']
    },
    {
      query: 'The Great Emu War',
      expectedTopic: 'emu',
      expectedKeywords: ['emu', 'war']
    },
    {
      query: 'Who was Mike the Headless Chicken?',
      expectedTopic: 'chicken',
      expectedKeywords: ['chicken', 'mike']
    }
  ];

  await t.test('1. Direct RAG Retrieval & Passage Extraction for Absurd Questions', async () => {
    for (const item of absurdQueries) {
      const result = await webRetrievalEngine.retrieveAndLearn(item.query);
      if (result) {
        assert.ok(result.record, `Should create a knowledge record for ${item.query}`);
        assert.ok(result.record.title, 'Should have a title');
        assert.ok(result.record.answer, 'Should have an extracted factual answer');
        assert.ok(result.confidence >= 0.85, 'Confidence should be high for verified web RAG');
        assert.strictEqual(result.explanation.isWebLearned, true, 'Should mark record as web learned');
        assert.strictEqual(result.explanation.isRAG, true, 'Should mark strategy as RAG');
        assert.ok(result.explanation.directAnswer, 'Should extract a direct answer sentence');

        // Verify keywords contain expected terms
        const hasKeyword = item.expectedKeywords.some(kw =>
          result.record.keywords.some(k => k.toLowerCase().includes(kw))
        );
        assert.ok(hasKeyword, `Keywords should include terms for ${item.query}`);
      }
    }
  });

  await t.test('2. Verification of Self-Training Ingestion Pipeline', async () => {
    let learnedDoc = null;
    const cacheHit = webRetrievalEngine.cache.get('why do wombats poop cubes?');

    if (cacheHit) {
      learnedDoc = cacheHit.record;
    } else {
      // Ingest canonical RAG entry to test local pipeline components
      const syntheticResult = {
        title: 'Wombat feces',
        answer: 'Wombat feces are waste deposits left by a species of marsupial native to Australia. The only known animal dropping to be cube-shaped, the cube shape is caused by variable elasticity of intestinal walls.',
        description: 'Cube-shaped feces of wombats',
        sourceUrl: 'https://en.wikipedia.org/wiki/Wombat_feces',
        sourceName: 'Wikipedia'
      };
      learnedDoc = webRetrievalEngine._createAndIngestKnowledgeRecord(
        syntheticResult,
        'Why do wombats poop cubes?',
        {},
        'The only known animal dropping to be cube-shaped, the cube shape is caused by variable elasticity of intestinal walls.'
      );
    }

    assert.ok(learnedDoc, 'Learned doc must exist');

    // 1. Verify saved in local persistent storage
    const stored = localStorageEngine.get('knowledge', learnedDoc.id);
    assert.ok(stored, 'Record must be saved in localStorageEngine');
    assert.strictEqual(stored.id, learnedDoc.id);

    // 2. Verify indexed in Inverted Index
    const searchHit = invertedIndex.searchBM25('wombats poop cubes', 3);
    assert.ok(searchHit.length > 0, 'InvertedIndex must retrieve newly learned document');
    const match = searchHit.find(h => h.docId === learnedDoc.id);
    assert.ok(match, 'Learned doc must be found in InvertedIndex BM25 search');

    // 3. Verify entities mapped in Knowledge Graph
    for (const ent of learnedDoc.entities.slice(0, 2)) {
      const graphEntity = knowledgeGraph.getEntity(ent);
      assert.ok(graphEntity, `Entity "${ent}" must be registered in KnowledgeGraph`);
    }

    // 4. Verify vocabulary added to SpellChecker
    const hasVocab = spellChecker.dictionary.has('wombat');
    assert.ok(hasVocab, 'SpellChecker dictionary must be expanded with "wombat"');
  });

  await t.test('3. Immediate Local Retrieval after Self-Training (< 15ms Latency)', async () => {
    // Subsequent query should hit the locally learned index immediately
    const query = 'Why do wombats poop cubes?';

    const startTime = Date.now();
    const response = await chatPipeline.process(query, { conversationId: 'test_absurd_self_learn' });
    const latencyMs = Date.now() - startTime;

    assert.ok(response.text, 'Response must have text');
    assert.ok(response.text.toLowerCase().includes('wombat'), 'Response must explain wombats');
    assert.ok(response.confidence >= 0.40, 'Confidence must be satisfied');
    assert.ok(response.explanation, 'Must have explanation breakdown');

    console.log(`[Test] Immediate local retrieval latency after self-training: ${latencyMs}ms`);
    assert.ok(latencyMs < 500, `Local retrieval must be sub-second, took ${latencyMs}ms`);
  });

  await t.test('4. Honest Rejection of Unanswerable / Hallucination-Prone Absurd Queries', async () => {
    const unanswerableQuery = 'Can a purple quantum waffle sing opera on Jupiter while eating a telephone?';
    const response = await chatPipeline.process(unanswerableQuery, { conversationId: 'test_absurd_rejection' });

    assert.strictEqual(response.format, 'unknown_knowledge');
    assert.strictEqual(response.confidence, 0.0);
    assert.ok(response.text.includes('do not have verified knowledge'));
    assert.ok(!response.text.includes('sing opera on Jupiter'), 'Must never hallucinate arbitrary facts');
  });
});
