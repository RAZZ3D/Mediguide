// lib/parser_llm/openai-client.ts - OpenAI GPT-4o-mini client for fast LLM inference

import OpenAI from 'openai';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export class OpenAIClient {
    private client: OpenAI | null = null;
    private defaultModel: string;
    private apiKey: string;

    constructor(
        apiKey: string = OPENAI_API_KEY || '',
        defaultModel: string = 'gpt-4o-mini'
    ) {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;
    }

    private getClient(): OpenAI {
        if (!this.client) {
            if (!this.apiKey) {
                throw new Error('OPENAI_API_KEY environment variable is required');
            }
            this.client = new OpenAI({
                apiKey: this.apiKey,
                baseURL: OPENAI_BASE_URL,
            });
        }
        return this.client;
    }

    /**
     * Generate completion with OpenAI
     */
    async chat(
        messages: ChatMessage[],
        options: {
            model?: string;
            temperature?: number;
            format?: 'json';
            timeout?: number;
        } = {}
    ): Promise<string> {
        const {
            model = this.defaultModel,
            temperature = 0.1, // Low temperature for consistent, factual outputs
            format,
        } = options;

        try {
            const response = await this.getClient().chat.completions.create({
                model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                temperature,
                response_format: format === 'json' ? { type: 'json_object' } : undefined,
            });

            return response.choices[0]?.message?.content || '';

        } catch (error: any) {
            console.error('OpenAI Error:', error);
            throw new Error(`LLM processing failed: ${error.message}`);
        }
    }

    /**
     * Generate JSON completion with OpenAI
     */
    async chatJSON<T = any>(
        messages: ChatMessage[],
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<T> {
        const response = await this.chat(messages, {
            ...options,
            format: 'json',
        });

        try {
            return JSON.parse(response) as T;
        } catch (error) {
            console.error('Failed to parse JSON response:', response);
            throw new Error('LLM returned invalid JSON');
        }
    }

    /**
     * Check if OpenAI API is accessible
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.getClient().models.list();
            return true;
        } catch (error) {
            console.error('OpenAI Health Check Failed:', error);
            return false;
        }
    }

    /**
     * List available models
     */
    async listModels(): Promise<string[]> {
        try {
            const response = await this.getClient().models.list();
            return response.data.map((m: any) => m.id);
        } catch (error) {
            console.error('Failed to list models:', error);
            return [];
        }
    }
}

// Export singleton instance
export const openaiClient = new OpenAIClient();
