/**
 * Sample Project Data for DramaScript AI
 * Now synced with Supabase DB if available.
 */

export let DIRECTORS_ARENA_SAMPLE = {
  id: 'sample-arena',
  title: '디렉터스 아레나',
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
  synopsis: '조재헌과 오서영이 의기투합해 숏폼 오디션 프로그램을 만들며 벌어지는 일과 사랑의 이야기.',
  input: {},
  ppl: [],
  stats: {},
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
  synopsis: '배달원 강호가 우연히 거대 조직의 비밀을 알게 되며 벌어지는 추격전과 그 속에 감춰진 10년 전 사건의 진실.',
  input: {},
  ppl: [],
  stats: {},
  status: 'done',
  pct: 100,
  createdAt: '2024.03.28',
  stepIdx: 7
};

export async function syncSamplesFromServer() {
  try {
    const res = await fetch('/api/samples'); // Corrected to public endpoint
    if (!res.ok) return;
    
    const samples = await res.json();
    const arena = samples.find(s => s.id === 'sample-arena');
    const seoul = samples.find(s => s.id === 'sample-seoul');
    
    if (arena) DIRECTORS_ARENA_SAMPLE = { ...arena.data, id: arena.id, title: arena.title };
    if (seoul) SEOUL_NIGHT_SAMPLE = { ...seoul.data, id: seoul.id, title: seoul.title };
    
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
