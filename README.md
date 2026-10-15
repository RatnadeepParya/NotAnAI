# Not an AI ⚡

> **Enterprise-grade, local-first intelligent chatbot built entirely WITHOUT Large Language Models (LLMs) or external AI APIs.**

---

## 1. Overview

**Not an AI** is a fully functional, explainable, self-improving chatbot designed to run locally using Node.js and Express. It delivers factual answers, solves mathematical expressions, converts units, deduces relationships via knowledge graphs, remembers context across conversations, and learns from user contributions under administrator review.

### Strict Guarantees:
- **NO Large Language Models** (No GPT, Gemini, Claude, Groq, Llama, etc.)
- **NO External AI APIs** or cloud-hosted generative endpoints
- **NO Paid NLP Services**
- **NO Hallucinations**: Honest knowledge boundary rejection when facts are not stored
- **100% Local Intelligence**: Deterministic NLP, BM25 statistical retrieval, Knowledge Graph multi-hop traversal, and AST-based arithmetic parsing
- **Offline-First Resilience**: Full local persistence on disk; Cloud Firestore and Realtime Database are remote synchronization layers

---

## 2. Technology Stack

- **Backend**: Node.js (LTS), Express.js (MVC Architecture)
- **Frontend**: EJS Server-Rendered Templates, Modern CSS3 (Dark/Light themes), Vanilla JavaScript
- **Databases**:
  - **Cloud Firestore**: Durable structured knowledge records, entities, relationships, rules, learning candidates, feedback, audit logs.
  - **Firebase Realtime Database**: Rapidly changing active session messages, presence, typing, sync state.
  - **Local Disk**: Persistent inverted index (`inverted_index.json`), snapshots, staging, LRU cache.
- **Security**: Local binding to `127.0.0.1`, Helmet security headers, PBKDF2 password hashing, CSRF protection, rate limiting, and RBAC (`Administrator`, `Knowledge Editor`, `Knowledge Reviewer`, `Regular User`, `Guest`).

---

## 3. Architecture & Processing Pipeline

Each user query flows through a deterministic 14-stage pipeline:

```text
User Input
  ↓
1. Input Validation & Size Limits
  ↓
2. Language Detection (Trigram & Stopword profiles)
  ↓
3. Text Normalization (Unicode NFKC, accent stripping, case folding)
  ↓
4. Tokenization & Lemmatization (Porter Stemmer & Curated Lemmatizer)
  ↓
5. Spelling Correction (Damerau-Levenshtein & N-gram filtering)
  ↓
6. Context Resolution & Pronoun Resolution (Short-term session memory)
  ↓
7. Intent Classification (14 intents: greeting, definition, calculation, etc.)
  ↓
8. Entity & Keyword Extraction (TF-IDF sublinear weighting)
  ↓
9. Rule-Based Reasoning & Safe Math AST Parser (Zero eval)
  ↓
10. Knowledge Retrieval & BM25 Scoring (Okapi BM25 inverted index)
  ↓
11. Multi-factor Candidate Ranking & Verification Weighting
  ↓
12. Response Composition & Explainability Trace Generation
  ↓
13. Short-Term & Long-Term Memory Update
  ↓
14. Delivery & Controlled Self-Learning Ingestion
```

---

## 4. Getting Started

### Prerequisites
- Node.js LTS (v18+ or v20+)
- npm (v9+)

### Installation
```bash
# Clone or navigate to the repository
cd NotAnAI

# Install dependencies
npm install

# Initialize seed knowledge, knowledge graph, and admin account
npm run bootstrap
```

### Running the Application
```bash
# Start the local server (bound to 127.0.0.1:3000)
npm start

# For development with auto-reload:
npm run dev
```

Visit **`http://127.0.0.1:3000`** in your browser.

---

## 5. Default Accounts & Credentials

During bootstrapping, an initial administrator account is generated:
- **Email**: `admin@notanai.local`
- **Password**: `AdminPassword2026!`
- **Role**: `Administrator`

*To configure a custom administrator setup token, see `.env` (`ADMIN_SETUP_TOKEN`).*

---

## 6. Running Tests & Benchmarks

```bash
# Run all 32 automated unit, security, and adversarial tests
npm test

# Run individual test suites:
npm run test:nlp
npm run test:reasoning
npm run test:retrieval
npm run test:security
npm run test:adversarial

# Run the golden benchmark evaluation suite (Top-1, Top-3, MRR, Intent Accuracy)
npm run evaluate
```

### Benchmark Results
- **Top-1 Retrieval Accuracy**: `100.0%`
- **Top-3 Retrieval Accuracy**: `100.0%`
- **Mean Reciprocal Rank (MRR)**: `1.000`
- **Intent Accuracy**: `100.0%`
- **Rejection Accuracy**: `100.0%` (Zero hallucination on fictitious queries)
- **Average Retrieval Latency**: `2ms` per query

---

## 7. Knowledge Domains Supported

The system is bootstrapped with curated knowledge across 24 standard domains:
1. Science
2. Mathematics
3. Physics
4. Chemistry
5. Biology
6. Astronomy
7. Geography
8. History
9. Literature
10. Philosophy
11. Computer Science
12. Programming
13. Database Administration
14. Networking
15. Cybersecurity
16. Engineering
17. Economics
18. Finance
19. Business
20. Agriculture
21. Environment
22. Art
23. Music
24. Languages & General Knowledge

---

## 8. Firebase Configuration & Deployment

Firebase credentials are kept strictly in your local `.env` file (copied from `.env.example`).
The production security rules are authored and ready:
- `firestore.rules` (Strict role-based access, domain validations, immutable fields)
- `database.rules.json` (Realtime Database user-scoped ownership)
- `firestore.indexes.json` (Composite indexes for queries)
- `firebase.json` (Firebase configuration & local emulator ports)

---

## 9. License

MIT License. Built for rigorous local-first conversational computing.
