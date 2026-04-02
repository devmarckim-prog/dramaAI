import { state } from './state.js';
import { fetchProjects, deleteProject, normalizeProject } from './api.js';
import { showPage, showDebugLog, showToast } from './navigation.js';

export async function renderProjectCards() {
  const wrap = document.getElementById('project-cards-wrap');
  if (!wrap) return;

  const projects = await fetchProjects();
  const sorted = (projects || []).sort((a, b) => {
    const da = new Date(b.created_at || b.createdAt || 0);
    const db = new Date(a.created_at || a.createdAt || 0);
    return da - db;
  });

  const gridExists = wrap.querySelector('.project-cards-grid');
  const projectCountChanged = gridExists && wrap.querySelectorAll('.project-slate-card').length !== sorted.length + 1; // +1 for the "New Project" card

  // If grid doesn't exist or project count changed, do a full render
  if (!gridExists || projectCountChanged) {
    if (!gridExists) wrap.innerHTML = '<div class="project-list-loading"><div class="pcg-spinner"></div>로딩 중...</div>';
    _performFullRender(wrap, sorted);
  } else {
    // Targeted Update for generating projects
    sorted.forEach(rawP => {
      const p = normalizeProject(rawP);
      if (p.status === 'generating') {
        const card = document.getElementById(`gen-card-${p.id}`);
        if (card) {
          const bar = card.querySelector('.pcg-bar-fill-dynamic');
          const labels = card.querySelectorAll('.pcg-progress-wrap span');
          if (bar) bar.style.width = (p.pct || 0) + '%';
          if (labels.length >= 2) labels[1].textContent = (p.pct || 0) + '%';
        } else {
          // Card for this generating project missing? Force full render just in case
          _performFullRender(wrap, sorted);
        }
      } else {
        // If a project status changed from generating to something else, we might need to refresh its card appearance
        const card = document.getElementById(`gen-card-${p.id}`);
        if (card && card.classList.contains('generating')) {
           _performFullRender(wrap, sorted);
        }
      }
    });
  }

  const sub = document.getElementById('projects-page-sub');
  if (sub) sub.textContent = `총 ${sorted.length}개의 프로덕션 슬레이트`;
}

function _performFullRender(wrap, projects) {
  if (!projects || projects.length === 0) {
    wrap.innerHTML = `
      <div class="project-empty-state">
        <div class="empty-icon-slate">🎬</div>
        <h2 class="project-empty-title">첫 번째 마스터피스를 시작하세요</h2>
        <p class="project-empty-desc">로그라인 한 줄만으로 당신의 상상이 시나리오가 됩니다.</p>
        <button class="btn btn-primary btn-wizard-start-big" onclick="showPage('wizard')">+ 새 프로젝트 만들기</button>
      </div>`;
    return;
  }

  let html = `<div class="project-cards-grid">
    <div class="project-card-new project-card-new-premium" onclick="showPage('wizard')">
      <div class="project-card-new-plus project-card-new-plus-premium">＋</div>
      <div class="project-card-new-label project-card-new-label-premium">새 드라마 집필</div>
    </div>`;

  const statusLabels = {
    'initializing': '프로젝트 초기화 중',
    'generating': 'AI 작가 집필 중',
    'core_done': '핵심 컨셉 설계 완료',
    'outline_done': '회차 아웃라인 구성 완료',
    'plan_done': '회차별 상세 기획 완료',
    'sample_done': '기획안 & 샘플 대본 완성',
    'prod_done': '제작/캐스팅 산출 완료',
    'ppl_done': 'PPL 기획 완료',
    'done': '전체 집필 완료',
    'error': '생성 중 오류 발생'
  };

  projects.forEach(rawP => {
    const p = normalizeProject(rawP);
    const isErr = p.status === 'error';
    const isGen = p.status === 'generating';
    const pct = isErr ? 100 : (p.pct || 0);
    const stepIdx = p.stepIdx;

    const delBtnHtml = p.is_sample
      ? ''
      : `<button class="project-card-del" onclick="event.stopPropagation(); window.confirmDeleteProject('${p.id}')">&times;</button>`;

    const genre = p.genre || '로맨스';
    const episodesVal = (p.episodes_count) || (p.episodes && typeof p.episodes === 'number' ? p.episodes : 8);
    const target = (p.input && p.input.target_audience) || (p.stats && p.stats.target_audience) || '';
    const era = (p.input && p.input.setting_era) || (p.stats && p.stats.setting_era) || '';

    let flagHtml = `<div class="project-flag-group">
      ${p.is_sample ? `<span class="project-flag sample-flag">SAMPLE</span>` : ''}
      <span class="project-flag">${genre}</span>
      <span class="project-flag">${episodesVal}부작</span>
      ${target ? `<span class="project-flag">${target}</span>` : ''}
      ${era ? `<span class="project-flag">${era}</span>` : ''}
    </div>`;

    if (isGen || isErr || p.status === 'sample_done' || p.status === 'done') {
      const statusText = statusLabels[p.status] || '진행 중';
      const isPaused = p.status === 'sample_done';

      html += `
         <div class="project-slate-card ${isGen ? 'generating' : ''} ${isErr ? 'status-error' : ''} ${isPaused ? 'status-paused' : ''}" id="gen-card-${p.id}" onclick="openProject('${p.id}')" style="${isErr ? 'cursor: not-allowed; opacity: 0.8;' : ''}">
          ${delBtnHtml}
          <div class="project-card-img-wrap">
            <div class="project-card-img-overlay" style="${isErr ? 'background: rgba(255,0,0,0.1);' : (isPaused ? 'background: rgba(0,255,0,0.05);' : '')}"></div>
            ${flagHtml}
            <div class="project-card-body-slate">
              <div class="pcg-badge-premium ${isErr ? 'pcg-badge-error' : ''} ${isPaused ? 'pcg-badge-paused' : ''} ${p.status === 'done' ? 'pcg-badge-done' : ''}" 
                   style="${isErr ? 'background: #ff4d4d; color: #fff;' : (isPaused ? 'background: var(--gold); color: #000;' : (p.status === 'done' ? 'background: #4ade80; color: #000;' : ''))}">
                <div class="pcg-badge-dot ${isErr ? 'pcg-badge-dot-error' : ''} ${isPaused ? 'pcg-badge-dot-paused' : ''} ${p.status === 'done' ? 'pcg-badge-dot-done' : ''}"></div>
                ${isErr ? 'AI 생성 실패' : (isPaused ? '기획안 검토 가능' : (p.status === 'done' ? '드라마 완성' : 'AI 작가 집필 중'))}
              </div>
              <div class="project-card-title-slate" style="${isErr ? 'color: #ffcccc;' : ''}">${p.title || '새 드라마'}</div>
              <div class="pcg-progress-wrap">
                  <div class="project-card-meta-row" style="color:#fff; font-size:10px; margin-bottom:4px;">
                    <span>${statusText}</span>
                    <span>${pct}%</span>
                  </div>
                  <div class="pcg-bar" style="height:4px; background:rgba(255,255,255,0.2);">
                    <div class="pcg-bar-fill pcg-bar-fill-dynamic" style="width:${pct}%; background:${isErr ? '#ff4d4d' : (isPaused ? '#4CAF50' : 'var(--gold)')};"></div>
                  </div>
              </div>
              
              ${isPaused ? `
                <div class="project-card-action-bar" style="margin-top:12px;">
                  <button class="btn btn-primary btn-sm btn-finalize-gen" style="width:100%; font-size:11px; padding:6px;" 
                          onclick="event.stopPropagation(); window.finalizeProject('${p.id}')">
                    🚀 전체 대본 및 제작계획 생성하기
                  </button>
                </div>
              ` : ''}
              
              ${isErr ? `
                <div class="project-card-action-bar" style="margin-top:12px;">
                  <button class="btn btn-outline btn-sm btn-retry-gen" style="width:100%; font-size:11px; padding:6px; color:#fff; border-color:#fff;" 
                          onclick="event.stopPropagation(); window.resumeProject('${p.id}')">
                    🔄 다시 시도하기
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>`;

    } else {
      const dateStr = _formatRelativeDate(p.createdAt);
      html += `
        <div class="project-slate-card" onclick="openProject('${p.id}')">
          ${delBtnHtml}
          <div class="project-card-img-wrap">
            <div class="project-card-img-overlay"></div>
            <div class="project-card-badge-slate">${p.platform || 'OTT'}</div>
            ${flagHtml}
            <div class="project-card-body-slate">
              <div class="project-card-title-slate">${p.title}</div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="project-card-date" style="color:rgba(255,255,255,0.6); font-size:10px;">${dateStr}</span>
                <div class="arrow-icon-circle" style="width:24px; height:24px; font-size:12px;">→</div>
              </div>
            </div>
          </div>
        </div>`;
    }
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

function _formatRelativeDate(date) {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return past.toLocaleDateString();
}

window.renderProjectCards = renderProjectCards;
export async function openProject(id) {
  const projects = await fetchProjects();
  const rawP = projects.find(x => x.id === id || x.id.toString() === id.toString());
  if (!rawP) {
    showToast('프로젝트를 찾을 수 없습니다.', 'error');
    return;
  }

  // Reject projects with error status
  if (rawP.status === 'error') {
    showToast('AI 생성 중 오류가 발생한 프로젝트입니다. 다시 생성해 주세요.', 'error');
    return;
  }

  try {
    const p = normalizeProject(rawP);

    state.currentInput = p.input;
    state.planData = {
      id: p.id,
      title: p.title,
      logline: p.logline,
      synopsis: p.synopsis,
      platform: p.platform,
      genre: p.genre,
      episodes: p.episodes,
      stats: p.stats || p.budget || {},
      characters: p.chars || p.characters || [],
      ppl: p.ppl || [],
      budget: p.budget || (p.stats && p.stats.budget)
    };

    state.scripts = p.scripts || {};

    showPage('result');
    showToast(`${p.title} 프로젝트를 불러왔습니다.`, 'success');
  } catch (e) {
    console.error("Open Project Error:", e);
    showToast('프로젝트 데이터가 손상되어 열 수 없습니다.', 'error');
  }
}

window.openProject = openProject;

/**
 * 데이터를 안전하게 정리하고 기본값을 채워넣는 헬퍼 함수
 */
// Remove redundant local _normalizeProject

export async function confirmDeleteProject(id) {
  // Prevent sample deletion (redundant but safe)
  if (id && (id.toString().startsWith('sample-') || id === 'sample1' || id === 'sample2' || id === 'arena-sample')) {
    showToast('샘플 프로젝트는 삭제할 수 없습니다.', 'warn');
    return;
  }

  if (confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
    try {
      console.log('[Projects] Attempting to delete project:', id);
      const success = await deleteProject(id);
      if (success) {
        showToast('프로젝트가 삭제되었습니다.', 'success');
        // RE-RENDER the list immediately
        if (window.renderProjectCards) {
          await window.renderProjectCards();
        } else {
          location.reload(); // Fallback
        }
      } else {
        showToast('삭제에 실패했습니다. 다시 시도해주세요.', 'error');
      }
    } catch (e) {
      console.error('[Delete Error]', e);
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  }
};

window.confirmDeleteProject = confirmDeleteProject;

function _getCleanEps(val, p) {
  // Priority: episodes_count (new field) -> parsed episodes
  if (p && p.episodes_count) return Number(p.episodes_count);
  if (!val) return 8;

  // If it's an array (episode list), preserve it! 
  if (Array.isArray(val)) return val;

  // If it's a number, return it
  if (typeof val === 'number') return val;

  // If it's a string, try parsing it
  if (typeof val === 'string') {
    if (val.includes('[object')) return 8;
    const parsed = parseInt(val.replace(/[^0-9]/g, ''));
    return isNaN(parsed) ? 8 : parsed;
  }

  // If it's an object, check common properties
  if (typeof val === 'object') {
    if (val.val !== undefined) return Number(val.val);
    if (val.count !== undefined) return Number(val.count);
    if (val.value !== undefined) return Number(val.value);
    if (val.episodes !== undefined) return Number(val.episodes);

    // Fallback: search for any number in the object values
    const firstNum = Object.values(val).find(v => !isNaN(parseInt(v)));
    if (firstNum !== undefined) return parseInt(firstNum);
  }

  return 8;
}
