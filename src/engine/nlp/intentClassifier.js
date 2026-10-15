'use strict';

const TextNormalizer = require('./normalizer');
const Tokenizer = require('./tokenizer');
const Lemmatizer = require('./lemmatizer');

const INTENTS = {
  GREETING: 'greeting',
  QUESTION_ANSWERING: 'question_answering',
  DEFINITION: 'definition',
  EXPLANATION: 'explanation',
  COMPARISON: 'comparison',
  CALCULATION: 'calculation',
  TROUBLESHOOTING: 'troubleshooting',
  INSTRUCTIONS: 'instructions',
  FOLLOW_UP: 'follow_up',
  CLARIFICATION: 'clarification',
  KNOWLEDGE_CONTRIBUTION: 'knowledge_contribution',
  CORRECTION: 'correction',
  GENERAL_CONVERSATION: 'general_conversation',
  UNKNOWN: 'unknown'
};

class IntentClassifier {
  constructor() {
    this.customExamples = [];
    this.intentWeights = this._buildDefaultWeights();
  }

  _buildDefaultWeights() {
    return {
      [INTENTS.GREETING]: {
        patterns: [
          /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening|day)|greetings|howdy|sup)\b/i,
          /^(?:hi|hello)\s+there/i
        ],
        keywords: new Map([
          ['hello', 3.0], ['hi', 3.0], ['hey', 3.0], ['greetings', 3.0],
          ['morning', 2.0], ['afternoon', 2.0], ['evening', 2.0], ['howdy', 3.0]
        ])
      },
      [INTENTS.CALCULATION]: {
        patterns: [
          /^(?:calculate|compute|solve|evaluate|what is|how much is)\s+[\d\(\)\.\+\-\*\/\^\%\s]+(?:\s*(?:in|to)\s+[a-z]+)?$/i,
          /^[\d\(\)\.\s]+[\+\-\*\/\^\%][\d\(\)\.\+\-\*\/\^\%\s]+$/,
          /\b(?:convert|how many)\s+\d+(?:\.\d+)?\s+[a-z]+\s+(?:to|in|into)\s+[a-z]+\b/i
        ],
        keywords: new Map([
          ['calculate', 3.0], ['compute', 3.0], ['solve', 2.5], ['convert', 3.0],
          ['plus', 2.0], ['minus', 2.0], ['multiplied', 2.0], ['divided', 2.0]
        ])
      },
      [INTENTS.DEFINITION]: {
        patterns: [
          /^(?:what is\s+(?:a|an)\b|what are\b|define\b|definition of\b|meaning of\b)\s+(.+)/i,
          /^what is\s+([a-z0-9_-]+)\??$/i,
          /^(.+)\s+(?:meaning|definition)$/i
        ],
        keywords: new Map([
          ['define', 3.0], ['definition', 3.0], ['meaning', 2.5], ['means', 2.0],
          ['stands', 2.0], ['acronym', 2.5]
        ])
      },
      [INTENTS.EXPLANATION]: {
        patterns: [
          /^(?:explain|why is|why does|why do|why did|how does|how do|how did)\s+(.+)/i,
          /^(?:can you explain|give an explanation of)\s+(.+)/i
        ],
        keywords: new Map([
          ['explain', 3.0], ['explanation', 3.0], ['why', 2.5], ['mechanism', 2.0],
          ['reason', 2.0], ['cause', 2.0], ['works', 2.0]
        ])
      },
      [INTENTS.COMPARISON]: {
        patterns: [
          /^(?:compare|difference between|versus|vs\.?|how does .+ compare to)\b/i,
          /\b(?:difference between|differences between|versus|vs\.?)\b/i
        ],
        keywords: new Map([
          ['compare', 3.0], ['comparison', 3.0], ['difference', 3.0], ['differences', 3.0],
          ['versus', 3.0], ['vs', 3.0], ['contrast', 2.5], ['distinguish', 2.5]
        ])
      },
      [INTENTS.TROUBLESHOOTING]: {
        patterns: [
          /\b(?:error|bug|issue|fail|failed|failing|crash|broken|not working|doesn't work|problem with|fix)\b/i,
          /^(?:how to fix|how do i fix|why is .+ not working)\b/i
        ],
        keywords: new Map([
          ['error', 3.0], ['fix', 3.0], ['issue', 2.5], ['crash', 3.0],
          ['broken', 2.5], ['troubleshoot', 3.0], ['failed', 2.5], ['failing', 2.5]
        ])
      },
      [INTENTS.INSTRUCTIONS]: {
        patterns: [
          /^(?:how to|how do i|steps to|guide to|instructions for|how can i)\s+(.+)/i,
          /^(?:show me how to|teach me how to)\s+(.+)/i
        ],
        keywords: new Map([
          ['steps', 2.5], ['step-by-step', 3.0], ['guide', 2.5], ['tutorial', 2.5],
          ['procedure', 2.5], ['instructions', 3.0], ['install', 2.0], ['setup', 2.0]
        ])
      },
      [INTENTS.FOLLOW_UP]: {
        patterns: [
          /^(?:what about|and what about|how about|and it|where is it|what is its|tell me more about it)\b/i,
          /^(?:why\?|what else\?|more details|elaborate)\b/i
        ],
        keywords: new Map([
          ['it', 1.5], ['its', 1.5], ['that', 1.5], ['this', 1.5],
          ['more', 1.5], ['also', 1.5], ['elaborate', 2.5]
        ])
      },
      [INTENTS.CORRECTION]: {
        patterns: [
          /^(?:no,|that's wrong|you are wrong|actually|not true|incorrect|that is incorrect)\b/i,
          /^(?:it is actually|the correct answer is)\b/i
        ],
        keywords: new Map([
          ['wrong', 3.0], ['incorrect', 3.0], ['mistake', 2.5], ['actually', 2.5],
          ['correction', 3.0], ['false', 2.0]
        ])
      },
      [INTENTS.KNOWLEDGE_CONTRIBUTION]: {
        patterns: [
          /^(?:teach|learn this:|remember that|note that|i want to add a fact)\b/i,
          /^(?:add knowledge|new fact:)\b/i
        ],
        keywords: new Map([
          ['teach', 3.0], ['learn', 2.5], ['remember', 2.5], ['contribute', 3.0],
          ['fact', 2.0]
        ])
      },
      [INTENTS.GENERAL_CONVERSATION]: {
        patterns: [
          /^(?:who are you|what are you|what is your name|how are you|thank you|thanks|bye|goodbye)\b/i
        ],
        keywords: new Map([
          ['thanks', 3.0], ['thank', 3.0], ['you', 1.0], ['name', 2.0],
          ['bye', 3.0], ['goodbye', 3.0], ['who', 1.5]
        ])
      }
    };
  }

  /**
   * Classify user query intent
   * @param {string} text - User message
   * @param {Object} context - Short term context (lastTopic, lastEntity, etc.)
   * @returns {{ intent: string, confidence: number, matchedPattern: boolean, details: Object }}
   */
  classify(text, context = {}) {
    if (!text || typeof text !== 'string') {
      return { intent: INTENTS.UNKNOWN, confidence: 0, matchedPattern: false, details: {} };
    }

    const clean = TextNormalizer.normalize(text);
    const tokens = Tokenizer.tokenize(clean);
    const lemmas = tokens.map(t => Lemmatizer.lemmatize(t));

    // 1. High-priority Regex Pattern Match
    for (const [intentName, config] of Object.entries(this.intentWeights)) {
      for (const pattern of config.patterns) {
        if (pattern.test(clean)) {
          // Check if follow-up depends on context
          if (intentName === INTENTS.FOLLOW_UP && !context.lastEntity && !context.lastTopic) {
            // No previous context to follow up on
            continue;
          }
          return {
            intent: intentName,
            confidence: 0.95,
            matchedPattern: true,
            details: { pattern: pattern.toString() }
          };
        }
      }
    }

    // 2. Custom approved examples matching
    for (const example of this.customExamples) {
      if (example.pattern && new RegExp(example.pattern, 'i').test(clean)) {
        return {
          intent: example.intent,
          confidence: 0.92,
          matchedPattern: true,
          details: { customExampleId: example.id }
        };
      }
    }

    // 3. Statistical scoring across keyword weights
    const scores = new Map();
    for (const [intentName, config] of Object.entries(this.intentWeights)) {
      let score = 0;
      let matchedCount = 0;

      for (const lemma of lemmas) {
        if (config.keywords.has(lemma)) {
          score += config.keywords.get(lemma);
          matchedCount++;
        }
      }

      if (matchedCount > 0) {
        // Normalize by token count
        const normalizedScore = score / Math.sqrt(tokens.length + 1);
        scores.set(intentName, normalizedScore);
      }
    }

    // 4. Default to QUESTION_ANSWERING if query contains question words or question mark
    const isQuestion = clean.endsWith('?') || /^(?:what|where|who|when|which|is|are|can|does|do)\b/i.test(clean);
    if (isQuestion && !scores.has(INTENTS.QUESTION_ANSWERING)) {
      scores.set(INTENTS.QUESTION_ANSWERING, 2.0);
    }

    if (scores.size === 0) {
      return {
        intent: INTENTS.UNKNOWN,
        confidence: 0.2,
        matchedPattern: false,
        details: {}
      };
    }

    // Rank intents
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const [topIntent, topScore] = sorted[0];

    // Compute bounded confidence between 0.35 and 0.90
    const confidence = Math.min(0.90, Math.max(0.35, Math.round((topScore / 5.0) * 100) / 100));

    return {
      intent: topIntent,
      confidence,
      matchedPattern: false,
      details: { score: topScore, alternatives: sorted.slice(1, 3) }
    };
  }

  /**
   * Add approved training example
   */
  addTrainingExample(intent, pattern, id = null) {
    if (!Object.values(INTENTS).includes(intent)) {
      throw new Error(`Unknown intent: ${intent}`);
    }
    this.customExamples.push({
      id: id || `ex_${Date.now()}`,
      intent,
      pattern
    });
  }
}

const intentClassifier = new IntentClassifier();

module.exports = {
  INTENTS,
  IntentClassifier,
  intentClassifier
};
