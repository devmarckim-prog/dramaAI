export function addDebugLog(msg, type = 'info') {
  const content = document.getElementById('debug-log-content');
  const overlay = document.getElementById('debug-overlay-content');
  
  const time = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const color = type === 'error' ? '#ff4444' : (type === 'success' ? '#c9933a' : '#888');
  const icon = type === 'error' ? '✖' : (type === 'success' ? '✔' : '•');

  if (content) {
    const div = document.createElement('div');
    div.className = 'debug-log-item';
    div.innerHTML = `
      <span class="debug-log-time">[${time}]</span>
      <span class="debug-log-icon debug-log-msg-${type}">${icon}</span>
      <span class="debug-log-msg debug-log-msg-${type}">${msg}</span>
    `;
    content.appendChild(div);
    content.scrollTop = content.scrollHeight;
  }

  if (overlay) {
    const line = document.createElement('div');
    line.className = `debug-log-entry debug-log-type-${type}`;
    line.innerHTML = `<span class="debug-log-time">[${time}]</span> <span class="debug-log-msg">${msg}</span>`;
    overlay.appendChild(line);
    overlay.scrollTop = overlay.scrollHeight;
    
    // Keep only last 50 lines to prevent lag
    while (overlay.children.length > 50) overlay.removeChild(overlay.firstChild);
  }

  console.log(`[DEBUG] ${msg}`);
}

export function showDebugLog() {
  const el = document.getElementById('debug-log-modal');
  if (el) el.classList.add('active');
}

import { state } from './state.js';
// Removed circular imports to prevent initialization issues
// import { handleLogout } from './auth.js';
// import { renderSettingsProfile } from './settings.js';
// import { buildResultPanels } from './dashboard.js';

export function showPage(pageId) {
  const adminEmail = 'dev.marckim@gmail.com';
  const userEmail = localStorage.getItem('ds_user_email');
  const isAdmin = !userEmail || userEmail === adminEmail; // Relaxed for local dev/user request

  if (pageId === 'admin' && !isAdmin) {
    addDebugLog(`권한 없는 사용자의 어드민 접근 차단: ${userEmail}`, 'error');
    showToast('관리자 권한이 없습니다.', 'warn');
    pageId = (state.isLoggedIn || state.isGuestMode) ? 'projects' : 'home';
  }

  if (pageId === 'home' && (state.isLoggedIn || state.isGuestMode)) {
    pageId = 'projects';
    addDebugLog("로그인/게스트 상태: 홈 대신 프로젝트 목록으로 이동합니다.");
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);

  if (pageId === 'projects') {
    if (window.renderProjectCards) window.renderProjectCards();
  }
  
  if (pageId === 'result') {
    if (window.buildResultPanels) window.buildResultPanels(); 
  }
  if (pageId === 'settings') {
    if (window.renderSettingsProfile) window.renderSettingsProfile();
  }
  if (pageId === 'admin') {
    if (window.initAdmin) window.initAdmin();
  }
}

export function showPanel(panelId) {
  // Fix: The HTML uses 'result-panel' and 'sidebar-item'
  document.querySelectorAll('.result-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('panel-' + panelId);
  if (target) target.classList.add('active');
  
  document.querySelectorAll('.sidebar-item').forEach(item => {
    // Check if the onclick attribute contains the panelId
    const onClickAttr = item.getAttribute('onclick') || '';
    item.classList.toggle('active', onClickAttr.includes(`'${panelId}'`));
  });
}

export function showToast(msg, type = 'info', icon = null, duration = 4000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const id = 'toast-' + Date.now();
  
  // Auto-icon mapping if not provided
  if (!icon) {
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warn') icon = '⚠️';
    else icon = 'ℹ️';
  }

  const html = `<div id="${id}" class="toast-item toast-${type}">
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${msg}</span>
  </div>`;
  container.insertAdjacentHTML('afterbegin', html);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 300);
    }
  }, duration);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  document.body.appendChild(div);
  return div;
}

/**
 * Centered "Coming Soon" toast for non-implemented features
 */
export function showComingSoon(feature) {
  showToast(`${feature} 기능은 곧 준비될 예정입니다.`, 'info', '⏳');
}

window.showComingSoon = showComingSoon;

// Removed old version of updateApiStatus to prevent duplication error


export function numToPrice(n) {
  if (n >= 10000) {
    const a = Math.floor(n / 10000);
    const r = n % 10000;
    return r > 0 ? `${a}억 ${r.toLocaleString()}만원` : `${a}억`;
  }
  return n.toLocaleString() + '만원';
}

export function priceToNum(str) {
  if (!str) return 0;
  const m = str.match(/([\d,]+)/g);
  if (!m) return 0;
  const n = parseInt(m[0].replace(/,/g, ''));
  if (str.includes('억')) return n * 10000;
  return n;
}
export function getBudgetTotal(ep) {
  return ep <= 4 ? '64억' : ep <= 8 ? '127.5억' : ep <= 12 ? '190억' : '248억';
}
export function getPplTotal(ep) {
  return ep <= 4 ? '3.2억' : ep <= 8 ? '6.5억' : ep <= 12 ? '9억' : '12억';
}
export function toggleDebugOverlay() {
  const overlay = document.getElementById('debug-overlay');
  if (!overlay) return;
  const isMin = overlay.classList.toggle('minimized');
  const icon = document.getElementById('debug-toggle-icon');
  if (icon) icon.textContent = isMin ? '▶' : '▼';
}

window.toggleDebugOverlay = toggleDebugOverlay;

export function getArtistTotal(ep) {
  return ep <= 4 ? '16억' : ep <= 8 ? '15.9억' : '15.5억';
}
export function getNetBudget(ep) {
  return ep <= 4 ? '60.8억' : ep <= 8 ? '121억' : '236억';
}

// Modal System
export function showModal({ icon = '💡', iconType = 'info', title, subtitle, body = '', buttons = [] }) {
  const container = document.getElementById('modal-wrap') || document.getElementById('login-modal-wrap');
  if (!container) return;

  let btnHtml = '';
  buttons.forEach((b, i) => {
    const styleClass = b.style === 'ghost' ? 'btn-ghost' : (b.style === 'primary' ? 'btn-primary' : 'btn-danger');
    btnHtml += `<button class="btn ${styleClass}" id="mbtn-${i}">${b.label}</button>`;
  });

  container.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-box login-modal-box">
        <div class="login-hero ${iconType === 'confirm' ? 'modal-confirm-hero' : ''}">
          <div class="login-hero-bg"></div>
          <div class="modal-icon-header">${icon}</div>
          <div class="login-logo">${title}</div>
          <div class="login-tagline">${subtitle}</div>
        </div>
        <div class="login-body">
          <div class="modal-body-text">${body}</div>
          <div class="modal-btn-column">
            ${btnHtml}
          </div>
        </div>
      </div>
    </div>`;

  buttons.forEach((b, i) => {
    document.getElementById(`mbtn-${i}`)?.addEventListener('click', () => {
      if (typeof b.action === 'function') b.action();
      closeModal();
    });
  });
}

export function updateApiStatus(text, step) {
  const banner = document.getElementById('api-status-banner');
  const textEl = document.getElementById('api-status-text');
  const stepEl = document.getElementById('api-status-step');
  if (banner) banner.style.display = 'flex';
  if (textEl) textEl.textContent = text;
  if (stepEl) stepEl.textContent = step;
}

export function closeModal() {
  const wrap = document.getElementById('modal-wrap') || document.getElementById('login-modal-wrap');
  if (wrap) wrap.innerHTML = '';
}

export function showPlanModal(plan) {
  const plans = {
    pro: {
      icon: '💎',
      iconType: 'info',
      title: '프로 플랜 👋 14일 무료 체험',
      subtitle: '₩29,000/월',
      body: '14일 무료 체험 후 결제가 시작됩니다. 현재 준비 중입니다.',
      buttons: [
        { label: '닫기', style: 'ghost' },
        { label: '출시 알림 신청', style: 'primary', action: () => showToast('신청 완료!', 'success', '✅') }
      ]
    },
    studio: {
      icon: '🏢',
      iconType: 'confirm',
      title: '스튜디오 플랜 문의',
      subtitle: '₩99,000/월',
      body: '문의: hello@dramascript.ai',
      buttons: [
        { label: '닫기', style: 'ghost' },
        { label: '이메일 문의', style: 'primary', action: () => showToast('hello@dramascript.ai', 'info', '📧', 5000) }
      ]
    }
  };
  if (plans[plan]) showModal(plans[plan]);
}

export function showPdfModal() {
  showModal({
    icon: '📄',
    iconType: 'info',
    title: 'PDF 내보내기',
    subtitle: 'Pro 플랜 전용',
    body: 'PDF 내보내기는 <strong>프로 플랜</strong> 이상에서 사용 가능합니다.',
    buttons: [
      { label: '닫기', style: 'ghost' },
      { label: 'Pro 체험 시작', style: 'primary', action: () => showPlanModal('pro') }
    ]
  });
}

export function showNextEpModal() {
  showModal({
    icon: '🎬',
    iconType: 'info',
    title: '다음 화 생성',
    subtitle: '다음 화 대본을 생성합니다',
    body: '데모 모드에서는 샘플 씬으로 표시됩니다.',
    buttons: [
      { label: '취소', style: 'ghost' },
      { label: '생성', style: 'primary', action: () => showComingSoon('다음 화 생성') }
    ]
  });
}

export function showDeleteAccountModal() {
  showModal({
    icon: '⚠️',
    iconType: 'confirm',
    title: '계정 삭제',
    subtitle: '이 작업은 되돌릴 수 없습니다',
    body: '계정과 모든 프로젝트가 <strong>영구 삭제</strong>됩니다. 정말 삭제하시겠습니까?',
    buttons: [
      { label: '취소', style: 'ghost' },
      { label: '계정 삭제', style: 'danger', action: () => {
          if (window.handleLogout) window.handleLogout();
          showToast('계정이 삭제되었습니다.', 'success', '👋');
        }
      }
    ]
  });
}

// Floating Agent
export function toggleFloatingAgent() {
  const el = document.getElementById('floating-agent');
  const toggle = document.getElementById('floating-agent-toggle');
  if (!el) return;
  const isOpen = el.classList.contains('open');
  el.classList.toggle('open', !isOpen);
  if (toggle) toggle.style.display = isOpen ? '' : 'none';
  if (!isOpen) {
    setTimeout(() => document.getElementById('floating-agent-textarea')?.focus(), 100);
  }
}

export function showFloatingAgent() {
  const el = document.getElementById('floating-agent');
  const toggle = document.getElementById('floating-agent-toggle');
  if (el) el.classList.add('open');
  if (toggle) toggle.style.display = 'none';
  setTimeout(() => document.getElementById('floating-agent-textarea')?.focus(), 100);
}

export function sendFloatingAgent() {
  const ta = document.getElementById('floating-agent-textarea');
  const msg = ta?.value.trim();
  if (!msg) return;
  ta.value = '';

  addFloatingMsg(msg, 'user');

  const typingId = 'float-typing-' + Date.now();
  const hist = document.getElementById('floating-agent-history');
  if (hist) {
    const typing = document.createElement('div');
    typing.className = 'float-msg ai typing';
    typing.id = typingId;
    typing.textContent = '수정 중...';
    hist.appendChild(typing);
    hist.scrollTop = hist.scrollHeight;
  }

  setTimeout(() => {
    const typing = document.getElementById(typingId);
    if (typing) typing.remove();

    const reply = `요청하신 대로 "${msg.slice(0, 15)}..." 방향으로 대본을 조정했습니다. 적용 버튼을 누르면 반영됩니다.`;
    addFloatingMsg(reply, 'ai');

    const hist2 = document.getElementById('floating-agent-history');
    if (hist2) {
      const btnRow = document.createElement('div');
      btnRow.className = 'agent-btn-row';
      btnRow.innerHTML = `
        <button class="btn btn-primary btn-apply-scene">✨ 적용</button>
        <button class="btn btn-ghost btn-cancel-scene">취소</button>`;
      hist2.appendChild(btnRow);
      btnRow.querySelector('.btn-apply-scene').onclick = () => {
        showToast('씬이 적용되었습니다.', 'success', '✅');
        btnRow.remove();
      };
      btnRow.querySelector('.btn-cancel-scene').onclick = () => btnRow.remove();
      hist2.scrollTop = hist2.scrollHeight;
    }
  }, 1000);
}

function addFloatingMsg(text, role) {
  const hist = document.getElementById('floating-agent-history');
  if (!hist) return;
  const div = document.createElement('div');
  div.className = 'float-msg ' + role;
  div.textContent = text;
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}
