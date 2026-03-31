const { serviceSupabase } = require('./api/supabaseClient');

async function checkProject() {
  console.log('Searching for projects related to "훈민정음"...');
  
  const { data, error } = await serviceSupabase
    .from('projects')
    .select('*')
    .ilike('title', '%훈민정음%');

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No project found with "훈민정음" in the title.');
    return;
  }

  data.forEach(p => {
    console.log(`\n--- Project: ${p.title} (${p.id}) ---`);
    console.log(`Status: ${p.status}, Progress: ${p.pct}%, StepIdx: ${p.stepIdx}`);
    console.log(`Logline: ${p.logline ? 'OK (' + p.logline.length + ' chars)' : 'MISSING'}`);
    console.log(`Synopsis: ${p.synopsis ? 'OK (' + p.synopsis.length + ' chars)' : 'MISSING'}`);
    console.log(`Characters: ${p.chars ? p.chars.length : 0} found`);
    console.log(`Episodes: ${Array.isArray(p.episodes) ? p.episodes.length + ' episodes' : p.episodes}`);
    console.log(`Conflicts: ${p.conflicts ? p.conflicts.length + ' found' : 'MISSING'}`);
    console.log(`Stats: ${p.stats ? 'OK' : 'MISSING'}`);
    if (p.error_msg) console.log(`Error Msg: ${p.error_msg}`);
  });
}

checkProject();
