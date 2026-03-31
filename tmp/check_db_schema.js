const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking project table columns...');
  // We can't easily check schema via JS client without 'rpc', 
  // but we can just fetch one row and see the keys.
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]).join(', '));
    console.log('\nSample project data:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data found in projects table.');
  }
}

checkSchema();
