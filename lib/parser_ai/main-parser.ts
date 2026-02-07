// lib/parser_ai/main-parser.ts - Main AI-first prescription parsing pipeline

import { performPaddleOCR } from '../ocr/paddleocr-client';
import { checkOCRQuality, evaluateConfidence } from '../ocr/confidence-gate';
import { parsePrescriptionWithLLM } from '../parser_llm/prescription-parser';
import { getBulkDrugInfo } from '../druginfo/drug-info-service';
import { getInteractionReport } from '../interactions/interaction-checker';
import { generateExplainabilityCards } from '../explainability/explainability-generator';
import { generateNudges } from '../nudges/nudge-generator';
import {
    ParsePrescriptionRequest,
    ParsePrescriptionResponse,
    OCRResult,
    MedicationPlan,
    UserPreferences,
} from '../types/schemas';

/**
 * Main AI-first prescription parsing pipeline
 * 
 * Pipeline:
 * 1. Image Preprocessing (in PaddleOCR backend)
 * 2. OCR with PaddleOCR
 * 3. Confidence Gate
 * 4. LLM Parsing (Ollama Mistral)
 * 5. Drug Info Retrieval
 * 6. Interaction Checking
 * 7. Explainability Generation
 * 8. Nudge Generation
 */
export async function parseAIPrescription(
    request: ParsePrescriptionRequest
): Promise<ParsePrescriptionResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
        let ocrResult: OCRResult | undefined;
        let text = request.text || '';

        // Step 1 & 2: OCR (if image provided)
        if (request.image_url || request.image_base64) {
            console.log('Step 1-2: Performing OCR with PaddleOCR...');

            const imageInput = request.image_url || request.image_base64!;

            ocrResult = await performPaddleOCR(imageInput, request.language_hint ? [request.language_hint] : ['en']);

            text = ocrResult.text;

            // Check OCR quality
            const qualityCheck = checkOCRQuality(ocrResult);

            if (!qualityCheck.acceptable) {
                return {
                    success: false,
                    error: qualityCheck.reason,
                    medication_plan: {
                        medications: [],
                        extracted_language: 'en',
                        plain_language_available: false,
                        overall_confidence: 0,
                        needs_confirmation: true,
                        clarification_questions: [{
                            field: 'image_quality',
                            question: qualityCheck.recommendation || 'Please upload a clearer image',
                            confidence: ocrResult.confidence,
                        }],
                        created_at: new Date().toISOString(),
                        ocr_processing_time_ms: ocrResult.processing_time_ms,
                        llm_processing_time_ms: 0,
                    },
                    explainability_cards: [],
                    interaction_results: [],
                    nudges: [],
                    ocr_result: ocrResult,
                    processing_time_ms: Date.now() - startTime,
                };
            }

            // Add OCR warnings if needed
            if (ocrResult.confidence < 0.80) {
                warnings.push(
                    `OCR confidence is ${(ocrResult.confidence * 100).toFixed(1)}%. ` +
                    'Please review the extracted information carefully.'
                );
            }
        }

        // Step 3 & 4: LLM Parsing
        console.log('Step 3-4: Parsing prescription with LLM...');

        if (!text || text.trim().length === 0) {
            return {
                success: false,
                error: 'No text provided for parsing',
                medication_plan: {
                    medications: [],
                    extracted_language: 'en',
                    plain_language_available: false,
                    overall_confidence: 0,
                    needs_confirmation: true,
                    clarification_questions: [],
                    created_at: new Date().toISOString(),
                    ocr_processing_time_ms: ocrResult?.processing_time_ms || 0,
                    llm_processing_time_ms: 0,
                },
                explainability_cards: [],
                interaction_results: [],
                nudges: [],
                processing_time_ms: Date.now() - startTime,
            };
        }

        const medicationPlan = await parsePrescriptionWithLLM(
            ocrResult || {
                text,
                confidence: 1.0,
                tokens: [],
                lines: [],
                processing_time_ms: 0,
            }
        );

        // Step 5: Drug Info Retrieval
        console.log('Step 5: Retrieving drug information...');

        const drugNames = medicationPlan.medications.map(m => m.name);
        const drugInfoList = await getBulkDrugInfo(drugNames);

        // Step 6: Interaction Checking
        console.log('Step 6: Checking interactions...');

        const interactionReport = getInteractionReport(medicationPlan.medications);

        if (interactionReport.has_interactions) {
            warnings.push(
                `Found ${interactionReport.drug_interactions.length} potential drug interactions. ` +
                'Please review the interaction warnings.'
            );
        }

        // Step 7: Explainability Generation
        console.log('Step 7: Generating explainability cards...');

        const explainabilityCards = generateExplainabilityCards(
            medicationPlan.medications,
            drugInfoList
        );

        // Add clarification questions to explainability cards
        for (let i = 0; i < explainabilityCards.length; i++) {
            const medication = medicationPlan.medications[i];
            if (medication.needs_confirmation) {
                explainabilityCards[i].uncertainty.confirmation_questions =
                    medicationPlan.clarification_questions.filter(
                        q => medication.uncertain_fields.includes(q.field)
                    );
            }
        }

        // Step 8: Nudge Generation
        console.log('Step 8: Generating behavioral nudges...');

        const nudges = generateNudges(
            medicationPlan.medications,
            request.user_preferences
        );

        const processingTime = Date.now() - startTime;

        console.log(`✅ Prescription parsed successfully in ${processingTime}ms`);

        return {
            success: true,
            medication_plan: medicationPlan,
            explainability_cards: explainabilityCards,
            interaction_results: interactionReport.drug_interactions,
            nudges,
            ocr_result: ocrResult,
            processing_time_ms: processingTime,
            warnings: warnings.length > 0 ? warnings : undefined,
        };

    } catch (error: any) {
        console.error('Prescription Parsing Error:', error);

        return {
            success: false,
            error: error.message || 'Failed to parse prescription',
            medication_plan: {
                medications: [],
                extracted_language: 'en',
                plain_language_available: false,
                overall_confidence: 0,
                needs_confirmation: true,
                clarification_questions: [],
                created_at: new Date().toISOString(),
                ocr_processing_time_ms: 0,
                llm_processing_time_ms: 0,
            },
            explainability_cards: [],
            interaction_results: [],
            nudges: [],
            processing_time_ms: Date.now() - startTime,
        };
    }
}
