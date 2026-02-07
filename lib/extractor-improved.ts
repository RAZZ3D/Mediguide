// lib/extractor-improved.ts - Improved medication extraction engine

import { Medication, ExtractionExplanation } from './types';
import abbreviations from '@/data/abbreviations.json';

interface ExtractionResult {
    medications: Medication[];
    explanations: ExtractionExplanation[];
}

// Common medication keywords to filter out non-medication lines
const NON_MEDICATION_KEYWORDS = [
    'name', 'age', 'date', 'weight', 'address', 'phone', 'doctor', 'clinic', 'hospital',
    'patient', 'gender', 'diagnosis', 'advice', 'follow', 'review', 'signature',
    'registration', 'reg', 'mbbs', 'md', 'clinical', 'description', 'urti', 'fever'
];

// Common medication forms to identify medication lines
const MEDICATION_FORMS = ['tab', 'cap', 'syr', 'syp', 'inj', 'inh', 'oint', 'cr', 'gel', 'drops', 'susp', 'powder'];

export function extractMedications(text: string): ExtractionResult {
    const medications: Medication[] = [];
    const explanations: ExtractionExplanation[] = [];

    // Split text into lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
        // Skip lines that are clearly not medications
        if (isNonMedicationLine(line)) {
            continue;
        }

        // Only process lines that have medication indicators
        if (!hasMedicationIndicators(line)) {
            continue;
        }

        const result = extractMedicationFromLine(line);
        if (result.medication) {
            medications.push(result.medication);
            explanations.push(...result.explanations);
        }
    }

    return { medications, explanations };
}

function isNonMedicationLine(line: string): boolean {
    const lowerLine = line.toLowerCase().trim();

    // Skip very short lines (likely not medications)
    if (lowerLine.length < 3) return true;

    // Skip lines that start with common non-medication keywords
    for (const keyword of NON_MEDICATION_KEYWORDS) {
        if (lowerLine.startsWith(keyword)) return true;
        if (lowerLine.includes(':') && lowerLine.split(':')[0].trim() === keyword) return true;
    }

    // Skip lines that are just numbers or dates
    if (/^\d+[-\/]\d+[-\/]\d+/.test(lowerLine)) return true;
    if (/^[\d\s:]+$/.test(lowerLine)) return true;

    return false;
}

function hasMedicationIndicators(line: string): boolean {
    const lowerLine = line.toLowerCase();

    // Must have at least ONE of these medication indicators:
    // 1. Strength (number + unit)
    const hasStrength = /\d+\s*(mg|mcg|ml|g|iu|units?)/i.test(line);

    // 2. Frequency abbreviation
    const hasFrequency = /\b(od|bd|tds|qds|qid|prn|sos|hs|q\d+h|stat|times?\s+(daily|a\s+day|per\s+day))/i.test(line);

    // 3. Medication form
    const hasForm = /\b(tab|cap|syr|syp|inj|inh|oint|cr|gel|drops|susp|powder)\b/i.test(lowerLine);

    // 4. Duration
    const hasDuration = /x\s*\d+\s*(d|day|days|w|week|weeks|m|month|months)/i.test(line);

    // A valid medication line should have at least 1 of these indicators
    const indicatorCount = [hasStrength, hasFrequency, hasForm, hasDuration].filter(Boolean).length;

    return indicatorCount >= 1;
}

function extractMedicationFromLine(line: string): {
    medication: Medication | null;
    explanations: ExtractionExplanation[];
} {
    const explanations: ExtractionExplanation[] = [];
    let confidence = 0.3; // Lower base confidence

    // Try to extract drug name - more flexible patterns
    let drug_name = '';
    let form = 'Tablet';

    // Pattern 1: Form + Drug name (e.g., "Tab Aspirin", "Syp CALPOL")
    const formDrugMatch = line.match(/\b(tab|cap|syr|syp|inj|inh|oint|cr|gel|drops|susp)\s+([a-z][\w\-]+)/i);
    if (formDrugMatch) {
        form = formDrugMatch[1];
        drug_name = formDrugMatch[2];
        confidence += 0.3;

        explanations.push({
            matched_span: formDrugMatch[0],
            rule_name: 'form_drug_extraction',
            normalized_meaning: `Medication: ${drug_name} (${form})`,
            confidence: 0.9,
        });
    } else {
        // Pattern 2: Just drug name (first meaningful word)
        const words = line.trim().split(/\s+/);
        for (const word of words) {
            // Skip common prefixes and short words
            if (word.length >= 3 && !/^\d+$/.test(word) && !NON_MEDICATION_KEYWORDS.includes(word.toLowerCase())) {
                drug_name = word;
                confidence += 0.2;
                break;
            }
        }

        if (!drug_name) {
            return { medication: null, explanations: [] };
        }

        explanations.push({
            matched_span: drug_name,
            rule_name: 'drug_name_extraction',
            normalized_meaning: `Medication: ${drug_name}`,
            confidence: 0.7,
        });
    }

    // Extract strength - multiple patterns
    let strength = 'Unknown';

    // Pattern 1: Number + unit (e.g., "500mg", "10 mcg", "250/5ml")
    const strengthMatch = line.match(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*(mg|mcg|g|ml|iu|units?)/i);
    if (strengthMatch) {
        strength = `${strengthMatch[1]}${strengthMatch[2]}`;
        confidence += 0.2;

        explanations.push({
            matched_span: strengthMatch[0],
            rule_name: 'strength_extraction',
            normalized_meaning: `Strength: ${strength}`,
            confidence: 0.9,
        });
    }

    // Extract frequency/dose pattern - multiple patterns
    let dose_pattern = 'OD';
    let timing_buckets: any = { morning: 1 };

    // Pattern 1: Dose pattern (1-0-1, 1-1-1, etc.)
    const dosePatternMatch = line.match(/(\d)-(\d)-(\d)/);
    if (dosePatternMatch) {
        dose_pattern = dosePatternMatch[0];
        timing_buckets = {
            morning: parseInt(dosePatternMatch[1]),
            afternoon: parseInt(dosePatternMatch[2]),
            evening: parseInt(dosePatternMatch[3]),
        };
        confidence += 0.2;

        explanations.push({
            matched_span: dosePatternMatch[0],
            rule_name: 'dose_pattern_extraction',
            normalized_meaning: `Dose pattern: ${dosePatternMatch[1]}-${dosePatternMatch[2]}-${dosePatternMatch[3]}`,
            confidence: 0.95,
        });
    } else {
        // Pattern 2: Frequency abbreviations (OD, BD, TDS, Q6H, etc.)
        const freqMatch = line.match(/\b(od|bd|tds|qds|qid|prn|hs|sos|q4h|q6h|q8h|q12h|stat)\b/i);
        if (freqMatch) {
            dose_pattern = freqMatch[1].toUpperCase();
            confidence += 0.15;

            const freqInfo = abbreviations.frequency[dose_pattern as keyof typeof abbreviations.frequency];
            if (freqInfo) {
                explanations.push({
                    matched_span: freqMatch[0],
                    rule_name: 'frequency_extraction',
                    normalized_meaning: `Frequency: ${freqInfo.full}`,
                    confidence: 0.9,
                });

                // Map to timing buckets
                if (dose_pattern === 'OD') timing_buckets = { morning: 1 };
                else if (dose_pattern === 'BD') timing_buckets = { morning: 1, evening: 1 };
                else if (dose_pattern === 'TDS') timing_buckets = { morning: 1, afternoon: 1, evening: 1 };
                else if (dose_pattern === 'QDS' || dose_pattern === 'QID') timing_buckets = { morning: 1, afternoon: 1, evening: 1, night: 1 };
                else if (dose_pattern === 'HS' || dose_pattern === 'SOS') timing_buckets = { night: 1 };
                else if (dose_pattern === 'Q6H') timing_buckets = { morning: 1, afternoon: 1, evening: 1, night: 1 };
            }
        } else {
            // Pattern 3: Times per day (e.g., "twice daily", "3 times a day")
            const timesMatch = line.match(/(\d+)\s*times?\s*(daily|per day|a day)/i);
            if (timesMatch) {
                const times = parseInt(timesMatch[1]);
                if (times === 1) dose_pattern = 'OD';
                else if (times === 2) { dose_pattern = 'BD'; timing_buckets = { morning: 1, evening: 1 }; }
                else if (times === 3) { dose_pattern = 'TDS'; timing_buckets = { morning: 1, afternoon: 1, evening: 1 }; }
                else if (times === 4) { dose_pattern = 'QDS'; timing_buckets = { morning: 1, afternoon: 1, evening: 1, night: 1 }; }
                confidence += 0.15;
            }
        }
    }

    // Extract duration - multiple patterns
    let duration = 'As directed';

    // Pattern 1: "x N days/weeks/months"
    const durationMatch1 = line.match(/x\s*(\d+)\s*(d|day|days|w|week|weeks|m|month|months)/i);
    if (durationMatch1) {
        const num = durationMatch1[1];
        const unit = durationMatch1[2].toLowerCase();
        const fullUnit = unit.startsWith('d') ? 'days' : unit.startsWith('w') ? 'weeks' : 'months';
        duration = `${num} ${fullUnit}`;
        confidence += 0.1;

        explanations.push({
            matched_span: durationMatch1[0],
            rule_name: 'duration_extraction',
            normalized_meaning: `Duration: ${duration}`,
            confidence: 0.85,
        });
    } else {
        // Pattern 2: "for N days/weeks/months"
        const durationMatch2 = line.match(/for\s+(\d+)\s*(d|day|days|w|week|weeks|m|month|months)/i);
        if (durationMatch2) {
            const num = durationMatch2[1];
            const unit = durationMatch2[2].toLowerCase();
            const fullUnit = unit.startsWith('d') ? 'days' : unit.startsWith('w') ? 'weeks' : 'months';
            duration = `${num} ${fullUnit}`;
            confidence += 0.1;
        }
    }

    // Extract food instructions
    let food_instruction = undefined;
    const foodMatch = line.match(/\b(ac|pc|with meals|empty stomach|before meals|after meals|with food)\b/i);
    if (foodMatch) {
        food_instruction = foodMatch[1];
        confidence += 0.1;

        explanations.push({
            matched_span: foodMatch[0],
            rule_name: 'food_instruction_extraction',
            normalized_meaning: `Food instruction: ${foodMatch[1]}`,
            confidence: 0.85,
        });
    }

    // Extract timing hints
    const timingMatch = line.match(/\b(morning|evening|bedtime|night|afternoon)\b/i);
    if (timingMatch) {
        const timing = timingMatch[1].toLowerCase();
        if (timing === 'morning') timing_buckets = { morning: 1 };
        else if (timing === 'evening' || timing === 'night' || timing === 'bedtime') timing_buckets = { night: 1 };
        else if (timing === 'afternoon') timing_buckets = { afternoon: 1 };

        explanations.push({
            matched_span: timingMatch[0],
            rule_name: 'timing_extraction',
            normalized_meaning: `Timing: ${timingMatch[1]}`,
            confidence: 0.8,
        });
    }

    // Extract notes (PRN, SOS, max doses, etc.)
    let notes = undefined;
    const prnMatch = line.match(/(prn|sos|as needed|if needed).*?(\(.*?\))?/i);
    if (prnMatch) {
        notes = prnMatch[0];
    }
    const maxDoseMatch = line.match(/max\s+\d+.*?(dose|mg|ml|times)/i);
    if (maxDoseMatch) {
        notes = (notes ? notes + ' | ' : '') + maxDoseMatch[0];
    }

    // Normalize confidence
    confidence = Math.min(Math.max(confidence, 0.3), 1.0);

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
