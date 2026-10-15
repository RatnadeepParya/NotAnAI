'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { localStorageEngine } = require('../storage/localStorageEngine');
const { invertedIndex } = require('../../engine/retrieval/invertedIndex');
const { KnowledgeModel } = require('../../models/knowledgeModel');
const KnowledgeValidator = require('../../validators/knowledgeValidator');
const SimilarityMetrics = require('../../engine/nlp/similarity');
const Tokenizer = require('../../engine/nlp/tokenizer');

class IngestionService {
  constructor() {
    this.collectionName = 'knowledge';
    this.historyCollection = 'knowledgeVersions';
  }

  /**
   * Check for duplicate or conflicting knowledge records
   * @param {Object} candidate - Knowledge document candidate
   * @returns {{ isDuplicate: boolean, duplicateId: string|null, similarity: number }}
   */
  detectDuplicate(candidate) {
    const existingRecords = localStorageEngine.getAll(this.collectionName);
    const candPatterns = (candidate.questionPatterns || []).map(p => Tokenizer.tokenize(p));
    const candTitleTokens = Tokenizer.tokenize(candidate.title || '');

    for (const record of existingRecords) {
      if (record.id === candidate.id) continue;

      // Exact title match in same domain
      if (record.domain === candidate.domain && record.title.toLowerCase() === (candidate.title || '').toLowerCase()) {
        return { isDuplicate: true, duplicateId: record.id, similarity: 1.0 };
      }

      // Check question pattern overlap
      const recTitleTokens = Tokenizer.tokenize(record.title);
      const titleSim = SimilarityMetrics.jaccard(candTitleTokens, recTitleTokens);
      if (titleSim > 0.85) {
        return { isDuplicate: true, duplicateId: record.id, similarity: titleSim };
      }

      for (const candPat of candPatterns) {
        for (const recPat of (record.questionPatterns || []).map(p => Tokenizer.tokenize(p))) {
          const sim = SimilarityMetrics.jaccard(candPat, recPat);
          if (sim > 0.90) {
            return { isDuplicate: true, duplicateId: record.id, similarity: sim };
          }
        }
      }
    }

    return { isDuplicate: false, duplicateId: null, similarity: 0 };
  }

  /**
   * Import a single validated knowledge document
   */
  importDocument(data, options = { allowDuplicates: false, createVersion: true }) {
    const model = KnowledgeModel.create(data);
    const validation = KnowledgeValidator.validate(model);

    if (!validation.valid) {
      return { success: false, errors: validation.errors, status: 'validation_failed' };
    }

    if (!options.allowDuplicates) {
      const dup = this.detectDuplicate(model);
      if (dup.isDuplicate) {
        return { success: false, errors: [`Duplicate of ${dup.duplicateId} (similarity: ${dup.similarity})`], status: 'duplicate' };
      }
    }

    // Save version history if updating existing
    const existing = localStorageEngine.get(this.collectionName, model.id);
    if (existing && options.createVersion) {
      const versionId = `${model.id}_v${existing.version || 1}`;
      localStorageEngine.set(this.historyCollection, versionId, {
        ...existing,
        versionId,
        archivedAt: new Date().toISOString()
      });
      model.version = (existing.version || 1) + 1;
    }

    // Save to persistent storage
    localStorageEngine.set(this.collectionName, model.id, model);

    // Update inverted index
    invertedIndex.indexDocument(model);

    return { success: true, record: model, status: 'imported' };
  }

  /**
   * Import array of JSON documents
   */
  importJSON(records, options = {}) {
    const startTime = Date.now();
    let imported = 0;
    let rejected = 0;
    let duplicates = 0;
    const errors = [];

    for (const raw of records) {
      const res = this.importDocument(raw, options);
      if (res.success) {
        imported++;
      } else if (res.status === 'duplicate') {
        duplicates++;
        errors.push({ id: raw.id, title: raw.title, error: res.errors[0] });
      } else {
        rejected++;
        errors.push({ id: raw.id, title: raw.title, errors: res.errors });
      }
    }

    // Persist updated index to disk
    invertedIndex.saveToDisk();

    return {
      total: records.length,
      imported,
      rejected,
      duplicates,
      durationMs: Date.now() - startTime,
      errors: errors.slice(0, 50)
    };
  }

  /**
   * Ingest CSV file or string
   */
  importCSV(csvContent, options = {}) {
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const records = rows.map((row, idx) => ({
      id: row.id || `csv_${Date.now()}_${idx}`,
      title: row.title || row.question || '',
      domain: row.domain || 'general-knowledge',
      topic: row.topic || 'general',
      questionPatterns: (row.questionPatterns || row.questions || row.title || '').split(';').map(s => s.trim()).filter(Boolean),
      answer: row.answer || row.content || '',
      keywords: (row.keywords || '').split(';').map(s => s.trim()).filter(Boolean),
      synonyms: (row.synonyms || '').split(';').map(s => s.trim()).filter(Boolean),
      entities: (row.entities || '').split(';').map(s => s.trim()).filter(Boolean),
      verificationStatus: row.verificationStatus || 'verified',
      confidence: parseFloat(row.confidence) || 0.95
    }));

    return this.importJSON(records, options);
  }

  /**
   * Ingest Markdown files
   * Parses markdown headings `# Title` and sections as knowledge facts
   */
  importMarkdown(markdownContent, domain = 'general-knowledge', topic = 'general') {
    const sections = markdownContent.split(/\n(?=#+ )/);
    const records = [];

    for (const sec of sections) {
      const match = sec.match(/^#+\s+(.+)\n([\s\S]+)$/);
      if (match) {
        const title = match[1].trim();
        const body = match[2].trim();
        if (title.length > 2 && body.length > 5) {
          records.push({
            id: `md_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title,
            domain,
            topic,
            questionPatterns: [title, `What is ${title}?`, `Explain ${title}`],
            answer: body,
            keywords: Tokenizer.tokenize(title, { removeStopwords: true, minLength: 3 }),
            verificationStatus: 'verified',
            confidence: 0.95
          });
        }
      }
    }

    return this.importJSON(records);
  }

  /**
   * Rollback document to previous version
   */
  rollback(documentId, targetVersion) {
    const versionId = `${documentId}_v${targetVersion}`;
    const previous = localStorageEngine.get(this.historyCollection, versionId);
    if (!previous) {
      throw new Error(`Version ${targetVersion} for document ${documentId} not found`);
    }

    const { versionId: _vid, archivedAt: _at, ...restoredData } = previous;
    restoredData.version = (restoredData.version || 1) + 1;
    restoredData.updatedAt = new Date().toISOString();

    localStorageEngine.set(this.collectionName, documentId, restoredData);
    invertedIndex.indexDocument(restoredData);
    invertedIndex.saveToDisk();

    return restoredData;
  }
}

const ingestionService = new IngestionService();

module.exports = {
  IngestionService,
  ingestionService
};
