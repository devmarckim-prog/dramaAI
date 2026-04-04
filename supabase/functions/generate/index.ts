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

    // 1. Fetch project data
    const { data: project, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (fetchErr || !project) throw new Error(`Project not found: ${projectId}`)

    console.log(`[Edge] Project: ${projectId}, status: ${project.status}, action: ${action}`)

    const input = (typeof project.input === 'string' ? JSON.parse(project.input) : project.input) || clientInput || {}
    let currentStatus = project.status

    // PHASE 1: Automation (Step 1 to 4)
    if (action === 'start' || currentStatus === 'initializing' || currentStatus === 'generating' || currentStatus === 'error') {
      
      // Step 1: CORE — Always run if synopsis is missing or bad
      if (!project.synopsis || project.synopsis === '' || project.synopsis.startsWith('{') || currentStatus === 'generating' || currentStatus === 'initializing' || currentStatus === 'error') {
         await updateProject(supabase, projectId, { status: 'generating', pct: 5, stepIdx: 1 })
         const core = await callAI('CORE', input, {}, supabase)
         
         const finalTitle = (typeof core.title === 'object' && core.title !== null) 
                            ? (core.title.main || core.title.title || JSON.stringify(core.title)) 
                            : (core.title || project.title);
         const finalLogline = core.logline || project.logline;
         const finalSynopsis = (typeof core.synopsis === 'object' && core.synopsis !== null)
                               ? (core.synopsis.main || core.synopsis.text || JSON.stringify(core.synopsis))
                               : (core.synopsis || "");
         const finalChars = Array.isArray(core.characters) ? core.characters : (Array.isArray(core.chars) ? core.chars : []);

         await updateProject(supabase, projectId, { 
             title: finalTitle,
             synopsis: finalSynopsis,
             logline: finalLogline,
             chars: finalChars,
             pct: 20,
             stepIdx: 1,
             status: 'core_done'
         })
         currentStatus = 'core_done'
         console.log(`[Edge] Step 1 CORE done for ${projectId}`)
      }

      // Step 2: EP_OUTLINE
      if (currentStatus === 'core_done') {
         await updateProject(supabase, projectId, { pct: 25, stepIdx: 2 })

         // Bug #2 Fix: Re-fetch updated project to get fresh synopsis/logline
         const { data: freshProject } = await supabase.from('projects').select('*').eq('id', projectId).single()
         const freshInput = freshProject || project

         const outline = await callAI('EP_OUTLINE', input, { 
           episodesCount: input.episodes || 8,
           genre: input.genre,
           logline: freshInput.logline
         }, supabase)
         await updateProject(supabase, projectId, { 
             outline: outline.episodes || outline,
             pct: 35,
             stepIdx: 2,
             status: 'outline_done'
         })
         currentStatus = 'outline_done'
         console.log(`[Edge] Step 2 EP_OUTLINE done for ${projectId}`)
      }

      // Step 3: PLAN_DETAIL (Per-episode)
      if (currentStatus === 'outline_done') {
         // Bug #2 Fix: MUST re-fetch to get the outline just saved
         const { data: refreshed } = await supabase.from('projects').select('*').eq('id', projectId).single()
         const latestProject = refreshed || project
         const latestInput = (typeof latestProject.input === 'string' ? JSON.parse(latestProject.input) : latestProject.input) || input

         const eps = Array.isArray(latestProject.outline) ? latestProject.outline : []
         const totalEps = eps.length > 0 ? eps.length : (parseInt(latestInput.episodes) || 8)
         
         console.log(`[Edge] Step 3: Generating ${totalEps} episode details`)
         
         for(let i=0; i < totalEps; i++) {
             const epNum = i+1
             const epTitle = eps[i]?.title || `${epNum}화`
             const epLogline = eps[i]?.logline || eps[i]?.summary || ''
             
             // Bug #2 Fix: Check idempotency using existing records
             const { data: existingEp } = await supabase
               .from('episodes')
               .select('id, story')
               .eq('project_id', projectId)
               .eq('ep_num', epNum)
               .single()

             if (existingEp && existingEp.story) {
                console.log(`[Edge] Episode ${epNum} already exists, skipping.`)
                continue
             }

             await updateProject(supabase, projectId, { pct: 35 + Math.floor((i/totalEps)*20) })
             
             const detail = await callAI('PLAN_DETAIL', latestInput, { 
                 num: epNum, 
                 title: epTitle,
                 logline: epLogline,
                 runtime: latestInput.runtime || 70,
                 synopsis: latestProject.logline || ''
             }, supabase)

             const scenes = Array.isArray(detail.scenes) ? detail.scenes : []
             const epConflicts = Array.isArray(detail.conflicts) ? detail.conflicts : []
             
             // Bug #3 Fix: Safe upsert — try update first, then insert
             if (existingEp) {
               await supabase.from('episodes').update({
                   title: epTitle,
                   logline: epLogline,
                   story: detail.story || '',
                   scenes: scenes,
                   conflicts: epConflicts,
                   status: 'pending'
               }).eq('id', existingEp.id)
             } else {
               await supabase.from('episodes').insert({
                   project_id: projectId,
                   ep_num: epNum,
                   title: epTitle,
                   logline: epLogline,
                   story: detail.story || '',
                   scenes: scenes,
                   conflicts: epConflicts,
                   status: 'pending'
               })
             }
         }
         await updateProject(supabase, projectId, { pct: 55, stepIdx: 3, status: 'plan_done' })
         currentStatus = 'plan_done'
         console.log(`[Edge] Step 3 PLAN_DETAIL done for ${projectId}`)
      }

      // Step 4: SCRIPT_SAMPLE (1화 샘플 대본)
      if (currentStatus === 'plan_done') {
         await updateProject(supabase, projectId, { pct: 58, stepIdx: 4 })
         
         const { data: ep1 } = await supabase.from('episodes').select('*').eq('project_id', projectId).eq('ep_num', 1).single()
         
         if (ep1) {
           const scriptRes = await callAI('SCRIPT', input, { 
               epNum: 1, 
               title: ep1.title, 
               story: ep1.story,
               scenes: ep1.scenes 
           }, supabase)

           await supabase.from('episodes').update({ 
             script: scriptRes.script ? [{ num: 'S#1', loc: '전체', content: scriptRes.script }] : []
           }).eq('id', ep1.id)
         }
         
         await updateProject(supabase, projectId, { pct: 60, stepIdx: 4, status: 'sample_done' })
         console.log("[Edge] Phase 1 done. Pausing at sample_done.")
         return new Response(JSON.stringify({ success: true, status: 'sample_done' }), { headers: corsHeaders })
      }
    }

    // PHASE 2: Finalize (action === 'finalize' or resumed)
    if (action === 'finalize' || currentStatus === 'sample_done' || currentStatus === 'prod_done' || currentStatus === 'ppl_done') {
        
        // Step 5: PRODUCTION (Budget/Stats)
        if (currentStatus === 'sample_done') {
            await updateProject(supabase, projectId, { status: 'generating', pct: 65, stepIdx: 5 })
            const prod = await callAI('PRODUCTION', input, {}, supabase)
            await updateProject(supabase, projectId, { 
                stats: prod.budget || prod,
                pct: 75,
                stepIdx: 5,
                status: 'prod_done'
            })
            currentStatus = 'prod_done'
        }

        // Step 6: PPL
        if (currentStatus === 'prod_done') {
            await updateProject(supabase, projectId, { pct: 80, stepIdx: 6 })
            const { data: latestForPPL } = await supabase.from('projects').select('synopsis, logline').eq('id', projectId).single()
            const ppl = await callAI('PPL', input, { synopsis: latestForPPL?.synopsis || '' }, supabase)
            await updateProject(supabase, projectId, { 
                ppl: ppl.ppl || ppl,
                pct: 85,
                stepIdx: 6,
                status: 'ppl_done'
            })
            currentStatus = 'ppl_done'
        }

        // Step 7: DONE
        if (currentStatus === 'ppl_done') {
            await updateProject(supabase, projectId, { pct: 100, stepIdx: 7, status: 'done' })
            console.log("[Edge] Full generation complete.")
        }
    }

    return new Response(JSON.stringify({ success: true, status: 'done' }), { headers: corsHeaders })

  } catch (err) {
    console.error("[Edge Error]", err)
    
    try {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      const body = await req.clone().json().catch(() => ({}))
      const pId = body?.projectId
      if (pId) {
        await supabase.from('projects').update({ 
          status: 'error', 
          error_msg: (err as Error).message.substring(0, 500)
        }).eq('id', pId)
      }
    } catch (dbErr) {
      console.error("[Edge] Failed to log error to DB:", dbErr)
    }

    return new Response(JSON.stringify({ error: (err as Error).message }), { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})

async function updateProject(supabase: any, id: string, updates: any) {
  updates.updated_at = new Date().toISOString()
  const { error } = await supabase.from('projects').update(updates).eq('id', id)
  if (error) throw new Error(`DB update failed for ${id}: ${error.message}`)
}

function sanitizeJsonString(raw: string) {
  if (!raw) return "";
  let clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];
  clean = clean.replace(/[\x00-\x1F\x7F]/g, ' ');
  clean = clean.replace(/,\s*([\}\]])/g, '$1');
  return clean;
}

async function callAI(step: string, input: any, params: any = {}, supabase?: any) {
  console.log(`[AI Call] Step: ${step}`)
  
  let systemPrompt = `당신은 세계적인 K-드라마 전문 작가이자 제작 전문가입니다. 창의적이고 탄탄한 구성, 매력적인 캐릭터 대화를 작성하는 데 특화되어 있습니다.
  [중요] JSON 출력 시 문자열 내부에 큰따옴표(")를 절대 사용하지 마세요. 작은따옴표(')를 사용하거나 생략하세요.`

  // Fetch dynamic system prompt if supabase client is available
  if (supabase) {
    try {
      const { data } = await supabase.from('system_settings').select('system_prompt').eq('id', 'global').single()
      if (data && data.system_prompt) {
        systemPrompt = data.system_prompt + "\n[중요] JSON 출력 시 문자열 내부에 큰따옴표(\")를 절대 사용하지 마세요. 작은따옴표(')를 사용하거나 생략하세요."
        console.log("[Edge] Using dynamic system prompt from DB")
      }
    } catch (e) {
      console.warn("[Edge] Failed to fetch system_prompt, using default")
    }
  }
  
  let userPrompt = ""
  switch (step) {
    case 'CORE':
      userPrompt = `다음 드라마 기획안을 바탕으로 제목, 로그라인, 전체 줄거리(1500자 이상), 주요 등장인물(최소 4명)을 JSON으로 출력해.
      { "title": "제목", "logline": "한줄 요약", "synopsis": "전체 줄거리", "characters": [{ "name": "이름", "age": "나이", "role": "역할", "desc": "설명" }] }
      기획 방향: ${input.genre || '드라마'} 장르, ${input.platform || 'OTT'} 플랫폼, 키워드: ${input.keywords || input.logline || '자유 주제'}`
      break;
    case 'EP_OUTLINE':
      userPrompt = `전체 ${params.episodesCount || 8}회차의 제목과 각 회차별 1줄 줄거리를 요약해서 JSON으로 출력해.
      { "episodes": [{ "title": "제목", "logline": "내용 요약" }] }
      장르: ${params.genre || input.genre}, 전체 로그라인: ${params.logline || input.logline || ''}`
      break;
    case 'PLAN_DETAIL':
      userPrompt = `${params.num}화 "${params.title}"의 상세 스토리와 씬 리스트를 JSON으로 출력해. 런타임: 약 ${params.runtime || 70}분 (씬 수: ${Math.ceil((params.runtime || 70)/5)}개).
      { 
        "story": "기승전결 포함 상세 줄거리 (700자 이상)", 
        "scenes": [{ "num": 1, "place": "INT. 장소명", "time": "낮/밤/새벽", "desc": "씬 핵심 내용 2줄" }],
        "conflicts": [{ "type": "내적/인물간/외부", "character": "관련 인물", "desc": "갈등 상세" }]
      }
      전체 로그라인: ${params.synopsis || params.logline || ''}`
      break;
    case 'SCRIPT':
      userPrompt = `${params.epNum}화 "${params.title}"의 1씬 샘플 대본을 전문적인 형식(지문+대사)으로 작성해.
      { "script": "S#1. INT. 장소 - 낮\\n\\n지문 내용...\\n\\n인물A\\n  대사..." }
      줄거리: ${params.story || ''}`
      break;
    case 'PRODUCTION':
      userPrompt = `이 작품의 예상 제작비와 가상 캐스팅을 JSON으로 출력해.
      { "total": "총 제작비 (예: 80억원)", "breakdown": { "출연료": "금액", "제작비": "금액", "마케팅": "금액" }, "casting": [{ "role": "배역", "actor": "가상 배우명" }] }`
      break;
    case 'PPL':
      userPrompt = `드라마 내 자연스럽게 녹아들 수 있는 PPL 3가지를 제안해줘. JSON으로 출력해.
      { "ppl": [{ "item": "아이템명", "brand": "브랜드명", "scene": "등장 씬 배경", "logic": "제안 사유" }] }
      줄거리 개요: ${params.synopsis || ''}`
      break;
  }

  let retryCount = 0;
  const maxRetries = 1;
  let activePrompt = userPrompt;

  async function attempt(): Promise<any> {
    try {
      let modelName = "claude-haiku-4-5-20251001";
      if (step === 'CORE' || step === 'SCRIPT' || step === 'PLAN_DETAIL') {
        modelName = "claude-sonnet-4-6";
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          },
          body: JSON.stringify({
          model: modelName,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: "user", content: activePrompt }],
          }),
      })

      const data = await response.json()
      if (!response.ok) {
        const errMsg = data.error?.message || `API Error ${response.status}`
        console.error(`[Edge] Anthropic API error for ${step}: ${errMsg}`)
        throw new Error(errMsg)
      }
      
      const rawText = data.content[0].text
      const text = sanitizeJsonString(rawText);

      try {
          return JSON.parse(text)
      } catch (parseErr) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(`[Edge] JSON Parse failed for ${step}, retrying with fix prompt.`)
            activePrompt = `아래 텍스트를 유효한 JSON으로 변환해줘.
규칙:
- 문자열 내부의 큰따옴표(")는 모두 삭제
- 줄바꿈은 \\n으로 변환
- JSON 외 텍스트는 모두 제거
- 반드시 완전한 JSON으로 마무리

원본:
${rawText}`;
            return await attempt();
          }
          throw new Error(`JSON 파싱 실패 (${step}): ${(parseErr as Error).message}`);
      }
    } catch (err) {
      console.error(`[Edge] ${step} Error:`, err)
      throw err
    }
  }

  return await attempt();
}
