#!/usr/bin/env bash
# =============================================================================
# Not an AI — Automated Installation & Setup Script (macOS / Linux)
# =============================================================================
set -e

# Terminal Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}========================================================${NC}"
echo -e "${BOLD}${BLUE}       Not an AI — Setup & Installation Engine          ${NC}"
echo -e "${BOLD}${BLUE}  Enterprise Local-First Chatbot (Zero LLMs / APIs)    ${NC}"
echo -e "${BOLD}${BLUE}========================================================${NC}\n"

# 1. Check Node.js prerequisite
echo -e "${BLUE}[1/5] Checking Node.js environment...${NC}"
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Error: Node.js is not installed or not in PATH.${NC}"
  echo -e "Please install Node.js LTS (v20+ recommended) from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js detected: ${NODE_VERSION}${NC}"

# 2. Check npm prerequisite
if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}Error: npm is not installed or not in PATH.${NC}"
  exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm detected: v${NPM_VERSION}${NC}\n"

# 3. Environment configuration setup (.env)
echo -e "${BLUE}[2/5] Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo -e "${YELLOW}Creating .env from template .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env successfully.${NC}"
    echo -e "${YELLOW}Notice: Remember to edit .env with your specific Firebase credentials if you wish to enable remote synchronization.${NC}"
  else
    echo -e "${RED}Error: Neither .env nor .env.example found.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ .env file already exists.${NC}"
fi
echo ""

# 4. Install npm dependencies
echo -e "${BLUE}[3/5] Installing production & development dependencies...${NC}"
npm install --quiet
echo -e "${GREEN}✓ Dependencies installed successfully.${NC}\n"

# 5. Bootstrap Knowledge Base & Administrator
echo -e "${BLUE}[4/5] Bootstrapping seed knowledge & building inverted indexes...${NC}"
npm run bootstrap
echo -e "${GREEN}✓ Initial knowledge base and inverted index ready.${NC}\n"

# 6. Run Self-Training & Optimization Engine
echo -e "${BLUE}[5/5] Executing self-training & BM25 optimization...${NC}"
npm run train
echo -e "${GREEN}✓ Self-training and parameter optimization complete.${NC}\n"

echo -e "${BOLD}${GREEN}========================================================${NC}"
echo -e "${BOLD}${GREEN}   Installation Complete! Not an AI is ready to run.   ${NC}"
echo -e "${BOLD}${GREEN}========================================================${NC}"
echo -e "To start the application, run:"
echo -e "  ${BOLD}./start.sh${NC}   or   ${BOLD}npm start${NC}\n"
echo -e "Application will be accessible locally at: ${BOLD}http://127.0.0.1:3000${NC}\n"
