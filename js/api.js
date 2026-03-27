// api.js
// 프론트엔드와 백엔드 통신 담당 레이어 (MVP → 프로덕션)

const hostname = window.location.hostname;
const protocol = window.location.protocol;
const API_BASE_URL = (hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:')
  ? 'http://localhost:8080/api' 
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
    // 1. 디버그 로그 콘솔 주입 (Body 직속으로 이동하여 영속성 확보)
    if (!document.getElementById('debug-log-console')) {
      const container = document.createElement('div');
      container.id = 'debug-console-container';
      container.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:10000; text-align:right;';
      container.innerHTML = `
        <button id="toggle-debug-btn" onclick="toggleDebugLog()" style="background:#333;border:1px solid #555;color:#fff;padding:10px 20px;border-radius:20px;font-size:12px;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.3); white-space:nowrap;">🛠️ 기술 로그 보기</button>
        <div id="debug-log-console" style="display:block;margin-top:10px;background:#1a1410;color:#00ff00;font-family:monospace;font-size:11px;padding:15px;border-radius:8px;width:400px;max-height:400px;overflow-y:auto;text-align:left;line-height:1.5;box-shadow:0 10px 30px rgba(0,0,0,0.5); border:1px solid #333;">
          <div style="color:#aaa;border-bottom:0.5px solid #333;margin-bottom:8px;padding-bottom:4px;display:flex;justify-content:space-between; font-weight:bold;">
            <span>TECHNICAL LOG CONSOLE (v1.3.0)</span>
            <button onclick="document.getElementById('debug-log-content').innerHTML=''" style="background:none;border:none;color:#666;cursor:pointer;font-size:10px">[Clear]</button>
          </div>
          <div id="debug-log-content"></div>
        </div>
      `;
      document.body.appendChild(container);
    }

    // 2. 로고 버전 정보 주입/업데이트
    const logo = document.querySelector('.nav-logo');
    const existingVersion = document.querySelector('.logo-version');
    if (logo) {
      if (existingVersion) {
        if (existingVersion.textContent !== 'v1.3.0') {
          existingVersion.textContent = 'v1.3.0';
          existingVersion.style.fontSize = '12px';
          existingVersion.style.color = '#ffba08';
          existingVersion.style.fontWeight = '900';
          existingVersion.style.opacity = '1';
        }
      } else {
        const vSpan = document.createElement('span');
        vSpan.className = 'logo-version';
        vSpan.textContent = 'v1.3.0';
        vSpan.style.fontSize = '12px';
        vSpan.style.color = '#ffba08';
        vSpan.style.fontWeight = '900';
        vSpan.style.marginLeft = '8px';
        vSpan.style.opacity = '1';
        logo.appendChild(vSpan);
      }
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

window.fetchUserProfile = async function() {
  const token = getAuthToken();
  if(!token) return null;
  const res = await fetch(`${API_BASE_URL}/user`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if(!res.ok) return null;
  return await res.json();
}

window.logoutUser = function() {
  localStorage.removeItem('ds_auth_token');
  localStorage.removeItem('ds_user_email');
  localStorage.removeItem('ds_user_avatar');
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

// 프로젝트 저장 (DB 전용 버전)
window.saveProject = async function(projectData) {
  try {
    if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] saveProject 시작 (DB 저장 모드)", "info");
    
    const token = getAuthToken();
    if (!token) {
      if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] 인증 토큰 없음 - 로그인 필요", "warn");
      showToast('프로젝트 저장을 위해 로그인이 필요합니다.', 'warn');
      if(typeof showLoginModal === 'function') showLoginModal();
      return { success: false, error: 'Login required' };
    }

    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(projectData)
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || '프로젝트 저장 실패');
    }
    
    const data = await res.json();
    if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] DB 저장 성공", "success");
    return { success: true, id: data.project.id, project: data.project };

  } catch (err) {
    console.error("saveProject error:", err);
    if(typeof window.addDebugLog === 'function') window.addDebugLog("[DEBUG] saveProject 오류: " + err.message, "error");
    showToast(`저장 오류: ${err.message}`, 'error');
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
