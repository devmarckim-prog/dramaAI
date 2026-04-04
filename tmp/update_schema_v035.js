const { serviceSupabase } = require('../api/supabaseClient');

async function updateSchema() {
  const sql = `
    -- Add model tracking columns to projects
    ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS planning_model text,
    ADD COLUMN IF NOT EXISTS production_model text,
    ADD COLUMN IF NOT EXISTS system_prompt text;

    -- Ensure last_login_at exists for better sync tracing (optional but good)
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_login_at') THEN
        ALTER TABLE user_profiles ADD COLUMN last_login_at timestamp with time zone DEFAULT now();
      END IF;
    END $$;
  `;

  console.log('--- DB Schema Update v0.35 ---');
  const { data, error } = await serviceSupabase.rpc('run_sql', { sql });
  
  if (error) {
    console.error('❌ SQL Execution Error:', error.message);
    if (error.details) console.error('Details:', error.details);
    process.exit(1);
  }

  console.log('✅ SQL execution successful.');

  // Verify columns
  const verifySql = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name IN ('planning_model', 'production_model', 'system_prompt');
  `;
  const { data: cols, error: vErr } = await serviceSupabase.rpc('run_sql', { sql: verifySql });
  
  if (vErr) {
    console.error('❌ Verification Error:', vErr.message);
  } else {
    console.log('🔍 Current Columns in projects:');
    console.table(cols);
  }
}

updateSchema();
