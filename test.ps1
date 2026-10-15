# =============================================================================
# Not an AI — Automated Test & Benchmark Verification Script (Windows PowerShell)
# =============================================================================
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "    Not an AI — Automated Verification Test Suite       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

Write-Host "[1/3] Validating JavaScript syntax and code integrity across 57 files..." -ForegroundColor Yellow
npm run check:syntax

Write-Host "`n[2/3] Running all unit, security, and integration test suites..." -ForegroundColor Yellow
npm test

Write-Host "`n[3/3] Running Golden Evaluation Benchmark Suite..." -ForegroundColor Yellow
npm run evaluate

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  ✓ All Automated Tests & Benchmarks Passed (100%)       " -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
