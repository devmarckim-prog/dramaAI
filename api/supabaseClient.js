const { createClient } = require('@supabase/supabase-js');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase_url_here')) {
  console.warn('⚠️ Supabase credentials are not set in .env. Database operations will fail.');
}

let supabase = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your_supabase_url_here')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
} else {
  console.warn('⚠️ Supabase credentials are missing or invalid. Database operations will be disabled.');
}

module.exports = supabase;
