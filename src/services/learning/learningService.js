'use strict';

const { localStorageEngine } = require('../storage/localStorageEngine');
const { ingestionService } = require('../knowledge/ingestionService');
const { spellChecker } = require('../../engine/nlp/spellChecker');
const { intentClassifier } = require('../../engine/nlp/intentClassifier');

const CANDIDATE_STATUSES = {
  PENDING: 'pending',
  VALIDATING: 'validating',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  SUPERSEDED: 'superseded'
};

class LearningService {
  constructor() {
    this.candidatesCollection = 'learningCandidates';
    this.feedbackCollection = 'feedback';
    this.rankingWeightsCollection = 'rankingWeights';
  }

  /**
   * Submit feedback on a response
   */
  submitFeedback({ userId, messageId, knowledgeId, query, rating, correction, comment }) {
    if (!rating || !['positive', 'negative'].includes(rating)) {
      throw new Error('Rating must be "positive" or "negative"');
    }

    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: feedbackId,
      userId: userId || 'anonymous',
      messageId: messageId || null,
      knowledgeId: knowledgeId || null,
      query: query || '',
      rating, // 'positive' | 'negative'
      correction: correction ? String(correction).trim() : null,
      comment: comment ? String(comment).trim() : null,
      createdAt: new Date().toISOString()
    };

    localStorageEngine.set(this.feedbackCollection, feedbackId, record);

    // If user provided a correction, automatically create a pending learning candidate
    if (correction && correction.length > 5) {
      this.createCandidate({
        submittedBy: userId || 'anonymous',
        title: query,
        questionPatterns: [query],
        answer: correction,
        domain: 'general-knowledge',
        sourceType: 'user_correction',
        notes: `User submitted correction via feedback ID: ${feedbackId}`
      });
    }

    return record;
  }

  /**
   * Create a new learning candidate (Default: PENDING, never auto-published)
   */
  createCandidate(data) {
    if (!data.answer || !data.title) {
      throw new Error('Title and answer are required to propose a learning candidate');
    }

    const candidateId = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const candidate = {
      id: candidateId,
      submittedBy: data.submittedBy || 'guest',
      title: String(data.title).trim(),
      domain: (data.domain || 'general-knowledge').toLowerCase().trim(),
      topic: (data.topic || 'general').toLowerCase().trim(),
      questionPatterns: Array.isArray(data.questionPatterns) ? data.questionPatterns : [data.title],
      answer: String(data.answer).trim(),
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      status: CANDIDATE_STATUSES.PENDING,
      reviewedBy: null,
      reviewNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorageEngine.set(this.candidatesCollection, candidateId, candidate);
    return candidate;
  }

  /**
   * Get all candidates with optional status filter
   */
  getCandidates(status = null) {
    return localStorageEngine.getAll(this.candidatesCollection, c => !status || c.status === status);
  }

  /**
   * Review & approve/reject a learning candidate
   * Requires reviewer or admin role
   */
  reviewCandidate(candidateId, reviewerId, decision, reviewNotes = '') {
    if (![CANDIDATE_STATUSES.APPROVED, CANDIDATE_STATUSES.REJECTED].includes(decision)) {
      throw new Error('Decision must be "approved" or "rejected"');
    }

    const candidate = localStorageEngine.get(this.candidatesCollection, candidateId);
    if (!candidate) throw new Error('Candidate not found');

    candidate.status = decision;
    candidate.reviewedBy = reviewerId;
    candidate.reviewNotes = reviewNotes;
    candidate.updatedAt = new Date().toISOString();

    localStorageEngine.set(this.candidatesCollection, candidateId, candidate);

    // If approved, publish to official knowledge repository
    if (decision === CANDIDATE_STATUSES.APPROVED) {
      const publishRes = ingestionService.importDocument({
        id: `k_learned_${Date.now()}`,
        title: candidate.title,
        domain: candidate.domain,
        topic: candidate.topic,
        questionPatterns: candidate.questionPatterns,
        answer: candidate.answer,
        keywords: candidate.keywords,
        verificationStatus: 'verified',
        confidence: 0.90,
        source: {
          type: 'user_contributed_reviewed',
          reference: `Candidate ${candidateId} reviewed by ${reviewerId}`
        }
      });

      if (publishRes.success) {
        candidate.status = CANDIDATE_STATUSES.PUBLISHED;
        candidate.publishedId = publishRes.record.id;
        localStorageEngine.set(this.candidatesCollection, candidateId, candidate);
      }
    }

    return candidate;
  }

  /**
   * Acquire new vocabulary terms safely
   */
  learnVocabulary(word, frequency = 1) {
    if (!word || typeof word !== 'string' || word.length < 3) return;
    spellChecker.addWord(word, frequency);
  }

  /**
   * Analyze feedback to calculate satisfaction metrics
   */
  getFeedbackAnalytics() {
    const all = localStorageEngine.getAll(this.feedbackCollection);
    const positive = all.filter(f => f.rating === 'positive').length;
    const negative = all.filter(f => f.rating === 'negative').length;
    const total = all.length;

    return {
      total,
      positive,
      negative,
      satisfactionRate: total > 0 ? Math.round((positive / total) * 100) : 0,
      recent: all.slice(-20).reverse()
    };
  }
}

const learningService = new LearningService();

module.exports = {
  LearningService,
  learningService,
  CANDIDATE_STATUSES
};
