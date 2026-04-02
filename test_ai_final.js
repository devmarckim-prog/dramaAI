
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: './api/.env' });

async function testModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found in .env');
    return;
  }

  const anthropic = new Anthropic({ apiKey });

  const testModel = async (modelId) => {
    console.log(`Testing model: ${modelId}...`);
    try {
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "OK"' }]
      });
      console.log(`[Success] ${modelId} replied: ${response.content[0].text}`);
      return true;
    } catch (err) {
      console.error(`[Failed] ${modelId} error: ${err.message}`);
      return false;
    }
  };

  const results = {
    haiku: await testModel('claude-haiku-4-5-20251001'),
    sonnet: await testModel('claude-sonnet-4-6')
  };

  if (results.haiku && results.sonnet) {
    console.log('\nFinal Result: Both models are WORKING properly.');
    process.exit(0);
  } else {
    console.error('\nFinal Result: One or more models FAILED.');
    process.exit(1);
  }
}

testModels();
