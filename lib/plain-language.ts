// lib/plain-language.ts - Plain language explanation generator

import { Medication, PlainLanguageExplanation } from './types';
import templates from '@/data/explanation_templates.json';
import abbreviations from '@/data/abbreviations.json';

export function generatePlainLanguage(medications: Medication[]): PlainLanguageExplanation[] {
    return medications.map(med => {
        const when = generateWhenExplanation(med);
        const why_timing = generateWhyTiming(med);
        const food_instructions = generateFoodInstructions(med);
        const important_notes = generateImportantNotes(med);

        return {
            medication: `${med.drug_name} ${med.strength}`,
            what: `${med.form} containing ${med.drug_name} at ${med.strength} strength`,
            when,
            why_timing,
            food_instructions,
            important_notes,
        };
    });
}

function generateWhenExplanation(med: Medication): string {
    const { dose_pattern, timing_buckets, duration } = med;

    // Check if it's a dose pattern like 1-0-1
    if (dose_pattern.match(/\d-\d-\d/)) {
        const parts: string[] = [];
        if (timing_buckets.morning && timing_buckets.morning > 0) {
            parts.push(`${timing_buckets.morning} in the morning`);
        }
        if (timing_buckets.afternoon && timing_buckets.afternoon > 0) {
            parts.push(`${timing_buckets.afternoon} in the afternoon`);
        }
        if (timing_buckets.evening && timing_buckets.evening > 0) {
            parts.push(`${timing_buckets.evening} in the evening`);
        }
        if (timing_buckets.night && timing_buckets.night > 0) {
            parts.push(`${timing_buckets.night} at night`);
        }

        const schedule = parts.join(', ');
        const explanation = (templates.frequency_explanations as Record<string, string>)[dose_pattern];
        return `Take ${schedule} for ${duration}.${explanation ? ' ' + explanation : ''}`;
    }

    // Use frequency abbreviations
    const freqExplanation = templates.frequency_explanations[dose_pattern as keyof typeof templates.frequency_explanations];
    if (freqExplanation) {
        return `${freqExplanation} for ${duration}.`;
    }

    return `Take as directed for ${duration}.`;
}

function generateWhyTiming(med: Medication): string {
    const { food_instruction, timing_buckets } = med;

    // Determine primary timing rationale
    if (food_instruction) {
        const foodUpper = food_instruction.toUpperCase();
        if (foodUpper === 'AC' || food_instruction.toLowerCase().includes('before')) {
            return templates.what_when_why.timing_rationales.before_meals;
        } else if (foodUpper === 'PC' || food_instruction.toLowerCase().includes('after')) {
            return templates.what_when_why.timing_rationales.after_meals;
        } else if (food_instruction.toLowerCase().includes('with meals')) {
            return templates.what_when_why.timing_rationales.with_meals;
        } else if (food_instruction.toLowerCase().includes('empty stomach')) {
            return templates.what_when_why.timing_rationales.morning_empty_stomach;
        }
    }

    if (timing_buckets.night) {
        return templates.what_when_why.timing_rationales.bedtime;
    }

    if (timing_buckets.morning && timing_buckets.evening) {
        return templates.what_when_why.timing_rationales.spread_doses;
    }

    return templates.what_when_why.timing_rationales.consistent_time;
}

function generateFoodInstructions(med: Medication): string | undefined {
    if (!med.food_instruction) return undefined;

    const foodUpper = med.food_instruction.toUpperCase();

    if (foodUpper === 'AC') {
        return templates.food_instructions.AC;
    } else if (foodUpper === 'PC') {
        return templates.food_instructions.PC;
    } else if (med.food_instruction.toLowerCase().includes('with meals')) {
        return templates.food_instructions.with_meals;
    } else if (med.food_instruction.toLowerCase().includes('empty stomach')) {
        return templates.food_instructions.empty_stomach;
    }

    return med.food_instruction;
}

function generateImportantNotes(med: Medication): string | undefined {
    const notes: string[] = [];

    if (med.notes) {
        notes.push(med.notes);
    }

    // Add duration-based notes
    const durationDays = parseInt(med.duration);
    if (!isNaN(durationDays)) {
        if (durationDays <= 14) {
            notes.push(templates.duration_explanations.short_course);
        } else if (durationDays >= 60) {
            notes.push(templates.duration_explanations.long_term);
        }
    }

    // Add PRN note if applicable
    if (med.dose_pattern === 'PRN') {
        notes.push(templates.duration_explanations.as_needed);
    }

    return notes.length > 0 ? notes.join(' ') : undefined;
}
