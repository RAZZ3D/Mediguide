// lib/druginfo/drug-info-service.ts - Drug information retrieval service

import localKnowledgeBase from './local-knowledge-base.json';
import { DrugInfo } from '../types/schemas';
import { fetchOpenFDADrugInfo } from './openfda-client';

/**
 * Search for drug information in local knowledge base
 */
export function searchLocalDrugInfo(drugName: string): DrugInfo | null {
    const normalizedQuery = drugName.toLowerCase().trim();

    // Search by name, generic name, or brand names
    const drug = localKnowledgeBase.drugs.find(d => {
        const nameMatch = d.name.toLowerCase() === normalizedQuery;
        const genericMatch = d.generic_name?.toLowerCase() === normalizedQuery;
        const brandMatch = d.brand_names?.some(b => b.toLowerCase() === normalizedQuery);

        return nameMatch || genericMatch || brandMatch;
    });

    if (!drug) return null;

    return {
        drug_name: drug.name,
        generic_name: drug.generic_name,
        brand_names: drug.brand_names,
        indications: drug.indications,
        mechanism_of_action: drug.mechanism_of_action,
        common_side_effects: drug.common_side_effects,
        serious_side_effects: drug.serious_side_effects,
        precautions: drug.precautions,
        contraindications: [],
        dosage_forms: drug.dosage_forms,
        typical_dosage_range: drug.typical_dosage_range,
        max_daily_dose: drug.max_daily_dose,
        source: 'local',
        last_updated: new Date().toISOString(),
        cached: true,
    };
}

/**
 * Fuzzy search for drug names (handles typos and variations)
 */
export function fuzzySearchDrugInfo(query: string): DrugInfo[] {
    const normalizedQuery = query.toLowerCase().trim();
    const results: Array<{ drug: any; score: number }> = [];

    for (const drug of localKnowledgeBase.drugs) {
        let score = 0;

        // Exact match
        if (drug.name.toLowerCase() === normalizedQuery) {
            score = 100;
        }
        // Starts with
        else if (drug.name.toLowerCase().startsWith(normalizedQuery)) {
            score = 80;
        }
        // Contains
        else if (drug.name.toLowerCase().includes(normalizedQuery)) {
            score = 60;
        }
        // Brand name match
        else if (drug.brand_names?.some(b => b.toLowerCase().includes(normalizedQuery))) {
            score = 70;
        }
        // Generic name match
        else if (drug.generic_name?.toLowerCase().includes(normalizedQuery)) {
            score = 75;
        }

        if (score > 0) {
            results.push({ drug, score });
        }
    }

    // Sort by score and return top 5
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(r => ({
            drug_name: r.drug.name,
            generic_name: r.drug.generic_name,
            brand_names: r.drug.brand_names,
            indications: r.drug.indications,
            mechanism_of_action: r.drug.mechanism_of_action,
            common_side_effects: r.drug.common_side_effects,
            serious_side_effects: r.drug.serious_side_effects,
            precautions: r.drug.precautions,
            contraindications: [],
            dosage_forms: r.drug.dosage_forms,
            typical_dosage_range: r.drug.typical_dosage_range,
            max_daily_dose: r.drug.max_daily_dose,
            source: 'local',
            last_updated: new Date().toISOString(),
            cached: true,
        }));
}

/**
 * Get drug information (local first, then OpenFDA if needed)
 */
export async function getDrugInfo(drugName: string): Promise<DrugInfo | null> {
    // Try local knowledge base first
    const localResult = searchLocalDrugInfo(drugName);
    if (localResult) {
        return localResult;
    }

    // Try fuzzy search
    const fuzzyResults = fuzzySearchDrugInfo(drugName);
    if (fuzzyResults.length > 0) {
        return fuzzyResults[0];
    }

    // Implement OpenFDA API fallback
    try {
        const openfdaResult = await fetchOpenFDADrugInfo(drugName);
        if (openfdaResult) {
            return openfdaResult;
        }
    } catch (error) {
        console.error(`Failed to fetch OpenFDA info for ${drugName}:`, error);
    }

    // Return not found if both local and external search failed
    return {
        drug_name: drugName,
        indications: [],
        common_side_effects: [],
        precautions: [],
        dosage_forms: [],
        source: 'not_found',
        last_updated: new Date().toISOString(),
        cached: false,
    };
}

/**
 * Get drug information for multiple medications
 */
export async function getBulkDrugInfo(drugNames: string[]): Promise<DrugInfo[]> {
    const results = await Promise.all(
        drugNames.map(name => getDrugInfo(name))
    );

    return results.filter((r): r is DrugInfo => r !== null);
}
