/**
 * Settings and API Key Management
 */

import { state } from './state.js';
import { showToast } from './navigation.js';

export async function renderSettingsProfile() {
  if (!state.isLoggedIn) return;
  
  const userEmail = localStorage.getItem('ds_user_email');
  const token = localStorage.getItem('ds_auth_token');
  
  const el = document.getElementById('settings-username');
  const em = document.getElementById('settings-email');
  const av = document.getElementById('settings-avatar');
  
  const qVal = document.getElementById('settings-quota-val');
  const pVal = document.getElementById('settings-plan-val');
  const qBar = document.querySelector('.usage-bar-fill');
  
  if (el) el.textContent = userEmail ? userEmail.split('@')[0] : 'User';
  if (em) em.textContent = userEmail || '';
  if (av) av.textContent = (userEmail || 'U')[0].toUpperCase();
  
  // Real-time Profile Sync
  try {
    const res = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const profile = await res.json();
      if (pVal) pVal.textContent = profile.plan?.toUpperCase() || 'FREE';
      if (qVal) {
        const total = profile.plan === 'Pro' ? 100 : 10;
        qVal.innerHTML = `${profile.credits || 0} / ${total} <span class="usage-val-sub">Credits</span>`;
        if (qBar) qBar.style.width = `${Math.min(100, ((profile.credits || 0) / total) * 100)}%`;
      }
    }
  } catch (err) {
    console.warn('[Settings] Failed to sync real-time profile:', err);
  }
  
  loadApiKeyToSettings();
}

export function loadApiKeyToSettings() {
  const key = localStorage.getItem('ds_api_key') || '';
  const model = localStorage.getItem('ds_model') || 'claude-sonnet-4-6';
  const inp = document.getElementById('settings-api-key');
  const modelSel = document.getElementById('settings-model');
  
  if (inp && key) inp.value = key;
  if (modelSel) modelSel.value = model;
  
  updateApiKeyStatusUI(!!key);
}

export function onApiKeyInput() {
  const v = document.getElementById('settings-api-key')?.value.trim() || '';
  updateApiKeyStatusUI(false, v ? '입력됨 👋 저장 버튼을 눌러주세요' : 'API 키 없음 ⚠️ 데모 모드');
}

export function updateApiKeyStatusUI(hasKey, msg) {
  const dot1 = document.getElementById('api-key-status-dot');
  const txt1 = document.getElementById('api-key-status-text');
  
  const label = msg || (hasKey ? 'AI Studio Connected - Ready for Production' : 'Demo Mode - No API Key Integrated');
  
  if (dot1) {
    if (hasKey) {
      dot1.classList.add('active');
      dot1.style.background = '#1D9E75';
    } else {
      dot1.classList.remove('active');
      dot1.style.background = '#555';
    }
  }

  if (txt1) {
    txt1.textContent = label;
    txt1.style.color = hasKey ? '#1D9E75' : '#666';
  }
}

export function saveApiKey() {
  const key = document.getElementById('settings-api-key')?.value.trim() || '';
  const model = document.getElementById('settings-model')?.value || 'claude-sonnet-4-6';
  
  if (!key) {
    showToast('API 키를 입력해주세요.', 'warn', '⚠️');
    return;
  }
  
  if (!key.startsWith('sk-ant-')) {
    showToast('올바른 Anthropic API 키 형식이 아닙니다.', 'warn', '⚠️');
    return;
  }
  
  localStorage.setItem('ds_api_key', key);
  localStorage.setItem('ds_model', model);
  updateApiKeyStatusUI(true);
  showToast('API 키가 저장되었습니다.', 'success', '✅');
}

export function deleteApiKey() {
  if (!confirm('API 키를 삭제하면 데모 모드로 전환됩니다. 삭제할까요?')) return;
  
  localStorage.removeItem('ds_api_key');
  const inp = document.getElementById('settings-api-key');
  if (inp) inp.value = '';
  updateApiKeyStatusUI(false);
  showToast('API 키가 삭제되었습니다.', 'info', '🗑️');
}

export function toggleApiKeyVisibility() {
  const inp = document.getElementById('settings-api-key');
  const btn = document.getElementById('api-key-eye-btn');
  if (!inp) return;
  
  const isPassword = inp.type === 'password';
  inp.type = isPassword ? 'text' : 'password';
  if (btn) btn.textContent = isPassword ? '🙈' : '👁️';
}

export async function testApiKey() {
  const key = localStorage.getItem('ds_api_key') || '';
  if (!key) {
    showToast('저장된 API 키가 없습니다.', 'warn', '⚠️');
    return;
  }
  
  showToast('연결 테스트 중...', 'info', '📡');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }]
      })
    });
    
    if (res.ok) {
      showToast('API 연결 성공! AI 생성이 활성화됩니다.', 'success', '✅');
    } else {
      const e = await res.json().catch(() => ({}));
      showToast(`연결 실패: ${e?.error?.message || res.status}`, 'warn', '⚠️');
    }
  } catch (e) {
    showToast(`연결 오류: ${e.message}`, 'warn', '⚠️');
  }
}

export async function clearAllProjects() {
  if (!confirm('모든 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  
  try {
    const res = await fetch('/api/projects', { method: 'DELETE' });
    if (res.ok) {
      showToast('모든 프로젝트가 삭제되었습니다.', 'success', '🗑️');
      if (window.renderProjectCards) window.renderProjectCards();
    } else {
      throw new Error('삭제 실패');
    }
  } catch (err) {
    console.error(err);
    showToast('프로젝트 일괄 삭제에 실패했습니다.', 'error', '⚠️');
  }
}
