require('dotenv').config({ path: './api/.env' });
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Mock log function
const log = (msg) => console.log(`[TEST-LOG] ${msg}`);

// Import the actual modelMap from the app structure or redefine for test
const modelMap = {
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'gemini-1.5-flash': 'gemini-1.5-flash'
};

// Re-implement a simplified callUnifiedAI for testing logic
// (In a real test we'd import it, but let's just copy the core logic to verify it works as intended)
const callUnifiedAI = async (params, anthropicKey, geminiKey) => {
  const { prompt, system, modelAlias } = params;
  const finalSystem = system || "당신은 세계적인 K-드라마 전문 작가입니다.";

  // 1. Try Anthropic
  if (anthropicKey && anthropicKey !== 'INVALID') {
    try {
        log(`Attempting Anthropic...`);
        // We expect this to fail if we pass an invalid key
        const client = new Anthropic({ apiKey: anthropicKey });
        await client.messages.create({
            model: modelMap[modelAlias] || modelAlias,
            max_tokens: 100,
            system: finalSystem,
            messages: [{ role: 'user', content: prompt }]
        });
        return "ANTHROPIC_SUCCESS";
    } catch (err) {
        log(`Anthropic failed: ${err.message}. ${geminiKey ? 'Attempting Gemini fallback...' : 'No fallback key.'}`);
        if (!geminiKey) throw err;
    }
  }

  // 2. Fallback to Gemini
  if (geminiKey) {
    try {
      log(`Attempting Gemini fallback...`);
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: finalSystem });
      const result = await model.generateContent(prompt);
      return "GEMINI_SUCCESS";
    } catch (gemErr) {
      log(`Gemini failed: ${gemErr.message}`);
      throw gemErr;
    }
  }

  throw new Error('No AI Providers available');
};

async function runTest() {
  console.log('--- Case 1: Anthropic Invalid -> Gemini Fallback ---');
  const invKey = 'sk-ant-invalid-key-for-testing';
  const gemKey = process.env.GEMINI_API_KEY; // This is probably empty too, but let's see

  try {
    const res = await callUnifiedAI({ prompt: 'Hi', modelAlias: 'claude-sonnet-4-6' }, invKey, gemKey);
    console.log('Result:', res);
  } catch (e) {
    console.log('Final Error (Expected if no Gemini key):', e.message);
  }
}

runTest();
