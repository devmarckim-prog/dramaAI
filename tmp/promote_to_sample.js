require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const projectId = 'p-82f06-1775136734921';

async function run() {
  console.log(`Setting project ${projectId} as a public sample...`);
  const { data, error } = await supabase
    .from('projects')
    .update({ 
      is_sample: true,
      visibility: 'public',
      status: 'done',
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId);

  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Project successfully set as public sample.');
  }
  process.exit();
}

run();
