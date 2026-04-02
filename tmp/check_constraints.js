const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkConstraints() {
  try {
    console.log('Checking constraints for table: projects...');
    const res = await pool.query(`
      SELECT 
        conname, 
        substring(pg_get_constraintdef(oid) from 'REFERENCES ([^(]+)') as referenced_table,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'projects'::regclass;
    `);
    
    console.log('--- Constraints on "projects" ---');
    res.rows.forEach(row => {
      console.log(`- ${row.conname}: ${row.definition}`);
    });
    
    const notNullRes = await pool.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'user_id';
    `);
    console.log('\n--- Column Nullability ---');
    console.log(`user_id is_nullable: ${notNullRes.rows[0].is_nullable}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();
