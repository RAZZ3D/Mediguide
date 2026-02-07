// lib/interactions/interaction-checker.ts - Drug interaction checking service

import contraindications from '@/data/contraindications.json';
import { InteractionResult, DrugConditionInteraction, MedicationItem } from '../types/schemas';

/**
 * Check for drug-drug interactions
 */
export function checkDrugInteractions(medications: MedicationItem[]): InteractionResult[] {
    const results: InteractionResult[] = [];

    // Get drug names
    const drugNames = medications.map(m => m.name);

    // Check each pair of medications
    for (let i = 0; i < drugNames.length; i++) {
        for (let j = i + 1; j < drugNames.length; j++) {
            const drug1 = drugNames[i];
            const drug2 = drugNames[j];

            // Check if interaction exists in contraindications database
            const interaction = findInteraction(drug1, drug2);

            if (interaction) {
                results.push(interaction);
            }
        }
    }

    return results;
}

/**
 * Find interaction between two drugs
 */
function findInteraction(drug1: string, drug2: string): InteractionResult | null {
    const normalizedDrug1 = drug1.toLowerCase().trim();
    const normalizedDrug2 = drug2.toLowerCase().trim();

    // Search in contraindications database
    for (const item of contraindications.drug_interactions) {
        const itemDrug = item.drug.toLowerCase();

        // Check if drug1 matches and drug2 is in interactions list
        if (itemDrug === normalizedDrug1 || itemDrug.includes(normalizedDrug1)) {
            const interactsWith = item.interactions.find(
                i => i.toLowerCase() === normalizedDrug2 || i.toLowerCase().includes(normalizedDrug2)
            );

            if (interactsWith) {
                return {
                    drug1: item.drug,
                    drug2: interactsWith,
                    severity: 'moderate', // Default severity
                    description: item.warning,
                    recommendation: 'Please consult your doctor or pharmacist about this potential interaction.',
                    source: 'Local contraindications database',
                };
            }
        }

        // Check reverse (drug2 matches and drug1 is in interactions list)
        if (itemDrug === normalizedDrug2 || itemDrug.includes(normalizedDrug2)) {
            const interactsWith = item.interactions.find(
                i => i.toLowerCase() === normalizedDrug1 || i.toLowerCase().includes(normalizedDrug1)
            );

            if (interactsWith) {
                return {
                    drug1: item.drug,
                    drug2: interactsWith,
                    severity: 'moderate',
                    description: item.warning,
                    recommendation: 'Please consult your doctor or pharmacist about this potential interaction.',
                    source: 'Local contraindications database',
                };
            }
        }
    }

    return null;
}

/**
 * Check for drug-condition interactions
 */
export function checkDrugConditionInteractions(
    medications: MedicationItem[],
    conditions: string[]
): DrugConditionInteraction[] {
    const results: DrugConditionInteraction[] = [];

    for (const medication of medications) {
        for (const condition of conditions) {
            const interaction = findDrugConditionInteraction(medication.name, condition);

            if (interaction) {
                results.push(interaction);
            }
        }
    }

    return results;
}

/**
 * Find drug-condition interaction
 */
function findDrugConditionInteraction(
    drugName: string,
    condition: string
): DrugConditionInteraction | null {
    const normalizedDrug = drugName.toLowerCase().trim();
    const normalizedCondition = condition.toLowerCase().trim();

    // Search in contraindications database
    for (const item of contraindications.conditions) {
        const itemCondition = item.condition.toLowerCase();

        if (itemCondition === normalizedCondition || itemCondition.includes(normalizedCondition)) {
            // Check if drug is in high_risk_drugs, caution_drugs, avoid_drugs, or monitor_drugs
            const allDrugs = [
                ...(item.high_risk_drugs || []),
                ...(item.caution_drugs || []),
                ...(item.avoid_drugs || []),
                ...(item.monitor_drugs || []),
            ];

            const matchingDrug = allDrugs.find(
                d => d.toLowerCase() === normalizedDrug || d.toLowerCase().includes(normalizedDrug)
            );

            if (matchingDrug) {
                // Determine severity
                let severity: 'caution' | 'avoid' | 'monitor' = 'caution';
                if (item.avoid_drugs?.includes(matchingDrug)) {
                    severity = 'avoid';
                } else if (item.monitor_drugs?.includes(matchingDrug)) {
                    severity = 'monitor';
                }

                return {
                    drug: matchingDrug,
                    condition: item.condition,
                    severity,
                    description: item.warning,
                    recommendation: 'Please inform your doctor about this condition.',
                    source: 'Local contraindications database',
                };
            }
        }
    }

    return null;
}

/**
 * Check for drug allergies
 */
export function checkDrugAllergies(
    medications: MedicationItem[],
    allergies: string[]
): Array<{
    drug: string;
    allergy: string;
    warning: string;
}> {
    const results: Array<{
        drug: string;
        allergy: string;
        warning: string;
    }> = [];

    for (const medication of medications) {
        for (const allergy of allergies) {
            const allergyCheck = findDrugAllergy(medication.name, allergy);

            if (allergyCheck) {
                results.push(allergyCheck);
            }
        }
    }

    return results;
}

/**
 * Find drug allergy match
 */
function findDrugAllergy(
    drugName: string,
    allergy: string
): { drug: string; allergy: string; warning: string } | null {
    const normalizedDrug = drugName.toLowerCase().trim();
    const normalizedAllergy = allergy.toLowerCase().trim();

    // Search in contraindications database
    for (const item of contraindications.allergies) {
        const itemAllergy = item.allergy.toLowerCase();

        if (itemAllergy === normalizedAllergy || itemAllergy.includes(normalizedAllergy)) {
            const matchingDrug = item.avoid_drugs.find(
                d => d.toLowerCase() === normalizedDrug || d.toLowerCase().includes(normalizedDrug)
            );

            if (matchingDrug) {
                return {
                    drug: matchingDrug,
                    allergy: item.allergy,
                    warning: item.warning,
                };
            }
        }
    }

    return null;
}

/**
 * Get comprehensive interaction report
 */
export function getInteractionReport(
    medications: MedicationItem[],
    conditions?: string[],
    allergies?: string[]
): {
    drug_interactions: InteractionResult[];
    condition_interactions: DrugConditionInteraction[];
    allergy_warnings: Array<{ drug: string; allergy: string; warning: string }>;
    has_interactions: boolean;
} {
    const drugInteractions = checkDrugInteractions(medications);
    const conditionInteractions = conditions
        ? checkDrugConditionInteractions(medications, conditions)
        : [];
    const allergyWarnings = allergies
        ? checkDrugAllergies(medications, allergies)
        : [];

    return {
        drug_interactions: drugInteractions,
        condition_interactions: conditionInteractions,
        allergy_warnings: allergyWarnings,
        has_interactions:
            drugInteractions.length > 0 ||
            conditionInteractions.length > 0 ||
            allergyWarnings.length > 0,
    };
}
