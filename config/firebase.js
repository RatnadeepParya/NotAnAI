'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./app');

// State flags
let adminApp = null;
let clientApp = null;
let adminDb = null;
let adminRtdb = null;
let adminAuth = null;
let clientDb = null;
let clientRtdb = null;
let clientAuth = null;

let isFirestoreAvailable = false;
let isRtdbAvailable = false;
let isOfflineMode = false;
let lastHealthCheck = null;

/**
 * Initialize Firebase Admin SDK if service account is available
 */
function initAdminSDK() {
  try {
    const admin = require('firebase-admin');
    const serviceAccountPath = config.firebase.serviceAccountPath;

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: config.firebase.databaseURL,
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket
      }, 'app-admin');

      adminDb = admin.firestore(adminApp);
      adminRtdb = admin.database(adminApp);
      adminAuth = admin.auth(adminApp);
      isFirestoreAvailable = true;
      isRtdbAvailable = true;
      console.log(' [Firebase] Admin SDK initialized with service account.');
      return true;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: config.firebase.databaseURL,
        projectId: config.firebase.projectId
      }, 'app-admin');

      adminDb = admin.firestore(adminApp);
      adminRtdb = admin.database(adminApp);
      adminAuth = admin.auth(adminApp);
      isFirestoreAvailable = true;
      isRtdbAvailable = true;
      console.log(' [Firebase] Admin SDK initialized with Application Default Credentials.');
      return true;
    }
  } catch (err) {
    console.warn(' [Firebase] Admin SDK initialization skipped:', err.message);
  }
  return false;
}

/**
 * Initialize Firebase Web Client SDK
 */
function initClientSDK() {
  try {
    const { initializeApp } = require('firebase/app');
    const { getFirestore, setLogLevel } = require('firebase/firestore');
    const { getDatabase } = require('firebase/database');
    const { getAuth } = require('firebase/auth');

    try {
      setLogLevel('silent');
    } catch (_) {}

    clientApp = initializeApp(config.firebase, 'app-client');
    clientDb = getFirestore(clientApp);
    clientRtdb = getDatabase(clientApp);
    clientAuth = getAuth(clientApp);

    if (!adminDb) isFirestoreAvailable = true;
    if (!adminRtdb) isRtdbAvailable = true;
    console.log(' [Firebase] Client SDK initialized successfully.');
    return true;
  } catch (err) {
    console.warn(' [Firebase] Client SDK initialization note:', err.message);
    return false;
  }
}

/**
 * Close open remote connections gracefully
 */
async function closeConnections() {
  try {
    if (clientDb) {
      const { terminate } = require('firebase/firestore');
      await terminate(clientDb);
    }
  } catch (_) {}
}

/**
 * Check connection status
 */
async function checkConnectionHealth() {
  const result = {
    online: isFirestoreAvailable || isRtdbAvailable,
    firestore: isFirestoreAvailable,
    realtimeDb: isRtdbAvailable,
    adminSdkActive: !!adminApp,
    clientSdkActive: !!clientApp,
    offlineMode: isOfflineMode,
    timestamp: new Date().toISOString()
  };
  lastHealthCheck = result;
  return result;
}

function setOfflineMode(enabled) {
  isOfflineMode = !!enabled;
}

// Auto-initialize
const adminInit = initAdminSDK();
if (!adminInit) {
  initClientSDK();
}

module.exports = {
  config: config.firebase,
  getAdminApp: () => adminApp,
  getClientApp: () => clientApp,
  getFirestore: () => adminDb || clientDb,
  getRealtimeDb: () => adminRtdb || clientRtdb,
  getAuth: () => adminAuth || clientAuth,
  checkConnectionHealth,
  setOfflineMode,
  closeConnections,
  isOnline: () => (isFirestoreAvailable || isRtdbAvailable) && !isOfflineMode,
  getStatus: () => ({
    firestore: isFirestoreAvailable && !isOfflineMode,
    realtimeDb: isRtdbAvailable && !isOfflineMode,
    adminSdk: !!adminApp,
    offlineMode: isOfflineMode,
    lastCheck: lastHealthCheck
  })
};
