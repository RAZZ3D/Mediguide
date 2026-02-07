// app/api/parse/route.ts - API route for prescription parsing

import { NextRequest, NextResponse } from 'next/server';
import { parsePrescription } from '@/lib/parser';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, imageUrl, langHint } = body;

        // Validate input
        if (!text && !imageUrl) {
            return NextResponse.json(
                { error: 'Either text or imageUrl must be provided' },
                { status: 400 }
            );
        }

        // Parse prescription
        const result = await parsePrescription({ text, imageUrl, langHint });

        // Store in Supabase
        try {
            const { data, error } = await supabase
                .from('plans')
                .insert({
                    input_type: imageUrl ? 'image' : 'text',
                    raw_text: text || result.medications.map(m =>
                        `${m.drug_name} ${m.strength} ${m.dose_pattern}`
                    ).join('\n'),
                    parsed_json: result,
                    adherence_score: result.adherence_score,
                    language: langHint || 'en',
                })
                .select()
                .single();

            if (error) {
                console.error('Supabase insert error:', error);
                // Continue even if DB insert fails
            } else {
                console.log('Saved to Supabase:', data.id);
            }
        } catch (dbError) {
            console.error('Database error:', dbError);
            // Continue even if DB fails
        }

        // If OCR confidence is low, add warning to response
        if (result.ocr_confidence && result.ocr_confidence < 0.6) {
            return NextResponse.json({
                ...result,
                warning: `OCR confidence is low (${(result.ocr_confidence * 100).toFixed(1)}%). Please verify the extracted information carefully.`,
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Parse error:', error);
        return NextResponse.json(
            { error: 'Failed to parse prescription', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
