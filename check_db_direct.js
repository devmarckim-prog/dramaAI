const { Client } = require('pg');
require('dotenv').config();

async function checkDbDirect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- DB Connection Success ---');
    
    // Check projects table
    const res = await client.query('SELECT id, title, status, progress, created_at, plan_data FROM projects ORDER BY created_at DESC LIMIT 10');
    console.log(`Found ${res.rows.length} projects in DB.`);
    
    res.rows.forEach(p => {
      console.log(`\n[ID: ${p.id}] Status: ${p.status}, Progress: ${p.progress}%, Title: ${p.title}`);
      
      if (p.title.includes('사극') || p.progress === 5) {
        console.log('--- DETECTED TARGET PROJECT ---');
        console.log('Plan Data:', JSON.stringify(p.plan_data).slice(0, 2000));
      }
    });

  } catch (err) {
    console.error('--- DB Error ---', err);
  } finally {
    await client.end();
  }
}

checkDbDirect();
