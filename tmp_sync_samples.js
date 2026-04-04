const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DIRECTORS_ARENA_SAMPLE = {
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
    { role: '남주', name: '조재헌', age: '34세', gender: '남성', job: '전 PD / 공동대표', personality: '직관과 감각으로 승부. 이야기 중심. 가끔 무모할 정도로 예술적 감수성을 앞세움.', looks: '캐주얼, 항상 목에 걸려있는 소니 헤드폰' },
    { role: '여주', name: '오서영', age: '32세', gender: '여성', job: '전 대행사 대표 / 공동대표', personality: '숫자와 전략으로 승부. 완벽주의. 감정보다 효율을 중요시하는 냉철한 전략가.', looks: '세련된 오피스룩, 흐트러짐 없는 단발' },
    { role: '조연', name: '한태오', age: '28세', gender: '남성', job: '막내 PD', personality: 'MZ 감각의 소유자. 엉뚱하지만 유행의 흐름을 본능적으로 읽어내는 아이디어맨.', looks: '트렌디한 스트릿 패션' },
    { role: '조연', name: '이다인', age: '29세', gender: '여성', job: '경쟁사 PM', personality: '서영의 라이벌. 과거 서영에게 밀린 트라우마가 있음. 재헌의 감각을 이용해 서영을 곤란하게 만들려 함.', looks: '화려하고 도발적인 스타일' }
  ],
  synopsis: '조재헌과 오서영은 각자의领域에서 최고였으나 한순간의 실수로 바닥까지 추락한다. 두 사람은 마지막 기회로 숏폼 오디션 프로그램 <아레나>를 기획하게 된다. "콘텐츠는 예술"이라는 재헌과 "콘텐츠는 상품"이라는 서영은 매 순간 격렬하게 부딪힌다. 하지만 제작비 부족, 투자 철회 등 외부의 위기 속에서 서로의 결핍을 채워주며 진정한 파트너로 거듭난다. 그 과정에서 발견하는 것은 단순한 성공이 아닌, 서로에 대한 깊은 신뢰와 사랑이다.',
  conflicts: [
    { type: '가치관 충돌', character: '조재헌 vs 오서영', desc: '예술지상주의 PD와 데이터 중심 전략가의 크리에이티브 방향성을 둘러싼 사사건건 충돌.' },
    { type: '내적 갈등', character: '조재헌', desc: '과거 대역전극 실패에 대한 트라우마와 자신의 감각에 대한 불안함 사이의 투쟁.' },
    { type: '내적 갈등', character: '오서영', desc: '완벽해야 한다는 강박과 처음 느껴보는 재헌에 대한 낯선 감정 사이의 혼란.' },
    { type: '외부 압박', character: '아레나 스튜디오 vs 이다인', desc: '라이벌 이다인의 교묘한 방해 공작과 대형 플랫폼의 갑질로 인한 제작 중단 위기.' }
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
  pct: 100,
  status: 'done',
  isVisible: true
};

async function sync() {
  console.log('Pushing high-fidelity sample to DB...');
  const { error } = await supabase
    .from('samples')
    .upsert({ 
      id: 'sample-arena', 
      title: DIRECTORS_ARENA_SAMPLE.title, 
      data: DIRECTORS_ARENA_SAMPLE 
    });

  if (error) {
    console.error('Error syncing:', error);
  } else {
    console.log('Successfully synced Director\'s Arena sample!');
  }
  process.exit(0);
}

sync();
