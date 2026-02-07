# MediGuide AI-First Setup Guide

Complete setup guide for the AI-first medication understanding system.

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ (for OCR backend)
- **Ollama** (for local LLM)
- **Supabase** account (free tier)

---

## Part 1: OCR Backend Setup (PaddleOCR)

### 1. Navigate to OCR Backend

```powershell
cd ocr-backend
```

### 2. Create Virtual Environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

**Note**: PaddleOCR installation may take 5-10 minutes.

### 4. Start OCR Backend

```powershell
python main.py
```

Server will start at `http://localhost:8001`

### 5. Test OCR Backend

```powershell
# In a new terminal
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "MediGuide OCR Service",
  "paddle_ocr_version": "2.7.0",
  "supported_languages": ["en"]
}
```

---

## Part 2: Ollama Setup (Local LLM)

### 1. Install Ollama

Download from: https://ollama.ai/download

Or using PowerShell:
```powershell
winget install Ollama.Ollama
```

### 2. Pull Mistral Model

```powershell
ollama pull mistral
```

**Note**: This will download ~4GB. First pull may take 10-15 minutes.

### 3. Verify Ollama

```powershell
ollama list
```

You should see `mistral` in the list.

### 4. Test Ollama

```powershell
ollama run mistral "Hello, how are you?"
```

Press `Ctrl+D` to exit.

---

## Part 3: Next.js Frontend Setup

### 1. Navigate to Project Root

```powershell
cd c:\Users\RAZZ3D\Desktop\MediGuide
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Configure Environment Variables

```powershell
# Copy example env file
copy .env.example .env.local

# Edit .env.local with your values
notepad .env.local
```

Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_OCR_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
```

### 4. Set Up Supabase Database

Run SQL scripts in order:
1. `supabase/01-create-tables.sql`
2. `supabase/02-disable-rls.sql`
3. `supabase/03-test-verification.sql`

### 5. Start Development Server

```powershell
npm run dev
```

Application will start at `http://localhost:3000`

---

## Part 4: Verification

### 1. Check All Services

Open 3 terminals:

**Terminal 1 - OCR Backend:**
```powershell
cd ocr-backend
.\venv\Scripts\Activate.ps1
python main.py
```

**Terminal 2 - Ollama:**
```powershell
# Ollama runs as a service, check status
ollama list
```

**Terminal 3 - Next.js:**
```powershell
npm run dev
```

### 2. Test End-to-End

1. Open `http://localhost:3000/demo`
2. Upload a prescription image
3. Verify:
   - OCR extracts text
   - LLM parses medications
   - Explainability cards appear
   - Interactions are checked
   - Nudges are generated

---

## Troubleshooting

### OCR Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'paddleocr'`

**Solution**:
```powershell
pip install paddleocr==2.7.0.3
```

**Problem**: OpenCV errors

**Solution**:
```powershell
pip uninstall opencv-python
pip install opencv-python-headless==4.9.0.80
```

### Ollama Issues

**Problem**: `connection refused` to Ollama

**Solution**:
```powershell
# Check if Ollama is running
Get-Process ollama

# If not running, start it
ollama serve
```

**Problem**: Mistral model not found

**Solution**:
```powershell
ollama pull mistral
```

### Next.js Issues

**Problem**: TypeScript errors

**Solution**:
```powershell
npm run build
```

Fix any type errors shown.

**Problem**: Environment variables not loading

**Solution**:
- Ensure `.env.local` exists (not `.env.example`)
- Restart dev server after changing env vars

---

## Performance Optimization

### OCR Backend

For faster OCR, enable GPU (if available):

Edit `ocr-backend/main.py`:
```python
ocr_engine = PaddleOCR(
    use_angle_cls=True,
    lang='en',
    use_gpu=True,  # Change to True
    show_log=False
)
```

Requires CUDA-enabled GPU and `paddlepaddle-gpu`.

### Ollama

For faster LLM inference:

1. Use GPU acceleration (automatic if GPU available)
2. Reduce context window:

Edit `lib/parser_llm/ollama-client.ts`:
```typescript
options: {
  temperature,
  top_p: 0.9,
  top_k: 40,
  num_ctx: 2048, // Add this (default is 4096)
}
```

---

## Production Deployment

### OCR Backend

Deploy to cloud with Gunicorn:

```powershell
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
```

Or use Docker:

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

### Ollama

For production, consider:
- Cloud LLM API (OpenAI/Anthropic) for better accuracy
- Ollama on dedicated server with GPU
- Hybrid approach (local for simple, cloud for complex)

### Next.js

Deploy to Vercel:

```powershell
npm run build
vercel deploy
```

Set environment variables in Vercel dashboard.

---

## Next Steps

1. ✅ Test with sample prescriptions
2. ✅ Review explainability cards
3. ✅ Test chat functionality
4. ✅ Verify interaction checking
5. ✅ Test nudge generation

See `tests/test-cases/` for sample prescriptions.
