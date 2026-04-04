const { serviceSupabase: supabase } = require('../api/supabaseClient');

const fullPrompts = {
  // BATCH WORKFLOW
  CORE: '다음 드라마 기획안으로 제목, 로그라인, 전체 줄거리(1000자 이상), 주요 캐릭터 4인을 작성해. JSON 형식: { "title": "", "logline": "", "synopsis": "", "characters": [{ "name": "", "age": "", "role": "", "desc": "" }] }',
  EP_OUTLINE: '전체 {epCount}회차의 제목과 각 회차별 1줄 줄거리를 JSON으로 작성해. JSON 형식: { "episodes": [{ "title": "제목", "logline": "내용 요약" }] }',
  PLAN_DETAIL: '{num}화 "{title}"의 상세 스토리와 씬 리스트를 JSON으로 작성해. 런타임: 약 {runtime}분 (씬 수: {sceneCount}개). JSON 형식: { "story": "기승전결 포함 상세 줄거리 (700자 이상)", "scenes": [{ "num": 1, "place": "INT. 장소명", "time": "낮/밤/새벽", "desc": "씬 핵심 내용 2줄" }] }',
  SCRIPT_SAMPLE: '1화 "{title}"의 첫 씬 샘플 대본을 전문적인 형식(지문+대사)으로 작성해. JSON 형식: { "script": "S#1. INT. 장소 - 낮\\n\\n지문..." }',
  
  // STEPWISE (WIZARD) FLOW
  LOGLINE_GEN: '드라마 기획안의 핵심 컨셉을 작성해줘. 로그라인 시드: {seed}. 장르: {genre}. 다음 JSON 형식으로 응답해: {"title": "제목", "genre": "장르", "logline": "한 줄 로그라인"}',
  CHAR_BASIC: '드라마 "{title}" (로그라인: {logline})의 주요 인물 3명의 기초 설정을 작성해줘. JSON 형식: {"chars": [{"name": "...", "personality": "...", "role": "..."}]}',
  SYNOPSIS_GEN: '제목: {title}. 로그라인: {logline}. 이 드라마의 전체 줄거리(시놉시스)를 1000자 내외로 상세히 작성해줘. JSON 형식: {"synopsis": "내용"}',
  CONFLICT_GEN: '드라마 "{title}"의 주요 갈등 구조를 분석해줘. 내적 갈등, 대인 갈등, 사회적/환경적 갈등을 포함해. JSON 형식: {"conflicts": [{"type": "내적/대인/사회", "character": "인물명", "desc": "갈등 내용"}]}',
  CHAR_DEEP: '드라마 "{title}"의 주요 인물 3명을 상세 설정해줘. 기존 설정: {existingChars}. 이름, 성격, 나이, 역할, 외모를 포함해. JSON 형식: {"chars": [{"name": "...", "personality": "...", "looks": "..."}]}',
  EP_PLAN: '드라마 "{title}"의 전 {epCount}회차 구성을 JSON으로 작성해줘. 회차별 제목과 요약을 포함해. JSON 형식: {"episodes": [{"ep": 1, "title": "...", "summary": "..."}]}',

  // INTERACTIVE (SCENE CHAT) FLOW
  SCENE_INIT: '당신은 드라마 [{title}]의 전문 작가입니다. 지금부터 {epNum}화 대본을 씬별로 작성합니다. 준비되면 "시작"이라고만 답하세요.',
  SCENE_NEXT: 'S#{sceneNum} ({place} / {time}) 을 작성해주세요. 전문적인 대본 형식을 준수하고 반드시 JSON 형식으로만 출력: { "num": "...", "loc": "...", "content": "..." }',
  EP_SUMMARY: '드라마 {epNum}화의 전체 대본입니다. 다음 화 집필을 위해 핵심 사건 3줄로 요약해줘.',
  
  // PRODUCTION UTILITIES
  PRODUCTION: '드라마 인물 설정에 맞는 배우 후보 3인과 예상 제작 견적을 산출해줘.',
  PPL: '브랜드 협찬 제안서와 PPL 수익 모델을 설계해줘.',
  SCRIPT: '최종 대본 전문을 집필해줘.',
  
  // SYSTEM INTERNALS
  JSON_REPAIR: '아래 텍스트를 유효한 JSON으로 변환해줘. 규칙: 문자열 내부의 큰따옴표(") 삭제, 줄바꿈은 \\n 변환, JSON 외 텍스트 모두 제거.'
};

async function migrate() {
  console.log('🚀 Migrating ALL prompts to Supabase...');
  const { data, error } = await supabase
    .from('system_settings')
    .update({ prompts: fullPrompts })
    .eq('id', 'global')
    .select();

  if (error) {
    console.error('❌ Migration FAILED:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SUCCESS: All 18 prompts migrated to system_settings!');
    console.log('Updated row counts:', data.length);
    process.exit(0);
  }
}

migrate();
