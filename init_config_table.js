const { serviceSupabase: supabase } = require('./api/supabaseClient');
const fs = require('fs');
const path = require('path');

async function initConfigTable() {
  console.log('🚀 Supabase "system_settings" 테이블 초기화 시작...');
  
  // 1. 기존 system.json 데이터 읽기 (있다면)
  const configPath = path.join(__dirname, 'api/config/system.json');
  let currentConfig = {
    planningModel: 'claude-3-5-haiku-20241022',
    productionModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: "당신은 세계적인 K-드라마 전문 작가입니다."
  };

  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      currentConfig = { ...currentConfig, ...data };
      console.log('✅ 로컬 설정을 성공적으로 읽었습니다.');
    } catch (e) {
      console.warn('⚠️ 로컬 설정 읽기 실패, 기본값을 사용합니다.');
    }
  }

  /* 
    SQL:
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      planning_model TEXT,
      production_model TEXT,
      system_prompt TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  */
  
  // Supabase JS SDK doesn't support direct table creation (DDL). 
  // We assume the user creates it via Dashboard or we use serviceSupabase to insert.
  // If the table doesn't exist, this will fail. 
  // IMPORTANT: Since we can't run SQL DDL via createClient comfortably without RPC,
  // we will try to upsert to 'system_settings'.
  
  console.log('📦 데이터 삽입 시도 중 (id="global")...');
  const { data, error } = await supabase
    .from('system_settings')
    .upsert([
      {
        id: 'global',
        planning_model: currentConfig.planningModel,
        production_model: currentConfig.productionModel,
        system_prompt: currentConfig.systemPrompt,
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'id' });

  if (error) {
    if (error.code === '42P01') {
      console.error('❌ 에러: "system_settings" 테이블이 데이터베이스에 없습니다.');
      console.log('💡 해결 방법: Supabase SQL Editor에서 다음 SQL을 실행해 주세요:');
      console.log(`
CREATE TABLE system_settings (
  id TEXT PRIMARY KEY,
  planning_model TEXT,
  production_model TEXT,
  system_prompt TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Service Role Read/Write" ON system_settings FOR ALL USING (true);
      `);
    } else {
      console.error('❌ 에러 발생:', error.message);
    }
    process.exit(1);
  } else {
    console.log('✨ "system_settings" 데이터가 성공적으로 클라우드에 연동되었습니다.');
    process.exit(0);
  }
}

initConfigTable();
