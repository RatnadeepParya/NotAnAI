'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/app');
const { benchmarkEvaluator } = require('../src/engine/evaluation/benchmarkEvaluator');
const { invertedIndex } = require('../src/engine/retrieval/invertedIndex');
const { knowledgeGraph } = require('../src/engine/reasoning/knowledgeGraph');

async function evaluate() {
  console.log('====================================================');
  console.log('  Not an AI — Golden Evaluation Benchmark Runner');
  console.log('====================================================\n');

  // Load index and graph
  invertedIndex.loadFromDisk();
  knowledgeGraph.loadFromStorage();

  const datasetPath = path.join(config.paths.seeds, 'evaluationDataset.json');
  if (!fs.existsSync(datasetPath)) {
    console.error('Evaluation dataset not found at:', datasetPath);
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  console.log(`Running evaluation against ${dataset.length} test cases...\n`);

  const results = await benchmarkEvaluator.runEvaluation(dataset);

  console.log('--- Retrieval Metrics ---');
  console.log(`Evaluated Queries:    ${results.retrieval.totalEvaluated}`);
  console.log(`Top-1 Accuracy:       ${(results.retrieval.top1Accuracy * 100).toFixed(1)}%`);
  console.log(`Top-3 Accuracy:       ${(results.retrieval.top3Accuracy * 100).toFixed(1)}%`);
  console.log(`Mean Reciprocal Rank: ${results.retrieval.mrr.toFixed(3)}`);

  console.log('\n--- Classification & Guardrails ---');
  console.log(`Intent Accuracy:      ${(results.intentAccuracy * 100).toFixed(1)}%`);
  console.log(`Rejection Accuracy:   ${(results.rejectionAccuracy * 100).toFixed(1)}%`);

  console.log('\n--- Performance ---');
  console.log(`Total Duration:       ${results.durationMs}ms`);
  console.log(`Average Latency:      ${results.avgLatencyMs}ms per query`);

  if (results.sampleFailures.length > 0) {
    console.log('\n--- Failures / Misses ---');
    console.log(JSON.stringify(results.sampleFailures, null, 2));
  } else {
    console.log('\n ALL BENCHMARK TEST CASES PASSED WITH 100% ACCURACY!');
  }

  return results;
}

if (require.main === module) {
  evaluate().catch(err => {
    console.error('Evaluation failed:', err);
    process.exit(1);
  });
}

module.exports = evaluate;
