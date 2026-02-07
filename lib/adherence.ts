// lib/adherence.ts - Adherence scoring and nudge selection

import { Medication, AdherenceNudge } from './types';
import nudgeLibrary from '@/data/nudge_library.json';

export interface AdherenceResult {
    score: number;
    nudges: AdherenceNudge[];
    explanation: string;
}

export function calculateAdherenceScore(medications: Medication[]): AdherenceResult {
    let score = 100;
    const factors: string[] = [];

    // Factor 1: Complexity (number of medications)
    const medCount = medications.length;
    if (medCount > 5) {
        score -= 15;
        factors.push('High number of medications (>5) increases complexity');
    } else if (medCount > 3) {
        score -= 8;
        factors.push('Moderate number of medications (3-5)');
    }

    // Factor 2: Frequency complexity (multiple times per day)
    const complexFrequencies = medications.filter(m =>
        m.dose_pattern === 'TDS' || m.dose_pattern === 'QDS' || m.dose_pattern === 'QID'
    );
    if (complexFrequencies.length > 0) {
        score -= complexFrequencies.length * 5;
        factors.push(`${complexFrequencies.length} medication(s) require 3+ doses per day`);
    }

    // Factor 3: Food instruction complexity
    const foodInstructions = medications.filter(m => m.food_instruction);
    if (foodInstructions.length > 2) {
        score -= 5;
        factors.push('Multiple medications with specific food timing requirements');
    }

    // Factor 4: PRN medications (as-needed can be forgotten)
    const prnMeds = medications.filter(m => m.dose_pattern === 'PRN');
    if (prnMeds.length > 0) {
        score -= prnMeds.length * 3;
        factors.push(`${prnMeds.length} PRN medication(s) may be inconsistently used`);
    }

    // Factor 5: Different timing requirements
    const timingVariety = new Set<string>();
    medications.forEach(m => {
        if (m.timing_buckets.morning) timingVariety.add('morning');
        if (m.timing_buckets.afternoon) timingVariety.add('afternoon');
        if (m.timing_buckets.evening) timingVariety.add('evening');
        if (m.timing_buckets.night) timingVariety.add('night');
    });

    if (timingVariety.size > 3) {
        score -= 8;
        factors.push('Medications spread across 4+ different times of day');
    } else if (timingVariety.size > 2) {
        score -= 4;
        factors.push('Medications spread across 3 different times of day');
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Select appropriate nudges
    const nudges = selectNudges(medications, score);

    const explanation = factors.length > 0
        ? `Adherence factors: ${factors.join('; ')}.`
        : 'Simple medication regimen with high expected adherence.';

    return { score, nudges, explanation };
}

function selectNudges(medications: Medication[], score: number): AdherenceNudge[] {
    const selectedNudges: AdherenceNudge[] = [];
    const medCount = medications.length;

    // Always include timing nudge
    selectedNudges.push(nudgeLibrary[0]); // Set alarm
    selectedNudges.push(nudgeLibrary[1]); // Link to daily activity

    // If complex regimen, add organization nudges
    if (medCount > 3) {
        selectedNudges.push(nudgeLibrary[2]); // Pill organizer
        selectedNudges.push(nudgeLibrary[3]); // Visible spot
    }

    // If score is lower, add more support nudges
    if (score < 80) {
        selectedNudges.push(nudgeLibrary[5]); // Tracking
        selectedNudges.push(nudgeLibrary[6]); // Social support
    }

    // Add understanding nudge
    selectedNudges.push(nudgeLibrary[4]); // Write down why important

    // If very complex, add simplification nudge
    if (medCount > 5) {
        selectedNudges.push(nudgeLibrary[8]); // Ask pharmacist about combining
    }

    // Add refill reminder
    selectedNudges.push(nudgeLibrary[7]); // Refill reminder

    // Limit to 5-7 nudges
    return selectedNudges.slice(0, Math.min(7, selectedNudges.length));
}
