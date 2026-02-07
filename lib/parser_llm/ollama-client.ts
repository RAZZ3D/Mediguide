// lib/parser_llm/ollama-client.ts - Ollama client for local LLM inference

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OllamaRequest {
    model: string;
    messages: OllamaMessage[];
    stream?: boolean;
    format?: 'json';
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
    };
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_duration?: number;
    eval_duration?: number;
}

const OLLAMA_BASE_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

export class OllamaClient {
    private baseUrl: string;
    private defaultModel: string;

    constructor(
        baseUrl: string = OLLAMA_BASE_URL,
        defaultModel: string = 'mistral'
    ) {
        this.baseUrl = baseUrl;
        this.defaultModel = defaultModel;
    }

    /**
     * Generate completion with Ollama
     */
    async chat(
        messages: OllamaMessage[],
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
            timeout = 180000, // 180 second timeout (3 minutes for first-time model loading)
        } = options;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const request: OllamaRequest = {
                model,
                messages,
                stream: false,
                format,
                options: {
                    temperature,
                    top_p: 0.9,
                    top_k: 40,
                },
            };

            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Ollama request failed: ${error}`);
            }

            const result: OllamaResponse = await response.json();

            return result.message.content;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('LLM request timed out. Please try again.');
            }

            console.error('Ollama Error:', error);
            throw new Error(`LLM processing failed: ${error.message}`);
        }
    }

    /**
     * Generate JSON completion with Ollama
     */
    async chatJSON<T = any>(
        messages: OllamaMessage[],
        options: {
            model?: string;
            temperature?: number;
            timeout?: number;
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
     * Check if Ollama is running and model is available
     */
    async healthCheck(model?: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);

            if (!response.ok) {
                return false;
            }

            const data = await response.json();

            if (model) {
                // Check if specific model is available
                return data.models?.some((m: any) => m.name === model) || false;
            }

            return true;

        } catch (error) {
            console.error('Ollama Health Check Failed:', error);
            return false;
        }
    }

    /**
     * List available models
     */
    async listModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);

            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }

            const data = await response.json();

            return data.models?.map((m: any) => m.name) || [];

        } catch (error) {
            console.error('Failed to list models:', error);
            return [];
        }
    }
}

// Export singleton instance
export const ollamaClient = new OllamaClient();
