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

    if (fetchErr || !project) throw new Error("Project not found")

    console.log(`[Edge] Project: ${projectId}, current: ${project.status}, action: ${action}`)

    const input = project.input || clientInput
    let currentStatus = project.status

    // PHASE 1: Automation (Step 1 to 4)
    if (action === 'start' || currentStatus === 'initializing' || currentStatus === 'error') {
      
      // Step 1: CORE
      if (currentStatus === 'initializing' || currentStatus === 'error' || !project.synopsis) {
         await updateProject(supabase, projectId, { status: 'generating', pct: 5 })
         const core = await callAI('CORE', input)
         await updateProject(supabase, projectId, { 
             title: core.title,
             synopsis: core.synopsis,
             logline: core.logline,
             chars: core.chars || core.characters,
             pct: 20,
             stepIdx: 1,
             status: 'core_done'
         })
         currentStatus = 'core_done'
      }

      // Step 2: EP_OUTLINE
      if (currentStatus === 'core_done') {
         await updateProject(supabase, projectId, { pct: 25 })
         const outline = await callAI('EP_OUTLINE', input, { episodesCount: input.episodes })
         await updateProject(supabase, projectId, { 
             outline: outline.episodes || outline,
             pct: 35,
             stepIdx: 2,
             status: 'outline_done'
         })
         currentStatus = 'outline_done'
      }

      // Step 3: PLAN_DETAIL (Per-episode)
      if (currentStatus === 'outline_done') {
         const eps = project.outline || []
         const totalEps = eps.length || input.episodes || 8
         
         for(let i=0; i < totalEps; i++) {
             const epNum = i+1
             const epTitle = eps[i]?.title || `Episode ${epNum}`
             
             // [Check Idempotency] Don't re-generate if already exists
             const { data: existingEp } = await supabase
               .from('episodes')
               .select('id, story')
               .eq('project_id', projectId)
               .eq('ep_num', epNum)
               .single()

             if (existingEp && existingEp.story) {
                console.log(`[Edge] Episode ${epNum} already exists, skipping AI call.`)
                continue
             }

             await updateProject(supabase, projectId, { pct: 35 + Math.floor((i/totalEps)*20) })
             
             const detail = await callAI('PLAN_DETAIL', input, { 
                 num: epNum, 
                 title: epTitle, 
                 runtime: input.runtime,
                 logline: project.logline
             })

             await supabase.from('episodes').upsert({
                 project_id: projectId,
                 ep_num: epNum,
                 title: epTitle,
                 logline: eps[i]?.logline || "",
                 story: detail.story,
                 scenes: detail.scenes
             }, { onConflict: 'project_id, ep_num' })
         }
         await updateProject(supabase, projectId, { pct: 55, stepIdx: 3, status: 'plan_done' })
         currentStatus = 'plan_done'
      }

      // Step 4: SCRIPT_SAMPLE
      if (currentStatus === 'plan_done') {
         await updateProject(supabase, projectId, { pct: 58 })
         // Get first episode details
         const { data: ep1 } = await supabase.from('episodes').select('*').eq('project_id', projectId).eq('ep_num', 1).single()
         
         const scriptRes = await callAI('SCRIPT', input, { 
             epNum: 1, 
             title: ep1?.title, 
             story: ep1?.story, 
             scenes: ep1?.scenes 
         })

         await supabase.from('episodes').update({ script: scriptRes.script || scriptRes }).eq('project_id', projectId).eq('ep_num', 1)
         
         await updateProject(supabase, projectId, { pct: 60, stepIdx: 4, status: 'sample_done' })
         console.log("[Edge] Phase 1 Automation complete. Pausing at sample_done.")
         return new Response(JSON.stringify({ success: true, status: 'sample_done' }), { headers: corsHeaders })
      }
    }

    // PHASE 2: (When action === 'finalize' or resumed)
    if (action === 'finalize' || currentStatus === 'sample_done' || currentStatus === 'prod_done' || currentStatus === 'ppl_done') {
        
        // Step 5: PRODUCTION (Budget/Stats)
        if (currentStatus === 'sample_done') {
            await updateProject(supabase, projectId, { status: 'generating', pct: 65 })
            const prod = await callAI('PRODUCTION', input)
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
            await updateProject(supabase, projectId, { pct: 80 })
            const ppl = await callAI('PPL', input, { synopsis: project.synopsis })
            await updateProject(supabase, projectId, { 
                ppl: ppl.ppl || ppl,
                pct: 85,
                stepIdx: 6,
                status: 'ppl_done'
            })
            currentStatus = 'ppl_done'
        }

        // Step 7: FULL_SCRIPT (Actually just marking as done, per-ep script generation is usually on-demand or background)
        // For now, we finalize the project structure
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
          error_msg: (err as Error).message 
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

async function updateProject(supabase, id, updates) {
  const { error } = await supabase.from('projects').update(updates).eq('id', id)
  if (error) throw error
}

async function callAI(step: string, input: any, params: any = {}) {
  console.log(`[AI Call] Step: ${step}`)
  
  const systemPrompt = `You are a professional K-Drama screenwriter and producer. Always output strictly in JSON format. Provide detailed, premium content for high-budget productions. Use Korean for all content.`
  
  let userPrompt = ""
  switch (step) {
    case 'CORE':
      userPrompt = `보여줄 작품의 제목, 로그라인, 전체 줄거리(1500자 이상), 주요 등장인물(최소 4명)을 구상하고 JSON으로 출력해.
      { "title": "제목", "logline": "한줄 요약", "synopsis": "전체 줄거리", "characters": [{ "name": "이름", "age": "나이", "desc": "설명/특징" }] }
      기획 방향: ${input.genre} 장르, ${input.platform} 플랫폼, 키워드: ${input.keywords}`
      break;
    case 'EP_OUTLINE':
      userPrompt = `전체 ${params.episodesCount}회차의 제목과 각 회차별 1줄 줄거리를 요약해서 JSON으로 출력해.
      { "episodes": [{ "title": "제목", "logline": "내용" }] }`
      break;
    case 'PLAN_DETAIL':
      userPrompt = `${params.num}화의 상세 시놉시스와 등장 씬 리스트를 구상해. 런타임: ${params.runtime}분.
      { "story": "상세 줄거리 (기승전결 포함)", "scenes": [{ "num": 1, "place": "장소", "time": "시간 (낮/밤)", "desc": "내용" }] }
      전체 로그라인: ${params.logline}`
      break;
    case 'SCRIPT':
      userPrompt = `${params.num}화의 시나리오 대본을 작성해. 
      지문과 대사를 포함하여 전문적인 대본 형식으로 출력해. 
      { "script": "S#1. 장소... 대사..." }`
      break;
    case 'PRODUCTION':
      userPrompt = `이 작품의 예상 제작비(총액 및 세부항목)와 가상 캐스팅(주연/조연)을 추천해줘. JSON으로 출력해.
      { "budget": { "total": "금액", "breakdown": { "출연료": "...", "제작비": "..." } }, "casting": [{ "role": "배역", "actor": "가상 배우" }] }`
      break;
    case 'PPL':
      userPrompt = `드라마 전개 내 자연스럽게 녹아들 수 있는 PPL 아이템 3가지를 제안해줘. JSON으로 출력해.
      { "ppl": [{ "item": "아이템 명", "scene": "배경", "logic": "제안 사유" }] }`
      break;
  }

  try {
    let modelName = "claude-haiku-4-5-20251001";
    if (step === 'CORE' || step === 'SCRIPT') {
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
        messages: [{ role: "user", content: userPrompt }],
        }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || "AI Call Failed")
    
    let text = data.content[0].text
    
    // JSON Extraction Hardening
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
       text = jsonMatch[0]
    }
    
    // Remote potential trailing commas or markdown snippets that break JSON.parse
    text = text.replace(/,\s*([\}\]])/g, '$1') 

    try {
        return JSON.parse(text)
    } catch (parseErr) {
        console.error(`[Edge] JSON Parse failed for step ${step}. Raw:`, text)
        throw new Error(`AI 응답 형식 오류 (JSON Parsing Error): ${(parseErr as Error).message}`)
    }
  } catch (apiErr) {
    console.error(`[Edge] ${step} Step API/Parsing Error:`, apiErr)
    throw (apiErr as Error)
  }
}
