# Not an AI — Technical Architecture Guide

## 1. System Overview

**Not an AI** is architected as a local-first, multi-tier system combining deterministic Natural Language Processing, statistical Information Retrieval, knowledge graph traversal, and symbolic rule-based reasoning.

```
                      +-----------------------------+
                      |         Web Client          |
                      |  (EJS, Modern CSS, Vanilla) |
                      +--------------+--------------+
                                     | HTTP / SSE
                                     v
+------------------------------------+------------------------------------+
|                        Express Backend (127.0.0.1)                     |
|                                                                         |
|  +--------------------+   +--------------------+   +-----------------+  |
|  |  Auth & RBAC       |   |  CSRF & Helmet     |   | Rate Limiter    |  |
|  +--------------------+   +--------------------+   +-----------------+  |
|                                                                         |
|  Controllers: ChatController | AdminController | AuthController        |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                     Deterministic NLP & Reasoning Engine                |
|                                                                         |
|  1. Text Normalizer (Unicode NFKC, accent stripping)                   |
|  2. Tokenizer & Stopword Filtering                                     |
|  3. Morphological Stemmer (Porter 1980) & Curated Lemmatizer            |
|  4. Spelling Corrector (Damerau-Levenshtein + Q-Gram Inverted Index)   |
|  5. Intent Classifier (14 intents, statistical keyword weights)        |
|  6. Keyword & Entity Extractor (Sublinear TF-IDF + Position Boost)     |
|  7. SafeMathParser (AST Shunting-Yard, Zero eval)                      |
|  8. UnitConverter (Linear conversion tables + non-linear temperature)  |
|  9. KnowledgeGraph (Multi-hop DFS with cycle detection)                |
| 10. HybridSearchEngine (Okapi BM25 + Pattern Match + Context Boost)   |
| 11. ResponseComposer (Grammatical templates + Transparency metadata)   |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         Dual-Layer Persistence                         |
|                                                                         |
|  [Local-First Engine]                 [Remote Persistence Layer]       |
|  - LocalStorageEngine (Atomic JSON)   - Cloud Firestore (Structured)   |
|  - InvertedIndex (Persistent BM25)    - Realtime Database (Sessions)   |
|  - OfflineSyncManager (Backoff queue)                                  |
+-------------------------------------------------------------------------+
```

---

## 2. Core Algorithmic Components

### A. Okapi BM25 Ranking
BM25 estimates the relevance of a document $D$ to a query $Q = \{q_1, \dots, q_n\}$:

$$Score(D, Q) = \sum_{i=1}^{n} IDF(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

Where:
- $k_1 = 1.5$ (term frequency saturation control)
- $b = 0.75$ (document length normalization control)
- $IDF(q_i) = \ln\left(\frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1\right)$ (Robertson-Spärck Jones formula)

### B. Damerau-Levenshtein Distance
Measures the minimum edit operations (insertions, deletions, substitutions, and adjacent transpositions) between two strings in $O(m \cdot n)$ time:

$$d(i, j) = \min \begin{cases}
d(i-1, j) + 1 & \text{deletion} \\
d(i, j-1) + 1 & \text{insertion} \\
d(i-1, j-1) + \text{cost} & \text{substitution} \\
d(k-1, l-1) + (i - k - 1) + 1 + (j - l - 1) & \text{transposition}
\end{cases}$$

### C. Knowledge Graph Deduction
Transitive relationships such as `IS_A`, `PART_OF`, and `LOCATED_IN` support multi-hop forward deduction:
$$\text{Earth} \xrightarrow{\text{IS\_A}} \text{Planet} \land \text{Planet} \xrightarrow{\text{IS\_A}} \text{CelestialBody} \implies \text{Earth} \xrightarrow{\text{IS\_A}} \text{CelestialBody}$$

Cycle detection is enforced using visited vertex sets. Every deduced conclusion retains its full proof path for complete explainability.

### D. Safe Arithmetic AST Evaluator
Expressions are parsed into tokens and converted to Reverse Polish Notation (RPN) using Dijkstra's Shunting-Yard algorithm. Stack-based evaluation calculates results in $O(n)$ time with zero usage of `eval()` or `Function()`.

---

## 3. Controlled Self-Learning & Anti-Poisoning Architecture

1. **Feedback Ingestion**: Users can rate answers as positive or negative, and optionally submit factual corrections.
2. **Candidate Creation**: Factual corrections enter the `learningCandidates` collection with status `pending`.
3. **Strict Isolation**: Unreviewed candidates are never indexed in the inverted index and cannot be retrieved by queries.
4. **Reviewer / Admin Workflow**: Only users with `Knowledge Reviewer` or `Administrator` roles can approve candidates.
5. **Publishing**: Approved candidates are imported into the verified knowledge base and indexed incrementally into the persistent BM25 index.
