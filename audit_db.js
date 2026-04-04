const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('--- 5. Projects Table Columns ---');
  const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'projects' });
  
  if (colErr) {
    // If RPC is missing, try raw SQL query via project metadata if possible, 
    // but here we'll use a standard select with 1 row to see keys.
    const { data: oneRow } = await supabase.from('projects').select('*').limit(1);
    if (oneRow && oneRow.length > 0) {
      console.log('Columns found in live data:', Object.keys(oneRow[0]));
      console.log('Outline column exists:', Object.keys(oneRow[0]).includes('outline'));
    } else {
      console.log('No data to infer columns. Error or empty table.');
    }
  } else {
    console.log(cols);
  }

  console.log('\n--- 7. Recent Projects Status ---');
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, title, status, pct, stepIdx, error_msg, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (projErr) {
    console.error('Error fetching projects:', projErr);
  } else {
    projects.forEach(p => console.log(JSON.stringify(p, null, 2)));
  }
}

runAudit();
