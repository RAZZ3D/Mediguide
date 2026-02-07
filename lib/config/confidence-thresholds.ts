// lib/config/confidence-thresholds.ts - Confidence thresholds and clarification rules

import { ConfidenceThresholds, ClarificationRules } from '../types/schemas';

export const CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
    // Overall OCR confidence
    ocr_minimum: 0.50, // Below this, reject image entirely
    ocr_warning: 0.65, // Below this, show warning + ask for review
    ocr_good: 0.80, // Above this, high confidence

    // Per-field confidence (critical fields have higher thresholds)
    drug_name: 0.70, // Critical field - medication name must be accurate
    strength: 0.75, // Critical field - dosage amount is crucial for safety
    frequency: 0.65, // Important field - affects adherence
    duration: 0.60, // Less critical - can often be "as directed"
    food_instruction: 0.55, // Optional field - nice to have

    // Clarification triggers
    needs_confirmation_threshold: 0.65, // If any critical field below this
    missing_field_threshold: 0.30, // If field confidence below this, consider "missing"
};

export const CLARIFICATION_RULES: ClarificationRules = {
    // Generate clarification question if:
    drug_name_uncertain: true, // Always ask if drug name confidence < threshold
    strength_uncertain: true, // Always ask if strength confidence < threshold
    frequency_missing: true, // Always ask if frequency not detected
    duration_missing: false, // Don't ask (can be "as directed")
};

// Confidence level descriptions for UI
export const CONFIDENCE_LEVELS = {
    high: { min: 0.80, label: 'High Confidence', color: 'green' },
    medium: { min: 0.65, label: 'Medium Confidence', color: 'yellow' },
    low: { min: 0.50, label: 'Low Confidence', color: 'orange' },
    very_low: { min: 0, label: 'Very Low Confidence', color: 'red' },
};

export function getConfidenceLevel(confidence: number): keyof typeof CONFIDENCE_LEVELS {
    if (confidence >= CONFIDENCE_LEVELS.high.min) return 'high';
    if (confidence >= CONFIDENCE_LEVELS.medium.min) return 'medium';
    if (confidence >= CONFIDENCE_LEVELS.low.min) return 'low';
    return 'very_low';
}

export function shouldRequestClarification(
    field: string,
    confidence: number,
    value?: string
): boolean {
    const thresholds = CONFIDENCE_THRESHOLDS;
    const rules = CLARIFICATION_RULES;

    // Check if field is missing (very low confidence or no value)
    const isMissing = confidence < thresholds.missing_field_threshold || !value;

    switch (field) {
        case 'drug_name':
            return rules.drug_name_uncertain &&
                (confidence < thresholds.drug_name || isMissing);

        case 'strength':
            return rules.strength_uncertain &&
                (confidence < thresholds.strength || isMissing);

        case 'frequency':
            return rules.frequency_missing && isMissing;

        case 'duration':
            return rules.duration_missing && isMissing;

        default:
            return confidence < thresholds.needs_confirmation_threshold;
    }
}
