const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : '';

console.log('Using API Key:', apiKey.substring(0, 10) + '...');

async function test() {
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro',
        'gemini-2.0-flash-exp'
    ];

    for (const modelName of modelsToTry) {
        console.log(`\nTesting model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello, are you there?');
            console.log(`SUCCESS with ${modelName}! Response:`, result.response.text().substring(0, 50));
            return; // Exit on first success
        } catch (e) {
            console.error(`FAILED with ${modelName}:`, e.message);
        }
    }
}

test();
