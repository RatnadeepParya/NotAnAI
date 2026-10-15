#!/usr/bin/env bash
# =============================================================================
# Not an AI — Server Launcher Script (macOS / Linux)
# =============================================================================
set -e

# Terminal Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Ensure .env exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Warning: .env not found. Running ./install.sh first...${NC}"
  ./install.sh
fi

# Ensure node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
  npm install
fi

# Ensure seed data / indexes exist
if [ ! -d "data/indexes" ] || [ ! -f "data/indexes/bm25_index.json" ]; then
  echo -e "${BLUE}Initializing seed knowledge base and indexes...${NC}"
  npm run bootstrap
fi

echo -e "${BOLD}${GREEN}Starting Not an AI Server on http://127.0.0.1:3000...${NC}"
exec node app.js
