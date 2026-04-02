const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function listUsers() {
  try {
    const res = await pool.query('SELECT id, email FROM users');
    console.log('--- Users in Database ---');
    res.rows.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id})`);
    });
    
    if (res.rows.length === 0) {
      console.log('No users found in "users" table.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

listUsers();
