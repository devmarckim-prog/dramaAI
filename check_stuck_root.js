const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkStuckProject() {
  console.log('--- Checking Stuck Projects (Root Version) ---');
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('--- QUERY ERROR ---', error);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('--- NO PROJECTS FOUND ---');
    return;
  }

  console.log(`--- FOUND ${projects.length} PROJECTS ---`);

  projects.forEach(p => {
    console.log(`\n[ID: ${p.id}] Status: ${p.status}, Progress: ${p.progress}%, Title: ${p.title}`);
    console.log(`Created: ${p.created_at}, Updated: ${p.updated_at}`);
    
    if (p.title.includes('사극') || p.progress === 5) {
        console.log('--- DETECTED TARGET PROJECT ---');
        console.log('Detailed Plan Data Keys:', Object.keys(p.plan_data || {}));
        if (p.plan_data) {
            console.log('Plan data preview:', JSON.stringify(p.plan_data).slice(0, 1000));
        } else {
            console.log('Plan data is NULL or empty');
        }
    }
  });
}

checkStuckProject();
