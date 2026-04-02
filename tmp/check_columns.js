const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres.stfonaiuxavzbqwikcqb:77!!supabasee@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      ORDER BY ordinal_position
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
