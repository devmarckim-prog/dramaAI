const express = require('express');
const router = express.Router();
const { serviceSupabase: supabase } = require('../supabaseClient');
const adminAuth = require('../middleware/adminAuth');
const fs = require('fs');
const path = require('path');

// Apply admin protection to all routes in this router
router.use(adminAuth);

/**
 * Fetch REAL API costs from Anthropic Admin API
 * Requires ANTHROPIC_ADMIN_API_KEY (sk-ant-admin...) in .env
 * Docs: https://platform.claude.com/docs/ko/build-with-claude/usage-cost-api
 * Returns: { totalCostUSD: number, source: 'real'|'unavailable' }
 */
async function fetchRealAnthropicCost(daysBack = 30) {
  const adminKey = process.env.ANTHROPIC_ADMIN_API_KEY;
  if (!adminKey || !adminKey.startsWith('sk-ant-admin')) {
    return { totalCostUSD: null, source: 'no_admin_key' };
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const params = new URLSearchParams({
      starting_at: startDate.toISOString().split('.')[0] + 'Z',
      ending_at: endDate.toISOString().split('.')[0] + 'Z',
      bucket_width: '1d'
    });

    // Use node's built-in fetch (Node 18+) or require node-fetch
    const fetch = globalThis.fetch || require('node-fetch');
    const response = await fetch(
      `https://api.anthropic.com/v1/organizations/cost_report?${params}`,
      {
        headers: {
          'anthropic-version': '2023-06-01',
          'x-api-key': adminKey
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[Admin Cost API] Request failed:', response.status, errText);
      return { totalCostUSD: null, source: 'api_error', detail: errText };
    }

    const data = await response.json();
    // Cost is in USD cents (smallest unit) as decimal string per bucket
    // Sum all bucket totals
    let totalCents = 0;
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(bucket => {
        // total_cost is a decimal string in cents
        totalCents += parseFloat(bucket.total_cost || '0');
      });
    }
    const totalUSD = totalCents / 100;
    console.log(`[Admin Cost API] Real cost for last ${daysBack} days: $${totalUSD.toFixed(4)}`);
    return { totalCostUSD: totalUSD, source: 'real', daysBack };
  } catch (err) {
    console.error('[Admin Cost API] Fetch error:', err.message);
    return { totalCostUSD: null, source: 'fetch_error', detail: err.message };
  }
}

// Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const { count: projectCount, error: pErr } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true });

    if (pErr) throw pErr;

    const { count: userCount, error: uErr } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true });
    
    if (uErr) throw uErr;
    const uniqueUsers = userCount || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount, error: tErr } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (tErr) throw tErr;

    // Load current models from config
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../config/system.json');
    let activeModels = 'Claude 3.5 Sonnet & Haiku';
    let config = { productionModel: 'claude-3-5-sonnet-latest', planningModel: 'claude-3-5-haiku-latest' };
    
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        activeModels = `${config.productionModel.split('-').slice(0,3).join(' ')} & ${config.planningModel.split('-').slice(0,3).join(' ')}`;
      } catch (e) {}
    }

    // REAL REVENUE Calculation: Try payments table first
    let totalRevenue = 0;
    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'success');
      
      totalRevenue = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } catch (e) {
      console.warn('[Admin Stats] Payments table fetch failed, calculating from user plans.');
    }

    // Fallback: If revenue is 0 and we have Pro users, estimate it (Commercialization focus)
    if (totalRevenue === 0) {
      const { count: proUsers } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('plan', 'Pro');
      
      const proPrice = (config.pricingPro || 29900);
      totalRevenue = (proUsers || 0) * proPrice;
    }

    // API 비용: Anthropic Admin API로 실제 비용 먼저 시도, 실패 시 추산
    let estimatedCost;
    let costSource = 'ESTIMATED';
    let isRealCost = false;

    // 1. Try Real Anthropic Cost API (requires ANTHROPIC_ADMIN_API_KEY)
    const realCostResult = await fetchRealAnthropicCost(30);
    if (realCostResult.source === 'real' && realCostResult.totalCostUSD !== null) {
      estimatedCost = realCostResult.totalCostUSD.toFixed(4);
      costSource = 'REAL';
      isRealCost = true;
    } else {
      // 2. Fallback: Estimation based on model pricing
      const prodModel = (config.productionModel || '').toLowerCase();
      let costPerProj;
      if (prodModel.includes('opus')) {
        costPerProj = 2.50; // Claude Opus 4.6: ~$15/$75 per 1M
      } else if (prodModel.includes('sonnet')) {
        costPerProj = 0.60; // Claude Sonnet 4.6: ~$3/$15 per 1M, ~40k tokens
      } else {
        costPerProj = 0.05; // Claude Haiku 4.5: ~$0.25/$1.25 per 1M
      }

      const { count: completedProjs } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done');
      
      estimatedCost = ((projectCount || 0) * 0.05 + (completedProjs || 0) * costPerProj).toFixed(2);
      costSource = realCostResult.source === 'no_admin_key' ? 'ESTIMATED' : 'API_ERR';
    }

    // Query completed projects count (for display)
    const { count: completedProjs } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'done');

    let revenueSource = 'DUMMY';
    if (totalRevenue > 0) revenueSource = 'ESTIMATED';

    res.json({
      totalProjects: projectCount || 0,
      totalUsers: uniqueUsers || 0, 
      todayGen: todayCount || 0,
      activeModels: activeModels,
      estimatedCost: estimatedCost,
      isRealCost: isRealCost,
      costSource: costSource,
      costPeriod: isRealCost ? '최근 30일 실제 비용' : '누적 추산치',
      totalRevenue: totalRevenue.toLocaleString(),
      isRealRevenue: totalRevenue > 0,
      revenueLabel: revenueSource,
      completedProjects: completedProjs || 0,
      chartData: [12, 19, 3, 5, 2, 3]
    });
  } catch (error) {
    console.error('[Admin API] Stats Error:', error);
    res.json({
      totalProjects: 0,
      totalUsers: 0,
      todayGen: 0,
      activeModels: 'Database Offline',
      estimatedCost: '0.00',
      totalRevenue: '0',
      isRealRevenue: false
    });
  }
});

// ─────────────────────────────────────────────────────
// Anthropic 실제 API 비용 세부 내역  (최근 N일, 일별/모델별)
// GET /api/admin/api-cost-detail?days=30
// ─────────────────────────────────────────────────────
router.get('/api-cost-detail', async (req, res) => {
  const adminKey = process.env.ANTHROPIC_ADMIN_API_KEY;
  if (!adminKey || !adminKey.startsWith('sk-ant-admin')) {
    return res.status(400).json({ error: 'ANTHROPIC_ADMIN_API_KEY가 설정되지 않았습니다.', source: 'no_admin_key' });
  }

  const days = Math.min(parseInt(req.query.days) || 30, 90);
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch cost report – grouped by description (contains model info)
    const costParams = new URLSearchParams({
      starting_at: startDate.toISOString().split('.')[0] + 'Z',
      ending_at:   endDate.toISOString().split('.')[0] + 'Z',
      bucket_width: '1d',
    });
    costParams.append('group_by[]', 'description');

    // Fetch usage report – grouped by model for token counts
    const usageParams = new URLSearchParams({
      starting_at: startDate.toISOString().split('.')[0] + 'Z',
      ending_at:   endDate.toISOString().split('.')[0] + 'Z',
      bucket_width: '1d',
    });
    usageParams.append('group_by[]', 'model');

    const fetchAnthropicAdmin = (path) => {
      const fetch = globalThis.fetch || require('node-fetch');
      return fetch(`https://api.anthropic.com${path}`, {
        headers: { 'anthropic-version': '2023-06-01', 'x-api-key': adminKey }
      });
    };

    const [costRes, usageRes] = await Promise.all([
      fetchAnthropicAdmin(`/v1/organizations/cost_report?${costParams}`),
      fetchAnthropicAdmin(`/v1/organizations/usage_report/messages?${usageParams}`)
    ]);

    if (!costRes.ok) {
      const errText = await costRes.text();
      return res.status(costRes.status).json({ error: `Anthropic Cost API 오류: ${errText}`, source: 'api_error' });
    }
    if (!usageRes.ok) {
      const errText = await usageRes.text();
      return res.status(usageRes.status).json({ error: `Anthropic Usage API 오류: ${errText}`, source: 'api_error' });
    }

    const costData  = await costRes.json();
    const usageData = await usageRes.json();

    // ── Aggregate cost by date ──────────────────────────────────────
    const costByDate = {};
    (costData.data || []).forEach(bucket => {
      const date = (bucket.start_time || '').substring(0, 10);
      if (!date) return;
      const costCents = parseFloat(bucket.total_cost || '0');
      costByDate[date] = (costByDate[date] || 0) + costCents;
    });

    // ── Aggregate usage by model & date ────────────────────────────
    const modelStats = {};  // { modelName: { inputTokens, outputTokens, requests } }
    const dailyUsage = {}; // { date: { inputTokens, outputTokens, requests } }

    (usageData.data || []).forEach(bucket => {
      const date = (bucket.start_time || '').substring(0, 10);
      const model = bucket.model || 'unknown';
      const inputTok  = parseInt(bucket.input_tokens  || 0);
      const outputTok = parseInt(bucket.output_tokens || 0);
      const requests  = parseInt(bucket.request_count   || 0);

      // By model
      if (!modelStats[model]) modelStats[model] = { inputTokens: 0, outputTokens: 0, requests: 0 };
      modelStats[model].inputTokens  += inputTok;
      modelStats[model].outputTokens += outputTok;
      modelStats[model].requests     += requests;

      // By date
      if (date) {
        if (!dailyUsage[date]) dailyUsage[date] = { inputTokens: 0, outputTokens: 0, requests: 0, costUSD: 0 };
        dailyUsage[date].inputTokens  += inputTok;
        dailyUsage[date].outputTokens += outputTok;
        dailyUsage[date].requests     += requests;
        dailyUsage[date].costUSD      += (costByDate[date] || 0) / 100;
      }
    });

    // ── Build timeline (daily rows, newest first) ───────────────────
    const timeline = Object.entries(dailyUsage)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, d]) => ({
        date,
        requests:     d.requests,
        inputTokens:  d.inputTokens,
        outputTokens: d.outputTokens,
        totalTokens:  d.inputTokens + d.outputTokens,
        costUSD:      parseFloat(d.costUSD.toFixed(6))
      }));

    // ── Total summary ───────────────────────────────────────────────
    const totalCostUSD = Object.values(costByDate).reduce((s, c) => s + c, 0) / 100;
    const totalInput   = Object.values(modelStats).reduce((s, m) => s + m.inputTokens, 0);
    const totalOutput  = Object.values(modelStats).reduce((s, m) => s + m.outputTokens, 0);
    const totalReqs    = Object.values(modelStats).reduce((s, m) => s + m.requests, 0);

    res.json({
      source: 'real',
      period: { days, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] },
      summary: {
        totalCostUSD:    parseFloat(totalCostUSD.toFixed(6)),
        totalInputTokens:  totalInput,
        totalOutputTokens: totalOutput,
        totalTokens:      totalInput + totalOutput,
        totalRequests:    totalReqs
      },
      byModel: Object.entries(modelStats)
        .sort(([,a],[,b]) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))
        .map(([model, s]) => ({ model, ...s, totalTokens: s.inputTokens + s.outputTokens })),
      timeline
    });

  } catch (err) {
    console.error('[Admin Cost Detail] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// System Configuration (Unified Cloud & Local)
router.get('/config', async (req, res) => {
  try {
    // 1. Try Supabase First
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global')
      .single();
    
    if (!error && data) {
      return res.json({
        planningModel: data.planning_model,
        productionModel: data.production_model,
        systemPrompt: data.system_prompt,
        pricingPro: data.pricing_pro || 29900,
        creditsFree: data.credits_free || 10,
        source: 'supabase'
      });
    }

    // 2. Fallback to Local
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../config/system.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return res.json({ 
        pricingPro: 29900,
        creditsFree: 10,
        ...config, 
        source: 'local' 
      });
    } else {
      res.json({ 
        planningModel: 'claude-3-5-haiku-20241022',
        productionModel: 'claude-3-5-sonnet-20241022',
        systemPrompt: '',
        pricingPro: 29900,
        creditsFree: 10,
        source: 'defaults'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', async (req, res) => {
  try {
    const { planningModel, productionModel, systemPrompt, pricingPro, creditsFree } = req.body;
    
    // 1. Update Supabase
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'global',
        planning_model: planningModel,
        production_model: productionModel,
        system_prompt: systemPrompt,
        pricing_pro: parseInt(pricingPro) || 29900,
        credits_free: parseInt(creditsFree) || 10,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.warn('[Admin Config] Supabase Update failed (Table might not exist):', error.message);
    }

    // 2. Backup to local disk (for reliability) - Optional in production
    try {
      const fs = require('fs');
      const path = require('path');
      const configDir = path.join(__dirname, '../config');
      if (process.env.NODE_ENV !== 'production') {
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        
        const configPath = path.join(configDir, 'system.json');
        const newConfig = { 
          planningModel, 
          productionModel, 
          systemPrompt, 
          pricingPro: parseInt(pricingPro) || 29900, 
          creditsFree: parseInt(creditsFree) || 10 
        };
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
        console.log('[Admin Config] Local backup successful');
      }
    } catch (fsErr) {
      console.warn('[Admin Config] Local backup failed (likely read-only FS):', fsErr.message);
    }
    
    console.log('[Admin Config] Settings Updated (Cloud & Local):', { planningModel, productionModel });
    res.json({ message: 'Configuration saved successfully', cloud: !error });
} catch (error) {
    console.error('[Admin Config] Save Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// System Health Check
router.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    const { data: dbData, error: dbErr } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    const dbLatency = Date.now() - start;

    // AI Engine Heartbeat (Minimal Anthropic Call)
    let aiStatus = 'offline';
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const aiStart = Date.now();
      await anthropic.messages.create({
        model: "claude-haiku-4-5",  // Cheapest model for heartbeat check
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }]
      });
      aiStatus = 'online';
      console.log(`[Health] AI Heartbeat Success (${Date.now() - aiStart}ms)`);
    } catch (e) {
      console.error('[Health] AI Heartbeat Failed:', e.message);
      aiStatus = 'error';
    }

    res.json({
      status: 'healthy',
      latency: dbLatency,
      database: dbErr ? 'offline' : 'online',
      dbError: dbErr ? dbErr.message : null,
      aiStatus: aiStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Recent Projects
router.get('/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, genre, created_at, status, user_id')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    const projects = data.map(p => {
      let userDisplay = 'Guest';
      if (p.user_id) {
        userDisplay = typeof p.user_id === 'string' 
          ? `User-${p.user_id.slice(0, 8)}` 
          : `User-${p.user_id}`;
      }
      return { ...p, user_email: userDisplay };
    });

    res.json(projects);
  } catch (error) {
    console.error('[Admin API] Projects Fetch Error:', error);
    res.json([]);
  }
});

// Get Single Project Detail for Admin
router.get('/projects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Management (Reconciled with Auth)
router.get('/users', async (req, res) => {
  try {
    // 1. Fetch all profiles
    const { data: profiles, error: pErr } = await supabase
      .from('user_profiles')
      .select('id, email, role, plan, credits, updated_at')
      .order('updated_at', { ascending: false });

    if (pErr) throw pErr;

    // 2. Try to fetch from auth.users (Requires Service Role)
    // If the service role isn't working, we just return profiles
    try {
      const { data: authUsers, error: aErr } = await supabase.auth.admin.listUsers();
      
      if (!aErr && authUsers && authUsers.users) {
        const profileIds = new Set(profiles.map(p => p.id));
        const missing = authUsers.users.filter(u => !profileIds.has(u.id));
        
        // Combine them
        const reconciled = [
          ...profiles,
          ...missing.map(u => ({
            id: u.id,
            email: u.email,
            role: 'User (Missing Profile)',
            plan: 'N/A',
            credits: 0,
            updated_at: u.created_at,
            needsSync: true
          }))
        ];
        return res.json(reconciled);
      }
    } catch (authErr) {
      console.warn('[Admin API] Auth list fallback:', authErr.message);
    }

    res.json(profiles);
  } catch (error) {
    console.error('[Admin API] Users Fetch Error:', error);
    res.json([]);
  }
});

// Create User Profile Manually
router.post('/users', async (req, res) => {
  try {
    const { email, plan, credits, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{
        email,
        plan: plan || 'Free',
        credits: parseInt(credits) || 0,
        role: role || 'User',
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Credits/Plan
router.patch('/users/:id', async (req, res) => {
  try {
    const { credits, plan, role } = req.body;
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...(credits !== undefined && { credits }),
        ...(plan !== undefined && { plan }),
        ...(role !== undefined && { role }),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete User Profile
router.delete('/users/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sample Management (Write/Update only here)
router.post('/samples', async (req, res) => {
  try {
    const { id, title, data } = req.body;
    if (!id || !title || !data) {
      return res.status(400).json({ error: 'Missing required fields: id, title, data' });
    }

    const { error } = await supabase
      .from('samples')
      .upsert({
        id,
        title,
        data,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    res.json({ success: true, message: 'Sample updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
