require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Use Postgres query if possible via RPC or just try a dummy select
  const { data, error } = await supabase.from('samples').select('*').limit(1);
  if (error) {
    console.error('Fetch Error:', error);
  } else {
    console.log('Sample content (1 row):', JSON.stringify(data[0], null, 2));
    console.log('Columns identified:', Object.keys(data[0] || {}).join(', '));
  }
  process.exit();
}

check();
