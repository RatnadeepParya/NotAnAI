'use strict';

const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers/adminController');
const { requireAdmin, requirePermission } = require('../middleware/authMiddleware');

// Dashboard overview
router.get('/', requireAdmin, (req, res) => adminController.renderDashboard(req, res));

// Knowledge management
router.get('/knowledge', requirePermission('edit_knowledge'), (req, res) => adminController.renderKnowledge(req, res));
router.post('/knowledge', requirePermission('edit_knowledge'), (req, res) => adminController.saveKnowledge(req, res));
router.delete('/knowledge/:id', requireAdmin, (req, res) => adminController.deleteKnowledge(req, res));

// Learning candidates review queue
router.get('/candidates', requirePermission('review_candidates'), (req, res) => adminController.renderCandidates(req, res));
router.post('/candidates/:id/review', requirePermission('review_candidates'), (req, res) => adminController.reviewCandidate(req, res));

// Knowledge graph explorer
router.get('/graph', requirePermission('edit_knowledge'), (req, res) => adminController.renderGraph(req, res));
router.post('/graph/relationship', requirePermission('edit_knowledge'), (req, res) => adminController.addRelationship(req, res));

// Evaluation benchmark dashboard
router.get('/evaluation', requireAdmin, (req, res) => adminController.renderEvaluation(req, res));
router.post('/evaluation/run', requireAdmin, (req, res) => adminController.runEvaluation(req, res));

// Maintenance & Bulk operations
router.post('/index/rebuild', requireAdmin, (req, res) => adminController.rebuildIndex(req, res));
router.post('/import', requireAdmin, (req, res) => adminController.bulkImport(req, res));

module.exports = router;
