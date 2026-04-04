import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectId, action, input: clientInput } = await req.json()
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 0. Fetch System Config (Prompts & Models)
    const { data: globalSettings } = await supabase
      .from('system_settings')
      .select('prompts, productionModel, planningModel')
      .eq('id', 'global')
      .single()
    
    const config = globalSettings || { 
      prompts: {}, 
      productionModel: 'claude-sonnet-4-6', 
      planningModel: 'claude-haiku-4-5-20251001' 
    }

    // 1. Fetch Project Data (With Retry for Race Conditions)
    let project = null;
    let fetchErr = null;
    for (let retry = 0; retry < 5; retry++) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()
        
        if (data) {
            project = data;
            break;
        }
        fetchErr = error;
        console.log(`[Edge] Project ${projectId} not found (Attempt ${retry + 1}/5). Retrying in 1s...`);
        await new Promise(r => setTimeout(r, 1000));
    }

    if (!project) throw new Error(`Project not found: ${projectId} (${fetchErr?.message || 'Unknown'})`)
    const inputData = (typeof project.input === 'string' ? JSON.parse(project.input) : project.input) || clientInput || {}

    console.log(`[Edge] v0.30 Starting: ${projectId}, action: ${action}`)

    const updateProject = async (payload: any) => {
      payload.updated_at = new Date().toISOString()
      if (payload.characters) { payload.chars = payload.characters; delete payload.characters; }
      const { error } = await supabase.from('projects').update(payload).eq('id', projectId)
      if (error) throw new Error(`DB update failed: ${error.message}`)
    }

    const buildUserContext = (contextType = 'default', extraData: any = {}) => {
      const wrapper = config.prompts?.CONTEXT_WRAPPER || '\n\n[USER Context]\n인물: {characters}\n시대배경: {era}\n타겟: {target}\n추가요청: {extra}';
      let ctx = wrapper
        .replace(/{characters}/g, inputData.chars && inputData.chars.length > 0 ? JSON.stringify(inputData.chars) : '없음 (AI가 창작)')
        .replace(/{era}/g, inputData.era || '현대')
        .replace(/{target}/g, inputData.target || '전연령')
        .replace(/{setting}/g, inputData.setting || '일반적인 배경')
        .replace(/{extra}/g, inputData.extra || '없음');

      if (contextType === 'episode' && extraData.logline) {
        ctx += `\n회차 줄거리: ${extraData.logline}`;
      }
      return ctx;
    };

    const callAI = async (prompt: string, model: string) => {
        let retryCount = 0;
        const maxRetries = 1;

        const attempt = async (currentPrompt: string): Promise<any> => {
            const resp = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": ANTHROPIC_API_KEY!,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 8192,
                    system: "당신은 한국 드라마 전문 작가입니다. JSON 형식으로만 응답하며, 문자열 내부에 큰따옴표(\")가 포함되지 않도록 주의하세요.",
                    messages: [{ role: "user", content: currentPrompt }]
                })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(`Anthropic Error: ${data.error?.message || resp.status}`);

            const rawText = data.content[0].text;
            const sanitized = sanitizeJsonString(rawText);

            try {
                return JSON.parse(sanitized);
            } catch (err) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    const fixPrompt = `아래 텍스트를 유효한 JSON으로만 변환해줘. 그 외 설명은 생략해.\n\n코드:\n${rawText}`;
                    return await attempt(fixPrompt);
                }
                throw err;
            }
        };
        return await attempt(prompt);
    };

    function sanitizeJsonString(raw: string) {
        if (!raw) return "";
        let clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) clean = match[0];
        clean = clean.replace(/[\x00-\x1F\x7F]/g, ' ');
        return clean;
    }

    // --- PIPELINE EXECUTION ---

    // STEP 1: CORE (20%)
    console.log(`[Edge] Step 1: CORE`);
    await updateProject({ status: 'generating', pct: 5, stepIdx: 1 });
    const corePrompt = (config.prompts?.CORE || "드라마 기획안을 작성해줘.") + buildUserContext();
    const coreData = await callAI(corePrompt, config.productionModel);
    
    await updateProject({
        title: coreData.title || project.title,
        logline: coreData.logline || project.logline,
        synopsis: typeof coreData.synopsis === 'object' ? JSON.stringify(coreData.synopsis) : coreData.synopsis,
        chars: Array.isArray(coreData.characters) ? coreData.characters : [],
        pct: 20,
        stepIdx: 1,
        status: 'core_done'
    });

    // STEP 2: OUTLINE (40%)
    await updateProject({ pct: 25, stepIdx: 2 });
    const epCount = parseInt(inputData.episodes) || 8;
    const outlinePrompt = (config.prompts?.EP_OUTLINE || `${epCount}회차 아웃라인 작성해줘.`) + buildUserContext() + `\n로그라인: ${coreData.logline}`;
    const outData = await callAI(outlinePrompt, config.planningModel);
    await updateProject({ outline: outData.episodes || [], pct: 40, stepIdx: 2, status: 'outline_done' });

    // STEP 3: PLAN_DETAIL (Loop)
    const { data: freshProject } = await supabase.from('projects').select('*').eq('id', projectId).single();
    const eps = (freshProject || {}).outline || outData.episodes || [];
    
    for (let i = 0; i < eps.length; i++) {
        const epNum = i + 1;
        const epTitle = eps[i]?.title || `${epNum}화`;
        const epLogline = eps[i]?.logline || '';

        await updateProject({ pct: 40 + Math.floor((i / eps.length) * 20) });
        
        const detailPrompt = (config.prompts?.PLAN_DETAIL || `${epNum}화 상세 스토리 작성해줘.`)
            .replace(/{num}/g, epNum.toString())
            .replace(/{title}/g, epTitle)
            + buildUserContext('episode', { logline: epLogline });

        const detail = await callAI(detailPrompt, config.planningModel);
        
        // Upsert episode
        const { data: existingEp } = await supabase.from('episodes').select('id').eq('project_id', projectId).eq('ep_num', epNum).single();
        if (existingEp) {
            await supabase.from('episodes').update({
                title: epTitle, logline: epLogline, story: detail.story || '', scenes: detail.scenes || [], status: 'pending'
            }).eq('id', existingEp.id);
        } else {
            await supabase.from('episodes').insert({
                project_id: projectId, ep_num: epNum, title: epTitle, logline: epLogline, story: detail.story || '', scenes: detail.scenes || [], status: 'pending'
            });
        }
    }
    await updateProject({ pct: 60, stepIdx: 3, status: 'plan_done' });

    // STEP 4: SCRIPT SAMPLE (60% -> 80%)
    const { data: ep1 } = await supabase.from('episodes').select('*').eq('project_id', projectId).eq('ep_num', 1).single();
    if (ep1) {
        const samplePrompt = (config.prompts?.SCRIPT_SAMPLE || "1화 샘플 대본 작성해줘.") + `\n스토리: ${ep1.story}` + buildUserContext();
        const scriptRes = await callAI(samplePrompt, config.planningModel);
        await supabase.from('episodes').update({
            script: scriptRes.script ? [{ num: 'S#1', loc: '전체', content: scriptRes.script }] : []
        }).eq('id', ep1.id);
    }
    
    // STEP 7: DONE
    await updateProject({ pct: 100, stepIdx: 7, status: 'done' });
    console.log(`[Edge] Project complete: ${projectId}`);

    return new Response(JSON.stringify({ success: true, projectId }), { headers: corsHeaders });

  } catch (err: any) {
    console.error("[Edge Error]", err);
    try {
      const { projectId } = await req.json().catch(() => ({}));
      if (projectId) {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        await supabase.from('projects').update({
          status: 'error',
          error_msg: `Edge Function 내부 오류: ${err.message}`,
          updated_at: new Date().toISOString()
        }).eq('id', projectId);
      }
    } catch (dbErr) {
      console.error("[Edge] Failed to update error status in DB", dbErr);
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})
