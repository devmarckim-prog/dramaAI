const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL 연결 정보 (DATABASE_URL)
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Supabase Direct 접속에 필요
  }
});

/**
 * 전용 SQL 실행 엔진: 테이블 생성, 스키마 수정 등 모든 작업을 지원합니다.
 * @param {string} text - SQL 쿼리문
 * @param {Array} params - 쿼리 파라미터
 * @returns {Promise<any>} 쿼리 결과
 */
async function runQuery(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📡 [DB Admin] Query Executed (${duration}ms):`, text.substring(0, 50));
    return res.rows;
  } catch (err) {
    console.error('❌ [DB Admin] Query Error:', err.message);
    throw err;
  }
}

module.exports = {
  runQuery,
  pool
};
