const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const GLOBAL_GUEST_UUID = 'e098bba0-8c4e-41c6-8149-41efd79854dc'; // dev.marckim@gmail.com

async function runProof() {
  const testId = 'g-test-' + Date.now();
  console.log('--- 🚀 Starting Generation Proof (v0.1.111) ---');
  console.log('Project ID:', testId);

  try {
    // 1. Initial Insert
    console.log('\n[1/3] Testing Initial Insert...');
    const initialPayload = {
      id: testId,
      user_id: GLOBAL_GUEST_UUID,
      title: '테스트 프로젝트',
      genre: '드라마',
      status: 'generating',
      pct: 5,
      stepIdx: 0,
      updated_at: new Date().toISOString()
    };
    
    const keys = Object.keys(initialPayload);
    const dbKeys = keys.map(k => {
      if (k === 'stepIdx') return '"stepIdx"';
      return k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    });
    
    const quotedKeys = dbKeys.map(k => k.includes('"') ? k : `"${k}"`).join(', ');
    const markers = keys.map((_, i) => `$${i + 1}`).join(', ');
    const vals = Object.values(initialPayload).map(v => (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v);

    await pool.query(`INSERT INTO projects (${quotedKeys}) VALUES (${markers})`, vals);
    console.log('✅ Initial Insert Success');

    // 2. Testing Update Loop (Simulating Steps)
    console.log('\n[2/3] Testing Update Logic (Step 0 to 4)...');
    const simulateStep = async (step, pct, data) => {
      const payload = { ...data, pct, stepIdx: step + 1, updated_at: new Date().toISOString() };
      const uKeys = Object.keys(payload);
      const uVals = Object.values(payload).map(v => (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v);
      const uDbKeys = uKeys.map(k => {
        if (k === 'stepIdx') return '"stepIdx"';
        return k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      });
      const sets = uDbKeys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      await pool.query(`UPDATE projects SET ${sets} WHERE id = $1`, [testId, ...uVals]);
      console.log(`✅ Step ${step} Update Success (pct: ${pct}%)`);
    };

    await simulateStep(0, 20, { title: 'AI 제안 제목', logline: '테스트 로그라인' });
    await simulateStep(1, 45, { synopsis: '테스트 시놉시스 내용입니다.' });
    await simulateStep(2, 70, { chars: [{ name: '철수', role: '남주' }] });
    await simulateStep(3, 90, { scripts: [{ ep: 1, title: '시작' }] });
    await simulateStep(4, 100, { status: 'done' });

    // 3. Final Verification
    console.log('\n[3/3] Verifying Final DB State...');
    const res = await pool.query('SELECT * FROM projects WHERE id = $1', [testId]);
    const final = res.rows[0];
    
    if (final && final.status === 'done' && final.pct === 100 && (final.title === 'AI 제안 제목' || final.title === '테스트 프로젝트')) {
      console.log('✅ Final Verification SUCCESS!');
      console.log('Project in DB:', {
        id: final.id,
        status: final.status,
        pct: final.pct,
        stepIdx: final.stepIdx,
        updated_at: final.updated_at
      });
    } else {
      console.log('Actual Final Record:', final);
      throw new Error('Final state does not match expected values');
    }

    // Cleanup
    await pool.query('DELETE FROM projects WHERE id = $1', [testId]);
    console.log('\n--- ✨ Proof Completed Successfully ---');

  } catch (err) {
    console.error('\n❌ Proof FAILED:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
  } finally {
    await pool.end();
  }
}

runProof();
