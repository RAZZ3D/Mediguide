// lib/parser_llm/prescription-parser.ts - LLM-based prescription parser

import { geminiClient } from './gemini-client';
import {
    PRESCRIPTION_PARSER_SYSTEM_PROMPT,
    generatePrescriptionParserPrompt
} from './prompts';
import {
    OCRResult,
    MedicationPlan,
    LLMParserResponse
} from '../types/schemas';

/**
 * Parse prescription using LLM (Google Gemini Flash)
 */
export async function parsePrescriptionWithLLM(
    ocrResult: OCRResult
): Promise<MedicationPlan> {
    try {
        const startTime = Date.now();

        // Generate prompt
        const userPrompt = generatePrescriptionParserPrompt(ocrResult);

        // Call LLM with JSON mode
        const response = await geminiClient.chatJSON<LLMParserResponse>([
            {
                role: 'system',
                content: PRESCRIPTION_PARSER_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: userPrompt,
            },
        ], {
            model: 'gemini-flash-latest',
            temperature: 0.1, // Low temperature for consistent outputs
        });

        const processingTime = Date.now() - startTime;

        console.log('Raw LLM Response:', JSON.stringify(response, null, 2));

        // Validate response
        if (!response.medications || !Array.isArray(response.medications)) {
            throw new Error('Invalid LLM response: missing medications array');
        }

        // Build medication plan
        // Build medication plan with robust defaults for missing evidence
        const processedMedications = response.medications.map((med: any) => ({
            ...med,
            // Ensure evidence fields exist
            name_evidence: med.name_evidence || { value: med.name || '', confidence: med.name_confidence || 0, ocr_tokens: [] },
            strength_evidence: med.strength_evidence || { value: med.strength || '', confidence: med.strength_confidence || 0, ocr_tokens: [] },
            frequency_evidence: med.frequency_evidence || { value: med.frequency || '', confidence: med.frequency_confidence || 0, ocr_tokens: [] },
            duration_evidence: med.duration_evidence || (med.duration ? { value: med.duration, confidence: med.duration_confidence || 0, ocr_tokens: [] } : undefined),

            // Ensure other required fields have defaults
            name: med.name || 'Unknown Medication',
            name_confidence: med.name_confidence || 0,
            strength: med.strength || 'uncertain',
            strength_confidence: med.strength_confidence || 0,
            frequency: med.frequency || 'As directed',
            frequency_normalized: med.frequency_normalized || 'As directed',
            frequency_confidence: med.frequency_confidence || 0,
            timing_buckets: med.timing_buckets || {},
            duration: med.duration || 'As directed',
            duration_confidence: med.duration_confidence || 0,
            needs_confirmation: med.needs_confirmation || false,
            uncertain_fields: med.uncertain_fields || [],
        }));

        const medicationPlan: MedicationPlan = {
            medications: processedMedications,
            extracted_language: response.extracted_language || 'en',
            plain_language_available: false, // Will be set later
            overall_confidence: calculateOverallConfidence(processedMedications),
            needs_confirmation: response.needs_confirmation || false,
            clarification_questions: response.clarification_questions || [],
            created_at: new Date().toISOString(),
            ocr_processing_time_ms: ocrResult.processing_time_ms,
            llm_processing_time_ms: processingTime,
        };

        return medicationPlan;

    } catch (error: any) {
        console.error('LLM Prescription Parsing Error:', error);
        throw new Error(`Failed to parse prescription with LLM: ${error.message}`);
    }
}

/**
 * Calculate overall confidence from medications
 */
function calculateOverallConfidence(medications: any[]): number {
    if (medications.length === 0) return 0;

    const confidences = medications.flatMap(med => [
        med.name_confidence || 0,
        med.strength_confidence || 0,
        med.frequency_confidence || 0,
        med.duration_confidence || 0,
    ]);

    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
}

/**
 * Validate medication plan schema
 */
export function validateMedicationPlan(plan: any): boolean {
    if (!plan || typeof plan !== 'object') return false;
    if (!Array.isArray(plan.medications)) return false;

    for (const med of plan.medications) {
        if (!med.name || typeof med.name !== 'string') return false;
        if (typeof med.name_confidence !== 'number') return false;
        if (!med.strength || typeof med.strength !== 'string') return false;
        if (!med.frequency || typeof med.frequency !== 'string') return false;
        if (!med.timing_buckets || typeof med.timing_buckets !== 'object') return false;
    }

    return true;
}
