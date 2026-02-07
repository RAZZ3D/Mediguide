// lib/safety.ts - Safety hints and contraindication checker

import { Medication, SafetyHint } from './types';
import contraindications from '@/data/contraindications.json';

export function generateSafetyHints(medications: Medication[]): SafetyHint[] {
    const hints: SafetyHint[] = [];
    const drugNames = medications.map(m => m.drug_name.toLowerCase());

    // Check for drug-drug interactions
    for (const med of medications) {
        const drugLower = med.drug_name.toLowerCase();

        // Find contraindication info for this drug
        const drugInfo = contraindications.drug_interactions.find(
            d => drugLower.includes(d.drug.toLowerCase()) || d.drug.toLowerCase().includes(drugLower)
        );

        if (drugInfo) {
            // Check if any interacting drugs are in the medication list
            const foundInteractions = drugInfo.interactions.filter(interactingDrug =>
                drugNames.some(name =>
                    name.includes(interactingDrug.toLowerCase()) ||
                    interactingDrug.toLowerCase().includes(name)
                )
            );

            if (foundInteractions.length > 0) {
                hints.push({
                    type: 'interaction',
                    severity: 'caution',
                    message: `${med.drug_name}: ${drugInfo.warning}`,
                    affected_medications: [med.drug_name, ...foundInteractions],
                });
            } else {
                // Add general interaction info even if not found in current list
                hints.push({
                    type: 'interaction',
                    severity: 'info',
                    message: `${med.drug_name}: ${drugInfo.warning}`,
                    affected_medications: [med.drug_name],
                });
            }
        }
    }

    // Add condition-based warnings (informational only)
    const highRiskDrugs = medications.filter(med =>
        contraindications.conditions.some(cond =>
            cond.high_risk_drugs?.some(drug =>
                med.drug_name.toLowerCase().includes(drug.toLowerCase())
            )
        )
    );

    if (highRiskDrugs.length > 0) {
        const pregnancyWarning = contraindications.conditions.find(c => c.condition === 'Pregnancy');
        if (pregnancyWarning) {
            hints.push({
                type: 'condition',
                severity: 'caution',
                message: pregnancyWarning.warning,
                affected_medications: highRiskDrugs.map(m => m.drug_name),
            });
        }
    }

    // Add allergy warnings
    for (const allergyInfo of contraindications.allergies) {
        const affectedMeds = medications.filter(med =>
            allergyInfo.avoid_drugs.some(drug =>
                med.drug_name.toLowerCase().includes(drug.toLowerCase())
            )
        );

        if (affectedMeds.length > 0) {
            hints.push({
                type: 'allergy',
                severity: 'caution',
                message: allergyInfo.warning,
                affected_medications: affectedMeds.map(m => m.drug_name),
            });
        }
    }

    // Deduplicate hints
    const uniqueHints = hints.filter((hint, index, self) =>
        index === self.findIndex(h => h.message === hint.message)
    );

    return uniqueHints;
}
