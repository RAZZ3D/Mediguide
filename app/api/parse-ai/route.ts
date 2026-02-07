// app/api/parse-ai/route.ts - AI-first prescription parsing API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { parseAIPrescription } from '@/lib/parser_ai/main-parser';
import { ParsePrescriptionRequest } from '@/lib/types/schemas';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for LLM processing

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        if (!body.image_url && !body.image_base64 && !body.text) {
            return NextResponse.json(
                { error: 'Either image_url, image_base64, or text must be provided' },
                { status: 400 }
            );
        }

        // Build request
        const parseRequest: ParsePrescriptionRequest = {
            image_url: body.image_url,
            image_base64: body.image_base64,
            text: body.text,
            language_hint: body.language_hint || 'en',
            user_preferences: body.user_preferences,
            user_id: body.user_id,
        };

        // Parse prescription
        const result = await parseAIPrescription(parseRequest);

        if (!result.success) {
            return NextResponse.json(
                {
                    error: result.error,
                    warnings: result.warnings,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Parse AI API Error:', error);
        // detailed logging
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
