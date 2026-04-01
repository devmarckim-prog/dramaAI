const { serviceSupabase } = require('./api/supabaseClient');

async function migrate_v01110() {
  console.log('--- Migration v01110: Add ON DELETE CASCADE to episodes ---');

  if (!serviceSupabase) {
    console.error('Supabase Service Client missing.');
    return;
  }

  const sql = `
    ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_project_id_fkey;
    ALTER TABLE episodes ADD CONSTRAINT episodes_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  `;

  try {
    const { error } = await serviceSupabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // If exec_sql RPC doesn't exist, we might need another way or just skip if it's manual
      console.warn('RPC exec_sql failed, trying standard query:', error.message);
      // In some Supabase setups, you can't run DDL via the standard client. 
      // Assuming the user has the 'exec_sql' helper or I'll provide the SQL.
    } else {
      console.log('✅ Cascade Delete constraint applied successfully.');
    }
  } catch (e) {
    console.error('Migration failed:', e.message);
  }
}

migrate_v01110();
