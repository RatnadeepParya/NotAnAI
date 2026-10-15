# =============================================================================
# Not an AI — Automated Installation & Setup Script (Windows PowerShell)
# =============================================================================
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Not an AI — Setup & Installation Engine          " -ForegroundColor Cyan
Write-Host "  Enterprise Local-First Chatbot (Zero LLMs / APIs)    " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Check Node.js
Write-Host "[1/5] Checking Node.js environment..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js LTS (v20+ recommended) from https://nodejs.org" -ForegroundColor Red
    Exit 1
}
$nodeVersion = node -v
Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green

# 2. Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm is not installed or not in PATH." -ForegroundColor Red
    Exit 1
}
$npmVersion = npm -v
Write-Host "npm detected: v$npmVersion`n" -ForegroundColor Green

# 3. Setup .env from .env.example
Write-Host "[2/5] Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "Creating .env from template .env.example..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env successfully." -ForegroundColor Green
        Write-Host "Notice: Remember to edit .env with your specific Firebase credentials if you wish to enable remote synchronization." -ForegroundColor DarkYellow
    } else {
        Write-Host "Error: Neither .env nor .env.example found." -ForegroundColor Red
        Exit 1
    }
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}
Write-Host ""

# 4. Install npm dependencies
Write-Host "[3/5] Installing production & development dependencies..." -ForegroundColor Yellow
npm install
Write-Host "Dependencies installed successfully.`n" -ForegroundColor Green

# 5. Bootstrap Knowledge Base & Administrator
Write-Host "[4/5] Bootstrapping seed knowledge & building inverted indexes..." -ForegroundColor Yellow
npm run bootstrap
Write-Host "Initial knowledge base and inverted index ready.`n" -ForegroundColor Green

# 6. Run Self-Training & Optimization Engine
Write-Host "[5/5] Executing self-training & BM25 optimization..." -ForegroundColor Yellow
npm run train
Write-Host "Self-training and parameter optimization complete.`n" -ForegroundColor Green

Write-Host "========================================================" -ForegroundColor Green
Write-Host "   Installation Complete! Not an AI is ready to run.   " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "To start the application, run:"
Write-Host "  .\start.ps1   or   npm start`n" -ForegroundColor White
Write-Host "Application will be accessible locally at: http://127.0.0.1:3000`n" -ForegroundColor Cyan
