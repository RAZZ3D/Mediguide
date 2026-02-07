// scripts/setup-backends.ps1 - Automated backend setup script

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  MediGuide AI-First Backend Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Check Ollama
try {
    $ollamaVersion = ollama --version 2>&1
    Write-Host "✓ Ollama found: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Ollama not found." -ForegroundColor Red
    Write-Host "  Installing Ollama..." -ForegroundColor Yellow
    winget install Ollama.Ollama
    Write-Host "✓ Ollama installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Step 1: Setting up OCR Backend (PaddleOCR)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to OCR backend directory
Set-Location -Path "ocr-backend"

# Create virtual environment
Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing dependencies (this may take 5-10 minutes)..." -ForegroundColor Yellow
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ OCR Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install OCR Backend dependencies" -ForegroundColor Red
    exit 1
}

# Return to root directory
Set-Location -Path ".."

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Step 2: Setting up Ollama (Mistral LLM)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Mistral is already pulled
$ollamaList = ollama list 2>&1
if ($ollamaList -match "mistral") {
    Write-Host "✓ Mistral model already installed" -ForegroundColor Green
} else {
    Write-Host "Pulling Mistral model (~4GB, may take 10-15 minutes)..." -ForegroundColor Yellow
    ollama pull mistral
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Mistral model installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to pull Mistral model" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start OCR Backend:" -ForegroundColor White
Write-Host "   cd ocr-backend" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verify Ollama is running:" -ForegroundColor White
Write-Host "   ollama list" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start Next.js frontend:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Visit http://localhost:3000/demo-ai" -ForegroundColor White
Write-Host ""
