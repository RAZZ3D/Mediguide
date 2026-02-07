// lib/preprocess.ts - Image preprocessing for better OCR

export async function preprocessImage(file: File): Promise<Blob> {
    const img = await loadImage(file);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // Scale up if tiny (Tesseract likes ~150-300 DPI equivalent)
    const scale = Math.max(1, 1600 / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Basic grayscale + contrast + threshold
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;

    // Grayscale conversion
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        d[i] = d[i + 1] = d[i + 2] = gray;
    }

    // Simple threshold (binarization)
    const thresh = 160;
    for (let i = 0; i < d.length; i += 4) {
        const v = d[i] >= thresh ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
    }

    ctx.putImageData(imageData, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) reject(new Error("Failed to create blob"));
            else resolve(blob);
        }, "image/png");
    });
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = reject;
        img.src = url;
    });
}
