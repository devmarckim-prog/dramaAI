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
    
    const res = await client.query(`
      SELECT id, title, status, pct, "stepIdx", error_msg, synopsis, chars, episodes, ppl, budget, scripts 
      FROM projects 
      WHERE title LIKE '%사극%' 
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${res.rows.length} projects matching "사극".`);
    
    res.rows.forEach((p, i) => {
      console.log(`\n--- Project #${i+1} ---`);
      console.log(`ID: ${p.id}`);
      console.log(`Title: ${p.title}`);
      console.log(`Status: ${p.status}`);
      console.log(`Progress: ${p.pct}% (Step: ${p.stepIdx})`);
      console.log(`Error: ${p.error_msg || 'None'}`);
      
      const parts = [];
      if (p.synopsis) parts.push('Synopsis');
      if (p.chars && p.chars.length > 0) parts.push(`Characters(${p.chars.length})`);
      if (p.episodes > 0) parts.push('Episodes Meta');
      if (p.scripts && Object.keys(p.scripts).length > 0) parts.push(`Scripts(${Object.keys(p.scripts).length})`);
      
      console.log(`Generated Parts: ${parts.join(', ') || 'None'}`);
      
      if (p.id === 'g-960372-1774912777283') {
          console.log('\n--- TARGET DATA INSPECTION ---');
          console.log('Synopsis Preview:', p.synopsis?.slice(0, 200));
          console.log('Scripts Keys:', Object.keys(p.scripts || {}));
      }
    });

  } catch (err) {
    console.error('--- DB Error ---', err);
  } finally {
    await client.end();
  }
}

findSaguekProjects();
