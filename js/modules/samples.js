/**
 * Sample Project Data for DramaScript AI
 * Now synced with Supabase DB if available.
 */

export let DIRECTORS_ARENA_SAMPLE = {
  id: 'sample-arena',
  title: '디렉터즈 아레나',
  platform: 'OTT 오리지널',
  genre: '로맨틱 코미디',
  episodes: 8,
  runtime: 60,
  era: '현대 (2024년)',
  target: '25~35세 직장인·콘텐츠 종사자',
  setting: '서울 마포구 합정동 아레나 스튜디오 외',
  logline: '전직 스튜디오 룰루랄라 PD 조재헌과 전직 PPL 대행사 대표 오서영 - 감각 vs 전략, 이야기 vs 숫자. 완전히 다른 두 사람이 숏폼 오디션 프로그램을 함께 만들며 매일 충돌하고, 그 충돌 속에서 서로가 서로의 빠진 조각임을 알아가는 로맨스.',
  characters: [
    { role: '남주', name: '조재헌', age: '34세', gender: '남성', job: '전 PD / 공동대표', personality: '직관과 감각으로 승부. 이야기 중심.', looks: '캐주얼, 헤드폰' },
    { role: '여주', name: '오서영', age: '32세', gender: '여성', job: '전 대행사 대표 / 공동대표', personality: '숫자와 전략으로 승부. 완벽주의.', looks: '정장, 깔끔함' },
    { role: '조연', name: '한태오', age: '28세', gender: '남성', job: '막내 PD', personality: 'MZ 감각. 엉뚱 아이디어맨.', looks: '트렌디함' },
    { role: '조연', name: '이다인', age: '29세', gender: '여성', job: '경쟁사 PM', personality: '서영의 라이벌. 재헌에게 접근.', looks: '세련됨' }
  ],
  synopsis: '조재헌과 오서영이 의기투합해 숏폼 오디션 프로그램을 만들며 벌어지는 일과 사랑의 이야기. 감각적인 연출을 고집하는 재헌과 철저한 상업성을 따지는 서영은 사사건건 부딪히지만, 결국 서로의 장점을 흡수하며 최고의 프로그램을 만들어낸다.',
  conflicts: [
    { type: '가치관 충돌', character: '조재헌 vs 오서영', desc: '예술지상주의 PD와 데이터 중심 전략가의 사사건건 충돌.' },
    { type: '외부 압박', character: '아레나 스튜디오 vs 투자자', desc: '시청률 부진에 따른 제작 중단 위기와 추가 펀딩 난항.' }
  ],
  stats: {
    budget: 4800000000,
    ppl: 1200000000,
    net: 3600000000,
    budgetBreakdown: [
      { ep: 1, budget: 620000000 }, { ep: 2, budget: 580000000 }, { ep: 3, budget: 550000000 }, { ep: 4, budget: 650000000 },
      { ep: 5, budget: 590000000 }, { ep: 6, budget: 600000000 }, { ep: 7, budget: 610000000 }, { ep: 8, budget: 600000000 }
    ]
  },
  ppl: [
    { industry: 'IT/가전', item: '최신형 스마트폰', scene: '재헌의 촬영장', revenue: 50000000 },
    { industry: '식음료', item: '기능성 에너지 드링크', scene: '편집실 밤샘 작업', revenue: 30000000 },
    { industry: '패션', item: '디자이너 브랜드 협찬', scene: '서영의 미팅', revenue: 45000000 }
  ],
  episodes: Array.from({ length: 8 }, (_, i) => ({
    episode: i + 1,
    title: `${i + 1}화: ${['불협화음의 시작', '숫자와 감성 사이', '첫 번째 오디션', '위기의 중간 점검', '뜻밖의 로맨스', '반전의 연속', '최후의 승부', '우리의 아레나'][i]}`,
    story: `에피소드 ${i + 1}의 요약 줄거리입니다. 재헌과 서영이 프로그램을 준비하며 겪는 갈등과 성장을 다룹니다.`,
    ending: `다음 화를 기대하게 만드는 ${i + 1}화의 엔딩 포인트.`
  })),
  input: {},
  status: 'done',
  pct: 100,
  createdAt: '2024.03.27',
  stepIdx: 7
};

export let SEOUL_NIGHT_SAMPLE = {
  id: 'sample-seoul',
  title: '서울의 밤 (Seoul Night)',
  platform: '글로벌 OTT',
  genre: '범죄 스릴러',
  episodes: 12,
  runtime: 50,
  era: '현대',
  target: '성인 남성·스릴러 매니아',
  setting: '서울 동대문 뒷골목 외',
  logline: '낮에는 성실한 배달원, 밤에는 베일에 싸인 정보원 - 서울의 지하 세계를 배경으로 펼쳐지는 처절한 복수와 추격을 그린 누아르 스릴러.',
  characters: [
    { role: '남주', name: '이강호', age: '32세', gender: '남성', job: '배달 대행 / 정보원', personality: '침착하고 냉정함. 생존 본능 탁월.', looks: '날카로운 인상, 바이크 수트' },
    { role: '여주', name: '김민주', age: '28세', gender: '여성', job: '마약반 형사', personality: '강한 정의감. 현장 중심.', looks: '활동적인 스타일, 예리한 눈빛' }
  ],
  synopsis: '배달원 강호가 우연히 거대 조직의 비밀을 알게 되며 벌어지는 추격전과 그 속에 감춰진 10년 전 사건의 진실. 그는 밤마다 서울의 어둠 속을 누비며 자신을 나락으로 밀어넣었던 이들을 하나씩 찾아나선다.',
  conflicts: [
    { type: '정체성 위기', character: '강호', desc: '정보원으로서의 삶과 평범한 배달원 사이에서의 괴리감.' },
    { type: '추격', character: '강호 vs 조직', desc: '과거의 동료들이 이제는 목숨을 노리는 적이 되어 좁혀오는 포위망.' }
  ],
  stats: {
    budget: 12000000000,
    ppl: 2500000000,
    net: 9500000000,
    budgetBreakdown: Array.from({ length: 12 }, (_, i) => ({ ep: i + 1, budget: 1000000000 }))
  },
  ppl: [
    { industry: '자동차', item: '다크 바이크 / 세단', scene: '심야 추격전', revenue: 200000000 },
    { industry: '패션', item: '테크웨어 아웃도어', scene: '잠입 액션', revenue: 80000000 }
  ],
  episodes: Array.from({ length: 12 }, (_, i) => ({
    episode: i + 1,
    title: `${i + 1}화: 어둠의 시작`,
    story: `강호가 조직의 비밀을 파헤치는 ${i + 1}화의 내용.`,
    ending: `충격적인 반전의 ${i + 1}화 엔딩.`
  })),
  input: {},
  status: 'done',
  pct: 100,
  createdAt: '2024.03.28',
  stepIdx: 7
};

export async function syncSamplesFromServer() {
  try {
    const res = await fetch('/api/samples'); 
    if (!res.ok) return;
    
    const samples = await res.json();
    
    // Server data is always preferred if available
    const arena = samples.find(s => s.id === 'sample-arena');
    const seoul = samples.find(s => s.id === 'sample-seoul');
    
    if (arena) {
      DIRECTORS_ARENA_SAMPLE = { 
        ...(arena.data || {}), 
        id: arena.id, 
        title: arena.title || (arena.data && arena.data.title) 
      };
    }
    if (seoul) {
      SEOUL_NIGHT_SAMPLE = { 
        ...(seoul.data || {}), 
        id: seoul.id, 
        title: seoul.title || (seoul.data && seoul.data.title) 
      };
    }
    
    console.log('[Samples] Synced from database successfully.');
  } catch (err) {
    console.warn('[Samples] Sync failed, using hardcoded defaults.', err);
  }
}

export const CAST_DATA_BASE = [
  { name: '주인공1', role: '주연 여주', av: 'av-g', init: '여', desc: '깜찍발랄한 캐릭터', actors: [
    { name: '박은빈', detail: '30세 · 코믹·감성 최정상', fee: '회당 2,500만원', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face' },
    { name: '이유미', detail: '30세 · OTT 친화적', fee: '회당 1,800만원', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face' }
  ]},
  { name: '주인공2', role: '주연 남주', av: 'av-p', init: '남', desc: '냉철한 완벽주의', actors: [
    { name: '변우석', detail: '31세 · 현재 최고 인기', fee: '회당 3,000만원', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face' },
    { name: '채종협', detail: '32세 · 완벽주의 최적', fee: '회당 2,200만원', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face' }
  ]}
];
