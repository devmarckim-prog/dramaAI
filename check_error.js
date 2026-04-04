const { serviceSupabase } = require('./api/supabaseClient');
require('dotenv').config({ path: './api/.env' });

async function check() {
  const projectId = 'p-e098b-1775283858416';
  console.log(`[Check] Fetching project ${projectId}...`);
  
  const { data: project, error: pError } = await serviceSupabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (pError) {
    console.error('[Error] Project Fetch:', pError);
  } else {
    console.log('[Status]', project.status);
    console.log('[Percent]', project.pct);
    console.log('[Error Msg]', project.error_msg);
  }

  console.log('\n[Check] Fetching system_settings...');
  const { data: config, error: cError } = await serviceSupabase
    .from('system_settings')
    .select('*')
    .eq('id', 'global')
    .single();

  if (cError) {
    console.error('[Error] Config Fetch:', cError);
  } else {
    console.log('[Prompts Keys]', Object.keys(config.prompts || {}));
    console.log('[CORE Prompt Example]', (config.prompts?.CORE || '').substring(0, 100) + '...');
  }
  process.exit();
}

check();
