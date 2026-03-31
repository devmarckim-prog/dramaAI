/**
 * Wizard UI and Input Collection
 */

import { state } from './state.js';
import { showToast } from './navigation.js';

export function selectOpt(btn) {
  btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

export function addChar() {
  const builder = document.getElementById('char-builder');
  if (!builder) return;
  const idx = state.charCount++;
  const div = document.createElement('div');
  div.className = 'char-row';
  div.id = 'char-row-' + idx;
  div.innerHTML = `
    <div class="char-row-header">
      <span class="char-row-label">인물 ${idx + 1}</span>
      <select class="char-role-select" id="char-role-${idx}">
        <option value="주연">주연</option>
        <option value="여주">여주</option>
        <option value="남주">남주</option>
        <option value="조연" selected>조연</option>
        <option value="악역">악역</option>
      </select>
      <button class="btn btn-ghost char-row-delete-btn" onclick="this.closest('.char-row').remove()">삭제</button>
    </div>
    <div class="char-fields">
      <input class="form-input" id="char-name-${idx}" placeholder="이름">
      <input class="form-input" id="char-age-${idx}" placeholder="나이">
      <input class="form-input" id="char-gender-${idx}" placeholder="성별">
      <input class="form-input" id="char-job-${idx}" placeholder="직업">
      <input class="form-input" id="char-personality-${idx}" placeholder="성격 / 결핍">
      <input class="form-input" id="char-looks-${idx}" placeholder="외모 특징">
    </div>`;
  builder.appendChild(div);
}

export function updateStepUI() {
  const { currentStep, totalSteps } = state;
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.getElementById('sdot-' + i);
    const label = document.getElementById('slabel-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    label?.classList.remove('active');
    if (i < currentStep) {
      dot.classList.add('done');
      dot.textContent = '✔';
    } else if (i === currentStep) {
      dot.classList.add('active');
      dot.textContent = i + 1;
      label?.classList.add('active');
    } else {
      dot.textContent = i + 1;
    }
  }
  document.querySelectorAll('.step-panel').forEach((p, i) => p.classList.toggle('active', i === currentStep));
  
  const counter = document.getElementById('step-counter');
  if (counter) counter.textContent = (currentStep + 1) + ' / ' + totalSteps;
  
  const btnPrev = document.getElementById('btn-prev');
  if (btnPrev) btnPrev.style.display = currentStep > 0 ? '' : 'none';
  
  const isLast = currentStep === totalSteps - 1;
  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    if (isLast) {
      btnNext.innerHTML = '🎬 시나리오 마스터피스 생성하기';
      btnNext.classList.add('btn-wizard-next-final', 'pulse-gold');
    } else {
      btnNext.innerHTML = '다음 단계 →';
      btnNext.classList.remove('btn-wizard-next-final', 'pulse-gold');
    }
  }
  
  if (isLast) fillConfirmPage();
}

export function collectWizardInput() {
  const platform = document.querySelector('#grid-platform .option-btn.selected strong')?.textContent || 'OTT 오리지널';
  const episodes = parseInt(document.getElementById('slider-ep')?.value) || 2;
  const runtime = parseInt(document.getElementById('slider-rt')?.value) || 30;
  const gi = document.getElementById('inp-genre-other');
  const genre = (gi?.value.trim()) || (document.querySelector('#grid-genre .option-btn.selected strong')?.textContent || '로맨틱 코미디');
  const logline = document.getElementById('inp-logline')?.value.trim() || '';
  
  const eraYear = parseInt(document.getElementById('slider-era')?.value) || 2024;
  const eraCustom = document.getElementById('inp-era-custom')?.value.trim() || '';
  const era = eraCustom || (typeof eraYearLabel === 'function' ? eraYearLabel(eraYear) : eraYear + '년');
  
  const setting = document.getElementById('inp-setting')?.value.trim() || '';
  const extra = document.getElementById('inp-extra')?.value.trim() || '';
  
  const ageMin = parseInt(document.getElementById('age-min')?.value) || 20;
  const ageMax = parseInt(document.getElementById('age-max')?.value) || 39;
  
  const gf = document.getElementById('gbtn-f')?.classList.contains('selected');
  const gm = document.getElementById('gbtn-m')?.classList.contains('selected');
  const ga = document.getElementById('gbtn-a')?.classList.contains('selected');
  const gender = ga ? '모두' : gf && gm ? '모두' : gf ? '여성' : gm ? '남성' : '모두';
  const target = `${ageMin}~${ageMax}세 ${gender}`;
  
  const chars = [];
  document.querySelectorAll('.char-row').forEach(row => {
    const name = row.querySelector('[id^="char-name"]')?.value.trim() || '';
    const age = row.querySelector('[id^="char-age"]')?.value.trim() || '';
    const genderC = row.querySelector('[id^="char-gender"]')?.value.trim() || '';
    const job = row.querySelector('[id^="char-job"]')?.value.trim() || '';
    const personality = row.querySelector('[id^="char-personality"]')?.value.trim() || '';
    const looks = row.querySelector('[id^="char-looks"]')?.value.trim() || '';
    const role = row.querySelector('[id^="char-role"]')?.value || '조연';
    if (name || job) chars.push({ role, name, age, gender: genderC, job, personality, looks });
  });
  
  const title = generateTitle(logline);
  return { platform, episodes, runtime, genre, logline, era, eraYear, target, setting, extra, chars, title };
}

function generateTitle(logline) {
  if (!logline) return '무제';
  const m = logline.match(/[가-힣]{2,5}/g);
  if (m && m.length) return m[0];
  return logline.slice(0, 6).trim() || '무제';
}

export function fillConfirmPage() {
  const inp = collectWizardInput();
  const titleEl = document.getElementById('confirm-title');
  if (titleEl) titleEl.textContent = inp.title || '가제 미입력';
  
  const loglineEl = document.getElementById('confirm-logline');
  if (loglineEl) loglineEl.textContent = inp.logline || '로그라인을 입력해주세요.';
  
  const tagsWrap = document.getElementById('confirm-tags');
  if (tagsWrap) {
    tagsWrap.innerHTML = [inp.platform, inp.genre, inp.episodes + '부작', inp.runtime + '분', inp.era, inp.target]
      .filter(Boolean)
      .map(t => `<span class="confirm-tag">${t}</span>`)
      .join('');
  }
}
export function nextStep() {
  const isLast = state.currentStep === state.totalSteps - 1;
  
  if (!isLast) {
    state.currentStep++;
    updateStepUI();
  } else {
    // We are on the last step (Step 5 - Confirm)
    console.log('[Wizard] Final step. Triggering generation...');
    
    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
      btnNext.disabled = true;
      btnNext.innerHTML = '<span class="pcg-spinner"></span> 생성 시작 중...';
      btnNext.classList.add('btn-loading-state');
    }

    if (window.startGenerate) {
      window.startGenerate();
    } else {
      console.error('[Wizard] startGenerate function not found in global scope.');
      showToast('생성 엔진을 불러오지 못했습니다. 페이지를 새로고침해 주세요.', 'error');
      if (btnNext) {
        btnNext.disabled = false;
        btnNext.innerHTML = '🎬 시나리오 마스터피스 생성하기';
        btnNext.style.opacity = '1';
        btnNext.style.cursor = 'pointer';
      }
    }
  }
}

export function prevStep() {
  if (state.currentStep > 0) {
    state.currentStep--;
    updateStepUI();
  }
}

export function jumpToNow() {
  const now = new Date().getFullYear();
  const sl = document.getElementById('slider-era');
  if (sl) {
    sl.value = now;
    updateEraLabel(now);
  }
}

export function updateEraLabel(year) {
  const el = document.getElementById('era-year');
  const tags = document.getElementById('era-tags');
  if (!el || !tags) return;
  
  const label = year < 0 ? `BC ${Math.abs(year)}년` : (year > 2025 ? `${year}년 (미래)` : `${year}년`);
  el.textContent = label;
  
  const eraDB = [
    {from:-4600000000,to:-10000,kr:'선사 시대',west:'Precambrian → Paleolithic'},
    {from:-10000,to:-3000,kr:'신석기 시대',west:'Neolithic / Stone Age'},
    {from:-3000,to:-1000,kr:'청동기 시대',west:'Bronze Age'},
    {from:-1000,to:-57,kr:'고조선·삼한 시대',west:'Iron Age / Classical Antiquity'},
    {from:-57,to:668,kr:'삼국 시대',west:'Roman Empire → Medieval'},
    {from:668,to:935,kr:'통일신라 시대',west:'Carolingian Era'},
    {from:918,to:1392,kr:'고려 시대',west:'Medieval Europe'},
    {from:1392,to:1897,kr:'조선 시대',west:'Renaissance → Industrial'},
    {from:1897,to:1910,kr:'대한제국',west:'Belle Epoque'},
    {from:1910,to:1945,kr:'일제강점기',west:'WWI & WWII Era'},
    {from:1945,to:1950,kr:'해방 이후',west:'Post-WWII Era'},
    {from:1950,to:1953,kr:'한국전쟁',west:'Cold War begins'},
    {from:1953,to:2020,kr:'현대 한국',west:'Modern Era'},
    {from:2020,to:2030,kr:'현대 / 팬데믹 이후',west:'Post-COVID Era'},
    {from:2030,to:3000,kr:'미래',west:'Future'}
  ];
  const info = eraDB.find(e => year >= e.from && year < e.to) || {kr:'미지의 시대',west:'Unknown Era'};
  
  tags.innerHTML = `
    <div class="era-tag"><span class="era-tag-flag">🇰🇷</span><span class="era-tag-text"><span class="era-tag-label">한국:</span>${info.kr}</span></div>
    <div class="era-tag"><span class="era-tag-flag">🌍</span><span class="era-tag-text"><span class="era-tag-label">세계:</span>${info.west}</span></div>`;
}

export function updateRuntimeLabel(val) {
  const v = parseInt(val);
  const el = document.getElementById('val-rt');
  if (el) el.textContent = v + '분';
  let hint = '';
  if (v <= 15) hint = '숏폼 (15분 이하)';
  else if (v <= 30) hint = '웹드라마 (~30분)';
  else if (v <= 60) hint = '표준 드라마 (60분)';
  else if (v <= 90) hint = '지상파 미니시리즈 (~90분)';
  else if (v <= 120) hint = 'TV 영화 (~2시간)';
  else hint = `장편 (~${Math.round(v / 60 * 10) / 10}시간)`;
  const h = document.getElementById('rt-hint');
  if (h) h.textContent = hint;
}

export function updateAgeSlider() {
  const minEl = document.getElementById('age-min');
  const maxEl = document.getElementById('age-max');
  if (!minEl || !maxEl) return;
  let mn = parseInt(minEl.value), mx = parseInt(maxEl.value);
  if (mn > mx - 5) {
    if (document.activeElement === minEl) mn = mx - 5;
    else mx = mn + 5;
  }
  minEl.value = mn;
  maxEl.value = mx;
  const fill = document.getElementById('age-fill');
  const total = 70 - 10;
  const left = ((mn - 10) / total * 100).toFixed(1);
  const right = ((mx - 10) / total * 100).toFixed(1);
  if (fill) {
    fill.style.left = left + '%';
    fill.style.width = (right - left) + '%';
  }
  const lbl = document.getElementById('age-label');
  if (lbl) lbl.textContent = `${mn} ~ ${mx}세`;
}

export function toggleGender(g) {
  ['f', 'm', 'a'].forEach(id => {
    const btn = document.getElementById('gbtn-' + id);
    if (btn) btn.classList.remove('selected');
  });
  const t = document.getElementById('gbtn-' + g);
  if (t) t.classList.add('selected');
}

export function autoFillChars() {
  const banner = document.getElementById('char-auto-banner');
  if (banner) banner.style.display = 'none';

  showToast('AI가 인물을 분석하여 자동 설정 중입니다...', 'info');
  
  setTimeout(() => {
    const femaleJobs = ['쉐프', '의사', '기자', '변호사', '디자이너', '교사', '작가', '간호사'];
    const maleJobs = ['건물주', '검사', '의사', '형사', 'CEO', '건축가', '외교관', '교수'];
    const femaleNames = ['이수진', '김지아', '박소연', '최하은', '정유나', '한소원', '오지윤', '서민아'];
    const maleNames = ['강재윤', '김도현', '박준혁', '이민재', '최시우', '장승현', '윤태오', '송준'];
    const r1 = Math.floor(Math.random() * femaleNames.length);
    const r2 = Math.floor(Math.random() * maleNames.length);
    const rj1 = Math.floor(Math.random() * femaleJobs.length);
    const rj2 = Math.floor(Math.random() * maleJobs.length);

    const n0 = document.getElementById('char-name-0');
    const a0 = document.getElementById('char-age-0');
    const g0 = document.getElementById('char-gender-0');
    const j0 = document.getElementById('char-job-0');
    const p0 = document.getElementById('char-personality-0');
    if (n0) n0.value = femaleNames[r1];
    if (a0) a0.value = '27세';
    if (g0) g0.value = '여성';
    if (j0) j0.value = femaleJobs[rj1];
    if (p0) p0.value = '열정적이지만 덜렁댐';

    const n1 = document.getElementById('char-name-1');
    const a1 = document.getElementById('char-age-1');
    const g1 = document.getElementById('char-gender-1');
    const j1 = document.getElementById('char-job-1');
    const p1 = document.getElementById('char-personality-1');
    if (n1) n1.value = maleNames[r2];
    if (a1) a1.value = '31세';
    if (g1) g1.value = '남성';
    if (j1) j1.value = maleJobs[rj2];
    if (p1) p1.value = '냉철하고 완벽주의';

    state.charAutoFilled = true;

    const manualBox = document.getElementById('char-mode-box-manual');
    const divider = document.getElementById('char-mode-divider-manual');
    const manualWrap = document.getElementById('manual-chars-wrap');
    if (manualBox) manualBox.style.display = 'none';
    if (divider) divider.style.display = 'none';
    if (manualWrap) manualWrap.style.display = 'none';

    if (banner) {
      banner.style.display = 'flex';
      banner.querySelector('.char-auto-name1').textContent = femaleNames[r1];
      banner.querySelector('.char-auto-job1').textContent = femaleJobs[rj1];
      banner.querySelector('.char-auto-name2').textContent = maleNames[r2];
      banner.querySelector('.char-auto-job2').textContent = maleJobs[rj2];
    }
    showToast('AI 인물 설정이 완료되었습니다!', 'success');
  }, 1000);
}

export function resetAutoChars() {
  state.charAutoFilled = false;
  ['char-name-0', 'char-age-0', 'char-gender-0', 'char-job-0', 'char-personality-0', 'char-looks-0',
   'char-name-1', 'char-age-1', 'char-gender-1', 'char-job-1', 'char-personality-1', 'char-looks-1'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const banner = document.getElementById('char-auto-banner');
  const manualBox = document.getElementById('char-mode-box-manual');
  const divider = document.getElementById('char-mode-divider-manual');
  if (banner) banner.style.display = 'none';
  if (manualBox) manualBox.style.display = '';
  if (divider) divider.style.display = '';
  showToast('초기화되었습니다.', 'info');
}

export function toggleManualChars() {
  const wrap = document.getElementById('manual-chars-wrap');
  const btn = document.getElementById('btn-manual-toggle');
  if (!wrap) return;
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.textContent = isOpen ? '펼치기 ▼' : '접기 ▲';
}

export function updateDraftPreview() {
  const inp = collectWizardInput();
  
  const title = document.getElementById('draft-title');
  const platform = document.getElementById('draft-platform');
  const genre = document.getElementById('draft-genre');
  const logline = document.getElementById('draft-logline');
  const ep = document.getElementById('draft-ep');
  const rt = document.getElementById('draft-rt');
  
  if (title) title.textContent = inp.title || '무제';
  if (platform) platform.textContent = inp.platform || '플랫폼 미정';
  if (genre) genre.textContent = inp.genre || '장르 미정';
  if (logline) {
    const l = inp.logline || '로그라인을 입력하세요.';
    logline.textContent = l.length > 50 ? l.substring(0, 50) + '...' : l;
  }
  if (ep) ep.textContent = inp.episodes;
  if (rt) rt.textContent = inp.runtime;
}
