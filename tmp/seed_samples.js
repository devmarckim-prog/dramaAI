const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const samples = [
  {
    id: 'sample-arena',
    title: '디렉터즈 아레나',
    data: {
      id: 'sample-arena',
      title: '디렉터즈 아레나',
      platform: 'OTT 오리지널',
      genre: '로맨틱 코미디',
      episodes: 8,
      runtime: 60,
      era: '현대 (2024년)',
      target: '25~35세 직장인·콘텐츠 종사자',
      setting: '서울 마포구 합정동 아레나 스튜디오 외',
      logline: '전직 스튜디오 룰루랄라 PD 조재헌과 전직 PPL 대행사 대표 오서영 - 완전히 다른 두 사람이 숏폼 오디션 프로그램을 함께 만들며 서로의 빠진 조각임을 알아가는 로맨스.',
      characters: [
        { role: '남주', name: '조재헌', age: '34세', gender: '남성', job: '전 PD / 공동대표', personality: '직관과 감각으로 승부', looks: '캐주얼' },
        { role: '여주', name: '오서영', age: '32세', gender: '여성', job: '전 대행사 대표', personality: '숫자와 전략으로 승부', looks: '정장' }
      ],
      synopsis: '감각적인 조재헌과 상업적인 오서영이 의기투합해 숏폼 오디션 프로그램을 만들며 벌어지는 일과 사랑의 이야기.',
      conflicts: [
        { type: '가치관 충돌', character: '조재헌 vs 오서영', desc: '예술지상주의 PD와 데이터 중심 전략가의 사사건건 충돌.' },
        { type: '외부 압박', character: '아레나 스튜디오 vs 투자자', desc: '시청률 부진에 따른 제작 중단 위기와 추가 펀딩 난항.' }
      ],
      stats: {
        budget: 4800000000, ppl: 1200000000, net: 3600000000,
        budgetBreakdown: [
          { ep: 1, budget: 600000000 }, { ep: 2, budget: 600000000 }, { ep: 3, budget: 600000000 }, { ep: 4, budget: 600000000 },
          { ep: 5, budget: 600000000 }, { ep: 6, budget: 600000000 }, { ep: 7, budget: 600000000 }, { ep: 8, budget: 600000000 }
        ]
      },
      ppl: [
        { industry: 'IT/가전', item: '스마트폰', scene: '촬영장', revenue: 50000000 }
      ],
      episodes: Array.from({length: 8}, (_, i) => ({ episode: i+1, title: `${i+1}화: 갈등의 서막`, story: `오디션 프로그램을 기획하는 두 사람의 충돌.`, ending: `의외의 시너지 폭발.` })),
      isVisible: true,
      pct: 100,
      status: 'done',
      createdAt: '2024.03.27',
      stepIdx: 7
    }
  },
  {
    id: 'sample-seoul',
    title: '서울의 밤 (Seoul Night)',
    data: {
      id: 'sample-seoul',
      title: '서울의 밤 (Seoul Night)',
      platform: '글로벌 OTT',
      genre: '범죄 스릴러',
      episodes: 12,
      runtime: 50,
      era: '현대 (2024년)',
      target: '30~45세 장르물 마니아',
      setting: '서울 도심 및 강남 뒷골목',
      logline: '낮에는 평범한 변호사지만, 밤이 되면 억울한 자들을 위해 그림자 재판국을 여는 다크 히어로의 처절한 복수극.',
      characters: [
        { role: '남주', name: '강도진', age: '35세', gender: '남성', job: '로펌 변호사', personality: '이중적, 치밀함', looks: '슈트핏' },
        { role: '여주', name: '이수연', age: '30세', gender: '여성', job: '광역수사대 형사', personality: '원칙주의자', looks: '활동복' }
      ],
      synopsis: '법이 해결하지 못한 사회악들을 자신만의 방식으로 처단하는 강도진과, 그를 쫓으면서도 그의 정의에 공감하게 되는 형사 이수연의 이야기.',
      conflicts: [
        { type: '내면의 갈등', character: '강도진', desc: '개인적 복수와 대의적 정의 사이에서의 고뇌.' },
        { type: '추격전', character: '강도진 vs 경찰', desc: '이수연의 포위망이 점점 좁혀오는 상황.' }
      ],
      stats: {
        budget: 12000000000, ppl: 2000000000, net: 10000000000,
        budgetBreakdown: [
          { ep: 1, budget: 1000000000 }, { ep: 2, budget: 1000000000 }, { ep: 3, budget: 1000000000 }, { ep: 4, budget: 1000000000 },
          { ep: 5, budget: 1000000000 }, { ep: 6, budget: 1000000000 }, { ep: 7, budget: 1000000000 }, { ep: 8, budget: 1000000000 },
          { ep: 9, budget: 1000000000 }, { ep: 10, budget: 1000000000 }, { ep: 11, budget: 1000000000 }, { ep: 12, budget: 1000000000 }
        ]
      },
      ppl: [
        { industry: '자동차', item: '다크 세단', scene: '심야 추격전', revenue: 200000000 }
      ],
      episodes: Array.from({length: 12}, (_, i) => ({ episode: i+1, title: `${i+1}화: 그림자 처판`, story: `어둠의 방식으로 범죄자를 심판.`, ending: `수사망이 점점 조여온다.` })),
      isVisible: true,
      pct: 100,
      status: 'done',
      createdAt: '2024.03.28',
      stepIdx: 7
    }
  },
  {
    id: 'sample-chronos',
    title: '크로노스 스테이션 (SF 스릴러)',
    data: {
      id: 'sample-chronos',
      title: '크로노스 스테이션 (SF 스릴러)',
      platform: '글로벌 OTT',
      genre: 'SF, 미스터리 스릴러',
      episodes: 8,
      runtime: 45,
      era: '2088년 근미래',
      target: '20~40세 테크 마니아',
      setting: '화성 궤도 우주 연구소',
      logline: '화성 궤도의 연구소, 24시간 동안 반복되는 죽음의 루프 속에서 유일하게 기억을 간직한 기술자의 사투.',
      synopsis: '2088년, 화성 궤도의 시간 연구소 "크로노스". 실험 오류로 기지의 모든 인원이 같은 하루를 반복한다. 매일 자정마다 폭발하는 기지에서 주인공 "재욱"만이 이전 루프를 기억하며 탈출구를 찾는다.',
      characters: [
        { name: '한재욱', role: '주연', desc: '냉정하지만 트라우마를 가진 수석 엔지니어. 무한 루프의 진실을 파헤친다.', age: '35세', gender: '남성' },
        { name: '아이린', role: '주연', desc: '인간의 감정을 학습 중인 기지 제어 AI. 루프의 비밀을 안다.', age: 'AI', gender: '여성' }
      ],
      conflicts: [
        { type: '추리/미스터리', character: '한재욱 vs 시스템', desc: '루프를 강제하는 기지 중앙 통제 시스템과의 치열한 두뇌 싸움.' },
        { type: '신뢰', character: '재욱 vs 동료들', desc: '내일을 모르는 동료들을 설득하여 함께 폭발을 막아야 한다.' }
      ],
      stats: {
        budget: 16000000000, ppl: 1500000000, net: 14500000000,
        budgetBreakdown: [
          { ep: 1, budget: 2000000000 }, { ep: 2, budget: 2000000000 }, { ep: 3, budget: 2000000000 }, { ep: 4, budget: 2000000000 },
          { ep: 5, budget: 2000000000 }, { ep: 6, budget: 2000000000 }, { ep: 7, budget: 2000000000 }, { ep: 8, budget: 2000000000 }
        ]
      },
      ppl: [
        { industry: 'IT', item: '미래형 VR 고글', scene: '시스템 제어', revenue: 150000000 }
      ],
      episodes: Array.from({length: 8}, (_, i) => ({ episode: i+1, title: `${i+1}화: ${i === 0 ? '00:00:01' : '루프의 법칙'}`, story: `다시 시작되는 하루. 재욱은 폭발의 단서를 찾아 해맨다.`, ending: `실패 그리고 또 다른 하루의 시작.` })),
      isVisible: true,
      pct: 100,
      status: 'done',
      createdAt: '2024.03.29',
      stepIdx: 7
    }
  },
  {
    id: 'sample-noir',
    title: '검은 안개 (정통 누아르)',
    data: {
      id: 'sample-noir',
      title: '검은 안개 (정통 누아르)',
      platform: '케이블TV',
      genre: '범죄, 누아르',
      episodes: 16,
      runtime: 70,
      era: '현대 (가상의 항구도시)',
      target: '30~50세 장르물 선호',
      setting: '부패한 항구 도시 성암시',
      logline: '모든 것을 잃은 전직 형사와 세상을 지배하려는 범죄 조직의 끝을 알 수 없는 추격전.',
      synopsis: '부패한 도시 "성암". 누명을 쓰고 쫓겨난 형사 대팔은 의문의 여인으로부터 자신의 가족을 죽인 진범의 위치를 전해 듣는다. 안개가 자욱한 항구 도시에서 피의 복수가 시작된다.',
      characters: [
        { name: '강대팔', role: '주연', desc: '무뚝뚝하지만 주먹 하나는 확실한 전직 강력계 형사.', age: '42세', gender: '남성' },
        { name: '유리아', role: '주연', desc: '속을 알 수 없는 팜므파탈. 대팔을 안갯속으로 끌어들인다.', age: '29세', gender: '여성' }
      ],
      conflicts: [
        { type: '복수', character: '강대팔 vs 범죄조직', desc: '배후를 찾아 하나씩 처단해나가는 강대팔의 여정.' },
        { type: '배신', character: '대팔 vs 옛 동료', desc: '과거 형사 시절 믿었던 동료들의 배신과 부패.' }
      ],
      stats: {
        budget: 9600000000, ppl: 800000000, net: 8800000000,
        budgetBreakdown: [
          { ep: 1, budget: 600000000 }, { ep: 2, budget: 600000000 }, { ep: 3, budget: 600000000 }, { ep: 4, budget: 600000000 },
          { ep: 5, budget: 600000000 }, { ep: 6, budget: 600000000 }, { ep: 7, budget: 600000000 }, { ep: 8, budget: 600000000 },
          { ep: 9, budget: 600000000 }, { ep: 10, budget: 600000000 }, { ep: 11, budget: 600000000 }, { ep: 12, budget: 600000000 },
          { ep: 13, budget: 600000000 }, { ep: 14, budget: 600000000 }, { ep: 15, budget: 600000000 }, { ep: 16, budget: 600000000 }
        ]
      },
      ppl: [
        { industry: '주류', item: '프리미엄 위스키', scene: '바에서 리아와의 만남', revenue: 80000000 }
      ],
      episodes: Array.from({length: 16}, (_, i) => ({ episode: i+1, title: `${i+1}화: ${i === 0 ? '돌아온 유령' : '위험한 거래'}`, story: `복수를 향해 한 걸음씩 다가가는 대팔, 새로운 적과 마주친다.`, ending: `피할 수 없는 전면전의 시작.` })),
      isVisible: true,
      pct: 100,
      status: 'done',
      createdAt: '2024.03.30',
      stepIdx: 7
    }
  }
];

async function seed() {
  console.log('--- 🚀 Seeding Rich Admin Samples ---');
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
