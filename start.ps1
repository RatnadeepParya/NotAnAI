# =============================================================================
# Not an AI — Server Launcher Script (Windows PowerShell)
# =============================================================================
$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env not found. Running .\install.ps1 first..." -ForegroundColor Yellow
    .\install.ps1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "data/indexes/bm25_index.json")) {
    Write-Host "Initializing seed knowledge base and indexes..." -ForegroundColor Cyan
    npm run bootstrap
}

Write-Host "Starting Not an AI Server on http://127.0.0.1:3000..." -ForegroundColor Green
node app.js
