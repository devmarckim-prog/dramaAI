const { supabase, serviceSupabase } = require('../supabaseClient');

/**
 * Middleware to verify that the request is coming from an Admin user.
 * Admins are identified by:
 * 1. Valid Supabase Auth Token
 * 2. Email ending in '@dramascript.ai' OR role='admin' in user_profiles
 */
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      console.warn('[Admin Auth] Missing authorization header');
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.warn('[Admin Auth] Missing token in header');
      return res.status(401).json({ error: 'Token format invalid' });
    }

    // Safer destructuring to prevent crash if data is null
    const { data, error } = await supabase.auth.getUser(token);
    const user = data?.user;

    if (error || !user) {
      console.warn(`[Admin Auth] Auth verification failed: ${error ? error.message : 'No user found'}`);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Rule 1: Supabase Service Role Bypass (mostly for testing, but added for safety)
    const isServiceRole = req.headers['x-api-key'] === process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceRole && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('[Admin Auth] Service Role Bypass active');
      return next();
    }

    // Rule 2: PRIMARY ADMIN - dev.marckim@gmail.com is always allowed
    const primaryAdminEmail = 'dev.marckim@gmail.com';
    if (user.email === primaryAdminEmail) {
      console.log(`[Admin Auth] Primary Admin access granted: ${user.email}`);
      req.user = user;
      return next();
    }

    // Rule 3: Database Role Check - check if user has 'admin' role in user_profiles
    const { data: profile, error: pErr } = await serviceSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!pErr && profile && profile.role === 'admin') {
      console.log(`[Admin Auth] Database Admin access granted: ${user.email}`);
      req.user = user;
      return next();
    }

    // Rule 4: Domain Check - @dramascript.ai are auto-admins
    if (user.email && user.email.endsWith('@dramascript.ai')) {
      console.log(`[Admin Auth] Domain Admin access granted: ${user.email}`);
      req.user = user;
      return next();
    }

    console.warn(`[Admin Auth] Forbidden access attempt by: ${user.email}`);
    return res.status(403).json({ error: '관리자 전용 기능입니다. 접근 권한이 없습니다.' });

  } catch (err) {
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.resolve(__dirname, 'admin_auth_error.log');
      const logMsg = `[${new Date().toISOString()}] Admin Auth Error: ${err.message}\nStack: ${err.stack}\nCWD: ${process.cwd()}\n\n`;
      if (process.env.NODE_ENV !== 'production') {
        fs.appendFileSync(logPath, logMsg);
      }
    } catch (logErr) {
      // Ignore logging errors in production
    }
    
    console.error('[Admin Auth] CRITICAL Middleware Error:', err);
    res.status(500).json({ 
      error: '인증 시스템 오류가 발생했습니다.', 
      details: err.message,
      stack: err.stack 
    });
  }
};

module.exports = adminAuth;
