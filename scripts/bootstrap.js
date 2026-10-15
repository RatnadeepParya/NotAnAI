'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/app');
const { localStorageEngine } = require('../src/services/storage/localStorageEngine');
const { ingestionService } = require('../src/services/knowledge/ingestionService');
const { knowledgeGraph, RELATIONSHIPS } = require('../src/engine/reasoning/knowledgeGraph');
const { spellChecker } = require('../src/engine/nlp/spellChecker');
const { authService, ROLES } = require('../src/services/auth/authService');

async function bootstrap() {
  console.log('====================================================');
  console.log('  Not an AI — Knowledge & System Bootstrapper');
  console.log('====================================================\n');

  // 1. Ingest Initial Seed Knowledge
  const seedFile = path.join(config.paths.seeds, 'initialKnowledge.json');
  if (fs.existsSync(seedFile)) {
    console.log('[1/4] Ingesting initial knowledge seed dataset...');
    const rawSeeds = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    const importRes = ingestionService.importJSON(rawSeeds);
    console.log(`   Imported ${importRes.imported} documents (${importRes.duplicates} duplicates, ${importRes.rejected} rejected) in ${importRes.durationMs}ms`);

    // Feed vocabulary to spell checker
    for (const doc of rawSeeds) {
      if (doc.keywords) {
        for (const kw of doc.keywords) spellChecker.addWord(kw, 5);
      }
      if (doc.title) {
        for (const w of doc.title.split(/\s+/)) spellChecker.addWord(w, 3);
      }
    }
  } else {
    console.warn(' [1/4] Seed file not found at:', seedFile);
  }

  // 2. Populate Knowledge Graph Entities & Relationships
  console.log('[2/4] Initializing Knowledge Graph entities & relationships...');
  const initialEntities = [
    { id: 'earth', name: 'Earth', type: 'planet' },
    { id: 'planet', name: 'Planet', type: 'astronomical_class' },
    { id: 'celestial body', name: 'Celestial Body', type: 'universal_category' },
    { id: 'solar system', name: 'Solar System', type: 'planetary_system' },
    { id: 'milky way', name: 'Milky Way', type: 'galaxy' },
    { id: 'database', name: 'Database', type: 'computer_system' },
    { id: 'storage_system', name: 'Storage System', type: 'infrastructure' },
    { id: 'rdbms', name: 'RDBMS', type: 'database_model' },
    { id: 'javascript', name: 'JavaScript', type: 'language' },
    { id: 'programming_language', name: 'Programming Language', type: 'software_paradigm' },
    { id: 'mona lisa', name: 'Mona Lisa', type: 'artwork' },
    { id: 'leonardo da vinci', name: 'Leonardo da Vinci', type: 'person' },
    { id: 'louvre', name: 'Louvre Museum', type: 'place' }
  ];

  for (const ent of initialEntities) {
    knowledgeGraph.addEntity(ent.id, ent.name, ent.type);
  }

  const initialRelations = [
    { source: 'earth', relation: RELATIONSHIPS.IS_A, target: 'planet' },
    { source: 'planet', relation: RELATIONSHIPS.IS_A, target: 'celestial body' },
    { source: 'earth', relation: RELATIONSHIPS.PART_OF, target: 'solar system' },
    { source: 'solar system', relation: RELATIONSHIPS.PART_OF, target: 'milky way' },
    { source: 'rdbms', relation: RELATIONSHIPS.IS_A, target: 'database' },
    { source: 'database', relation: RELATIONSHIPS.IS_A, target: 'storage_system' },
    { source: 'javascript', relation: RELATIONSHIPS.IS_A, target: 'programming_language' },
    { source: 'mona lisa', relation: RELATIONSHIPS.CREATED_BY, target: 'leonardo da vinci' },
    { source: 'mona lisa', relation: RELATIONSHIPS.LOCATED_IN, target: 'louvre' }
  ];

  for (const rel of initialRelations) {
    knowledgeGraph.addRelationship(rel.source, rel.relation, rel.target);
  }
  console.log(`   Registered ${initialEntities.length} entities and ${initialRelations.length} graph relationships.`);

  // 3. Populate Standard Vocabulary & Synonyms
  console.log('[3/4] Indexing basic vocabulary and spelling dictionary...');
  const commonWords = [
    'database', 'system', 'computer', 'network', 'relational', 'science', 'physics',
    'chemistry', 'biology', 'astronomy', 'earth', 'planet', 'light', 'water',
    'mathematics', 'energy', 'velocity', 'mountain', 'temperature', 'program'
  ];
  for (const w of commonWords) {
    spellChecker.addWord(w, 10);
  }
  console.log(`   Indexed vocabulary pool with ${spellChecker.dictionary.size} words.`);

  // 4. Default Admin Account Provisioning (if none exists)
  console.log('[4/4] Checking administrator account...');
  const existingUsers = authService.getAllUsers();
  const hasAdmin = existingUsers.some(u => u.role === ROLES.ADMIN);

  if (!hasAdmin) {
    try {
      const admin = await authService.registerUser({
        username: 'admin',
        email: 'admin@notanai.local',
        password: 'AdminPassword2026!',
        role: ROLES.ADMIN,
        adminToken: config.security.adminSetupToken
      });
      console.log(`   Created default administrator: ${admin.email}`);
    } catch (err) {
      console.warn(`   Admin account initialization note: ${err.message}`);
    }
  } else {
    console.log('   Administrator account already exists.');
  }

  console.log('\n Bootstrap complete! Application is initialized.\n');
}

if (require.main === module) {
  bootstrap().catch(err => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
}

module.exports = bootstrap;
