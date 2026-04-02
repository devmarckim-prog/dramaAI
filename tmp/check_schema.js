const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    console.log('Checking database schema for table: projects...');
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY column_name;
    `);
    
    console.log('--- Columns in "projects" table ---');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Check for critical columns
    const criticalColumns = ['status', 'pct', 'step_idx', 'inner_input', 'error_msg', 'scripts', 'chars', 'synopsis'];
    const existing = res.rows.map(r => r.column_name);
    
    console.log('\n--- Verification ---');
    criticalColumns.forEach(cc => {
      const found = existing.includes(cc) || existing.includes(cc.replace('_', ''));
      console.log(`[${found ? 'OK' : 'MISSING'}] ${cc}`);
    });
    
  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
