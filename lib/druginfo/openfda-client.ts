// lib/druginfo/openfda-client.ts - Client for OpenFDA Drug API

import { DrugInfo } from '../types/schemas';

const OPENFDA_API_URL = 'https://api.fda.gov/drug/label.json';

/**
 * Fetch drug information from OpenFDA
 */
export async function fetchOpenFDADrugInfo(drugName: string): Promise<DrugInfo | null> {
    try {
        // Search by brand_name or generic_name
        // Query syntax: search=openfda.brand_name:"drugName"+openfda.generic_name:"drugName"
        const query = `search=openfda.brand_name:"${encodeURIComponent(drugName)}"+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`;

        const response = await fetch(`${OPENFDA_API_URL}?${query}`);

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`OpenFDA API Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) return null;

        const result = data.results[0];
        const openfda = result.openfda || {};

        // Extract relevant fields with fallbacks
        return {
            drug_name: openfda.brand_name?.[0] || openfda.generic_name?.[0] || drugName,
            generic_name: openfda.generic_name?.[0],
            brand_names: openfda.brand_name,
            indications: extractSection(result, ['indications_and_usage', 'purpose']),
            mechanism_of_action: extractSection(result, ['mechanism_of_action', 'clinical_pharmacology']).join(' '),
            common_side_effects: extractSection(result, ['adverse_reactions', 'side_effects']),
            serious_side_effects: extractSection(result, ['warnings', 'warnings_and_cautions']),
            precautions: extractSection(result, ['precautions', 'contraindications']),
            dosage_forms: openfda.dosage_form || [],
            source: 'openfda',
            source_url: `https://open.fda.gov/drug/label/?search=${encodeURIComponent(drugName)}`,
            last_updated: new Date().toISOString(),
            cached: false
        };

    } catch (error) {
        console.error('OpenFDA Fetch Error:', error);
        return null;
    }
}

/**
 * Helper to extract and Summarize text from OpenFDA fields
 * (OpenFDA text is often very long, we take the first few sentences)
 */
function extractSection(data: any, fields: string[]): string[] {
    for (const field of fields) {
        if (data[field] && Array.isArray(data[field]) && data[field].length > 0) {
            const text = data[field][0];
            // Take first 2-3 sentences max to avoid huge blobs of text
            const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
            return sentences.slice(0, 3).map((s: string) => s.trim());
        }
    }
    return [];
}
