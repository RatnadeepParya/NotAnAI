# =============================================================================
# Not an AI — Firebase Security Rules Deploy Script (Windows PowerShell)
# =============================================================================
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Not an AI — Firebase Security Rules Deployer        " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Ensure .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found." -ForegroundColor Red
    Write-Host "Please create .env (or copy from .env.example) and configure FIREBASE_PROJECT_ID." -ForegroundColor Red
    Exit 1
}

# 2. Extract FIREBASE_PROJECT_ID strictly from .env
$projectId = ""
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*FIREBASE_PROJECT_ID\s*=\s*"?([^"#\r\n]+)"?') {
        $projectId = $matches[1].Trim()
    }
}

if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "Error: FIREBASE_PROJECT_ID is empty or not set in .env." -ForegroundColor Red
    Write-Host "Please set your Firebase project ID in .env before deploying rules." -ForegroundColor Red
    Exit 1
}

Write-Host "Target Firebase Project: $projectId`n" -ForegroundColor Cyan

# 3. Determine Firebase CLI binary
$firebaseCmd = "firebase"
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Notice: Global firebase CLI not found. Using npx firebase-tools..." -ForegroundColor Yellow
    $firebaseCmd = "npx"
}

# 4. Deploy rules and indexes to Firestore and Realtime Database
Write-Host "Deploying firestore.rules, firestore.indexes.json and database.rules.json to $projectId..." -ForegroundColor Cyan

if ($firebaseCmd -eq "npx") {
    & npx --yes firebase-tools deploy --project $projectId --only firestore:rules,firestore:indexes,database
} else {
    & firebase deploy --project $projectId --only firestore:rules,firestore:indexes,database
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  ✓ Security Rules Deployed Successfully to $projectId " -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
