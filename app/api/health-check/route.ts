// app/api/health-check/route.ts - Quick health check for all backends

import { NextResponse } from 'next/server';

export async function GET() {
    const results = {
        timestamp: new Date().toISOString(),
        backends: {} as Record<string, any>,
    };

    // Check OCR Backend
    try {
        const ocrResponse = await fetch(`${process.env.NEXT_PUBLIC_OCR_BACKEND_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        results.backends.ocr = {
            status: ocrResponse.ok ? 'healthy' : 'unhealthy',
            url: process.env.NEXT_PUBLIC_OCR_BACKEND_URL,
            response: await ocrResponse.json(),
        };
    } catch (error: any) {
        results.backends.ocr = {
            status: 'error',
            url: process.env.NEXT_PUBLIC_OCR_BACKEND_URL,
            error: error.message,
        };
    }

    // Check Ollama
    try {
        const ollamaResponse = await fetch(`${process.env.NEXT_PUBLIC_OLLAMA_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        results.backends.ollama = {
            status: ollamaResponse.ok ? 'healthy' : 'unhealthy',
            url: process.env.NEXT_PUBLIC_OLLAMA_URL,
            response: await ollamaResponse.json(),
        };
    } catch (error: any) {
        results.backends.ollama = {
            status: 'error',
            url: process.env.NEXT_PUBLIC_OLLAMA_URL,
            error: error.message,
        };
    }

    return NextResponse.json(results);
}
