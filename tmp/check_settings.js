const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkSettings() {
  console.log('--- Supabase system_settings 조회 ---');
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 'global')
    .single();

  if (error) {
    console.error('Error fetching settings:', error.message);
    return;
  }

  console.log('ID:', data.id);
  console.log('Planning Model (DB):', data.planning_model);
  console.log('Production Model (DB):', data.production_model);
  console.log('------------------------------------');
}

checkSettings();
