// lib/ocr.ts - Production-grade OCR with word-level confidence and bounding boxes

import Tesseract from "tesseract.js";

export type OCRInput = File | Blob | ArrayBuffer;

export interface OCRWord {
    text: string;
    confidence: number; // 0-1
    bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRLine {
    text: string;
    confidence: number; // 0-1 (avg)
}

export interface OCRResult {
    text: string;
    confidence: number; // 0-1 overall
    words: OCRWord[];
    lines: OCRLine[];
}

function avg(nums: number[]) {
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export async function performOCR(
    input: OCRInput,
    langHint: string = "eng"
): Promise<OCRResult> {
    try {
        const result = await Tesseract.recognize(input, langHint, {
            logger: (m) => {
                if (m.status === "recognizing text") {
                    console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            },
        });

        const data = result.data;

        // Extract words with bboxes
        const words: OCRWord[] = (data.words ?? [])
            .filter((w: any) => (w.text ?? "").trim().length > 0)
            .map((w: any) => ({
                text: String(w.text).trim(),
                confidence: (Number(w.confidence) || 0) / 100,
                bbox: {
                    x0: w.bbox?.x0 ?? 0,
                    y0: w.bbox?.y0 ?? 0,
                    x1: w.bbox?.x1 ?? 0,
                    y1: w.bbox?.y1 ?? 0,
                },
            }));

        // Extract lines (Tesseract provides lines)
        const lines: OCRLine[] = (data.lines ?? [])
            .map((l: any) => {
                const lineText = String(l.text ?? "").trim();
                if (!lineText) return null;
                // Estimate confidence from words that fall into this line bbox
                const lineWords = words.filter((w) => {
                    // rough bbox overlap
                    const yMid = (w.bbox.y0 + w.bbox.y1) / 2;
                    return yMid >= (l.bbox?.y0 ?? -Infinity) && yMid <= (l.bbox?.y1 ?? Infinity);
                });
                return {
                    text: lineText,
                    confidence: avg(lineWords.map((w) => w.confidence)) || (Number(l.confidence) || 0) / 100,
                };
            })
            .filter(Boolean) as OCRLine[];

        const text = String(data.text ?? "").trim();
        const confidence = (Number(data.confidence) || 0) / 100;

        return { text, confidence, words, lines };
    } catch (error) {
        console.error("OCR Error:", error);
        throw new Error("Failed to perform OCR on the image");
    }
}
