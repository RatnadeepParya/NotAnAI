'use strict';

const crypto = require('crypto');
const { invertedIndex } = require('../../engine/retrieval/invertedIndex');
const { knowledgeGraph } = require('../../engine/reasoning/knowledgeGraph');
const { spellChecker } = require('../../engine/nlp/spellChecker');
const KeywordExtractor = require('../../engine/nlp/keywordExtractor');
const Tokenizer = require('../../engine/nlp/tokenizer');
const { localStorageEngine } = require('../storage/localStorageEngine');
const { firestoreService } = require('../firebase/firestoreService');
const PorterStemmer = require('../../engine/nlp/stemmer');

/**
 * WebRetrievalEngine
 * Enterprise-grade deterministic RAG (Retrieval-Augmented Generation / Composition) engine:
 * 1. Multi-Stage Retrieval: Authoritative encyclopedic sources (Wikipedia REST, DuckDuckGo)
 * 2. Deterministic Passage Extraction: Sentence-level keyword scoring & direct answer synthesis
 * 3. Autonomous Continuous Self-Training: Ingests into local storage, Inverted Index, Knowledge Graph, and Vocabulary
 */
class WebRetrievalEngine {
  constructor() {
    this.localStorage = localStorageEngine;
    this.cache = new Map();
    this.maxCacheSize = 250;
    this.timeoutMs = 3800;
    this.userAgent = 'NotAnAI-Enterprise/1.0 (Local-First Deterministic Chatbot; https://github.com/NotAnAI)';
  }

  /**
   * Clean and normalize natural language query string for web search
   */
  _sanitizeQuery(rawQuery) {
    return rawQuery
      .replace(/^(?:what is|what are|what was|what were|define|explain|who was|who is|who were|tell me about|tell me|meaning of|how does|how do|how did|how can|why do|why does|why is|why are|why did|do|does|did|can a|can you|can|could|is a|is an|is it|is|are)\s+/i, '')
      .replace(/[?.,!]+$/, '')
      .trim();
  }

  /**
   * Perform fetch with strict timeout
   */
  async _fetchWithTimeout(url, options = {}, timeoutMs = 3800) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(timeout);
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Validate that a web result candidate is strictly relevant and answers the query
   * Prevents false positive hallucination from encyclopedic list or disambiguation articles.
   */
  _isResultRelevant(query, title, extract) {
    if (!title || !extract || extract.length < 30) return false;

    // Disallowed meta, list, and disambiguation pages
    const lowerTitle = title.toLowerCase();
    if (
      lowerTitle.startsWith('list of') ||
      lowerTitle.startsWith('index of') ||
      lowerTitle.startsWith('glossary of') ||
      lowerTitle.startsWith('outline of') ||
      lowerTitle.startsWith('timeline of') ||
      lowerTitle.startsWith('category:') ||
      lowerTitle.includes('disambiguation')
    ) {
      return false;
    }

    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'of', 'in', 'on', 'at', 'to',
      'for', 'with', 'by', 'from', 'about', 'tell', 'explain', 'describe', 'define', 'what',
      'who', 'where', 'when', 'why', 'how', 'which', 'whom', 'whose', 'does', 'did', 'done',
      'can', 'could', 'would', 'should', 'will', 'have', 'has', 'had', 'many', 'much', 'some',
      'any', 'that', 'this', 'these', 'those', 'there', 'here', 'please', 'know', 'using',
      'made', 'build', 'give', 'secret', 'recipe'
    ]);

    const rawQueryTokens = Tokenizer.tokenize(query.replace(/[-_/]/g, ' '))
      .map(t => t.toLowerCase())
      .filter(t => t.length > 2 && !stopWords.has(t));

    if (rawQueryTokens.length === 0) return true;

    // Porter Stemming for robust morphological matching
    const queryStems = rawQueryTokens.map(t => PorterStemmer.stem(t));
    const cleanTitle = title.replace(/[-_/]/g, ' ');
    const cleanExtract = extract.replace(/[-_/]/g, ' ');
    const lowerExtract = cleanExtract.toLowerCase();
    const lowerTitleClean = cleanTitle.toLowerCase();

    const titleStems = new Set(Tokenizer.tokenize(cleanTitle).map(t => PorterStemmer.stem(t.toLowerCase())));
    const extractStems = new Set(Tokenizer.tokenize(cleanExtract).map(t => PorterStemmer.stem(t.toLowerCase())));
    const combinedStems = new Set([...titleStems, ...extractStems]);

    let matchedInCombined = 0;
    let matchedInTitle = 0;

    for (const qs of queryStems) {
      if (combinedStems.has(qs) || lowerExtract.includes(qs) || lowerTitleClean.includes(qs)) {
        matchedInCombined++;
      }
      if (titleStems.has(qs) || lowerTitleClean.includes(qs)) {
        matchedInTitle++;
      }
    }

    const combinedCoverage = matchedInCombined / queryStems.length;

    if (queryStems.length <= 2) {
      return combinedCoverage >= 1.0 && matchedInTitle >= 1;
    }

    // For queries with 3+ content keywords, require at least 60% coverage AND at least 1 keyword in title
    // or >= 80% coverage across combined text
    return (combinedCoverage >= 0.60 && matchedInTitle >= 1) || combinedCoverage >= 0.80;
  }

  /**
   * Extract the highest-scoring passage sentence answering the query (Deterministic RAG)
   */
  _extractDirectAnswer(query, fullText) {
    if (!fullText) return null;
    const sentences = fullText.split(/(?<=[.?!])\s+/).filter(s => s.length > 20);
    if (sentences.length <= 1) return sentences[0] || fullText;

    const queryTokens = Tokenizer.tokenize(query)
      .map(t => t.toLowerCase())
      .filter(t => t.length > 2);

    let bestSentence = sentences[0];
    let maxScore = -1;

    for (const sentence of sentences) {
      const sentTokens = new Set(Tokenizer.tokenize(sentence).map(t => t.toLowerCase()));
      let matchCount = 0;
      for (const qt of queryTokens) {
        if (sentTokens.has(qt)) matchCount++;
      }
      const score = matchCount / Math.max(sentTokens.size, 1);
      if (score > maxScore && matchCount > 0) {
        maxScore = score;
        bestSentence = sentence;
      }
    }

    return bestSentence;
  }

  /**
   * Multi-stage search on Wikipedia
   */
  async _searchWikipedia(query) {
    try {
      const cleanTerm = this._sanitizeQuery(query);
      if (!cleanTerm || cleanTerm.length < 2) return null;

      // 1. Direct title summary
      const directSummaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`;
      const directData = await this._fetchWithTimeout(directSummaryUrl, {}, this.timeoutMs);

      if (directData && directData.type === 'standard' && directData.extract && directData.extract.length > 50) {
        if (this._isResultRelevant(cleanTerm, directData.title, directData.extract)) {
          return {
            title: directData.title,
            answer: directData.extract,
            description: directData.description || 'Encyclopedic entry',
            sourceUrl: directData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(directData.title)}`,
            sourceName: 'Wikipedia'
          };
        }
      }

      // 2. Wikipedia Search API with multi-candidate inspection (srlimit=5)
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTerm)}&format=json&utf8=1&srlimit=5`;
      const searchData = await this._fetchWithTimeout(searchUrl, {}, this.timeoutMs);

      if (searchData?.query?.search && searchData.query.search.length > 0) {
        for (const hit of searchData.query.search) {
          const lowerHitTitle = (hit.title || '').toLowerCase();
          if (
            lowerHitTitle.startsWith('list of') ||
            lowerHitTitle.startsWith('index of') ||
            lowerHitTitle.startsWith('glossary of') ||
            lowerHitTitle.startsWith('category:') ||
            lowerHitTitle.includes('disambiguation')
          ) {
            continue;
          }

          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`;
          const summaryData = await this._fetchWithTimeout(summaryUrl, {}, this.timeoutMs);

          if (summaryData && summaryData.type === 'standard' && summaryData.extract && summaryData.extract.length > 50) {
            if (this._isResultRelevant(cleanTerm, summaryData.title, summaryData.extract)) {
              return {
                title: summaryData.title,
                answer: summaryData.extract,
                description: summaryData.description || hit.snippet?.replace(/<[^>]+>/g, '') || 'Encyclopedic entry',
                sourceUrl: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(summaryData.title)}`,
                sourceName: 'Wikipedia'
              };
            }
          }
        }
      }

      // 3. Fallback: Search on primary entity candidate if query is complex
      const entityCandidates = KeywordExtractor.extractEntityCandidates(cleanTerm);
      if (entityCandidates.length > 0) {
        const primaryEntity = entityCandidates[0];
        const entitySummaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(primaryEntity)}`;
        const entityData = await this._fetchWithTimeout(entitySummaryUrl, {}, this.timeoutMs);

        if (entityData && entityData.type === 'standard' && entityData.extract && entityData.extract.length > 50) {
          if (this._isResultRelevant(cleanTerm, entityData.title, entityData.extract)) {
            return {
              title: entityData.title,
              answer: entityData.extract,
              description: entityData.description || 'Encyclopedic entry',
              sourceUrl: entityData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(entityData.title)}`,
              sourceName: 'Wikipedia'
            };
          }
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Search DuckDuckGo Instant Answer API with Abstract & Related Topics support
   */
  async _searchDuckDuckGo(query) {
    try {
      const cleanTerm = this._sanitizeQuery(query);
      if (!cleanTerm || cleanTerm.length < 2) return null;

      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanTerm)}&format=json&no_html=1&skip_disambig=1`;
      const data = await this._fetchWithTimeout(ddgUrl, {}, this.timeoutMs);

      if (data && data.AbstractText && data.AbstractText.length > 40) {
        if (this._isResultRelevant(cleanTerm, data.Heading || cleanTerm, data.AbstractText)) {
          return {
            title: data.Heading || cleanTerm,
            answer: data.AbstractText,
            description: data.AbstractSource || 'Instant Answer',
            sourceUrl: data.AbstractURL || 'https://duckduckgo.com',
            sourceName: data.AbstractSource || 'DuckDuckGo Instant Answer'
          };
        }
      }

      // Check RelatedTopics when AbstractText is empty
      if (data && Array.isArray(data.RelatedTopics) && data.RelatedTopics.length > 0) {
        const topic = data.RelatedTopics.find(t => {
          if (!t.Text || t.Text.length <= 40) return false;
          const candidateTitle = t.FirstURL ? t.FirstURL.split('/').pop().replace(/_/g, ' ') : cleanTerm;
          return this._isResultRelevant(cleanTerm, candidateTitle, t.Text);
        });
        if (topic) {
          const title = topic.FirstURL ? topic.FirstURL.split('/').pop().replace(/_/g, ' ') : cleanTerm;
          return {
            title,
            answer: topic.Text,
            description: 'DuckDuckGo Topic Summary',
            sourceUrl: topic.FirstURL || 'https://duckduckgo.com',
            sourceName: 'DuckDuckGo Instant Answer'
          };
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Search Google for factual passages and featured snippets
   */
  async _searchGoogle(query) {
    try {
      const cleanTerm = this._sanitizeQuery(query);
      if (!cleanTerm || cleanTerm.length < 2) return null;

      // 1. Google Custom Search JSON API (if configured in .env)
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const cx = process.env.GOOGLE_SEARCH_CX;

      if (apiKey && cx) {
        const cseUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(cleanTerm)}&num=3`;
        const cseData = await this._fetchWithTimeout(cseUrl, {}, this.timeoutMs);

        if (cseData && Array.isArray(cseData.items) && cseData.items.length > 0) {
          for (const topItem of cseData.items) {
            if (topItem.snippet && topItem.snippet.length > 30 && this._isResultRelevant(cleanTerm, topItem.title || cleanTerm, topItem.snippet)) {
              return {
                title: topItem.title || cleanTerm,
                answer: topItem.snippet.replace(/\n+/g, ' ').trim(),
                description: 'Google Programmable Search',
                sourceUrl: topItem.link || 'https://www.google.com',
                sourceName: 'Google Search'
              };
            }
          }
        }
      }

      // 2. Web Search Engine Snippet Parser
      const webUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanTerm)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(webUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml'
          }
        });
        clearTimeout(timeout);
        if (response.ok) {
          const html = await response.text();
          const snippetMatches = html.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi) || [];

          for (const match of snippetMatches) {
            const rawSnippet = match.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (rawSnippet.length > 40 && this._isResultRelevant(cleanTerm, cleanTerm, rawSnippet)) {
              return {
                title: cleanTerm,
                answer: rawSnippet,
                description: 'Web Search Engine Snippet',
                sourceUrl: 'https://duckduckgo.com/html/?q=' + encodeURIComponent(cleanTerm),
                sourceName: 'Google & Web Search'
              };
            }
          }
        }
      } catch (_) {
        clearTimeout(timeout);
      }
    } catch (_) {}
    return null;
  }

  /**
   * Retrieve from authoritative web sources, synthesize RAG passage, and self-train
   * @param {string} rawQuery
   * @param {Object} options
   * @returns {Promise<Object|null>}
   */
  async retrieveAndLearn(rawQuery, options = {}) {
    if (options.allowWeb === false || options.offlineOnly) return null;

    const cleanQuery = rawQuery.trim();
    if (cleanQuery.length < 3) return null;

    // Check memory cache
    const cacheKey = cleanQuery.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 1. Try Wikipedia first (comprehensive factual encyclopedia)
    let webResult = await this._searchWikipedia(cleanQuery);

    // 2. Try Google Search & web snippet retrieval
    if (!webResult) {
      webResult = await this._searchGoogle(cleanQuery);
    }

    // 3. Fallback to DuckDuckGo Instant Answer & Topics
    if (!webResult) {
      webResult = await this._searchDuckDuckGo(cleanQuery);
    }

    if (!webResult || !webResult.answer) {
      return null;
    }

    // Ensure retrieved result is relevant to the query
    if (!this._isResultRelevant(cleanQuery, webResult.title, webResult.answer)) {
      return null;
    }

    // 4. Extract the direct answering sentence (Deterministic RAG)
    const directAnswer = this._extractDirectAnswer(cleanQuery, webResult.answer);

    // 5. Ingest and self-train into durable storage, index, graph, and vocabulary
    const learnedDoc = this._createAndIngestKnowledgeRecord(webResult, cleanQuery, options, directAnswer);
    if (!learnedDoc) {
      return null;
    }

    // 5. Format candidate search result compatible with HybridSearch
    const candidateResult = {
      record: learnedDoc,
      score: 1.35,
      confidence: 0.95,
      explanation: {
        strategy: 'Deterministic Web RAG & Passage Extraction',
        directAnswer,
        matchedKeywords: learnedDoc.keywords.slice(0, 6),
        source: learnedDoc.source,
        isWebLearned: true,
        isRAG: true
      }
    };

    // Store in cache
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(cacheKey, candidateResult);

    return candidateResult;
  }

  /**
   * Automatically ingest and self-train from the retrieved web factual data
   */
  _createAndIngestKnowledgeRecord(webResult, originalQuery, options = {}, directAnswer = null) {
    const titleSlug = webResult.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
    const docId = `k_web_${titleSlug}_${crypto.randomBytes(3).toString('hex')}`;

    // Extract keywords and entities from both the query and the encyclopedic passage
    const combinedCorpus = `${webResult.title} ${originalQuery} ${webResult.answer}`;
    const extractedKeywords = KeywordExtractor.extractKeywords(combinedCorpus, 10).map(k => k.term);
    const extractedEntities = KeywordExtractor.extractEntityCandidates(combinedCorpus);

    const cleanTokens = Tokenizer.tokenize(originalQuery)
      .filter(t => t.length > 2)
      .map(t => t.toLowerCase());

    const titleTokens = Tokenizer.tokenize(webResult.title)
      .map(t => t.toLowerCase());

    const keywords = Array.from(new Set([
      ...extractedKeywords,
      ...cleanTokens,
      ...titleTokens
    ]));

    // Detect general domain
    const domain = options.domain || 'general-knowledge';
    const topic = webResult.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const questionPatterns = Array.from(new Set([
      originalQuery,
      this._sanitizeQuery(originalQuery),
      `What is ${webResult.title}?`,
      `Define ${webResult.title}`,
      `Explain ${webResult.title}`,
      `Tell me about ${webResult.title}`
    ])).filter(p => p && p.length > 2);

    const knowledgeDoc = {
      id: docId,
      title: webResult.title,
      domain,
      topic,
      questionPatterns,
      answer: webResult.answer,
      keywords,
      synonyms: [webResult.title.toLowerCase(), this._sanitizeQuery(originalQuery).toLowerCase()],
      entities: extractedEntities.slice(0, 6),
      relationships: [],
      language: options.language || 'en',
      source: {
        type: 'web_rag',
        reference: webResult.sourceUrl,
        publisher: webResult.sourceName,
        retrievedAt: new Date().toISOString()
      },
      verificationStatus: 'verified',
      confidence: 0.95,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        directAnswer: directAnswer || null,
        isRAG: true
      }
    };

    // Validate candidate against Ingestion Guardrails (Anti-Poisoning & Content Safety)
    const { guardrailEngine } = require('../../engine/guardrails/guardrailEngine');
    const guardrailCheck = guardrailEngine.validateCandidateForIngestion(knowledgeDoc);
    if (!guardrailCheck.isApproved) {
      console.warn(`[WebRetrievalEngine] Ingestion rejected by Guardrails: ${guardrailCheck.reason}`);
      return null;
    }

    // 1. Ingest into durable storage (Local Storage Engine & Firebase Firestore)
    this.localStorage.set('knowledge', docId, knowledgeDoc);
    firestoreService.set('knowledge', docId, knowledgeDoc).catch(() => {});

    // 2. Add to Inverted Index for immediate local sub-millisecond retrieval on subsequent queries
    invertedIndex.addDocument(knowledgeDoc);
    invertedIndex.saveToDisk();

    // 3. Register entities into Knowledge Graph
    for (const ent of knowledgeDoc.entities) {
      knowledgeGraph.addEntity(ent, {
        name: ent,
        type: 'concept',
        discoveredVia: 'web_rag'
      });
    }

    // Connect primary entities with graph relations
    if (knowledgeDoc.entities.length >= 2) {
      knowledgeGraph.addRelationship(knowledgeDoc.entities[0], 'RELATED_TO', knowledgeDoc.entities[1], {
        confidence: 0.88,
        source: 'web_rag'
      });
      knowledgeGraph.saveToStorage();
    }

    // 4. Expand spelling dictionary with new terms from the query and the retrieved passage
    const newWords = Tokenizer.tokenize(combinedCorpus);
    for (const word of newWords) {
      const clean = word.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (clean.length >= 3 && !spellChecker.dictionary.has(clean)) {
        spellChecker.addWord(clean, 5);
      }
    }

    console.log(`[WebRetrievalEngine] Self-Trained new knowledge record "${webResult.title}" (ID: ${docId}) via Deterministic RAG.`);
    return knowledgeDoc;
  }
}

const webRetrievalEngine = new WebRetrievalEngine();

module.exports = {
  WebRetrievalEngine,
  webRetrievalEngine
};
