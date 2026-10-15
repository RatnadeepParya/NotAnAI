#!/usr/bin/env bash
# =============================================================================
# Not an AI — Firebase Security Rules Deploy Script (macOS / Linux)
# =============================================================================
set -e

# Terminal Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}========================================================${NC}"
echo -e "${BOLD}${BLUE}   Not an AI — Firebase Security Rules Deployer        ${NC}"
echo -e "${BOLD}${BLUE}========================================================${NC}\n"

# 1. Ensure .env exists
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found.${NC}"
  echo -e "Please create .env (or copy from .env.example) and configure FIREBASE_PROJECT_ID."
  exit 1
fi

# 2. Extract FIREBASE_PROJECT_ID strictly from .env
PROJECT_ID=$(grep -E '^FIREBASE_PROJECT_ID=' .env | cut -d '=' -f2- | tr -d ' "' | tr -d '\r')

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: FIREBASE_PROJECT_ID is empty or not set in .env.${NC}"
  echo -e "Please set your Firebase project ID in .env before deploying rules."
  exit 1
fi

echo -e "${BLUE}Target Firebase Project:${NC} ${BOLD}${PROJECT_ID}${NC}\n"

# 3. Determine Firebase CLI binary
if command -v firebase >/dev/null 2>&1; then
  FIREBASE_CMD="firebase"
else
  echo -e "${YELLOW}Notice: Global firebase CLI not found. Using npx firebase-tools...${NC}"
  FIREBASE_CMD="npx --yes firebase-tools"
fi

# 4. Deploy rules and indexes to Firestore and Realtime Database
echo -e "${BLUE}Deploying firestore.rules, firestore.indexes.json and database.rules.json to ${PROJECT_ID}...${NC}"
$FIREBASE_CMD deploy --project "$PROJECT_ID" --only firestore:rules,firestore:indexes,database

echo -e "\n${BOLD}${GREEN}========================================================${NC}"
echo -e "${BOLD}${GREEN}  ✓ Security Rules Deployed Successfully to ${PROJECT_ID} ${NC}"
echo -e "${BOLD}${GREEN}========================================================${NC}\n"
