const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase_url_here')) {
  console.warn('⚠️ Supabase credentials are not set in .env. Database operations will fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
