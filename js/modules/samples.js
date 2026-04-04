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
    { role: '남주', name: '조재헌', age: '34세', gender: '남성', job: '전 PD / 공동대표', personality: '직관과 감각으로 승부. 이야기 중심. 가끔 무모할 정도로 예술적 감수성을 앞세움.', looks: '캐주얼, 항상 목에 걸려있는 소니 헤드폰', secret: '지상파 시절 공들인 대작이 스탭의 실수로 공중분해된 트라우마가 있음', desire: '자신의 감각이 시대에 뒤떨어지지 않았음을 증명하는 것', lacking: '현실적인 비즈니스 감각과 숫자 데이터에 대한 공포' },
    { role: '여주', name: '오서영', age: '32세', gender: '여성', job: '전 대행사 대표 / 공동대표', personality: '숫자와 전략으로 승부. 완벽주의. 감정보다 효율을 중요시하는 냉철한 전략가.', looks: '세련된 오피스룩, 흐트러짐 없는 단발', secret: '사실은 엄청난 드라마 덕후이며 남몰래 웹소설을 연재 중임', desire: '수치로 완벽하게 통제 가능한 콘텐츠 제국을 건설하는 것', lacking: '타인의 감정에 공감하고 진심을 전달하는 화법' },
    { role: '조연', name: '한태오', age: '28세', gender: '남성', job: '막내 PD', personality: 'MZ 감각의 소유자. 엉뚱하지만 유행의 흐름을 본능적으로 읽어내는 아이디어맨.', looks: '트렌디한 스트릿 패션', secret: '금수저이지만 부모님의 도움 없이 성공하고 싶어함' },
    { role: '조연', name: '이다인', age: '29세', gender: '여성', job: '경쟁사 PM', personality: '서영의 라이벌. 과거 서영에게 밀린 트라우마가 있음. 재헌의 감각을 이용해 서영을 곤란하게 만들려 함.', looks: '화려하고 도발적인 스타일', secret: '과거 서영의 아이디어를 훔쳐서 성공한 적이 있음' }
  ],
  synopsis: `[발단: 추락한 두 천재의 만남]
한때 지상파 방송국의 "시청률 보증 수표"로 불리던 조재헌 PD. 그러나 무리한 연출과 막대한 제작비 투입 끝에 "대역전"이라는 대작이 방송 사고와 함께 침몰하며 업계에서 매장당한다. 한편, 업계 최고의 PPL 및 데이터 전략가였던 오서영은 완벽한 데이터 분석으로 승전보를 울려왔으나, 자신이 컨설팅한 모든 프로젝트가 "영혼 없다"는 비판과 함께 흥행 참패를 겪으며 대표직에서 물러나게 된다. 벼랑 끝에 몰린 두 사람이 서울 마포구 합정동의 허름한 폐창고를 개조한 "스튜디오 아레나"에서 공동대표라는 명목하에 마주하게 된다.

[전개: 감성과 이성의 격렬한 충돌]
재헌은 15초짜리 숏폼에서도 "서사(Narrative)"와 "진심"이 핵심이라며 한 땀 한 땀 장인정신으로 촬영하려 하고, 서영은 "숏폼은 3초 안에 시선을 끌지 못하면 쓰레기다"라며 데이터 알고리즘이 예측한 자극적인 포인트만 남기고 모두 쳐내려 한다. 두 사람은 제작비 10원 단위로 싸우고, 출연자 섭외 리스트를 두고 서로의 멱살을 잡을 듯이 대립한다. 하지만 재헌의 무모한 도전이 서영의 정밀한 서포트를 만나 뜻밖의 시너지를 내기 시작하고, 이들이 제작한 첫 번째 숏폼 오디션 프로그램 "넥스트 아이콘"이 MZ세대 사이에서 폭발적인 반응을 얻으며 잠들었던 업계의 주목을 받기 시작한다.

[위기: 과거의 그림자와 거대한 음모]
성공의 가도를 달리던 중, 서영의 라이벌인 이다인이 대형 플랫폼의 자본을 업고 나타나 "아레나"의 기술력을 탈취하려 한다. 설상가상으로 재헌의 과거 실패를 들먹이는 악의적인 기사들이 쏟아지고, 투자자들은 자금을 회수하겠다고 압박한다. 서영은 가장 효율적인 해결책으로 재헌과의 결별을 고민하게 되고, 재헌은 서영이 자신을 "데이터상의 에러"로 취급하고 있다는 오해에 깊은 상처를 입는다.

[절정: 숫자가 아닌 마음으로 쓰는 대본]
결승전 생방송 직전, 이다인의 공작으로 주요 데이터가 삭제되는 위기가 닥친다. 모두가 포기하려 할 때, 서영은 데이터가 아닌 재헌의 "감"을 믿기로 결심한다. 재헌 역시 서영이 지켜준 스튜디오의 "현실"을 위해 자신의 아집을 꺾고 서영이 설계한 전략적 연출에 몸을 던진다. 두 사람은 서로의 결핍을 완벽하게 채워주는 "최적의 알고리즘"이 바로 서로였음을 깨닫는다.

[결말: 아레나의 진정한 시작]
"넥스트 아이콘"은 전례 없는 성공을 거두며 재헌은 명예 회복에 성공하고, 서영은 "마음의 수치화"가 가능하다는 새로운 가설을 세우며 업계의 전설이 된다. 두 사람은 합정동 창고에서 서로의 눈을 바라보며 다음 시즌의 큐 사인을 외친다. "드라마는 엑셀이 아니지만, 당신과 함께라면 성공 공식은 필요 없겠어."`,
  conflicts: [
    { type: '가치관/철학', character: '조재헌 vs 오서영', desc: '예술적 완성도와 이야기의 진심을 중요시하는 PD와, 데이터 기반의 효율성과 수익성을 최우선하는 전략가 사이의 세계관 충돌.' },
    { type: '과거와 현재', character: '조재헌 vs 트라우마', desc: '과거의 대작패배가 주는 공포감과, 다시 한번 사람들에게 인정받고 싶어하는 창작자로서의 욕망 사이의 내적 투쟁.' },
    { type: '라이벌/경쟁', character: '오서영 vs 이다인', desc: '과거의 동료이자 현재의 라이벌인 이다인의 교묘한 기술 유출 시도와 인재 영입 방해 등 시장 주도권을 둘러싼 치열한 비즈니스 전쟁.' },
    { type: '현실과 이상', character: '아레나 vs 플랫폼/투자사', desc: '독창적인 콘텐츠를 만들고 싶어하는 스튜디오의 정체성과, 안정적인 수익만 요구하는 플랫폼 대기업의 갑질 사이의 생존 갈등.' },
    { type: '감정적 혼란', character: '조재헌 & 오서영', desc: '비즈니스 파트너로서의 신뢰가 깊어짐에 따라 생기는 낯선 연애 감정이 업무적 판단을 흐리게 할까 두려워하는 복합적인 감정 정체.' }
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
    { industry: 'IT/가전', item: '최신형 스마트폰', scene: '재헌의 촬영장 모니터링 씬', revenue: 50000000 },
    { industry: '식음료', item: '기능성 에너지 드링크', scene: '편집실 밤샘 작업 씬', revenue: 30000000 },
    { industry: '패션', item: '디자이너 브랜드 협찬', scene: '서영의 투자자 미팅 씬', revenue: 45000000 }
  ],
  episodes: [
    {
      episode: 1,
      title: '1화: 불협화음의 시작',
      story: '과거 스타 PD였던 재헌과 잘나가던 대행사 대표 서영이 공동대표로 만나게 된다. 첫 만남부터 제작 방식을 두고 크게 싸우지만, 당장 제작비가 급한 상황에서 울며 겨자 먹기로 손을 잡는다.',
      ending: '서로 절대로 안 맞을 거라 확신하며 돌아서는 찰나, 투자사로부터 "두 사람이 같이 안 하면 투자 못 한다"는 통보를 동시에 받는다.',
      scenes: [
        { num: 1, place: 'INT. 아레나 스튜디오 - 낮', time: '낮', desc: '재헌과 서영의 최악의 첫만남. 계약조건을 두고 설전을 벌임.' },
        { num: 2, place: 'EXT. 합정동 거리 - 저녁', time: '저녁', desc: '각자 술을 마시며 상대방 뒷담화를 하다가 우연히 마주치고 외면함.' }
      ]
    },
    {
      episode: 2,
      title: '2화: 숫자와 감성 사이',
      story: '본격적인 오디션 기획에 착수한다. 재헌은 출연자의 사연을 강조하고 싶어 하고, 서영은 조회수가 나올만한 자극적인 구성을 요구한다. 한태오의 중재로 묘안을 찾아내려 노력한다.',
      ending: '재헌이 숨겨왔던 과거의 비밀 프로젝트 파일을 서영이 발견하게 된다.',
      scenes: [
        { num: 1, place: 'INT. 회의실 - 오전', time: '낮', desc: '화이트보드를 가득 채운 서영의 데이터와 재헌의 콘셉트 드로잉이 충돌함.' },
        { num: 2, place: 'INT. 대표실 - 밤', time: '밤', desc: '서영이 퇴근하려다 재헌의 컴퓨터에서 의문의 폴더를 열어봄.' }
      ]
    },
    {
      episode: 3,
      title: '3화: 첫 번째 오디션',
      story: '드디어 <아레나>의 첫 번째 예심이 시작된다. 예상치 못한 빌런 참가자의 등장으로 촬영장은 아수라장이 되고, 서영은 이를 노이즈 마케팅으로 이용하려 하지만 재헌은 참가자의 인권을 보호해야 한다며 맞선다.',
      ending: '빌런 참가자가 재헌에게 폭언을 퍼붓고, 뜻밖에도 서영이 재헌을 대신해 참가자에게 시원하게 일갈한다.',
      scenes: [
        { num: 1, place: 'INT. 오디션 세트장 - 낮', time: '낮', desc: '심사위원들과 참가자들 사이의 팽팽한 긴장감과 돌발 상황.' },
        { num: 2, place: 'INT. 복도 - 저녁', time: '저녁', desc: '서영이 참가자를 몰아세우며 재헌을 방어하는 의외의 모습.' }
      ]
    }
  ],
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

// Dynamic Sample Cache to handle more than the two defaults
// Initialized with hardcoded defaults for safety (v0.23)
export let SAMPLES_CACHE = [
  { ...DIRECTORS_ARENA_SAMPLE, is_sample: true },
  { ...SEOUL_NIGHT_SAMPLE, is_sample: true }
];

export async function syncSamplesFromServer() {
  try {
    const res = await fetch('/api/samples'); 
    if (!res.ok) return;
    
    const samples = await res.json();
    if (!Array.isArray(samples)) return;

    SAMPLES_CACHE = samples.map(s => ({
      ...(s.data || {}), 
      id: s.id, 
      title: s.title || (s.data && s.data.title),
      is_sample: true
    }));
    
    // Update legacy references for backward compatibility if they exist in the DB
    const arena = SAMPLES_CACHE.find(s => s.id === 'sample-arena');
    const seoul = SAMPLES_CACHE.find(s => s.id === 'sample-seoul');
    if (arena) DIRECTORS_ARENA_SAMPLE = arena;
    if (seoul) SEOUL_NIGHT_SAMPLE = seoul;
    
    console.log(`[Samples] ${SAMPLES_CACHE.length} samples synced from database.`);
  } catch (err) {
    console.warn('[Samples] Sync failed, using hardcoded defaults.', err);
  }
}

// ✅ 어드민에서 저장 시 메모리 내 샘플 데이터 즉시 반영
window.addEventListener('sample-updated', (e) => {
  const { id, title, data } = e.detail;
  if (!id || !data) return;
  const merged = { ...data, id, title: title || data.title, is_sample: true };
  
  // 1. Update Legacy specific refs
  if (id === 'sample-arena') DIRECTORS_ARENA_SAMPLE = merged;
  if (id === 'sample-seoul') SEOUL_NIGHT_SAMPLE = merged;

  // 2. Update Dynamic Cache
  const idx = SAMPLES_CACHE.findIndex(s => s.id === id);
  if (idx !== -1) {
    SAMPLES_CACHE[idx] = merged;
  } else {
    SAMPLES_CACHE.push(merged);
  }
  
  console.log(`[Samples] In-memory update for sample: ${id} (${title})`);
  
  // 3. Trigger a main UI refresh if we're on the projects page
  if (window.renderProjectCards) {
     window.renderProjectCards();
  }
});


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
