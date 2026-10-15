'use strict';

const { localStorageEngine } = require('../services/storage/localStorageEngine');
const { ingestionService } = require('../services/knowledge/ingestionService');
const { invertedIndex } = require('../engine/retrieval/invertedIndex');
const { knowledgeGraph } = require('../engine/reasoning/knowledgeGraph');
const { learningService } = require('../services/learning/learningService');
const { authService, ROLES } = require('../services/auth/authService');
const { benchmarkEvaluator } = require('../engine/evaluation/benchmarkEvaluator');
const { offlineSyncManager } = require('../services/sync/offlineSyncManager');
const firebaseConfig = require('../../config/firebase');
const config = require('../../config/app');
const path = require('path');
const fs = require('fs');

class AdminController {
  /**
   * Render Dashboard Overview
   */
  async renderDashboard(req, res) {
    const totalKnowledge = localStorageEngine.count('knowledge');
    const totalEntities = localStorageEngine.count('entities');
    const totalRelationships = localStorageEngine.count('relationships');
    const pendingCandidates = learningService.getCandidates('pending').length;
    const feedbackStats = learningService.getFeedbackAnalytics();
    const syncStatus = offlineSyncManager.getStatus();
    const firebaseStatus = firebaseConfig.getStatus();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard — Not an AI',
      stats: {
        totalKnowledge,
        totalEntities,
        totalRelationships,
        pendingCandidates,
        feedbackStats,
        syncStatus,
        firebaseStatus
      }
    });
  }

  /**
   * Render Knowledge Management
   */
  async renderKnowledge(req, res) {
    const domain = req.query.domain || null;
    const query = req.query.q || '';
    let records = localStorageEngine.getAll('knowledge');

    if (domain) {
      records = records.filter(r => r.domain === domain);
    }
    if (query) {
      const q = query.toLowerCase();
      records = records.filter(r => r.title.toLowerCase().includes(q) || r.answer.toLowerCase().includes(q));
    }

    res.render('admin/knowledge', {
      title: 'Knowledge Management — Not an AI',
      records: records.slice(0, 100),
      totalCount: records.length,
      currentDomain: domain,
      query
    });
  }

  /**
   * Create or update knowledge
   */
  async saveKnowledge(req, res) {
    const { id, title, domain, topic, questionPatterns, answer, keywords, synonyms, entities } = req.body;

    const recordData = {
      id: id || `k_${Date.now()}`,
      title,
      domain,
      topic,
      questionPatterns: typeof questionPatterns === 'string' ? questionPatterns.split('\n').map(s => s.trim()).filter(Boolean) : questionPatterns,
      answer,
      keywords: typeof keywords === 'string' ? keywords.split(',').map(s => s.trim()).filter(Boolean) : keywords,
      synonyms: typeof synonyms === 'string' ? synonyms.split(',').map(s => s.trim()).filter(Boolean) : synonyms,
      entities: typeof entities === 'string' ? entities.split(',').map(s => s.trim()).filter(Boolean) : entities,
      verificationStatus: 'verified',
      confidence: 0.95
    };

    const result = ingestionService.importDocument(recordData, { allowDuplicates: true });
    if (!result.success) {
      return res.status(400).json({ error: result.errors.join(', ') });
    }

    invertedIndex.saveToDisk();
    res.json({ success: true, record: result.record });
  }

  /**
   * Delete knowledge record
   */
  async deleteKnowledge(req, res) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });

    localStorageEngine.delete('knowledge', id);
    invertedIndex.removeDocument(id);
    invertedIndex.saveToDisk();

    res.json({ success: true });
  }

  /**
   * Render Learning Candidates Queue
   */
  async renderCandidates(req, res) {
    const status = req.query.status || 'pending';
    const candidates = learningService.getCandidates(status === 'all' ? null : status);

    res.render('admin/candidates', {
      title: 'Learning Approval Queue — Not an AI',
      candidates,
      currentStatus: status
    });
  }

  /**
   * Approve or reject a candidate
   */
  async reviewCandidate(req, res) {
    const { id } = req.params;
    const { decision, notes } = req.body;
    const reviewerId = req.session.user.uid;

    try {
      const updated = learningService.reviewCandidate(id, reviewerId, decision, notes);
      res.json({ success: true, candidate: updated });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Render Knowledge Graph Explorer
   */
  async renderGraph(req, res) {
    knowledgeGraph.loadFromStorage();
    const entities = localStorageEngine.getAll('entities');
    const relationships = localStorageEngine.getAll('relationships');

    res.render('admin/graph', {
      title: 'Knowledge Graph Explorer — Not an AI',
      entities,
      relationships
    });
  }

  /**
   * Add graph relationship
   */
  async addRelationship(req, res) {
    const { source, relation, target } = req.body;
    try {
      const rel = knowledgeGraph.addRelationship(source, relation, target);
      res.json({ success: true, relationship: rel });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Render Evaluation Dashboard & run benchmark
   */
  async renderEvaluation(req, res) {
    const datasetPath = path.join(config.paths.seeds, 'evaluationDataset.json');
    let dataset = [];
    if (fs.existsSync(datasetPath)) {
      dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    }

    res.render('admin/evaluation', {
      title: 'Evaluation Benchmark Dashboard — Not an AI',
      datasetCount: dataset.length,
      lastResults: null
    });
  }

  /**
   * Trigger Benchmark Evaluation API
   */
  async runEvaluation(req, res) {
    const datasetPath = path.join(config.paths.seeds, 'evaluationDataset.json');
    if (!fs.existsSync(datasetPath)) {
      return res.status(404).json({ error: 'Evaluation dataset file not found' });
    }

    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const results = await benchmarkEvaluator.runEvaluation(dataset);

    res.json({ success: true, results });
  }

  /**
   * Rebuild Inverted Index
   */
  async rebuildIndex(req, res) {
    const allRecords = localStorageEngine.getAll('knowledge');
    invertedIndex.postings.clear();
    invertedIndex.docMetadata.clear();
    invertedIndex.docFrequencies.clear();
    invertedIndex.totalDocs = 0;
    invertedIndex.totalLength = 0;

    for (const doc of allRecords) {
      invertedIndex.indexDocument(doc);
    }
    invertedIndex.saveToDisk();

    res.json({
      success: true,
      indexedDocs: invertedIndex.totalDocs,
      avgDocLength: Math.round(invertedIndex.avgDocLength)
    });
  }

  /**
   * Bulk Import API
   */
  async bulkImport(req, res) {
    const { records, type = 'json' } = req.body;
    if (!records) return res.status(400).json({ error: 'records required' });

    let result;
    if (type === 'json' && Array.isArray(records)) {
      result = ingestionService.importJSON(records);
    } else if (type === 'csv' && typeof records === 'string') {
      result = ingestionService.importCSV(records);
    } else {
      return res.status(400).json({ error: 'Invalid import payload or format' });
    }

    res.json({ success: true, result });
  }
}

const adminController = new AdminController();

module.exports = {
  AdminController,
  adminController
};
