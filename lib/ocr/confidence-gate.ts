// lib/ocr/confidence-gate.ts - Confidence evaluation and clarification generation

import { OCRResult, ClarificationQuestion, MedicationItem } from '../types/schemas';
import {
    CONFIDENCE_THRESHOLDS,
    shouldRequestClarification,
    getConfidenceLevel
} from '../config/confidence-thresholds';

export interface ConfidenceGateResult {
    passed: boolean;
    overall_confidence: number;
    needs_confirmation: boolean;
    clarification_questions: ClarificationQuestion[];
    low_confidence_fields: string[];
    warnings: string[];
}

export interface ExtractedFields {
    drug_name?: { value: string; confidence: number };
    strength?: { value: string; confidence: number };
    frequency?: { value: string; confidence: number };
    duration?: { value: string; confidence: number };
    food_instruction?: { value: string; confidence: number };
}

/**
 * Evaluate OCR confidence and determine if clarification is needed
 */
export function evaluateConfidence(
    ocrResult: OCRResult,
    extractedFields?: ExtractedFields
): ConfidenceGateResult {
    const warnings: string[] = [];
    const clarificationQuestions: ClarificationQuestion[] = [];
    const lowConfidenceFields: string[] = [];

    const overallConfidence = ocrResult.confidence;

    // Check overall OCR confidence
    if (overallConfidence < CONFIDENCE_THRESHOLDS.ocr_minimum) {
        return {
            passed: false,
            overall_confidence: overallConfidence,
            needs_confirmation: true,
            clarification_questions: [{
                field: 'image_quality',
                question: 'The image quality is too low for accurate text extraction. Please upload a clearer image.',
                confidence: overallConfidence,
            }],
            low_confidence_fields: ['image_quality'],
            warnings: ['Image quality below minimum threshold'],
        };
    }

    if (overallConfidence < CONFIDENCE_THRESHOLDS.ocr_warning) {
        warnings.push(
            `OCR confidence is ${(overallConfidence * 100).toFixed(1)}%. ` +
            'Please review the extracted information carefully.'
        );
    }

    // Check individual fields if provided
    if (extractedFields) {
        // Check drug name
        if (extractedFields.drug_name) {
            const { value, confidence } = extractedFields.drug_name;
            if (shouldRequestClarification('drug_name', confidence, value)) {
                lowConfidenceFields.push('drug_name');
                clarificationQuestions.push({
                    field: 'drug_name',
                    question: value
                        ? `The medication name appears to be "${value}". Is this correct?`
                        : 'The medication name could not be detected clearly. Please enter the medication name.',
                    detected_value: value,
                    confidence,
                    suggestions: value ? [value] : undefined,
                });
            }
        } else {
            // Drug name missing
            lowConfidenceFields.push('drug_name');
            clarificationQuestions.push({
                field: 'drug_name',
                question: 'The medication name could not be detected. Please enter the medication name.',
                confidence: 0,
            });
        }

        // Check strength
        if (extractedFields.strength) {
            const { value, confidence } = extractedFields.strength;
            if (shouldRequestClarification('strength', confidence, value)) {
                lowConfidenceFields.push('strength');
                clarificationQuestions.push({
                    field: 'strength',
                    question: value
                        ? `The strength appears to be "${value}". Is this correct?`
                        : 'The medication strength could not be detected clearly. Please enter the strength (e.g., 500mg).',
                    detected_value: value,
                    confidence,
                    suggestions: value ? [value] : undefined,
                });
            }
        } else {
            // Strength missing
            lowConfidenceFields.push('strength');
            clarificationQuestions.push({
                field: 'strength',
                question: 'The medication strength could not be detected. Please enter the strength (e.g., 500mg).',
                confidence: 0,
            });
        }

        // Check frequency
        if (extractedFields.frequency) {
            const { value, confidence } = extractedFields.frequency;
            if (shouldRequestClarification('frequency', confidence, value)) {
                lowConfidenceFields.push('frequency');
                clarificationQuestions.push({
                    field: 'frequency',
                    question: value
                        ? `The frequency appears to be "${value}". Is this correct?`
                        : 'How often should this medication be taken? (e.g., Once daily, Twice daily, 1-0-1)',
                    detected_value: value,
                    confidence,
                    suggestions: value ? [value, 'Once daily', 'Twice daily', 'Three times daily'] : ['Once daily', 'Twice daily', 'Three times daily'],
                });
            }
        } else {
            // Frequency missing
            lowConfidenceFields.push('frequency');
            clarificationQuestions.push({
                field: 'frequency',
                question: 'How often should this medication be taken?',
                confidence: 0,
                suggestions: ['Once daily', 'Twice daily', 'Three times daily', 'As needed'],
            });
        }

        // Check duration (optional, only ask if rule says so)
        if (extractedFields.duration) {
            const { value, confidence } = extractedFields.duration;
            if (shouldRequestClarification('duration', confidence, value)) {
                lowConfidenceFields.push('duration');
                clarificationQuestions.push({
                    field: 'duration',
                    question: value
                        ? `The duration appears to be "${value}". Is this correct?`
                        : 'How long should this medication be taken? (e.g., 7 days, 2 weeks)',
                    detected_value: value,
                    confidence,
                    suggestions: value ? [value, '7 days', '14 days', '30 days'] : ['7 days', '14 days', '30 days', 'As directed'],
                });
            }
        }
    }

    const needsConfirmation = clarificationQuestions.length > 0;
    const passed = overallConfidence >= CONFIDENCE_THRESHOLDS.ocr_minimum;

    return {
        passed,
        overall_confidence: overallConfidence,
        needs_confirmation: needsConfirmation,
        clarification_questions: clarificationQuestions,
        low_confidence_fields: lowConfidenceFields,
        warnings,
    };
}

/**
 * Generate clarification questions for a medication item
 */
export function generateClarificationQuestionsForMedication(
    medication: MedicationItem
): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Check each field
    if (medication.needs_confirmation) {
        for (const field of medication.uncertain_fields) {
            switch (field) {
                case 'name':
                    questions.push({
                        field: 'name',
                        question: `Is "${medication.name}" the correct medication name?`,
                        detected_value: medication.name,
                        confidence: medication.name_confidence,
                    });
                    break;

                case 'strength':
                    questions.push({
                        field: 'strength',
                        question: `Is "${medication.strength}" the correct strength?`,
                        detected_value: medication.strength,
                        confidence: medication.strength_confidence,
                    });
                    break;

                case 'frequency':
                    questions.push({
                        field: 'frequency',
                        question: `Is "${medication.frequency_normalized}" the correct frequency?`,
                        detected_value: medication.frequency,
                        confidence: medication.frequency_confidence,
                        suggestions: ['Once daily', 'Twice daily', 'Three times daily'],
                    });
                    break;

                case 'duration':
                    questions.push({
                        field: 'duration',
                        question: `Is "${medication.duration}" the correct duration?`,
                        detected_value: medication.duration,
                        confidence: medication.duration_confidence,
                        suggestions: ['7 days', '14 days', '30 days', 'As directed'],
                    });
                    break;
            }
        }
    }

    return questions;
}

/**
 * Check if OCR result has sufficient quality for processing
 */
export function checkOCRQuality(ocrResult: OCRResult): {
    acceptable: boolean;
    reason?: string;
    recommendation?: string;
} {
    // Check overall confidence
    if (ocrResult.confidence < CONFIDENCE_THRESHOLDS.ocr_minimum) {
        return {
            acceptable: false,
            reason: `OCR confidence (${(ocrResult.confidence * 100).toFixed(1)}%) is below minimum threshold`,
            recommendation: 'Please upload a clearer image with better lighting and focus',
        };
    }

    // Check if any text was extracted
    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        return {
            acceptable: false,
            reason: 'No text could be extracted from the image',
            recommendation: 'Please ensure the prescription is clearly visible and not obscured',
        };
    }

    // Check if sufficient tokens were detected
    if (ocrResult.tokens.length < 5) {
        return {
            acceptable: false,
            reason: 'Very few words detected in the image',
            recommendation: 'Please upload a complete prescription image',
        };
    }

    return { acceptable: true };
}
