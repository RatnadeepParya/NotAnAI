'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const config = require('./config/app');
const firebaseConfig = require('./config/firebase');
const { sessionAuth } = require('./src/middleware/authMiddleware');
const { invertedIndex } = require('./src/engine/retrieval/invertedIndex');
const { knowledgeGraph } = require('./src/engine/reasoning/knowledgeGraph');
const { offlineSyncManager } = require('./src/services/sync/offlineSyncManager');
const bootstrap = require('./scripts/bootstrap');

// Import Route Handlers
const chatRoutes = require('./src/routes/chatRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const authRoutes = require('./src/routes/authRoutes');
const apiRoutes = require('./src/routes/apiRoutes');

const app = express();

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"]
    }
  }
}));

// Body Parsers & Request Size Limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute and try again.' }
});
app.use('/api/', limiter);

// Server-side Session Management
app.use(session({
  name: 'notanai.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Global Auth & Context Middleware
app.use(sessionAuth);

// Mount Application Routes
app.use('/', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// 404 Error Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'The requested page or resource could not be found.'
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[App Error]', err);
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(status).json({ error: err.message || 'Internal Server Error' });
  }

  res.status(status).render('error', {
    title: 'Error Occurred',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start Server and Initialize Services
async function startServer() {
  // 1. Ensure seed data and indexes exist
  const indexLoaded = invertedIndex.loadFromDisk();
  if (!indexLoaded || invertedIndex.totalDocs === 0) {
    console.log('[System] Initializing seed knowledge and indexes...');
    await bootstrap();
  } else {
    console.log(`[System] Inverted index loaded (${invertedIndex.totalDocs} documents).`);
    knowledgeGraph.loadFromStorage();
  }

  // 2. Start offline sync background runner
  offlineSyncManager.startPeriodicSync(15000);

  // 3. Bind exclusively to 127.0.0.1 for local security
  const server = app.listen(config.port, config.host, () => {
    console.log('========================================================');
    console.log(`  Not an AI is running at http://${config.host}:${config.port}`);
    console.log(`  Environment: ${config.env}`);
    console.log(`  Local-First Engine: Ready (Zero LLMs / Zero External APIs)`);
    console.log('========================================================');
  });

  // Graceful Shutdown
  const shutdown = () => {
    console.log('\n[System] Gracefully shutting down...');
    offlineSyncManager.stopPeriodicSync();
    invertedIndex.saveToDisk();
    server.close(() => {
      console.log('[System] Server closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('[System] Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
