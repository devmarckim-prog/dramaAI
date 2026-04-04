const { Client } = require('pg');
require('dotenv').config({ path: './api/.env' });

async function updateSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- DB Schema Update v0.35 (Native PG) ---');

    const sql = `
      -- Add model tracking columns to projects
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS planning_model text,
      ADD COLUMN IF NOT EXISTS production_model text,
      ADD COLUMN IF NOT EXISTS system_prompt text;

      -- Ensure last_login_at exists for better sync tracing
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_login_at') THEN
          ALTER TABLE user_profiles ADD COLUMN last_login_at timestamp with time zone DEFAULT now();
        END IF;
      END $$;
    `;

    await client.query(sql);
    console.log('✅ SQL execution successful.');

    // Verify columns
    const verifySql = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name IN ('planning_model', 'production_model', 'system_prompt');
    `;
    const res = await client.query(verifySql);
    console.log('🔍 Current Columns in projects:');
    console.table(res.rows);

  } catch (err) {
    console.error('❌ SQL Execution Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateSchema();
