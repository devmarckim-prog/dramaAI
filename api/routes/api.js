const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase, createUserClient, serviceSupabase } = require('../supabaseClient');
const { Pool } = require('pg');

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

// Create POOL for direct PostgreSQL access (to bypass RLS for guest/background tasks)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.query('SELECT NOW()').catch(err => log(`[DB Pool] CRITICAL: Connection failed: ${err.message}`, 'error'));

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
  const isGuest = req.user.isGuest;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (isGuest && (!serviceKey || serviceKey.startsWith('sb_publishable'))) {
    try {
      log(`[Projects] GET /projects -> PG Fallback for Guest: ${req.user.id}`);
      const { rows } = await pool.query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
      return res.json(rows);
    } catch (pgErr) {
      log(`[Projects] GET /projects -> PG Fallback Failed: ${pgErr.message}`, 'error');
      // Continue to standard fallback if needed or return empty
      return res.json([]);
    }
  }

  const userDb = isGuest ? serviceSupabase : createUserClient(req.token);
  let query = userDb.from('projects').select('*').eq('user_id', req.user.id);
  query = query.order('created_at', { ascending: false });

  const { data: projects, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(projects);
});

/**
 * GET Single Project with Episodes
 */
router.get('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const userDb = req.user.isGuest ? serviceSupabase : createUserClient(req.token);
    const projectId = req.params.id;

    // 1. Fetch Project
    let project;
    const isGuest = req.user.isGuest;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (isGuest && (!serviceKey || serviceKey.startsWith('sb_publishable'))) {
      log(`[Projects] GET /projects/${projectId} -> PG Fallback for Guest`);
      const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      project = rows[0];
    } else {
      const { data, error: pErr } = await userDb
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (pErr) throw pErr;
      project = data;
    }

    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 2. Fetch Episodes
    let episodes = [];
    if (isGuest && (!serviceKey || serviceKey.startsWith('sb_publishable'))) {
      const { rows: epRows } = await pool.query('SELECT * FROM episodes WHERE project_id = $1 ORDER BY ep_num ASC', [projectId]);
      episodes = epRows;
    } else {
      const { data: epData, error: eErr } = await userDb
        .from('episodes')
        .select('*')
        .eq('project_id', projectId)
        .order('ep_num', { ascending: true });
      if (eErr) log(`[Projects] Error fetching episodes: ${eErr.message}`, 'error');
      episodes = epData || [];
    }

    // Merge episodes into project object for the frontend
    project.episodes_list = episodes;
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects', authMiddleware, async (req, res) => {
  try {
    const { id, title, genre, logline, synopsis, chars, ppl, budget, input, platform, episodes, episodes_count, status, pct, stepIdx, error_msg, scripts, conflicts, stats } = req.body;

    const baseInput = typeof input === 'string' ? JSON.parse(input) : (input || {});
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
    if (chars !== undefined) payload.chars = Array.isArray(chars) ? chars : [];
    if (episodes !== undefined) payload.episodes = epOutput;
    if (ppl !== undefined) payload.ppl = Array.isArray(ppl) ? ppl : [];
    if (budget !== undefined) payload.budget = typeof budget === 'object' ? budget : {};
    if (status !== undefined) payload.status = status;
    if (pct !== undefined) payload.pct = pct;
    if (stepIdx !== undefined) payload.stepIdx = stepIdx;
    if (input !== undefined) payload.input = mergedInput;
    if (conflicts !== undefined) payload.conflicts = Array.isArray(conflicts) ? conflicts : [];
    if (stats !== undefined) payload.stats = typeof stats === 'object' ? stats : {};
    if (stats !== undefined) payload.stats = typeof stats === 'object' ? stats : {};

    // Save scripts if provided (episode scripts storage)
    if (scripts !== undefined) {
      payload.scripts = (typeof scripts === 'object' && scripts !== null) ? scripts : {};
    }
    // Save error message for failed generations
    if (error_msg !== undefined) {
      payload.error_msg = String(error_msg || '').substring(0, 1000);
    }

    // Choose Supabase client: Guests use Service Role (to handle specific IDs), Users use their token (RLS)
    const isGuest = !!req.user.isGuest || (typeof id === 'string' && id.startsWith('g-'));
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    let finalProject;

    // IF GUEST AND SERVICE KEY MISSING -> USE DIRECT PG FALLBACK
    if (isGuest && (!serviceKey || serviceKey.startsWith('sb_publishable'))) {
      log(`[Projects] Using PG Fallback for Guest Project: ${id || 'NEW'}`);
      
      const cols = {
        user_id: req.user.id,
        title: title || '드라마 프로젝트',
        genre, platform, logline, synopsis,
        chars: JSON.stringify(Array.isArray(chars) ? chars : []),
        episodes: JSON.stringify(epOutput),
        ppl: JSON.stringify(Array.isArray(ppl) ? ppl : []),
        budget: JSON.stringify(typeof budget === 'object' ? budget : {}),
        status: status || 'generating',
        pct: pct || 0,
        step_idx: stepIdx || 0,
        input: JSON.stringify(mergedInput),
        conflicts: JSON.stringify(Array.isArray(conflicts) ? conflicts : []),
        stats: JSON.stringify(typeof stats === 'object' ? stats : {}),
        scripts: JSON.stringify(typeof scripts === 'object' ? scripts : {}),
        error_msg: String(error_msg || ''),
        updated_at: new Date().toISOString()
      };

      if (!id) {
        const prefix = req.user.id.substring(0, 5).replace(/[^a-z0-9]/gi, '');
        cols.id = 'g-' + prefix + '-' + Date.now();
      } else {
        cols.id = id;
      }

      const keys = Object.keys(cols);
      const vals = Object.values(cols);
      
      // Ensure keys are mapped to snake_case for PostgreSQL
      const dbKeys = keys.map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
      const quotedKeys = dbKeys.map(k => `"${k}"`).join(', ');
      const markers = keys.map((_, i) => `$${i + 1}`).join(', ');
      const updates = dbKeys.map((k, i) => `"${k}" = EXCLUDED."${k}"`).join(', ');

      const query = `
        INSERT INTO projects (${quotedKeys})
        VALUES (${markers})
        ON CONFLICT (id) DO UPDATE SET ${updates}
        RETURNING *;
      `;

      try {
        const resPg = await pool.query(query, vals);
        finalProject = resPg.rows[0];
        log(`[Projects] PG Fallback Success: ${finalProject.id}`);
      } catch (pgErr) {
        log(`[Projects] PG Fallback Failed: ${pgErr.message}`, 'error');
        throw pgErr;
      }
    } else {
      // STANDARD SUPABASE FLOW (for Users or when Service Key exists)
      const userDb = isGuest ? serviceSupabase : createUserClient(req.token);
      
      if (id) {
        payload.id = String(id);
        log(`[Projects] Saving project ${payload.id} (pct: ${payload.pct || 0}%, Status: ${payload.status || 'unknown'})`);
        
        // Ensure user_id is set correctly for the upsert
        if (!payload.user_id) payload.user_id = req.user.id;

        const { data, error } = await userDb.from('projects').upsert(payload, { onConflict: 'id' }).select().single();
        if (error) {
          log(`[Projects] Upsert failed for ${payload.id}: ${error.message} (Code: ${error.code})`, 'error');
          const { data: upData, error: upError } = await userDb.from('projects').update(payload).eq('id', payload.id).select().single();
          if (upError) throw upError;
          finalProject = upData;
        } else {
          finalProject = data;
        }
      } else {
        const prefix = req.user.id.substring(0, 5).replace(/[^a-z0-9]/gi, '');
        payload.id = 'p-' + prefix + '-' + Date.now();
        payload.user_id = req.user.id;
        log(`[Projects] Creating new project: ${payload.id} for user: ${payload.user_id}`);
        const { data, error } = await userDb.from('projects').insert(payload).select().single();
        if (error) throw error;
        finalProject = data;
      }
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
  const { projectId, options = {} } = req.body;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  log(`[Generate] Request to start generation for ${projectId} (Action: ${options.action || 'full'})`);

  // 1. Initialize project status and pct
  try {
    const isGuest = String(projectId).startsWith('g-') || !isNaN(projectId);
    const updatePayload = { status: 'generating', pct: 5, updated_at: new Date().toISOString() };
    
    if (isGuest && (!serviceKey || serviceKey.startsWith('sb_publishable'))) {
      await pool.query('UPDATE projects SET status = $1, pct = $2, updated_at = $3 WHERE id = $4', 
        [updatePayload.status, updatePayload.pct, updatePayload.updated_at, projectId]);
    } else {
      await serviceSupabase.from('projects').update(updatePayload).eq('id', projectId);
    }

    log(`[Generate] Project ${projectId} initialized for stepped generation.`);
    res.json({ success: true, message: 'Initialization complete. Ready for steps.', projectId });
  } catch (err) {
    log(`[Generate] Initialization failed: ${err.message}`, 'error');
    res.status(500).json({ error: err.message });
  }
});

/**
 * STEP-BY-STEP GENERATION ROUTE
 * Called by frontend to perform ONE specific AI generation phase.
 * Prevents Netlify function timeouts by keeping each request short.
 */
router.post('/generate/step', authMiddleware, async (req, res) => {
  const { projectId, step, input: clientInput } = req.body;
  const config = await getSystemConfig();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  log(`[Generate-Step] Project: ${projectId}, Step: ${step}`);

  try {
    // 1. Fetch current project state
    let project;
    const isGuest = String(projectId).startsWith('g-') || !isNaN(projectId);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (isGuest && (!serviceKey || serviceKey.startsWith('sb_publishable'))) {
      const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      project = rows[0];
    } else {
      const { data, error } = await serviceSupabase.from('projects').select('*').eq('id', projectId).single();
      if (error) throw error;
      project = data;
    }
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const inputData = project.input || clientInput || {};
    const modelMap = {
      'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
      'claude-sonnet-4-6': 'claude-sonnet-4-6',
      'claude-opus-4-6': 'claude-opus-4-6',
      'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022'
    };
    const getModelId = (alias) => modelMap[alias] || alias || 'claude-3-5-sonnet-20241022';

    const updateProject = async (payload) => {
      payload.updated_at = new Date().toISOString();
      if (isGuest) {
        const keys = Object.keys(payload);
        const vals = Object.values(payload).map(v => (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v);
        const dbKeys = keys.map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
        const sets = dbKeys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
        await pool.query(`UPDATE projects SET ${sets} WHERE id = $1`, [projectId, ...vals]);
      } else {
        await serviceSupabase.from('projects').update(payload).eq('id', projectId);
      }
    };

    let resultData = {};

    switch (parseInt(step)) {
      case 0: // Phase 1: Logline & Genre (15%)
        const loglinePrompt = `드라마 기획안의 핵심 컨셉을 작성해줘. 주제: ${inputData.topic || '자유 주제'}. 장르: ${inputData.genre || '드라마'}. 다음 JSON 형식으로 응답해: {"title": "제목", "genre": "장르", "logline": "한 줄 로그라인"}`;
        const loglineResp = await anthropic.messages.create({
          model: getModelId(config.productionModel),
          max_tokens: 1024,
          system: config.systemPrompt,
          messages: [{ role: 'user', content: loglinePrompt }]
        });
        resultData = JSON.parse(loglineResp.content[0].text.match(/\{[\s\S]*\}/)[0]);
        await updateProject({ ...resultData, pct: 20 });
        break;

      case 1: // Phase 2: Synopsis (40%)
        const synopPrompt = `제목: ${project.title}. 로그라인: ${project.logline}. 이 드라마의 전체 줄거리(시놉시스)를 1000자 내외로 상세히 작성해줘. JSON 형식: {"synopsis": "내용"}`;
        const synopResp = await anthropic.messages.create({
          model: getModelId(config.productionModel),
          max_tokens: 2048,
          system: config.systemPrompt,
          messages: [{ role: 'user', content: synopPrompt }]
        });
        resultData = JSON.parse(synopResp.content[0].text.match(/\{[\s\S]*\}/)[0]);
        await updateProject({ synopsis: resultData.synopsis, pct: 45 });
        break;

      case 2: // Phase 3: Characters (65%)
        const charPrompt = `드라마 "${project.title}"의 주요 인물 3명을 설정해줘. 이름, 성격, 나이, 역할을 포함해. JSON 형식: {"chars": [{"name": "...", "personality": "...", "age": "...", "role": "..."}]}`;
        const charResp = await anthropic.messages.create({
          model: getModelId(config.productionModel),
          max_tokens: 2048,
          system: config.systemPrompt,
          messages: [{ role: 'user', content: charPrompt }]
        });
        resultData = JSON.parse(charResp.content[0].text.match(/\{[\s\S]*\}/)[0]);
        await updateProject({ chars: resultData.chars, pct: 70 });
        break;

      case 3: // Phase 4: Episodes (90%)
        const epCount = project.episodes || 8;
        const epPrompt = `드라마 "${project.title}"의 전 ${epCount}회차 구성을 JSON으로 작성해줘. 회차별 제목과 요약을 포함해. JSON 형식: {"episodes": [{"ep": 1, "title": "...", "summary": "..."}]}`;
        const epResp = await anthropic.messages.create({
          model: getModelId(config.planningModel),
          max_tokens: 4096,
          system: config.systemPrompt,
          messages: [{ role: 'user', content: epPrompt }]
        });
        resultData = JSON.parse(epResp.content[0].text.match(/\{[\s\S]*\}/)[0]);
        await updateProject({ scripts: resultData.episodes, pct: 90 });
        break;

      case 4: // Finalize (100%)
        await updateProject({ pct: 100, status: 'done' });
        resultData = { success: true, status: 'done' };
        break;

      default:
        throw new Error('Invalid generation step');
    }

    res.json({ success: true, step, data: resultData });

  } catch (err) {
    log(`[Generate-Step] Error: ${err.message}`, 'error');
    const isGuest = String(projectId).startsWith('g-') || !isNaN(projectId);
    if (isGuest) {
      await pool.query('UPDATE projects SET status = $1, error_msg = $2 WHERE id = $3', ['error', err.message, projectId]);
    } else {
      await serviceSupabase.from('projects').update({ status: 'error', error_msg: err.message }).eq('id', projectId);
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * Local implementation of the 7-step generation flow
 * Ported from Supabase Edge Function (supabase/functions/generate/index.ts)
 */
async function runLocalGeneration(project, options) {
  const { id: projectId } = project;
  const config = await getSystemConfig();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const inputData = typeof project.input === 'string' ? JSON.parse(project.input) : (project.input || {});
  
  // Decide which database client to use for updates
  const isGuest = String(projectId).startsWith('g-') || !isNaN(projectId);

  const updateProject = async (payload) => {
    log(`[Update] Project ${projectId}: ${JSON.stringify(payload).substring(0, 100)}...`);
    
    if (isGuest) {
      // Local PG update
      const keys = Object.keys(payload);
      const vals = Object.values(payload).map(v => 
        (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
      );
      const dbKeys = keys.map(k => k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
      const sets = dbKeys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const query = `UPDATE projects SET ${sets}, updated_at = NOW() WHERE id = $1`;
      await pool.query(query, [projectId, ...vals]);
    } else {
      // Supabase update
      const { error } = await serviceSupabase
        .from('projects')
        .update(payload)
        .eq('id', projectId);
      if (error) {
        log(`[Update] Supabase Error for ${projectId}: ${error.message}`, 'error');
        throw error;
      }
    }
  };

  const modelMap = {
    'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
    'claude-sonnet-4-6': 'claude-sonnet-4-6',
    'claude-opus-4-6': 'claude-opus-4-6',
    'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-latest',
    'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
    'claude-3-opus-latest': 'claude-3-opus-latest',
    'claude-3-5-haiku-latest': 'claude-3-5-haiku-20241022',
  };

  const getModelId = (alias) => modelMap[alias] || alias || 'claude-3-5-sonnet-20241022';

  try {
    log(`[AI-Gen] 🚀 Starting real generation for ${projectId}...`);
    
    // Phase 1: Logline & Genre (15%)
    await updateProject({ pct: 5, status: 'generating' });
    const loglinePrompt = `드라마 기획안의 핵심 컨셉을 작성해줘. 주제: ${inputData.topic || '자유 주제'}. 장르: ${inputData.genre || '드라마'}. 다음 JSON 형식으로 응답해: {"title": "제목", "genre": "장르", "logline": "한 줄 로그라인"}`;
    const loglineResp = await anthropic.messages.create({
      model: getModelId(config.productionModel),
      max_tokens: 1024,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: loglinePrompt }]
    });
    const loglineData = JSON.parse(loglineResp.content[0].text.match(/\{[\s\S]*\}/)[0]);
    await updateProject({ ...loglineData, pct: 20 });

    // Phase 2: Synopsis (40%)
    await updateProject({ status: 'generating', pct: 30 });
    const synopPrompt = `제목: ${loglineData.title}. 로그라인: ${loglineData.logline}. 이 드라마의 전체 줄거리(시놉시스)를 1000자 내외로 상세히 작성해줘. JSON 형식: {"synopsis": "내용"}`;
    const synopResp = await anthropic.messages.create({
      model: getModelId(config.productionModel),
      max_tokens: 2048,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: synopPrompt }]
    });
    const synopData = JSON.parse(synopResp.content[0].text.match(/\{[\s\S]*\}/)[0]);
    await updateProject({ synopsis: synopData.synopsis, pct: 45 });

    // Phase 3: Characters (65%)
    await updateProject({ status: 'generating', pct: 55 });
    const charPrompt = `드라마 "${loglineData.title}"의 주요 인물 3명을 설정해줘. 이름, 성격, 나이, 역할을 포함해. JSON 형식: {"chars": [{"name": "...", "personality": "...", "age": "...", "role": "..."}]}`;
    const charResp = await anthropic.messages.create({
      model: getModelId(config.productionModel),
      max_tokens: 2048,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: charPrompt }]
    });
    const charData = JSON.parse(charResp.content[0].text.match(/\{[\s\S]*\}/)[0]);
    await updateProject({ chars: charData.chars, pct: 70 });

    // Phase 4: Episodes (90%)
    await updateProject({ status: 'generating', pct: 85 });
    const epCount = project.episodes || 8;
    const epPrompt = `드라마 "${loglineData.title}"의 전 ${epCount}회차 구성을 JSON으로 작성해줘. 회차별 제목과 요약을 포함해. JSON 형식: {"episodes": [{"ep": 1, "title": "...", "summary": "..."}]}`;
    const epResp = await anthropic.messages.create({
      model: getModelId(config.planningModel),
      max_tokens: 4096,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: epPrompt }]
    });
    const epMatch = epResp.content[0].text.match(/\{[\s\S]*\}/);
    if (!epMatch) throw new Error("회차 구성을 생성할 수 없습니다 (Invalid JSON format)");
    const epData = JSON.parse(epMatch[0]);
    log(`[AI-Gen] Phase 4 (Episodes) completed for ${projectId}`);
    
    // Phase 5: Finalize (100%)
    await updateProject({ 
        pct: 100, 
        status: 'done',
        scripts: epData.episodes // Using episodes as base scripts
    });
    log(`[AI-Gen] ✅ All Phases completed for ${projectId}. Status set to DONE.`);

  } catch (err) {
    log(`[AI-Gen-Error] ${err.message}`, 'error');
    await updateProject({ status: 'error', error_msg: err.message });
  }
}

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
      'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
      'claude-3-opus-latest': 'claude-3-opus-latest',
      'claude-3-5-haiku-latest': 'claude-3-5-haiku-20241022',
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
      // 4. Call Anthropic
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: content.maxTokens || 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      if (response.stop_reason === 'max_tokens') {
        log(`[AI Proxy] ⚠️ max_tokens 한도 도달 - 응답이 잘렸을 수 있음. 자동 복구 시도합니다.`);
      }

      const raw = response.content[0].text;
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
          error: `Anthropic API Error (${err.status})`,
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
