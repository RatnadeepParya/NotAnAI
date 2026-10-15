'use strict';

const { KNOWLEDGE_DOMAINS, VERIFICATION_STATUSES } = require('../models/knowledgeModel');

class KnowledgeValidator {
  /**
   * Validate a knowledge record
   * @param {Object} data - Knowledge record candidate
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Record must be a valid JSON object'] };
    }

    if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) {
      errors.push('id is required and must be a non-empty string');
    }

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
      errors.push('title is required and must be at least 2 characters');
    }

    if (!data.domain || !KNOWLEDGE_DOMAINS.includes(data.domain.toLowerCase().trim())) {
      errors.push(`domain must be one of: ${KNOWLEDGE_DOMAINS.join(', ')}`);
    }

    if (!data.topic || typeof data.topic !== 'string' || data.topic.trim().length === 0) {
      errors.push('topic is required');
    }

    if (!Array.isArray(data.questionPatterns) || data.questionPatterns.length === 0) {
      errors.push('questionPatterns must be a non-empty array of question strings');
    }

    if (!data.answer || typeof data.answer !== 'string' || data.answer.trim().length === 0) {
      errors.push('answer is required and cannot be empty');
    }

    if (data.answer && data.answer.length > 50000) {
      errors.push('answer exceeds maximum allowed length of 50,000 characters');
    }

    if (data.verificationStatus && !VERIFICATION_STATUSES.includes(data.verificationStatus)) {
      errors.push(`verificationStatus must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
    }

    if (data.confidence !== undefined) {
      if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
        errors.push('confidence must be a number between 0.0 and 1.0');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = KnowledgeValidator;
