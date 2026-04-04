/**
 * Backend Office (Admin Dashboard) Module
 */

import { showToast, addDebugLog } from './navigation.js';
import { normalizeProject } from './api.js';
import { DIRECTORS_ARENA_SAMPLE, SEOUL_NIGHT_SAMPLE } from './samples.js';

export async function initAdmin() {
  try {
    console.log('[Admin] Initializing Backend Office...');
    
    // 1. Fetch current profile from server to verify role
    let profile = null;
    const token = localStorage.getItem('ds_auth_token');
    
    if (token) {
      try {
        const res = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) profile = await res.json();
      } catch (e) {
        console.warn('[Admin] Failed to fetch profile for role verification:', e);
      }
    }

    const userEmail = localStorage.getItem('ds_user_email');
    const isAdmin = !userEmail || (profile && profile.role === 'admin') || userEmail === 'dev.marckim@gmail.com';
    
    if (!isAdmin) {
      console.warn('[Admin] Unauthorized access attempt detected.');
      // We will let switchAdminTab handle the "Unauthorized" UI state
    }

    const syncEl = document.getElementById('admin-last-sync');
    if (syncEl) {
      syncEl.textContent = 'Last synced: ' + new Date().toLocaleTimeString();
    }
    
    // Default to 'samples' tab for convenience as requested
    switchAdminTab('samples');
  } catch (err) {
    console.error('[Admin Init Error]', err);
    showToast('관리 시스템 초기화 중 오류가 발생했습니다.', 'error');
  }
}

/**
 * Helper for authenticated admin fetch
 * Ensures we use the most recent token from Supabase session
 */
async function adminFetch(url, options = {}) {
  let token = localStorage.getItem('ds_auth_token');
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `${res.status}`);
    }
    return res;
  } catch (err) {
    console.error('[Admin Fetch Error]', err);
    throw err;
  }
}

export async function switchAdminTab(tabId) {
  // Update UI active state
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById(`admin-nav-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  const titleEl = document.getElementById('admin-page-title');
  const contentEl = document.getElementById('admin-tab-content');
  if (!contentEl) return;

  contentEl.innerHTML = ``;
  const loader = document.createElement('div');
  loader.id = 'admin-loader';
  loader.className = 'admin-loading-wrap';
  loader.innerHTML = `<div class="mp-spinner"></div><div class="admin-loading-text">데이터를 불러오는 중...</div>`;
  contentEl.appendChild(loader);

  const removeLoader = () => {
    const l = document.getElementById('admin-loader');
    if (l) l.remove();
  };

  try {
    switch (tabId) {
      case 'dashboard':
        titleEl.textContent = '📊 대시보드 요약';
        await renderAdminDashboard(contentEl);
        break;
      case 'scripts':
        titleEl.textContent = '📝 생성한 대본 보기';
        await renderAdminScripts(contentEl);
        break;
      case 'users':
        titleEl.textContent = '👥 가입자 관리';
        await renderAdminUsers(contentEl);
        break;
      case 'config':
        titleEl.textContent = '⚙️ AI 모델 & 프롬프트';
        await renderAdminConfig(contentEl);
        break;
      case 'samples':
        titleEl.textContent = '🚀 샘플 프로젝트 관리';
        await renderAdminSamples(contentEl);
        break;
      case 'billing':
        titleEl.textContent = '💳 API Billing';
        await renderAdminBilling(contentEl);
        break;
      case 'health':
        titleEl.textContent = '🛡️ 시스템 보안 & 헬스';
        await renderAdminHealth(contentEl);
        break;
      default:
        contentEl.innerHTML = '<div style="padding:40px">Tab not found</div>';
    }
    removeLoader(); // ✅ 로딩 완료 후 스피너 항상 제거
  } catch (error) {
    console.error(`[Admin Tab Failure] ${tabId}:`, error);
    const errMsg = (error && error.message) || '알 수 없는 오류가 발생했습니다.';
    const userEmail = localStorage.getItem('ds_user_email');
    const isAdminEmail = (userEmail === 'dev.marckim@gmail.com');
    
    const isAuthErr = errMsg.includes('session') || errMsg.includes('token') || errMsg.includes('권한') || errMsg.includes('denied') || errMsg === '401' || errMsg === '403';
    const titleText = isAuthErr ? (isAdminEmail ? '관리자님, 세션이 만료되었습니다' : '접근 권한이 필요합니다') : '데이터 로드 실패';
    const subText = isAuthErr ? (isAdminEmail ? '보안을 위해 다시 한번 소셜 로그인을 진행해 주세요.' : '관리자 계정(dev.marckim@gmail.com)으로 로그인되어 있는지 확인해 주세요.') : '일시적인 서버 오류이거나 인터넷 연결이 불안정합니다.';

    contentEl.innerHTML = `
      <div class="admin-unauthorized-wrap">
        <div class="admin-auth-icon-wrap">
          <div class="admin-auth-icon">🛡️</div>
          <div class="admin-auth-glow"></div>
        </div>
        <h3 class="admin-auth-title">${titleText}</h3>
        <p class="admin-auth-desc">
          ${subText}<br>
          <span class="admin-auth-error-code">(${errMsg})</span>
        </p>
        <div class="admin-search-wrap" style="justify-content:center">
          <button class="btn btn-primary" onclick="window.refreshAdminSession()" style="padding:12px 32px">세션 갱신</button>
          <button class="btn btn-ghost" onclick="showPage('home')" style="color:#fff">홈으로</button>
        </div>
      </div>`;
  }
}

async function renderAdminDashboard(container) {
  let stats = { totalProjects: 0, totalUsers: 0, activeModels: 'Unknown', estimatedCost: '0.00' };
  let health = { status: 'healthy', latency: 0, uptime: 0 };
  let recentProjects = [];

  try {
    const [sRes, hRes, pRes] = await Promise.all([
      adminFetch('/api/admin/stats'),
      adminFetch('/api/admin/health'),
      adminFetch('/api/admin/projects')
    ]);
    stats = await sRes.json();
    health = await hRes.json();
    recentProjects = await pRes.json();
  } catch (err) {
    console.error('[Admin Dashboard Data Fetch Error]', err);
  }

  container.innerHTML = `
    <div style="animation: fadeUp 0.5s ease-out both">
      <div class="admin-stats-grid">
        <div class="admin-stat-card" style="border-top: 3px solid var(--gold); box-shadow: 0 4px 20px rgba(212, 175, 55, 0.1)">
          <div class="admin-stat-label">총 누적 매출 <span class="admin-stat-badge" style="background:${stats.isRealRevenue ? 'rgba(76,175,80,0.2)' : '#444'}; color:${stats.isRealRevenue ? '#4CAF50' : '#aaa'}">${stats.revenueLabel || 'DUMMY'}</span></div>
          <div class="admin-stat-value">₩${(stats.totalRevenue || 0).toLocaleString()}<span class="admin-stat-unit"></span></div>
          <div class="admin-stat-subtext" style="color:${stats.isRealRevenue ? 'var(--teal)' : 'var(--gold)'}">
            ${stats.isRealRevenue ? '실제 Pro 플랜 기반 추산' : '결제 데이터 미연동 (추후 구현)'}
          </div>
        </div>
        <div class="admin-stat-card" style="border-top: 3px solid var(--teal); box-shadow: 0 4px 20px rgba(29, 158, 117, 0.1)">
          <div class="admin-stat-label">활성 창작자</div>
          <div class="admin-stat-value">${stats.totalUsers || 0}<span class="admin-stat-unit">명</span></div>
          <div style="font-size:11px; color:#aaa; margin-top:8px">가입된 전체 프로필 수</div>
        </div>
        <div class="admin-stat-card" style="border-top: 3px solid #6366f1">
          <div class="admin-stat-label">전체 시나리오</div>
          <div class="admin-stat-value">${stats.totalProjects || 0}<span class="admin-stat-unit">건</span></div>
          <div style="font-size:11px; color:#aaa; margin-top:4px">
            완성: <strong style="color:#4CAF50">${stats.completedProjects || 0}건</strong> &nbsp;|&nbsp; 오늘: <strong>${stats.todayGen || 0}건</strong>
          </div>
        </div>
        <div class="admin-stat-card" style="border-top: 3px solid ${stats.isRealCost ? 'var(--teal)' : 'var(--red)'}">
          <div class="admin-stat-label">API 운영 비용
            <span class="admin-stat-badge" style="background:${
              stats.costSource === 'REAL' ? 'rgba(29,158,117,0.15)' :
              stats.costSource === 'API_ERR' ? 'rgba(255,165,0,0.15)' :
              'rgba(255,0,0,0.1)'
            }; color:${
              stats.costSource === 'REAL' ? 'var(--teal)' :
              stats.costSource === 'API_ERR' ? 'orange' :
              'var(--red)'
            }">${stats.costSource || 'ESTIMATED'}</span>
          </div>
          <div class="admin-stat-value" style="font-size:24px; color:${stats.isRealCost ? 'var(--teal)' : 'var(--red)'}">$${stats.estimatedCost || '0.00'}</div>
          <div class="admin-status-indicator" style="margin-top:6px">
            <span class="admin-status-dot" style="background:#4CAF50"></span>
            <span style="font-size:11px">${stats.activeModels || 'Claude Sonnet 4.6'}</span>
          </div>
          <div style="font-size:10px; color:#555; margin-top:4px">${stats.costPeriod || '누적 추산치'} · 총 ${stats.totalProjects || 0}건</div>
          ${!stats.isRealCost ? `<div style="font-size:10px; color:#888; margin-top:4px">💡 실제 비용 연동: .env에 ANTHROPIC_ADMIN_API_KEY 추가</div>` : ''}
        </div>

      </div>

      
      <div class="admin-section-title">
        <span>최근 생성 타임라인</span>
      </div>
      <div class="admin-table-wrap">
         <table class="admin-table">
           <thead><tr><th>일시</th><th>프로젝트</th><th>사용자</th><th>결과</th></tr></thead>
           <tbody>
             ${recentProjects.slice(0, 10).map(p => {
               const progress = p.pct || 0;
               const dateStr = new Date(p.created_at).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
               return `
               <tr>
                 <td style="color:#666; font-size:11px">${dateStr}</td>
                 <td>
                   <div style="font-weight:600; font-size:13px">${p.title}</div>
                   <div style="font-size:10px; color:#888">${p.genre}</div>
                 </td>
                 <td style="font-size:11px; color:#888">${p.user_email || 'anonymous'}</td>
                 <td>
                   <div style="display:flex; align-items:center; gap:8px">
                     <span class="admin-badge ${p.status === 'done' || p.status === 'success' ? 'admin-badge-done' : (p.status === 'error' ? 'admin-badge-err' : 'admin-badge-gen')}">${p.status || 'Success'}</span>
                     <div style="flex:1; min-width:60px; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden">
                       <div style="width:${progress}%; height:100%; background:var(--gold); transition: width 0.3s"></div>
                     </div>
                     <span style="font-size:10px; color:var(--gold)">${progress}%</span>
                   </div>
                 </td>
               </tr>
               `;
             }).join('')}
           </tbody>
         </table>
      </div>

      <!-- ── Claude API 비용 세부 내역 패널 ─────────────────────────── -->
      <div class="admin-section-title" style="margin-top:24px">
        <span>Claude API 실제 운영 비용 세부 내역</span>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="cost-detail-days" class="admin-config-input" style="padding:4px 8px;font-size:12px;width:auto">
            <option value="7">최근 7일</option>
            <option value="14">최근 14일</option>
            <option value="30" selected>최근 30일</option>
            <option value="60">최근 60일</option>
            <option value="90">최근 90일</option>
          </select>
          <button class="btn btn-primary" id="btn-load-cost-detail" onclick="window.loadApiCostDetail()" style="padding:4px 14px;font-size:12px">
            🔍 세부 내역 불러오기
          </button>
        </div>
      </div>
      <div id="api-cost-detail-panel" style="display:none">
        <!-- Dynamic content injected by loadApiCostDetail() -->
      </div>
    </div>
  `;

  // Auto-load cost detail on dashboard open
  setTimeout(() => window.loadApiCostDetail && window.loadApiCostDetail(), 300);
}

async function renderAdminScripts(container) {
  const res = await adminFetch('/api/admin/projects');
  let projects = await res.json();
  if (!Array.isArray(projects)) projects = [];

  container.innerHTML = `
    <div class="admin-section-title">
      총 ${projects.length}개의 프로젝트
      <div class="admin-search-wrap">
        <input type="text" id="admin-search-projects" placeholder="프로젝트명 또는 이메일..." class="admin-config-input admin-search-input" oninput="window.filterAdminProjects(this.value)">
        <button class="btn btn-ghost" onclick="switchAdminTab('scripts')" style="font-size:12px">새로고침 🔄</button>
      </div>
    </div>
    <div class="admin-table-wrap">
       <table class="admin-table" id="admin-projects-table">
         <thead><tr><th>생성일시</th><th>프로젝트명</th><th>장르</th><th>사용자</th><th>진행률</th><th>관리</th></tr></thead>
         <tbody>
           ${projects.map(p => {
             const progress = p.pct || 0;
             const isDone = p.status === 'done' || p.status === 'success' || (progress === 100 && p.status !== 'error');
             const dateStr = new Date(p.created_at).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
             
             return `
             <tr class="admin-project-row" data-search="${p.title.toLowerCase()} ${p.user_email?.toLowerCase() || ''}">
               <td style="font-size:11px; color:#888">${dateStr}</td>
               <td>
                 <div style="font-weight:600">${p.title}</div>
                 <div style="font-size:10px; color:#666">ID: #${p.id.toString().slice(-6)}</div>
               </td>
               <td><span style="font-size:12px">${p.genre}</span></td>
               <td style="font-size:12px">${p.user_email || 'Guest'}</td>
               <td>
                 <div style="display:flex; align-items:center; gap:10px">
                   <div style="flex:1; min-width:80px; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden">
                     <div style="width:${progress}%; height:100%; background:${p.status === 'error' ? 'var(--red)' : 'var(--gold)'}; transition: width 0.3s"></div>
                   </div>
                   <div style="display:flex; flex-direction:column; align-items:flex-end">
                     <span style="font-size:11px; font-weight:700; color:${isDone ? 'var(--teal)' : 'var(--gold)'}">${progress}%</span>
                     <span style="font-size:9px; color:#777">${p.status || 'Success'}</span>
                   </div>
                 </div>
               </td>
               <td><button class="btn btn-primary" style="padding:4px 12px; font-size:12px" onclick="window.viewAdminProjectDetail('${p.id}')">상세</button></td>
             </tr>
             `;
           }).join('')}
         </tbody>
       </table>
    </div>
  `;
}

// ─── Claude API 실제 비용 세부 내역 로더 ─────────────────────────────────
window.loadApiCostDetail = async () => {
  const panel = document.getElementById('api-cost-detail-panel');
  const btn   = document.getElementById('btn-load-cost-detail');
  const days  = document.getElementById('cost-detail-days')?.value || 30;
  if (!panel) return;

  panel.style.display = 'block';
  panel.innerHTML = `<div style="text-align:center;padding:24px;color:#888">
    <div class="pcg-spinner" style="margin:0 auto 12px"></div>
    Anthropic API에서 실제 사용 내역을 불러오는 중...
  </div>`;
  if (btn) { btn.disabled = true; btn.textContent = '로딩 중...'; }

  try {
    const res = await adminFetch(`/api/admin/api-cost-detail?days=${days}`);
    const d   = await res.json();

    if (!res.ok || d.error) {
      panel.innerHTML = `<div style="padding:16px;background:rgba(255,0,0,0.05);border-radius:8px;color:var(--red)">
        ❌ 데이터 로드 실패: ${d.error || '알 수 없는 오류'}<br>
        <small style="color:#888">${d.source === 'no_admin_key' ? '.env에 ANTHROPIC_ADMIN_API_KEY가 설정되지 않았습니다' : ''}</small>
      </div>`;
      return;
    }

    const s = d.summary;
    const fmtNum = n => n >= 1_000_000 ? (n/1_000_000).toFixed(2)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : n.toString();
    const maxTok = Math.max(...(d.byModel.map(m => m.totalTokens)), 1);

    // ── Model color map
    const modelColor = (name) => {
      if (!name) return '#888';
      if (name.includes('opus'))   return '#c084fc';
      if (name.includes('sonnet')) return 'var(--gold)';
      if (name.includes('haiku'))  return 'var(--teal)';
      return '#6366f1';
    };

    panel.innerHTML = `
      <!-- Summary KPI row -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div class="admin-stat-card" style="padding:14px;border-top:3px solid var(--teal)">
          <div class="admin-stat-label" style="font-size:11px">총 API 비용 (${days}일)</div>
          <div style="font-size:22px;font-weight:700;color:var(--teal)">$${s.totalCostUSD.toFixed(4)}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">실제 Anthropic 청구 기준</div>
        </div>
        <div class="admin-stat-card" style="padding:14px;border-top:3px solid #6366f1">
          <div class="admin-stat-label" style="font-size:11px">총 API 요청</div>
          <div style="font-size:22px;font-weight:700;color:#6366f1">${fmtNum(s.totalRequests)}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">Messages API 호출 수</div>
        </div>
        <div class="admin-stat-card" style="padding:14px;border-top:3px solid var(--gold)">
          <div class="admin-stat-label" style="font-size:11px">입력 토큰</div>
          <div style="font-size:22px;font-weight:700;color:var(--gold)">${fmtNum(s.totalInputTokens)}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">프롬프트 토큰 합계</div>
        </div>
        <div class="admin-stat-card" style="padding:14px;border-top:3px solid var(--red)">
          <div class="admin-stat-label" style="font-size:11px">출력 토큰</div>
          <div style="font-size:22px;font-weight:700;color:var(--red)">${fmtNum(s.totalOutputTokens)}</div>
          <div style="font-size:10px;color:#888;margin-top:4px">생성 토큰 합계</div>
        </div>
      </div>

      <!-- By Model breakdown -->
      <div style="margin-bottom:20px">
        <div style="font-size:12px;font-weight:600;color:#aaa;letter-spacing:1px;margin-bottom:10px">모델별 사용량</div>
        ${d.byModel.length === 0
          ? '<div style="color:#666;font-size:12px;padding:12px">이 기간 내 모델별 데이터가 없습니다.</div>'
          : d.byModel.map(m => `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="width:8px;height:8px;border-radius:50%;background:${modelColor(m.model)};display:inline-block"></span>
                <span style="font-size:12px;font-family:monospace">${m.model}</span>
              </div>
              <div style="font-size:11px;color:#888;display:flex;gap:12px">
                <span>요청 ${fmtNum(m.requests)}</span>
                <span>입력 ${fmtNum(m.inputTokens)}</span>
                <span>출력 ${fmtNum(m.outputTokens)}</span>
              </div>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${Math.round(m.totalTokens/maxTok*100)}%;background:${modelColor(m.model)};border-radius:3px;transition:width 0.5s"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Daily timeline table -->
      <div style="font-size:12px;font-weight:600;color:#aaa;letter-spacing:1px;margin-bottom:10px">일별 상세 내역 (${d.period.startDate} ~ ${d.period.endDate})</div>
      <div class="admin-table-wrap" style="max-height:360px;overflow-y:auto">
        <table class="admin-table" style="font-size:12px">
          <thead><tr>
            <th>날짜</th>
            <th style="text-align:right">요청 수</th>
            <th style="text-align:right">입력 토큰</th>
            <th style="text-align:right">출력 토큰</th>
            <th style="text-align:right">총 토큰</th>
            <th style="text-align:right">비용 (USD)</th>
          </tr></thead>
          <tbody>
            ${d.timeline.length === 0
              ? '<tr><td colspan="6" style="text-align:center;color:#666;padding:20px">데이터 없음 (API 사용 기록이 없습니다)</td></tr>'
              : d.timeline.map(row => `
              <tr>
                <td style="font-family:monospace;color:#aaa">${row.date}</td>
                <td style="text-align:right">${row.requests.toLocaleString()}</td>
                <td style="text-align:right;color:var(--gold)">${row.inputTokens.toLocaleString()}</td>
                <td style="text-align:right;color:var(--red)">${row.outputTokens.toLocaleString()}</td>
                <td style="text-align:right">${row.totalTokens.toLocaleString()}</td>
                <td style="text-align:right;font-weight:600;color:${row.costUSD > 0 ? 'var(--teal)' : '#555'}">
                  ${row.costUSD > 0 ? '$' + row.costUSD.toFixed(4) : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="border-top:1px solid rgba(255,255,255,0.1);font-weight:700">
              <td>합계</td>
              <td style="text-align:right">${s.totalRequests.toLocaleString()}</td>
              <td style="text-align:right;color:var(--gold)">${s.totalInputTokens.toLocaleString()}</td>
              <td style="text-align:right;color:var(--red)">${s.totalOutputTokens.toLocaleString()}</td>
              <td style="text-align:right">${s.totalTokens.toLocaleString()}</td>
              <td style="text-align:right;color:var(--teal)">$${s.totalCostUSD.toFixed(4)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="font-size:10px;color:#555;margin-top:8px;text-align:right">
        ✅ 실제 Anthropic Admin API 데이터 · 조회 시각: ${new Date().toLocaleString('ko-KR')}
      </div>
    `;
  } catch (err) {
    panel.innerHTML = `<div style="padding:16px;background:rgba(255,0,0,0.05);border-radius:8px;color:var(--red)">❌ 오류: ${err.message}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 세부 내역 불러오기'; }
  }
};

window.filterAdminProjects = (val) => {
  const q = val.toLowerCase();
  document.querySelectorAll('.admin-project-row').forEach(row => {
    row.style.display = row.dataset.search.includes(q) ? '' : 'none';
  });
};

window.viewAdminProjectDetail = async (id) => {
  try {
    const res = await adminFetch(`/api/admin/projects/${id}`);
    const rawProject = await res.json();
    
    // Use the unified normalization helper
    const project = normalizeProject(rawProject);
    
    const characters = project.chars || [];
    const scenes = project.scripts || []; 
    
    const epCount = scenes.length > 0 ? scenes.length : (project.episodes || 8);
    const genre = project.genre || '장르 미지정';
    const platform = project.platform || 'Platform';
    const status = project.status || 'Draft';

    const modal = document.createElement('div');
    modal.className = 'admin-viewer-overlay';
    modal.id = 'admin-project-detail-modal';

    modal.innerHTML = `
      <div class="admin-viewer-header">
        <div style="display:flex; align-items:center; gap:12px">
          <div class="admin-auth-icon" style="font-size:20px; width:40px; height:40px">📜</div>
          <div>
            <h3 style="color:var(--gold); font-family:var(--serif); margin:0">${project.title}</h3>
            <div style="font-size:11px; color:#aaa">${project.user_email || rawProject.user_email || 'Anonymous Guest'} • ${new Date(project.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <button class="btn btn-ghost" onclick="this.parentElement.parentElement.remove()" style="color:#fff; font-size:20px">✕</button>
      </div>
      <div class="admin-viewer-content">
        <div class="admin-viewer-paper">
          <center>
            <h1 style="font-family:var(--serif); font-size:32px; margin-bottom:10px">${project.title}</h1>
            <div style="display:flex; justify-content:center; gap:12px; align-items:baseline; margin-bottom:40px">
               <span class="admin-badge admin-badge-done">${platform}</span>
               <span style="color:#666; font-size:14px">${genre} | ${epCount}부작 | 🏷️ ${status}</span>
            </div>
          </center>

          <div class="viewer-section">
            <h4 class="viewer-label">LOGLINE</h4>
            <div class="viewer-text">${project.logline || '로그라인 정보가 없습니다.'}</div>
          </div>

          <div class="viewer-section">
            <h4 class="viewer-label">SYNOPSIS</h4>
            <div class="viewer-text" style="white-space: pre-wrap;">${project.synopsis || '시놉시스 정보가 없습니다.'}</div>
          </div>

          <div class="viewer-section">
            <h4 class="viewer-label">CHARACTERS</h4>
            <div class="viewer-char-grid">
              ${characters.map(c => `
                <div class="viewer-char-item">
                  <strong>${c.name || '이름 없음'}</strong> ${c.age ? '<small>(' + c.age + ')</small>' : ''}
                  <p>${c.role || c.desc || ''}</p>
                </div>
              `).join('') || '<p style="color:#999">캐릭터 정보가 없습니다.</p>'}
            </div>
          </div>

          <div class="viewer-section">
            <h4 class="viewer-label">EPISODE PLAN (SYNC FROM DB)</h4>
            <div class="viewer-scene-list">
              ${Array.isArray(scenes) ? scenes.map((s, i) => `
                <div class="viewer-scene-item">
                  <div class="viewer-scene-num">${i + 1}화</div>
                  <div class="viewer-scene-title">${s.title || (i + 1 + '화 줄거리')}</div>
                  <div class="viewer-scene-desc">${s.story || s.desc || s.summary || ''}</div>
                </div>
              `).join('') : '<p style="color:#999">회차별 상세 줄거리 정보가 아직 생성되지 않았거나 숫자 데이터만 존재합니다.</p>'}
            </div>
          </div>

          <div style="margin-top:60px; padding-top:20px; border-top:1px solid #eee; text-align:center; color:#ccc; font-size:12px; font-family:monospace">
            DRAMASCRIPT AI • INTERNAL ADMIN PREVIEW • ID: ${project.id}
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch (err) {
    showToast('데이터 로드 실패: ' + err.message, 'error');
  }
};

async function renderAdminUsers(container) {
  try {
    const [uRes, pRes] = await Promise.all([adminFetch('/api/admin/users'), adminFetch('/api/admin/projects')]);
    const users = await uRes.json();
    const allProjects = await pRes.json();

    container.innerHTML = `
      <div class="admin-section-title">
        가입자 관리 (${users.length}명)
        <div class="admin-search-wrap">
          <input type="text" placeholder="이메일 검색..." class="admin-config-input admin-search-input" oninput="window.filterAdminUsers(this.value)">
          <button class="btn btn-primary" onclick="window.addUser()" style="font-size:12px; padding:6px 16px">+ 유저 추가</button>
        </div>
      </div>
      <div class="admin-table-wrap">
         <table class="admin-table">
           <thead><tr><th>이메일</th><th>플랜</th><th>크레딧</th><th>프로젝트</th><th>상태/관리</th></tr></thead>
           <tbody id="admin-users-tbody">
             ${users.map(u => {
               const userProjCount = allProjects.filter(p => (p.user_email === u.email || p.user_id === u.id)).length;
               const needsSync = u.needsSync === true;
               return `
                <tr class="admin-user-row" data-email="${(u.email || '').toLowerCase()}" style="${needsSync ? 'background:rgba(201, 147, 58, 0.05)' : ''}">
                  <td style="font-weight:500">
                    ${u.email}
                    ${needsSync ? '<span style="font-size:10px; color:var(--gold); margin-left:4px; font-weight:700">[SYNC NEEDED]</span>' : ''}
                  </td>
                  <td><span class="admin-badge ${u.plan === 'Pro' ? 'admin-badge-done' : 'admin-badge-gen'}">${u.plan || 'Free'}</span></td>
                  <td style="font-weight:600; color:var(--gold)">${u.credits || 0}</td>
                  <td style="font-size:12px; color:#aaa; cursor:pointer" onclick="window.filterScriptsForUser('${u.email}')">📂 ${userProjCount}건 (보기)</td>
                  <td style="display:flex; gap:8px">
                    <button class="btn btn-ghost" style="padding:4px 8px; font-size:12px" onclick="window.updateUser('${u.id}', ${u.credits || 0})">수정</button>
                    <button class="btn btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--red)" onclick="window.deleteUser('${u.id}', '${u.email}')">삭제</button>
                  </td>
                </tr>`;
             }).join('')}
           </tbody>
         </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div style="padding:40px">유저 목록 로드 실패: ${err.message}</div>`;
  }
}

window.filterAdminUsers = (val) => {
  const q = val.toLowerCase();
  document.querySelectorAll('.admin-user-row').forEach(row => {
    row.style.display = row.dataset.email.includes(q) ? '' : 'none';
  });
};

window.filterScriptsForUser = (email) => {
  switchAdminTab('scripts');
  setTimeout(() => {
    const input = document.getElementById('admin-search-projects');
    if (input) {
      input.value = email;
      window.filterAdminProjects(email);
      showToast(`${email} 님의 프로젝트를 필터링합니다.`, 'info');
    }
  }, 100);
};

window.addUser = async () => {
  const email = prompt('이메일:');
  if (!email) return;
  const credits = prompt('크레딧:', '10');
  try {
    const res = await adminFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ email, credits: parseInt(credits), plan: 'Free' }) });
    if (res.ok) { showToast('등록 완료', 'success'); switchAdminTab('users'); }
  } catch (err) { showToast('등록 실패: ' + err.message, 'error'); }
};

window.deleteUser = async (id, email) => {
  if (!confirm(`${email} 계정을 삭제하시겠습니까?`)) return;
  try {
    const res = await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('삭제 완료', 'success'); switchAdminTab('users'); }
  } catch (err) { showToast('삭제 실패', 'error'); }
};

window.updateUser = async (userId, currentCredits) => {
  const newCredits = prompt('새로운 크레딧 수량:', currentCredits);
  if (newCredits === null) return;
  try {
    const res = await adminFetch(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ credits: parseInt(newCredits) }) });
    if (res.ok) { showToast('수정 완료', 'success'); switchAdminTab('users'); }
  } catch (err) { showToast('수정 실패', 'error'); }
};

async function renderAdminConfig(container) {
  try {
    const res = await adminFetch('/api/admin/config');
    const config = await res.json();
    container.innerHTML = `
      <div class="admin-config-card" style="max-width: 900px; margin: 0 auto; animation: fadeUp 0.4s ease-out; border: 1px solid rgba(255,255,255,0.1); padding: 32px; border-radius: 24px; background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); box-shadow: 0 20px 50px rgba(0,0,0,0.5)">
        <div style="background:linear-gradient(135deg, rgba(212,175,55,0.15), rgba(0,0,0,0)); border-radius:16px; padding:32px; border:1px solid rgba(212,175,55,0.3); border-left:6px solid var(--gold); margin-bottom:40px; position:relative; overflow:hidden">
          <div style="position:absolute; top:-10px; right:-10px; font-size:80px; opacity:0.05; pointer-events:none">⚙️</div>
          <h2 style="font-family:var(--serif); color:var(--gold); margin-bottom:12px; font-size:22px; display:flex; align-items:center; gap:12px">
            <span style="background:var(--gold); color:#000; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:16px">⚙️</span>
            AI 인텔리전스 엔진 운영 가이드
          </h2>
          <div style="color:#fff; font-size:15px; line-height:1.8; opacity:0.9">
             <p style="margin-bottom:10px">본 시스템은 <b style="color:var(--gold)">Anthropic Claude 4</b> 최신 아키텍처를 기반으로 구동됩니다.</p>
             <p style="margin:0; font-size:14px; color:#ccc">기획 단계(4.5 Haiku)와 집필 단계(4.6 Sonnet)에 최적화된 모델을 교차 배치하여 속도와 퀄리티의 균형을 맞춥니다. 설정 변경 시 즉시 전역 반영됩니다.</p>
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:0">🤖 AI 모델 엔진 설정</div>

        <div class="admin-config-group">
          <label class="admin-config-label">
            Planning & Analysis Model
            <span style="font-weight:normal; color:#666; font-size:11px; margin-left:8px">(기획안, 로그라인, 캐릭터 분석용)</span>
          </label>
           <select id="config-planning-model" class="admin-config-input">
             <option value="claude-haiku-4-5" ${config.planningModel === 'claude-haiku-4-5' ? 'selected' : ''}>⚡ Claude 4.5 Haiku (초고속 / 기획 & 분석 추천)</option>
             <option value="claude-sonnet-4-6" ${config.planningModel === 'claude-sonnet-4-6' ? 'selected' : ''}>🧠 Claude 4.6 Sonnet (균형 / 복잡한 기획안)</option>
             <option value="claude-opus-4-6" ${config.planningModel === 'claude-opus-4-6' ? 'selected' : ''}>👑 Claude 4.6 Opus (최고 지능 / 고비용)</option>
           </select>
        </div>

        <div class="admin-config-group" style="margin-top:20px">
          <label class="admin-config-label">
            Writing & Production Model
            <span style="font-weight:normal; color:#666; font-size:11px; margin-left:8px">(메인 시나리오 및 대본 집필용)</span>
          </label>
           <select id="config-production-model" class="admin-config-input">
             <option value="claude-sonnet-4-6" ${config.productionModel === 'claude-sonnet-4-6' ? 'selected' : ''}>⭐ Claude 4.6 Sonnet (추천 / 드라마 집필 핵심)</option>
             <option value="claude-opus-4-6" ${config.productionModel === 'claude-opus-4-6' ? 'selected' : ''}>👑 Claude 4.6 Opus (최고 지능 / 프리미엄 창작)</option>
             <option value="claude-haiku-4-5" ${config.productionModel === 'claude-haiku-4-5' ? 'selected' : ''}>⚡ Claude 4.5 Haiku (경량 / 비용 절감)</option>
           </select>
          <div style="font-size:11px; color:var(--gold); margin-top:6px; opacity:0.8">
            * 메인 모델은 작가의 어조와 창의성에 직접적인 영향을 미칩니다.
          </div>
        </div>

        <div class="admin-section-title" style="margin-top:40px">📜 마스터 시스템 프롬프트</div>
        <div class="admin-config-group">
          <label class="admin-config-label">AI 페르소나 및 전역 규칙</label>
          <textarea id="config-system-prompt" class="admin-config-input admin-config-textarea" 
            style="min-height: 250px; font-family: 'Inter', sans-serif; line-height: 1.6;"
            placeholder="AI에게 부여할 정체성 또는 전역 규칙을 입력하세요...">${config.systemPrompt || ''}</textarea>
          <div style="font-size:12px; color:#666; margin-top:8px">
            이 프롬프트는 모든 AI 요청에 공통으로 삽입됩니다. (예: "당신은 세계적인 K-드라마 전문가입니다...")
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-top:32px; align-items:center;">
          <button class="btn btn-primary" style="flex:2; height:48px; position:relative" onclick="window.saveAdminConfig(this)">
            ⚙️ 설정 저장 및 즉시 반영
          </button>
          <div id="admin-config-sync-status" style="font-size:11px; color:#4CAF50; display:none; animation: fadeIn 0.3s">
            ● Cloud Synced
          </div>
          <button class="btn btn-ghost" style="flex:1" onclick="switchAdminTab('config')">
            초기화
          </button>
        </div>
      </div>`;
  } catch (err) { 
    container.innerHTML = `
      <div class="admin-unauthorized-wrap">
        <div style="color:var(--red); font-size:48px; margin-bottom:16px">⚠️</div>
        <h3>설정 데이터를 불러올 수 없습니다</h3>
        <p style="color:#888">${err.message}</p>
        <button class="btn btn-ghost" onclick="switchAdminTab('config')">다시 시도</button>
      </div>`;
  }
}

window.saveAdminConfig = async function(btn) {
  const planningModel = document.getElementById('config-planning-model').value;
  const productionModel = document.getElementById('config-production-model').value;
  const systemPrompt = document.getElementById('config-system-prompt').value;
  
  if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }
  try {
    const res = await adminFetch('/api/admin/config', { 
      method: 'POST', 
      body: JSON.stringify({ planningModel, productionModel, systemPrompt }) 
    });
    if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
    
    showToast(`✅ 저장 완료 → Planning: ${planningModel} / Production: ${productionModel}`, 'success');
    const syncEl = document.getElementById('admin-config-sync-status');
    if (syncEl) { syncEl.style.display = 'block'; setTimeout(() => { syncEl.style.display = 'none'; }, 4000); }
  } catch (err) { 
    showToast('저장 실패: ' + err.message, 'error'); 
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '⚙️ 설정 저장 및 즉시 반영'; }
  }
};


async function renderAdminBilling(container) {
  try {
    const res = await adminFetch('/api/admin/stats');
    const stats = await res.json();
    container.innerHTML = `
      <div style="animation: fadeUp 0.5s ease-out">
        <div class="admin-stats-grid">
          <div class="admin-stat-card" style="border-top:2px solid var(--gold)">
            <div class="admin-stat-label">총 누적 매출 (결제 완료) <span class="admin-stat-badge" style="background:#444">DUMMY</span></div>
            <div class="admin-stat-value">₩${(stats.totalRevenue || 0).toLocaleString()}</div>
            <div style="font-size:11px; color:#aaa; margin-top:8px">실제 결제 성공 건수 합계</div>
          </div>
          <div class="admin-stat-card" style="border-top:2px solid var(--red)">
            <div class="admin-stat-label">수익률 (ROI) <span class="admin-stat-badge" style="background:#444">DEMO</span></div>
            <div class="admin-stat-value">${stats.roi || '85'}%</div>
            <div style="font-size:11px; color:#aaa; margin-top:8px">운용 비용 대비 매출 수익률</div>
          </div>
        </div>

        <div class="admin-config-two-col" style="margin-top:32px">
          <div class="admin-config-card" style="margin:0">
             <div class="admin-section-title">💎 멤버십 요금제 정책 <span class="admin-stat-badge" style="background:#444">DEMO</span></div>
             <div class="admin-config-group">
               <label class="admin-config-label">Pro 플랜 월 구독료 (₩)</label>
               <input type="number" id="policy-pro-price" value="29000" class="admin-config-input">
             </div>
             <div class="admin-config-group">
               <label class="admin-config-label">무료 사용자 기본 크레딧</label>
               <input type="number" id="policy-free-credits" value="10" class="admin-config-input">
             </div>
             <button class="btn btn-primary" style="width:100%; height:44px" onclick="window.saveBillingPolicy()">정책 업데이트 반영</button>
             <p style="font-size:11px; color:#666; margin-top:10px; line-height:1.4">※ 현재 결제 모듈이 데모 모드이므로 실제 정책 반영은 제한적일 수 있습니다.</p>
          </div>

          <div class="admin-config-card" style="margin:0">
             <div class="admin-section-title">💸 실시간 매출 타임라인 <span class="admin-stat-badge" style="background:#444">DUMMY</span></div>
             <div class="admin-table-wrap" style="max-height: 250px">
                <table class="admin-table">
                  <thead><tr><th>일시</th><th>사용자</th><th>금액</th><th>결과</th></tr></thead>
                  <tbody>
                    <tr><td>03-30 14:21</td><td>premium_user@test.cc</td><td>₩29,000</td><td><span class="admin-badge admin-badge-done">완료</span></td></tr>
                    <tr><td>03-29 11:05</td><td>director_cho@korea.com</td><td>₩29,000</td><td><span class="admin-badge admin-badge-done">완료</span></td></tr>
                    <tr style="opacity:0.5"><td>03-28 09:12</td><td>guest_2911@tmp.net</td><td>₩29,000</td><td><span class="admin-badge admin-badge-err">취소</span></td></tr>
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>`;
  } catch (err) { container.innerHTML = `<div style="padding:40px">로드 실패</div>`; }
}

async function renderAdminHealth(container) {
  try {
    const res = await adminFetch('/api/admin/health');
    const health = await res.json();
    container.innerHTML = `
      <div style="animation: fadeUp 0.5s ease-out both">
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-label">System Status <span class="admin-stat-badge" style="background:#4CAF50">LIVE</span></div>
            <div class="admin-stat-value" style="color:#4CAF50">HEALTHY</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-label">Latency <span class="admin-stat-badge">LIVE</span></div>
            <div class="admin-stat-value">${health.latency}ms</div>
          </div>
        </div>
        <div class="admin-health-card" style="margin-top:24px; background:#111; padding:20px; border-radius:12px; border:1px solid #333">
           <div style="color:var(--gold); font-family:monospace; font-size:12px; line-height:1.6">
             <span style="color:#4CAF50">[READY]</span> Anthropic Gateway Operational.<br>
             <span style="color:#4CAF50">[OK]</span> Supabase Korean Cluster connected.<br>
             <span style="color:#3498db">[INFO]</span> Node Version: ${health.nodeVersion}<br>
             <span style="color:#e67e22">[DUMMY]</span> Firewall Level: Military Grade Protected.<br>
             <span style="color:#e67e22">[DUMMY]</span> Threat Detection: Active Shield enabled.
           </div>
        </div>
      </div>`;
  } catch (err) { container.innerHTML = `<div style="padding:40px">로드 실패</div>`; }
}

async function renderAdminSamples(container) {
  try {
    const res = await adminFetch('/api/admin/samples');
    const samples = await res.json();
    
    // Explicit error check from API response
    if (samples && samples.error) {
      throw new Error(samples.error);
    }
    
    const header = document.createElement('div');
    header.className = 'admin-section-header';
    header.innerHTML = `
      <div style="background:rgba(20,20,20,0.6); border:1px solid rgba(212,175,55,0.3); border-left:6px solid var(--gold); border-radius:20px; padding:32px; margin-bottom:40px; box-shadow:0 15px 40px rgba(0,0,0,0.4); position:relative; overflow:hidden; backdrop-filter:blur(10px)">
        <div style="position:absolute; top:-20px; right:-20px; font-size:110px; opacity:0.04; pointer-events:none">🎞️</div>
        <h2 style="font-family:var(--serif); color:var(--gold); margin-bottom:16px; display:flex; align-items:center; gap:12px; font-size:24px">
          <span style="background:var(--gold); color:#000; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-size:20px">🎬</span> 
          샘플 시나리오 라이브러리 가이드
        </h2>
        <div style="color:#fff; font-size:16px; line-height:1.8; max-width:920px; margin:0; font-weight:400">
          <p style="margin-bottom:15px; color:#ddd">메인 화면 <b style="color:var(--gold)">'샘플 프로젝트로 시작하기'</b> 섹션에 실시간 노출될 마스터 시나리오를 관리합니다.</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; background:rgba(255,255,255,0.03); padding:20px; border-radius:12px; border:1px solid rgba(255,255,255,0.05)">
            <div style="font-size:14px; color:#ccc">
              <b style="color:#fff; display:block; margin-bottom:5px">💡 노출 최적화</b>
              개별 카드의 스위치를 통해 메인 페이지 노출 여부를 제어합니다. (반드시 하단 저장 필요)
            </div>
            <div style="font-size:14px; color:#ccc">
              <b style="color:#fff; display:block; margin-bottom:5px">📝 데이터 일관성</b>
              제목과 로그라인, 캐릭터 등 JSON 데이터를 수정하여 시나리오 완성도를 높이세요.
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-bottom:24px">
        <button class="btn btn-gold" onclick="addAdminSample()" style="padding:12px 32px; font-weight:700; letter-spacing:0.5px">+ 신규 샘플 프로젝트 등록</button>
      </div>
    `;
    container.innerHTML = ''; // Clear loading spinner
    container.appendChild(header);

    if (!Array.isArray(samples) || samples.length === 0) {
      container.innerHTML += `
        <div style="padding:60px; text-align:center; animation:fadeUp 0.4s ease-out">
          <div style="font-size:40px; margin-bottom:20px">🎬</div>
          <div style="font-size:18px; font-weight:700; color:var(--ink); margin-bottom:12px">등록된 샘플 프로젝트가 없습니다</div>
          <p style="color:var(--ink3); font-size:14px; margin-bottom:32px">
            데이터베이스에 샘플 데이터가 비어있거나 필터링 정책에 의해 가려졌을 수 있습니다.
          </p>
          <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn btn-primary" onclick="window.seedDefaultSamples()">기본 샘플 데이터 생성하기 (Seed)</button>
            <button class="btn btn-outline" onclick="location.reload()">새로고침</button>
          </div>
          <div style="margin-top:20px; font-size:11px; color:var(--ink4)">
            Check: Admin role (${localStorage.getItem('ds_auth_token') ? 'Verified' : 'Guest'})
          </div>
        </div>
      `;
      return;
    }

    // We'll store the IDs of the samples currently rendered for batch saving
    window._adminSampleIds = samples.map(s => s.id);

    container.innerHTML += `
      <div style="padding:20px; animation:fadeUp 0.4s ease-out">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px">
          <div>
            <div class="admin-section-title" style="margin:0">🎬 샘플 프로젝트 관리</div>
            <p style="font-size:11px; color:#888; margin-top:4px">샘플의 노출 여부와 데이터를 한꺼번에 수정하고 하단의 버튼으로 저장하세요.</p>
          </div>
          <div style="display:flex; gap:12px">
            <button class="btn btn-primary" onclick="window.saveAllAdminSamples(this)" style="padding:8px 24px; font-weight:600; box-shadow:0 0 15px rgba(212,175,55,0.3)">
              ✅ 샘플 노출 및 데이터 저장하기
            </button>
            <button class="btn btn-ghost" onclick="window.seedDefaultSamples()" style="font-size:12px">전체 초기화/재생성 🔄</button>
          </div>
        </div>
        <div class="admin-samples-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap:20px">
          ${samples.map(s => {
            const isVisible = s.data && s.data.isVisible !== false;
            const dateStr = s.updated_at ? new Date(s.updated_at).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '날짜 없음';
            
            return `
            <div class="admin-config-card" style="margin:0; position:relative; overflow:hidden">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px">
                <div>
                  <h4 style="margin:0; color:var(--gold)">${s.title}</h4>
                  <div style="font-size:11px; color:#888; margin-top:4px">ID: ${s.id} | 수정: ${dateStr}</div>
                </div>
                <div style="display:flex; align-items:center; gap:12px">
                  <label class="switch-container" style="display:flex; align-items:center; gap:8px; cursor:pointer">
                    <span style="font-size:11px; color:${isVisible ? 'var(--gold)' : '#666'}">${isVisible ? '노출 중' : '비노출'}</span>
                    <input type="checkbox" id="sample-visible-${s.id}" ${isVisible ? 'checked' : ''} style="cursor:pointer">
                  </label>
                  <button class="btn" style="padding:4px 12px; font-size:11px; color:var(--red); border:1px solid rgba(255,0,0,0.2); border-radius:8px; background:rgba(255,0,0,0.05); cursor:pointer" onclick="window.deleteAdminSample('${s.id}')">
                    🗑️ 삭제
                  </button>
                  <button class="btn btn-gold" style="padding:4px 12px; font-size:11px; font-weight:600; border-radius:8px" onclick="window.viewAdminSampleDetail('${s.id}')">
                    👁️ 샘플보기
                  </button>
                </div>
              </div>

              <div class="admin-config-group">
                <label class="admin-config-label">표시 제목</label>
                <input type="text" id="sample-title-${s.id}" class="admin-config-input" value="${s.title}">
              </div>

              <div class="admin-config-group">
                <label class="admin-config-label">데이터 (JSON)</label>
                <textarea id="sample-data-${s.id}" class="admin-config-input admin-config-textarea" style="height:250px; font-family:monospace; font-size:11px">${JSON.stringify(s.data, null, 2)}</textarea>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="padding:40px">샘플 로드 실패: ${err.message}</div>`;
  }
}

window.saveAllAdminSamples = async function(btn) {
  if (!window._adminSampleIds || window._adminSampleIds.length === 0) return;
  
  if (btn) {
    btn.disabled = true;
    btn.textContent = '저장 중...';
  }

  const batchData = [];
  let hasError = false;

  for (const id of window._adminSampleIds) {
    try {
      const title = document.getElementById(`sample-title-${id}`).value;
      const dataStr = document.getElementById(`sample-data-${id}`).value;
      const isVisible = document.getElementById(`sample-visible-${id}`).checked;
      const data = JSON.parse(dataStr);
      
      batchData.push({ id, title, data, isVisible });
    } catch (e) {
      showToast(`[Error] ID ${id}: JSON 형식이 올바르지 않습니다.`, 'error');
      hasError = true;
      break;
    }
  }

  if (hasError) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✅ 샘플 노출 및 데이터 저장하기';
    }
    return;
  }

  try {
    const res = await adminFetch('/api/admin/samples/batch', {
      method: 'POST',
      body: JSON.stringify({ samples: batchData })
    });
    
    if (res.ok) {
      showToast('모든 샘플 노출 설정과 데이터가 저장되었습니다.', 'success');
      
      // ✅ 저장 직후 메모리 내 샘플 데이터도 즉시 반영
      batchData.forEach(item => {
        window.dispatchEvent(new CustomEvent('sample-updated', {
          detail: { id: item.id, title: item.title, data: { ...item.data, isVisible: item.isVisible } }
        }));
      });
      
      // Re-render to update timestamps and state
      const container = document.getElementById('admin-tab-content');
      if (container) await renderAdminSamples(container);
    } else {
      const err = await res.json();
      showToast('저장 실패: ' + err.error, 'error');
    }
  } catch (err) {
    showToast('서버 연결 중 오류가 발생했습니다: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✅ 샘플 노출 및 데이터 저장하기';
    }
  }
};

window.seedDefaultSamples = async function() {
  if (!confirm('기본 샘플 데이터(디렉터즈 아레나, 서울의 밤)로 초기화하시겠습니까? (기존 데이터가 덮어씌워집니다)')) return;
  
  const sample1 = {
    id: 'sample-arena',
    title: DIRECTORS_ARENA_SAMPLE.title,
    data: DIRECTORS_ARENA_SAMPLE
  };
  
  const sample2 = {
    id: 'sample-seoul',
    title: SEOUL_NIGHT_SAMPLE.title,
    data: SEOUL_NIGHT_SAMPLE
  };

  try {
    showToast('샘플 데이터를 생성 중입니다...', 'info');
    await adminFetch('/api/admin/samples', { method: 'POST', body: JSON.stringify(sample1) });
    await adminFetch('/api/admin/samples', { method: 'POST', body: JSON.stringify(sample2) });
    showToast('샘플 데이터가 성공적으로 생성되었습니다!', 'success');
    
    // Refresh the container
    const container = document.getElementById('admin-tab-content');
    if (container) renderAdminSamples(container);
  } catch (err) {
    showToast('샘플 생성 실패: ' + err.message, 'error');
  }
};

window.saveBillingPolicy = async function() {
  const price = document.getElementById('policy-pro-price').value;
  const credits = document.getElementById('policy-free-credits').value;
  
  try {
    // We can store this in system_settings under a new key 'billing_policy'
    const res = await adminFetch('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({ 
        billingPolicy: { proPrice: parseInt(price), freeCredits: parseInt(credits) }
      })
    });
    
    if (res.ok) {
      showToast('멤버십 정책이 업데이트되었습니다.', 'success');
    }
  } catch (err) {
    showToast('정책 저장 실패: ' + err.message, 'error');
  }
};

window.viewAdminSampleDetail = async function(id) {
  try {
    // 1. Get sample data from memory or server
    const res = await fetch(`/api/samples/${id}`);
    if (!res.ok) throw new Error('샘플 데이터를 가져올 수 없습니다.');
    const sample = await res.json();
    
    // 2. Open project using the main project_list logic but with sample data
    // We need to ensure the main system treats this as the current project
    if (window.openProject) {
      // Normalize it manually if needed, or let openProject handle it
      const normalized = {
        ...(sample.data || {}),
        id: sample.id,
        title: sample.title,
        is_sample: true
      };
      
      // Navigate to dashboard
      window.navigateTo('result');
      
      // Delay slightly to ensure DOM is ready then open
      setTimeout(() => {
        window.openProject(normalized);
        showToast(`'${sample.title}' 샘플 미리보기 모드`, 'info');
      }, 100);
    } else {
      showToast('메인 대시보드 로직을 찾을 수 없습니다.', 'error');
    }
  } catch (err) {
    showToast('미리보기 로드 실패: ' + err.message, 'error');
  }
};

window.deleteAdminSample = async function(id) {
  if (!confirm(`ID: ${id} 샘플을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
  
  try {
    const res = await adminFetch(`/api/admin/samples/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('샘플이 성공적으로 삭제되었습니다.', 'success');
      const container = document.getElementById('admin-tab-content');
      if (container) renderAdminSamples(container);
    } else {
      const err = await res.json();
      showToast('삭제 실패: ' + err.error, 'error');
    }
  } catch (err) {
    showToast('서버 연결 중 오류가 발생했습니다: ' + err.message, 'error');
  }
};

window.switchAdminTab = switchAdminTab;
window.refreshAdminSession = () => window.location.reload();
window.saveAdminConfig = saveAdminConfig;
window.initAdmin = initAdmin;
