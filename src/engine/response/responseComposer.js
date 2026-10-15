'use strict';

const { INTENTS } = require('../nlp/intentClassifier');

class ResponseComposer {
  /**
   * Compose final chatbot response with transparency explanation
   * @param {Object} params
   * @returns {{ text: string, confidence: number, explanation: Object, format: string }}
   */
  static compose({
    query,
    intentResult,
    searchResults = [],
    calculationResult = null,
    graphInferenceResult = null,
    context = {}
  }) {
    // 1. Math / Unit Calculation Handled
    if (calculationResult && calculationResult.isHandled) {
      if (calculationResult.error) {
        return {
          text: `Calculation Error: ${calculationResult.error}`,
          confidence: 1.0,
          format: 'error',
          explanation: { type: 'calculation_error', expression: calculationResult.expression }
        };
      }

      const answerText = calculationResult.to
        ? `${calculationResult.from} is equal to **${calculationResult.to}**.`
        : `The result of ${calculationResult.expression} is **${calculationResult.result}**.`;

      return {
        text: answerText,
        confidence: 1.0,
        format: 'calculated',
        explanation: {
          strategy: 'Deterministic Arithmetic / Unit Parser',
          details: calculationResult.explanation,
          result: calculationResult.result
        }
      };
    }

    // 2. Knowledge Graph Deductive Inference Handled
    if (graphInferenceResult && graphInferenceResult.inferred) {
      return {
        text: graphInferenceResult.answer,
        confidence: 0.98,
        format: 'graph_deduction',
        explanation: {
          strategy: 'Knowledge Graph Multi-Hop Traversal',
          supportingPath: graphInferenceResult.path,
          hops: graphInferenceResult.hops
        }
      };
    }

    // 3. Conversational / Greeting Intents Handled
    if (intentResult && intentResult.intent === INTENTS.GREETING) {
      const greetings = [
        "Hello! I am **Not an AI**, a local-first, deterministic knowledge chatbot. How can I help you today?",
        "Greetings! I retrieve factual answers and reason using local algorithms, deterministic rules, and knowledge graphs without LLMs. What would you like to explore?",
        "Hi there! Welcome to Not an AI. Ask me factual, scientific, programming, or general knowledge questions, or try calculations and unit conversions."
      ];
      const selected = greetings[Math.floor(Math.random() * greetings.length)];
      return {
        text: selected,
        confidence: 0.99,
        format: 'greeting',
        explanation: { strategy: 'Deterministic Greeting Handler', intent: INTENTS.GREETING }
      };
    }

    // 4. Knowledge Retrieval Hits
    if (searchResults && searchResults.length > 0) {
      const topResult = searchResults[0];
      const doc = topResult.record;
      const score = topResult.score;
      const confidence = topResult.confidence;

      // Check if confidence satisfies minimum threshold and has actual keyword support
      const hasKeywordSupport = (topResult.explanation?.matchedKeywords?.length > 0) || topResult.explanation?.exactMatch || topResult.explanation?.phraseMatch;
      if (confidence >= 0.40 && hasKeywordSupport) {
        let formattedAnswer = doc.answer;

        // Format RAG synthesized responses with Direct Finding highlight
        if (doc.metadata?.directAnswer && doc.answer.length > doc.metadata.directAnswer.length + 30) {
          formattedAnswer = `**${doc.title}**\n\n> 💡 **Key Finding**: ${doc.metadata.directAnswer}\n\n${doc.answer}`;
        } else if (intentResult.intent === INTENTS.DEFINITION && !formattedAnswer.toLowerCase().startsWith('a ') && !formattedAnswer.toLowerCase().startsWith('an ')) {
          formattedAnswer = `**${doc.title}**\n\n${formattedAnswer}`;
        }

        // Include source attribution and self-learning badge for web RAG records
        if (doc.source?.type === 'web_rag' && doc.source?.reference) {
          formattedAnswer += `\n\n*(🌐 Retrieved & Learned via Web RAG from [${doc.source.publisher || 'Reference'}](${doc.source.reference}))*`;
        }

        const explanation = {
          strategy: topResult.explanation.strategy || 'Hybrid BM25 Retrieval',
          knowledgeId: doc.id,
          title: doc.title,
          domain: doc.domain,
          topic: doc.topic,
          confidence,
          score,
          matchedKeywords: topResult.explanation.matchedKeywords || [],
          source: doc.source || { type: 'curated' },
          verificationStatus: doc.verificationStatus
        };

        return {
          text: formattedAnswer,
          confidence,
          format: intentResult.intent || 'factual_answer',
          explanation,
          recordId: doc.id
        };
      }
    }

    // 5. Honest Fallback when knowledge is unavailable
    const fallbackText = `I do not have verified knowledge in my local database to answer that question accurately.

As **Not an AI**, I do not fabricate or hallucinate answers. You can:
- Ask about topics in Science, Math, Computing, History, Astronomy, Geography, etc.
- Teach me this fact (if you are an authorized reviewer or contributor).
- Rephrase your query using key terms.`;

    return {
      text: fallbackText,
      confidence: 0.0,
      format: 'unknown_knowledge',
      explanation: {
        strategy: 'Knowledge Boundary Rejection',
        reason: 'No stored knowledge record met the minimum confidence threshold (0.35).',
        topCandidates: searchResults.slice(0, 3).map(r => ({ title: r.record.title, score: r.score }))
      }
    };
  }
}

module.exports = ResponseComposer;
