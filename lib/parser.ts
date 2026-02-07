// lib/parser.ts - Main prescription parsing pipeline

import { ParseRequest, ParsedOutput } from './types';
import { performOCR } from './ocr';
import { extractMedications } from './extractor-improved';
import { generatePlainLanguage } from './plain-language';
import { generateSafetyHints } from './safety';
import { calculateAdherenceScore } from './adherence';

export async function parsePrescription(request: ParseRequest): Promise<ParsedOutput> {
    let text = request.text || '';
    let ocr_confidence: number | undefined;

    // Step 1: OCR if image provided
    if (request.imageUrl) {
        const ocrResult = await performOCR(request.imageUrl, request.langHint || 'eng');
        text = ocrResult.text;
        ocr_confidence = ocrResult.confidence;

        // Warn if OCR confidence is low
        if (ocr_confidence < 0.6) {
            console.warn(`Low OCR confidence: ${(ocr_confidence * 100).toFixed(1)}%. Please verify the extracted text.`);
        }
    }

    // Step 2: Extract medications
    const { medications, explanations } = extractMedications(text);

    // Step 3: Generate plain language explanations
    const plain_language = generatePlainLanguage(medications);

    // Step 4: Generate safety hints
    const safety_hints = generateSafetyHints(medications);

    // Step 5: Calculate adherence score and select nudges
    const { score, nudges } = calculateAdherenceScore(medications);

    // Step 6: Calculate overall confidence
    const overall_confidence = medications.length > 0
        ? medications.reduce((sum, med) => sum + med.confidence, 0) / medications.length
        : 0;

    return {
        medications,
        extraction_explanations: explanations,
        plain_language,
        safety_hints,
        adherence_score: score,
        adherence_nudges: nudges,
        overall_confidence,
        ocr_confidence,
    };
}
