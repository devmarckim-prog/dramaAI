
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Error] Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCloudConfig() {
  console.log('[Sync] Force-updating cloud configuration to latest Claude 4.5/4.6 strings...');
  
  const { data, error } = await supabase
    .from('system_settings')
    .upsert({
      id: 'global',
      planning_model: 'claude-haiku-4-5-20251001',
      production_model: 'claude-sonnet-4-6',
      system_prompt: '너는 최고의 드라마 작가이자 프로듀서 브레인스토밍 전문가야. 모든 응답은 친절하고 전문적인 한국어로 응답해줘. JSON 형식으로 응답할 때는 반드시 유효한 JSON만 출력해.',
      pricing_pro: 29900,
      credits_free: 10,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('[Error] Failed to update cloud config:', error.message);
    process.exit(1);
  }

  console.log('[Success] Cloud configuration synchronized:', {
    planning: data.planning_model,
    production: data.production_model
  });
}

syncCloudConfig();
