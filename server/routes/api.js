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
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    // 사용자 API 키 우선, 없으면 서버 기본 키 사용
    const userApiKey = req.headers['x-user-api-key'];
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const { type, content } = req.body;
    const anthropic = new Anthropic({ apiKey });
    
    // MVP 비용 최적화: 대본 외에는 저렴한 Haiku 모델 사용
    const modelId = (type === 'script') 
      ? "claude-3-5-sonnet-20241022" 
      : "claude-3-5-haiku-20241022";

    const msg = await anthropic.messages.create({
      model: modelId,
      max_tokens: content.maxTokens || 8000,
      system: content.systemPrompt,
      messages: [{ role: "user", content: content.userPrompt }],
    });
    
    const raw = msg.content[0].text;
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    res.json(JSON.parse(clean));
  } catch (error) {
    console.error('Claude API Error:', error);
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

module.exports = router;
