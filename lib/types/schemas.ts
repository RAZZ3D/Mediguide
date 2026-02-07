// lib/types/schemas.ts - Comprehensive type definitions for AI-first MediGuide

// ============================================================================
// OCR & Preprocessing Types
// ============================================================================

export interface BoundingBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export interface PaddleOCRToken {
    text: string;
    confidence: number; // 0-1
    bbox: [[number, number], [number, number], [number, number], [number, number]]; // 4 corner points
    angle?: number;
}

export interface OCRLine {
    text: string;
    confidence: number;
    tokens: PaddleOCRToken[];
}

export interface OCRResult {
    text: string;
    confidence: number; // Overall confidence 0-1
    tokens: PaddleOCRToken[];
    lines: OCRLine[];
    language_detected?: string;
    processing_time_ms: number;
}

export interface PreprocessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    transformations_applied: string[];
}

// ============================================================================
// Medication Plan Types
// ============================================================================

export interface TimingBuckets {
    morning?: number;
    afternoon?: number;
    evening?: number;
    night?: number;
}

export interface FieldEvidence {
    value: string;
    confidence: number;
    ocr_tokens: PaddleOCRToken[];
    matched_rule?: string;
}

export interface MedicationItem {
    // Core fields
    name: string;
    name_confidence: number;
    name_evidence: FieldEvidence;

    generic_name?: string;

    strength: string;
    strength_confidence: number;
    strength_evidence: FieldEvidence;

    form: string; // "Tablet", "Capsule", "Syrup", etc.
    form_confidence: number;

    route?: string; // "oral", "injection", "topical", etc.

    // Dosing
    frequency: string; // "OD", "BD", "TDS", "1-0-1", etc.
    frequency_normalized: string; // "Once daily", "Twice daily", etc.
    frequency_confidence: number;
    frequency_evidence: FieldEvidence;

    timing_buckets: TimingBuckets;

    // Duration
    duration: string; // "7 days", "2 weeks", "As directed"
    duration_confidence: number;
    duration_evidence?: FieldEvidence;

    // Instructions
    food_instruction?: string; // "before meals", "after meals", "with food"
    food_instruction_confidence?: number;

    special_instructions?: string;
    notes?: string;

    // Uncertainty tracking
    needs_confirmation: boolean;
    uncertain_fields: string[]; // ["strength", "duration"]
}

export interface ClarificationQuestion {
    field: string;
    question: string;
    detected_value?: string;
    confidence: number;
    suggestions?: string[];
}

export interface MedicationPlan {
    medications: MedicationItem[];
    extracted_language: string;
    plain_language_available: boolean;

    // Overall confidence
    overall_confidence: number;
    needs_confirmation: boolean;
    clarification_questions: ClarificationQuestion[];

    // Metadata
    created_at: string;
    ocr_processing_time_ms: number;
    llm_processing_time_ms: number;
}

// ============================================================================
// Drug Information Types
// ============================================================================

export interface DrugInfo {
    drug_name: string;
    generic_name?: string;
    brand_names?: string[];

    // Clinical information
    indications: string[];
    mechanism_of_action?: string;
    common_side_effects: string[];
    serious_side_effects?: string[];
    precautions: string[];
    contraindications?: string[];

    // Dosage information
    dosage_forms: string[];
    typical_dosage_range?: string;
    max_daily_dose?: string;

    // Source tracking
    source: 'openfda' | 'local' | 'not_found';
    source_url?: string;
    last_updated: string;

    // Cache metadata
    cached: boolean;
}

// ============================================================================
// Interaction Types
// ============================================================================

export interface InteractionResult {
    drug1: string;
    drug2: string;
    severity: 'minor' | 'moderate' | 'severe' | 'unknown';
    description: string;
    symptoms?: string[];
    mechanism?: string;
    recommendation: string;
    source: string;
    source_url?: string;
}

export interface DrugConditionInteraction {
    drug: string;
    condition: string;
    severity: 'caution' | 'avoid' | 'monitor';
    description: string;
    recommendation: string;
    source: string;
}

export interface DrugAllergyCheck {
    drug: string;
    allergy_type: string;
    cross_reactivity: string[];
    warning: string;
}

// ============================================================================
// Explainability Types
// ============================================================================

export interface ExplainabilityCard {
    medication_name: string;

    // Section 1: What was detected
    what_was_detected: {
        fields: {
            name: { value: string; confidence: number };
            strength: { value: string; confidence: number };
            frequency: { value: string; confidence: number };
            duration: { value: string; confidence: number };
            food_instruction: { value: string | null; confidence: number };
        };
    };

    // Section 2: Prescription evidence
    prescription_evidence: {
        ocr_tokens: Array<{
            field: string;
            text: string;
            bbox: [[number, number], [number, number], [number, number], [number, number]];
            confidence: number;
        }>;
        matched_rules: string[];
        original_text_snippet: string;
    };

    // Section 3: Why this plan
    why_this_plan: {
        schedule_explanation: string;
        timing_rationale: string;
        duration_reasoning: string;
        food_instruction_reasoning?: string;
    };

    // Section 4: Drug details
    drug_details: {
        what_it_treats: string;
        how_it_works?: string;
        common_side_effects: string[];
        precautions: string[];
        source: string;
        source_url?: string;
    };

    // Section 5: Uncertainty
    uncertainty: {
        has_uncertainty: boolean;
        unclear_fields: string[];
        confirmation_questions: ClarificationQuestion[];
    };
}

// ============================================================================
// Nudge & Adherence Types
// ============================================================================

export interface UserPreferences {
    wake_time: string; // "07:00"
    sleep_time: string; // "22:00"
    meal_times: {
        breakfast: string;
        lunch: string;
        dinner: string;
    };
    preferred_nudge_style: 'gentle' | 'motivational' | 'factual';
    timezone: string;
}

export interface Nudge {
    id: string;
    category: 'implementation_intention' | 'friction_reduction' | 'positive_reinforcement' | 'why_it_matters';
    behavioral_principle: string; // "EAST: Easy", "COM-B: Motivation"
    message: string;

    // Evidence grounding
    evidence: {
        medication: string;
        plan_field: string;
        plan_value: any;
    };

    timing: 'immediate' | 'before_dose' | 'after_dose' | 'missed_dose' | 'daily_summary';
    priority: number; // 1-10

    // Metadata
    created_at: string;
    expires_at?: string;
}

export interface AdherenceLog {
    id?: string;
    user_id: string;
    medication_id: string;
    medication_name: string;

    scheduled_time: string;
    actual_time?: string;

    status: 'taken' | 'missed' | 'snoozed' | 'skipped';

    // Context
    dose_amount?: string;
    notes?: string;

    created_at: string;
}

export interface AdherencePattern {
    pattern_type: 'time_of_day' | 'day_of_week' | 'medication_specific';
    description: string;
    frequency: number; // How often this pattern occurs
    suggestion: string;
}

export interface AdherenceScore {
    medication_id: string;
    timeframe: 'week' | 'month' | 'all_time';

    total_scheduled: number;
    total_taken: number;
    total_missed: number;
    total_snoozed: number;

    percentage: number; // 0-100
    streak_days: number;

    patterns: AdherencePattern[];
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;

    // Metadata
    sources?: string[];
    confidence?: number;
}

export interface ChatContext {
    mode: 'prescription' | 'general';

    // Prescription mode context
    medication_plan?: MedicationPlan;
    drug_info?: DrugInfo[];
    interaction_results?: InteractionResult[];
    explainability_cards?: ExplainabilityCard[];

    // User context
    user_preferences?: UserPreferences;
}

export interface ChatSession {
    id: string;
    user_id: string;
    prescription_id?: string;
    mode: 'prescription' | 'general';

    messages: ChatMessage[];

    created_at: string;
    updated_at: string;
}

export interface ChatValidation {
    is_safe: boolean;
    reason?: string;
    refusal_message?: string;
    requires_clarification?: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ConfidenceThresholds {
    // Overall OCR confidence
    ocr_minimum: number;
    ocr_warning: number;
    ocr_good: number;

    // Per-field confidence
    drug_name: number;
    strength: number;
    frequency: number;
    duration: number;
    food_instruction: number;

    // Clarification triggers
    needs_confirmation_threshold: number;
    missing_field_threshold: number;
}

export interface ClarificationRules {
    drug_name_uncertain: boolean;
    strength_uncertain: boolean;
    frequency_missing: boolean;
    duration_missing: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ParsePrescriptionRequest {
    // Input
    image_url?: string;
    image_base64?: string;
    text?: string;

    // Options
    language_hint?: string;
    user_preferences?: UserPreferences;

    // Context
    user_id?: string;
}

export interface ParsePrescriptionResponse {
    success: boolean;

    // Results
    medication_plan: MedicationPlan;
    explainability_cards: ExplainabilityCard[];
    interaction_results: InteractionResult[];
    nudges: Nudge[];

    // Metadata
    ocr_result?: OCRResult;
    processing_time_ms: number;

    // Errors
    error?: string;
    warnings?: string[];
}

// ============================================================================
// LLM Prompt Types
// ============================================================================

export interface LLMPromptContext {
    ocr_result: OCRResult;
    abbreviation_dict: any;
    normalization_rules: any;
    confidence_thresholds: ConfidenceThresholds;
}

export interface LLMParserResponse {
    medications: MedicationItem[];
    extracted_language: string;
    needs_confirmation: boolean;
    clarification_questions: ClarificationQuestion[];
    processing_notes?: string[];
}

// ============================================================================
// Medicine Chat Types
// ============================================================================

export interface MedicineChatResponse {
    medicine: string;
    confidence: 'high' | 'medium' | 'low';
    quick_summary: string;
    uses: string[];
    general_dosage_info: string;
    how_to_take: string[];
    common_side_effects: string[];
    red_flags: string[];
    interactions: Array<{
        with: string;
        severity: 'low' | 'moderate' | 'high' | 'unknown';
        what_can_happen: string;
        symptoms: string[];
    }>;
    questions_to_confirm: string[];
    behavioral_nudges: Array<{
        label: 'TIMELY' | 'EASY' | 'MOTIVATION' | 'RECOVERY';
        principle: string;
        message: string;
    }>;
    explainability: {
        why: string;
        assumptions: string[];
        limits: string[];
    };
    safety_disclaimer: string;
}
