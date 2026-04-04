const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  console.log('Searching for the most recent project stuck at low progress...');
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No projects found in database.');
    return;
  }

  data.forEach(p => {
    console.log(`\n--- Project: ${p.title} ---`);
    console.log(`ID: ${p.id}`);
    console.log(`Created At: ${p.created_at}`);
    console.log(`Status: ${p.status}`);
    console.log(`Progress (pct): ${p.pct}%`);
    console.log(`StepIdx: ${p.stepIdx}`);
    console.log(`Latest Step Message: ${p.step_msg || 'None'}`);
    console.log(`Error Message: ${p.error_msg || 'None'}`);
    
    const fields = ['logline', 'synopsis', 'chars', 'episodes', 'conflicts', 'stats', 'ppl', 'input'];
    console.log('Data Integrity Check:');
    fields.forEach(f => {
      const val = p[f];
      let status;
      if (f === 'input') {
        status = val ? (typeof val === 'string' ? val.substring(0, 100) + '...' : 'Object present') : 'NULL';
      } else {
        status = val ? (typeof val === 'object' ? (Array.isArray(val) ? val.length + ' items' : 'Object present') : 'String/Number present') : 'NULL';
      }
      console.log(`  - ${f}: ${status}`);
    });
    if (p.input) console.log(`  Full Input: ${JSON.stringify(p.input)}`);
  });
}

investigate();
