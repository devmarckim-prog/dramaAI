import { state } from './state.js';
import { SYSTEM_PROMPTS } from './constants.js';
import { updateApiStatus, showToast, showPage, addDebugLog, showDebugLog } from './navigation.js';
import { collectWizardInput } from './wizard.js';
import { renderProjectCards } from './projects_list.js';
import { DIRECTORS_ARENA_SAMPLE, SEOUL_NIGHT_SAMPLE, SAMPLES_CACHE, syncSamplesFromServer } from './samples.js';

let isGenerating = false;
let pollingInterval = null;
let _displayedPct = {}; // projectId -> 현재 화면에 표시된 최대 pct (절대 감소 안 함)

// Generate a proper UUID v4 for stable guest identification (DB requires valid UUID format)
function _generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getGuestFingerprint() {
  let gid = localStorage.getItem('ds_guest_fingerprint');
  // If old format (non-UUID) or missing, generate a proper UUID v4
  if (!gid || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(gid)) {
    gid = _generateUUID();
    localStorage.setItem('ds_guest_fingerprint', gid);
  }
  return gid;
}

// Global function to fetch project by ID with all details
export async function fetchProjectById(id) {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('ds_auth_token')}`,
        'x-guest-fingerprint': getGuestFingerprint()
      }
    });
    if (!res.ok) throw new Error('프로젝트 정보를 가져오지 못했습니다.');
    return await res.json();
  } catch (error) {
    console.error('[API] fetchProjectById error:', error);
    throw error;
  }
}

// 화면에 표시된 pct를 업데이트하는 헬퍼 — 절대 감소하지 않음
function _updateBarUI(projectId, newPct) {
  const prev = _displayedPct[projectId] || 0;
  const safePct = Math.max(prev, newPct); // 무조건 이전 값 이상만 허용
  _displayedPct[projectId] = safePct;

  const bar = document.querySelector(`#gen-card-${projectId} .pcg-bar-fill-dynamic`);
  const labels = document.querySelectorAll(`#gen-card-${projectId} .pcg-progress-wrap span`);
  if (bar) bar.style.width = safePct + '%';
  if (labels.length >= 2) labels[1].textContent = Math.floor(safePct) + '%';
  return safePct;
}

export async function openProject(id) {
  try {
    // [New] Fetch full project data including episodes_list
    const pRaw = await fetchProjectById(id);
    const p = _normalizeProject(pRaw);

    // Reject projects with error status
    if (p.status === 'error') {
      showToast('AI 생성 중 오류가 발생한 프로젝트입니다. 다시 생성해 주세요.', 'error');
      return;
    }

    state.currentInput = p.input;
    state.planData = {
      id: p.id,
      title: p.title,
      logline: p.logline,
      synopsis: p.synopsis,
      platform: p.platform,
      genre: p.genre,
      episodes: p.episodes,
      outline: p.outline,
      stats: p.stats || p.budget || {},
      characters: p.characters || p.chars || [],
      ppl: p.ppl || [],
      budget: p.budget || (p.stats && p.stats.budget),
      episodes_list: p.episodes_list || [] // Normalized episodes
    };

    // Convert episodes_list to scripts mapping for legacy compat if needed
    state.scripts = {};
    if (p.episodes_list) {
      p.episodes_list.forEach(ep => {
        state.scripts[ep.ep_num] = ep.script;
      });
    }

    showPage('result');
    showToast(`${p.title} 프로젝트를 불러왔습니다.`, 'success');
  } catch (e) {
    console.error("Open Project Error:", e);
    showToast('프로젝트 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
  }
}

window.openProject = openProject;

export async function startGenerationFlow(input) {
  if (isGenerating) {
    console.warn('[API] Generation already in progress. Skipping duplicate call.');
    return;
  }
  isGenerating = true;
  state.isGenerating = true;
  state.generatingId = null;

  // 1. "마스터피스" 애니메이션 표시
  const overlay = document.getElementById('masterpiece-overlay');
  if (overlay) overlay.classList.add('active');

  showToast('드라마 기획안 생성을 시작합니다...', 'info');
  addDebugLog('드라마 프로젝트 생성을 시작합니다...', 'success');

  try {
    addDebugLog('데이터베이스에 프로젝트를 등록 중...');
    
    // FETCH GLOBAL CONFIG FOR INITIAL MODELS (v0.35)
    let planning_model = 'claude-haiku-4-5';
    let production_model = 'claude-sonnet-4-6';
    let system_prompt = '';
    
    try {
      const gRes = await fetch('/api/config');
      if (gRes.ok) {
        const config = await gRes.json();
        planning_model = config.planningModel;
        production_model = config.productionModel;
        system_prompt = config.systemPrompt;
      }
    } catch (e) {
      console.warn('[API] Could not fetch global config for model pinning, using defaults:', e);
    }

    const initialProject = {
      title: (input.genre || '드라마') + ' 프로젝트',
      genre: input.genre,
      platform: input.platform,
      episodes: input.episodes,
      input: input,
      status: 'generating',
      pct: 5,
      planning_model,
      production_model,
      system_prompt,
      createdAt: new Date().toISOString()
    };

    addDebugLog('데이터베이스에 프로젝트를 등록 중...');
    let saveRes = await saveProject(initialProject);
    if (!saveRes || !saveRes.success) {
      saveRes = await _saveLocal(initialProject);
    }
    if (!saveRes || !saveRes.success) throw new Error('프로젝트 초기화 실패');

    const projectId = saveRes.id;
    state.generatingId = projectId;
    addDebugLog(`프로젝트 등록 완료 (ID: ${projectId})`, 'success');

    // UI 전환
    showPage('projects');
    if (window.renderProjectCards) window.renderProjectCards();

    setTimeout(() => { if (overlay) overlay.classList.remove('active'); }, 2000);

    // 2. Initialize Backend Status and Start Background Generation
    const startRes = await fetch('/api/generate/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ds_auth_token')}`,
        'x-guest-fingerprint': getGuestFingerprint()
      },
      body: JSON.stringify({ projectId, input })
    });

    if (!startRes.ok) {
      const err = await startRes.json().catch(()=>({}));
      throw new Error(err.error || '백엔드 서버에서 생성을 시작할 수 없습니다.');
    }

    addDebugLog('백그라운드에서 AI 기획안 생성이 시작되었습니다. (진행 상태 모니터링 중)', 'info');
    showToast('AI 기획안 생성을 시작합니다.', 'info');

    // 3. START BACKGROUND POLLING
    startPolling(projectId);
    startProgressSmoother(projectId);

  } catch (error) {
    addDebugLog(`생성 에러: ${error.message}`, 'error');
    showToast(`생성 중 오류 발생: ${error.message}`, 'error');
    if (state.generatingId) {
      await saveProject({ id: state.generatingId, status: 'error', error_msg: error.message });
    }
  } finally {
    state.isGenerating = false;
    isGenerating = false;
    if (window.renderProjectCards) window.renderProjectCards();
  }
}

export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    addDebugLog('진행 상태 모니터링 종료.', 'info');
  }
}

export function startPolling(projectId) {
  if (pollingInterval) stopPolling();
  
  addDebugLog('진행 상태 모니터링 시작...', 'info');
  
  pollingInterval = setInterval(async () => {
    try {
      const projects = await fetchProjects();
      const current = projects.find(p => p.id.toString() === projectId.toString());
      
      if (!current) return;

      // ✅ 서버 pct를 받아도 절대 감소하지 않도록 _updateBarUI 사용
      const serverPct = parseInt(current.pct) || 0;
      _updateBarUI(projectId, serverPct);

      // 상태 텍스트 업데이트
      const labels = document.querySelectorAll(`#gen-card-${projectId} .pcg-progress-wrap span`);
      if (labels.length >= 2) {
        const stepLabels = ['드라마 기본 구조 설계 중...', '주요 등장인물 구체화 중...', '회차별 스토리 아웃라인 구성 중...', '상세 시나리오 대본 집필 중...', '사전 제작 예산 산출 중...', '마무리 및 PPL 브랜드 기획 중...'];
        const stepIdx = current.stepIdx;
        if (typeof stepIdx === 'number' && stepIdx >= 0 && stepIdx < stepLabels.length) {
          labels[0].textContent = stepLabels[stepIdx];
        }
      }

      // renderProjectCards는 카드 수 변화 시에만 호출 (pct 덮어쓰기 방지)
      // if (window.renderProjectCards) window.renderProjectCards(); // ← 제거

      if (current.status === 'done' || current.status === 'sample_done') {
        console.log(`[Polling] Generation reached ${current.status}. Stopping poll.`);
        
        // Force 100%
        _updateBarUI(projectId, 100);
        const cardBar = document.querySelector(`#gen-card-${projectId} .pcg-bar-fill-dynamic`);
        const cardLabel = document.querySelector(`#gen-card-${projectId} .pcg-progress-wrap span:last-child`);
        if (cardBar) cardBar.style.width = '100%';
        if (cardLabel) cardLabel.textContent = '100%';

        // Admin view backup
        const adminRows = document.querySelectorAll(`tr[data-project-id="${projectId}"]`);
        adminRows.forEach(row => {
          const bar = row.querySelector('.admin-progress-bar-inner');
          const txt = row.querySelector('.admin-progress-text');
          if (bar) bar.style.width = '100%';
          if (txt) txt.textContent = '100%';
        });

        stopPolling();
        stopProgressSmoother();
        delete _displayedPct[projectId]; // 정리
        
        // 완료 후 카드 전체 재렌더 (상태 변경 반영)
        if (window.renderProjectCards) window.renderProjectCards();
        
        if (current.status === 'done') {
           showToast('드라마 마스터피스가 완성되었습니다!', 'success');
        } else {
           showToast('기획안과 샘플 대본이 준비되었습니다. 검토 후 전체 생성을 진행하세요.', 'info');
        }
      } else if (current.status === 'error') {
        console.error('[Polling] Error detected in project status');
        stopPolling();
        stopProgressSmoother();
        delete _displayedPct[projectId];
        if (window.renderProjectCards) window.renderProjectCards();
        showToast('생성 중 오류가 발생했습니다: ' + (current.error_msg || 'Unknown'), 'error');
      }
    } catch (e) {
      console.warn('[Polling] Fetch error during polling:', e);
    }
  }, 3000);
}

export async function resumeProject(projectId) {
  try {
    addDebugLog(`프로젝트 생성 재개 시도 (ID: ${projectId})...`, 'info');
    
    const triggerRes = await fetch('/api/generate/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ds_auth_token')}`,
        'x-guest-fingerprint': getGuestFingerprint()
      },
      body: JSON.stringify({ projectId, action: 'start' })
    });

    if (!triggerRes.ok) throw new Error('재개 요청 실패');

    showToast('생성을 재개했습니다.', 'success');
    startPolling(projectId);
    showPage('projects');
  } catch (e) {
    showToast('재개 실패: ' + e.message, 'error');
  }
}

export async function finalizeProject(projectId) {
  try {
    addDebugLog(`프로젝트 전체 생성 시작 (ID: ${projectId})...`, 'info');
    
    const triggerRes = await fetch('/api/generate/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ds_auth_token')}`,
        'x-guest-fingerprint': getGuestFingerprint()
      },
      body: JSON.stringify({ projectId, action: 'finalize' })
    });

    if (!triggerRes.ok) throw new Error('전체 생성 요청 실패');

    showToast('전체 대본 및 제작 계획 작성을 시작합니다.', 'success');
    startPolling(projectId);
  } catch (e) {
    showToast('요청 실패: ' + e.message, 'error');
  }
}

window.resumeProject = resumeProject;
window.finalizeProject = finalizeProject;


let progressInterval = null;
function startProgressSmoother(projectId) {
  if (progressInterval) clearInterval(progressInterval);

  progressInterval = setInterval(() => {
    const bar = document.querySelector(`#gen-card-${projectId} .pcg-bar-fill-dynamic`);
    const labels = document.querySelectorAll(`#gen-card-${projectId} .pcg-progress-wrap span`);

    if (bar) {
      // ✅ DOM 현재값을 기준으로 올림 (덮어씌워도 이전보다 낮으면 스킵)
      let currentPct = parseFloat(bar.style.width) || (_displayedPct[projectId] || 5);
      if (currentPct < 99) {
        // 자연스러운 속도 (300ms마다 0.05~0.2%, 초당 0.5~1%)
        const increment = 0.05 + (Math.random() * 0.15);
        const newPct = Math.min(currentPct + increment, 99);
        // ✅ _updateBarUI 로 감소 방지 보장
        _updateBarUI(projectId, newPct);
      }
    }
  }, 300);
}

function stopProgressSmoother() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}


async function finishGenerate(isError, input, errMsg) {
  // Final save - only update status/meta, DO NOT overwrite AI-generated content
  // with dummy data. If real data exists in state.planData, always prefer that.
  const realChars = state.planData?.characters || state.planData?.chars;
  const realEpisodes = state.planData?.episodes;

  const finalPayload = {
    id: state.generatingId,
    title: state.planData?.title || (input.title) || (input.genre || '드라마') + ' 프로젝트',
    logline: state.planData?.logline || input.logline || '',
    synopsis: state.planData?.synopsis || input.synopsis || '',
    status: isError ? 'error' : 'done',
    error_msg: isError ? (errMsg || '알 수 없는 오류') : null,
    pct: 100,
    stepIdx: 7,
    input: input,
    // DB field standardization
    chars: realChars && realChars.length > 0 ? realChars : [],
    conflicts: state.planData?.conflicts || [],
    stats: state.planData?.stats || state.planData?.budget || {},
    budget: state.planData?.budget || (state.planData?.stats && state.planData.stats.budget) || {},
    ppl: state.planData?.ppl || []
  };

  // Handle episodes carefully:
  // If we have an array of detailed episodes, save as is. 
  // Otherwise, ensure the episodes field has at least the count (number).
  const requestedEps = parseInt(input.episodes) || 8;
  if (Array.isArray(realEpisodes) && realEpisodes.length > 0) {
    finalPayload.episodes = realEpisodes;
  } else {
    finalPayload.episodes = requestedEps;
  }

  await saveProject(finalPayload);

  addDebugLog('마지막 단계 저장 완료 (100%)');
  stopProgressSmoother();
  if (window.renderProjectCards) window.renderProjectCards();

  setTimeout(() => {
    const banner = document.getElementById('api-status-banner');
    if (banner) banner.style.display = 'none';
    if (window.renderProjectCards) window.renderProjectCards();
    addDebugLog('전체 로직 완료됨. 이제 프로젝트를 클릭하여 열 수 있습니다.', 'success');
  }, 1000);
}

export async function _callAPI(type, systemPrompt, userPrompt, maxTokens) {
  updateApiStatus('Claude와 교신 중...', type === 'script' ? '대본 집필 중' : '기획안/제작비 산출 중');
  const promptData = { systemPrompt, userPrompt, maxTokens };
  try {
    const data = await callBackendAI(type, promptData);
    if (!data) throw new Error('백엔드 연동 실패');
    updateApiStatus('데이터 수신 완료', '처리 중...');
    return data;
  } catch (e) {
    updateApiStatus('교신 오류 발생', '재시도 중...');
    throw e;
  }
}

function _buildBaseContext(input) {
  const charLines = (input.chars || []).length > 0
    ? input.chars.map(c => `  [${c.role || '조연'}] ${c.name || '이름미입력'} | 나이:${c.age || '?'}/성별:${c.gender || '?'}/직업:${c.job || '?'} | 성격:${c.personality || '?'}/외모:${c.looks || '?'}`).join('\n')
    : '  AI가 로그라인 기반으로 자동 설계';
  return [
    `플랫폼:${input.platform || 'OTT 오리지널'} / 장르:${input.genre || '로맨틱 코미디'} / 회차:${input.episodes || 8}부작 / 회당:${input.runtime || 60}분 / 시대:${input.era || '현대'}`,
    `주요배경:${input.setting || '서울'} / 타겟:${input.target || '2030 여성'}`,
    `로그라인:${input.logline || ''}`,
    `등장인물:\n${charLines}`,
    `추가설정:${input.extra || '없음'}`
  ].join('\n');
}

export async function callAPI_Core(input) {
  const prompt = `${_buildBaseContext(input)}\n\n위 설정으로 드라마의 핵심 컨셉(제목, 로그라인, 줄거리, 주인공 성격)과 1화의 씬 목록(장소/인물만)을 생성해주세요.\n순수 JSON만 반환.`;
  return await _callAPI('plan_core', SYSTEM_PROMPTS.CORE, prompt, 4000);
}

export async function callAPI_Plan_Detail(input, coreData) {
  const prompt = `${_buildBaseContext(input)}\n\n기존 핵심 컨셉:\n제목: ${coreData.title}\n줄거리: ${coreData.synopsis}\n\n위 데이터를 바탕으로 나머지 ${input.episodes || 8}화 전체의 상세 씬 묘사(desc)와 갈등 구조, 유사 레퍼런스를 완성해주세요.\n순수 JSON만 반환.`;
  return await _callAPI('plan_detail', SYSTEM_PROMPTS.PLAN_DETAIL, prompt, 8192);
}

export async function callAPI_Production(input) {
  const prompt = `${_buildBaseContext(input)}\n\n위 드라마의 캐스팅 추천, 촬영 장소, 회차별 제작비를 생성해주세요.\n순수 JSON만 반환.`;
  return await _callAPI('prod', SYSTEM_PROMPTS.PRODUCTION, prompt, 8000);
}

export async function callAPI_PPL(input, planData) {
  const sceneList = planData?.episodes?.[0]?.scenes
    ? planData.episodes[0].scenes.map(s => `${s.num} ${s.loc} - ${(s.desc || '').slice(0, 60)}`).join('\n') : '';
  const prompt = `${_buildBaseContext(input)}\n\n주요 씬 목록(1화):\n${sceneList}\n\n위 드라마에 자연스럽게 녹아드는 PPL 기획안 8개 이상 생성.\n순수 JSON만 반환.`;
  return await _callAPI('ppl', SYSTEM_PROMPTS.PPL, prompt, 4000);
}

export async function callBackendAI(promptType, promptData) {
  const API_BASE_URL = '/api';
  const token = localStorage.getItem('ds_auth_token');
  const hasToken = token && token !== 'mock_token';
  const isGuest = localStorage.getItem('ds_guest_mode') === 'true' && !hasToken;

  if (isGuest) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Mock response based on type
    if (promptType === 'plan_core') {
      return {
        title: (promptData.userPrompt.match(/장르: (.*),/)?.[1] || '드라마') + ': 끝없는 파도',
        logline: '상처 입은 두 남녀가 바닷가 마을에서 서로를 치유해가는 과정을 그린 로맨스 휴먼 드라마',
        synopsis: '서울에서의 화려한 삶을 뒤로하고 낙향한 주인공이 우연히 만난 파도 같은 인연을 통해 진정한 행복의 의미를 찾아가는 이야기입니다.',
        characters: [
          { name: '강바다', age: '29', gender: '남', job: '서핑 강사', personality: '자유분방함', looks: '구리빛 피부', role: '남주' },
          { name: '이하늘', age: '27', gender: '여', job: '전직 변호사', personality: '완벽주의', looks: '이지적인 외모', role: '여주' }
        ],
        episodes: [
          { num: 1, title: '파도의 시작', scenes: [{ num: 1, loc: '버스 터미널', desc: '하늘이 무거운 짐을 들고 내려 바다를 처음 마주치는 순간' }] }
        ]
      };
    }
    return { success: true, mock: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for AI

  try {
    const res = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-guest-fingerprint': getGuestFingerprint()
      },
      body: JSON.stringify({ type: promptType, content: promptData }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `AI generation failed (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('AI 응답 시간이 초과되었습니다 (60초). 다시 시도해주세요.');
    throw err;
  }
}

export async function saveProject(projectData) {
  const token = localStorage.getItem('ds_auth_token');
  const hasToken = token && token !== 'mock_token';
  const gid = getGuestFingerprint(); // Always compute fingerprint

  const headers = {
    'Content-Type': 'application/json',
    // Always include fingerprint header - backend ignores it for authenticated users
    // but REQUIRES it for guests. Sending it always is safe and prevents 401 errors.
    'x-guest-fingerprint': gid
  };

  if (hasToken) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!projectData.fallback) {
    // Not logged in → pure guest mode: no auth token needed, fingerprint is enough
    // No-op, fingerprint header already set above
  }

  const API_BASE_URL = '/api';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(projectData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (projectData.fallback) return { success: false };
      return await _saveLocal(projectData);
    }
    const data = await res.json();
    // Safely extract project ID: server returns { success, project: { id, ... } }
    const projectId = data.project?.id || data.id || null;
    if (!projectId) {
      console.warn('[API] saveProject: server returned no project ID. Response:', JSON.stringify(data).substring(0, 200));
    }
    return { success: true, id: projectId, project: data.project };
  } catch (err) {
    clearTimeout(timeoutId);
    if (projectData.fallback) return { success: false };
    return await _saveLocal(projectData);
  }
}

async function _saveLocal(projectData) {
  try {
    let locals = JSON.parse(localStorage.getItem('ds_guest_projects') || '[]');
    let existingId = projectData.id;
    const gid = getGuestFingerprint(); // FIX: Define gid locally

    if (existingId) {
      const idx = locals.findIndex(p => p.id === existingId || p.id.toString() === existingId.toString());
      if (idx !== -1) {
        locals[idx] = { ...locals[idx], ...projectData };
      } else {
        locals.push({ ...projectData, id: existingId });
      }
    } else {
      const newId = 'g-' + gid.substring(2, 8) + '-' + Date.now();
      projectData.id = newId;
      locals.push(projectData);
    }
    if (locals.length > 20) locals.shift();
    localStorage.setItem('ds_guest_projects', JSON.stringify(locals));
    return { success: true, id: projectData.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}





export async function fetchProjects() {
  const token = localStorage.getItem('ds_auth_token');

  // 1. Ensure Samples are synced
  if (!SAMPLES_CACHE || SAMPLES_CACHE.length === 0) {
    await syncSamplesFromServer().catch(() => {});
  }
  
  // Only show visible samples (or all if admin, but usually handled by server-side filter on /api/samples)
  // For safety, server already filters isVisible on /api/samples for non-admins
  const activeSamples = SAMPLES_CACHE;

  // 로컬 저장소 데이터 (Guest 용 또는 백업)
  let localData = [];
  try {
    const rawLocal = localStorage.getItem('ds_projects_local');
    const rawGuest = localStorage.getItem('ds_guest_projects');

    // Clear legacy hidden samples as visibility is now server-controlled
    localStorage.removeItem('ds_hidden_samples');

    const set1 = rawLocal ? JSON.parse(rawLocal) : [];
    const set2 = rawGuest ? JSON.parse(rawGuest) : [];
    const merged = [...set1];
    set2.forEach(p => {
      if (p && p.id && !merged.some(m => m && m.id && m.id.toString() === p.id.toString())) {
        merged.push(p);
      }
    });
    localData = merged;
  } catch (e) {
    console.warn('[API] Local data parse error:', e);
  }

  const hasToken = token && token !== 'mock_token';
  const gid = getGuestFingerprint();

  // If no token AND no fingerprint we have nothing to identify the user
  if (!hasToken && !gid) {
    return [...activeSamples, ...localData].map(p => normalizeProject(p));
  }

  try {
    const API_BASE_URL = '/api';
    const headers = {
      // Always send fingerprint - backend only uses it when there's no auth token
      'x-guest-fingerprint': gid
    };
    if (hasToken) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/projects`, {
      headers: headers
    });


    let serverProjects = [];
    if (res.ok) {
      const data = await res.json();
      serverProjects = Array.isArray(data) ? data : (data.projects || []);

      // PASSIVE MIGRATION: If we have local guest projects, sync them to cloud
      if (localData.length > 0) {
        console.log(`[API] Found ${localData.length} local projects. Initiating passive migration...`);
        let allSynced = true;
        for (const p of localData) {
          if (!serverProjects.some(sp => sp.id.toString() === p.id.toString())) {
            const syncResult = await saveProject({ ...p, fallback: true });
            if (!syncResult || !syncResult.success) {
              allSynced = false;
              console.warn(`[API] Failed to sync local project ${p.id} to cloud. Keeping local copy.`);
            }
          }
        }
        // Only remove local cache if ALL projects synced successfully
        if (allSynced) {
          localStorage.removeItem('ds_guest_projects');
          localStorage.removeItem('ds_projects_local');
          console.log('[API] Migration complete. Local cache cleared.');
        } else {
          console.warn('[API] Migration partially failed. Local cache preserved.');
        }
      }
    }

    // 로컬과 서버 프로젝트 합치기 (중복 제거)
    const combined = [...serverProjects];
    localData.forEach(p => {
      // ID 중복 체크 (UUID/String 혼용 대응)
      if (p && p.id && !combined.some(sp => sp.id.toString() === p.id.toString())) {
        combined.push(p);
      }
    });

    // 샘플 추가 및 정렬 (샘플은 항상 상단)
    return [...activeSamples, ...combined].map(p => normalizeProject(p));
  } catch (err) {
    console.error('[API] fetchProjects error:', err);
    // 에러 시에도 최소한 로컬 데이터와 샘플은 보여줌
    return [...activeSamples, ...localData].map(p => _sanitizeProject(p));
  }
}

/**
 * 전역 데이터 정규화 헬퍼 (DB 데이터와 UI 데이터의 규격 통일)
 */
export function normalizeProject(p) {
  if (!p) return null;

  const _safeJSON = (val, fallback = {}) => {
    if (!val) return fallback;
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
      if (val.includes('[object Object]')) return fallback;
      try { return JSON.parse(val); } catch (e) { return fallback; }
    }
    return fallback;
  };

  const _safeArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { const res = JSON.parse(val); return Array.isArray(res) ? res : []; } catch (e) { return []; }
    }
    return [];
  };

  const _fixTitle = (val) => {
    if (typeof val === 'string' && val.includes('[object Object]')) return '무제 프로젝트';
    return val || '무제 프로젝트';
  };

  // DB 필드와 UI 필드를 1:1 매핑 (하위 호환성 유지)
  const normalized = {
    ...p,
    id: p.id,
    title: _fixTitle(p.title),
    logline: p.logline || '',
    synopsis: p.synopsis || '',
    platform: p.platform || 'OTT',
    genre: p.genre || '드라마',
    status: p.status || 'planning',
    pct: parseInt(p.pct) || 0,
    stepIdx: parseInt(p.stepIdx || p.step_idx) || 0,
    createdAt: p.createdAt || p.created_at || new Date().toISOString(),
    
    // 복합 데이터 타입 처리 (Deep Search 강화 v0.23)
    input: _safeJSON(p.input),
    stats: _safeJSON(p.stats || p.budget), 
    
    // Budget & PPL: Deep paths for robustness
    budget: (() => {
      const b = p.budget || (p.stats && p.stats.budget) || (p.data && p.data.budget) || (p.input && p.input.budget) || (p.data && p.data.input && p.data.input.budget) || {};
      return typeof b === 'object' ? b : {};
    })(),
    
    ppl: (() => {
      const pplList = p.ppl || (p.data && p.data.ppl) || (p.input && p.input.ppl) || (p.data && p.data.input && p.data.input.ppl) || [];
      return Array.isArray(pplList) ? pplList : [];
    })(),

    conflicts: (() => {
      const c = p.conflicts || (p.data && p.data.conflicts) || (p.input && p.input.conflicts) || 
                (p.stats && p.stats.conflicts) || (p.input && p.input.logline_analysis && p.input.logline_analysis.conflicts) || 
                (p.data && p.data.input && p.data.input.conflicts) || [];
      return Array.isArray(c) ? c : [];
    })(),
    
    // 배열 데이터 타입 처리 (Aliasing characters/chars)
    chars: _safeArray(p.chars || p.characters || (p.input && p.input.characters)),
    characters: _safeArray(p.characters || p.chars || (p.input && p.input.characters)),
    
    // 대본 데이터 처리 (Aliasing episodes_list/scripts/outline)
    scripts: _safeJSON(p.scripts || p.episodes_list || p.episodes, {}),
    outline: _safeArray(p.outline),
    
    // 회차수 계산 (episodes_count)
    episodes_count: (() => {
       const rawInputEps = p.input && (typeof p.input === 'string' ? JSON.parse(p.input).episodes : p.input.episodes);
       const epVal = p.episodes;
       if (typeof epVal === 'number') return epVal;
       if (Array.isArray(epVal)) return epVal.length; 
       if (Array.isArray(p.outline)) return p.outline.length;
       return parseInt(rawInputEps) || 8;
    })(),

    // AICore Model Tracking (v0.35)
    planning_model: p.planning_model || 'claude-haiku-4-5',
    production_model: p.production_model || 'claude-sonnet-4-6',
    system_prompt: p.system_prompt || '',

    episodes: _safeArray(p.episodes || p.scripts || p.outline || p.episodes_list).map((ep, idx) => ({
      ...ep,
      num: ep.num || idx + 1,
      status: ep.status || 'pending',
      current_scene_idx: parseInt(ep.current_scene_idx) || 0,
      total_scenes_count: parseInt(ep.total_scenes_count) || (Array.isArray(ep.scenes) ? ep.scenes.length : 0),
      ep_summary: ep.ep_summary || '',
      script: _safeArray(ep.script)
    })),
    
    is_sample: p.is_sample === true || (p.id && (p.id.toString().startsWith('sample-') || p.id === 'sample1' || p.id === 'sample2' || p.id === 'arena-sample'))
  };

  return normalized;
}

export async function deleteProject(id) {
  if (!id) return false;

  // 1. Handle Sample Projects (Local-only hide)
  if (typeof id === 'string' && id.startsWith('sample-')) {
    console.log('[API] Hiding sample project:', id);
    try {
      let hidden = JSON.parse(localStorage.getItem('ds_hidden_samples') || '[]');
      if (!hidden.includes(id)) {
        hidden.push(id);
        localStorage.setItem('ds_hidden_samples', JSON.stringify(hidden));
      }
      return true;
    } catch (e) { return false; }
  }

  // 2. Clear Local Cache (Optimistic UI support)
  const keys = ['ds_guest_projects', 'ds_projects_local', 'ds_ongoing_projects', 'ds_projects_cache'];
  keys.forEach(key => {
    try {
      const storageVal = localStorage.getItem(key);
      if (!storageVal) return;
      let locals = JSON.parse(storageVal);
      if (Array.isArray(locals)) {
        const filtered = locals.filter(p => p && p.id && p.id.toString() !== id.toString());
        if (filtered.length !== locals.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
          console.log(`[API] Local project ${id} removed from ${key}`);
        }
      }
    } catch (e) { }
  });

  // 3. Server Deletion
  const token = localStorage.getItem('ds_auth_token');
  const hasToken = token && token !== 'mock_token';
  const API_BASE_URL = '/api';

  try {
    const headers = { 'no-cache': '1' };
    if (hasToken) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // For Guests/Anonymous, always send fingerprint
      headers['x-guest-fingerprint'] = getGuestFingerprint();
    }

    console.log(`[API] Sending DELETE request for ${id}...`);
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: headers
    });

    if (res.ok || res.status === 404) {
      console.log('[API] Server delete confirmed for:', id);
      return true;
    }

    const errData = await res.json().catch(() => ({}));
    console.warn('[API] Server delete failed:', res.status, errData);
    return false;
  } catch (err) {
    console.error('[API] Delete fetch error:', err);
    return false;
  }
}

export async function generateScriptForEp(epIdx) {
  addDebugLog(`${epIdx + 1}화 대본 집필을 시작합니다...`);
  updateApiStatus(`${epIdx + 1}화 대본 생성 중`, 'Script Writer');

  try {
    const prompt = `${_buildBaseContext(state.currentInput)}\n\n회차: ${epIdx + 1}화\n기획안 요약: ${state.planData?.synopsis || ''}\n\n위 내용을 바탕으로 해당 회차의 드라마 대본(씬별 대사 및 지문)을 완성해주세요.\n순수 JSON만 반환.`;
    const res = await callBackendAI('script', { userPrompt: prompt });

    if (res && res.scenes) {
      state.scripts[epIdx] = res.scenes;
      addDebugLog(`${epIdx + 1}화 대본 집필 완료!`, 'success');

      // 기획안과 대본 동시 저장
      await saveProject({
        id: state.generatingId,
        scripts: state.scripts
      });

      if (window.renderScript) window.renderScript();
    }
  } catch (err) {
    addDebugLog(`대본 생성 실패: ${err.message}`, 'error');
    showToast('대본 생성에 실패했습니다.', 'error');
  } finally {
    updateApiStatus('대본 구성 완료', '대기');
  }
}

/**
 * 추가 회차 전용 제작비/PPL 생성 로직
 */
export async function generateEpResources(epIdx) {
  if (isGenerating) return;
  isGenerating = true;

  addDebugLog(`${epIdx + 1}화 전용 제작비 및 PPL 산출 중...`);
  updateApiStatus(`${epIdx + 1}화 리소스 분석 중`, '제작/PPL 전문가');

  try {
    const epData = state.planData?.episodes?.[epIdx];
    const sceneText = epData?.scenes?.map(s => `${s.num} ${s.loc} - ${s.desc || ''}`).join('\n') || '';

    const context = {
      systemPrompt: SYSTEM_PROMPTS.EPISODE_RESOURCES,
      userPrompt: `${_buildBaseContext(state.currentInput)}\n\n[대상 회차: ${epIdx + 1}화]\n스토리: ${epData?.story || ''}\n씬 리스트:\n${sceneText}\n\n위 내용을 바탕으로 해당 회차의 제작비 항목과 PPL 기획을 생성하세요.`
    };

    const res = await fetch('/api/generate/episode-resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ds_auth_token')}`,
        'x-guest-fingerprint': getGuestFingerprint()
      },
      body: JSON.stringify({
        projectId: state.generatingId,
        epIdx,
        context
      })
    });

    if (!res.ok) throw new Error('회차 리소스 생성 실패');
    const data = await res.json();

    // 1. 제작비 업데이트 (budgetBreakdown)
    if (!state.planData.budget) state.planData.budget = {};
    if (!state.planData.budget.budgetBreakdown) state.planData.budget.budgetBreakdown = [];

    // 기존에 해당 회차가 있다면 교체, 없으면 추가
    const existingIdx = state.planData.budget.budgetBreakdown.findIndex(b => b.ep === epIdx + 1);
    if (existingIdx !== -1) {
      state.planData.budget.budgetBreakdown[existingIdx] = data.budgetBreakdown;
    } else {
      state.planData.budget.budgetBreakdown.push(data.budgetBreakdown);
    }

    // 2. PPL 업데이트 (기존 리스트에 추가)
    if (!state.planData.ppl) state.planData.ppl = [];
    if (data.ppl && Array.isArray(data.ppl)) {
      const startId = state.planData.ppl.length + 1;
      const mappedPpl = data.ppl.map((p, i) => ({ ...p, id: startId + i, eps: `${epIdx + 1}화` }));
      state.planData.ppl = [...state.planData.ppl, ...mappedPpl];
    }

    // 3. 서버 저장
    await saveProject({
      id: state.generatingId,
      budget: state.planData.budget,
      ppl: state.planData.ppl
    });

    addDebugLog(`${epIdx + 1}화 리소스(예산/PPL) 산출 완료!`, 'success');
  } catch (err) {
    addDebugLog(`리소스 생성 실패: ${err.message}`, 'error');
    showToast('데이터 생성 중 오류가 발생했습니다.', 'error');
  } finally {
    isGenerating = false;
    updateApiStatus('리소스 구성 완료', '대기');
    // UI 갱신 (전역 빌드 함수가 있다면 실행)
    if (window.buildResultPanels) window.buildResultPanels();
  }
}

/**
 * v0.16 Multi-turn Scene Generation API calls
 */
export async function initSceneGeneration(episodeId) {
  const token = localStorage.getItem('ds_auth_token');
  const res = await fetch('/api/generate/scene/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ episodeId })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function generateNextScene(episodeId, sceneIdx) {
  const token = localStorage.getItem('ds_auth_token');
  const res = await fetch('/api/generate/scene/next', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ episodeId, sceneIdx })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function summarizeEpisode(episodeId) {
  const token = localStorage.getItem('ds_auth_token');
  const res = await fetch('/api/generate/ep-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ episodeId })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
