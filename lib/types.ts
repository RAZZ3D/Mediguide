// lib/types.ts - Type definitions for MediGuide

export interface Medication {
  drug_name: string;
  strength: string;
  form: string;
  dose_pattern: string;
  timing_buckets: {
    morning?: number;
    afternoon?: number;
    evening?: number;
    night?: number;
  };
  duration: string;
  food_instruction?: string;
  notes?: string;
  confidence: number;
}

export interface ExtractionExplanation {
  matched_span: string;
  rule_name: string;
  normalized_meaning: string;
  confidence: number;
}

export interface PlainLanguageExplanation {
  medication: string;
  what: string;
  when: string;
  why_timing: string;
  food_instructions?: string;
  important_notes?: string;
}

export interface SafetyHint {
  type: 'interaction' | 'condition' | 'allergy';
  severity: 'info' | 'caution';
  message: string;
  affected_medications: string[];
}

export interface AdherenceNudge {
  id: number;
  category: string;
  nudge: string;
  rationale: string;
}

export interface ParsedOutput {
  medications: Medication[];
  extraction_explanations: ExtractionExplanation[];
  plain_language: PlainLanguageExplanation[];
  safety_hints: SafetyHint[];
  adherence_score: number;
  adherence_nudges: AdherenceNudge[];
  overall_confidence: number;
  ocr_confidence?: number;
}

export interface ParseRequest {
  text?: string;
  imageUrl?: string;
  langHint?: string;
}
