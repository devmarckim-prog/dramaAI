/**
 * Authentication and User Session
 */

import { state } from './state.js';
import { showPage, showToast } from './navigation.js';

export function renderNav() {
  const user = state.currentUser;
  const nav = document.getElementById('nav-actions'); // Fixed ID from index.html
  if (!nav) return;

  if (state.isLoggedIn) {
    const userEmail = localStorage.getItem('ds_user_email') || 'User';
    const avatarChar = userEmail[0].toUpperCase();
    const avatarUrl = localStorage.getItem('ds_user_avatar');
    
    // Admin Check + Developer Fallback
    const isAdmin = (state.userProfile && state.userProfile.role === 'admin') || userEmail === 'dev.marckim@gmail.com';
    
    const avatarHtml = avatarUrl 
      ? `<img src="${avatarUrl}" class="nav-avatar-img">`
      : `<div class="nav-avatar-placeholder">${avatarChar}</div>`;

    const adminBtn = isAdmin 
      ? `<button class="nav-btn-admin" onclick="showPage('admin')">👑 백엔드 오피스</button>`
      : '';
    
    nav.innerHTML = `
      <div class="nav-user-row">
        ${adminBtn}
        <span class="nav-email">${userEmail}</span>
        <div class="nav-avatar" onclick="showPage('settings')" title="설정">
          ${avatarHtml}
        </div>
        <button class="nav-logout-btn" onclick="handleLogout()">로그아웃</button>
      </div>`;
  } else if (state.isGuestMode) {
    nav.innerHTML = `
      <div class="nav-user-row">
        <span class="nav-email">게스트 모드</span>
        <div class="nav-avatar">
          <div class="nav-avatar-placeholder guest-bg">G</div>
        </div>
        <button class="nav-logout-btn" onclick="handleLogout()">기록 삭제</button>
      </div>`;
  } else {
    nav.innerHTML = `<button class="btn btn-primary" onclick="showLoginModal()">로그인</button>`;
  }
}

export async function handleLogout() {
  localStorage.removeItem('ds_auth_token');
  localStorage.removeItem('ds_user_email');
  localStorage.removeItem('ds_user_avatar');
  localStorage.removeItem('ds_guest_mode');
  state.isLoggedIn = false;
  state.currentUser = null;
  state.userProfile = { role: 'user', credits: 0, plan: 'Free' };
  state.isGuestMode = false;
  showToast('로그아웃되었습니다.', 'info');
  showPage('home');
  renderNav();
}

export function handleStartBtn() {
  console.log('[DEBUG] handleStartBtn triggered. LoggedIn:', state.isLoggedIn);
  if (!state.isLoggedIn) {
    showLoginModal();
    return;
  }
  showPage('wizard');
}

export function showLoginModal() {
  const wrap = document.getElementById('login-modal-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="modal-backdrop" id="login-backdrop" onclick="window.closeLoginModal(event)">
      <div class="modal-box login-modal-box">
        <div class="login-hero">
          <div class="login-hero-bg"></div>
          <div class="login-logo">드라마스크립트<span>AI</span></div>
          <div class="login-tagline">K-드라마 전문 AI 대본 작가</div>
        </div>
        <div class="login-body">
          <div style="display:flex; flex-direction:column; gap:16px; margin-top:8px">
            <button class="login-social-btn" onclick="window.doLogin('google')">
              <div class="login-social-icon google-bg">G</div>
              Google 계정으로 로그인
            </button>
          </div>
          
          <div class="login-footer-actions">
            <div class="login-agree">가입 시 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의합니다</div>
            <button class="login-guest-link" onclick="window.enterGuestMode()">게스트 모드로 체험하기</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function closeLoginModal(e) {
  if (e && e.target.id !== 'login-backdrop') return;
  const wrap = document.getElementById('login-modal-wrap');
  if (wrap) {
    const backdrop = wrap.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('hiding');
      setTimeout(() => wrap.innerHTML = '', 200);
    } else {
      wrap.innerHTML = '';
    }
  }
}

export async function doLogin(provider) {
  addDebugLog(`소셜 로그인 시도: ${provider}`, 'info');
  
  // Protocol check: Social login REQUIRES http or https
  if (window.location.protocol === 'file:') {
    const msg = '로컬 파일(file://)에서는 로그인이 불가능합니다. http://localhost:8081 주소를 사용해 주세요.';
    console.warn('[Auth] Redirect blocked: Current protocol is "file:"');
    addDebugLog(msg, 'error');
    showToast(msg, 'warn', '⚠️', 6000);
    return;
  }

  if (provider === 'google') {
    localStorage.removeItem('ds_guest_mode'); // Clear guest mode before trying to login
    state.isGuestMode = false;
    
    try {
      addDebugLog('구글 로그인 URL 요청 중...');
      const res = await fetch('/api/auth/google');
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.url) {
        addDebugLog('로그인 페이지로 이동합니다...', 'success');
        window.location.href = data.url; 
      } else {
        throw new Error('응답에서 URL을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Login error:', error);
      addDebugLog(`구글 로그인 오류: ${error.message}`, 'error');
      showToast(`로그인 연결 실패: ${error.message}`, 'warn');
    }
  }
}

export function enterGuestMode() {
  localStorage.setItem('ds_guest_mode', 'true');
  state.isGuestMode = true;
  state.isLoggedIn = false;
  closeLoginModal();
  renderNav();
  showToast('게스트 모드로 시작합니다.', 'info');
  showPage('wizard');
}

export function fetchUserProfile() {
  return new Promise(async (resolve) => {
    const token = localStorage.getItem('ds_auth_token');
    if (!token) return resolve(null);

    try {
      const res = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const profile = await res.json();
        state.userProfile = profile;
        state.isLoggedIn = true;
        
        // Sync to localStorage for persistent initial state
        if (profile.email) localStorage.setItem('ds_user_email', profile.email);
        if (profile.role) localStorage.setItem('ds_user_role', profile.role);
        if (profile.credits !== undefined) localStorage.setItem('ds_user_credits', profile.credits);
        if (profile.plan) localStorage.setItem('ds_user_plan', profile.plan);
        
        // Clear guest mode on successful server profile sync
        localStorage.removeItem('ds_guest_mode');
        state.isGuestMode = false;

        renderNav();
        resolve(profile);
      } else if (res.status === 401) {
        console.warn('[Auth] Session expired via 401. Clearing token.');
        localStorage.removeItem('ds_auth_token');
        state.isLoggedIn = false;
        renderNav();
        resolve(null);
      } else {
        resolve(null);
      }
    } catch (err) {
      console.error('[Auth] Profile fetch error:', err);
      resolve(null);
    }
  });
}

/**
 * REFRESH ADMIN SESSION: Force re-login for dev.marckim@gmail.com
 */
export async function refreshAdminSession() {
  console.log('[Auth] Forcing admin session refresh...');
  localStorage.removeItem('ds_auth_token');
  
  // Directly trigger Google OAuth
  try {
    const res = await fetch('/api/auth/google');
    const { url } = await res.json();
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('Auth URL not provided');
    }
  } catch (err) {
    console.error('[Auth] Failed to trigger refresh:', err);
    alert('인증 서버와 통신할 수 없습니다. 잠시 후 쇼하세요.');
  }
}

// Global Exports
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.doLogin = doLogin;
window.enterGuestMode = enterGuestMode;
window.handleLogout = handleLogout;
window.refreshAdminSession = refreshAdminSession;
