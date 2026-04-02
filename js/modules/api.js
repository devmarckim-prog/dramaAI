import { state } from './state.js';
import { SYSTEM_PROMPTS } from './constants.js';
import { updateApiStatus, showToast, showPage, addDebugLog, showDebugLog } from './navigation.js';
import { collectWizardInput } from './wizard.js';
import { renderProjectCards } from './projects_list.js';
import { DIRECTORS_ARENA_SAMPLE, SEOUL_NIGHT_SAMPLE } from './samples.js';

let isGenerating = false;
let pollingInterval = null;

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
  state.generatingId = 'gen-' + Date.now();
  state.currentInput = input;

  // CRITICAL: Clear old planData/stats from state to prevent sample content leakage
  state.planData = {
    title: input.title || (input.genre || '드라마') + ' 프로젝트',
    logline: input.logline || ''
  };
  state.scripts = {};

  // 1. "마스터피스" 애니메이션 표시
  const overlay = document.getElementById('masterpiece-overlay');
  if (overlay) overlay.classList.add('active');

  showToast('드라마 기획안 생성을 시작합니다. 프로젝트 목록에서 진행 상황을 확인하세요.', 'info');

  addDebugLog('드라마 프로젝트 생성을 시작합니다...', 'success');
  addDebugLog(`타겟 플랫폼: ${input.platform}, 장르: ${input.genre}`);

  // Initial state setup
  state.planData = null;
  state.scripts = {};

  const initialProject = {
    title: (input.genre || '드라마') + ' 프로젝트',
    genre: input.genre,
    platform: input.platform,
    episodes: input.episodes,
    logline: input.logline,
    input: input,
    status: 'generating',
    pct: 5,
    stepIdx: 0,
    createdAt: new Date().toISOString()
  };

  try {
    addDebugLog('데이터베이스에 프로젝트를 등록 중...');
    let saveRes = await saveProject(initialProject);

    if (!saveRes || !saveRes.success) {
      addDebugLog('서버 저장 실패. 로컬 저장소(Guest) 모드로 전환합니다...', 'warn');
      saveRes = await _saveLocal(initialProject);
    }

    if (!saveRes || !saveRes.success) {
      throw new Error('프로젝트를 초기화할 수 없습니다. (Local Storage Error)');
    }

    state.generatingId = saveRes.id;
    addDebugLog(`프로젝트 등록 완료 (ID: ${state.generatingId})`, 'success');

    // 2. 즉시 프로젝트 목록으로 이동하여 생성 중인 카드를 보여줌
    showPage('projects');
    if (window.renderProjectCards) window.renderProjectCards();

    // 3. 2초 후 마스터피스 오버레이 제거
    setTimeout(() => {
      if (overlay) overlay.classList.remove('active');
    }, 2000);

    // [New] Trigger Supabase Edge Function
    addDebugLog('서버 생성 엔진(Edge Function) 가동 중...', 'info');
    const triggerRes = await fetch('/api/generate/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ds_auth_token')}`,
        'x-guest-fingerprint': getGuestFingerprint()
      },
      body: JSON.stringify({ projectId: state.generatingId, input })
    });

    if (!triggerRes.ok) {
      throw new Error('AI 생성 엔진 시작에 실패했습니다.');
    }

    // 4. Start Polling Loop & Progress Smoother
    startPolling(state.generatingId);
    startProgressSmoother(state.generatingId);

  } catch (error) {
    addDebugLog(`초기화 에러: ${error.message}`, 'error');
    if (state.generatingId) {
      await saveProject({ id: state.generatingId, status: 'error', pct: 0, error_msg: error.message });
    }
    showToast('생성을 시작할 수 없습니다.', 'error');
  } finally {
    state.isGenerating = false;
    isGenerating = false;
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
      const projects = await fetchProjects(); // This fetches from server
      const current = projects.find(p => p.id.toString() === projectId.toString());
      
      if (!current) return;

      // Update UI cards
      if (window.renderProjectCards) window.renderProjectCards();

      if (current.status === 'done' || current.status === 'sample_done') {
        console.log(`[Polling] Generation reached ${current.status}. Stopping poll.`);
        
        // Force UI to 100% for the specific card before stopping
        const card = document.querySelector(`[id^="gen-card-${projectId}"] .pcg-bar-fill-dynamic`);
        const label = document.querySelector(`[id^="gen-card-${projectId}"] .pcg-progress-wrap span:last-child`);
        if (card) card.style.width = '100%';
        if (label) label.textContent = '100%';

        stopPolling();
        stopProgressSmoother();
        
        if (current.status === 'done') {
           showToast('드라마 마스터피스가 완성되었습니다!', 'success');
        } else {
           showToast('기획안과 샘플 대본이 준비되었습니다. 검토 후 전체 생성을 진행하세요.', 'info');
        }
      } else if (current.status === 'error') {
        console.error('[Polling] Error detected in project status');
        stopPolling();
        stopProgressSmoother();
        showToast('생성 중 오류가 발생했습니다: ' + (current.error_msg || 'Unknown'), 'error');
      }
    } catch (e) {
      console.warn('[Polling] Fetch error during polling:', e);
    }
  }, 3000); // 3 second interval
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
    // 로컬 스토리지나 메모리상의 프로젝트 pct를 조금씩 올림
    const cards = document.querySelectorAll(`[id^="gen-card-${projectId}"] .pcg-bar-fill-dynamic`);
    const labels = document.querySelectorAll(`[id^="gen-card-${projectId}"] .pcg-progress-wrap span:last-child`);

    if (cards.length > 0) {
      cards.forEach(card => {
        let currentPct = parseFloat(card.style.width) || 0;
        if (currentPct < 99) {
          // 자연스러운 속도로 증가 (초당 약 0.3~0.5%)
          let increment = 0.05 + (Math.random() * 0.15);
          let newPct = Math.min(currentPct + increment, 99);
          card.style.width = newPct + '%';
          labels.forEach(l => {
            if (l.textContent.includes('%')) l.textContent = Math.floor(newPct) + '%';
          });
        }
      });
    } else {
      // 카드가 아직 안 그려졌을 경우 재시도 유도 (무시)
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
    episodes_count: input.episodes || 8,
    conflicts: state.planData?.conflicts || [],
    stats: state.planData?.stats || state.planData?.budget || {},
    budget: state.planData?.budget || {}
  };

  // Only include chars/episodes/ppl/budget if we have real AI data
  // (prevents overwriting already-saved real data with dummy fallbacks)
  if (realChars && realChars.length > 0) {
    finalPayload.chars = realChars;
  }

  // Preserve conflicts and stats from state.planData
  if (state.planData?.conflicts) finalPayload.conflicts = state.planData.conflicts;
  if (state.planData?.stats) finalPayload.stats = state.planData.stats;
  if (state.planData?.budget) finalPayload.budget = state.planData.budget;
  if (state.planData?.ppl) finalPayload.ppl = state.planData.ppl;

  // Handle episodes carefully:
  // If we have an array of detailed episodes, Suprabase route allows storing it.
  // We want the 'count' meta to reflect the user's intent (e.g. 8) even if AI hasn't finished all lines yet.
  const requestedEps = parseInt(input.episodes) || 8;
  if (Array.isArray(realEpisodes) && realEpisodes.length > 0) {
    finalPayload.episodes = realEpisodes;
  }
  finalPayload.episodes_count = Number(requestedEps);

  await saveProject(finalPayload);

  addDebugLog('마지막 단계 저장 완료 (100%)');
  stopProgressSmoother();
  renderProjectCards();

  setTimeout(() => {
    const banner = document.getElementById('api-status-banner');
    if (banner) banner.style.display = 'none';
    // showPage('result'); // 사용자가 프로젝트 목록을 보고 있을 수 있으므로 자동 이동은 주석 처리 또는 선택적 처리
    renderProjectCards();
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
  return await _callAPI('plan_detail', SYSTEM_PROMPTS.PLAN_DETAIL, prompt, 15000);
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
    return { success: true, id: data.project?.id || data.id, project: data.project };
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

  // 1. Fetch public samples from server (respects Admin visibility settings)
  let activeSamples = [];
  try {
    const sRes = await fetch('/api/samples');
    if (sRes.ok) {
      const sData = await sRes.json();
      activeSamples = sData.map(s => ({
        ...(s.data || {}),
        id: s.id,
        title: s.title || (s.data && s.data.title),
        is_sample: true
      }));
    }
  } catch (err) {
    console.warn('[API] Public samples fetch failed, using fallbacks.', err);
    // Use hardcoded defaults only if server is unreachable
    activeSamples = [DIRECTORS_ARENA_SAMPLE, SEOUL_NIGHT_SAMPLE]
      .filter(s => s && s.id);
  }

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
    return [...activeSamples, ...localData].map(p => _sanitizeProject(p));
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
        for (const p of localData) {
          // If not already on server (by ID)
          if (!serverProjects.some(sp => sp.id.toString() === p.id.toString())) {
            await saveProject({ ...p, fallback: true }); // attempt cloud save
          }
        }
        // Partial cleanup: only remove what we tried to sync
        localStorage.removeItem('ds_guest_projects');
        localStorage.removeItem('ds_projects_local');
        console.log('[API] Migration check complete.');
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
    return [...activeSamples, ...combined].map(p => _sanitizeProject(p));
  } catch (err) {
    console.error('[API] fetchProjects error:', err);
    // 에러 시에도 최소한 로컬 데이터와 샘플은 보여줌
    return [...activeSamples, ...localData].map(p => _sanitizeProject(p));
  }
}

/**
 * 전역 데이터 정제 헬퍼 (오염된 데이터 복구)
 */
function _sanitizeProject(p) {
  if (!p) return p;

  const _fix = (val) => {
    if (typeof val === 'string' && val.includes('[object Object]')) return null;
    return val;
  };

  return {
    ...p,
    title: _fix(p.title) || '무제 프로젝트',
    logline: _fix(p.logline) || '',
    synopsis: _fix(p.synopsis) || '',
    input: _fix(p.input),
    characters: _fix(p.characters || p.chars),
    ppl: _fix(p.ppl),
    stats: _fix(p.stats),
    scripts: _fix(p.scripts),
    createdAt: p.createdAt || p.created_at || ''
  };
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

// Global window assignments removed (handled in app.js)

