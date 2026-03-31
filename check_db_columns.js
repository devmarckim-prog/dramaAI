const { Client } = require('pg');
require('dotenv').config();

async function checkDbColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- DB Connection Success ---');
    
    // Get column names
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
    `);
    
    console.log('Columns in projects table:');
    res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
    
    // Also check the content of the most recent project
    const recent = await client.query('SELECT * FROM projects ORDER BY created_at DESC LIMIT 1');
    console.log('\nMost recent project (raw):');
    console.log(JSON.stringify(recent.rows[0], null, 2).slice(0, 5000));

  } catch (err) {
    console.error('--- DB Error ---', err);
  } finally {
    await client.end();
  }
}

checkDbColumns();
