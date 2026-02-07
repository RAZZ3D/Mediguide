# Quick Start Guide - MediGuide AI-First

## ✅ What's Been Set Up

### 1. Ollama (LLM)
- ✅ Installed successfully
- ⏳ Mistral model downloading (~4GB, ~37 minutes remaining)

### 2. PaddleOCR Backend
- ✅ Python virtual environment created
- ✅ All dependencies installed (FastAPI, PaddleOCR, OpenCV, etc.)
- ✅ Ready to start

### 3. Frontend
- ✅ All UI components created
- ✅ Demo page ready at `/demo-ai`
- ✅ API routes configured

---

## 🚀 How to Start

### Terminal 1: OCR Backend

```powershell
cd ocr-backend
.\venv\Scripts\Activate.ps1
python main.py
```

**Expected output:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Terminal 2: Wait for Mistral Download

Check Mistral download status:
```powershell
# In a new terminal, check if Mistral is ready
ollama list
```

**When you see `mistral` in the list, it's ready!**

### Terminal 3: Next.js Frontend

```powershell
# Already running at http://localhost:3000
# Visit: http://localhost:3000/demo-ai
```

---

## 🧪 Test the System

### Option 1: Use Sample Text

Click **"Test with Sample"** button on the demo page.

### Option 2: Upload an Image

1. Take a photo of a prescription
2. Click "Choose File" and select the image
3. Click "Parse Prescription"

---

## 📊 What You'll See

### Medications Tab
- Evidence-grounded explainability cards
- 5 sections per medication:
  1. What was detected (with confidence scores)
  2. Prescription evidence (OCR tokens + bboxes)
  3. Why this plan (schedule, timing, duration reasoning)
  4. Drug details (indications, side effects, precautions)
  5. Uncertainty (clarification questions if needed)

### Interactions Tab
- Drug-drug interactions
- Severity levels (minor, moderate, severe)
- Recommendations

### Adherence Support Tab
- Behavioral science nudges
- EAST/COM-B principles
- Personalized to your schedule

### AI Chat Tab
- Ask questions about medications
- Safety guardrails (no diagnosis, no dose changes)
- Context-aware responses

---

## ⏱️ Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Ollama | ✅ Installed | - |
| Mistral Model | ⏳ Downloading | ~37 minutes remaining |
| OCR Backend | ✅ Ready | Start with `python main.py` |
| Frontend | ✅ Running | Already at http://localhost:3000 |

---

## 🎯 Next Steps

1. **Wait for Mistral download** (~37 min)
   - Check with: `ollama list`
   
2. **Start OCR Backend**
   ```powershell
   cd ocr-backend
   .\venv\Scripts\Activate.ps1
   python main.py
   ```

3. **Test the system**
   - Visit: http://localhost:3000/demo-ai
   - Click "Test with Sample"
   - Review the explainability cards

4. **Try with real prescription**
   - Upload a prescription image
   - Review the AI-parsed results

---

## 🐛 Troubleshooting

### Mistral Download Stuck?
```powershell
# Cancel and retry
Ctrl+C
ollama pull mistral
```

### OCR Backend Error?
```powershell
# Reinstall dependencies
cd ocr-backend
.\venv\Scripts\Activate.ps1
pip install --upgrade -r requirements.txt
```

### Frontend TypeScript Errors?
```powershell
# Rebuild
npm run build
```

---

## 📖 Full Documentation

- **Setup Guide**: `SETUP_AI.md`
- **Implementation Details**: `walkthrough.md`
- **Architecture**: `implementation_plan.md`
- **Test Cases**: `tests/test-cases/`

---

**Made with ❤️ for better medication adherence**
