// lib/explainability/explainability-generator.ts - Generate evidence-grounded explanations

import {
    ExplainabilityCard,
    MedicationItem,
    DrugInfo,
    PaddleOCRToken
} from '../types/schemas';

/**
 * Generate explainability card for a medication
 */
export function generateExplainabilityCard(
    medication: MedicationItem,
    drugInfo: DrugInfo | null
): ExplainabilityCard {
    return {
        medication_name: medication.name,

        // Section 1: What was detected
        what_was_detected: {
            fields: {
                name: {
                    value: medication.name,
                    confidence: medication.name_confidence,
                },
                strength: {
                    value: medication.strength,
                    confidence: medication.strength_confidence,
                },
                frequency: {
                    value: medication.frequency_normalized,
                    confidence: medication.frequency_confidence,
                },
                duration: {
                    value: medication.duration,
                    confidence: medication.duration_confidence,
                },
                food_instruction: {
                    value: medication.food_instruction || null,
                    confidence: medication.food_instruction_confidence || 0,
                },
            },
        },

        // Section 2: Prescription evidence
        prescription_evidence: {
            ocr_tokens: [
                {
                    field: 'name',
                    text: medication.name_evidence.value,
                    bbox: medication.name_evidence.ocr_tokens[0]?.bbox || [[0, 0], [0, 0], [0, 0], [0, 0]],
                    confidence: medication.name_evidence.confidence,
                },
                {
                    field: 'strength',
                    text: medication.strength_evidence.value,
                    bbox: medication.strength_evidence.ocr_tokens[0]?.bbox || [[0, 0], [0, 0], [0, 0], [0, 0]],
                    confidence: medication.strength_evidence.confidence,
                },
                {
                    field: 'frequency',
                    text: medication.frequency_evidence.value,
                    bbox: medication.frequency_evidence.ocr_tokens[0]?.bbox || [[0, 0], [0, 0], [0, 0], [0, 0]],
                    confidence: medication.frequency_evidence.confidence,
                },
            ],
            matched_rules: [
                medication.name_evidence.matched_rule || 'drug_name_extraction',
                medication.strength_evidence.matched_rule || 'strength_extraction',
                medication.frequency_evidence.matched_rule || 'frequency_extraction',
            ],
            original_text_snippet: `${medication.name} ${medication.strength} ${medication.frequency}`,
        },

        // Section 3: Why this plan
        why_this_plan: {
            schedule_explanation: generateScheduleExplanation(medication),
            timing_rationale: generateTimingRationale(medication),
            duration_reasoning: generateDurationReasoning(medication),
            food_instruction_reasoning: medication.food_instruction
                ? generateFoodInstructionReasoning(medication.food_instruction)
                : undefined,
        },

        // Section 4: Drug details
        drug_details: drugInfo
            ? {
                what_it_treats: drugInfo.indications.join(', '),
                how_it_works: drugInfo.mechanism_of_action,
                common_side_effects: drugInfo.common_side_effects,
                precautions: drugInfo.precautions,
                source: drugInfo.source === 'local' ? 'Local Knowledge Base' : 'OpenFDA',
                source_url: drugInfo.source_url,
            }
            : {
                what_it_treats: 'Information not available',
                common_side_effects: [],
                precautions: [],
                source: 'Not found',
            },

        // Section 5: Uncertainty
        uncertainty: {
            has_uncertainty: medication.needs_confirmation,
            unclear_fields: medication.uncertain_fields,
            confirmation_questions: [], // Will be populated by confidence gate
        },
    };
}

/**
 * Generate schedule explanation based on timing buckets
 */
function generateScheduleExplanation(medication: MedicationItem): string {
    const buckets = medication.timing_buckets;
    const parts: string[] = [];

    if (buckets.morning) {
        parts.push(`${buckets.morning} in the morning`);
    }
    if (buckets.afternoon) {
        parts.push(`${buckets.afternoon} in the afternoon`);
    }
    if (buckets.evening) {
        parts.push(`${buckets.evening} in the evening`);
    }
    if (buckets.night) {
        parts.push(`${buckets.night} at night`);
    }

    if (parts.length === 0) {
        return `Take as directed by your doctor.`;
    }

    const schedule = parts.join(', ');

    return `Based on "${medication.frequency}" in the prescription, take ${schedule}. ` +
        `This means ${medication.frequency_normalized.toLowerCase()}.`;
}

/**
 * Generate timing rationale
 */
function generateTimingRationale(medication: MedicationItem): string {
    if (medication.food_instruction) {
        const instruction = medication.food_instruction.toLowerCase();

        if (instruction.includes('before') || instruction.includes('ac')) {
            return 'The prescription indicates to take this medication before meals. ' +
                'This helps with better absorption or reduces stomach upset.';
        }

        if (instruction.includes('after') || instruction.includes('pc')) {
            return 'The prescription indicates to take this medication after meals. ' +
                'This helps reduce stomach irritation.';
        }

        if (instruction.includes('with')) {
            return 'The prescription indicates to take this medication with food. ' +
                'This helps with absorption and reduces stomach upset.';
        }
    }

    // Check timing from buckets
    if (medication.timing_buckets.morning && !medication.timing_buckets.evening) {
        return 'Taking this medication in the morning helps maintain consistent levels throughout the day.';
    }

    if (medication.timing_buckets.night && !medication.timing_buckets.morning) {
        return 'Taking this medication at night may help with better absorption or reduce daytime side effects.';
    }

    return 'The timing is based on the prescription instructions to maintain consistent medication levels.';
}

/**
 * Generate duration reasoning
 */
function generateDurationReasoning(medication: MedicationItem): string {
    if (medication.duration === 'As directed') {
        return 'The prescription does not specify a duration. Continue taking as directed by your doctor.';
    }

    if (medication.duration_evidence) {
        return `The prescription specifies "${medication.duration_evidence.value}" as the duration. ` +
            `Complete the full course even if you feel better.`;
    }

    return `Take for ${medication.duration}. Complete the full course as prescribed.`;
}

/**
 * Generate food instruction reasoning
 */
function generateFoodInstructionReasoning(instruction: string): string {
    const lower = instruction.toLowerCase();

    if (lower.includes('before') || lower.includes('ac')) {
        return 'Taking before meals (usually 30-60 minutes) helps with absorption or prevents stomach upset.';
    }

    if (lower.includes('after') || lower.includes('pc')) {
        return 'Taking after meals helps reduce stomach irritation from the medication.';
    }

    if (lower.includes('with')) {
        return 'Taking with food helps with absorption and reduces the chance of stomach upset.';
    }

    if (lower.includes('empty')) {
        return 'Taking on an empty stomach (1 hour before or 2 hours after food) ensures proper absorption.';
    }

    return `Follow the instruction: ${instruction}`;
}

/**
 * Generate explainability cards for all medications
 */
export function generateExplainabilityCards(
    medications: MedicationItem[],
    drugInfoList: (DrugInfo | null)[]
): ExplainabilityCard[] {
    return medications.map((med, index) =>
        generateExplainabilityCard(med, drugInfoList[index] || null)
    );
}
