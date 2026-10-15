'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '127.0.0.1',
  sessionSecret: process.env.SESSION_SECRET || 'not_an_ai_session_secret_dev_2026',
  cookieSecure: process.env.COOKIE_SECURE === 'true',

  // Directory paths
  paths: {
    root: ROOT_DIR,
    data: path.resolve(ROOT_DIR, process.env.DATA_DIR || './data'),
    indexes: path.resolve(ROOT_DIR, process.env.INDEXES_DIR || './data/indexes'),
    cache: path.resolve(ROOT_DIR, process.env.CACHE_DIR || './data/cache'),
    snapshots: path.resolve(ROOT_DIR, process.env.SNAPSHOTS_DIR || './data/snapshots'),
    imports: path.resolve(ROOT_DIR, process.env.IMPORTS_DIR || './data/imports'),
    seeds: path.resolve(ROOT_DIR, './data/seeds'),
    dictionaries: path.resolve(ROOT_DIR, './data/dictionaries')
  },

  // Firebase Configuration (loaded strictly from environment variables)
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    databaseURL: process.env.FIREBASE_DATABASE_URL || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || ''
  },

  // Engine Settings
  engine: {
    bm25: {
      k1: parseFloat(process.env.DEFAULT_BM25_K1) || 1.5,
      b: parseFloat(process.env.DEFAULT_BM25_B) || 0.75
    },
    maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS, 10) || 10,
    minConfidenceThreshold: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD) || 0.35,
    highConfidenceThreshold: parseFloat(process.env.HIGH_CONFIDENCE_THRESHOLD) || 0.75,
    lruCacheCapacity: parseInt(process.env.LRU_CACHE_CAPACITY, 10) || 1000
  },

  // Security & Rate Limiting
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 120,
    adminSetupToken: process.env.ADMIN_SETUP_TOKEN || 'notanai_admin_init_token_secure_2026'
  }
};
