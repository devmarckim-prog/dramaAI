require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const projectId = 'p-82f06-1775136734921';
const sampleId = 'sample-general-hoet'; 

async function run() {
  console.log(`Fetching project ${projectId} to promote to sample...`);
  
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    console.error('Fetch Error:', fetchError);
    process.exit(1);
  }

  console.log(`Found project: ${project.title}. Upserting to 'samples' table...`);

  // Prepare sample data matching the identified schema (id, title, data)
  const sampleEntry = {
    id: sampleId,
    title: project.title,
    data: {
      ...project,
      id: sampleId,
      is_sample: true,
      isVisible: true // Nested inside data object per schema observation
    }
  };

  const { error: upsertError } = await supabase
    .from('samples')
    .upsert(sampleEntry, { onConflict: 'id' });

  if (upsertError) {
    console.error('Upsert Error:', upsertError);
  } else {
    console.log(`Successfully promoted '${project.title}' to public sample table.`);
  }
  process.exit();
}

run();
