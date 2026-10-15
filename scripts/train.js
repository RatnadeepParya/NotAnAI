'use strict';

const { selfTrainingEngine } = require('../src/services/learning/selfTrainingEngine');
const bootstrap = require('./bootstrap');

async function main() {
  try {
    // 1. Ensure baseline knowledge is bootstrapped
    await bootstrap();

    // 2. Run self-training and optimization engine
    const report = await selfTrainingEngine.runTraining({ verbose: true });

    console.log('[Self-Training Summary]');
    console.log(`- Documents Trained:      ${report.documentsTrained}`);
    console.log(`- New Vocabulary Added:   ${report.vocabularyAdded}`);
    console.log(`- Total Vocabulary Pool:  ${report.totalVocabulary}`);
    console.log(`- Synthesized Patterns:   ${report.patternsSynthesized}`);
    console.log(`- Knowledge Graph Edges:  ${report.newGraphEdges}`);
    console.log(`- Optimal BM25 (k1, b):   k1=${report.optimalParameters.k1}, b=${report.optimalParameters.b}`);
    console.log(`- Top-1 Accuracy:         ${(report.evaluationMetrics.top1Accuracy * 100).toFixed(1)}%`);
    console.log(`- Mean Reciprocal Rank:   ${report.evaluationMetrics.mrr.toFixed(3)}`);
    console.log(`- Duration:               ${report.durationMs}ms\n`);

    process.exit(0);
  } catch (err) {
    console.error('[Self-Training Error]:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
