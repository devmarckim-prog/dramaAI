// api.js
// 프론트엔드와 백엔드 통신 담당 레이어 (MVP → 프로덕션)

const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? 'http://localhost:3000/api' 
  : 'https://api.yourdomain.com';

function getAuthToken() {
  return localStorage.getItem('ds_auth_token') || '';
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

// 프로젝트 목록 불러오기 (SQLite 백엔드 연동)
window.fetchProjects = async function() {
  if(!getAuthToken()) return []; // 로그인이 안되어 있으면 빈 배열
  
  const res = await fetch(`${API_BASE_URL}/projects`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  
  if (!res.ok) {
    if(res.status === 401) {
      // 인증 만료
      localStorage.removeItem('ds_auth_token');
    }
    return [];
  }
  return await res.json();
}

// 프로젝트 저장
window.saveProject = async function(projectData) {
  if(!getAuthToken()) return projectData; 
  
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
  return data.project;
}

// 프로젝트 삭제
window.deleteProject = async function(projectId) {
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
  if(!getAuthToken()) throw new Error('백엔드 연동 전 임시 폴백 처리'); // 데모 폴백 트리거
  
  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
  // 사용자가 직접 입력한 API 키가 있으면 헤더로 전달
  const userKey = localStorage.getItem('ds_user_api_key');
  if(userKey) headers['X-User-Api-Key'] = userKey;

  const res = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: promptType, content: promptData })
  });
  if(!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || 'AI 생성 실패');
  }
  return await res.json();
}
