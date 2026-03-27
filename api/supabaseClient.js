const { createClient } = require('@supabase/supabase-js');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials are not set in .env. Database operations will fail.');
}

// Base admin client (for auth verification only)
const supabase = createClient(supabaseUrl, supabaseKey);

// Factory: creates a user-scoped client so RLS auth.uid() works correctly
function createUserClient(userJwt) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${userJwt}` }
    }
  });
}

module.exports = supabase;
module.exports.createUserClient = createUserClient;
