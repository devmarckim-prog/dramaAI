const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const samples = [
  {
    id: 'sample-chronos',
    title: '크로노스 스테이션 (SF 스릴러)',
    data: {
      id: 'sample-chronos',
      title: '크로노스 스테이션 (SF 스릴러)',
      genre: 'SF, 미스터리 스릴러',
      logline: '화성 궤도의 연구소, 24시간 동안 반복되는 죽음의 루프 속에서 유일하게 기억을 간직한 기술자의 사투.',
      synopsis: '2088년, 화성 궤도의 시간 연구소 "크로노스". 실험 오류로 기지의 모든 인원이 같은 하루를 반복한다. 매일 자정마다 폭발하는 기지에서 주인공 "재욱"만이 이전 루프를 기억하며 탈출구를 찾는다.',
      chars: [
        { name: '한재욱', role: '주연', desc: '냉정하지만 트라우마를 가진 수석 엔지니어.' },
        { name: '아이린', role: '주연', desc: '인간의 감정을 학습 중인 기지 제어 AI.' }
      ],
      scripts: [
        { title: '제1화: 00:00:01', story: '다시 시작되는 하루. 재욱은 기시감을 느끼며 잠에서 깬다.' },
        { title: '제2화: 오차의 증명', story: '동료들의 행동이 어제와 똑같음을 확인하고 경악하는 재욱.' }
      ],
      isVisible: true,
      pct: 100,
      status: 'done'
    }
  },
  {
    id: 'sample-noir',
    title: '검은 안개 (정통 누아르)',
    data: {
      id: 'sample-noir',
      title: '검은 안개 (정통 누아르)',
      genre: '범죄, 누아르',
      logline: '모든 것을 잃은 전직 형사와 세상을 지배하려는 범죄 조직의 끝을 알 수 없는 추격전.',
      synopsis: '부패한 도시 "성암". 누명을 쓰고 쫓겨난 형사 대팔은 의문의 여인으로부터 자신의 가족을 죽인 진범의 위치를 전해 듣는다. 안개가 자욱한 항구 도시에서 피의 복수가 시작된다.',
      chars: [
        { name: '강대팔', role: '주연', desc: '무뚝뚝하지만 주먹 하나는 확실한 전직 강력계 형사.' },
        { name: '유리아', role: '주연', desc: '속을 알 수 없는 팜므파탈. 대팔을 안갯속으로 끌어들인다.' }
      ],
      scripts: [
        { title: '제1화: 돌아온 유령', story: '죽은 줄 알았던 대팔이 안갯속에서 모습을 드러낸다.' },
        { title: '제2화: 위험한 거래', story: '리아는 대팔에게 거부할 수 없는 제안을 던진다.' }
      ],
      isVisible: true,
      pct: 100,
      status: 'done'
    }
  }
];

async function seed() {
  console.log('--- 🚀 Seeding Admin Samples (v0.1.113) ---');
  try {
    for (const s of samples) {
      await pool.query(
        'INSERT INTO samples (id, title, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, title = EXCLUDED.title',
        [s.id, s.title, s.data]
      );
      console.log(`✅ Seeded: ${s.id}`);
    }
    console.log('--- ✨ Seed Finished Correctly ---');
  } catch (err) {
    console.error('❌ Seed Failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
