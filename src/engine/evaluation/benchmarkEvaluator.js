'use strict';

const { chatPipeline } = require('../chatPipeline');
const { hybridSearchEngine } = require('../retrieval/hybridSearch');
const { intentClassifier } = require('../nlp/intentClassifier');

class BenchmarkEvaluator {
  /**
   * Run evaluation benchmark against a labeled evaluation test dataset
   * @param {Array<{ query: string, expectedRecordId?: string, expectedIntent?: string, shouldReject?: boolean }>} dataset
   * @returns {Promise<Object>} - Detailed metrics summary
   */
  async runEvaluation(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
      throw new Error('Evaluation dataset must be a non-empty array of test cases');
    }

    const startTime = Date.now();
    let totalQueries = dataset.length;
    let correctTop1 = 0;
    let correctTop3 = 0;
    let reciprocalRankSum = 0;
    let correctIntents = 0;
    let totalIntentQueries = 0;
    let correctRejections = 0;
    let totalRejectionQueries = 0;
    let totalLatency = 0;

    const failedCases = [];

    for (const testCase of dataset) {
      const qStart = Date.now();
      const pipelineRes = await chatPipeline.process(testCase.query);
      const latency = Date.now() - qStart;
      totalLatency += latency;

      // 1. Evaluate Intent Classification
      if (testCase.expectedIntent) {
        totalIntentQueries++;
        const classifiedIntent = intentClassifier.classify(testCase.query).intent;
        if (classifiedIntent === testCase.expectedIntent) {
          correctIntents++;
        } else {
          failedCases.push({
            type: 'intent_mismatch',
            query: testCase.query,
            expected: testCase.expectedIntent,
            actual: classifiedIntent
          });
        }
      }

      // 2. Evaluate Unknown Rejection
      if (testCase.shouldReject) {
        totalRejectionQueries++;
        if (pipelineRes.format === 'unknown_knowledge' || pipelineRes.confidence < 0.35) {
          correctRejections++;
        } else {
          failedCases.push({
            type: 'false_positive_knowledge',
            query: testCase.query,
            actualAnswer: pipelineRes.text
          });
        }
      }

      // 3. Evaluate Retrieval Ranking (Top-1, Top-3, MRR)
      if (testCase.expectedRecordId) {
        const searchResults = await hybridSearchEngine.search(testCase.query, { topK: 5 });
        const hitIndex = searchResults.findIndex(r => r.record.id === testCase.expectedRecordId);

        if (hitIndex === 0) {
          correctTop1++;
          correctTop3++;
          reciprocalRankSum += 1.0;
        } else if (hitIndex > 0 && hitIndex < 3) {
          correctTop3++;
          reciprocalRankSum += 1.0 / (hitIndex + 1);
        } else if (hitIndex >= 3) {
          reciprocalRankSum += 1.0 / (hitIndex + 1);
          failedCases.push({
            type: 'retrieval_below_top3',
            query: testCase.query,
            expectedId: testCase.expectedRecordId,
            rank: hitIndex + 1
          });
        } else {
          failedCases.push({
            type: 'retrieval_miss',
            query: testCase.query,
            expectedId: testCase.expectedRecordId
          });
        }
      }
    }

    const retrievalTestCases = dataset.filter(d => d.expectedRecordId).length;

    return {
      totalTests: totalQueries,
      durationMs: Date.now() - startTime,
      avgLatencyMs: Math.round(totalLatency / totalQueries),
      retrieval: {
        totalEvaluated: retrievalTestCases,
        top1Accuracy: retrievalTestCases > 0 ? Math.round((correctTop1 / retrievalTestCases) * 100) / 100 : 0,
        top3Accuracy: retrievalTestCases > 0 ? Math.round((correctTop3 / retrievalTestCases) * 100) / 100 : 0,
        mrr: retrievalTestCases > 0 ? Math.round((reciprocalRankSum / retrievalTestCases) * 1000) / 1000 : 0
      },
      intentAccuracy: totalIntentQueries > 0 ? Math.round((correctIntents / totalIntentQueries) * 100) / 100 : 1.0,
      rejectionAccuracy: totalRejectionQueries > 0 ? Math.round((correctRejections / totalRejectionQueries) * 100) / 100 : 1.0,
      failedCaseCount: failedCases.length,
      sampleFailures: failedCases.slice(0, 10)
    };
  }

  /**
   * Alias for runEvaluation
   */
  evaluate(dataset) {
    return this.runEvaluation(dataset);
  }
}

const benchmarkEvaluator = new BenchmarkEvaluator();

module.exports = {
  BenchmarkEvaluator,
  benchmarkEvaluator
};
