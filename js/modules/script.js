/**
 * Script Rendering & Management Module
 */

import { state } from './state.js';
import { showToast } from './navigation.js';

export function renderScript() {
  renderEpTabs();
  renderSceneRow();
}

export function renderEpTabs() {
  const rawEps = state.planData?.episodes || state.aiEpisodes || [];
  const eps = Array.isArray(rawEps) ? rawEps : (typeof rawEps === 'number' ? Array.from({length: rawEps}, (_, i) => ({num: i+1})) : []);
  const track = document.getElementById('script-ep-tab-track');
  if (!track) return;
  
  track.innerHTML = eps.map((ep, i) => `
    <button class="script-ep-tab ${i === state.currentEpIdx ? 'active' : ''}" onclick="changeScriptEp(${i})">
      <span class="ep-tab-num">${i + 1}</span>${(ep.title || '').slice(0, 8)}
    </button>`).join('');
    
  // Scroll to active tab
  setTimeout(() => {
    const active = track.querySelector('.script-ep-tab.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, 50);
}

export function changeScriptEp(i) {
  state.currentEpIdx = i;
  state.currentSceneIdx = 0;
  renderEpTabs();
  renderSceneRow();
  renderSceneDetail(0);
  
  // Update sidebar if visible
  const sidebarItems = document.querySelectorAll('#sidebar-script-eps .sidebar-item');
  sidebarItems.forEach((b, idx) => b.classList.toggle('active', idx === i));
}

export function renderSceneRow() {
  const epIdx = state.currentEpIdx;
  const script = state.scripts[epIdx] || [];
  const row = document.getElementById('script-scene-row');
  if (!row) return;

  if (!script.length) {
    const isResGenerated = state.planData?.budget?.budgetBreakdown?.some(b => b.ep === epIdx + 1);
    row.innerHTML = `
      <div class="project-empty-state" style="width:100%; display:flex; flex-direction:column; align-items:center; gap:16px; padding:40px">
        <div class="project-empty-desc" style="font-size:14px; color:var(--ink3)">아직 집필된 대본이 없습니다.</div>
        <div style="display:flex; gap:10px">
          <button class="btn btn-primary" onclick="generateScriptForEp(${epIdx})">지금 대본 집필하기</button>
          ${!isResGenerated ? `<button class="btn btn-ghost" onclick="generateEpResources(${epIdx})">✨ 예산/PPL 미리 산출</button>` : ''}
        </div>
      </div>`;
    return;
  }

  row.innerHTML = script.map((scene, i) => {
    const preview = (scene.lines?.[0]?.text || scene.lines?.[0]?.line || '').slice(0, 40);
    return `
      <div class="scene-card ${i === state.currentSceneIdx ? 'active' : ''}" id="scene-card-${i}" onclick="selectSceneCard(${i})">
        <div class="scene-card-num">S#${i + 1}</div>
        <div class="scene-card-heading">${(scene.heading || '').replace(/^S# \d+\.\s*/, '')}</div>
        <div class="scene-card-preview">${preview}...</div>
      </div>`;
  }).join('');
    
  renderSceneDetail(state.currentSceneIdx);
}

export function selectSceneCard(i) {
  state.currentSceneIdx = i;
  document.querySelectorAll('.scene-card').forEach((c, j) => c.classList.toggle('active', j === i));
  renderSceneDetail(i);
  
  const card = document.getElementById('scene-card-' + i);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

export function renderSceneDetail(idx) {
  const script = state.scripts[state.currentEpIdx] || [];
  const scene = script[idx];
  const detail = document.getElementById('script-scene-detail');
  if (!detail || !scene) return;

  const linesHtml = scene.lines.map((l, li) => {
    let inner = '';
    if (l.type === 'action') {
      inner = `<div class="scene-action">${l.text}</div>`;
    } else if (l.type === 'dialog') {
      inner = `
        <div class="scene-dialog">
          <div class="scene-char-name">${l.char}</div>
          ${l.paren ? `<div class="scene-parenthetical">(${l.paren})</div>` : ''}
          <div class="scene-line">${l.line}</div>
        </div>`;
    } else {
      inner = `<div class="scene-direction">${l.text}</div>`;
    }
    
    return `
      <div class="script-line-wrap">
        ${inner}
        <button class="line-edit-btn" onclick="openFloatingAgentForLine(${idx}, ${li})">✨ 수정</button>
      </div>`;
  }).join('');

  detail.innerHTML = `
    <div class="screenplay-font" style="margin:0; padding:40px; border-radius:12px">
      <div class="scene-detail-header" style="margin-bottom:32px">
        <span class="scene-detail-num">S#${idx + 1}</span>
        <span class="scene-detail-heading">${scene.heading || ''}</span>
      </div>
      ${linesHtml}
    </div>`;
    
  // Update floating agent context
  if (window.updateFloatingAgentContext) {
    window.updateFloatingAgentContext(scene.heading, idx);
  }
}

export function showFullScript() {
  const modal = document.getElementById('fullscript-modal');
  if (!modal) return;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  const btns = document.getElementById('fullscript-ep-btns');
  const rawEps = state.planData?.episodes || state.aiEpisodes || [];
  const eps = Array.isArray(rawEps) ? rawEps : (typeof rawEps === 'number' ? Array.from({length: rawEps}, (_, i) => ({num: i+1})) : []);
  if (btns && eps.length) {
    btns.innerHTML = eps.map((_, i) => `
      <button id="fsbtn-${i}" class="fs-ep-btn ${i === 0 ? 'active' : ''}" onclick="renderFullScriptEp(${i})">
        ${i + 1}화
      </button>`).join('');
  }
  renderFullScriptEp(0);
}

export function renderFullScriptEp(epIdx) {
  const script = state.scripts[epIdx] || [];
  const rawEps = state.planData?.episodes || state.aiEpisodes || [];
  const eps = Array.isArray(rawEps) ? rawEps : (typeof rawEps === 'number' ? Array.from({length: rawEps}, (_, i) => ({num: i+1})) : []);
  
  eps.forEach((_, i) => {
    const b = document.getElementById('fsbtn-' + i);
    if (b) b.classList.toggle('active', i === epIdx);
  });
  
  const ep = eps[epIdx];
  const titleEl = document.getElementById('fullscript-title');
  const subEl = document.getElementById('fullscript-subtitle');
  if (titleEl) titleEl.textContent = `${epIdx + 1}화 대본 ${ep ? '· ' + (ep.title || '') : ''}`;
  if (subEl) subEl.textContent = ep ? `엔딩: ${ep.ending || ''}` : '';
  
  const body = document.getElementById('fullscript-body');
  if (!body) return;
  
  if (!script.length) {
    body.innerHTML = '<div class="project-empty-desc" style="padding:40px; text-align:center">이 회차의 대본이 아직 집필되지 않았습니다.</div>';
    return;
  }
  
  body.innerHTML = `
    <div class="screenplay-font" style="box-shadow:none; border:none; margin:0; padding:60px">
      ${script.map(scene => `
        <div style="margin-bottom:60px">
          <div class="script-scene-heading">${scene.heading}</div>
          ${scene.lines.map(line => {
            if (line.type === 'action') return `<div class="script-action-block">${line.text}</div>`;
            if (line.type === 'direction') return `<div class="script-direction-block">(${line.text})</div>`;
            if (line.type === 'dialog') {
              const p = line.paren ? `<div class="script-parenthetical">(${line.paren})</div>` : '';
              return `<div class="script-dialog-wrap">
                <div class="script-char-name">${line.char}</div>
                ${p}
                <div class="script-dialog-text">${line.line}</div>
              </div>`;
            }
            return '';
          }).join('')}
        </div>`).join('')}
    </div>`;
  const m = document.getElementById('fullscript-modal');
  if (m) m.scrollTop = 0;
}

export function closeFullScript() {
  const m = document.getElementById('fullscript-modal');
  if (m) m.style.display = 'none';
  document.body.style.overflow = '';
}

// Attach to window for global access
window.changeScriptEp = changeScriptEp;
window.selectSceneCard = selectSceneCard;
window.showFullScript = showFullScript;
window.renderFullScriptEp = renderFullScriptEp;
window.closeFullScript = closeFullScript;
