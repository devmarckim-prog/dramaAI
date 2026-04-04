require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const projectId = 'p-82f06-1775136734921';

const conflicts = [
  { type: '가치관/철학', character: '이진수 vs 한복순', desc: "군대식 '까라면 까' 정신의 장군과, 주방의 실전 규칙을 고수하는 베테랑 주방장의 자존심 대결." },
  { type: '사회적 편견', character: '이진수 vs 세상', desc: "한때의 4성 장군이 '백수 할아버지'로 취급받는 비참한 현실과 그에 따른 자존감 하락." },
  { type: '로맨틱 갈등', character: '이진수 vs 사토 유카', desc: "임진왜란의 성웅을 자칭하는 장군과, 섬세하고 다정한 일본 요리 연구가 사이의 역사적·개인적 호감 사이의 혼란." },
  { type: '생존 갈등', character: '횟집 vs 프랜차이즈', desc: "장정들의 땀이 밴 전통 횟집을 무너뜨리려는 거대 자본의 공격에 맞선 장군의 전술적 방어." },
  { type: '가족 갈등', character: '이진수 vs 아내/자식', desc: "집에서 소외되던 아버지가 횟집 사장으로 성공하며 가족들에게 한 인간으로서 인정받아가는 과정." }
];

const chars = [
  { 
    name: '이진수', 
    age: '58', 
    role: '주인공 / 횟집 사장 (전 4성 장군)', 
    personality: '강직하고 책임감이 강하나 사회 생활은 0점. 모든 것을 전략으로 해결하려 함.',
    job: '횟집 사장',
    looks: '항상 다림질이 잘 된 앞치마, 군대식 짧은 머리',
    secret: '사실은 생선 눈을 보는 것조차 무서워했었음'
  },
  { 
    name: '한복순', 
    age: '52', 
    role: '여주인공 / 베테랑 주방장', 
    personality: '시원시원한 성격, 자갈치 시장의 마당발. 장군의 든든한 조력자이자 엄격한 스승.',
    job: '주방실장',
    looks: '강력한 파마머리, 화려한 고무장갑'
  },
  { 
    name: '사토 유카', 
    age: '38', 
    role: '서브 주연 / 일본 요리 연구가', 
    personality: '섬세하고 예의 바름. 한국 요리의 깊은 맛에 반해 부산에 머무름.',
    job: '요리 연구가',
    looks: '단아한 기모노 스타일의 현대복'
  }
];

const stats = {
  budget: 6500000000,
  ppl: 1500000000,
  net: 5000000000
};

async function run() {
  const { data, error } = await supabase
    .from('projects')
    .update({ 
      conflicts: conflicts, 
      chars: chars,
      stats: stats,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId);

  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Project updated successfully with conflicts and characters.');
  }
  process.exit();
}

run();
