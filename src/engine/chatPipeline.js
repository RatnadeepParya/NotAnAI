'use strict';

const TextNormalizer = require('./nlp/normalizer');
const Tokenizer = require('./nlp/tokenizer');
const Lemmatizer = require('./nlp/lemmatizer');
const LanguageDetector = require('./nlp/languageDetector');
const { spellChecker } = require('./nlp/spellChecker');
const { intentClassifier, INTENTS } = require('./nlp/intentClassifier');
const KeywordExtractor = require('./nlp/keywordExtractor');
const { hybridSearchEngine } = require('./retrieval/hybridSearch');
const { ruleEngine } = require('./reasoning/ruleEngine');
const { conversationMemory } = require('../services/memory/conversationMemory');
const { webRetrievalEngine } = require('../services/retrieval/webRetrievalEngine');
const { guardrailEngine } = require('./guardrails/guardrailEngine');
const ResponseComposer = require('./response/responseComposer');

class ChatPipeline {
  /**
   * Process a user query through the complete deterministic pipeline
   * @param {string} input - Raw user input
   * @param {Object} options - { conversationId, userId, language }
   * @returns {Promise<Object>} - Pipeline result
   */
  async process(input, options = {}) {
    const pipelineStart = Date.now();
    const trace = { steps: [], timings: {} };

    // 0. Guardrail Input Validation & Safety Interception
    const guardrailCheck = guardrailEngine.validateInput(input);
    if (!guardrailCheck.isValid) {
      return guardrailCheck.refusalResponse;
    }
    const rawInput = guardrailCheck.sanitizedInput;
    trace.steps.push('Input Guardrails Passed');

    // 2. Language Detection
    const langDetectStart = Date.now();
    const detectedLanguage = LanguageDetector.detect(rawInput);
    trace.timings.languageDetectionMs = Date.now() - langDetectStart;
    trace.language = detectedLanguage;

    // 3. Text Normalization
    const normStart = Date.now();
    const normalizedText = TextNormalizer.normalize(rawInput);
    trace.timings.normalizationMs = Date.now() - normStart;

    // 4. Tokenization & Lemmatization
    const tokStart = Date.now();
    const rawTokens = Tokenizer.tokenize(normalizedText, { removeStopwords: false });
    const contentTokens = Tokenizer.tokenize(normalizedText, { removeStopwords: true, minLength: 2 });
    const lemmas = Lemmatizer.lemmatizeTokens(contentTokens);
    trace.timings.tokenizationMs = Date.now() - tokStart;

    // 5. Spelling Correction
    const spellStart = Date.now();
    const spellResult = spellChecker.correctSentence(normalizedText);
    trace.timings.spellingCorrectionMs = Date.now() - spellStart;
    trace.spelling = spellResult;

    // 6. Context Resolution & Short-term Memory
    const ctxStart = Date.now();
    const context = conversationMemory.getShortTermContext(options.conversationId);
    const resolvedContext = conversationMemory.resolveQueryContext(normalizedText, options.conversationId);
    trace.timings.contextResolutionMs = Date.now() - ctxStart;
    trace.resolvedContext = resolvedContext;

    const queryToSearch = resolvedContext.resolvedQuery || normalizedText;

    // 7. Intent Classification
    const intentStart = Date.now();
    const intentResult = intentClassifier.classify(queryToSearch, context);
    trace.timings.intentClassificationMs = Date.now() - intentStart;
    trace.intent = intentResult;

    // 8. Entity Extraction & Keyword Analysis
    const entityStart = Date.now();
    const entities = KeywordExtractor.extractEntityCandidates(queryToSearch);
    const keywords = KeywordExtractor.extractKeywords(queryToSearch);
    trace.timings.entityExtractionMs = Date.now() - entityStart;
    trace.entities = entities;
    trace.keywords = keywords;

    // 9. Rule-Based Reasoning & Calculation Check
    const reasonStart = Date.now();
    const calculationResult = ruleEngine.evaluateCalculation(queryToSearch);
    const graphInferenceResult = !calculationResult.isHandled
      ? ruleEngine.inferGraphRelationship(queryToSearch)
      : null;
    trace.timings.reasoningMs = Date.now() - reasonStart;

    // 10. Knowledge Retrieval (if not handled by pure math)
    let searchResults = [];
    if (!calculationResult.isHandled && (!graphInferenceResult || !graphInferenceResult.inferred)) {
      const retrievalStart = Date.now();
      searchResults = await hybridSearchEngine.search(queryToSearch, {
        language: detectedLanguage.language,
        context,
        topK: 5
      });
      trace.timings.retrievalMs = Date.now() - retrievalStart;
      trace.retrievalCandidates = searchResults.length;

      // Deterministic Web RAG: Continuous Retrieval & Self-Training
      const topLocal = searchResults[0];
      const isLocalSatisfied = topLocal && topLocal.confidence >= 0.70 &&
        ((topLocal.explanation?.matchedKeywords?.length > 0) || topLocal.explanation?.exactMatch || topLocal.explanation?.phraseMatch);

      const allowWeb = options.allowWeb !== false && !options.offlineOnly;
      if (allowWeb && intentResult.intent !== INTENTS.GREETING) {
        if (!isLocalSatisfied || !topLocal) {
          const webStart = Date.now();
          const webResult = await webRetrievalEngine.retrieveAndLearn(queryToSearch, {
            language: detectedLanguage.language,
            context,
            allowWeb
          });
          trace.timings.webRetrievalMs = Date.now() - webStart;

          if (webResult) {
            searchResults = [webResult, ...searchResults.filter(r => r.record.id !== webResult.record.id)];
            trace.retrievalCandidates = searchResults.length;
            trace.isWebLearned = true;
            trace.selfTrained = true;
          }
        } else if (topLocal) {
          trace.isLocalKnowledge = true;
          trace.selfTrained = true;
        }
      }
    }

    // 11. Response Composition & Output Guardrails
    const compStart = Date.now();
    const rawComposed = ResponseComposer.compose({
      query: rawInput,
      intentResult,
      searchResults,
      calculationResult,
      graphInferenceResult,
      context
    });
    trace.timings.compositionMs = Date.now() - compStart;

    // Enforce Output Guardrails (Anti-hallucination, PII redaction)
    const composed = guardrailEngine.validateOutput(rawComposed);

    // 12. Update Short-Term Context & Memory
    if (options.conversationId) {
      conversationMemory.updateShortTermContext(
        options.conversationId,
        rawInput,
        composed.text,
        {
          topic: composed.explanation?.topic || null,
          entities
        }
      );
    }

    trace.totalDurationMs = Date.now() - pipelineStart;

    return {
      text: composed.text,
      confidence: composed.confidence,
      format: composed.format,
      explanation: {
        ...composed.explanation,
        pipelineTrace: trace
      },
      recordId: composed.recordId || null
    };
  }

  /**
   * Alias for process
   */
  async processMessage(input, options = {}) {
    return this.process(input, options);
  }
}

const chatPipeline = new ChatPipeline();

module.exports = {
  ChatPipeline,
  chatPipeline
};
