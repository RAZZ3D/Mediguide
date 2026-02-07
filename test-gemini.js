const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Test");
        console.log(`✅ ${modelName} works!`);
        return true;
    } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}`);
        return false;
    }
}

async function listModels() {
    console.log("Testing Gemini models...");
    await testModel("gemini-1.5-flash");
    await testModel("gemini-1.5-flash-latest");
    await testModel("gemini-1.5-flash-001");
    await testModel("gemini-pro");
    await testModel("gemini-1.0-pro");
}

listModels();
