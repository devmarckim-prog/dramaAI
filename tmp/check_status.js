require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking Samples:');
  const { data: samples, error: samplesErr } = await supabase.from('samples').select('id, title');
  if (samplesErr) console.error(samplesErr);
  else console.log(samples);

  console.log('\nChecking Project p-82f06-1775136734921:');
  const { data: project, error: projectErr } = await supabase.from('projects').select('id, title').eq('id', 'p-82f06-1775136734921').single();
  if (projectErr) console.error(projectErr);
  else console.log(project);
}

check();
