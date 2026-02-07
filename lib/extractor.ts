// lib/extractor.ts - Medication extraction engine

import { Medication, ExtractionExplanation } from './types';
import abbreviations from '@/data/abbreviations.json';

interface ExtractionResult {
    medications: Medication[];
    explanations: ExtractionExplanation[];
}

export function extractMedications(text: string): ExtractionResult {
    const medications: Medication[] = [];
    const explanations: ExtractionExplanation[] = [];

    // Split text into lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
        const result = extractMedicationFromLine(line);
        if (result.medication) {
            medications.push(result.medication);
            explanations.push(...result.explanations);
        }
    }

    return { medications, explanations };
}

function extractMedicationFromLine(line: string): {
    medication: Medication | null;
    explanations: ExtractionExplanation[];
} {
    const explanations: ExtractionExplanation[] = [];
    let confidence = 0.5; // Base confidence

    // Extract drug name (usually first word or first few words before dosage)
    const drugNameMatch = line.match(/^(Tab|Cap|Syr|Inj|Inh)?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (!drugNameMatch) {
        return { medication: null, explanations: [] };
    }

    const form = drugNameMatch[1] || 'Tab';
    const drug_name = drugNameMatch[2].trim();

    explanations.push({
        matched_span: drugNameMatch[0],
        rule_name: 'drug_name_extraction',
        normalized_meaning: `Medication: ${drug_name}`,
        confidence: 0.8,
    });

    // Extract strength (e.g., 500mg, 10mcg, 20mg)
    const strengthMatch = line.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|IU|units)/i);
    const strength = strengthMatch ? `${strengthMatch[1]}${strengthMatch[2]}` : 'Unknown';

    if (strengthMatch) {
        explanations.push({
            matched_span: strengthMatch[0],
            rule_name: 'strength_extraction',
            normalized_meaning: `Strength: ${strength}`,
            confidence: 0.9,
        });
        confidence += 0.2;
    }

    // Extract frequency/dose pattern
    let dose_pattern = 'OD';
    let timing_buckets: any = {};

    // Check for dose patterns like 1-0-1, 1-1-1, etc.
    const dosePatternMatch = line.match(/(\d)-(\d)-(\d)/);
    if (dosePatternMatch) {
        dose_pattern = dosePatternMatch[0];
        timing_buckets = {
            morning: parseInt(dosePatternMatch[1]),
            afternoon: parseInt(dosePatternMatch[2]),
            evening: parseInt(dosePatternMatch[3]),
        };
        explanations.push({
            matched_span: dosePatternMatch[0],
            rule_name: 'dose_pattern_extraction',
            normalized_meaning: `Dose pattern: ${dosePatternMatch[1]} morning, ${dosePatternMatch[2]} afternoon, ${dosePatternMatch[3]} evening`,
            confidence: 0.95,
        });
        confidence += 0.2;
    } else {
        // Check for frequency abbreviations
        const freqMatch = line.match(/\b(OD|BD|TDS|QDS|QID|PRN|HS|Q4H|Q6H|Q8H|Q12H)\b/i);
        if (freqMatch) {
            dose_pattern = freqMatch[1].toUpperCase();
            const freqInfo = abbreviations.frequency[dose_pattern as keyof typeof abbreviations.frequency];

            if (freqInfo) {
                explanations.push({
                    matched_span: freqMatch[0],
                    rule_name: 'frequency_extraction',
                    normalized_meaning: `Frequency: ${freqInfo.full}`,
                    confidence: 0.9,
                });

                // Map to timing buckets
                if (dose_pattern === 'OD') {
                    timing_buckets = { morning: 1 };
                } else if (dose_pattern === 'BD') {
                    timing_buckets = { morning: 1, evening: 1 };
                } else if (dose_pattern === 'TDS') {
                    timing_buckets = { morning: 1, afternoon: 1, evening: 1 };
                } else if (dose_pattern === 'QDS' || dose_pattern === 'QID') {
                    timing_buckets = { morning: 1, afternoon: 1, evening: 1, night: 1 };
                } else if (dose_pattern === 'HS') {
                    timing_buckets = { night: 1 };
                }
                confidence += 0.15;
            }
        }
    }

    // Extract duration (e.g., x 30 days, x 7 days)
    const durationMatch = line.match(/x\s*(\d+)\s*(day|days|week|weeks|month|months)/i);
    const duration = durationMatch ? `${durationMatch[1]} ${durationMatch[2]}` : 'As directed';

    if (durationMatch) {
        explanations.push({
            matched_span: durationMatch[0],
            rule_name: 'duration_extraction',
            normalized_meaning: `Duration: ${duration}`,
            confidence: 0.85,
        });
        confidence += 0.1;
    }

    // Extract food instructions (AC, PC, with meals, empty stomach)
    let food_instruction = undefined;
    const foodMatch = line.match(/\b(AC|PC|with meals|empty stomach|before meals|after meals)\b/i);
    if (foodMatch) {
        food_instruction = foodMatch[1];
        const foodMeaning = foodMatch[1].toUpperCase() === 'AC' ? 'Before meals' :
            foodMatch[1].toUpperCase() === 'PC' ? 'After meals' :
                foodMatch[1];
        explanations.push({
            matched_span: foodMatch[0],
            rule_name: 'food_instruction_extraction',
            normalized_meaning: `Food instruction: ${foodMeaning}`,
            confidence: 0.85,
        });
        confidence += 0.1;
    }

    // Extract timing hints (morning, evening, bedtime, HS)
    const timingMatch = line.match(/\b(morning|evening|bedtime|HS|AM|PM|noon)\b/i);
    if (timingMatch) {
        const timing = timingMatch[1].toUpperCase();
        if (timing === 'HS' || timing.toLowerCase() === 'bedtime') {
            timing_buckets = { night: 1 };
        } else if (timing === 'AM' || timing.toLowerCase() === 'morning') {
            timing_buckets = { morning: 1 };
        } else if (timing === 'PM' || timing.toLowerCase() === 'evening') {
            timing_buckets = { evening: 1 };
        }
        explanations.push({
            matched_span: timingMatch[0],
            rule_name: 'timing_extraction',
            normalized_meaning: `Timing: ${timingMatch[1]}`,
            confidence: 0.8,
        });
    }

    // Extract notes (PRN instructions, max doses, etc.)
    let notes = undefined;
    const prnMatch = line.match(/PRN.*?(\(.*?\))?/i);
    if (prnMatch) {
        notes = prnMatch[0];
    }
    const maxDoseMatch = line.match(/max\s+\d+.*?(dose|mg|ml)/i);
    if (maxDoseMatch) {
        notes = (notes ? notes + ' | ' : '') + maxDoseMatch[0];
    }

    // Normalize confidence to 0-1 range
    confidence = Math.min(confidence, 1.0);

    const medication: Medication = {
        drug_name,
        strength,
        form: abbreviations.form[form as keyof typeof abbreviations.form] || form,
        dose_pattern,
        timing_buckets,
        duration,
        food_instruction,
        notes,
        confidence,
    };

    return { medication, explanations };
}
