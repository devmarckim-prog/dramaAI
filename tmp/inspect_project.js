require('dotenv').config();
const { supabase } = require('./api/supabaseClient');

async function run() {
  const query = '장군님의 횟집%';
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .ilike('title', query);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
  process.exit();
}

run();
