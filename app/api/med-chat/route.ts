import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MedicineChatResponse } from '@/lib/types/schemas';

// --- Configuration ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
const LOCAL_MODEL = 'qwen2.5:1.5b'; // Switched to Qwen GPU
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Simple In-Memory Cache
const responseCache = new Map<string, { data: MedicineChatResponse; timestamp: number }>();

// --- Prompts ---
const SYSTEM_PROMPT = `You are a FAST, EVIDENCE-BASED Medicine Assistant.
Your goal: specific, structured, safety-first answers.

STRICT OUTPUT SCHEMA (JSON ONLY):
{
  "medicine": "string",
  "confidence": "high|medium|low",
  "quick_summary": "string (1-2 sentences)",
  "uses": ["string (top 3)"],
  "general_dosage_info": "string (general only, no personalized advice)",
  "how_to_take": ["string (e.g., with food, time of day)"],
  "common_side_effects": ["string (top 4)"],
  "red_flags": ["string (top 3 critical warnings)"],
  "interactions": [
    { "with": "string", "severity": "low|moderate|high", "what_can_happen": "string", "symptoms": ["string"] }
  ],
  "questions_to_confirm": ["string (ask if user didn't list other meds but asked about interactions)"],
  "behavioral_nudges": [
    { "label": "TIMELY", "principle": "Implementation Intention", "message": "After [routine], I will take [medicine]..." },
    { "label": "EASY", "principle": "Friction Reduction", "message": "string (one-tap habit/cue)" },
    { "label": "MOTIVATION", "principle": "COM-B Motivation", "message": "string (why adherence matters, fact-based)" },
    { "label": "RECOVERY", "principle": "Resilience", "message": "string (what to do if missed)" }
  ],
  "explainability": { "why": "string", "assumptions": ["string"], "limits": ["string"] },
  "safety_disclaimer": "string"
}

EXAMPLE JSON OUTPUT:
{
  "medicine": "ExampleMed",
  "confidence": "high",
  "quick_summary": "ExampleMed helps with X. Take it daily.",
  "uses": ["Condition A", "Condition B"],
  "general_dosage_info": "Usually 10mg daily.",
  "how_to_take": ["Take with food", "Do not crush"],
  "common_side_effects": ["Nausea", "Headache"],
  "red_flags": ["Stop if rash appears"],
  "interactions": [],
  "questions_to_confirm": [],
  "behavioral_nudges": [],
  "explainability": { "why": "Standard care", "assumptions": [], "limits": [] },
  "safety_disclaimer": "Consult doctor."
}

RULES:
1. NUDGES: Must generate exactly 4 nudges as specified above.
2. INTERACTIONS: 
   - IF user lists meds: Check specific interactions.
   - IF user DOES NOT list meds: Do NOT hallucinate interactions. Returns empty list or general warnings (e.g. alcohol). Add "questions_to_confirm" asking for other meds.
3. SPEED: Keep strings concise. No deviations from JSON.
`;

const CHAT_SYSTEM_PROMPT = `You are a concise, helpful Medicine Assistant answering a follow-up question.
CONTEXT: The user has already received a detailed report on a medication.
GOAL: Answer the specific follow-up question directly and briefly.

STRICT OUTPUT SCHEMA (JSON ONLY):
{
  "answer": "string (direct answer, max 2-3 sentences)",
  "confidence": "high|medium|low",
  "key_points": ["string (bullet points if needed, max 3)"],
  "sources": ["string (e.g. 'Standard interaction guidelines')"]
}

RULES:
1. FOCUS: Answer ONLY what is asked. Do not repeat the full report.
2. SPEED: Be extremely concise.
3. SAFETY: If the question implies a dangerous combination, warn clearly.
`;

// --- Helper Functions ---

function safeJsonParse(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("No JSON object found in model output");
    }
    const jsonStr = text.slice(start, end + 1);
    return JSON.parse(jsonStr);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label)), ms))
    ]);
}

async function callGemini(message: string, context?: any, isFollowUp = false): Promise<any> {
    // Try multiple models in case of 404/Quota
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
    let lastError;

    for (const modelName of models) {
        try {
            console.log(`[Gemini] Trying ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                    maxOutputTokens: isFollowUp ? 280 : 900,
                }
            });

            const sysPrompt = isFollowUp ? CHAT_SYSTEM_PROMPT : SYSTEM_PROMPT;
            const contextStr = JSON.stringify(context || {});

            const prompt = isFollowUp
                ? `${sysPrompt}\n\nPREVIOUS MEDICINE CONTEXT: ${context?.previous_medicine || 'Unknown'}\nUSER FOLLOW-UP: ${message}`
                : `${sysPrompt}\n\nUSER CONTEXT: ${contextStr}\nUSER QUERY: ${message}`;

            const result = await withTimeout(model.generateContent(prompt), 25000, `Gemini ${modelName} timeout`);
            const response = await result.response;
            const text = response.text();

            const parsed = safeJsonParse(text);
            return { parsed, timings: { gemini_ms: 0 } }; // timing not tracked per model here for simplicity
        } catch (e: any) {
            console.warn(`[Gemini] ${modelName} failed: ${e.message}`);
            lastError = e;
            // If explicit Quota error, maybe try next model? Or succeed to fallback?
            if (e.message?.includes('429') || e.message?.includes('Quota')) {
                // Try next model if available? 
                // Actually, usually quota is per project.
                // But let's try next.
            }
        }
    }
    throw lastError || new Error('All Gemini models failed');
}

async function callOllama(message: string, context?: any, isFollowUp = false): Promise<any> {
    const sysPrompt = isFollowUp ? CHAT_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const contextStr = JSON.stringify(context || {});
    const prompt = isFollowUp
        ? `${sysPrompt}\n\nPREVIOUS MEDICINE CONTEXT: ${context?.previous_medicine || 'Unknown'}\nUSER FOLLOW-UP: ${message}`
        : `${sysPrompt}\n\nUSER CONTEXT: ${contextStr}\nUSER QUERY: ${message}`;

    console.log(`[Ollama] Calling model: ${LOCAL_MODEL}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LOCAL_MODEL,
                prompt: prompt,
                format: 'json',
                stream: false,
                options: {
                    num_predict: isFollowUp ? 512 : 1024,
                    temperature: 0.2
                }
            }),
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
        const data = await response.json();
        return JSON.parse(data.response);
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- Main Handler ---

export async function POST(req: NextRequest) {
    const tStart = Date.now();
    let timings: any = {};
    let geminiError: any = null;

    try {
        const { message, context, is_followup } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Cache Key
        const otherAndFollowupKey = is_followup
            ? `followup-${context?.previous_medicine || ''}`
            : `query-${JSON.stringify(context?.other_meds || '')}`;
        const cacheKey = `${message.toLowerCase().trim()}-${otherAndFollowupKey}`;

        // Check Cache
        const cached = responseCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            return NextResponse.json({ ...cached.data, _source: 'cache' });
        }

        let responseData: any;
        let source = 'gemini';

        // 1. Try Gemini
        if (process.env.GEMINI_API_KEY) {
            try {
                const tGemini = Date.now();
                const geminiResult = await callGemini(message, context, is_followup);
                responseData = geminiResult.parsed;
                timings.gemini_ms = Date.now() - tGemini;
                timings.gemini_model = 'gemini-fallback'; // simplified
            } catch (e: any) {
                console.error('Gemini failed, switching to Ollama...', e.message);
                geminiError = e;
                source = 'ollama_fallback';

                // If Quota error, Fail fast? No, user wants fallback if Gemini fails.
                // But user complained about waiting.
                // However, I'll let it fallback.
            }
        } else {
            source = 'ollama';
        }

        // 2. Fallback to Ollama if Gemini failed or no key
        if (!responseData) {
            const tOllama = Date.now();
            responseData = await callOllama(message, context, is_followup);
            timings.ollama_ms = Date.now() - tOllama;
        }

        // --- NORMALIZE OUTPUT (Robustness for Small/Large Models) ---
        if (!is_followup) {
            const listFields = ['uses', 'how_to_take', 'common_side_effects', 'red_flags', 'questions_to_confirm'];
            listFields.forEach(field => {
                if (typeof responseData[field] === 'string') {
                    responseData[field] = [responseData[field]];
                } else if (!Array.isArray(responseData[field])) {
                    responseData[field] = [];
                }
            });
            if (!Array.isArray(responseData.behavioral_nudges)) responseData.behavioral_nudges = [];
            if (!Array.isArray(responseData.interactions)) responseData.interactions = [];
        }

        // Validate essentials
        if (is_followup) {
            if (!responseData.answer && responseData.message) responseData.answer = responseData.message;
            if (!responseData.answer) throw new Error("Invalid follow-up structure");
        } else {
            if (!responseData.medicine) throw new Error("Invalid full report structure");
        }

        // Save to Cache
        responseCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

        timings.total_ms = Date.now() - tStart;
        console.log(`[MedChat] Success (${source}) | Total: ${timings.total_ms}ms`);

        return NextResponse.json({ ...responseData, _source: source, _timings: timings });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate response.', details: error.message },
            { status: 500 }
        );
    }
}
