require('dotenv').config({ path: './api/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing in api/.env');
    return;
  }

  console.log('🚀 Testing Gemini 1.5 Flash...');
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "당신은 한국 드라마 작가입니다. 모든 응답은 JSON으로 하세요."
    });

    const prompt = "현대 배경의 짧은 드라마 로그라인 한 줄과 제목을 JSON으로 만들어줘.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Gemini Response:');
    console.log(text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('✅ Valid JSON found:', JSON.parse(jsonMatch[0]));
    } else {
      console.log('⚠️ No JSON found in response.');
    }
  } catch (err) {
    console.error('❌ Gemini Test Failed:', err.message);
  }
}

testGemini();
