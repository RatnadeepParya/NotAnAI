---
name: Knowledge Contribution
about: Propose verified factual records or Knowledge Graph relations
title: '[KNOWLEDGE]: '
labels: ['knowledge', 'curation']
assignees: ''
---

## Knowledge Domain
Select one of the 24 supported domains:
- [ ] Science / Physics / Chemistry / Biology / Astronomy
- [ ] Mathematics / Logic / Unit Conversions
- [ ] Computer Science / Programming / Database Administration / Cybersecurity / Networking
- [ ] Geography / World History / Literature / Philosophy
- [ ] Economics / Finance / Business
- [ ] Agriculture / Environment / Art / Music / Languages / General Knowledge

## Proposed Record JSON
```json
{
  "id": "k_<domain>_<topic>_<number>",
  "title": "Title or Question Header",
  "domain": "target-domain",
  "topic": "target-topic",
  "questionPatterns": [
    "Primary question phrasing?",
    "Alternative phrasing 1?",
    "Alternative phrasing 2?"
  ],
  "answer": "Accurate, concise, factual explanation without speculation.",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "synonyms": ["synonym1", "synonym2"],
  "entities": ["entity1", "entity2"],
  "language": "en",
  "source": {
    "type": "curated",
    "reference": "Authoritative textbook, peer-reviewed source, or official documentation"
  },
  "confidence": 0.98
}
```

## Proposed Knowledge Graph Relationships (Optional)
- Subject: `Entity A`
- Predicate: `IS_A | PART_OF | LOCATED_IN | CREATED_BY | CAUSES | DEPENDS_ON`
- Object: `Entity B`

## Verification & Sources
Provide citations, documentation links, or authoritative textbook references verifying the facts.
