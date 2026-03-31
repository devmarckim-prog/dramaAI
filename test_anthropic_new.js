const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function testModel(modelId, type) {
  console.log(`Testing ${type} model: ${modelId}...`);
  try {
    const msg = await anthropic.messages.create({
      model: modelId,
      max_tokens: 100,
      system: 'You are a test assistant.',
      messages: [{ role: 'user', content: 'Say hello.' }],
    });
    console.log(`✅ ${modelId} SUCCESS: ${msg.content[0].text}`);
  } catch (err) {
    console.error(`❌ ${modelId} FAILED: ${err.message}`);
  }
}

async function runTests() {
  await testModel("claude-3-5-haiku-20241022", "Planning (SONNET)");
  await testModel("claude-3-5-sonnet-20241022", "Script (OPUS)");
}

runTests();
