const { Client } = require('pg');
require('dotenv').config();

async function applyCascade() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    return;
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase DB.');

    const sql = `
      ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_project_id_fkey;
      ALTER TABLE episodes ADD CONSTRAINT episodes_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    `;

    await client.query(sql);
    console.log('✅ Success: ON DELETE CASCADE constraint applied to episodes table.');

  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
  } finally {
    await client.end();
  }
}

applyCascade();
