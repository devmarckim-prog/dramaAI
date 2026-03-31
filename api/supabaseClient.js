const { createClient } = require('@supabase/supabase-js');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase Config] CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY is NOT set.');
  console.log('[Supabase Config] NODE_ENV:', process.env.NODE_ENV);
  // Do not crash here, let the routes handle the initialization failure gracefully
}

// Base client (limited by ANON key/RLS)
let supabase = null;
let serviceSupabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    serviceSupabase = createClient(supabaseUrl, serviceKey || supabaseKey);
  }
} catch (err) {
  console.error('[Supabase Config] Failed to create client:', err.message);
}

// Factory: creates a user-scoped client so RLS auth.uid() works correctly
function createUserClient(userJwt) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${userJwt}` }
    }
  });
}

// Clean, structured exports for the entire backend
module.exports = {
  supabase,
  serviceSupabase,
  createUserClient
};
