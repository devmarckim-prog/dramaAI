/**
 * Dashboard Rendering Module
 */

import { state } from './state.js';
// Removed circular import to prevent initialization issues
// import { numToPrice, showToast, updateApiStatus } from './navigation.js';
import { MAPPINGS } from './constants.js';
import { CAST_DATA_BASE } from './samples.js';
import { renderScript, renderEpTabs, renderSceneRow, renderSceneDetail } from './script.js';
import { generateEpResources, initSceneGeneration, generateNextScene, summarizeEpisode } from './api.js';

const colors = ['#C9933A', '#5EAED4', '#888'];

/**
 * Deep search helper to find data in nested project objects (v0.23)
 * @param {Object} obj The project object
 * @param {String} targetKey The key to find (e.g., 'conflicts', 'budget')
 * @returns {Any|null} The found value or null
 */
function _findDeepValue(obj, targetKey, maxDepth = 3) {
  if (!obj || typeof obj !== 'object') return null;
  
  // 1. Direct hit or common nesting
  if (obj[targetKey] !== undefined) return obj[targetKey];
  if (obj.data && obj.data[targetKey] !== undefined) return obj.data[targetKey];
  if (obj.input && obj.input[targetKey] !== undefined) return obj.input[targetKey];
  if (obj.stats && obj.stats[targetKey] !== undefined) return obj.stats[targetKey];

  // 2. Recursive search
  const search = (target, depth = 0) => {
    if (depth > maxDepth || !target || typeof target !== 'object') return null;
    
    // Avoid searching large known unrelated objects
    if (target.scripts || target.episodes_list) return null;

    for (const key in target) {
      if (key === targetKey && target[key] !== undefined) {
         // Special check for arrays/objects to ensure they aren't empty
         if (Array.isArray(target[key]) && target[key].length === 0) continue;
         if (typeof target[key] === 'object' && Object.keys(target[key]).length === 0) continue;
         return target[key];
      }
      const found = search(target[key], depth + 1);
      if (found !== null) return found;
    }
    return null;
  };
  
  return search(obj);
}

function _findDeepConflicts(p) {
  return _findDeepValue(p, 'conflicts') || [];
}

export function buildResultPanels() {
  console.log('[Dashboard] Building Result Panels...', state.planData);
  const charGrid = document.getElementById('char-cards-r');
  if (charGrid) charGrid.innerHTML = '';

  const epBars = document.getElementById('ep-bars-r');
  if (epBars) epBars.innerHTML = '';

  renderOverview();
  buildCharCards();
  buildEpList();
  buildConflictPanel();
  buildBudget();
  buildPplPanel();
  renderScript();
}

export function buildConflictPanel() {
  const el = document.getElementById('ov-conflicts');
  if (!el) return;

  const p = state.planData || {};
  const conflicts = _findDeepValue(p, 'conflicts') || state.currentInput?.conflicts || [];
  
  if (!conflicts.length || !Array.isArray(conflicts)) {
    el.innerHTML = '<div class="project-empty-desc">갈등 분석 데이터가 없습니다.</div>';
    return;
  }

  el.innerHTML = conflicts.map(c => `
    <div class="conflict-card">
      <div class="conflict-type">${c.type}</div>
      <div class="conflict-character">${c.character}</div>
      <div class="conflict-desc">${c.desc}</div>
    </div>
  `).join('');
}

function renderOverview(retryCount = 0) {
  const p = state.planData || {};
  const input = state.currentInput || {};

  const title = p.title || input.title || '새 프로젝트';

  // Update Hero section (immediate)
  const el = document.getElementById('result-hero-title-el');
  if (el) el.textContent = title;

  const logline = p.logline || input.logline || '';
  const synopsis = p.synopsis || input.synopsis || '';
  const loglineEl = document.getElementById('result-logline');
  if (loglineEl) loglineEl.textContent = logline;

  const sideTitle = document.getElementById('sidebar-title-label');
  if (sideTitle) sideTitle.textContent = title;

  // Use a slight delay to ensure panel DOM is ready
  setTimeout(() => {
    const ovLogline = document.getElementById('ov-logline');
    const ovStory = document.getElementById('ov-story');

    if (!ovLogline && retryCount < 5) {
      // If elements not found, retry up to 5 times (500ms total)
      console.warn('[Dashboard] Overview elements missing, retrying...', retryCount);
      return renderOverview(retryCount + 1);
    }

    if (ovLogline) ovLogline.textContent = logline || '로그라인 정보가 없습니다.';
    if (ovStory) ovStory.textContent = synopsis || '전체 줄거리 정보가 없습니다.';

    // Update Stat Cards
    const stats = p.stats || p.budget || {};
    const inputEps = input.episodes ? parseInt(input.episodes.toString().replace(/[^0-9]/g, '')) : 8;
    const epCount = p.episodes_count || inputEps || (Array.isArray(p.episodes) ? p.episodes.length : 8);

    // Budget & PPL extraction with deep search (v0.23)
    let budgetRaw = _findDeepValue(p, 'budget') || _findDeepValue(p, 'total_budget');
    if (typeof budgetRaw === 'object' && budgetRaw !== null) budgetRaw = budgetRaw.total || budgetRaw.amount || budgetRaw.value || budgetRaw.total_budget;

    let pplRaw = _findDeepValue(p, 'ppl') || _findDeepValue(p, 'ppl_revenue');
    if (Array.isArray(pplRaw)) {
      // sum it up if it's an array of objects
      pplRaw = pplRaw.reduce((acc, curr) => acc + (parseInt(curr.revenue || curr.amount || 0)), 0);
    }

    const ovBudget = document.getElementById('ov-budget');
    const heroBudget = document.getElementById('stat-budget');

    function formatCurrency(val) {
      if (!val || val === '-' || val === 0) return '-';
      if (typeof val === 'number') return `₩${val.toLocaleString()}만`;
      if (typeof val === 'string') {
        const num = parseInt(val.replace(/[^0-9]/g, ''));
        if (!isNaN(num)) {
          if (val.includes('억')) return val; // keep "12억"
          return `₩${num.toLocaleString()}만`;
        }
        return val;
      }
      return '-';
    }

    const bDisp = formatCurrency(budgetRaw);
    if (ovBudget) ovBudget.textContent = bDisp;
    if (heroBudget) heroBudget.textContent = bDisp;
    const input = p.input || {};
    console.log('[Dashboard] Rendering project:', p.id, p.title);
    console.log('[Dashboard] Data Structure:', {
      episodes: p.episodes,
      episodes_count: p.episodes_count,
      conflicts: p.conflicts,
      stats: p.stats
    });

    const ovPpl = document.getElementById('ov-ppl');
    const heroPpl = document.getElementById('stat-ppl');
    const pDisp = formatCurrency(pplRaw);
    if (ovPpl) ovPpl.textContent = pDisp;
    if (heroPpl) heroPpl.textContent = pDisp;

    const badge = document.getElementById('result-badge');
    if (badge) {
      const platform = p.platform || input.platform || 'OTT';
      const genre = p.genre || input.genre || '장르';
      badge.innerHTML = `🌟 ${platform} · ${genre} · ${epCount}부작`;

      const heroScenes = document.getElementById('stat-scenes');
      if (heroScenes) {
        let totalScenes = 0;
        if (Array.isArray(p.episodes) && p.episodes.length > 0) {
          p.episodes.forEach(e => totalScenes += (Array.isArray(e.scenes) ? e.scenes.length : 10));
        } else {
          totalScenes = epCount * 12; // Typical scene count estimate
        }
        heroScenes.textContent = totalScenes > 0 ? `${totalScenes}씬+` : '-';
      }
    }

    // Update Conflicts
    // Deep search to ensure no data is missed
    const conflicts = _findDeepConflicts(p);
    const conflictGrid = document.getElementById('ov-conflicts');
    
    if (conflictGrid) {
      if (conflicts && Array.isArray(conflicts) && conflicts.length > 0) {
        conflictGrid.innerHTML = conflicts.map(c => `
          <div class="conflict-card">
            <div class="conflict-label" style="background:var(--gold); color:#000; display:inline-block; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:900; margin-bottom:8px">${c.type || '필수 갈등'}</div>
            ${c.character ? `<div class="conflict-character" style="font-size:12px; color:var(--gold); font-weight:800; margin-bottom:6px">${c.character}</div>` : ''}
            <div class="conflict-desc" style="font-size:13px; line-height:1.5; color:var(--ink)">${c.desc || ''}</div>
          </div>
        `).join('');
      } else {
        conflictGrid.innerHTML = `
          <div class="conflict-card ink" style="grid-column: span 2; opacity: 0.6; border-style: dashed; background: var(--paper2);">
            <div class="conflict-desc">갈등 구조 정보가 분석 중이거나 없습니다.</div>
          </div>
        `;
      }
    }
  }, 100);
}

export function buildCharCards() {
  const grid = document.getElementById('char-cards-r');
  if (!grid) return;

  const cast = state.planData?.characters || state.currentInput?.chars || [];
  const baseDefault = JSON.parse(JSON.stringify(CAST_DATA_BASE));

  // Use real cast if available, otherwise default sample cast
  const finalCast = cast.length ? cast.map((c, i) => {
    const d = baseDefault[i % baseDefault.length];
    return {
      name: c.name || d.name,
      role: c.role || d.role,
      desc: c.personality || c.job || c.desc || d.desc,
      init: (c.name || d.name || '?')[0],
      av: d.av || 'av-g',
      actors: c.actors || d.actors
    };
  }) : baseDefault;

  // Save to a temporary list to use in selectChar
  state.currentDashboardCast = finalCast;

  grid.innerHTML = finalCast.map((c, i) => `
    <div class="char-card-r ${i === 0 ? 'selected' : ''}" onclick="selectChar(${i})">
      <div class="char-av ${c.av || 'av-g'}">${c.init}</div>
      <div class="char-card-info-wrap">
        <div class="cname">${c.name}</div>
        <div class="crole">${c.role}</div>
      </div>
      <div class="cdesc">${c.desc}</div>
      <div class="char-default-tag">${c.actors?.[0]?.name || ''} 캐스팅 제안</div>
    </div>`).join('');

  renderCast(0);
  buildRelationMap();
}

export function renderCast(i) {
  const castList = state.currentDashboardCast || CAST_DATA_BASE;
  const d = castList[i];
  if (!d) return;

  const title = document.getElementById('cast-title-r');
  const role = document.getElementById('cast-role-r');
  const list = document.getElementById('cast-list-r');

  if (title) title.textContent = d.name;
  if (role) role.textContent = (d.role || '캐릭터') + ' 🎬 추천 캐스팅';
  if (list) {
    if (!d.actors || d.actors.length === 0) {
      list.innerHTML = '<div class="admin-loading-text" style="padding:40px; width:100%; text-align:center">추천 캐스팅 데이터를 생성 중이거나 정보가 없습니다.</div>';
      return;
    }
    list.innerHTML = d.actors.map((a, k) => `
      <div class="cast-item ${k === 0 ? 'top' : ''}">
        <div class="cast-photo">
          <img src="${a.img || ''}" alt="${a.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=cast-photo-placeholder>${a.name[0]}</div>'">
        </div>
        <div class="cast-rank-badge ${k === 0 ? 'rank-top' : k === 1 ? 'rank-2nd' : 'rank-3rd'}">${k + 1}</div>
        <div class="cast-info-wrap">
          <div class="cast-name-row">
            <span class="cast-name-r">${a.name}</span>
            ${k === 0 ? '<span class="top-badge">추천 1순위</span>' : ''}
          </div>
          <div class="cast-detail-r">${a.detail || ''}</div>
        </div>
        <div class="cast-fee-r">${a.fee || '상담 후 결정'}</div>
      </div>`).join('');
  }
}

export function buildRelationMap() {
  const wrap = document.getElementById('char-relation-map');
  if (!wrap) return;

  const chars = (state.planData?.characters || state.currentInput?.chars || []).filter(c => c.name);
  if (chars.length < 2) {
    wrap.innerHTML = '<div class="admin-loading-text" style="padding:40px; text-align:center; background:var(--paper2); border-radius:12px; border:1px solid var(--border)">인물 정보가 부족하여 관계도를 생성할 수 없습니다.</div>';
    return;
  }

  const male = chars.find(c => c.role === '남주' || (c.gender && c.gender.includes('남'))) || chars[1] || chars[0];
  const female = chars.find(c => c.role === '여주' || (c.gender && c.gender.includes('여'))) || chars[0];
  const subs = chars.filter(c => c !== male && c !== female).slice(0, 4);

  const W = 800, H = 350; 
  const cx = W / 2, cy = H / 2 + 20;
  const mPos = { x: cx - 140, y: cy + 20 };
  const fPos = { x: cx + 140, y: cy + 20 };

  const arcPositions = [
    { x: cx - 220, y: cy - 70 }, 
    { x: cx - 70, y: cy - 100 },
    { x: cx + 70, y: cy - 100 }, 
    { x: cx + 220, y: cy - 70 },
  ];

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; overflow:visible" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1"/>
      </filter>
      <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#AA8939;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gradDeepBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2C3E50;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#34495E;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gradGray" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#95a5a6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7f8c8d;stop-opacity:1" />
      </linearGradient>
    </defs>`;

  // Draw Links with organic curves
  svg += `<path d="M ${mPos.x} ${mPos.y} Q ${cx} ${cy - 40} ${fPos.x} ${fPos.y}" fill="none" stroke="url(#gradGold)" stroke-width="3" opacity="0.6" stroke-dasharray="0" />`;
  svg += `
    <g transform="translate(${cx}, ${cy - 25})">
      <rect x="-40" y="-10" width="80" height="20" rx="10" fill="#fff" stroke="#D4AF37" stroke-width="1"/>
      <text font-size="10" fill="#D4AF37" text-anchor="middle" dominant-baseline="middle" font-weight="900">MAIN COUPLE</text>
    </g>
  `;

  subs.forEach((c, i) => {
    const pos = arcPositions[i];
    if (!pos) return;
    svg += `<path d="M ${pos.x} ${pos.y} L ${cx} ${cy}" stroke="#eee" stroke-width="1" stroke-dasharray="4,2" opacity="0.8"/>`;
  });

  const nodeHtml = (p, n, grad, isMain = false) => `
    <g class="rel-node" onclick="selectCharByName('${n}')" style="cursor:pointer" filter="url(#nodeShadow)">
      <circle cx="${p.x}" cy="${p.y}" r="${isMain ? 28 : 22}" fill="${grad}" stroke="#fff" stroke-width="2"/>
      <text x="${p.x}" y="${p.y}" font-size="${isMain ? 14 : 11}" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-weight="900">${n[0]}</text>
      <text x="${p.x}" y="${p.y + (isMain ? 45 : 35)}" font-size="12" fill="#1A1A1B" text-anchor="middle" font-weight="800">${n}</text>
    </g>`;

  svg += nodeHtml(mPos, male.name, 'url(#gradGold)', true);
  svg += nodeHtml(fPos, female.name, 'url(#gradDeepBlue)', true);
  subs.forEach((c, i) => {
    if (arcPositions[i]) svg += nodeHtml(arcPositions[i], c.name, 'url(#gradGray)');
  });

  svg += `</svg>`;
  wrap.innerHTML = svg;
}

export function buildEpList() {
  const el = document.getElementById('ep-list-r');
  if (!el) return;
  el.innerHTML = '';

  const rawEps = state.planData?.episodes || state.aiEpisodes || [];
  const eps = Array.isArray(rawEps) ? rawEps : (typeof rawEps === 'number' ? Array.from({ length: rawEps }, (_, i) => ({ num: i + 1 })) : []);

  if (eps.length === 0) {
    el.innerHTML = '<div class="project-empty-desc" style="padding:20px">에피소드 정보가 없습니다.</div>';
    return;
  }

  eps.forEach((ep, i) => {
    const isCompleted = ep.status === 'completed';
    const isWriting = ep.status === 'writing';
    const currentIdx = ep.current_scene_idx || 0;
    const totalScenes = ep.total_scenes_count || (ep.scenes?.length) || 0;
    const pct = totalScenes > 0 ? Math.round((currentIdx / totalScenes) * 100) : 0;

    const div = document.createElement('div');
    div.className = `ep-item-r ${isCompleted ? 'completed' : ''}`;
    div.id = `ep-card-${ep.id || i}`;

    div.innerHTML = `
      <div class="ep-left-r">
        <div class="ep-dot-r" style="background:${isCompleted ? 'var(--gold)' : (isWriting ? 'var(--teal)' : '#ccc')}; color:#fff">
           ${isCompleted ? '✓' : (ep.num || i + 1)}
        </div>
        <div class="ep-line-r"></div>
      </div>
      <div class="ep-content-r">
        <div class="ep-header-r" onclick="toggleEp(${i})" style="cursor:pointer; display:flex; align-items:center; width:100%">
          <div style="display:flex; flex-direction:column; gap:2px">
            <span class="ep-num-r" style="color:${isCompleted ? 'var(--gold)' : 'var(--ink2)'}; font-size:11px; font-weight:800">
              ${ep.num || i + 1}화 
              <span class="badge-${ep.status || 'pending'}">${ep.status === 'completed' ? '완성' : (ep.status === 'writing' ? '작성 중' : '대기')}</span>
            </span>
            <span class="ep-title-r" style="font-weight:700">${ep.title || '제목 생성 대기 중'}</span>
          </div>
          
          <div style="margin-left:auto; display:flex; gap:8px; align-items:center">
             ${!isCompleted ? `
               <button class="btn-micro-${isWriting ? 'teal' : 'gold'}" onclick="event.stopPropagation(); startEpisodeGeneration('${ep.id}', ${i})">
                 ${isWriting ? `⚡ 이어서 작성 (${pct}%)` : '✍️ 대본 작성'}
               </button>
             ` : `
               <span style="font-size:11px; color:var(--gold); font-weight:800">대본 완성</span>
             `}
             <span class="ep-chev" id="echev-${i}">▶</span>
          </div>
        </div>
        
        <div class="ep-detail-r" id="edetail-${i}" style="display:none">
          <div id="ep-progress-container-${i}" class="ep-progress-mini" style="display:${isWriting ? 'block' : 'none'}; margin-bottom:15px">
             <div class="ep-progress-text" style="font-size:11px; margin-bottom:4px; font-weight:700; color:var(--teal)">씬 생성 중... (${currentIdx}/${totalScenes})</div>
             <div class="ep-progress-bar-bg" style="width:100%; height:4px; background:var(--border); border-radius:2px; overflow:hidden">
               <div id="ep-progress-fill-${i}" style="width:${pct}%; height:100%; background:var(--teal); transition:width 0.3s"></div>
             </div>
          </div>

          <div class="ep-body-r" style="margin-bottom:12px; font-size:13px; color:var(--ink2)">${ep.story || ep.logline || '상세 줄거리가 없습니다.'}</div>
          
          <div class="scene-list-r" id="scene-list-container-${i}">
            ${(ep.script && ep.script.length > 0) ? ep.script.map(s => `
              <div class="scene-row script-scene">
                <span class="scene-num">S#${s.num}</span>
                <div class="scene-main">
                  <div class="scene-loc">${s.loc}</div>
                  <div class="scene-content">${s.content}</div>
                </div>
              </div>
            `).join('') : ((ep.scenes && ep.scenes.length > 0) ? ep.scenes.map(s => `
              <div class="scene-row-outline" style="opacity:0.6; font-size:12px; margin-bottom:5px">
                [S#${s.num}] ${s.place} - ${s.desc || ''}
              </div>
            `).join('') : '')}
          </div>
          
          ${isCompleted ? `
            <div class="ep-summary-box" style="margin-top:15px; padding:15px; background:var(--gold-soft); border-radius:12px; border:1px dashed var(--gold)">
              <div style="font-weight:800; font-size:12px; margin-bottom:5px; color:var(--gold2)">✨ ${ep.num}화 핵심 요약 (다음 화의 참고 데이터)</div>
              <div style="font-size:13px; line-height:1.6">${ep.ep_summary || '요약 생성 전입니다.'}</div>
              ${!ep.ep_summary ? `<button class="btn-micro-gold" style="margin-top:10px" onclick="runEpSummary('${ep.id}', ${i})">3줄 요약 생성</button>` : ''}
            </div>
          ` : ''}
        </div>
      </div>`;
    el.appendChild(div);
  });
}

// Multi-turn Script Generation Orchestrator
export async function startEpisodeGeneration(episodeId, epIdx) {
  const ep = state.planData.episodes[epIdx];
  if (!ep) return;

  const container = document.getElementById(`ep-progress-container-${epIdx}`);
  const fill = document.getElementById(`ep-progress-fill-${epIdx}`);
  const detail = document.getElementById(`edetail-${epIdx}`);
  const sceneList = document.getElementById(`scene-list-container-${epIdx}`);
  
  if (detail.style.display === 'none') window.toggleEp(epIdx);
  if (container) container.style.display = 'block';

  try {
    // 1. Initial Prompt if Status is Pending
    if (ep.status === 'pending') {
      showToast(`${ep.num}화 대본 작성을 시작합니다.`, 'info');
      const initRes = await initSceneGeneration(episodeId);
      ep.status = 'writing';
      ep.current_scene_idx = 0;
    }

    // 2. Loop through scenes
    const total = ep.total_scenes_count || ep.scenes.length;
    while (ep.current_scene_idx < total) {
      const idx = ep.current_scene_idx;
      const res = await generateNextScene(episodeId, idx);
      
      const pct = Math.round(((idx + 1) / total) * 100);
      if (fill) fill.style.width = pct + '%';
      
      // Update local state and UI
      if (!ep.script) ep.script = [];
      ep.script.push(res.scene);
      ep.current_scene_idx++;

      // Live Render Scene
      const sDiv = document.createElement('div');
      sDiv.className = 'scene-row script-scene';
      sDiv.innerHTML = `
        <span class="scene-num">S#${res.scene.num}</span>
        <div class="scene-main">
          <div class="scene-loc">${res.scene.loc}</div>
          <div class="scene-content">${res.scene.content}</div>
        </div>
      `;
      sceneList.appendChild(sDiv);
      sDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (res.isFinal) {
        ep.status = 'completed';
        break;
      }
    }

    if (ep.status === 'completed') {
      showToast(`${ep.num}화 대본이 완성되었습니다!`, 'success');
      if (container) container.style.display = 'none';
      buildEpList(); // Refresh to show summary button
    }

  } catch (err) {
    console.error('Generation Error:', err);
    showToast('대본 생성 중 오류가 발생했습니다: ' + err.message, 'error');
  }
}

export async function runEpSummary(episodeId, epIdx) {
  try {
    const { summarizeEpisode } = await import('./api.js');
    showToast('대본 내용을 요약하는 중...', 'info');
    const res = await summarizeEpisode(episodeId);
    state.planData.episodes[epIdx].ep_summary = res.summary;
    showToast('요약이 완료되었습니다.', 'success');
    buildEpList();
  } catch (err) {
    showToast('요약에 실패했습니다.', 'error');
  }
}

window.startEpisodeGeneration = startEpisodeGeneration;
window.runEpSummary = runEpSummary;

export function buildBudget() {
  const n = state.planData?.episodes?.length || state.currentInput?.episodes || 8;
  const bars = document.getElementById('ep-bars-r');
  if (!bars) return;

  const breakdown = state.planData?.stats?.budgetBreakdown || [];
  const tots = breakdown.length ? breakdown.map(ep => Object.values(ep.items || {}).reduce((s, v) => s + parseInt(v || 0), 0))
    : Array.from({ length: n }, (_, i) => 12000 + Math.random() * 5000);

  const max = Math.max(...tots, 100);

  bars.innerHTML = tots.map((v, i) => {
    const isGenerated = breakdown.some(b => b.ep === i + 1);

    // 1화이거나 이미 생성된 경우 바 그래프 표시
    if (i === 0 || isGenerated) {
      return `
        <div class="ep-budget-bar">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px">
            <span style="font-weight:800; font-size:12px; color:var(--ink)">제 ${i + 1}화</span>
            <span style="font-weight:800; font-size:12px; color:var(--gold2)">${(v / 10000).toFixed(2)}억</span>
          </div>
          <div class="ep-budget-track">
            <div class="ep-budget-fill" style="width:${Math.round(v / max * 100)}%; background:linear-gradient(90deg, var(--gold), var(--gold2))">
              <span>${Math.round(v).toLocaleString()}만원</span>
            </div>
          </div>
        </div>`;
    } else {
      // 아직 생성되지 않은 회차는 생성 유도 버튼 표시
      return `
        <div class="ep-budget-bar empty">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <span style="font-weight:800; font-size:12px; color:var(--ink3)">제 ${i + 1}화 (미산출)</span>
            <button class="btn-micro-gold" onclick="generateEpResources(${i})">✨ 예산/PPL 산출</button>
          </div>
          <div class="ep-budget-track" style="opacity:0.3; background:var(--border)"></div>
        </div>`;
    }
  }).join('');

  const tv = tots.reduce((a, b) => a + b, 0);
  const av = Math.round(tv / n);

  const sumWrap = document.getElementById('budget-sum-wrap');
  if (sumWrap) {
    sumWrap.innerHTML = `
      <div class="bcard premium-glass-card"><div class="bcard-label">총 제작비</div><div class="bcard-value" style="color:var(--gold)">${(tv / 10000).toFixed(1)}억</div></div>
      <div class="bcard premium-glass-card"><div class="bcard-label">회당 평균</div><div class="bcard-value">${(av / 10000).toFixed(1)}억</div></div>
      <div class="bcard premium-glass-card"><div class="bcard-label">PPL 예상</div><div class="bcard-value" style="color:var(--teal2)">${state.planData?.stats?.ppl || '6.5억'}</div></div>
    `;
  }
}

export function buildPplPanel() {
  const pplGrid = document.getElementById('ppl-grid-r');
  if (!pplGrid) return;

  const pplData = state.planData?.ppl || [];
  if (!pplData.length) {
    pplGrid.innerHTML = '<div class="project-empty-desc" style="padding:20px; text-align:center">PPL 제안 수집 중...</div>';
    return;
  }

  pplGrid.innerHTML = pplData.map(p => `
    <div class="ppl-card">
      <div class="ppl-badge ${p.badge || 't-gold'}">${p.industry || '협찬'}</div>
      <div class="ppl-brand">${p.brand || ''}</div>
      <div class="ppl-scene">${p.scene || ''}</div>
      <div class="ppl-desc">${p.sceneDesc || ''}</div>
      <div class="ppl-footer">
        <span>예상 수익: ${p.price || '0'}</span>
        <span>난이도: ${p.difficulty || '하'}</span>
      </div>
    </div>`).join('');
}

// Global exposure for legacy onclick handlers
window.buildResultPanels = buildResultPanels;
window.generateEpResources = generateEpResources;
window.selectChar = (i) => {
  document.querySelectorAll('.char-card-r').forEach((c, j) => c.classList.toggle('selected', j === i));
  renderCast(i);
};
window.toggleEp = (i) => {
  const d = document.getElementById('edetail-' + i);
  const c = document.getElementById('echev-' + i);
  if (!d) return;
  const o = d.classList.contains('open');
  d.classList.toggle('open', !o);
  if (c) c.style.transform = o ? '' : 'rotate(90deg)';
};

window.selectCharByName = (name) => {
  const castList = state.currentDashboardCast || CAST_DATA_BASE;
  const idx = castList.findIndex(c => c.name === name);
  if (idx !== -1) window.selectChar(idx);
};
