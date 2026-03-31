const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestProject() {
  console.log('Checking latest projects in Supabase...');
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, logline, synopsis, episodes, stats, pct, status')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  data.forEach((p, i) => {
    console.log(`\n--- Project ${i+1} ---`);
    console.log(`ID: ${p.id}`);
    console.log(`Title: ${p.title}`);
    console.log(`Status: ${p.status} (${p.pct}%)`);
    console.log(`Logline (length): ${p.logline?.length || 0}`);
    console.log(`Synopsis (length): ${p.synopsis?.length || 0}`);
    console.log(`Episodes type: ${typeof p.episodes} (Value: ${JSON.stringify(p.episodes)})`);
    console.log(`Stats present: ${!!p.stats}`);
    if (p.logline) console.log(`Logline sample: ${p.logline.substring(0, 50)}...`);
  });
}

checkLatestProject();
