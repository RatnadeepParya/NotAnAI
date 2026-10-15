# Contributing to Not an AI

Thank you for your interest in contributing to **Not an AI**!

**Not an AI** is an enterprise-grade, local-first chatbot application built without Large Language Models (LLMs), external AI APIs, or pretrained generative neural networks. Every piece of intelligence is produced through deterministic algorithms, local NLP, statistical retrieval, knowledge graphs, and rule-based deduction.

---

## 1. Ground Rules & Strict Principles

To preserve the architectural integrity of this project, all contributions must adhere to the following principles:

1. **Strictly Zero LLMs & External AI Services**:
   - Never import, call, or wrap OpenAI, Anthropic, Gemini, Groq, Mistral, Hugging Face, or any paid/free remote AI inference endpoints.
   - All language processing must be original and executed locally in pure JavaScript/Node.js.

2. **Deterministic & Explainable**:
   - Answers must be derived from verified stored knowledge or rule-based inference.
   - Every response must be capable of generating a transparent audit trace showing the exact retrieval method, matched keywords, and graph path.

3. **Local-First & Offline Resilience**:
   - The application must start and answer queries locally with zero network connectivity.
   - Firebase (Firestore & Realtime Database) is used as an optional remote synchronization layer; disconnection must never cause crashes or blocking requests.

4. **Zero Secrets in Code**:
   - Never commit API keys, service account credentials, passwords, or tokens.
   - All environment variables are kept strictly in `.env`. The `.env.example` file must remain a clean template.

5. **Security & Localhost Binding**:
   - The Express server must strictly bind to `127.0.0.1`.
   - All user inputs must be validated and sanitized. Never use `eval()` or dangerous code execution primitives.

---

## 2. Development Workflow

### Prerequisites
- Node.js LTS (v20+ recommended)
- Git

### Setup
```bash
# 1. Clone your fork
git clone https://github.com/<your-username>/NotAnAI.git
cd NotAnAI

# 2. Install dependencies
npm install

# 3. Create local environment configuration
cp .env.example .env

# 4. Bootstrap seed knowledge, build inverted index, and create admin user
npm run bootstrap

# 5. Start development server with live watch
npm run dev
```

### Running Tests & Benchmarks
Before submitting a pull request, all test suites and benchmarks must pass cleanly:

```bash
# Run all unit, security, adversarial, and integration tests
npm test

# Run individual suites
npm run test:nlp
npm run test:reasoning
npm run test:retrieval
npm run test:security
npm run test:adversarial
npm run test:integration

# Run the golden benchmark evaluation suite
npm run evaluate
```

---

## 3. Submitting Contributions

1. **Create a branch**: `git checkout -b feature/your-feature-name` or `git checkout -b fix/your-fix-name`.
2. **Follow Code Standards**:
   - Strict mode (`'use strict';`).
   - Clean, modular JavaScript with JSDoc comments.
   - Preserve existing documentation comments and architecture boundaries.
3. **Write Tests**: Every new feature or bug fix must include corresponding tests under `tests/`.
4. **Submit a Pull Request**: Fill out the PR template describing your changes, verification results, and constraint compliance.

---

## 4. Proposing Knowledge Additions

To propose new verified knowledge documents:
- Use the **Knowledge Contribution** issue template.
- Ensure all factual claims are backed by authoritative sources.
- Add corresponding entries to `data/seeds/initialKnowledge.json` or submit candidate proposals via the Admin UI.
