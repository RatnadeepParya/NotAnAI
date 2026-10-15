#!/usr/bin/env bash
# =============================================================================
# Not an AI — Automated Test & Benchmark Verification Script (macOS / Linux)
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
echo -e "${BOLD}${BLUE}    Not an AI — Automated Verification Test Suite       ${NC}"
echo -e "${BOLD}${BLUE}========================================================${NC}\n"

echo -e "${BLUE}[1/3] Validating JavaScript syntax and code integrity across 57 files...${NC}"
npm run check:syntax

echo -e "\n${BLUE}[2/3] Running all unit, security, and integration test suites...${NC}"
npm test

echo -e "\n${BLUE}[3/3] Running Golden Evaluation Benchmark Suite...${NC}"
npm run evaluate

echo -e "\n${BOLD}${GREEN}========================================================${NC}"
echo -e "${BOLD}${GREEN}  ✓ All Automated Tests & Benchmarks Passed (100%)       ${NC}"
echo -e "${BOLD}${GREEN}========================================================${NC}\n"
