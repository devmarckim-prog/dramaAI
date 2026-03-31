/**
 * Dashboard Rendering Module
 */

import { state } from './state.js';
// Removed circular import to prevent initialization issues
// import { numToPrice, showToast, updateApiStatus } from './navigation.js';
import { MAPPINGS } from './constants.js';
import { CAST_DATA_BASE } from './samples.js';
import { renderScript, renderEpTabs, renderSceneRow, renderSceneDetail } from './script.js';
import { generateEpResources } from './api.js';

const colors = ['#C9933A', '#5EAED4', '#888'];

export function buildResultPanels() {
  const charGrid = document.getElementById('char-cards-r');
  if (charGrid) charGrid.innerHTML = '';
  
  const epBars = document.getElementById('ep-bars-r');
  if (epBars) epBars.innerHTML = '';

  renderOverview();
  buildCharCards();
  buildEpList();
  buildBudget();
  buildPplPanel();
  renderScript();
}

function renderOverview() {
  const p = state.planData || {};
  const input = state.currentInput || {};
  
  const title = p.title || input.title || '새 프로젝트';
  const el = document.getElementById('result-hero-title-el');
  if (el) el.textContent = title;
  
  const loglineText = p.logline || input.logline || '';
  const loglineEl = document.getElementById('result-logline');
  if (loglineEl) loglineEl.textContent = loglineText;
  
  // Also update the hidden/extra logline cards if they exist
  const loglineCard = document.querySelector('.result-hero-logline');
  if (loglineCard && !p.logline && input.logline) loglineCard.textContent = input.logline;

  const sideTitle = document.getElementById('sidebar-title-label');
  if (sideTitle) sideTitle.textContent = title;

  const badge = document.getElementById('result-badge');
  if (badge) {
    const platform = p.platform || input.platform || 'OTT';
    const genre = p.genre || input.genre || '장르';
    const epCount = p.episodes?.length || input.episodes || 8;
    badge.innerHTML = `🌟 ${platform} · ${genre} · ${epCount}부작`;
  }
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
  
  const W = 800, H = 340;
  const cx = W / 2, cy = H / 2;
  const mPos = { x: cx - 180, y: cy };
  const fPos = { x: cx + 180, y: cy };
  
  const arcPositions = [
    { x: cx - 300, y: cy - 100 }, { x: cx - 100, y: cy - 120 },
    { x: cx + 100, y: cy - 120 }, { x: cx + 300, y: cy - 100 },
  ];

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; overflow:visible" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#C9933A;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#E8B45A;stop-opacity:1" />
      </linearGradient>
    </defs>`;
  
  // Links
  svg += `<path d="M ${mPos.x} ${mPos.y} Q ${cx} ${cy - 60} ${fPos.x} ${fPos.y}" fill="none" stroke="url(#gradGold)" stroke-width="3" class="rel-link" opacity="0.9"/>`;
  svg += `<text x="${cx}" y="${cy - 30}" class="rel-text" font-size="12" fill="var(--gold)" text-anchor="middle" filter="url(#glow)">♥ Main Relationship</text>`;
  
  subs.forEach((c, i) => {
    const pos = arcPositions[i];
    if (!pos) return;
    svg += `<line x1="${pos.x}" y1="${pos.y}" x2="${cx}" y2="${cy}" stroke="#aaa" stroke-width="1.5" stroke-dasharray="4,4" class="rel-link" opacity="0.4"/>`;
  });

  // Nodes
  const nodeHtml = (p, n, color, isMain = false) => `
    <g class="rel-node ${isMain ? 'rel-node-main' : ''}" onclick="selectCharByName('${n}')">
      <circle cx="${p.x}" cy="${p.y}" r="${isMain ? 32 : 24}" fill="#fff" stroke="${color}" stroke-width="2"/>
      <circle cx="${p.x}" cy="${p.y}" r="${isMain ? 28 : 20}" fill="${color}" opacity="0.9"/>
      <text x="${p.x}" y="${p.y}" font-size="${isMain ? 14 : 12}" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-weight="900">${n[0]}</text>
      <text x="${p.x}" y="${p.y + (isMain ? 50 : 40)}" class="rel-text" font-size="13" text-anchor="middle" font-weight="700">${n}</text>
    </g>`;

  svg += nodeHtml(mPos, male.name, '#C9933A', true);
  svg += nodeHtml(fPos, female.name, '#5EAED4', true);
  subs.forEach((c, i) => {
    if (arcPositions[i]) svg += nodeHtml(arcPositions[i], c.name, '#888');
  });

  svg += `</svg>`;
  wrap.innerHTML = svg;
}

export function buildEpList() {
  const el = document.getElementById('ep-list-r');
  if (!el) return;
  el.innerHTML = '';
  
  const rawEps = state.planData?.episodes || state.aiEpisodes || [];
  const eps = Array.isArray(rawEps) ? rawEps : (typeof rawEps === 'number' ? Array.from({length: rawEps}, (_, i) => ({num: i+1})) : []);
  
  if (eps.length === 0) {
    el.innerHTML = '<div class="project-empty-desc" style="padding:20px">에피소드 정보가 없습니다.</div>';
    return;
  }

  eps.forEach((ep, i) => {
    const div = document.createElement('div');
    div.className = 'ep-item-r';
    div.innerHTML = `
      <div class="ep-left-r">
        <div class="ep-dot-r" style="background:${colors[i % 3]}; color:#fff">${ep.num || i + 1}</div>
        <div class="ep-line-r"></div>
      </div>
      <div class="ep-content-r">
        <div class="ep-header-r" onclick="toggleEp(${i})" style="cursor:pointer">
          <span class="ep-num-r" style="color:${colors[i % 3]}">${ep.num || i + 1}화</span>
          <span class="ep-title-r">${ep.title || ''}</span>
          <span class="ep-chev" id="echev-${i}" style="margin-left:auto">▶</span>
        </div>
        <div class="ep-detail-r" id="edetail-${i}">
          <div class="ep-body-r" style="margin-bottom:12px">${ep.story || ep.logline || ''}</div>
          <div class="result-hero-logline" style="font-size:12px; margin-bottom:15px">엔딩: ${ep.ending || ''}</div>
          ${ep.scenes ? `<div class="scene-list-r">${ep.scenes.map(s => `
            <div class="scene-row" style="display:flex; gap:10px; margin-bottom:8px; padding:12px; background:var(--paper2); border-radius:12px; border:1px solid var(--border)">
              <span class="scene-num" style="font-weight:800; color:var(--gold); flex-shrink:0">S#${s.num || ''}</span>
              <div style="flex-grow:1">
                <div class="scene-loc" style="font-weight:700; font-size:12px; margin-bottom:4px; color:var(--ink)">${s.loc || ''}</div>
                <div class="scene-desc-r" style="font-size:12px; color:var(--ink2); line-height:1.5">${s.desc || ''}</div>
              </div>
            </div>`).join('')}</div>` : ''}
        </div>
      </div>`;
    el.appendChild(div);
  });
}

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
