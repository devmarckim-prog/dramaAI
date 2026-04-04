// 1. Core Modules
const fs = require('fs');
const path = require('path');
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase, createUserClient, serviceSupabase } = require('../supabaseClient');

// 2. Constants & Helpers
const AnthropicSDK = Anthropic.Anthropic || Anthropic;
const GLOBAL_GUEST_UUID = 'e098bba0-8c4e-41c6-8149-41efd79854dc';

const logFile = path.resolve(__dirname, '../../api/server.log');
const log = (msg, level = 'info') => {
  const prefix = level === 'error' ? ' [ERROR]' : '';
  const entry = `[${new Date().toISOString()}]${prefix} ${msg}\n`;
  try {
    if (process.env.NODE_ENV !== 'production') {
      fs.appendFileSync(logFile, entry);
    }
  } catch (e) {
    // Ignore FS errors
  }
  if (level === 'error') console.error(msg);
  else console.log(msg);
};

// JSON 문자열 내부의 깨진 따옴표 처리
function sanitizeJsonString(raw) {
  if (!raw) return "";
  // 마크다운 코드블록 제거
  let clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  // JSON 블록 추출
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];
  // 제어문자 제거
  clean = clean.replace(/[\x00-\x1F\x7F]/g, ' ');
  // 후행 콤마 제거 로직 추가 (보너스)
  clean = clean.replace(/,\s*([\}\]])/g, '$1');
  return clean;
}

// 3. Global Configuration & Model Map
const modelMap = {
  // Anthropic
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  'claude-haiku-4-5-20251001': 'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-opus-4-6': 'claude-opus-4-6',
  'claude-3-5-sonnet-latest': 'claude-sonnet-4-6',
  'claude-3-5-haiku-latest': 'claude-haiku-4-5-20251001',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-6',
  'claude-3-5-haiku-20241022': 'claude-haiku-4-5-20251001',
  // Gemini
  'gemini-1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-pro': 'gemini-1.5-pro'
};

const getModelId = (alias) => modelMap[alias] || alias || 'claude-sonnet-4-6';

/**
 * Loads system configuration for AI models and prompts
 * Prioritizes Supabase Cloud DB, falls back to local JSON
 */
async function getSystemConfig() {
  const defaults = {
    planningModel: 'claude-haiku-4-5',
    productionModel: 'claude-sonnet-4-6',
    systemPrompt: "당신은 세계적인 K-드라마 전문 작가이자 제작 전문가입니다. 창의적이고 탄탄한 구성, 매력적인 캐릭터 다이얼로그를 작성하는 데 특화되어 있습니다.",
    pricingPro: 29900,
    creditsFree: 10
  };

  if (!serviceSupabase) {
    console.error('[Config] Supabase Service Client is NOT initialized. Using defaults.');
    return defaults;
  }

  try {
    const { data, error } = await serviceSupabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global')
      .single();

    if (!error && data) {
      return {
        planningModel: data.planning_model || defaults.planningModel,
        productionModel: data.production_model || defaults.productionModel,
        systemPrompt: data.system_prompt || defaults.systemPrompt,
        prompts: data.prompts || {},
        pricingPro: data.pricing_pro || defaults.pricingPro,
        creditsFree: data.credits_free || defaults.creditsFree
      };
    }
  } catch (err) {
    log(`[Config] Failed to load from Supabase: ${err.message}. Using defaults.`, 'error');
  }

  // Fallback: try local config file
  try {
    const configPath = path.join(__dirname, '../config/system.json');
    if (require('fs').existsSync(configPath)) {
      const local = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
      return { ...defaults, ...local };
    }
  } catch (e) { /* ignore */ }

  return defaults;
}

/**
 * Unified AI Calling Helper (Anthropic)
 * Declared here to avoid 'not defined' errors when callAI references it
 */
async function callUnifiedAI(params, config, anthropicClient) {
  const { prompt, system, max_tokens, modelAlias, customApiKey } = params;
  const anthropicKey = customApiKey || process.env.ANTHROPIC_API_KEY;

  const finalSystem = system || (config && config.systemPrompt) || "당신은 세계적인 K-드라마 전문 작가이자 제작 전문가입니다.";

  if (!anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
  }

  const localAnthropic = customApiKey
    ? new (Anthropic.Anthropic || Anthropic)({ apiKey: customApiKey })
    : (anthropicClient || new (Anthropic.Anthropic || Anthropic)({ apiKey: anthropicKey }));

  const modelId = modelMap[modelAlias] || modelAlias || 'claude-sonnet-4-6';
  log(`[AI-Call] Anthropic model: ${modelId}`);

  const resp = await localAnthropic.messages.create({
    model: modelId,
    max_tokens: max_tokens || 8192,
    system: finalSystem,
    messages: [{ role: 'user', content: prompt }]
  });

  return resp.content[0].text;
}

/**
 * Robust AI Calling Helper (v0.2.0)
 */
async function callAI(prompt, modelAlias, config, anthropicInstance, history = []) {
  let retryCount = 0;
  const maxRetries = 1;
  let currentPrompt = prompt;

  async function attempt() {
    try {
      // For multi-turn, we skip the system prompt if history is provided or combine?
      // Anthropic SDK handles system separately.
      const messages = [...history];
      if (currentPrompt) {
        messages.push({ role: "user", content: currentPrompt });
      }

      const raw = await callUnifiedAI({
        prompt: currentPrompt,
        system: config.systemPrompt || "당신은 세계적인 K-드라마 전문 작가이자 제작 전문가입니다. 모든 출력은 반드시 JSON 형식으로만 제공하세요.",
        modelAlias: modelAlias,
        history: history // Forward history to unified caller
      }, config, anthropicInstance);

      const text = sanitizeJsonString(raw);
      return JSON.parse(text);
    } catch (err) {
      if (retryCount < maxRetries) {
        retryCount++;
        log(`[AI-Call-Retry] Parsing failed. Retrying... Error: ${err.message}`, 'warn');
        const repairDefault = `아래 텍스트를 유효한 JSON으로 변환해줘.
규칙:
- 문자열 내부의 큰따옴표(")는 모두 삭제
- 줄바꿈은 \\n으로 변환
- JSON 외 텍스트는 모두 제거
- 반드시 완전한 JSON으로 마무리`;
        currentPrompt = (config.prompts?.JSON_REPAIR || repairDefault) + `\n\n원본:\n${raw}`;
        return await attempt();
      }
      log(`[AI-Call-Final-Error] ${err.message}`, 'error');
      throw err;
    }
  }

  return await attempt();
}

/**
 * Ensures user_profiles entry exists and returns profile
 */
async function syncProfile(user) {
  if (!user) return null;

  // Use metadata email if top-level email is missing (common in Supabase OAuth)
  const userEmail = user.email || user.user_metadata?.email;
  
  const isPrimaryEmail = userEmail && (userEmail.endsWith('@dramascript.ai') || userEmail === 'dev.marckim@gmail.com');
  const isGuestUser = user.isGuest === true || user.id === GLOBAL_GUEST_UUID;
  const guestId = user.id || GLOBAL_GUEST_UUID;
  const config = await getSystemConfig();
  const defaultCredits = config.creditsFree || 10;

  try {
    const profileId = isGuestUser ? guestId : user.id;
    const { data: profile, error } = await serviceSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      log(`[Profile Sync] Creating NEW profile for ${userEmail || (isGuestUser ? 'Guest' : 'AuthUser')}`);
      const { data: newProfile, error: insErr } = await serviceSupabase
        .from('user_profiles')
        .upsert({
          id: profileId,
          email: userEmail || (isGuestUser ? `guest-${profileId.slice(0, 8)}@dramascript.ai` : `user-${profileId.slice(0, 8)}@dramascript.ai`),
          role: isPrimaryEmail ? 'admin' : (isGuestUser ? 'guest' : 'user'),
          plan: isGuestUser ? 'Guest' : 'Free',
          credits: isGuestUser ? 999 : defaultCredits,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (insErr) {
        log(`[Profile Sync] UPSERT fail (${insErr.code}): ${insErr.message} - ${insErr.details || ''}`, 'error');
        // Fallback: return mock profile to prevent 500 if error is non-critical
        return { id: profileId, email: userEmail, role: 'user', plan: 'Free', credits: defaultCredits };
      }
      return newProfile;
    }

    // 3. Identity Recovery: If the user is fully logged in with an email, but the DB has 'guest@...', upgrade it immediately.
    if (profile && userEmail && profile.email.includes('guest@')) {
      log(`[Profile Sync] Upgrading guest identity to ${userEmail} for ${profileId}`);
      const { data: updated } = await serviceSupabase
        .from('user_profiles')
        .update({ email: userEmail, role: isPrimaryEmail ? 'admin' : 'user' })
        .eq('id', profileId)
        .select()
        .single();
      if (updated) return updated;
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

  if (!token) {
    if (guestFingerprint) {
      // If no valid token but fingerprint exists -> GUEST (Unique ID based on fingerprint)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestFingerprint);
      req.user = {
        id: isUuid ? guestFingerprint : GLOBAL_GUEST_UUID,
        fingerprint: guestFingerprint,
        isGuest: true
      };
      log(`[Auth] Authorized Guest: ${guestFingerprint.substring(0, 8)}... (ID Type: ${isUuid ? 'Unique' : 'Shared'})`);
      return next();
    }
    log(`[Auth] Rejecting: No valid token or fingerprint. Headers: auth=${!!authHeader}, guest=${!!guestFingerprint}`);
    return res.status(401).json({ error: 'No token or fingerprint provided' });
  }

  req.token = token;

  if (!supabase) {
    log('[Auth] Rejecting: Supabase client not initialized.', 'error');
    return res.status(500).json({ error: '인증 서버 설정 오류' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      log(`[Auth] Token validation failed: ${error ? error.message : 'User not found'}. Path: ${req.path}`);
      // DANGER: Do NOT fallback to guest here if they provided a token. 
      // If we fall back, a logged-in user with an expired token will unknowingly see "Guest Mode".
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    log(`[Auth] Critical check error: ${err.message}`, 'error');
    res.status(500).json({ error: 'Internal Auth Error' });
  }
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
  const isGuest = req.user.isGuest;

  if (!serviceSupabase) return res.status(500).json({ error: 'DB not initialized' });

  // Guests use serviceSupabase (bypasses RLS), auth users use their own token
  const userDb = isGuest ? serviceSupabase : createUserClient(req.token);
  let query = userDb.from('projects').select('*').eq('user_id', req.user.id);
  query = query.order('created_at', { ascending: false });

  const { data: projects, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(projects || []);
});

/**
 * GET Single Project with Episodes
 */
router.get('/projects/:id', authMiddleware, async (req, res) => {
  try {
    if (!serviceSupabase) return res.status(500).json({ error: 'DB not initialized' });
    const isGuest = req.user.isGuest;
    const userDb = isGuest ? serviceSupabase : createUserClient(req.token);
    const projectId = req.params.id;

    // 1. Fetch Project
    const { data: project, error: pErr } = await userDb
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (pErr) throw pErr;
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 2. Fetch Episodes (optional table — safe fallback)
    let episodes = [];
    try {
      const { data: epData, error: eErr } = await userDb
        .from('episodes')
        .select('*')
        .eq('project_id', projectId)
        .order('ep_num', { ascending: true });
      if (eErr) log(`[Projects] Episodes table error (may not exist): ${eErr.message}`);
      episodes = epData || [];
    } catch (epEx) {
      log(`[Projects] Episodes fetch skipped: ${epEx.message}`);
    }

    project.episodes_list = episodes;
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects', authMiddleware, async (req, res) => {
  try {
    const { id, title, genre, logline, synopsis, platform, episodes, status, pct, stepIdx, error_msg, stats } = req.body;
    
    // Alias handling for robustness (v0.23)
    const charsData = req.body.chars || req.body.characters || req.body.chars_list || [];
    const pplData = req.body.ppl || req.body.ppl_items || req.body.ppl_list || [];
    const budgetData = req.body.budget || req.body.total_budget || (stats && stats.budget) || {};
    const scriptsData = req.body.scripts || req.body.episodes_list || req.body.scripts_list || {};
    const conflictsData = req.body.conflicts || req.body.conflict_points || req.body.conflict_list || [];

    const baseInput = typeof req.body.input === 'string' ? JSON.parse(req.body.input) : (req.body.input || {});
    // Inject fingerprint into input if guest
    if (req.user.isGuest) {
      baseInput.fingerprint = req.user.fingerprint;
    }

    const mergedInput = {
      ...baseInput,
      ...(platform !== undefined && { platform }),
      ...(episodes !== undefined && { episodes }),
      ...(status !== undefined && { status }),
    };

    // Clean episodes to ensure numeric value or preserve array/object
    let epOutput = 8;
    if (episodes !== undefined && episodes !== null) {
      if (Array.isArray(episodes)) {
        epOutput = episodes; // Preserve the array!
      } else if (typeof episodes === 'number') {
        epOutput = episodes;
      } else if (typeof episodes === 'string') {
        const p = parseInt(episodes.replace(/[^0-9]/g, ''));
        if (!isNaN(p)) epOutput = p;
      } else if (typeof episodes === 'object') {
        // AI might return { val: 8 } or similar
        const firstNum = Object.values(episodes).find(v => !isNaN(parseInt(v)));
        if (firstNum !== undefined) epOutput = parseInt(firstNum);
        else epOutput = episodes; // Fallback to object itself
      }
    }

    // Build partial payload only with provided fields to avoid wiping existing data
    const payload = {
      user_id: req.user.id,
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) payload.title = title;
    if (genre !== undefined) payload.genre = genre;
    if (platform !== undefined) payload.platform = platform;
    if (logline !== undefined) payload.logline = logline;
    if (synopsis !== undefined) payload.synopsis = synopsis;
    
    // Robust assignments using Aliased data
    payload.chars = Array.isArray(charsData) ? charsData : [];
    payload.ppl = Array.isArray(pplData) ? pplData : [];
    payload.conflicts = Array.isArray(conflictsData) ? conflictsData : [];
    payload.budget = typeof budgetData === 'object' ? budgetData : {};
    payload.scripts = (typeof scriptsData === 'object' && scriptsData !== null) ? scriptsData : {};
    
    if (episodes !== undefined) payload.episodes = epOutput;
    if (status !== undefined) payload.status = status;
    if (pct !== undefined) payload.pct = pct;
    if (stepIdx !== undefined) payload.stepIdx = stepIdx;
    if (req.body.input !== undefined) payload.input = mergedInput;
    if (stats !== undefined) payload.stats = typeof stats === 'object' ? stats : {};

    // Save error message for failed generations (v0.23)
    if (error_msg !== undefined) {
      payload.error_msg = String(error_msg || '').substring(0, 1000);
    }

    // Choose Supabase client: Guests use Service Role (bypasses RLS), Users use their token
    const isGuest = !!req.user.isGuest || (typeof id === 'string' && id.startsWith('g-'));
    if (!serviceSupabase) {
      return res.status(500).json({ error: 'Database not initialized. Check SUPABASE_URL/SERVICE_ROLE_KEY.' });
    }
    const userDb = isGuest ? serviceSupabase : createUserClient(req.token);

    // 1. Ensure profile exists before project insertion (Fixes FK constraint 23503 for guests)
    await syncProfile(req.user).catch(err => log(`[Profile Sync] Critical failure: ${err.message}`, 'error'));

    let finalProject;

    if (id) {
      payload.id = String(id);
      if (!payload.user_id) payload.user_id = req.user.id;
      log(`[Projects] Upserting project ${payload.id} (pct: ${payload.pct || 0}%, Status: ${payload.status || 'unknown'})`);

      const { data, error } = await userDb.from('projects').upsert(payload, { onConflict: 'id' }).select().single();
      if (error) {
        log(`[Projects] Upsert failed (${error.code}): ${error.message} — retrying with UPDATE`, 'error');
        const { data: upData, error: upError } = await userDb.from('projects').update(payload).eq('id', payload.id).select().single();
        if (upError) throw upError;
        finalProject = upData;
      } else {
        finalProject = data;
      }
    } else {
      const prefix = req.user.id.substring(0, 5).replace(/[^a-z0-9]/gi, '');
      payload.id = (isGuest ? 'g-' : 'p-') + prefix + '-' + Date.now();
      payload.user_id = req.user.id;
      log(`[Projects] Creating new project: ${payload.id} for user: ${payload.user_id}`);
      const { data, error } = await userDb.from('projects').insert(payload).select().single();
      if (error) {
        log(`[Projects] Insert failed (${error.code}): ${error.message} - ${error.details || ''}`, 'error');
        throw error;
      }
      finalProject = data;
    }

    // Background sync profile
    syncProfile(req.user).catch(err => log(`[Sync] Failed: ${err.message}`, 'error'));

    res.json({ success: true, project: finalProject });
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

    const isAdmin = req.user.role === 'admin' || req.user.email === 'dev.marckim@gmail.com';
    const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);

    // 1. Precise ID categorization
    const isUuid = projectId.includes('-');
    const isNumeric = !isUuid && !isNaN(projectId);
    const targetId = isNumeric ? parseInt(projectId) : projectId;

    log(`[Projects] Target ID: ${targetId} (Type: ${typeof targetId}, isAdmin: ${isAdmin}, Guest: ${!!req.user.isGuest})`);

    // 2. Construct the primary query
    // ADMIN bypass ownership check; User/Guest can only delete their own projects.
    let queryBuilder = userDb.from('projects').delete().eq('id', targetId);
    
    if (!isAdmin) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

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
        let fallbackQuery = userDb.from('projects').delete().eq('id', fallbackId);
        if (!isAdmin) {
          fallbackQuery = fallbackQuery.eq('user_id', userId);
        }
        const { count: count2 } = await fallbackQuery.select();
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

/**
 * NEW: Trigger 7-step AI Generation Flow (Local Fallback + Edge Support)
 */
router.post('/generate/start', authMiddleware, async (req, res) => {
  const { projectId, input } = req.body;
  
  try {
    // 1. Fetch project to ensure input is available if not provided (Defense)
    let finalInput = input;
    if (!finalInput) {
      const { data: p } = await serviceSupabase.from('projects').select('input').eq('id', projectId).single();
      finalInput = p?.input || {};
    }
    const inputObj = typeof finalInput === 'string' ? JSON.parse(finalInput) : finalInput;

    // 2. DB 초기화 (pct: 5%에서 시작)
    await serviceSupabase
      .from('projects')
      .update({ status: 'generating', pct: 5, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    // 3. Edge Function 호출 (fire and forget - await 없음)
    const edgeUrl = `${process.env.SUPABASE_URL}/functions/v1/generate`;
    log(`[Edge] Triggering generation for ${projectId}...`);
    
    fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ projectId, input: inputObj, action: 'start' })
    }).catch(async (err) => {
      log(`[Edge] Trigger failed for ${projectId}: ${err.message}`, 'error');
      try {
        await serviceSupabase.from('projects').update({
          status: 'error',
          error_msg: `Edge Function 요청 실패: ${err.message}`,
          updated_at: new Date().toISOString()
        }).eq('id', projectId);
      } catch (dbErr) {
        log(`[Edge] DB Update Error for ${projectId}: ${dbErr.message}`, 'error');
      }
    });

    // 4. 즉시 응답 (브라우저는 폴링으로 진행상황 확인)
    res.json({ success: true, message: 'Edge Function triggered', projectId });
    
  } catch (err) {
    log(`[Generate] Start failed: ${err.message}`, 'error');
    res.status(500).json({ error: err.message });
  }
});

/**
 * v0.16 Multi-turn Scene Generation: STEP 1 - Initialize
 */
router.post('/generate/scene/init', authMiddleware, async (req, res) => {
  const { episodeId } = req.body;
  try {
    const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);
    const config = await getSystemConfig();

    // 1. Fetch Episode & Project Context
    const { data: ep, error: eErr } = await userDb.from('episodes').select('*, projects(*)').eq('id', episodeId).single();
    if (eErr || !ep) throw new Error("Episode not found");

    const project = ep.projects;
    const model = getModelId(config.productionModel);

    // 2. Build INITIAL Context Prompt (Turn 1)
    const initPrompt = (config.prompts?.SCENE_INIT || `당신은 드라마 [{title}]의 전문 작가입니다. 지금부터 {epNum}화 대본을 씬별로 작성합니다. 준비되면 '시작'이라고만 답하세요.`)
      .replace(/{title}/g, project.title)
      .replace(/{epNum}/g, ep.ep_num)
      + `\n\n[드라마 정보]\n장르: ${project.genre}\n로그라인: ${project.logline}\n줄거리 요약: ${project.synopsis?.substring(0, 500)}...\n\n[인물 정보]\n${JSON.stringify(project.chars?.slice(0, 5))}\n\n[${ep.ep_num}화 정보]\n제목: ${ep.title}\n줄거리: ${ep.story}\n씬 목록 전체: ${JSON.stringify(ep.scenes)}`;

    const anthropic = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      system: config.systemPrompt,
      messages: [{ role: "user", content: initPrompt }]
    });

    const aiMsg = response.content[0].text;
    const history = [
      { role: "user", content: initPrompt },
      { role: "assistant", content: aiMsg }
    ];

    // 3. Update Episode status
    await serviceSupabase.from('episodes').update({
      script_history: history,
      status: 'writing',
      total_scenes_count: Array.isArray(ep.scenes) ? ep.scenes.length : 0,
      current_scene_idx: 0
    }).eq('id', episodeId);

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * v0.16 Multi-turn Scene Generation: STEP 2 - Generate Next Scene
 */
router.post('/generate/scene/next', authMiddleware, async (req, res) => {
  const { episodeId, sceneIdx } = req.body;
  try {
    const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);
    const config = await getSystemConfig();

    // 1. Fetch Episode History
    const { data: ep, error: eErr } = await userDb.from('episodes').select('*').eq('id', episodeId).single();
    if (eErr || !ep) throw new Error("Episode not found");

    const history = ep.script_history || [];
    const scenes = ep.scenes || [];
    const targetScene = scenes[sceneIdx];

    if (!targetScene) throw new Error(`Scene ${sceneIdx} not found in episode map.`);

    const model = getModelId(config.productionModel);
    const scenePrompt = (config.prompts?.SCENE_NEXT || `S#{sceneNum} ({place} / {time}) 을 작성해주세요.\n내용 요약: {desc}\n\n[출력 규칙]\n- 전문적인 대본 형식 준수\n- 인물 말투 고정 (chars 정보 기반)\n- 반드시 아래 JSON 형식으로만 출력:\n{ "num": "S#{sceneNum}", "loc": "{place} / {time}", "content": "대본 내용..." }`)
      .replace(/{sceneNum}/g, targetScene.num || sceneIdx + 1)
      .replace(/{place}/g, targetScene.place)
      .replace(/{time}/g, targetScene.time)
      .replace(/{desc}/g, targetScene.desc || targetScene.content);

    const anthropic = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    // Call AI with History
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      system: config.systemPrompt + "\n[중요] 반드시 JSON 형식으로만 응답하세요.",
      messages: [...history, { role: "user", content: scenePrompt }]
    });

    const rawMsg = response.content[0].text;
    const cleanJson = sanitizeJsonString(rawMsg);
    const sceneData = JSON.parse(cleanJson);

    // 2. Update History & Script
    const updatedHistory = [...history, { role: "user", content: scenePrompt }, { role: "assistant", content: rawMsg }];
    
    // Manage token budget: If history > 10,000 chars (approx 20k tokens in some cases), compress
    if (JSON.stringify(updatedHistory).length > 20000) {
       // Simple compression: remove middle turns, keep init + last 2
       log(`[Generate-History] Compressing history for episode ${episodeId}`);
       const compressed = [updatedHistory[0], updatedHistory[1], updatedHistory[updatedHistory.length-2], updatedHistory[updatedHistory.length-1]];
       updatedHistory.splice(0, updatedHistory.length, ...compressed);
    }

    const currentScript = Array.isArray(ep.script) ? ep.script : [];
    currentScript.push(sceneData);

    const isFinal = (sceneIdx + 1) >= scenes.length;

    await serviceSupabase.from('episodes').update({
      script_history: updatedHistory,
      script: currentScript,
      current_scene_idx: sceneIdx + 1,
      status: isFinal ? 'completed' : 'writing'
    }).eq('id', episodeId);

    // 3. If Final, Clear History to save DB space
    if (isFinal) {
       log(`[Generate-History] Final scene reached. Clearing history for ${episodeId}`);
       await serviceSupabase.from('episodes').update({ script_history: [] }).eq('id', episodeId);
    }

    res.json({ success: true, scene: sceneData, isFinal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * v0.16 Multi-turn Scene Generation: STEP 3 - Summarize Episode
 */
router.post('/generate/ep-summary', authMiddleware, async (req, res) => {
  const { episodeId } = req.body;
  try {
    const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);
    const config = await getSystemConfig();
    const { data: ep } = await userDb.from('episodes').select('*').eq('id', episodeId).single();
    
    const fullScript = ep.script?.map(s => s.content).join('\n\n') || "";
    const prompt = (config.prompts?.EP_SUMMARY || `드라마 {epNum}화의 전체 대본입니다. 다음 화 집필을 위해 핵심 사건 3줄로 요약해줘.`)
      .replace(/{epNum}/g, ep.ep_num)
      + `\n\n${fullScript}`;

    const anthropic = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: getModelId(config.planningModel),
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }]
    });

    const summary = response.content[0].text;
    await serviceSupabase.from('episodes').update({ ep_summary: summary }).eq('id', episodeId);
    
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Prevents Netlify function timeouts by keeping each request short.
 */
router.post('/generate/step', authMiddleware, async (req, res) => {
  const { projectId, step, input: clientInput } = req.body;
  const config = await getSystemConfig();
  const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  log(`[Generate-Step] Project: ${projectId}, Step: ${step}`);

  try {
    // 1. Fetch current project state
    let project;
    const isGuest = String(projectId).startsWith('g-') || !isNaN(projectId);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (isGuest && (!serviceKey || !serviceKey.startsWith('sk_'))) {
      // serviceSupabase handles guest IDs as primary keys just like regular IDs
      const { data, error } = await serviceSupabase.from('projects').select('*').eq('id', projectId).single();
      if (error) throw error;
      project = data;
    } else {
      const { data, error } = await serviceSupabase.from('projects').select('*').eq('id', projectId).single();
      if (error) throw error;
      project = data;
    }
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const inputData = project.input || clientInput || {};

    const updateProject = async (payload) => {
      // 1. FIELD ALIAS MAPPING (Defense against mixed AI response formats)
      const aliasMap = {
        'characters': 'chars',
        'episodes_list': 'scripts',
        'episodesList': 'scripts',
        'budget_data': 'budget',
        'budgetData': 'budget',
        'production_data': 'stats',
        'productionData': 'stats'
      };
      
      const normalizedPayload = { ...payload };
      Object.keys(aliasMap).forEach(alias => {
        if (normalizedPayload[alias] !== undefined && normalizedPayload[aliasMap[alias]] === undefined) {
          normalizedPayload[aliasMap[alias]] = normalizedPayload[alias];
          delete normalizedPayload[alias];
        }
      });

      normalizedPayload.updated_at = new Date().toISOString();
      log(`[Update] Project ${projectId}: ${JSON.stringify(normalizedPayload).substring(0, 100)}...`);
      
      // Use serviceSupabase for all updates to bypass RLS and ensure consistency
      const { error: updErr } = await serviceSupabase.from('projects').update(normalizedPayload).eq('id', projectId);
      if (updErr) {
        log(`[Update-Supabase] Error on ${projectId}: ${updErr.message}`, 'error');
        throw updErr;
      }
    };

    let resultData = {};

    // Guard: serviceSupabase must be available for all DB updates
    if (!serviceSupabase) throw new Error('Database not initialized. Cannot proceed with generation.');

    switch (parseInt(step)) {
      case 0: { // Phase 1: Logline & Genre (20%)
        const loglinePrompt = (config.prompts?.LOGLINE_GEN || `드라마 기획안의 핵심 컨셉을 작성해줘. 로그라인 시드: {seed}. 장르: {genre}. 다음 JSON 형식으로 응답해: {"title": "제목", "genre": "장르", "logline": "한 줄 로그라인"}`)
          .replace(/{seed}/g, inputData.logline || inputData.topic || '자유 주제')
          .replace(/{genre}/g, inputData.genre || '드라마');
        resultData = await callAI(loglinePrompt, config.productionModel, config, anthropicClient);
        await updateProject({ ...resultData, pct: 20, stepIdx: 1 });
        break;
      }

      case 1: { // Phase 2: Characters setup (35%)
        const title1 = project.title || inputData.title || '드라마';
        const logline1 = project.logline || inputData.logline || '';
        const charPrompt1 = (config.prompts?.CHAR_BASIC || `드라마 "{title}" (로그라인: {logline})의 주요 인물 3명의 기초 설정을 작성해줘. JSON 형식: {"chars": [{"name": "...", "personality": "...", "age": "...", "role": "..."}]}`)
          .replace(/{title}/g, title1)
          .replace(/{logline}/g, logline1);
        resultData = await callAI(charPrompt1, config.planningModel, config, anthropicClient);
        await updateProject({ chars: Array.isArray(resultData.chars) ? resultData.chars : [], pct: 35, stepIdx: 2 });
        break;
      }

      case 2: { // Phase 3: Synopsis (45%)
        const title2 = project.title || inputData.title || '드라마';
        const logline2 = project.logline || inputData.logline || '';
        const synopPrompt = (config.prompts?.SYNOPSIS_GEN || `제목: {title}. 로그라인: {logline}. 이 드라마의 전체 줄거리(시놉시스)를 1000자 내외로 상세히 작성해줘. JSON 형식: {"synopsis": "내용"}`)
          .replace(/{title}/g, title2)
          .replace(/{logline}/g, logline2);
        resultData = await callAI(synopPrompt, config.productionModel, config, anthropicClient);
        await updateProject({ synopsis: resultData.synopsis || '', pct: 45, stepIdx: 3 });
        break;
      }

      case 3: { // Phase 4: Conflicts (60%)
        const title3 = project.title || inputData.title || '드라마';
        const conflictPrompt = (config.prompts?.CONFLICT_GEN || `드라마 "{title}"의 주요 갈등 구조를 분석해줘. 내적 갈등, 대인 갈등, 사회적/환경적 갈등을 포함해. JSON 형식: {"conflicts": [{"type": "내적/대인/사회", "character": "인물명", "desc": "갈등 내용"}]}`)
          .replace(/{title}/g, title3);
        resultData = await callAI(conflictPrompt, config.productionModel, config, anthropicClient);
        await updateProject({ conflicts: Array.isArray(resultData.conflicts) ? resultData.conflicts : [], pct: 60, stepIdx: 4 });
        break;
      }

      case 4: { // Phase 5: Characters Deep (75%)
        const title4 = project.title || inputData.title || '드라마';
        const existingChars = Array.isArray(project.chars) && project.chars.length > 0
          ? JSON.stringify(project.chars)
          : '(아직 미설정)';
        const charPrompt = (config.prompts?.CHAR_DEEP || `드라마 "{title}"의 주요 인물 3명을 상세 설정해줘. 기존 설정: {existingChars}. 이름, 성격, 나이, 역할, 외모를 포함해. JSON 형식: {"chars": [{"name": "...", "personality": "...", "age": "...", "role": "...", "looks": "..."}]}`)
          .replace(/{title}/g, title4)
          .replace(/{existingChars}/g, existingChars);
        resultData = await callAI(charPrompt, config.productionModel, config, anthropicClient);
        await updateProject({ chars: Array.isArray(resultData.chars) ? resultData.chars : (project.chars || []), pct: 75, stepIdx: 5 });
        break;
      }

      case 5: { // Phase 6: Episodes (90%)
        const title5 = project.title || inputData.title || '드라마';
        const epCount = (typeof project.episodes === 'number') ? project.episodes : (parseInt(inputData.episodes) || 8);
        const epPrompt = (config.prompts?.EP_PLAN || `드라마 "{title}"의 전 {epCount}회차 구성을 JSON으로 작성해줘. 회차별 제목과 요약을 포함해. JSON 형식: {"episodes": [{"ep": 1, "title": "...", "summary": "..."}]}`)
          .replace(/{title}/g, title5)
          .replace(/{epCount}/g, epCount);
        resultData = await callAI(epPrompt, config.planningModel, config, anthropicClient);
        const epArray = Array.isArray(resultData.episodes) ? resultData.episodes : [];
        await updateProject({ scripts: epArray, pct: 90, stepIdx: 6 });
        break;
      }

      case 6: { // Finalize (100%)
        await updateProject({ pct: 100, status: 'done', stepIdx: 7 });
        resultData = { success: true, status: 'done' };
        break;
      }

      default:
        throw new Error(`Invalid generation step: ${step}`);
    }

    res.json({ success: true, step, data: resultData });

  } catch (err) {
    log(`[Generate-Step] Error: ${err.message}`, 'error');
    // Standardize error reporting via serviceSupabase
    await serviceSupabase.from('projects').update({ status: 'error', error_msg: err.message }).eq('id', projectId);
    res.status(500).json({ error: err.message });
  }
 });
 
 
 // callUnifiedAI is now defined above callAI (moved to L110 area to fix const hoisting issue)
 
 /**
 * runLocalGeneration was removed in v0.31 as all generation is now offloaded to Supabase Edge Functions.
 */


/**
 * AI Proxy for single-step tasks (legacy/compatibility)
 */
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
      : (config.planningModel || 'claude-haiku-4-5');

    // === MODEL ALIAS MAP ===
    // Maps admin UI aliases (human-readable) to the real Anthropic API IDs.
    // VERIFIED against https://docs.anthropic.com/en/docs/about-claude/models (2026-03-31)
    const modelMap = {
      // -- Claude 4 series (Current Generation) --
      'claude-haiku-4-5': 'claude-haiku-4-5-20251001', // Mapped as requested
      'claude-sonnet-4-6': 'claude-sonnet-4-6',          // Mapped as requested
      'claude-opus-4-6': 'claude-opus-4-6',            // Mapped as requested
      // -- Claude 3.5 series (Legacy) --
      'claude-3-5-haiku-20241022': 'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
      'claude-3-opus-latest': 'claude-3-opus-latest',
      'claude-3-5-haiku-latest': 'claude-3-5-sonnet-20241022',
    };

    if (modelMap[modelId]) {
      modelId = modelMap[modelId];
    } else {
      // Unknown model string: fall back to a safe, confirmed-working model
      log(`[AI Proxy] ⚠️ Unknown model ID '${modelId}' - falling back to claude-3-5-sonnet-20241022`);
      modelId = 'claude-3-5-sonnet-20241022';
    }

    log(`[AI Proxy] Task: '${type}' (${isHeavyTask ? 'Heavy' : 'Light'}) → Model: ${modelId}`);
    const startTime = Date.now();

    // 3. Prepare Prompts
    const systemPrompt = content.systemPrompt || config.systemPrompt;
    const userPrompt = content.userPrompt || (typeof content === 'string' ? content : JSON.stringify(content));

    try {
      // 4. Call Unified AI (Anthropic -> Gemini Fallback)
      const raw = await callUnifiedAI({
        prompt: userPrompt,
        system: systemPrompt,
        max_tokens: Math.min(content.maxTokens || 8192, 8192),
        modelAlias: modelId,
        customApiKey: userApiKey
      }, config, anthropic);
      const elapsed = Date.now() - startTime;
      log(`[AI Proxy] ✅ Request SUCCESS | Model: ${modelId} | Duration: ${elapsed}ms`);

      // 5. Robust JSON Extraction
      let clean = raw;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        clean = jsonMatch[0];
      } else {
        clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      }

      // 6. Credit Deduction & Response
      try {
        const parsed = JSON.parse(clean);

        if (supabaseUser) {
          const profileId = supabaseUser.isGuest ? (supabaseUser.fingerprint || supabaseUser.id) : supabaseUser.id;
          const { data: latestProfile, error: profErr } = await serviceSupabase
            .from('user_profiles')
            .select('credits, plan')
            .eq('id', profileId)
            .single();

          if (!profErr && latestProfile) {
            const currentCredits = latestProfile.credits || 0;
            if (currentCredits > 0 || latestProfile.plan !== 'Free') {
              const newCredits = Math.max(0, currentCredits - 1);
              await serviceSupabase
                .from('user_profiles')
                .update({ credits: newCredits, updated_at: new Date().toISOString() })
                .eq('id', profileId);
              log(`[AI Proxy] Credit deducted for ${supabaseUser.email || 'Guest'}. New balance: ${newCredits}`);
            }
          }
        }

        res.json(parsed);
      } catch (parseError) {
        log(`[AI Proxy] JSON Parse Error - 자동 복구 시도 중...`);
        try {
          let repaired = clean;
          repaired = repaired.replace(/,\s*$/, '');
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;

          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';

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
    } catch (err) {
      const elapsed = Date.now() - startTime;
      log(`[AI Proxy] ❌ Request FAILED | Duration: ${elapsed}ms | Error: ${err.message}`, 'error');

      if (err.status) {
        return res.status(err.status).json({
          error: `AI Provider Error (${err.status})`,
          details: err.message,
          type: err.type
        });
      }
      res.status(500).json({ error: 'AI 생성 중 예기치 않은 오류가 발생했습니다.', details: err.message });
    }
  } catch (err) {
    log(`[AI Proxy] Outer Catch: ${err.message}`, 'error');
    res.status(500).json({ error: err.message });
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

module.exports = router;
