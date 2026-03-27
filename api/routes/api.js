const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../supabaseClient');
const { createUserClient } = require('../supabaseClient');

const router = express.Router();

// Google OAuth URL generator
router.get('/auth/google', async (req, res) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:8081/', 
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
  req.token = token; // store JWT for user-scoped clients
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
  
  req.user = user;
  next();
};

router.get('/user', authMiddleware, (req, res) => {
  res.json(req.user);
});

/* --- PROJECTS API --- */
router.get('/projects', authMiddleware, async (req, res) => {
  const userDb = createUserClient(req.token);
  const { data: projects, error } = await userDb
    .from('projects')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(projects);
});

router.post('/projects', authMiddleware, async (req, res) => {
  try {
    const { id, title, genre, logline, input, platform, episodes, status, pct, stepIdx } = req.body;

    const baseInput = typeof input === 'string' ? JSON.parse(input) : (input || {});
    const mergedInput = {
      ...baseInput,
      ...(platform !== undefined && { platform }),
      ...(episodes !== undefined && { episodes }),
      ...(status   !== undefined && { status }),
      ...(pct      !== undefined && { pct }),
      ...(stepIdx  !== undefined && { stepIdx }),
    };

    const payload = {
      user_id: req.user.id,
      title: title || 'Untitled',
      genre,
      logline,
      input: mergedInput,
    };
    if (id && !isNaN(id)) payload.id = Number(id);

    // Use user-scoped client so RLS auth.uid() resolves to the real user
    const userDb = createUserClient(req.token);
    const { data, error } = await userDb
      .from('projects')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Projects] Upsert error:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json({ success: true, project: data });
  } catch (err) {
    console.error('[Projects] Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:id', authMiddleware, async (req, res) => {
  const userDb = createUserClient(req.token);
  const { error } = await userDb
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
    
    // API 키로 직접 테스트 확인된 모델명
    const SONNET = "claude-sonnet-4-5";  // 기획/캐스팅/PPL 단계 (빠름)
    const OPUS   = "claude-opus-4-5";   // 대본 집필 단계 (고성능)
    const modelId = (type === 'script') ? OPUS : SONNET;
    
    console.log(`[AI Proxy] Calling Claude Model: ${modelId}`);
    const startTime = Date.now();

    const systemPrompt = content.systemPrompt || "You are a professional K-Drama scriptwriter. Please assist the user based on their input.";
    const userPrompt = content.userPrompt || (typeof content === 'string' ? content : JSON.stringify(content));

    const msg = await anthropic.messages.create({
      model: modelId,
      max_tokens: content.maxTokens || 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
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

