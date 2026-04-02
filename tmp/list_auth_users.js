const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function listAuthUsers() {
  try {
    const res = await pool.query('SELECT id, email FROM auth.users LIMIT 10');
    console.log('--- Auth Users Found ---');
    res.rows.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id})`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

listAuthUsers();
