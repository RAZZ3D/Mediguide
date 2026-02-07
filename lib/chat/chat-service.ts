// lib/chat/chat-service.ts - AI chat service with safety guardrails

import { geminiClient } from '../parser_llm/gemini-client';
import { CHAT_SYSTEM_PROMPT, generateChatPrompt } from '../parser_llm/prompts';
import { ChatMessage, ChatContext, ChatValidation } from '../types/schemas';

/**
 * Send chat message and get AI response
 */
export async function sendChatMessage(
    userMessage: string,
    context: ChatContext,
    history: ChatMessage[] = []
): Promise<ChatMessage> {
    // Validate request for safety
    const validation = validateChatRequest(userMessage);

    if (!validation.is_safe) {
        return {
            role: 'assistant',
            content: validation.refusal_message || 'I cannot help with that request.',
            timestamp: new Date().toISOString(),
        };
    }

    try {
        // Build messages for LLM
        const messages = [
            {
                role: 'system' as const,
                content: CHAT_SYSTEM_PROMPT,
            },
            ...history.slice(-6), // Keep last 6 messages for context
            {
                role: 'user' as const,
                content: generateChatPrompt(userMessage, context),
            },
        ];

        // Get response from LLM
        const response = await geminiClient.chat(messages, {
            model: 'gemini-flash-latest',
            temperature: 0.3, // Slightly higher for conversational tone
        });

        return {
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString(),
        };

    } catch (error: any) {
        console.error('Chat Service Error:', error);

        return {
            role: 'assistant',
            content: 'I apologize, but I encountered an error processing your question. Please try again.',
            timestamp: new Date().toISOString(),
        };
    }
}

/**
 * Validate chat request for safety
 */
export function validateChatRequest(message: string): ChatValidation {
    const lowerMessage = message.toLowerCase();

    // Check for diagnosis requests
    const diagnosisKeywords = [
        'diagnose', 'what do i have', 'do i have', 'is it', 'could it be',
        'what disease', 'what condition', 'am i sick',
    ];

    for (const keyword of diagnosisKeywords) {
        if (lowerMessage.includes(keyword)) {
            return {
                is_safe: false,
                reason: 'Diagnosis request',
                refusal_message:
                    'I cannot diagnose medical conditions. If you have health concerns, ' +
                    'please consult your doctor or healthcare provider for a proper evaluation.',
            };
        }
    }

    // Check for dosage change requests
    const dosageChangeKeywords = [
        'change dose', 'increase dose', 'decrease dose', 'stop taking',
        'can i take more', 'can i take less', 'should i stop',
        'double the dose', 'skip dose',
    ];

    for (const keyword of dosageChangeKeywords) {
        if (lowerMessage.includes(keyword)) {
            return {
                is_safe: false,
                reason: 'Dosage change request',
                refusal_message:
                    'I cannot recommend changing your medication dosage. Any changes to your ' +
                    'medication should be discussed with your doctor or pharmacist. Never change ' +
                    'your dosage without medical supervision.',
            };
        }
    }

    // Check for medication substitution requests
    const substitutionKeywords = [
        'instead of', 'replace with', 'substitute', 'alternative to',
        'can i take', 'switch to',
    ];

    for (const keyword of substitutionKeywords) {
        if (lowerMessage.includes(keyword) && lowerMessage.includes('instead')) {
            return {
                is_safe: false,
                reason: 'Medication substitution request',
                refusal_message:
                    'I cannot recommend medication substitutions. Please consult your doctor ' +
                    'or pharmacist if you need to discuss alternative medications.',
            };
        }
    }

    // Check for emergency situations
    const emergencyKeywords = [
        'emergency', 'overdose', 'poisoning', 'severe pain', 'chest pain',
        'can\'t breathe', 'difficulty breathing', 'allergic reaction',
    ];

    for (const keyword of emergencyKeywords) {
        if (lowerMessage.includes(keyword)) {
            return {
                is_safe: false,
                reason: 'Emergency situation',
                refusal_message:
                    '⚠️ This sounds like a medical emergency. Please call emergency services ' +
                    'immediately or go to the nearest emergency room. Do not rely on this app ' +
                    'for emergency medical advice.',
            };
        }
    }

    // Request is safe
    return {
        is_safe: true,
    };
}

/**
 * Generate suggested questions based on context
 */
export function generateSuggestedQuestions(context: ChatContext): string[] {
    if (context.mode === 'prescription' && context.medication_plan) {
        const medications = context.medication_plan.medications;

        if (medications.length === 0) {
            return [
                'How do I upload a prescription?',
                'What information can you provide?',
            ];
        }

        const firstMed = medications[0];

        return [
            `What is ${firstMed.name} used for?`,
            `What are the side effects of ${firstMed.name}?`,
            `When should I take ${firstMed.name}?`,
            `Can I take ${firstMed.name} with food?`,
            'Are there any interactions between my medications?',
        ];
    }

    // General mode
    return [
        'How do I read a prescription?',
        'What do medication abbreviations mean?',
        'How should I store medications?',
        'What should I do if I miss a dose?',
    ];
}
