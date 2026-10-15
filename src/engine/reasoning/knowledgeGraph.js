'use strict';

const { localStorageEngine } = require('../../services/storage/localStorageEngine');

const RELATIONSHIPS = {
  IS_A: 'IS_A',
  PART_OF: 'PART_OF',
  HAS_PROPERTY: 'HAS_PROPERTY',
  LOCATED_IN: 'LOCATED_IN',
  CREATED_BY: 'CREATED_BY',
  DEPENDS_ON: 'DEPENDS_ON',
  RELATED_TO: 'RELATED_TO',
  CAUSES: 'CAUSES',
  BEFORE: 'BEFORE',
  AFTER: 'AFTER',
  INSTANCE_OF: 'INSTANCE_OF'
};

// Transitive relationships allow multi-hop syllogistic deduction
const TRANSITIVE_RELATIONS = new Set([
  RELATIONSHIPS.IS_A,
  RELATIONSHIPS.PART_OF,
  RELATIONSHIPS.LOCATED_IN,
  RELATIONSHIPS.DEPENDS_ON,
  RELATIONSHIPS.BEFORE,
  RELATIONSHIPS.AFTER,
  RELATIONSHIPS.INSTANCE_OF
]);

class KnowledgeGraph {
  constructor() {
    this.entityCollection = 'entities';
    this.relationshipCollection = 'relationships';
    // in-memory graph adjacency: source -> [{ target, relation, properties, id }]
    this.outEdges = new Map();
    // in-memory reverse adjacency: target -> [{ source, relation, properties, id }]
    this.inEdges = new Map();
  }

  /**
   * Add or update an entity
   */
  addEntity(id, nameOrOptions, type = 'concept', properties = {}) {
    const cleanId = String(id).toLowerCase().trim();
    let name = id;
    let entityType = type;
    let props = properties;

    if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
      name = nameOrOptions.name || id;
      entityType = nameOrOptions.type || 'concept';
      props = nameOrOptions.properties || nameOrOptions;
    } else if (typeof nameOrOptions === 'string') {
      name = nameOrOptions;
    }

    const entity = {
      id: cleanId,
      name,
      type: entityType,
      properties: props,
      updatedAt: new Date().toISOString()
    };
    localStorageEngine.set(this.entityCollection, cleanId, entity);
    return entity;
  }

  /**
   * Retrieve an entity from the graph store
   */
  getEntity(id) {
    if (!id) return null;
    const cleanId = String(id).toLowerCase().trim();
    return localStorageEngine.get(this.entityCollection, cleanId);
  }

  /**
   * Add a directed relationship edge
   */
  addRelationship(source, relation, target, properties = {}) {
    const s = String(source).toLowerCase().trim();
    const t = String(target).toLowerCase().trim();
    const REL_SYNONYMS = {
      'USES': 'DEPENDS_ON',
      'EXPLAINS': 'RELATED_TO',
      'MEASURES': 'HAS_PROPERTY',
      'ORGANIZES': 'RELATED_TO',
      'OCCURS_IN': 'LOCATED_IN',
      'PRODUCES': 'CAUSES',
      'CHARACTERIZES': 'HAS_PROPERTY',
      'APPLIES_TO': 'RELATED_TO',
      'STUDIED_UNDER': 'RELATED_TO',
      'IMPROVES': 'CAUSES',
      'INFLUENCES': 'CAUSES',
      'CONTAINS': 'PART_OF',
      'BUILT_BY': 'CREATED_BY',
      'ORIGINATES_IN': 'LOCATED_IN'
    };

    let r = String(relation).toUpperCase().trim();
    if (!RELATIONSHIPS[r] && REL_SYNONYMS[r]) {
      r = REL_SYNONYMS[r];
    }
    if (!RELATIONSHIPS[r]) {
      r = RELATIONSHIPS.RELATED_TO;
    }

    if (s === t) {
      throw new Error('Self-referential relationships are not permitted');
    }

    const relId = `${s}_${r}_${t}`;
    const relRecord = {
      id: relId,
      source: s,
      relation: r,
      target: t,
      properties,
      createdAt: new Date().toISOString()
    };

    localStorageEngine.set(this.relationshipCollection, relId, relRecord);

    // Update in-memory graph
    this._addEdgeToMemory(s, r, t, properties, relId);
    return relRecord;
  }

  _addEdgeToMemory(source, relation, target, properties, id) {
    if (!this.outEdges.has(source)) this.outEdges.set(source, []);
    this.outEdges.get(source).push({ target, relation, properties, id });

    if (!this.inEdges.has(target)) this.inEdges.set(target, []);
    this.inEdges.get(target).push({ source, relation, properties, id });
  }

  /**
   * Check if a direct edge exists between source and target
   */
  hasDirectEdge(source, target, relation = null) {
    const s = String(source).toLowerCase().trim();
    const t = String(target).toLowerCase().trim();
    const edges = this.outEdges.get(s);
    if (!edges) return false;
    return edges.some(e => e.target === t && (!relation || e.relation === relation));
  }

  /**
   * Save graph state to persistent storage
   */
  saveToStorage() {
    return true;
  }

  /**
   * Load entire graph from persistent local storage
   */
  loadFromStorage() {
    this.outEdges.clear();
    this.inEdges.clear();

    const relationships = localStorageEngine.getAll(this.relationshipCollection);
    for (const rel of relationships) {
      this._addEdgeToMemory(rel.source, rel.relation, rel.target, rel.properties, rel.id);
    }
  }

  /**
   * Find multi-hop paths between source and target with cycle detection
   * @param {string} source - Start entity
   * @param {string} target - End entity
   * @param {number} maxDepth - Max hops (default 4)
   * @returns {Array<{ path: Array<{ from: string, relation: string, to: string }>, description: string }>}
   */
  findPaths(source, target, maxDepth = 4) {
    const s = String(source).toLowerCase().trim();
    const t = String(target).toLowerCase().trim();
    if (s === t) return [];

    const results = [];
    const visited = new Set([s]);

    const dfs = (current, currentPath, depth) => {
      if (current === t) {
        results.push({
          path: [...currentPath],
          description: currentPath.map(p => `${p.from} → ${p.relation} → ${p.to}`).join(' AND ')
        });
        return;
      }

      if (depth >= maxDepth) return;

      const edges = this.outEdges.get(current) || [];
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          currentPath.push({ from: current, relation: edge.relation, to: edge.target });

          dfs(edge.target, currentPath, depth + 1);

          currentPath.pop();
          visited.delete(edge.target);
        }
      }
    };

    dfs(s, [], 0);
    return results;
  }

  /**
   * Deduce transitive relationship
   * E.g. Earth IS_A Planet AND Planet IS_A CelestialBody => Earth IS_A CelestialBody
   */
  deduceRelationship(source, target, relation = RELATIONSHIPS.IS_A, maxDepth = 3) {
    const paths = this.findPaths(source, target, maxDepth);

    for (const item of paths) {
      const allMatchRelation = item.path.every(step => step.relation === relation);
      if (allMatchRelation && TRANSITIVE_RELATIONS.has(relation)) {
        return {
          established: true,
          relation,
          source,
          target,
          supportingPath: item.description,
          hops: item.path.length
        };
      }
    }

    return { established: false, reason: `No valid transitive ${relation} path found between ${source} and ${target}` };
  }

  /**
   * Get all directly and indirectly connected entities
   */
  getNeighbors(entity, options = { relation: null, maxDepth: 2 }) {
    const start = String(entity).toLowerCase().trim();
    const { relation = null, maxDepth = 2 } = options;
    const discovered = new Map();
    const visited = new Set([start]);

    const queue = [{ entity: start, depth: 0, path: [] }];

    while (queue.length > 0) {
      const { entity: curr, depth, path: currPath } = queue.shift();
      if (depth >= maxDepth) continue;

      const edges = this.outEdges.get(curr) || [];
      for (const edge of edges) {
        if (relation && edge.relation !== relation) continue;
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          const nextPath = [...currPath, `${curr} -[${edge.relation}]-> ${edge.target}`];
          discovered.set(edge.target, {
            entity: edge.target,
            relation: edge.relation,
            depth: depth + 1,
            path: nextPath
          });
          queue.push({ entity: edge.target, depth: depth + 1, path: nextPath });
        }
      }
    }

    return Array.from(discovered.values());
  }
}

const knowledgeGraph = new KnowledgeGraph();

module.exports = {
  KnowledgeGraph,
  knowledgeGraph,
  RELATIONSHIPS
};
