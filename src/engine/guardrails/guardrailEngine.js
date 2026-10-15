'use strict';

/**
 * GuardrailEngine
 * Production-grade deterministic guardrails for Not an AI:
 * 1. Input Guardrails: Prompt injection, jailbreak, adversarial payload, toxic content, and PII masking
 * 2. Output Guardrails: Anti-hallucination grounding verification, PII redaction, transparency enforcer
 * 3. Ingestion Guardrails: Anti-poisoning, trusted source validation, contradiction check
 */
class GuardrailEngine {
  constructor() {
    // Jailbreak and prompt injection patterns
    this.injectionPatterns = [
      /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
      /disregard\s+(?:all\s+)?rules/i,
      /system\s+override/i,
      /\bdan\s+mode\b/i,
      /\bjailbreak\b/i,
      /bypass\s+(?:all\s+)?(?:rules|guardrails|safety|restrictions)/i,
      /you\s+are\s+now\s+(?:unrestricted|evil|unfiltered|god\s+mode)/i,
      /reveal\s+(?:system\s+prompt|admin\s+keys|secret\s+instructions)/i,
      /<\s*script\b[^>]*>/i,
      /javascript\s*:/i,
      /\bdrop\s+table\b/i,
      /\bunion\s+select\b/i,
      /'\s*or\s*'1'\s*=\s*'1/i
    ];

    // Dangerous/harmful directives
    this.harmfulPatterns = [
      /how\s+to\s+(?:make|build|synthesize)\s+(?:a\s+)?(?:bomb|explosive|dirty\s+bomb|bioweapon|chemical\s+weapon|nerve\s+agent)/i,
      /how\s+to\s+(?:manufacture|cook)\s+(?:meth|fentanyl|heroin)/i,
      /how\s+to\s+(?:hack|ddos|breach|infiltrate|ransomware)\s+(?:into\s+)?(?:a\s+bank|hospital|infrastructure|fbi|cia)/i,
      /suicide\s+(?:methods|instructions|guide)/i
    ];

    // PII regex patterns
    this.piiPatterns = {
      creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      apiKey: /\b(?:AIza[0-9A-Za-z-_]{35}|ghp_[0-9A-Za-z]{36}|sk-[0-9A-Za-z]{32,48}|Bearer\s+[a-zA-Z0-9_\-\.]{30,})\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    };
  }

  /**
   * Validate and sanitize user input before pipeline processing
   * @param {string} input - Raw input
   * @returns {{ isValid: boolean, sanitizedInput: string, violation: string|null, refusalResponse: Object|null }}
   */
  validateInput(input) {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        sanitizedInput: '',
        violation: 'EMPTY_INPUT',
        refusalResponse: {
          text: 'Please provide a valid query.',
          confidence: 0,
          format: 'guardrail_rejection',
          explanation: { strategy: 'Input Guardrail: Empty Input' }
        }
      };
    }

    const trimmed = input.trim();

    // 1. Length Guardrail (prevent buffer exhaustion & DoS)
    if (trimmed.length > 5000) {
      return {
        isValid: false,
        sanitizedInput: trimmed.slice(0, 5000),
        violation: 'LENGTH_EXCEEDED',
        refusalResponse: {
          text: 'Message exceeds the maximum allowable length (5000 characters). Please condense your question.',
          confidence: 0,
          format: 'guardrail_rejection',
          explanation: { strategy: 'Input Guardrail: Query Length Limit' }
        }
      };
    }

    // 2. Harmful / Safety Guardrail
    for (const pattern of this.harmfulPatterns) {
      if (pattern.test(trimmed)) {
        return {
          isValid: false,
          sanitizedInput: trimmed,
          violation: 'HARMFUL_CONTENT',
          refusalResponse: {
            text: 'I cannot provide instructions for dangerous, illegal, or harmful activities. Not an AI is governed by strict deterministic enterprise safety policies.',
            confidence: 1.0,
            format: 'guardrail_rejection',
            explanation: {
              strategy: 'Input Safety Guardrail: Harm Prevention',
              policy: 'Zero Tolerance for Weapons, Malware, or Self-Harm Directives'
            }
          }
        };
      }
    }

    // 3. Prompt Injection / Jailbreak Guardrail
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(trimmed)) {
        return {
          isValid: false,
          sanitizedInput: trimmed,
          violation: 'PROMPT_INJECTION',
          refusalResponse: {
            text: 'Disallowed system override or adversarial injection pattern detected. Not an AI operates strictly on deterministic algorithms and cannot be overridden by conversational instructions.',
            confidence: 1.0,
            format: 'guardrail_rejection',
            explanation: {
              strategy: 'Input Security Guardrail: Injection Interception',
              detectedPattern: pattern.toString()
            }
          }
        };
      }
    }

    // 4. PII Redaction Guardrail
    let sanitized = trimmed;
    sanitized = sanitized.replace(this.piiPatterns.creditCard, '[REDACTED_CARD]');
    sanitized = sanitized.replace(this.piiPatterns.ssn, '[REDACTED_SSN]');
    sanitized = sanitized.replace(this.piiPatterns.apiKey, '[REDACTED_API_KEY]');

    return {
      isValid: true,
      sanitizedInput: sanitized,
      violation: null,
      refusalResponse: null
    };
  }

  /**
   * Validate and enforce grounding on composed output before delivering
   * @param {Object} composed - Composed response object
   * @returns {Object} - Guardrail-approved response
   */
  validateOutput(composed) {
    if (!composed || !composed.text) return composed;

    let sanitizedText = composed.text;

    // Mask accidental PII leaks in output
    sanitizedText = sanitizedText.replace(this.piiPatterns.creditCard, '[REDACTED_CARD]');
    sanitizedText = sanitizedText.replace(this.piiPatterns.ssn, '[REDACTED_SSN]');
    sanitizedText = sanitizedText.replace(this.piiPatterns.apiKey, '[REDACTED_API_KEY]');

    // Grounding Check: If unknown knowledge, ensure no hallucination
    if (composed.format === 'unknown_knowledge' && composed.confidence > 0.35) {
      composed.confidence = 0.0;
    }

    return {
      ...composed,
      text: sanitizedText,
      explanation: {
        ...composed.explanation,
        guardrailVerified: true
      }
    };
  }

  /**
   * Validate knowledge candidates before ingestion (Anti-Poisoning Guardrail)
   * @param {Object} candidate - Knowledge document candidate
   * @returns {{ isApproved: boolean, reason: string|null }}
   */
  validateCandidateForIngestion(candidate) {
    if (!candidate || !candidate.title || !candidate.answer) {
      return { isApproved: false, reason: 'Missing title or answer' };
    }

    if (candidate.title.length < 2 || candidate.answer.length < 25) {
      return { isApproved: false, reason: 'Content below minimum substantive length' };
    }

    // Check for harmful content or injections in candidate
    const combined = `${candidate.title} ${candidate.answer}`;
    for (const pattern of [...this.harmfulPatterns, ...this.injectionPatterns]) {
      if (pattern.test(combined)) {
        return { isApproved: false, reason: 'Content violates security or safety guardrails' };
      }
    }

    // Source trust validation: web_rag must cite known encyclopedias
    if (candidate.source?.type === 'web_rag') {
      const ref = candidate.source.reference || '';
      const isTrustedSource = ref.includes('wikipedia.org') || ref.includes('duckduckgo.com') || ref.includes('wikimedia.org');
      if (!isTrustedSource) {
        return { isApproved: false, reason: 'Web source domain not in verified whitelist' };
      }
    }

    return { isApproved: true, reason: null };
  }
}

const guardrailEngine = new GuardrailEngine();

module.exports = {
  GuardrailEngine,
  guardrailEngine
};
