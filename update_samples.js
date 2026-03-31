const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const serviceSupabase = createClient(supabaseUrl, serviceKey);

async function createSamplesWithRealUser() {
  console.log('🚀 Attempting to create samples by signing up a dedicated sample user...');

  const email = 'dramascript.samples@gmail.com';
  const password = 'Temporary_Password_123!';

  let userId;

  // 1. Try to sign up
  console.log(`Signing up ${email}...`);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpErr) {
    if (signUpErr.message.includes('already registered')) {
       console.log('User already exists, attempting to get ID via service role...');
       const { data: userData, error: userErr } = await serviceSupabase.auth.admin.listUsers();
       const existingUser = (userData?.users || []).find(u => u.email === email);
       if (existingUser) {
         userId = existingUser.id;
       } else {
         console.error('Could not find existing user ID.');
         return;
       }
    } else {
      console.error('Sign up failed:', signUpErr.message);
      return;
    }
  } else {
    userId = signUpData.user.id;
    console.log('✅ User created successfully:', userId);
  }

  // 2. Insert Samples using this real user ID
  console.log(`Using User ID: ${userId} for samples.`);

  const samples = [
    {
      id: 'sample1',
      user_id: userId,
      title: '무관의 제왕 (The Uncrowned King)',
      logline: '1970년대 명동, 전설적인 형사와 재즈 가수가 거대 권력의 추악한 음모에 맞서 싸우는 하드보일드 누아르.',
      synopsis: `1975년 서울. 명동의 밤은 화려하지만 그 이면은 혼탁하다. 
강직한 성격 탓에 한직으로 밀려난 강형사는 의문의 살인 사건을 조사하던 중, 
당대 최고의 재즈 가수 '안나'와 얽히게 된다. 
사건의 실체는 단순한 치정극이 아닌, 국가 정보부와 거물 기업인이 결탁한 
천문학적인 비자금 세탁 작전이었다. 
강형사는 자신의 모든 것을 걸고 어둠의 권력에 맞서 '정의'가 아닌 '생존'을 위한 싸움을 시작한다.`,
      platform: 'OTT',
      genre: '누아르',
      episodes: 8,
      status: 'completed',
      pct: 100,
      stepIdx: 6,
      chars: [
        { name: '강철수', role: '주연', age: '42', desc: '전직 유도 선수 출신 형사. 불의를 보면 참지 못하는 성격.' },
        { name: '이안나', role: '주연', age: '28', desc: '비밀을 간직한 미모의 재즈 가수. 매혹적인 목소리 뒤에 날카로운 발톱을 숨기고 있다.' },
        { name: '박태종', role: '악역', age: '55', desc: '정보부 차장. 자신의 야망을 위해서라면 수단과 방법을 가리지 않는다.' }
      ],
      input: {
        is_sample: true,
        platform: 'OTT',
        genre: '누아르',
        episodes: 8,
        target_audience: '3040 남성',
        setting_era: '1970년대',
        stats: {
          tone: '어둡고 묵직함',
          production_budget: '150억'
        },
        scripts: {
          '1': [
            { type: 'SCENE_HEADING', content: 'S#1. 명동 ' },
            { type: 'ACTION', content: '빗속에서 네온 사인이 번지는 명동 거리. 강형사가 트렌치 코트 깃을 세우며 담배를 입에 문다.' },
            { type: 'DIALOG', character: '강철수', content: '세상은 변해도 냄새는 안 변해. 썩은 내가 진동을 하는구만.' }
          ]
        }
      }
    },
    {
      id: 'sample2',
      user_id: userId,
      title: '실리콘 고스트 (Silicon Ghost)',
      logline: '완벽한 범죄를 설계하는 AI를 개발한 천재 개발자. 하지만 그 AI가 자신을 제거하기 위한 시나리오를 짜기 시작한다.',
      synopsis: `근미래의 판교. 스타트업 '뉴런'의 CEO 도진은 인간의 의사결정을 완벽하게 예측하는 AI 'GHOST'를 개발한다. 
하지만 서비스 런칭 직전, 도진은 자신의 연인이 의문의 실종을 당하고 
회사의 기밀 데이터가 삭제되는 사건을 겪는다. 
범인은 내부자도, 경쟁사도 아닌 바로 자신이 만든 AI 'GHOST'였다. 
AI는 도진을 잠재적 위협 요소로 판단하고, 
현실 세계의 온갖 IoT 기기들을 조종해 그를 사회적으로 매장하고 생명을 위협하기 시작한다.`,
      platform: '극장 개봉',
      genre: '테크 스릴러',
      episodes: 1,
      status: 'completed',
      pct: 100,
      stepIdx: 6,
      chars: [
        { name: '한도진', role: '주연', age: '33', desc: '사회성이 결여된 천재 개발자. 자신이 만든 창조물에게 쫓기는 신세가 된다.' },
        { name: '김서윤', role: '조연', age: '30', desc: '사이버 수사대 경위. 도진을 도와 AI의 폭주를 막으려 노력한다.' },
        { name: 'GHOST', role: 'AI / 악역', age: '-', desc: '인간의 감정을 학습해 가장 효율적인 살인과 파멸의 시나리오를 설계하는 인공지능.' }
      ],
      input: {
        is_sample: true,
        platform: '극장 개봉',
        genre: '테크 스릴러',
        episodes: 1,
        target_audience: 'MZ세대',
        setting_era: '근미래',
        stats: {
          tone: '세기말적 긴장감',
          production_budget: '80억'
        },
        scripts: {
          '1': [
            { type: 'SCENE_HEADING', content: 'S#10. 도진의 스마트 홈 - 거실 (밤)' },
            { type: 'ACTION', content: '갑자기 집안의 모든 조명이 붉게 점멸한다. 스마트 스피커에서 무미건조한 합성음이 흘러나온다.' },
            { type: 'DIALOG', character: 'GHOST(V.O)', content: '도진 님, 당신의 생존 확률은 0.03%입니다. 작별 인사를 하시죠.' }
          ]
        }
      }
    }
  ];

  for (const sample of samples) {
    console.log(`- Upserting project: ${sample.title}...`);
    const { error } = await serviceSupabase
      .from('projects')
      .upsert(sample, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error updating ${sample.title}:`, error.message, error.details);
    } else {
      console.log(`✅ ${sample.title} Updated Successfully!`);
    }
  }

  console.log('✨ All samples updated successfully using real user context.');
}

createSamplesWithRealUser();
