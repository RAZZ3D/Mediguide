// lib/ocr/paddleocr-client.ts - Client for PaddleOCR backend

import { OCRResult, PaddleOCRToken } from '../types/schemas';

const OCR_BACKEND_URL = process.env.NEXT_PUBLIC_OCR_BACKEND_URL || 'http://localhost:8001';

export interface PaddleOCRClientOptions {
    languages?: string[]; // ['en', 'hi']
    timeout?: number; // milliseconds
}

export class PaddleOCRClient {
    private baseUrl: string;

    constructor(baseUrl: string = OCR_BACKEND_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Perform OCR on image file or blob
     */
    async performOCR(
        image: File | Blob,
        options: PaddleOCRClientOptions = {}
    ): Promise<OCRResult> {
        const { languages = ['en'], timeout = 120000 } = options;

        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', image);
            formData.append('languages', languages.join(','));

            // Call OCR backend with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(`${this.baseUrl}/api/ocr`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'OCR request failed');
            }

            const result: OCRResult = await response.json();

            return result;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('OCR request timed out. Please try with a smaller image.');
            }

            console.error('PaddleOCR Error:', error);
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }

    /**
     * Perform OCR on image URL
     */
    async performOCRFromURL(
        imageUrl: string,
        options: PaddleOCRClientOptions = {}
    ): Promise<OCRResult> {
        try {
            // Fetch image as blob
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch image');
            }

            const blob = await response.blob();

            // Perform OCR
            return await this.performOCR(blob, options);

        } catch (error: any) {
            console.error('OCR from URL Error:', error);
            throw new Error(`Failed to process image from URL: ${error.message}`);
        }
    }

    /**
     * Perform OCR on base64 image
     */
    async performOCRFromBase64(
        base64Image: string,
        options: PaddleOCRClientOptions = {}
    ): Promise<OCRResult> {
        try {
            // Convert base64 to blob
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'image/jpeg' });

            // Perform OCR
            return await this.performOCR(blob, options);

        } catch (error: any) {
            console.error('OCR from Base64 Error:', error);
            throw new Error(`Failed to process base64 image: ${error.message}`);
        }
    }

    /**
     * Check if OCR backend is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
            });

            return response.ok;

        } catch (error) {
            console.error('OCR Backend Health Check Failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const paddleOCRClient = new PaddleOCRClient();

// Helper function for backward compatibility
export async function performPaddleOCR(
    image: File | Blob | string,
    languages: string[] = ['en']
): Promise<OCRResult> {
    if (typeof image === 'string') {
        // Check if base64 or URL
        if (image.startsWith('data:')) {
            return paddleOCRClient.performOCRFromBase64(image, { languages });
        } else {
            return paddleOCRClient.performOCRFromURL(image, { languages });
        }
    }

    return paddleOCRClient.performOCR(image, { languages });
}
