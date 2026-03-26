const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../supabaseClient');

const router = express.Router();

// Google OAuth URL generator
router.get('/auth/google', async (req, res) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:8081', 
    },
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ url: data.url });
});

// Middleware to verify Supabase Token
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
  
  req.user = user;
  next();
};

/* --- PROJECTS API --- */
router.get('/projects', authMiddleware, async (req, res) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(projects);
});

router.post('/projects', authMiddleware, async (req, res) => {
  const projectData = req.body;
  const { id, title, genre, platform, episodes, logline, status, pct, stepIdx, input } = projectData;
  
  // Clean ID for Supabase identity column if it looks like a temporary one or is null
  const payload = {
    user_id: req.user.id,
    title, genre, platform, episodes, logline, status, pct, stepIdx,
    input: typeof input === 'string' ? JSON.parse(input) : input
  };
  
  if (id && !isNaN(id)) payload.id = id;

  const { data, error } = await supabase
    .from('projects')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, project: data });
});

router.delete('/projects/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
    
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

/* --- AI PROXY API --- */
router.post('/generate', async (req, res) => {
  try {
    // 1. JWT 토큰이 있으면 사용자 확인 (옵션)
    const authHeader = req.headers['authorization'];
    let supabaseUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) supabaseUser = user;
    }

    // 2. 사용할 API 키 결정: 헤더 우선 -> env
    const userApiKey = req.headers['x-user-api-key'];
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const { type, content } = req.body;
    console.log(`[AI Proxy] Type: ${type}, Tokens: ${content.maxTokens || 'default'}`);

    const anthropic = new Anthropic({ apiKey });
    
    // 2026년 기준 최신 모델 적용: Claude 4.6 Sonnet & 4.5 Haiku
    const modelId = (type === 'script') 
      ? "claude-sonnet-4-6" 
      : "claude-haiku-4-5-20251001";
    
    console.log(`[AI Proxy] Calling Claude Model: ${modelId}`);
    const startTime = Date.now();

    const msg = await anthropic.messages.create({
      model: modelId,
      max_tokens: content.maxTokens || 8192,
      system: content.systemPrompt,
      messages: [{ role: "user", content: content.userPrompt }],
    });
    
    const duration = ((Date.now() - startTime)/1000).toFixed(1);
    console.log(`[AI Proxy] Response received in ${duration}s`);
    
    let raw = msg.content[0].text;
    console.log(`[AI Proxy] Raw response length: ${raw.length} chars`);
    
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    try {
      const parsed = JSON.parse(clean);
      res.json(parsed);
    } catch (parseError) {
      console.error('[AI Proxy] JSON Parse Error:', parseError.message);
      res.status(500).json({ error: 'AI 응답 파싱 실패 (JSON 포맷 오류)', raw: raw });
    }
  } catch (error) {
    console.error('[AI Proxy] Execution Error:', error);
    res.status(500).json({ error: error.message || 'Error generating script' });
  }
});

/* --- PAYMENT API --- */
router.post('/payment', authMiddleware, async (req, res) => {
  const { amount, plan, project_id } = req.body;
  const { error } = await supabase.from('payments').insert({
    user_id: req.user.id,
    project_id,
    amount,
    status: 'success'
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, message: 'Payment recorded' });
});

router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'DramaScript AI API is working on Vercel!',
    env_check: {
      has_anthropic: !!process.env.ANTHROPIC_API_KEY,
      node_env: process.env.NODE_ENV
    }
  });
});

module.exports = router;

