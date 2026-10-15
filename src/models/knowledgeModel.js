'use strict';

const KNOWLEDGE_DOMAINS = [
  'science',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'astronomy',
  'geography',
  'history',
  'literature',
  'philosophy',
  'computer-science',
  'programming',
  'database-administration',
  'networking',
  'cybersecurity',
  'engineering',
  'economics',
  'finance',
  'business',
  'agriculture',
  'environment',
  'art',
  'music',
  'languages',
  'general-knowledge'
];

const VERIFICATION_STATUSES = [
  'verified',
  'pending',
  'validating',
  'rejected',
  'superseded'
];

class KnowledgeModel {
  static create(data) {
    const now = new Date().toISOString();
    return {
      id: data.id || `k_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: (data.title || '').trim(),
      domain: (data.domain || 'general-knowledge').toLowerCase().trim(),
      topic: (data.topic || 'general').toLowerCase().trim(),
      questionPatterns: Array.isArray(data.questionPatterns)
        ? data.questionPatterns.map(p => String(p).trim()).filter(Boolean)
        : [],
      answer: (data.answer || '').trim(),
      keywords: Array.isArray(data.keywords)
        ? data.keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean)
        : [],
      synonyms: Array.isArray(data.synonyms)
        ? data.synonyms.map(s => String(s).toLowerCase().trim()).filter(Boolean)
        : [],
      entities: Array.isArray(data.entities)
        ? data.entities.map(e => String(e).toLowerCase().trim()).filter(Boolean)
        : [],
      relationships: Array.isArray(data.relationships) ? data.relationships : [],
      language: (data.language || 'en').toLowerCase().trim(),
      source: {
        type: data.source?.type || 'curated',
        reference: data.source?.reference || null
      },
      verificationStatus: data.verificationStatus || 'verified',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.95,
      version: typeof data.version === 'number' ? data.version : 1,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
  }
}

module.exports = {
  KnowledgeModel,
  KNOWLEDGE_DOMAINS,
  VERIFICATION_STATUSES
};
