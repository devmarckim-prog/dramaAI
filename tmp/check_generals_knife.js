const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findGeneralsKnife() {
  console.log('Searching for "장군의 식칼" in Supabase...');
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, logline, synopsis, episodes, chars, ppl, budget, pct, status')
    .ilike('title', '%장군의 식칼%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  if (data && data.length > 0) {
    const p = data[0];
    console.log(`\n✅ PROJECT FOUND: ${p.title} (ID: ${p.id})`);
    console.log(`- Status: ${p.status} (${p.pct}%)`);
    console.log(`- Logline: ${p.logline ? 'EXIST (Length: ' + p.logline.length + ')' : 'MISSING'}`);
    console.log(`- Synopsis: ${p.synopsis ? 'EXIST (Length: ' + p.synopsis.length + ')' : 'MISSING'}`);
    console.log(`- Episodes type: ${typeof p.episodes} (Value: ${JSON.stringify(p.episodes)})`);
    console.log(`- Characters count: ${Array.isArray(p.chars) ? p.chars.length : 'NOT ARRAY'}`);
    console.log(`- PPL count: ${Array.isArray(p.ppl) ? p.ppl.length : 'NOT ARRAY'}`);
    console.log(`- Budget info: ${JSON.stringify(p.budget)}`);
    
    if (p.logline) console.log(`\n[Logline Preview]\n${p.logline}`);
    if (Array.isArray(p.episodes)) {
      console.log(`\n[Episodes Preview] Found ${p.episodes.length} episodes.`);
      console.log(`Ep 1: ${p.episodes[0].title || 'No Title'} - ${p.episodes[0].story?.substring(0, 50)}...`);
    }
  } else {
    console.log('❌ "장군의 식칼" 프로젝트를 찾을 수 없습니다.');
  }
}

findGeneralsKnife();
