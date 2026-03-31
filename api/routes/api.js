const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase, createUserClient, serviceSupabase } = require('../supabaseClient');

const fs = require('fs');
const path = require('path');

// Logging helper consistent with api/index.js
const logFile = path.resolve(__dirname, '../../api/server.log');
const log = (msg) => {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    if (process.env.NODE_ENV !== 'production') {
      fs.appendFileSync(logFile, entry);
    }
  } catch (e) {
    // Ignore FS errors
  }
  console.log(msg);
};

/**
 * Loads system configuration for AI models and prompts
 * Prioritizes Supabase Cloud DB, falls back to local JSON
 */
async function getSystemConfig() {
  const configPath = path.join(__dirname, '../config/system.json');
  const defaults = {
    planningModel: 'claude-3-5-haiku-20241022',
    productionModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: "당신은 세계적인 K-드라마 전문 작가입니다."
  };

  if (!serviceSupabase) {
    console.error('[Config] Supabase Service Client is NOT initialized. Check environment variables.');
    return defaults;
  }

  // 1. Try Supabase Cloud Config First
  try {
    const { data, error } = await serviceSupabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global')
      .single();
    
    if (!error && data) {
      log(`[Config] Loaded from Supabase Cloud: ${data.production_model}`);
      return {
        planningModel: data.planning_model || defaults.planningModel,
        productionModel: data.production_model || defaults.productionModel,
        systemPrompt: data.system_prompt || defaults.systemPrompt
      };
    }
  } catch (dbErr) {
    console.warn('[Config] Supabase fetch failed, falling back to local file.');
  }

  // 2. Fallback to Local JSON
  try {
    if (fs.existsSync(configPath)) {
      const local = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // log('[Config] Loaded from local system.json');
      return { ...defaults, ...local };
    }
  } catch (err) {
    console.error('[Config] Failed to read system.json:', err);
  }
  
  return defaults;
}

/**
 * Ensures user_profiles entry exists and returns profile
 */
async function syncProfile(user) {
  if (!user) return null;
  
  // If guest, return a mock profile
  if (user.id === GLOBAL_GUEST_UUID || user.isGuest) {
    return { id: user.id, email: 'guest@dramascript.ai', role: 'guest', plan: 'Free', credits: 999 };
  }
  
  // High-priority Admin rule for new users or domain-level control
  const isPrimaryEmail = user.email && (user.email.endsWith('@dramascript.ai') || user.email === 'dev.marckim@gmail.com');

  const config = await getSystemConfig();
  const defaultCredits = config.creditsFree || 10;

  try {
    // 1. Fetch current profile - Chain all methods in one expression (Supabase queries are immutable!)
    const profileId = (user.isGuest && user.fingerprint) ? user.fingerprint : user.id;
    const { data: profile, error } = await serviceSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
       console.log(`[Profile Sync] Creating/Updating profile for ${user.email || 'Guest'}`);
       const { data: newProfile, error: insErr } = await serviceSupabase
        .from('user_profiles')
        .upsert({
          id: profileId,
          email: user.email || `guest-${(user.fingerprint || 'anon').slice(0, 8)}@dramascript.ai`,
          role: isPrimaryEmail ? 'admin' : (user.isGuest ? 'guest' : 'user'),
          plan: 'Free',
          credits: defaultCredits,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (insErr) {
         console.error('[Profile Sync] UPSERT error:', insErr.message);
         return { id: profileId, email: user.email, role: user.isGuest ? 'guest' : 'user', plan: 'Free', credits: defaultCredits };
      }
      return newProfile;
    }
    return profile;
  } catch (err) {
    console.error('[Profile Sync] Critical Error:', err);
    return { id: user.id, email: user.email, role: isPrimaryEmail ? 'admin' : 'user', plan: 'Free', credits: 10 };
  }
}

const router = express.Router();

// Google OAuth URL generator
router.get('/auth/google', async (req, res) => {
  const origin = req.get('origin') || req.get('referer') || 'http://localhost:8081/';
  log(`[Auth] Google Login requested from: ${origin}`);
  
  if (!supabase) {
    const errorMsg = '서버 설정(Supabase)이 완료되지 않았습니다. 관리자에게 문의하세요. (Missing SUPABASE_URL)';
    log(`[Auth] Google Login failed: ${errorMsg}`, 'error');
    return res.status(500).json({ error: errorMsg });
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin, 
      },
    });
    
    if (error) {
      log(`[Auth] OAuth Error: ${error.message} (Origin: ${origin})`, 'error');
      return res.status(error.status || 400).json({ error: error.message });
    }
    
    if (!data.url) {
      log(`[Auth] OAuth URL generation failed for origin: ${origin}`, 'error');
      return res.status(500).json({ error: 'OAuth URL generation failed' });
    }

    log(`[Auth] Generated OAuth URL: ${data.url.substring(0, 50)}...`);
    res.json({ url: data.url });
  } catch (err) {
    log(`[Auth] Unexpected Critical Error: ${err.message}`, 'error');
    res.status(500).json({ error: err.message });
  }
});

// Global Guest UUID for anonymous projects
const GLOBAL_GUEST_UUID = '00000000-0000-0000-0000-000000000000';

// Middleware to verify Supabase Token OR Guest Fingerprint
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const guestFingerprint = req.headers['x-guest-fingerprint'];

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const raw = authHeader.split(' ')[1];
    // Ignore malformed or placeholder tokens
    if (raw && raw !== 'null' && raw !== 'undefined' && raw !== 'mock_token') {
      token = raw;
    }
  }

  // If no valid token but fingerprint exists -> GUEST (Unique ID based on fingerprint)
  if (!token && guestFingerprint) {
    // If it is a valid UUID, use it directly. Otherwise, stick with GLOBAL fallback for now.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestFingerprint);
    req.user = { 
        id: isUuid ? guestFingerprint : GLOBAL_GUEST_UUID, 
        fingerprint: guestFingerprint, 
        isGuest: true 
    };
    log(`[Auth] Authorized Guest: ${guestFingerprint.substring(0, 8)}... (ID Type: ${isUuid ? 'Unique' : 'Shared'})`);
    return next();
  }

  if (!token) {
    log(`[Auth] Rejecting: No valid token or fingerprint. Headers: auth=${!!authHeader}, guest=${!!guestFingerprint}`);
    return res.status(401).json({ error: 'No token or fingerprint provided' });
  }

  req.token = token; 
  
  if (!supabase) {
    log('[Auth] Rejecting: Supabase client not initialized.', 'error');
    return res.status(500).json({ error: '인증 서버 설정 오류' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    // If it's a guest request with a bad token, try falling back to fingerprint
    if (guestFingerprint) {
      req.user = { id: GLOBAL_GUEST_UUID, fingerprint: guestFingerprint, isGuest: true };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = user;
  next();
};

router.get('/user', authMiddleware, (req, res) => {
  res.json(req.user);
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await syncProfile(req.user);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* --- PROJECTS API --- */
router.get('/projects', authMiddleware, async (req, res) => {
  const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);
  
  let query = userDb.from('projects').select('*').eq('user_id', req.user.id);
  
  // Sorting for both guests and members
  query = query.order('created_at', { ascending: false });
    
  const { data: projects, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(projects);
});

router.post('/projects', authMiddleware, async (req, res) => {
  try {
    const { id, title, genre, logline, synopsis, chars, ppl, budget, input, platform, episodes, status, pct, stepIdx, error_msg, scripts } = req.body;

    const baseInput = typeof input === 'string' ? JSON.parse(input) : (input || {});
    // Inject fingerprint into input if guest
    if (req.user.isGuest) {
      baseInput.fingerprint = req.user.fingerprint;
    }

    const mergedInput = {
      ...baseInput,
      ...(platform !== undefined && { platform }),
      ...(episodes !== undefined && { episodes }),
      ...(status   !== undefined && { status }),
    };

    // Clean episodes to ensure numeric value
    let epCount = 8;
    if (episodes !== undefined && episodes !== null) {
      if (typeof episodes === 'number') epCount = episodes;
      else if (typeof episodes === 'string') {
        const p = parseInt(episodes.replace(/[^0-9]/g, ''));
        if (!isNaN(p)) epCount = p;
      } else if (typeof episodes === 'object') {
        // AI might return { val: 8 } or similar
        const firstNum = Object.values(episodes).find(v => !isNaN(parseInt(v)));
        if (firstNum !== undefined) epCount = parseInt(firstNum);
      }
    }

    const payload = {
      user_id: req.user.id,
      title: title || 'Untitled',
      genre: genre || 'Drama',
      platform: platform || 'OTT',
      logline: logline || '',
      synopsis: synopsis || '',
      chars: Array.isArray(chars) ? chars : [],
      episodes: epCount,
      ppl: Array.isArray(ppl) ? ppl : [],
      budget: typeof budget === 'object' ? budget : {},
      status: status || 'planning',
      pct: pct || 0,
      stepIdx: stepIdx || 0,
      input: mergedInput
    };

    // Robust ID handling: Always keep as string (DB is TEXT type)
    if (id) {
      payload.id = String(id);
    }

    // Save scripts if provided (episode scripts storage)
    if (scripts !== undefined) {
      payload.scripts = (typeof scripts === 'object' && scripts !== null) ? scripts : {};
    }
    // Save error message for failed generations
    if (error_msg !== undefined) {
      payload.error_msg = String(error_msg || '').substring(0, 1000); // Limit length
    }

    const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);
    console.log(`[Projects] Saving project for user ${req.user.id}:`, { id: payload.id, title: payload.title, status: payload.status });

    const { data, error } = await userDb
      .from('projects')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Projects] Upsert error:', error.message, error.details);
      return res.status(error.code === 'PGRST116' ? 409 : 400).json({ 
        error: error.message,
        details: error.details,
        hint: error.hint
      });
    }

    console.log('[Projects] Save successful:', data.id);

    // Background sync profile
    syncProfile(req.user).catch(err => console.error('[Sync] Failed:', err));

    res.json({ success: true, project: data });
  } catch (err) {
    console.error('[Projects] Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    log(`[Projects] DELETE request for project: ${projectId} (User: ${userId}, Guest: ${!!req.user.isGuest})`);

    const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);
    
    // 1. Precise ID categorization
    // If it contains a hyphen, it's a UUID. If it's purely numeric, it's a numeric ID.
    const isUuid = projectId.includes('-');
    const isNumeric = !isUuid && !isNaN(projectId);
    const targetId = isNumeric ? parseInt(projectId) : projectId;

    log(`[Projects] Target ID: ${targetId} (Type: ${typeof targetId}, isNumeric: ${isNumeric}, isUuid: ${isUuid})`);

    // 2. Construct the primary query
    // Since we unified guest IDs in the migration, eq('user_id', userId) is sufficient 
    // to block cross-guest access.
    let queryBuilder = userDb.from('projects').delete().eq('id', targetId).eq('user_id', userId);

    const { data, error, count } = await queryBuilder.select();
    
    if (error) {
      log(`[Projects] Delete error for ID ${projectId}: ${error.message} (${error.code})`, 'error');
      if (error.code === '22P02') {
         return res.status(400).json({ error: 'ID 형식이 올바르지 않습니다.', details: error.message });
      }
      throw error;
    }

    log(`[Projects] Delete result: ${count || 0} rows removed.`);
    
    // 3. Fallback: If no rows deleted, maybe the ID type was misinterpreted
    if (!count || count === 0) {
      log(`[Projects] No rows deleted for ${targetId}. Trying opposite type fallback...`);
      const fallbackId = isNumeric ? projectId.toString() : (parseInt(projectId) || null);
      
      if (fallbackId !== null && fallbackId !== targetId) {
        const { count: count2 } = await userDb.from('projects').delete().eq('id', fallbackId).eq('user_id', userId).select();
        if (count2 > 0) {
           log(`[Projects] Fallback delete success for ${fallbackId}.`);
           return res.json({ success: true, count: count2 });
        }
      }
      
      log(`[Projects] FINAL NOTICE: No project found to delete for ID: ${projectId}`);
      return res.json({ success: true, message: '삭제할 프로젝트를 찾을 수 없거나 권한이 없습니다.' });
    }

    res.json({ success: true, count });
  } catch (err) {
    log(`[Projects] Critical error during deletion: ${err.message}`, 'error');
    res.status(500).json({ error: err.message });
  }
});

/* --- AI PROXY API --- */
router.post('/generate', async (req, res) => {
  try {
    // 1. JWT 토큰이 있으면 사용자 확인 (옵션)
    const authHeader = req.headers['authorization'];
    const guestFingerprint = req.headers['x-guest-fingerprint'];
    let supabaseUser = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        supabaseUser = user;
      }
    } else if (guestFingerprint) {
      // Create a virtual user object for guest credit tracking
      supabaseUser = { id: guestFingerprint, isGuest: true, fingerprint: guestFingerprint };
    }

    if (supabaseUser) {
      // --- COMMERCIALIZATION: Credit Check ---
      const profile = await syncProfile(supabaseUser);
      if (profile && profile.credits <= 0 && profile.plan === 'Free') {
        return res.status(403).json({ 
          error: '크레딧이 부족합니다.', 
          details: '프로 요금제로 업그레이드하거나 크레딧을 충전해 주세요.' 
        });
      }
    }

    // 2. 사용할 API 키 결정: 헤더 우선 -> env
    const userApiKey = req.headers['x-user-api-key'];
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const config = await getSystemConfig();
    const { type, content } = req.body;
    console.log(`[AI Proxy] Type: ${type}, Tokens: ${content.maxTokens || 'default'}`);

    const anthropic = new Anthropic({ apiKey });
    
    // === MODEL SELECTION LOGIC ===
    // Planning-type tasks use the fast/cheap planningModel
    // Script/production-type tasks use the powerful productionModel
    const SCRIPT_TYPES = ['script', 'prod']; // prod = casting + budget = production quality
    const isHeavyTask = SCRIPT_TYPES.includes(type);
    let modelId = isHeavyTask
      ? (config.productionModel || 'claude-sonnet-4-6')
      : (config.planningModel  || 'claude-haiku-4-5');
    
    // === MODEL ALIAS MAP ===
    // Maps admin UI aliases (human-readable) to the real Anthropic API IDs.
    // VERIFIED against https://docs.anthropic.com/en/docs/about-claude/models (2026-03-31)
    const modelMap = {
      // -- Claude 4 series (Current Generation) --
      'claude-haiku-4-5':  'claude-haiku-4-5',      // Real API ID - fast & cheap
      'claude-sonnet-4-6': 'claude-sonnet-4-6',      // Real API ID - recommended  
      'claude-opus-4-6':   'claude-opus-4-6',        // Real API ID - most capable
      // -- Claude 3.5 series (Legacy, kept for compatibility) --
      'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022', // pass-through
      'claude-3-5-sonnet-latest':  'claude-3-5-sonnet-latest',  // pass-through
      'claude-3-5-sonnet-20241022':'claude-3-5-sonnet-20241022',// pass-through
      'claude-3-opus-latest':      'claude-3-opus-latest',      // pass-through
      // -- Old aliases that were pointing to wrong IDs (now corrected) --
      'claude-3-5-haiku-latest':  'claude-haiku-4-5',  // Upgrade old haiku alias to 4.5
    };
    
    if (modelMap[modelId]) {
      modelId = modelMap[modelId];
    } else {
      // Unknown model string: fall back to a safe, confirmed-working model
      log(`[AI Proxy] ⚠️ Unknown model ID '${modelId}' - falling back to claude-sonnet-4-6`);
      modelId = 'claude-sonnet-4-6';
    }
    
    log(`[AI Proxy] Task: '${type}' (${isHeavyTask ? 'Heavy' : 'Light'}) → Model: ${modelId}`);
    const startTime = Date.now();

    // Using Admin Configured System Prompt
    // Default to a professional Korean Drama writer persona if nothing is set
    const baseSystemPrompt = config.systemPrompt || "당신은 세계적인 K-드라마 전문 작가입니다. 창의적이고 매력적인 캐릭터와 대본을 작성하는 데 특화되어 있습니다.";

    const systemPrompt = content.systemPrompt || baseSystemPrompt;
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
    
    // Robust JSON extraction
    let clean = raw;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    } else {
      clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    }
    
    try {
      const parsed = JSON.parse(clean);

      // --- COMMERCIALIZATION: Deduct Credit (Safety First) ---
      if (supabaseUser) {
        const profileId = supabaseUser.isGuest ? supabaseUser.fingerprint : supabaseUser.id;
        const { data: latestProfile, error: profErr } = await serviceSupabase
          .from('user_profiles')
          .select('credits, plan')
          .eq('id', profileId)
          .single();

        if (!profErr && latestProfile) {
          const currentCredits = latestProfile.credits || 0;
          if (currentCredits <= 0 && latestProfile.plan === 'Free') {
             return res.status(403).json({ error: '크레딧이 부족합니다.' });
          }

          const newCredits = Math.max(0, currentCredits - 1);
          await serviceSupabase
            .from('user_profiles')
            .update({ credits: newCredits, updated_at: new Date().toISOString() })
            .eq('id', profileId);
          
          log(`[AI Proxy] Credit deducted for ${supabaseUser.email || 'Guest'}. New balance: ${newCredits}`);
        }
      }

      res.json(parsed);
    } catch (parseError) {
      // JSON 자동 복구 시도
      log(`[AI Proxy] JSON Parse Error - 자동 복구 시도 중...`);
      try {
        let repaired = clean;
        repaired = repaired.replace(/,\s*$/, '');
        const openBraces    = (repaired.match(/\{/g) || []).length;
        const closeBraces   = (repaired.match(/\}/g) || []).length;
        const openBrackets  = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
        for (let i = 0; i < openBraces   - closeBraces;   i++) repaired += '}';
        const parsed = JSON.parse(repaired);
        log(`[AI Proxy] JSON 자동 복구 성공!`);
        res.json(parsed);
      } catch (repairError) {
        log(`[AI Proxy] JSON Parse Error: ${parseError.message}`, 'error');
        log(`[AI Proxy] Raw Response Snippet: ${raw.substring(0, 500)}...`, 'error');
        res.status(500).json({ 
          error: 'AI 응답 파싱 실패 (JSON 포맷 오류)', 
          details: parseError.message,
          raw: raw.substring(0, 1000) 
        });
      }
    }
  } catch (error) {
    log(`[AI Proxy] Execution Error: ${error.message}`, 'error');
    res.status(500).json({ 
        error: `AI 생성 중 오류: ${error.message}`, 
        details: error.stack?.split('\n')[0] 
    });
  }
});

/**
 * NEW: Episode-specific Resource Generation (Budget & PPL)
 */
router.post('/generate/episode-resources', authMiddleware, async (req, res) => {
  try {
    const { projectId, epIdx, context } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const anthropic = new Anthropic({ apiKey });
    const config = await getSystemConfig();

    log(`[Episode Resources] Generating for Project ${projectId}, Ep ${epIdx + 1}`);

    const prompt = context.userPrompt; 
    const systemPrompt = context.systemPrompt || config.systemPrompt;

    const startTime = Date.now();
    const msg = await anthropic.messages.create({
      model: config.productionModel || 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const duration = ((Date.now() - startTime)/1000).toFixed(1);
    let raw = msg.content[0].text;
    
    // JSON extraction
    let clean = raw;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) clean = jsonMatch[0];

    const parsed = JSON.parse(clean);
    log(`[Episode Resources] Success in ${duration}s`);
    
    res.json(parsed);
  } catch (error) {
    log(`[Episode Resources] Error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
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

/* --- SAMPLES API (Public) --- */
router.get('/samples', async (req, res) => {
  try {
    // Only return samples that are NOT explicitly hidden (isVisible defaults to true if missing)
    const { data, error } = await serviceSupabase
      .from('samples')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;

    // Filter in JS to support flexible JSONB visibility flag (legacy fallback)
    const filtered = data.filter(s => {
      const isVisible = s.data && s.data.isVisible !== false;
      return isVisible;
    });

    res.json(filtered);
  } catch (err) {
    console.error('[Public API] Samples Fetch Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* --- ADMIN SAMPLES API --- */
router.get('/admin/samples', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await serviceSupabase
      .from('samples')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Admin API] Samples Fetch Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/samples/batch', authMiddleware, async (req, res) => {
  try {
    const { samples } = req.body;
    if (!Array.isArray(samples)) throw new Error('Invalid samples data');

    const upsertPromises = samples.map(s => {
      const { id, title, data: sampleData, isVisible } = s;
      
      const updatedSampleData = {
        ...sampleData,
        isVisible: isVisible !== undefined ? isVisible : (sampleData.isVisible !== undefined ? sampleData.isVisible : true)
      };

      const upsertData = {
        title,
        data: updatedSampleData,
        updated_at: new Date().toISOString()
      };
      if (id) upsertData.id = id;
      
      return serviceSupabase
        .from('samples')
        .upsert(upsertData, { onConflict: 'id' });
    });

    const results = await Promise.all(upsertPromises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      console.error('[Admin API] Batch Save Errors:', errors.map(e => e.error));
      throw new Error(`Failed to update ${errors.length} samples`);
    }

    res.json({ success: true, count: samples.length });
  } catch (err) {
    console.error('[Admin API] Batch Save Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
