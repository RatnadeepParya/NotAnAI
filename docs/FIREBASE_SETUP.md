# Not an AI — Firebase Configuration & Security Rules Guide

## 1. Firebase Configuration Overview

All Firebase credentials must be kept strictly in your local `.env` file (copied from `.env.example`). Never commit credentials to source control.

- **Project ID**: Configured via `FIREBASE_PROJECT_ID` in `.env`
- **Auth Domain**: Configured via `FIREBASE_AUTH_DOMAIN` in `.env`
- **Database URL**: Configured via `FIREBASE_DATABASE_URL` in `.env`
- **Storage Bucket**: Configured via `FIREBASE_STORAGE_BUCKET` in `.env`

---

## 2. Security Architecture

1. **Local-First Isolation**:
   - The Express application runs locally on `127.0.0.1`.
   - The Firebase Web API Key is a public identifier, never treated as administrative authorization.
   - Administrative actions require server-side session authentication with the `Administrator` role.

2. **Security Rules**:
   - `firestore.rules`: 792 lines of production-grade CEL security rules implementing:
     - Root default deny (`allow read, write: if false;`)
     - Role-based access control (Admin, Editor, Reviewer, User, Guest)
     - Strict subcollection scoping (`/users/{uid}/...` strictly owner-only)
     - Mandatory length, size, and type validation on all document writes
     - Immutable creation timestamps, document IDs, and submission UIDs
     - Field diff isolation for reviewers (can only edit `verificationStatus` and `confidence` on knowledge records)
   - `database.rules.json`: Realtime Database rules protecting user-scoped message threads, presence, and typing status.
   - `firestore.indexes.json`: Composite index definitions.

---

## 3. Local Emulator Testing

To test the security rules locally using the Firebase Emulator Suite:
```bash
# Start Firebase Emulators
npx firebase emulators:start
```
The emulator UI will be available at `http://127.0.0.1:4000`.

---

## 4. Deploying Rules to Production

```bash
# Login to Firebase CLI
npx firebase login

# Deploy Firestore and Realtime Database security rules only
npx firebase deploy --only firestore:rules,database
```
*Note: Do NOT deploy this application to Firebase Hosting or Firebase Cloud Functions, as per project requirements.*
