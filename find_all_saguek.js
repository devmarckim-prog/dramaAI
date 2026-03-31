const { Client } = require('pg');
require('dotenv').config();

async function findSaguekProjects() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Searching for Saguek Projects ---');
    
    // Select all projects to see if there are duplicates or different statuses
    const res = await client.query(`
      SELECT id, title, status, pct, "stepIdx", error_msg, created_at, updated_at
      FROM projects 
      WHERE title LIKE '%사극%' OR title LIKE '%이순신%'
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${res.rows.length} projects.`);
    
    res.rows.forEach((p, i) => {
      console.log(`\n--- Project #${i+1} ---`);
      console.log(`ID: ${p.id}`);
      console.log(`Title: ${p.title}`);
      console.log(`Status: ${p.status}`);
      console.log(`Progress: ${p.pct}% (StepIdx: ${p.stepIdx})`);
      console.log(`Created: ${p.created_at}`);
      console.log(`Updated: ${p.updated_at}`);
      console.log(`Error: ${p.error_msg || 'None'}`);
    });

  } catch (err) {
    console.error('--- DB Error ---', err);
  } finally {
    await client.end();
  }
}

findSaguekProjects();
