const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.stfonaiuxavzbqwikcqb:77!!supabasee@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function investigate() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Connected to PostgreSQL Directly ---');

    // Quote case-sensitive column names in PG
    const res = await client.query('SELECT id, title, pct, "stepIdx", updated_at, logline, synopsis FROM projects ORDER BY updated_at DESC LIMIT 20');
    console.log('\n--- Recent Projects ---');
    res.rows.forEach(r => {
      console.log(`[${r.updated_at.toISOString()}] ${r.title.padEnd(20)} | Pct: ${String(r.pct).padStart(3)} | Step: ${r.stepIdx} | id: ${r.id}`);
      if (r.title.includes('훈민')) {
        console.log(`   >> Logline: ${r.logline ? 'OK' : 'MISSING'}, Synopsis: ${r.synopsis ? 'OK' : 'MISSING'}`);
      }
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

investigate();
