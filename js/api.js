// api.js
// 프론트엔드와 백엔드 통신 담당 레이어 (MVP → 프로덕션)

const hostname = window.location.hostname;
const protocol = window.location.protocol;
const API_BASE_URL = (hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:')
  ? 'http://localhost:3000/api' 
  : '/.netlify/functions/api';

// 기술 로그 출력용 전역 함수
window.addDebugLog = function(msg, type = 'info') {
  const content = document.getElementById('debug-log-content');
  if(!content) return;
  
  const time = new Date().toLocaleTimeString();
  const color = type === 'error' ? '#ff4444' : (type === 'success' ? '#00ff00' : '#00ffff');
  const div = document.createElement('div');
  div.style.marginBottom = '4px';
  div.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:${color}">${msg}</span>`;
  content.appendChild(div);
  
  // 자동 스크롤
  const consoleEl = document.getElementById('debug-log-console');
  if(consoleEl) consoleEl.scrollTop = consoleEl.scrollHeight;
};

window.showProceedButton = function(callback) {
  const content = document.getElementById('debug-log-content');
  if(!content) return;
  
  const btn = document.createElement('button');
  btn.textContent = '▶ 테스트 통과! 본격적인 생성 시작하기 (클릭)';
  btn.style.cssText = 'margin-top:10px;padding:8px 16px;background:#00ff00;color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold;animation:pulse 2s infinite';
  btn.onclick = () => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.textContent = '생성 중...';
    callback();
  };
  content.appendChild(btn);
  
  // 펄스 애니메이션 추가용 스타일
  if (!document.getElementById('debug-btn-style')) {
    const s = document.createElement('style');
    s.id = 'debug-btn-style';
    s.innerHTML = '@keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } }';
    document.head.appendChild(s);
  }
};

window.toggleDebugLog = function() {
  const el = document.getElementById('debug-log-console');
  if(!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// 페이지 로드 시 디버그 UI 및 버전 정보 동적 주입
(function injectUIEnhancements() {
  const checkInterval = setInterval(() => {
    // 1. 디버그 로그 콘솔 주입
    const genWrap = document.querySelector('#page-generating .generating-wrap');
    const resWrap = document.querySelector('#page-result .projects-page-wrap'); // 결과 페이지용 컨테이너
    
    const targetWrap = genWrap || resWrap;

    if (targetWrap && !document.getElementById('debug-log-console')) {
      const div = document.createElement('div');
      div.id = 'debug-console-container';
      div.innerHTML = `
        <div style="margin-top:40px;text-align:center">
          <button onclick="toggleDebugLog()" style="background:none;border:none;color:var(--ink3);font-size:11px;text-decoration:underline;cursor:pointer">기술 로그 보기 (개발자용)</button>
        </div>
        <div id="debug-log-console" style="display:none;margin-top:16px;background:#1a1410;color:#00ff00;font-family:monospace;font-size:11px;padding:15px;border-radius:8px;max-height:200px;overflow-y:auto;text-align:left;line-height:1.5;box-shadow:inset 0 2px 10px rgba(0,0,0,0.5)">
          <div style="color:#aaa;border-bottom:0.5px solid #333;margin-bottom:8px;padding-bottom:4px;display:flex;justify-content:space-between">
            <span>TECHNICAL DEBUG CONSOLE</span>
            <button onclick="document.getElementById('debug-log-content').innerHTML=''" style="background:none;border:none;color:#666;cursor:pointer;font-size:10px">[Clear]</button>
          </div>
          <div id="debug-log-content"></div>
        </div>
      `;
      targetWrap.appendChild(div);
    }

    // 2. 로고 버전 정보 주입
    const logo = document.querySelector('.nav-logo');
    if (logo && !document.querySelector('.logo-version')) {
      const vSpan = document.createElement('span');
      vSpan.className = 'logo-version';
      vSpan.textContent = 'v1.2.1-debug';
      vSpan.style.fontSize = '10px';
      vSpan.style.color = 'var(--ink3)';
      vSpan.style.marginLeft = '6px';
      vSpan.style.fontWeight = '400';
      vSpan.style.verticalAlign = 'bottom';
      vSpan.style.opacity = '0.7';
      logo.appendChild(vSpan);
    }

    // 둘 다 주입되었으면 인터벌 종료 (또는 계속 체크해서 페이지 전환 대응)
    if (document.getElementById('debug-log-console') && document.querySelector('.logo-version')) {
      // clearInterval(checkInterval); // SPA 성격상 계속 둬도 무방 (초기 로딩 보장용)
    }
  }, 1000);
})();

function getAuthToken() {
  return localStorage.getItem('ds_auth_token') || '';
}

function isGuest() {
  return localStorage.getItem('ds_guest_mode') === 'true';
}

/**
 * [인증 API]
 */
window.loginWithGoogle = async function() {
  const res = await fetch(`${API_BASE_URL}/auth/google`);
  const data = await res.json();
  if(data.url) {
    window.location.href = data.url;
  }
}

window.logoutUser = function() {
  localStorage.removeItem('ds_auth_token');
  localStorage.removeItem('ds_user_email');
  localStorage.removeItem('ds_guest_mode');
}

window.processPayment = async function(paymentInfo) {
  const res = await fetch(`${API_BASE_URL}/payment`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(paymentInfo)
  });
  if(!res.ok) throw new Error('결제 처리 실패');
  return await res.json();
}

/**
 * [프로젝트 관리 API]
 */

// 프로젝트 목록 불러오기 (SQLite 백엔드 연동 또는 게스트 로컬 저장소)
window.fetchProjects = async function() {
  if(isGuest()){
    const localData = localStorage.getItem('ds_guest_projects');
    return localData ? JSON.parse(localData) : [];
  }
  
  if(!getAuthToken()) return []; 
  
  const res = await fetch(`${API_BASE_URL}/projects`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  
  if (!res.ok) {
    if(res.status === 401) {
      localStorage.removeItem('ds_auth_token');
    }
    return [];
  }
  return await res.json();
}

// 프로젝트 저장 (안전한 디버그 버전)
window.saveProject = async function(projectData) {
  try {
    if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] saveProject 시작", "info");
    
    // 게스트 모드 체크
    const isGuestSession = localStorage.getItem('ds_guest_mode') === 'true';
    if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] 게스트 여부: " + isGuestSession, "info");

    if (isGuestSession) {
      const localData = localStorage.getItem('ds_guest_projects');
      let projects = [];
      try {
        projects = localData ? JSON.parse(localData) : [];
      } catch(ex) {
        if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] 로컬 데이터 파싱 에러 - 초기화 진행", "warn");
        projects = [];
      }
      
      if(projectData.id){
        // 업데이트
        const idx = projects.findIndex(p => p.id === projectData.id);
        if(idx !== -1) projects[idx] = { ...projects[idx], ...projectData, updated_at: new Date().toISOString() };
        else projects.push({ ...projectData, id: Date.now(), created_at: new Date().toISOString() });
      } else {
        // 신규
        projectData.id = Date.now();
        projectData.created_at = new Date().toISOString();
        projects.push(projectData);
      }
      
      if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] LocalStorage 저장 시도 (항목: " + projects.length + ")", "info");
      localStorage.setItem('ds_guest_projects', JSON.stringify(projects));
      if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] LocalStorage 저장 성공", "success");
      
      return { success: true, id: projectData.id, project: projectData };
    }

    // 회원 모드 (백엔드 통신)
    if(!getAuthToken()) return { success: true, id: projectData.id || Date.now(), project: projectData }; 
    
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}` 
      },
      body: JSON.stringify(projectData)
    });
    if (!res.ok) throw new Error('프로젝트 저장 실패');
    const data = await res.json();
    return { success: true, id: data.project.id, project: data.project };
  } catch (err) {
    console.error("saveProject error:", err);
    if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] saveProject 치명적 오류: " + err.message, "error");
    return { success: false, error: err.message };
  }
}

// 프로젝트 삭제
window.deleteProject = async function(projectId) {
  if(isGuest()){
    const localData = localStorage.getItem('ds_guest_projects');
    if(!localData) return;
    const projects = JSON.parse(localData).filter(p => p.id != projectId);
    if(typeof addDebugLog === 'function') addDebugLog("[saveProject] 로컬 저장 시도 (항목수: " + projects.length + ")", "info");
    localStorage.setItem('ds_guest_projects', JSON.stringify(projects));
    if(typeof addDebugLog === 'function') addDebugLog("[saveProject] 로컬 저장 완료", "success");
    return;
  }
  
  if(!getAuthToken()) return;
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  if (!res.ok) throw new Error('프로젝트 삭제 실패');
}

/**
 * [AI 생성 API]
 * 주의: 기존 브라우저에서 Anthropic API를 직접 호출하던 것을 백엔드로 이관.
 * 프론트엔드는 백엔드(/api/generate)로 프롬프트와 토큰 수만 전달합니다.
 */
window.callBackendAI = async function(promptType, promptData) {
  if(isGuest()){
    // 게스트 모드에서는 3초 대기 후 모의 응답 반환 (전체 흐름 테스트용)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 상세 모의 데이터 반환
    if(promptType === 'plan') {
       return {
         title: "게스트 모드 샘플 드라마",
         logline: "카페에서 시작되는 운명적인 로맨스",
         episodes: [
           { num: 1, title: "시작되는 인연", scenes: [{ num: "S#1", loc: "카페", desc: "주인공이 커피를 마시는 중" }] }
         ],
         similar: { refs: ["도깨비", "태양의 후예"] }
       };
    }
    if(promptType === 'prod') {
       return {
         casting: [{ role: "남주", name: "공유(가상)" }],
         budget: { total: "10억", breakdown: [] }
       };
    }
    if(promptType === 'ppl') {
       return { items: [{ name: "가상 커피", scene: "S#1" }] };
    }
    if(promptType === 'script') {
       return {
         script: [
           { heading: "S# 1. 카페 / 데이", lines: [{ type:"action", text:"주인공이 창밖을 본다." }, { type:"dialog", char:"인물", line:"날씨가 좋네." }] }
         ]
       };
    }
    return { success: true, mock: true };
  }

  if(!getAuthToken()) throw new Error('백엔드 연동 전 임시 폴백 처리'); 
  
  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
  const userKey = localStorage.getItem('ds_user_api_key');
  if(userKey) headers['X-User-Api-Key'] = userKey;

  addDebugLog(`API 요청 준비 (유형: ${promptType})`, 'req');
  addDebugLog(`URL: ${API_BASE_URL}/generate`, 'req');

  try {
    const res = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: promptType, content: promptData })
    });
    
    addDebugLog(`API 응답 수신: ${res.status} ${res.statusText}`, res.ok ? 'info' : 'error');

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      addDebugLog(`API 오류 상세: ${JSON.stringify(err)}`, 'error');
      throw new Error(err.error || 'AI 생성 실패');
    }
    const data = await res.json();
    addDebugLog(`API 데이터 파싱 완료: ${Object.keys(data).join(', ')}`);
    return data;
  } catch (err) {
    addDebugLog(`통신 오류 발생: ${err.message}`, 'error');
    throw err;
  }
}
