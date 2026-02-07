// lib/parser_llm/gemini-client.ts - Google Gemini Flash client for fast LLM inference

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export class GeminiClient {
    private client: GoogleGenerativeAI | null = null;
    private defaultModel: string;
    private apiKey: string;

    constructor(
        apiKey: string = GEMINI_API_KEY || '',
        defaultModel: string = 'gemini-flash-latest'
    ) {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;
    }

    private getClient(): GoogleGenerativeAI {
        if (!this.client) {
            if (!this.apiKey) {
                throw new Error('GEMINI_API_KEY environment variable is required');
            }
            this.client = new GoogleGenerativeAI(this.apiKey);
        }
        return this.client;
    }

    /**
     * Generate completion with Gemini
     */
    async chat(
        messages: ChatMessage[],
        options: {
            model?: string;
            temperature?: number;
            format?: 'json';
        } = {}
    ): Promise<string> {
        const {
            model = this.defaultModel,
            temperature = 0.1,
            format,
        } = options;

        try {
            const genAI = this.getClient();
            const geminiModel = genAI.getGenerativeModel({
                model,
                generationConfig: {
                    temperature,
                    responseMimeType: format === 'json' ? 'application/json' : 'text/plain',
                }
            });

            // Combine system and user messages
            let prompt = '';
            for (const msg of messages) {
                if (msg.role === 'system') {
                    prompt += `${msg.content}\n\n`;
                } else if (msg.role === 'user') {
                    prompt += msg.content;
                }
            }

            const result = await geminiModel.generateContent(prompt);
            const response = result.response;
            return response.text();

        } catch (error: any) {
            console.error('Gemini Error:', error);
            throw new Error(`LLM processing failed: ${error.message}`);
        }
    }

    /**
     * Generate JSON completion with Gemini
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
     * Check if Gemini API is accessible
     */
    async healthCheck(): Promise<boolean> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: this.defaultModel });
            await model.generateContent('test');
            return true;
        } catch (error) {
            console.error('Gemini Health Check Failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
