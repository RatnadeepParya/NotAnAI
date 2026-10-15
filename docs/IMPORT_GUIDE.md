# Not an AI — Dataset Ingestion & Import Guide

## 1. Supported Import Formats

The ingestion pipeline in `src/services/knowledge/ingestionService.js` supports:
- **JSON**: Structured array of knowledge objects
- **CSV**: Spreadsheet rows with delimited question patterns, keywords, and synonyms
- **Markdown**: Heading-structured knowledge notes (`# Title` and text body)

---

## 2. JSON Ingestion Schema

```json
[
  {
    "id": "k_custom_001",
    "title": "What is quantum mechanics?",
    "domain": "physics",
    "topic": "quantum-physics",
    "questionPatterns": [
      "What is quantum mechanics?",
      "Explain quantum physics",
      "Define quantum mechanics"
    ],
    "answer": "Quantum mechanics is a fundamental theory in physics that describes the behavior of nature at the scale of atoms and subatomic particles.",
    "keywords": ["quantum", "physics", "particles", "atoms", "mechanics"],
    "synonyms": ["quantum physics"],
    "entities": ["quantum mechanics", "physics"],
    "relationships": [
      { "source": "quantum mechanics", "relation": "IS_A", "target": "branch_of_physics" }
    ],
    "language": "en",
    "source": {
      "type": "curated",
      "reference": "Physics Principles"
    },
    "verificationStatus": "verified",
    "confidence": 0.99
  }
]
```

---

## 3. CSV Ingestion Schema

Columns: `id`, `title`, `domain`, `topic`, `questionPatterns` (semi-colon separated), `answer`, `keywords` (semi-colon separated), `synonyms` (semi-colon separated).

```csv
id,title,domain,topic,questionPatterns,answer,keywords
k_chem_gold,What is gold?,chemistry,elements,What is gold?;Define gold,Gold is a chemical element with the symbol Au and atomic number 79.,gold;element;chemistry;metal
```

---

## 4. Ingestion via Admin Dashboard or CLI

- **Admin Web Dashboard**: Navigate to `/admin/knowledge` and click `+ Add Knowledge Record` or import through the Admin UI.
- **Node CLI**:
```javascript
const { ingestionService } = require('./src/services/knowledge/ingestionService');
const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('./my_dataset.json', 'utf8'));
const result = ingestionService.importJSON(raw);
console.log(`Imported ${result.imported} documents, ${result.duplicates} duplicates, ${result.rejected} rejected.`);
```
