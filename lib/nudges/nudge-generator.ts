// lib/nudges/nudge-generator.ts - Behavioral science-based nudge generation

import { Nudge, MedicationItem, UserPreferences, AdherencePattern } from '../types/schemas';

/**
 * Generate behavioral nudges for medication adherence
 */
export function generateNudges(
    medications: MedicationItem[],
    userPreferences?: UserPreferences,
    adherencePatterns?: AdherencePattern[]
): Nudge[] {
    const nudges: Nudge[] = [];

    // Default preferences if not provided
    const prefs = userPreferences || {
        wake_time: '07:00',
        sleep_time: '22:00',
        meal_times: {
            breakfast: '08:00',
            lunch: '13:00',
            dinner: '19:00',
        },
        preferred_nudge_style: 'gentle' as const,
        timezone: 'Asia/Kolkata',
    };

    for (const medication of medications) {
        // 1. Implementation Intention Nudges (EAST: Easy)
        nudges.push(...generateImplementationIntentionNudges(medication, prefs));

        // 2. Friction Reduction Nudges (EAST: Easy)
        nudges.push(...generateFrictionReductionNudges(medication));

        // 3. Why It Matters Nudges (COM-B: Motivation)
        nudges.push(...generateWhyItMattersNudges(medication));
    }

    // 4. Positive Reinforcement Nudges (EAST: Attractive)
    if (adherencePatterns) {
        nudges.push(...generatePositiveReinforcementNudges(adherencePatterns));
    }

    // Sort by priority and return top nudges
    return nudges.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

/**
 * Generate implementation intention nudges
 * Link medication to existing habits
 */
function generateImplementationIntentionNudges(
    medication: MedicationItem,
    prefs: UserPreferences
): Nudge[] {
    const nudges: Nudge[] = [];
    const buckets = medication.timing_buckets;

    // Morning dose → link to breakfast
    if (buckets.morning) {
        const habit = medication.food_instruction?.includes('before')
            ? 'Before breakfast'
            : medication.food_instruction?.includes('after')
                ? 'After breakfast'
                : 'With breakfast';

        nudges.push({
            id: `impl_intent_morning_${medication.name}`,
            category: 'implementation_intention',
            behavioral_principle: 'EAST: Easy - Implementation Intention',
            message: `${habit}, take your ${medication.name} ${medication.strength}`,
            evidence: {
                medication: medication.name,
                plan_field: 'timing_buckets.morning',
                plan_value: buckets.morning,
            },
            timing: 'before_dose',
            priority: 9,
            created_at: new Date().toISOString(),
        });
    }

    // Evening/Night dose → link to dinner or bedtime
    if (buckets.evening || buckets.night) {
        const timing = buckets.night ? 'bedtime' : 'dinner';
        const habit = medication.food_instruction?.includes('before')
            ? `Before ${timing}`
            : medication.food_instruction?.includes('after')
                ? `After ${timing}`
                : timing === 'bedtime'
                    ? 'When you brush your teeth at night'
                    : `With ${timing}`;

        nudges.push({
            id: `impl_intent_evening_${medication.name}`,
            category: 'implementation_intention',
            behavioral_principle: 'EAST: Easy - Implementation Intention',
            message: `${habit}, take your ${medication.name} ${medication.strength}`,
            evidence: {
                medication: medication.name,
                plan_field: buckets.night ? 'timing_buckets.night' : 'timing_buckets.evening',
                plan_value: buckets.night || buckets.evening,
            },
            timing: 'before_dose',
            priority: 9,
            created_at: new Date().toISOString(),
        });
    }

    return nudges;
}

/**
 * Generate friction reduction nudges
 * Simplify the action
 */
function generateFrictionReductionNudges(medication: MedicationItem): Nudge[] {
    return [
        {
            id: `friction_reduction_${medication.name}`,
            category: 'friction_reduction',
            behavioral_principle: 'EAST: Easy - Reduce Friction',
            message: `One-tap to mark "${medication.name}" as taken`,
            evidence: {
                medication: medication.name,
                plan_field: 'name',
                plan_value: medication.name,
            },
            timing: 'immediate',
            priority: 7,
            created_at: new Date().toISOString(),
        },
    ];
}

/**
 * Generate "why it matters" nudges
 * Gentle, factual motivation
 */
function generateWhyItMattersNudges(medication: MedicationItem): Nudge[] {
    const nudges: Nudge[] = [];

    // Generic why it matters based on medication type
    const whyItMattersMessages: Record<string, string> = {
        // Blood pressure medications
        'amlodipine': 'Taking Amlodipine as prescribed helps maintain healthy blood pressure',
        'losartan': 'Consistent Losartan helps protect your heart and kidneys',
        'metoprolol': 'Regular Metoprolol helps keep your heart rate steady',

        // Diabetes medications
        'metformin': 'Taking Metformin as prescribed helps manage blood sugar levels',
        'glimepiride': 'Consistent Glimepiride helps control blood sugar throughout the day',

        // Cholesterol medications
        'atorvastatin': 'Regular Atorvastatin helps maintain healthy cholesterol levels',
        'rosuvastatin': 'Taking Rosuvastatin as prescribed supports heart health',

        // Antibiotics
        'azithromycin': 'Completing the full course of Azithromycin ensures the infection is fully treated',
        'amoxicillin': 'Finishing all Amoxicillin doses prevents antibiotic resistance',

        // Pain/Fever
        'paracetamol': 'Taking Paracetamol as directed provides effective pain and fever relief',

        // Default
        'default': `Taking ${medication.name} as prescribed helps it work effectively`,
    };

    const drugNameLower = medication.name.toLowerCase();
    const message = whyItMattersMessages[drugNameLower] || whyItMattersMessages['default'];

    nudges.push({
        id: `why_matters_${medication.name}`,
        category: 'why_it_matters',
        behavioral_principle: 'COM-B: Motivation - Reflective',
        message,
        evidence: {
            medication: medication.name,
            plan_field: 'name',
            plan_value: medication.name,
        },
        timing: 'before_dose',
        priority: 6,
        created_at: new Date().toISOString(),
    });

    // Duration-specific nudge for antibiotics
    if (medication.duration && !medication.duration.includes('directed')) {
        nudges.push({
            id: `duration_reminder_${medication.name}`,
            category: 'why_it_matters',
            behavioral_principle: 'COM-B: Motivation - Reflective',
            message: `Complete the full ${medication.duration} course for best results`,
            evidence: {
                medication: medication.name,
                plan_field: 'duration',
                plan_value: medication.duration,
            },
            timing: 'daily_summary',
            priority: 7,
            created_at: new Date().toISOString(),
        });
    }

    return nudges;
}

/**
 * Generate positive reinforcement nudges
 * Celebrate progress
 */
function generatePositiveReinforcementNudges(patterns: AdherencePattern[]): Nudge[] {
    const nudges: Nudge[] = [];

    // Generic positive reinforcement (will be personalized based on actual adherence data)
    nudges.push({
        id: 'positive_reinforcement_streak',
        category: 'positive_reinforcement',
        behavioral_principle: 'EAST: Attractive - Positive Reinforcement',
        message: "You're building a great medication routine! Keep it up 💪",
        evidence: {
            medication: 'all',
            plan_field: 'adherence',
            plan_value: 'streak',
        },
        timing: 'daily_summary',
        priority: 8,
        created_at: new Date().toISOString(),
    });

    return nudges;
}
