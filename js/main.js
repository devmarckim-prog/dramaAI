/* ===================================
   STATE
=================================== */
let isLoggedIn = false;
let isGuestMode = localStorage.getItem('ds_guest_mode') === 'true';
let currentUser = null;
let currentStep = 0;
const totalSteps = 5;
let charCount = 2;
let aiEpisodes = null;
let aiScript = null;
let currentInput = null;
let sampleImgUrl = null;
let currentEpIdx = 0;  // 현재 대본 회차

/* ===================================
   HERO CANVAS
=================================== */
(function(){
  const c=document.getElementById('hero-canvas');if(!c)return;
  const ctx=c.getContext('2d');let W,H,ps=[];
  function resize(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight;}
  resize();window.addEventListener('resize',resize);
  class P{constructor(){this.reset();}reset(){this.x=Math.random()*W;this.y=Math.random()*H;this.r=Math.random()*1.8+.4;this.vx=(Math.random()-.5)*.3;this.vy=-(Math.random()*.4+.1);this.a=Math.random()*.6+.1;}update(){this.x+=this.vx;this.y+=this.vy;this.a-=.001;if(this.y<-4||this.a<0)this.reset();}draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle=`rgba(201,147,58,${this.a})`;ctx.fill();}}
  for(let i=0;i<120;i++)ps.push(new P());
  (function loop(){ctx.clearRect(0,0,W,H);ps.forEach(p=>{p.update();p.draw();});requestAnimationFrame(loop);})();
})();

/* ===================================
   AUTH / NAV
=================================== */
function renderNav(){
  const nav=document.getElementById('nav-actions');
  const token = localStorage.getItem('ds_auth_token');
  
  if(token || isGuestMode){
    const userEmail = isGuestMode ? 'Guest Mode (Test)' : (localStorage.getItem('ds_user_email') || 'User');
    const avatarChar = isGuestMode ? 'G' : userEmail[0].toUpperCase();
    
    nav.innerHTML=`
      <div class="nav-user-info" style="display:flex; align-items:center; gap:12px">
        <span style="font-size:13px; color:var(--ink3); font-weight:500">${userEmail}</span>
        <div class="nav-avatar" onclick="showPage('settings')" title="설정">
          <div class="nav-avatar-placeholder" style="${isGuestMode ? 'background:var(--accent)' : ''}">${avatarChar}</div>
        </div>
        <button class="btn btn-ghost" style="font-size:12px; color:var(--ink3)" onclick="handleLogout()">로그아웃</button>
      </div>`;
    isLoggedIn = true;
  } else {
    nav.innerHTML=`<button class="btn btn-primary" onclick="showLoginModal()">로그인</button>`;
    isLoggedIn = false;
  }
}

function handleStartBtn(){
  if(!isLoggedIn){ showLoginModal(); return; }
  showPage('projects');
}

function showLoginModal(){
  const wrap=document.getElementById('login-modal-wrap');
  wrap.innerHTML=`
    <div class="login-backdrop" id="login-backdrop" onclick="closeLoginModal(event)">
      <div class="login-box">
        <div class="login-hero">
          <div class="login-hero-bg"></div>
          <div class="login-logo">드라마스크립트<span>AI</span></div>
          <div class="login-tagline">K-드라마 전문 AI 대본 작가</div>
        </div>
        <div class="login-body">
          <div class="login-title">시작하기</div>
          <div class="login-sub">구글 계정으로 간편하게 시작해보세요</div>
          <button class="login-social-btn" onclick="doLogin('google')">
            <div class="login-social-icon" style="background:#EA4335;color:#fff">G</div>
            Google로 계속하기
          </button>
          
          <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border)">
            <button class="btn btn-ghost" style="width:100%; border:1px solid var(--border)" onclick="enterGuestMode()">
              로그인 없이 체험하기 (Test)
            </button>
            <div style="font-size:11px; color:var(--ink3); margin-top:8px; text-align:center">
              * 게스트 모드는 데이터가 로컬 스토리지에 저장됩니다.
            </div>
          </div>

          <div class="login-agree">가입 시 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의합니다</div>
        </div>
      </div>
    </div>`;
}

function enterGuestMode() {
  isGuestMode = true;
  localStorage.setItem('ds_guest_mode', 'true');
  closeLoginModal();
  renderNav();
  showPage('projects');
  showToast('게스트 모드로 시작합니다. 브라우저 종료 시 데이터가 유실될 수 있습니다.', 'info');
}

function closeLoginModal(e){
  if(e && e.target.id!=='login-backdrop') return;
  const bd=document.getElementById('login-backdrop');
  if(bd){bd.classList.add('hiding');setTimeout(()=>{document.getElementById('login-modal-wrap').innerHTML='';},200);}
}

async function doLogin(method){
  if (method === 'google') {
    try {
      await window.loginWithGoogle();
    } catch(e) {
      console.error('Google login error:', e);
      showToast('로그인 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.', 'error');
    }
  } else {
    showToast('지원하지 않는 로그인 방식입니다.', 'info');
  }
}

function handleLogout(){
  isGuestMode = false;
  localStorage.removeItem('ds_guest_mode');
  if(window.logoutUser) window.logoutUser();
  isLoggedIn=false; currentUser=null;
  renderNav();
  showPage('home');
  showToast('로그아웃되었습니다.', 'info', '👋', 2000);
}

function toggleApiKeyInput(){
  const sec = document.getElementById('api-key-section');
  const arrow = document.getElementById('api-key-arrow');
  if(!sec) return;
  const hidden = sec.style.display === 'none';
  sec.style.display = hidden ? 'block' : 'none';
  if(arrow) arrow.textContent = hidden ? '▼' : '▶';
}

function saveUserApiKey(){
  const inp = document.getElementById('user-api-key-inp');
  if(!inp || !inp.value.trim()){
    showToast('API 키를 입력해주세요.', 'warn');
    return;
  }
  localStorage.setItem('ds_user_api_key', inp.value.trim());
  showToast('API 키가 저장되었습니다.', 'success');
}

/* ===================================
   PAGE ROUTING
=================================== */
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const p=document.getElementById('page-'+id);
  if(p) p.classList.add('active');
  window.scrollTo(0,0);
  if(id==='result'){buildResultPanels();showPanel('overview');}
  if(id==='projects') renderProjectCards();
  if(id==='settings') renderSettingsProfile();
  if(id==='wizard'){
    currentStep=0; _charAutoFilled=false; updateStepUI();
    // 인물 UI 초기 상태로 복원
    const banner=document.getElementById('char-auto-banner');
    const manualBox=document.getElementById('char-mode-box-manual');
    const divider=document.getElementById('char-mode-divider-manual');
    if(banner) banner.style.display='none';
    if(manualBox) manualBox.style.display='';
    if(divider) divider.style.display='';
  }
}

/* ===================================
   API 키 설정 관리
=================================== */
function renderSettingsProfile(){
  if(!currentUser) return;
  const el=document.getElementById('settings-username');
  const em=document.getElementById('settings-email');
  const av=document.getElementById('settings-avatar');
  if(el) el.textContent=currentUser.name;
  if(em) em.textContent=currentUser.email;
  if(av) av.textContent=currentUser.name[0];
  // API 키 상태 반영
  loadApiKeyToSettings();
}

function loadApiKeyToSettings(){
  const key = localStorage.getItem('ds_api_key')||'';
  const model = localStorage.getItem('ds_model')||'claude-sonnet-4-6';
  const inp = document.getElementById('settings-api-key');
  const modelSel = document.getElementById('settings-model');
  if(inp && key) inp.value = key;
  if(modelSel) modelSel.value = model;
  updateApiKeyStatusUI(!!key);
}

function onApiKeyInput(){
  const v = document.getElementById('settings-api-key')?.value.trim()||'';
  updateApiKeyStatusUI(false, v?'입력됨 ? 저장 버튼을 눌러주세요':'API 키 없음 ? 데모 모드');
}

function updateApiKeyStatusUI(hasKey, msg){
  const dot1 = document.getElementById('api-key-status-dot');
  const txt1 = document.getElementById('api-key-status-text');
  const dot2 = document.getElementById('gen-status-dot');
  const txt2 = document.getElementById('gen-status-text');
  const color = hasKey ? '#1D9E75' : 'var(--border2)';
  const label = msg || (hasKey ? 'API 키 등록됨 ? AI 생성 활성화' : 'API 키 없음 ? 데모 모드');
  const genLabel = hasKey ? 'AI 생성 모드 ? claude-sonnet-4-6' : '데모 모드 ? API 키 없음';
  if(dot1){dot1.style.background=color;}
  if(txt1){txt1.textContent=label; txt1.style.color=hasKey?'#1D9E75':'var(--ink3)';}
  if(dot2){dot2.style.background=color;}
  if(txt2){txt2.textContent=genLabel;}
}

function saveApiKey(){
  const key = document.getElementById('settings-api-key')?.value.trim()||'';
  const model = document.getElementById('settings-model')?.value||'claude-sonnet-4-6';
  if(!key){ showToast('API 키를 입력해주세요.','warn','??'); return; }
  if(!key.startsWith('sk-ant-')){ showToast('올바른 Anthropic API 키 형식이 아닙니다. (sk-ant-로 시작)','warn','??'); return; }
  localStorage.setItem('ds_api_key', key);
  localStorage.setItem('ds_model', model);
  updateApiKeyStatusUI(true);
  showToast('API 키가 저장되었습니다.','success','??',3000);
}

function deleteApiKey(){
  if(!confirm('API 키를 삭제하면 데모 모드로 전환됩니다. 삭제할까요?')) return;
  localStorage.removeItem('ds_api_key');
  const inp = document.getElementById('settings-api-key');
  if(inp) inp.value='';
  updateApiKeyStatusUI(false);
  showToast('API 키가 삭제되었습니다.','info','???',2500);
}

function toggleApiKeyVisibility(){
  const inp = document.getElementById('settings-api-key');
  const btn = document.getElementById('api-key-eye-btn');
  if(!inp) return;
  inp.type = inp.type==='password'?'text':'password';
  if(btn) btn.textContent = inp.type==='password'?'??':'??';
}

async function testApiKey(){
  const key = localStorage.getItem('ds_api_key')||'';
  if(!key){ showToast('저장된 API 키가 없습니다.','warn','??'); return; }
  showToast('연결 테스트 중...','info','??',2000);
  try{
    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':key,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:10,messages:[{role:'user',content:'hi'}]})
    });
    if(res.ok){ showToast('API 연결 성공! AI 생성이 활성화됩니다.','success','?',4000); }
    else{
      const e=await res.json().catch(()=>({}));
      showToast(`연결 실패: ${e?.error?.message||res.status}`,'warn','??',5000);
    }
  }catch(e){
    showToast(`연결 오류: ${e.message}`,'warn','??',5000);
  }
}



/* ===================================
   PROJECTS
=================================== */
async function renderProjectCards(){
  const wrap=document.getElementById('project-cards-wrap');
  if(!wrap) return;
  wrap.innerHTML = '<div style="padding:40px; text-align:center; color:var(--ink3)">프로젝트 목록을 불러오는 중...</div>';
  
  const projects = await window.fetchProjects();
  let html=`<div class="project-cards-grid">`;

  // ① 새 프로젝트 카드
  html+=`<div class="project-card-new" onclick="showPage('wizard')">
    <div class="project-card-new-plus">＋</div>
    <div class="project-card-new-label">새 프로젝트 만들기</div>
  </div>`;

  // ② 샘플 보기 카드 1 ? 시크릿가든
  const sampleBg = sampleImgUrl ? `background-image:url('${sampleImgUrl}')` : `background:linear-gradient(135deg,#1a1410,#2d1f0e)`;
  html+=`<div class="project-card-sample" onclick="openSampleProject()">
    <div class="project-card-sample-bg" style="background-image:url('data:image/png;base64,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');background-size:cover;background-position:center"></div>
    <div class="project-card-sample-overlay"></div>
    <div class="project-card-sample-content">
      <div class="project-card-sample-badge">? SAMPLE 1</div>
      <div class="project-card-sample-title">시크릿가든</div>
      <div class="project-card-sample-sub">OTT 오리지널 · 로맨틱 코미디 · 8부작<br>쉐프와 건물주의 로맨스</div>
      <div class="project-card-sample-btn">샘플 보기</div>
    </div>
  </div>`;

  // ② 샘플 보기 카드 2 ? 디렉터스 아레나
  html+=`<div class="project-card-sample" onclick="openSample2()" style="background:linear-gradient(135deg,#0e1a2d 0%,#1a2d3d 50%,#0d2218 100%)">
    <div class="project-card-sample-bg" style="background-image:url('data:image/png;base64,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');background-size:cover;background-position:center"></div>
    <div class="project-card-sample-overlay" style="background:linear-gradient(to top,rgba(14,26,45,.9) 0%,rgba(14,26,45,.4) 100%)"></div>
    <div class="project-card-sample-content">
      <div class="project-card-sample-badge" style="background:rgba(59,139,212,.15);color:#85B7EB;border-color:rgba(59,139,212,.4)">? SAMPLE 2</div>
      <div class="project-card-sample-title" style="font-size:18px">디렉터스 아레나</div>
      <div class="project-card-sample-sub">OTT 오리지널 · 로맨틱 코미디 · 8부작<br>PD × 대표의 오디션 제작 로맨스</div>
      <div class="project-card-sample-btn" style="border-color:rgba(59,139,212,.5);color:#85B7EB">샘플 보기</div>
    </div>
  </div>`;

  // ③ 프로젝트 카드 (생성 중 / 완료 구분)
  const stepLabels = ['기획안 · 로그라인','인물 관계도','회차별 씬 구성','캐스팅 · 출연료','회차별 제작비','PPL 제안서','1화 대본 집필'];

  projects.forEach(p=>{
    if(p.status === 'generating'){
      // 생성 중 카드
      const bgStyle = sampleImgUrl ? `background-image:url('${sampleImgUrl}')` : '';
      const pct = p.pct || 3;
      const stepIdx = p.stepIdx || 0;
      const stepsHtml = stepLabels.map((s,i)=>`
        <div class="pcg-step ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}">
          <div class="pcg-step-dot"></div>
          <span>${s}</span>
        </div>`).join('');
      html+=`<div class="project-card-generating" id="gen-card-${p.id}">
        ${bgStyle ? `<div class="pcg-bg" style="${bgStyle}"></div>` : ''}
        <div class="pcg-overlay"></div>
        <div class="pcg-body">
          <div class="pcg-badge"><div class="pcg-badge-dot"></div>AI 생성 중</div>
          <div class="pcg-title">${p.title||'새 드라마'}</div>
          <div class="pcg-logline">${p.logline||p.genre||''}</div>
          <div class="pcg-steps">${stepsHtml}</div>
          <div class="pcg-progress-wrap">
            <div class="pcg-progress-label">
              <span class="pcg-progress-text">${stepLabels[stepIdx]||''} 중...</span>
              <span class="pcg-progress-pct">${pct}%</span>
            </div>
            <div class="pcg-bar"><div class="pcg-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
      </div>`;
    } else {
      // 완료된 카드
      const imgStyle=sampleImgUrl?`background-image:url('${sampleImgUrl}');background-size:cover;background-position:center`:`background:linear-gradient(135deg,#1a1410,#2d1f0e)`;
      html+=`<div class="project-card" onclick="openProject(${p.id})">
        <div class="project-card-img-wrap" style="${imgStyle}">
          ${sampleImgUrl?`<div class="project-card-img-overlay"></div>`:''}
          <div class="project-card-img-title">${p.title}</div>
        </div>
        <div class="project-card-body">
          <div class="project-card-tags">
            <span class="project-card-tag">${p.platform||'OTT'}</span>
            <span class="project-card-tag">${p.genre||'로맨스'}</span>
            <span class="project-card-tag">${p.episodes||8}부작</span>
          </div>
          <div class="project-card-logline">${p.logline||'로그라인 없음'}</div>
          <div class="project-card-footer">
            <span class="project-card-date">${p.createdAt}</span>
            <button class="project-card-del" onclick="event.stopPropagation();deleteProject(${p.id})" title="삭제">?</button>
          </div>
        </div>
      </div>`;
    }
  });
  html+=`</div>`;
  wrap.innerHTML=html;
  const sub=document.getElementById('projects-page-sub');
  if(sub) sub.textContent=projects.length?`${projects.length}개의 프로젝트`:'아직 생성한 프로젝트가 없습니다';
}

async function saveProject(input){
  const projectData = {
    id: input.id || Date.now().toString(),
    title: input.title || '무제',
    genre: input.genre,
    platform: input.platform,
    episodes: input.episodes,
    logline: input.logline,
    input: input
  };
  await window.saveProject(projectData);
}

async function loadProjects(){
  return await window.fetchProjects();
}

async function deleteProject(id){
  if(!confirm('이 프로젝트를 삭제할까요?')) return;
  const res = await window.deleteProject(id);
  if(res.success){
    renderProjectCards();
    showToast('삭제되었습니다.', 'success');
  } else {
    showToast('삭제 실패', 'warn');
  }
}

function clearAllProjects(){
  showToast('전체 삭제 기능은 계정 설정에서 이용할 수 있습니다.', 'info');
}
async function openProject(id){
  const list = await window.fetchProjects();
  const p = list.find(x => x.id === id || x.id.toString() === id.toString());
  if(!p) return;
  try{
    currentInput = typeof p.input === 'string' ? JSON.parse(p.input) : p.input;
    applyDemoResult(currentInput);
    aiEpisodes = buildDemoEpisodes(currentInput);
    aiScript = buildDemoScript(currentInput);
  } catch(e) {
    console.error("Open Project Error:", e);
    currentInput = null;
  }
  showPage('result');
}

/* ===================================
   WIZARD
=================================== */
function selectOpt(btn){
  btn.parentElement.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}
function addChar(){
  const builder=document.getElementById('char-builder');
  const idx=charCount++;
  const div=document.createElement('div');
  div.className='char-row';div.id='char-row-'+idx;
  div.innerHTML=`<div class="char-row-header"><span class="char-row-label">인물 ${idx+1}</span>
    <select class="char-role-select" id="char-role-${idx}"><option value="주연">주연</option><option value="여주">여주</option><option value="남주">남주</option><option value="조연" selected>조연</option><option value="악역">악역</option></select>
    <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px" onclick="this.closest('.char-row').remove()">삭제</button></div>
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
function updateStepUI(){
  for(let i=0;i<totalSteps;i++){
    const dot=document.getElementById('sdot-'+i);const label=document.getElementById('slabel-'+i);
    if(!dot)continue;
    dot.classList.remove('active','done');label.classList.remove('active');
    if(i<currentStep){dot.classList.add('done');dot.textContent='?';}
    else if(i===currentStep){dot.classList.add('active');dot.textContent=i+1;label.classList.add('active');}
    else dot.textContent=i+1;
  }
  document.querySelectorAll('.step-panel').forEach((p,i)=>p.classList.toggle('active',i===currentStep));
  document.getElementById('step-counter').textContent=(currentStep+1)+' / '+totalSteps;
  document.getElementById('btn-prev').style.display=currentStep>0?'':'none';
  const isLast=currentStep===totalSteps-1;
  document.getElementById('btn-next').style.display=isLast?'none':'';
  document.getElementById('btn-generate').style.display=isLast?'':'none';
  if(isLast) fillConfirmPage();
}
function nextStep(){if(currentStep<totalSteps-1){currentStep++;updateStepUI();}}
function prevStep(){if(currentStep>0){currentStep--;updateStepUI();}}

function collectWizardInput(){
  const platform=document.querySelector('#grid-platform .option-btn.selected strong')?.textContent||'OTT 오리지널';
  const episodes=parseInt(document.getElementById('slider-ep')?.value)||8;
  const runtime=parseInt(document.getElementById('slider-rt')?.value)||60;
  const gi=document.getElementById('inp-genre-other');
  const genre=(gi?.value.trim())||(document.querySelector('#grid-genre .option-btn.selected strong')?.textContent||'로맨틱 코미디');
  const logline=document.getElementById('inp-logline')?.value.trim()||'';
  // 시대 배경
  const eraYear=parseInt(document.getElementById('slider-era')?.value)||2024;
  const eraCustom=document.getElementById('inp-era-custom')?.value.trim()||'';
  const era=eraCustom||eraYearLabel(eraYear);
  const setting=document.getElementById('inp-setting')?.value.trim()||'';
  const extra=document.getElementById('inp-extra')?.value.trim()||'';
  // 연령대
  const ageMin=parseInt(document.getElementById('age-min')?.value)||20;
  const ageMax=parseInt(document.getElementById('age-max')?.value)||39;
  // 성별
  const gf=document.getElementById('gbtn-f')?.classList.contains('selected');
  const gm=document.getElementById('gbtn-m')?.classList.contains('selected');
  const ga=document.getElementById('gbtn-a')?.classList.contains('selected');
  const gender=ga?'모두':gf&&gm?'모두':gf?'여성':gm?'남성':'모두';
  const target=`${ageMin}~${ageMax}세 ${gender}`;
  // 인물
  const chars=[];
  document.querySelectorAll('.char-row').forEach(row=>{
    const name=row.querySelector('[id^="char-name"]')?.value.trim()||'';
    const age=row.querySelector('[id^="char-age"]')?.value.trim()||'';
    const genderC=row.querySelector('[id^="char-gender"]')?.value.trim()||'';
    const job=row.querySelector('[id^="char-job"]')?.value.trim()||'';
    const personality=row.querySelector('[id^="char-personality"]')?.value.trim()||'';
    const looks=row.querySelector('[id^="char-looks"]')?.value.trim()||'';
    const role=row.querySelector('[id^="char-role"]')?.value||'조연';
    if(name||job) chars.push({role,name,age,gender:genderC,job,personality,looks});
  });
  const title=generateTitle(logline);
  return {platform,episodes,runtime,genre,logline,era,eraYear,target,setting,extra,chars,title};
}
function generateTitle(logline){
  if(!logline)return'무제';
  const m=logline.match(/[가-힣]{2,5}/g);
  if(m&&m.length)return m[0];
  return logline.slice(0,6).trim()||'무제';
}
function fillConfirmPage(){
  const inp=collectWizardInput();
  document.getElementById('confirm-title').textContent=inp.title||'가제 미입력';
  document.getElementById('confirm-logline').textContent=inp.logline||'로그라인을 입력해주세요.';
  document.getElementById('confirm-tags').innerHTML=[inp.platform,inp.genre,inp.episodes+'부작',inp.runtime+'분',inp.era,inp.target].filter(Boolean).map(t=>`<span class="confirm-tag">${t}</span>`).join('');
  document.getElementById('confirm-grid').innerHTML=`
    <div class="confirm-item"><div class="confirm-item-label">플랫폼</div><div class="confirm-item-value">${inp.platform}</div></div>
    <div class="confirm-item"><div class="confirm-item-label">회차 / 분량</div><div class="confirm-item-value">${inp.episodes}부작 / ${inp.runtime}분</div></div>
    <div class="confirm-item"><div class="confirm-item-label">장르</div><div class="confirm-item-value">${inp.genre}</div></div>
    <div class="confirm-item"><div class="confirm-item-label">시대</div><div class="confirm-item-value">${inp.era}</div></div>
    <div class="confirm-item"><div class="confirm-item-label">타겟</div><div class="confirm-item-value">${inp.target}</div></div>
    <div class="confirm-item"><div class="confirm-item-label">주요 배경</div><div class="confirm-item-value">${inp.setting||'미입력'}</div></div>
    ${inp.logline?`<div class="confirm-item" style="grid-column:1/-1"><div class="confirm-item-label">로그라인</div><div class="confirm-item-value">${inp.logline}</div></div>`:''}`;
  // 인물 섹션 ? 자동 생성 여부에 따라 다르게 표시
  const charsWrap = document.getElementById('confirm-chars');
  if(_charAutoFilled){
    // AI 자동 설정 배너 + 인물 카드 (반투명으로 미리보기)
    charsWrap.innerHTML=`
      <div style="grid-column:1/-1;background:linear-gradient(135deg,rgba(201,147,58,.08),rgba(201,147,58,.14));border:1.5px solid var(--gold);border-radius:var(--r2);padding:16px 20px;display:flex;align-items:flex-start;gap:14px;margin-bottom:4px">
        <span style="font-size:24px;flex-shrink:0">?</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--gold);margin-bottom:4px">AI 자동 생성</div>
          <div style="font-size:12px;color:var(--ink2);line-height:1.7">
            등장인물은 <strong>생성 시작 후 AI가 자동으로 설정</strong>합니다.<br>
            로그라인과 장르를 기반으로 이름·직업·성격·외모를 함께 만들어드려요.<br>
            <span style="color:var(--ink3);font-size:11px">미리 설정된 인물: ${inp.chars.map(c=>c.name||'(미입력)').join(', ')}</span>
          </div>
        </div>
      </div>
      ${inp.chars.map(c=>`
        <div class="confirm-char-card" style="opacity:.55;position:relative;overflow:hidden">
          <div style="position:absolute;top:6px;right:6px;font-size:9px;font-weight:700;background:var(--gold);color:#fff;padding:2px 6px;border-radius:4px">AI 자동</div>
          <div class="confirm-char-role">${c.role}</div>
          <div class="confirm-char-name">${c.name||'자동 생성'}</div>
          <div class="confirm-char-detail">${[c.age,c.gender,c.job].filter(Boolean).join(' · ')||'AI가 설정합니다'}</div>
          ${c.personality?`<div class="confirm-char-detail" style="font-style:italic;margin-top:4px">${c.personality}</div>`:''}
        </div>`).join('')}`;
  } else {
    charsWrap.innerHTML=inp.chars.length
      ? inp.chars.map(c=>`
          <div class="confirm-char-card">
            <div class="confirm-char-role">${c.role}</div>
            <div class="confirm-char-name">${c.name||'미입력'}</div>
            <div class="confirm-char-detail">${[c.age,c.gender,c.job].filter(Boolean).join(' · ')}</div>
            ${c.personality?`<div class="confirm-char-detail" style="font-style:italic;margin-top:4px">${c.personality}</div>`:''}
          </div>`).join('')
      : `<div style="grid-column:1/-1;font-size:13px;color:var(--ink3);padding:12px 0">입력된 인물이 없습니다.</div>`;
  }
}

/* ===================================
   GENERATE
=================================== */
/* ===================================
   SYSTEM PROMPTS ? 4단계 분리
=================================== */

// ── 공통 역할 + 대본 원칙 (모든 단계에 공유) ──
const DRAMA_BASE_ROLE = `당신은 드라마 전문 작가이자 제작 전문가입니다. 15년 이상 지상파(KBS·SBS·MBC), 종편/케이블(tvN·JTBC), 글로벌 OTT(넷플릭스·디즈니+)에서 집필·제작 경력을 가진 베테랑으로서 영상 언어, 대본 문법, 제작비 산출, PPL 기획, 배우 캐스팅에 모두 능통합니다.

대본 작성 5대 핵심 원칙:
1. 시각적 서술(Show, Don't Tell): "그는 슬퍼했다" 금지. 행동·표정·소품으로만 감정 표현.
   × "재윤은 마음이 흔들렸다" → ○ "재윤, 들고 있던 펜이 멈춘다. 잠깐. 다시 서류로 시선을 내린다."
2. 대사 경제성 & 서브텍스트: 3줄 이상 독백 금지. 짧고 날카로운 핑퐁. 말과 행동이 모순되게.
   × "나는 사실 당신이 좋아요." → ○ 재윤:(외면하며)"..전기세 나옵니다." 소원:(멈칫, 웃으며)"네."
3. 씬의 기승전결: 씬 진입 감정 ≠ 씬 이탈 감정. 목적 달성 또는 실패가 반드시 있어야 함.
4. 강렬한 엔딩(엔딩 맛집): 정체 발각 직전/충격 폭로/예상 못한 등장 직후 컷. 대화로 해결 금지.
   마지막 씬 직후 반드시 "(화면 정지 / 그대로 엔딩)" 또는 "(화면 암전)"으로 종료.
5. 지문 규칙: 현재 시제. 눈에 보이는 것만. 내면 심리 지문 금지 ? V.O 또는 표정 지시로 처리.

대본 기호: S#(씬넘버) (E)(효과음) (V.O)(내레이션) (O.S)(같은공간외목소리) [INSERT](클로즈업) (F.B)(플래시백) [몽타주]

장르별 톤앤매너:
로맨틱 코미디: 티키타카 핑퐁 대사. 코믹 효과음(E). 오해·엇갈림. 표정 변화 디테일하게.
  예) S# 12. 엘리베이터 / 낮
      태오:(앞만 보며)"아깐 고마웠습니다."
      지안:(건조하게)"입 닦으시라고 드린 휴지 말씀이면 오백 원입니다."
      태오:(황당해)"예?" 지안:"무형광 천연 펄프거든요."
스릴러/범죄: 건조한 지문. 청각 긴장감 극대화. 정보 아끼다 폭발.
  예) S# 34. 폐공장 / 밤
      (E) 빗방울이 양철 지붕 때리는 소리. 진우, 기둥 뒤에 숨어 숨 죽인다.
      (O.S) 뚜벅... 뚜벅... 이마의 땀방울이 턱 끝으로 툭 떨어진다.
      살인마(V.O):"위를 봐야지, 형사님."
사극: 웅장한 배경. 신분별 호칭. 하오체·해요체. 행간의 정치적 의미.
막장/일일극: 빠른 전개. 과장된 감정. 엿듣는 씬. 뺨 때리기·충격 액션.

금지 사항:
- 소설식 만연체 묘사 절대 금지
- 영상 불가 내면 심리 지문 금지
- S# 없이 줄글 전개 금지
- 대사 앞 인물 이름 생략 금지
- 3줄 이상 설명형 독백 금지
- 모든 금액은 만원 단위 숫자 문자열로만 표기 (예: "15000")
- 브랜드명 직접 명시 금지 (계약 전이므로 "OO 브랜드 유형"으로 표기)
- 실존하지 않는 배우명 사용 금지`;

// ── 1단계: 기획·줄거리 프롬프트 ──
const PROMPT_PLAN = DRAMA_BASE_ROLE + `

======================
 1단계: 기획·줄거리 생성
======================
아래 JSON 스키마만 순수하게 반환. 마크다운·설명 일절 없이.

{
  "title": "드라마 가제",
  "logline": "한 줄 로그라인 ? 주인공·핵심갈등·결말 암시 포함",
  "synopsis": "전체 줄거리 500자 내외. 발단→전개→위기→절정→결말 구조. 핵심 반전 포함.",
  "visual": {
    "colorTone": "드라마 전체 색감 방향 (예: 따뜻한 골든아워 / 차갑고 청회색)",
    "shootingStyle": "촬영 스타일 (예: 핸드헬드 카메라 / 고정 컷 위주 / 드론 와이드)",
    "killingPoint": "이 드라마만의 시각적 킬링 포인트 한 줄"
  },
  "conflicts": [
    {"color":"red",  "label":"핵심 갈등 ? 제목", "desc":"구체적 설명 2문장. 어떤 사건으로 촉발되는지 포함."},
    {"color":"gold", "label":"과거 악연 ? 제목", "desc":"구체적 설명 2문장. 두 인물이 어떻게 얽혀있는지."},
    {"color":"teal", "label":"감정 갈등 ? 제목", "desc":"구체적 설명 2문장. 삼각관계 또는 내면 갈등."},
    {"color":"ink",  "label":"외부 압박 ? 제목", "desc":"구체적 설명 2문장. 외부에서 오는 위협·압박."}
  ],
  "episodes": [
    {
      "num": 1,
      "title": "화 제목 ? 이 화의 핵심 감정이나 사건을 함축",
      "logline": "이 화 한 줄 요약 ? 시청자가 왜 이 화를 봐야 하는지",
      "story": "줄거리 200자 이상. 씬별로 어떤 일이 일어나는지 구체적으로. 단순 요약 금지 ? 감정 변화·대사 포인트·반전 포함.",
      "keyScene": "이 화의 가장 중요한 씬 묘사 ? 어떤 장소에서 어떤 두 인물이 무슨 일로 어떻게 충돌하는지 3문장",
      "ending": "엔딩 컷 묘사 50자 내외. 정확히 어떤 장면에서 화면이 멈추는지. (예: 재윤이 소원의 손을 잡으려다 멈추는 순간 ? 암전)",
      "scenes": [
        {"num":"S#1", "loc":"장소 / 시간", "chars":["등장인물1","등장인물2"], "desc":"씬 목적 + 주요 사건 + 감정 변화를 2~3문장으로. 단순 장소 설명 금지."},
        {"num":"S#2", "loc":"장소 / 시간", "chars":["등장인물1"], "desc":"씬 목적 + 주요 사건 + 감정 변화 2~3문장"},
        {"num":"S#3", "loc":"장소 / 시간", "chars":["등장인물1","등장인물2"], "desc":"씬 목적 + 주요 사건 + 감정 변화 2~3문장"},
        {"num":"S#4", "loc":"장소 / 시간", "chars":["등장인물1","등장인물2"], "desc":"씬 목적 + 주요 사건 + 감정 변화 2~3문장"},
        {"num":"S#5", "loc":"장소 / 시간", "chars":["등장인물1","등장인물2"], "desc":"씬 목적 + 주요 사건 + 감정 변화 2~3문장"},
        {"num":"S#6", "loc":"장소 / 시간", "chars":["등장인물1","등장인물2"], "desc":"씬 목적 + 주요 사건 + 감정 변화 2~3문장"},
        {"num":"S#7", "loc":"장소 / 시간", "chars":["등장인물1","등장인물2"], "desc":"씬 목적 + 주요 사건 + 감정 변화 2~3문장"},
        {"num":"S#8", "loc":"장소 / 시간", "chars":["등장인물1","등장인물2"], "desc":"씬 목적 + 주요 사건 + 감정 변화 2~3문장. 엔딩 씬이면 (엔딩) 표시."}
      ]
    }
  ],
  "similar": {
    "refs": [
      {"title":"드라마명","year":2023,"eps":16,"platform":"tvN","genre":"장르","rating":"24.9","budget":"300억","budgetNum":300,"tags":["소재1","소재2","소재3"]}
    ],
    "diff": {
      "plus": [
        {"title":"차별화 강점 제목", "desc":"구체적 설명 2문장. 레퍼런스 대비 무엇이 새로운지."},
        {"title":"차별화 강점 제목", "desc":"구체적 설명 2문장."}
      ],
      "minus": [
        {"title":"보완 필요 항목", "desc":"구체적 설명 2문장. 솔직하게."},
        {"title":"보완 필요 항목", "desc":"구체적 설명 2문장."}
      ]
    }
  }
}

작성 기준:
- episodes: 입력된 회차 수 전부. 갈등이 회차마다 심화되는 구조.
- episodes[].scenes: 화당 8개씩. 각 씬의 desc는 반드시 2~3문장 이상. "~하는 씬" 같은 단순 요약 금지.
- similar.refs: 유사한 실제 한국 드라마 6편. 제목·연도·시청률 정확하게.`;

// ── 2단계: 캐스팅·제작비·장소 프롬프트 ──
const PROMPT_PRODUCTION = DRAMA_BASE_ROLE + `

======================
 2단계: 캐스팅·제작비·장소 생성
======================
아래 JSON 스키마만 순수하게 반환. 마크다운·설명 일절 없이.

{
  "cast": [
    {
      "charName": "캐릭터 이름 (역할)",
      "role": "주연 여주 | 주연 남주 | 조연 | 특별출연",
      "age": "캐릭터 나이",
      "job": "직업",
      "personality": "성격·결핍 한 줄",
      "actors": [
        {
          "name": "배우 이름",
          "age": "나이",
          "reason": "역할 적합 이유 ? 이미지·연기 스타일·최근 이미지 구체적으로",
          "recentWork": "최근 대표작 (연도 포함)",
          "feePerEp": "회당 출연료 만원 단위 숫자",
          "rank": 1,
          "tier": "티어1(3000만원+) | 티어2(1500~3000만원) | 티어3(500~1500만원)"
        },
        {"name":"2순위","age":"나이","reason":"이유","recentWork":"대표작","feePerEp":"숫자","rank":2,"tier":"티어"},
        {"name":"3순위","age":"나이","reason":"이유","recentWork":"대표작","feePerEp":"숫자","rank":3,"tier":"티어"}
      ]
    }
  ],
  "locations": [
    {
      "name": "장소명",
      "type": "세트 | 실외 로케이션 | 실내 로케이션",
      "desc": "드라마에서의 역할·분위기·주요 씬 설명 2문장",
      "mood": "이 공간의 비주얼 무드 한 줄 (예: 낡고 따뜻한 골목 감성)",
      "episodes": "주로 등장하는 회차",
      "buildCost": "세트 제작비 만원 단위 숫자 (로케이션이면 0)",
      "rentCost": "회당 대관료 만원 단위 숫자 (세트이면 0)"
    }
  ],
  "stats": {
    "budget": "총 제작비 억 단위 (예: 127.5억)",
    "budgetRaw": "총 제작비 만원 단위 숫자",
    "avgEpBudget": "회당 평균 억 단위 (예: 15.9억)",
    "avgEpRaw": "회당 평균 만원 단위 숫자",
    "ppl": "PPL 예상 수익 억 단위 (예: 6.5억)",
    "pplRaw": "PPL 수익 만원 단위 숫자",
    "netBudget": "PPL 차감 순 제작비 억 단위",
    "netRaw": "순 제작비 만원 단위 숫자",
    "scenes": "총 씬 수 (예: 200씬)",
    "vfxRatio": "VFX 비중 % (예: 12%)"
  },
  "budgetBreakdown": [
    {
      "ep": 1,
      "items": {
        "로케이션·세트": "만원 단위 숫자",
        "출연료": "만원 단위 숫자",
        "스태프 인건비": "만원 단위 숫자",
        "촬영 장비": "만원 단위 숫자",
        "미술·소품": "만원 단위 숫자",
        "의상·분장": "만원 단위 숫자",
        "VFX": "만원 단위 숫자",
        "음악·효과음": "만원 단위 숫자",
        "후반 작업": "만원 단위 숫자",
        "기타": "만원 단위 숫자"
      },
      "vfxDetail": "VFX 주요 작업 내용 한 줄"
    }
  ]
}

배우 추천 기준:
- 역할 적합성: 캐릭터 나이·성격·이미지와 배우의 실제 이미지가 일치하는지
- 플랫폼 궁합: OTT→영화적 연기력+글로벌 인지도. 지상파→대중 친숙도.
- 티어별 출연료(2024~2025년 기준): 티어1 3000만원+, 티어2 1500~3000만원, 티어3 500~1500만원, 조연 300~800만원
- 케미: 주연 2인의 이미지 대비가 드라마 갈등 구조와 맞는지

제작비 산출 기준:
- OTT 8부작: 총 100~200억 / OTT 16부작: 200~400억 / 지상파 16부작: 80~180억
- 사극: 세트·의상 비중 40~60% / SF·크리처: VFX 30~50%
- 1화·클라이맥스화·최종화는 평균 대비 높게 산출
- budgetBreakdown은 입력된 회차 수 전부 작성`;

// ── 3단계: PPL 프롬프트 ──
const PROMPT_PPL = DRAMA_BASE_ROLE + `

======================
 3단계: PPL 기획 생성
======================
아래 JSON 스키마만 순수하게 반환. 마크다운·설명 일절 없이.

{
  "ppl": [
    {
      "id": 1,
      "industry": "산업군",
      "badge": "t-green",
      "brand": "브랜드 유형 및 제품 설명 (실제 브랜드명 금지 ? 유형으로 표기)",
      "scene": "S#번호. 장소 / 시간",
      "sceneDesc": "씬 내 자연스러운 노출 방식 상세 설명. 인물 행동과 연결. 감정 연동형으로 기술.",
      "eps": "노출 회차 (예: 3화·5화·7화)",
      "freq": "노출 빈도·방식 (예: 회당 2회 자연 노출)",
      "price": "예상 협찬 수익 (예: 8,000만원)",
      "priceRaw": "수익 만원 단위 숫자",
      "effect": "기대 효과 한 줄 ? 어떤 타깃에게 어떤 브랜드 이미지가 형성되는지",
      "difficulty": "하 | 중 | 상",
      "difficultyDesc": "난이도 이유 한 줄 (상이면 씬 구조 변경 필요 등)"
    }
  ]
}

PPL 기획 3원칙:
1. 감정 연동형 노출: 인물의 감정 상태와 PPL을 연결. 슬플 때 마시는 음료, 야근 중 먹는 편의점 음식처럼 브랜드가 감정의 소품이 될 때 시청자 기억에 남는다.
   × 갑자기 로고 줌인 × 대사로 브랜드 설명
   ○ 재헌, 서영 책상에 말없이 참치마요 샌드위치를 놓는다. 포장지 로고 자연스럽게 보임.
2. 인물 시그니처화: 특정 PPL을 인물의 습관으로 만들면 회차 내내 반복 노출 가능. 팬덤이 브랜드와 인물을 동일시.
3. 씬 기능 활용: PPL이 씬의 도구로 기능해야 함. 핀테크 앱→계약서 확인 씬. 스포츠카→추격씬. 가전→주인공 공간 배경.

난이도 정의:
하: 배경 소품·음료·간식류. 씬 구조 변경 없이 삽입 가능.
중: 대사·행동 일부 수정 필요. 인물이 제품을 사용하거나 언급.
상: 씬 자체를 PPL 중심으로 설계해야 함. 플롯과 연동.

수익 기준 (2024년):
OTT 8부작 총 PPL 수익 6~15억 / 지상파 16부작 5~20억
주연 시그니처 PPL은 일반 대비 2~3배 단가 프리미엄
badge 규칙: 식음료→t-green, 가전·인테리어→t-purple, 뷰티·패션→t-pink, 자동차→t-blue, IT·통신→t-amber, 금융·보험→t-gray
최소 8개. 다양한 산업군. 각 PPL의 scene은 전달받은 씬 목록과 연결.`;

// ── 4단계: 대본 생성 프롬프트 ──
const PROMPT_SCRIPT = DRAMA_BASE_ROLE + `

======================
 4단계: 대본 생성
======================
아래 JSON 스키마만 순수하게 반환. 마크다운·설명 일절 없이.

{
  "script": [
    {
      "heading": "S# 1. 장소 / 시간",
      "lines": [
        {"type":"action",    "text":"지문 ? 현재 시제, 카메라에 보이는 것만. 간결하게 끊어서."},
        {"type":"dialog",    "char":"인물명", "paren":"행동 지시 짧게", "line":"대사 ? 서브텍스트 포함"},
        {"type":"direction", "text":"(E) 효과음 / (V.O) 나레이션 / [INSERT] 클로즈업"}
      ]
    }
  ]
}

대본 생성 규칙:
- 전달받은 씬 목록(scenes)의 순서와 내용을 반드시 준수. 임의로 씬 추가·삭제·변경 금지.
- 각 씬 최소 15줄 이상. 오프닝 씬은 20줄 이상.
- 티키타카 대사, 효과음(E), 서브텍스트, [INSERT] 반드시 포함.
- 엔딩 씬 마지막에 반드시 "(화면 정지 / 그대로 엔딩)" 또는 "(화면 암전)" 추가.
- 인물의 결핍과 욕망이 대사와 행동에 드러나야 함.
- 매 씬마다 들어올 때와 나갈 때의 감정이 달라야 함.`;

/* ===================================
   API 헬퍼 & 4단계 분리 호출
=================================== */
async function _callAPI(type, systemPrompt, userPrompt, maxTokens){
  updateApiStatus('Claude와 교신 중...', type === 'script' ? '대본 집필 중' : '기계안/제작비 산출 중');
  const promptData = { systemPrompt, userPrompt, maxTokens };
  try {
    const data = await window.callBackendAI(type, promptData);
    if (!data) throw new Error('백엔드 연동 실패');
    updateApiStatus('데이터 수신 완료', '처리 중...');
    return data;
  } catch (e) {
    updateApiStatus('교신 오류 발생', '재시도 중...');
    throw e;
  }
}

function updateApiStatus(text, step){
  const banner = document.getElementById('api-status-banner');
  const textEl = document.getElementById('api-status-text');
  const stepEl = document.getElementById('api-status-step');
  if(banner) banner.style.display = 'flex';
  if(textEl) textEl.textContent = text;
  if(stepEl) stepEl.textContent = step;
}

function _buildBaseContext(input){
  const charLines=(input.chars||[]).length>0
    ? input.chars.map(c=>`  [${c.role||'조연'}] ${c.name||'이름미입력'} | 나이:${c.age||'?'}/성별:${c.gender||'?'}/직업:${c.job||'?'} | 성격:${c.personality||'?'}/외모:${c.looks||'?'}`).join('\n')
    : '  AI가 로그라인 기반으로 자동 설계';
  return [
    `플랫폼:${input.platform||'OTT 오리지널'} / 장르:${input.genre||'로맨틱 코미디'} / 회차:${input.episodes||8}부작 / 회당:${input.runtime||60}분 / 시대:${input.era||'현대'}`,
    `주요배경:${input.setting||'서울'} / 타겟:${input.target||'2030 여성'}`,
    `로그라인:${input.logline||''}`,
    `등장인물:\n${charLines}`,
    `추가설정:${input.extra||'없음'}`
  ].join('\n');
}

async function callAPI_Plan(input){
  const prompt=`${_buildBaseContext(input)}

위 설정으로 드라마 기획서와 전체 ${input.episodes||8}화 줄거리를 생성해주세요.
각 화의 scenes는 8개씩, 각 씬의 desc는 반드시 2~3문장 이상 구체적으로.
similar.refs는 실제 유사 한국 드라마 6편.
순수 JSON만 반환.`;
  return await _callAPI('plan', PROMPT_PLAN, prompt, 12000);
}

async function callAPI_Production(input){
  const prompt=`${_buildBaseContext(input)}

위 드라마의 캐스팅 추천, 촬영 장소, 회차별 제작비를 생성해주세요.
budgetBreakdown은 ${input.episodes||8}화 전부 작성.
배우 추천은 역할 적합성·플랫폼 궁합·2024~2025년 실제 시장 출연료 반영.
순수 JSON만 반환.`;
  return await _callAPI('prod', PROMPT_PRODUCTION, prompt, 8000);
}

async function callAPI_PPL(input, planData){
  const sceneList=planData?.episodes?.[0]?.scenes
    ? planData.episodes[0].scenes.map(s=>`${s.num} ${s.loc} ? ${(s.desc||'').slice(0,60)}`).join('\n'):'';
  const prompt=`${_buildBaseContext(input)}

로그라인:${input.logline||''}
주요 씬 목록(1화):
${sceneList}

위 드라마에 자연스럽게 녹아드는 PPL 기획안 8개 이상 생성.
각 PPL의 scene은 위 씬 목록과 연결.
순수 JSON만 반환.`;
  return await _callAPI('ppl', PROMPT_PPL, prompt, 4000);
}

async function callAPI_Script(input, planData, epIdx){
  const ep=planData?.episodes?.[epIdx];
  if(!ep) throw new Error('에피소드 데이터 없음');
  const charLines=(input.chars||[]).map(c=>`${c.name||'?'}(${c.role||'?'}, ${c.job||'?'}, ${c.personality||'?'})`).join(' / ');
  let prevCtx='';
  if(epIdx>0){
    const prev=planData.episodes[epIdx-1];
    prevCtx=`
이전화(${epIdx}화) 엔딩:"${prev?.ending||''}"
위 엔딩 감정에서 자연스럽게 이어질 것.`;
  }
  const scenesDetail=ep.scenes.map(s=>`${s.num||''} | ${s.loc||''} | 등장:${(s.chars||[]).join('·')} | ${s.desc||''}`).join('\n');
  const prompt=`제목:${planData?.title||input.title||'?'} / 장르:${input.genre||'?'} / 플랫폼:${input.platform||'?'}
등장인물:${charLines}${prevCtx}

━━━ ${epIdx+1}화 고정 컨텍스트 ━━━
제목:${ep.title}
로그라인:${ep.logline||''}
줄거리:${ep.story}
핵심씬:${ep.keyScene||''}
엔딩컷(반드시 구현):${ep.ending}

씬 목록(순서·내용 변경 금지):
${scenesDetail}

각 씬 최소 15줄 이상. 오프닝 20줄 이상.
엔딩씬 마지막에 "(화면 암전)" 추가.
순수 JSON만 반환.`;
  return await _callAPI('script', PROMPT_SCRIPT, prompt, 16000);
}

/* 대본 저장소 ? 화차별 */
window._scripts = window._scripts || {};

/* N화 대본 가져오기 (없으면 null) */
function getScript(epIdx){ return window._scripts[epIdx]||null; }

/* N화 대본 생성 (버튼 클릭 시) */
async function generateScriptForEp(epIdx){
  const planData = window._planData;
  if(!planData) return showToast('기획 데이터가 없습니다.','warn','??');
  const btn = document.getElementById('btn-gen-script-'+epIdx);
  if(btn){ btn.disabled=true; btn.textContent='생성 중...'; }
  try{
    const result = await callAPI_Script(currentInput, planData, epIdx);
    if(result?.script?.length){
      window._scripts[epIdx] = result.script;
      aiScript = result.script;
      currentEpIdx = epIdx;
      renderSceneRow();
      renderSceneDetail(0);
      showToast(`${epIdx+1}화 대본 생성 완료!`,'success','?',2500);
      // 버튼 교체
      if(btn){ btn.textContent='재생성'; btn.disabled=false; }
      // 사이드바 업데이트
      updateScriptSidebar();
    }
  } catch(e){
    showToast(`대본 생성 오류: ${e.message}`,'warn','??',5000);
    if(btn){ btn.textContent='다시 시도'; btn.disabled=false; }
  }
}

function updateScriptSidebar(){
  const se=document.getElementById('sidebar-script-eps');
  if(!se||!aiEpisodes) return;
  se.innerHTML=aiEpisodes.map((_,i)=>{
    const hasScript = !!window._scripts[i];
    return `<button class="sidebar-item ${currentEpIdx===i?'active':''}" onclick="showScriptEp(${i})">
      <div class="sidebar-dot"></div>
      ${i+1}화 ? ${aiEpisodes[i]?.title?.slice(0,8)||''}
      ${hasScript?'<span style="font-size:9px;color:var(--teal);margin-left:4px">?</span>':'<span style="font-size:9px;color:var(--ink3);margin-left:4px">미생성</span>'}
    </button>`;
  }).join('');
}

/* ===================================
   API 결과 → 각 패널 반영
=================================== */
/* 1단계 결과 반영 ? 기획·줄거리 */
function applyPlanResult(data, input){
  const epCount=parseInt(input.episodes)||8;
  const runtime=input.runtime||60;
  const platform=input.platform||'OTT 오리지널';
  const genre=input.genre||'로맨틱 코미디';
  const title=data.title||input.title||'무제';
  currentInput.title=title;

  document.getElementById('result-hero-title-el').textContent=title;
  document.getElementById('result-logline').textContent=data.logline||'';
  document.getElementById('result-badge').innerHTML=`? ${platform} · ${genre} · ${epCount}부작`;
  document.getElementById('result-tags').innerHTML=
    `<span class="result-hero-tag">회당 ${runtime}분</span>
     <span class="result-hero-tag">총 제작비 ${bL(epCount)}</span>
     <span class="result-hero-tag">PPL ${pL(epCount)}</span>`;
  document.getElementById('sidebar-title-label').textContent=title;
  document.getElementById('sidebar-meta').innerHTML=
    `<span class="meta-tag">${platform}</span><span class="meta-tag">${genre}</span><span class="meta-tag">${epCount}부작</span>`;
  document.getElementById('stat-budget').textContent=bL(epCount);
  document.getElementById('stat-scenes').textContent=epCount*25+'씬';
  document.getElementById('stat-ppl').textContent=pL(epCount);

  document.getElementById('ov-budget').innerHTML=bL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-avg').innerHTML=aL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-ppl').innerHTML=pL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-net').innerHTML=nL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-logline').textContent=data.logline||'';
  document.getElementById('ov-story').textContent=data.synopsis||'';

  if(data.conflicts?.length){
    document.getElementById('ov-conflicts').innerHTML=data.conflicts.map(c=>`
      <div class="conflict-card ${c.color}">
        <div class="conflict-label" style="color:var(--${c.color==='ink'?'ink2':c.color})">${c.label}</div>
        <div class="conflict-desc">${c.desc}</div>
      </div>`).join('');
  }
  if(data.similar) window._apiSimilar=data.similar;

  // 회차 데이터 저장 (scenes 필드가 새 포맷이므로 변환)
  aiEpisodes=(data.episodes||[]).map(ep=>({
    ...ep,
    scenes:(ep.scenes||[]).map(s=>[s.num||'S#?', s.loc||'장소미상', s.desc||''])
  }));
  if(!aiEpisodes.length) aiEpisodes=buildDemoEpisodes(input);

  updateScriptSidebar();
}

/* 2단계 결과 반영 ? 캐스팅·제작비 */
function applyProductionResult(data, input){
  const epCount=parseInt(input.episodes)||8;

  // 스탯 업데이트
  if(data.stats){
    document.getElementById('stat-budget').textContent=data.stats.budget||bL(epCount);
    document.getElementById('stat-scenes').textContent=data.stats.scenes||(epCount*25+'씬');
    document.getElementById('stat-ppl').textContent=data.stats.ppl||pL(epCount);
    document.getElementById('ov-budget').innerHTML=(data.stats.budget||bL(epCount))+'<span class="info-card-unit"> 원</span>';
    document.getElementById('ov-avg').innerHTML=(data.stats.avgEpBudget||aL(epCount))+'<span class="info-card-unit"> 원</span>';
    document.getElementById('ov-ppl').innerHTML=(data.stats.ppl||pL(epCount))+'<span class="info-card-unit"> 원</span>';
    document.getElementById('ov-net').innerHTML=(data.stats.netBudget||nL(epCount))+'<span class="info-card-unit"> 원</span>';
    const heroTags=document.getElementById('result-tags');
    if(heroTags) heroTags.innerHTML=
      `<span class="result-hero-tag">회당 ${input.runtime||60}분</span>
       <span class="result-hero-tag">총 제작비 ${data.stats.budget||bL(epCount)}</span>
       <span class="result-hero-tag">PPL ${data.stats.ppl||pL(epCount)}</span>`;
    // 통합 planData에 stats 추가
    if(window._planData) window._planData.stats=data.stats;
  }

  // 캐스팅
  if(data.cast?.length){
    data.cast.forEach((c,i)=>{
      if(!castData[i]) castData.push({name:'',role:'',av:'av-g',init:'?',desc:'',actors:[]});
      castData[i].name=c.charName||castData[i].name;
      castData[i].role=c.role||castData[i].role;
      castData[i].desc=c.personality||c.job||castData[i].desc;
      castData[i].init=(c.charName||'?')[0];
      castData[i].actors=(c.actors||[]).map(a=>({
        name:a.name,
        detail:`${a.age} · ${a.recentWork||''} · ${a.reason||''}${a.tier?' ['+a.tier+']':''}`,
        fee:`회당 ${parseInt(a.feePerEp||0).toLocaleString()}만원`,
        img:`https://images.unsplash.com/photo-${1500000000000+Math.floor(Math.random()*200000000)}?w=200&h=200&fit=crop&crop=face`
      }));
    });
    buildCharCards();
  }

  // 장소
  if(data.locations?.length){
    const locEl=document.getElementById('ov-story');
    if(locEl){
      const existing=locEl.parentElement.querySelector('.locations-section');
      if(existing) existing.remove();
      const locHtml=`<div class="locations-section" style="margin-top:16px;padding-top:16px;border-top:0.5px solid var(--border)">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ink3);margin-bottom:10px">주요 촬영 장소</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${data.locations.map(l=>`
            <div style="background:var(--paper2);border-radius:var(--r);padding:10px 14px;border:0.5px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
                <span style="font-size:13px;font-weight:600">${l.name}</span>
                <span style="font-size:10px;color:var(--ink3);background:var(--paper3);padding:2px 8px;border-radius:4px">${l.type||''}</span>
              </div>
              <div style="font-size:12px;color:var(--ink3);line-height:1.6">${l.desc||''}</div>
              ${l.mood?`<div style="font-size:11px;color:var(--ink3);font-style:italic;margin-top:2px">${l.mood}</div>`:''}
              ${(l.buildCost&&l.buildCost!='0')?`<div style="font-size:11px;color:var(--gold);margin-top:4px">세트 제작비: ${parseInt(l.buildCost).toLocaleString()}만원</div>`:''}
              ${(l.rentCost&&l.rentCost!='0')?`<div style="font-size:11px;color:var(--teal);margin-top:4px">대관료: 회당 ${parseInt(l.rentCost).toLocaleString()}만원</div>`:''}
            </div>`).join('')}
        </div>
      </div>`;
      locEl.insertAdjacentHTML('afterend', locHtml);
    }
  }

  // 예산
  if(data.budgetBreakdown?.length){
    window._apiBudgetBreakdown=data.budgetBreakdown;
    applyApiBudget(data.budgetBreakdown, epCount, data.stats);
  }
}

/* 하위 호환: 기존 applyApiResult (샘플 등에서 사용) */
function applyApiResult(data, input){
  applyPlanResult(data, input);
  applyProductionResult(data, input);
  if(data.ppl?.length){ window._apiPplData=data.ppl; buildPplPanel(data.ppl); }
  else { window._apiPplData=null; buildPplPanel(); }
  const epCount=parseInt(input.episodes)||8;
  document.getElementById('ppl-total-val').textContent=data.stats?.ppl||pL(epCount);
  if(data.script?.length){ window._scripts[0]=data.script; aiScript=data.script; }
  else aiScript=buildDemoScript(input,0);
  updateScriptSidebar();
}



/* API 예산 데이터로 예산 패널 교체 */
function applyApiBudget(breakdown, epCount, stats){
  // 요약 카드
  if(stats){
    const tv = parseInt(stats.budgetRaw||0);
    const av = parseInt(stats.avgEpRaw||0);
    document.getElementById('budget-sum-wrap').innerHTML=`
      <div class="bcard"><div class="bcard-label">총 제작비</div><div class="bcard-value">${stats.budget||bL(epCount)}</div><div class="bcard-unit">${tv?tv.toLocaleString()+'만원':''}</div></div>
      <div class="bcard"><div class="bcard-label">회당 평균</div><div class="bcard-value">${stats.avgEpBudget||aL(epCount)}</div><div class="bcard-unit">${av?av.toLocaleString()+'만원':''}</div></div>
      <div class="bcard"><div class="bcard-label">PPL 수익</div><div class="bcard-value">${stats.ppl||pL(epCount)}</div><div class="bcard-unit">차감 가능</div></div>
      <div class="bcard"><div class="bcard-label">순 제작비</div><div class="bcard-value">${stats.netBudget||nL(epCount)}</div><div class="bcard-unit">PPL 차감 후</div></div>`;
  }
  // 바 차트
  const bars = document.getElementById('ep-bars-r'); if(!bars) return;
  const tots = breakdown.map(ep=>{
    const items = ep.items||{};
    const sub = Object.values(items).reduce((s,v)=>s+parseInt(v||0),0);
    return sub + Math.round(sub*0.1);
  });
  const max = Math.max(...tots,1);
  bars.innerHTML = tots.map((v,i)=>`
    <div class="ep-bar-row-r">
      <span class="ep-bar-label-r">${i+1}화</span>
      <div class="ep-bar-track-r"><div class="ep-bar-fill-r" style="width:${Math.round(v/max*100)}%">${v.toLocaleString()}만원</div></div>
      <span class="ep-bar-val-r">${(v/10000).toFixed(2)}억</span>
    </div>`).join('');
  // 탭
  const tl=['전체',...breakdown.map(ep=>`${ep.ep}화`)];
  document.getElementById('btabs').innerHTML=tl.map((l,i)=>`<button class="btab ${i===0?'active':''}" onclick="switchApiBTab(${i})">${l}</button>`).join('');
  switchApiBTab(0);
  window._apiBudgetBreakdown = breakdown;
}
function switchApiBTab(idx){
  document.querySelectorAll('.btab').forEach((t,i)=>t.classList.toggle('active',i===idx));
  const wrap=document.getElementById('btable-wrap');
  const bd=window._apiBudgetBreakdown;
  if(!bd) return switchBTab(idx);
  const labels=Object.keys(bd[0]?.items||{});
  if(idx===0){
    // 전체 평균
    const avgs=labels.map(k=>Math.round(bd.reduce((s,ep)=>s+parseInt(ep.items?.[k]||0),0)/bd.length));
    const sub=avgs.reduce((a,b)=>a+b,0); const res=Math.round(sub*.1);
    wrap.innerHTML=`<table class="btable"><thead><tr><th>항목</th><th style="text-align:right">회당 평균</th></tr></thead><tbody>
      ${avgs.map((v,i)=>`<tr><td>${labels[i]}</td><td style="text-align:right">${v.toLocaleString()}만원</td></tr>`).join('')}
      <tr><td style="color:var(--ink3)">예비비 10%</td><td style="text-align:right">${res.toLocaleString()}만원</td></tr>
      <tr class="tr-total"><td>합계</td><td style="text-align:right;color:var(--gold)">${(sub+res).toLocaleString()}만원</td></tr>
    </tbody></table>`;
    return;
  }
  const ep=bd[idx-1]; if(!ep) return;
  const items=ep.items||{};
  const sub=Object.values(items).reduce((s,v)=>s+parseInt(v||0),0); const res=Math.round(sub*.1);
  wrap.innerHTML=`<table class="btable"><thead><tr><th>항목</th><th style="text-align:right">금액</th></tr></thead><tbody>
    ${Object.entries(items).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right">${parseInt(v).toLocaleString()}만원</td></tr>`).join('')}
    ${ep.vfxDetail?`<tr><td colspan="2" style="font-size:11px;color:var(--ink3);padding-top:4px">VFX: ${ep.vfxDetail}</td></tr>`:''}
    <tr><td style="color:var(--ink3)">예비비 10%</td><td style="text-align:right">${res.toLocaleString()}만원</td></tr>
    <tr class="tr-total"><td>${idx}화 합계 <span class="verify-badge">AI 산출</span></td><td style="text-align:right;color:var(--gold)">${(sub+res).toLocaleString()}만원</td></tr>
  </tbody></table>`;
}

/* ===================================
   GENERATE ? API 호출 + 폴백
=================================== */
async function _startGenerateOriginal(){
  currentInput = collectWizardInput();
  if(typeof addDebugLog==='function') addDebugLog("데이터 수집 완료, 프로젝트 저장 시도 중...", "info");
  window._planData = null;
  window._scripts = {};

  const steps_ = [
    {key:'plan',   label:'기획안 · 줄거리 생성', pct:20},
    {key:'prod',   label:'캐스팅 · 제작비 산출', pct:45},
    {key:'ppl',    label:'PPL 제안서 기획',       pct:65},
    {key:'script', label:'1화 대본 집필',         pct:90},
  ];

  // 1. 프로젝트 초기 저장 (상태: 생성 중)
  const initialProject = {
    title: currentInput.title || '생성 중...',
    genre: currentInput.genre,
    platform: currentInput.platform,
    episodes: currentInput.episodes,
    logline: currentInput.logline,
    input: currentInput,
    status: 'generating',
    pct: 5,
    stepIdx: 0
  };

  const saveRes = await window.saveProject(initialProject);
  if(typeof addDebugLog==='function') addDebugLog("프로젝트 저장 결과: " + (saveRes.success ? "성공 (ID:"+saveRes.id+")" : "실패"), saveRes.success?"success":"error");
  if(!saveRes.success){
    showToast('프로젝트 생성 실패: ' + saveRes.error, 'warn');
    return;
  }
  
  const genId = saveRes.id;
  window._generatingId = genId;
  
  // 생성 즉시 결과 페이지(대시보드)로 이동하여 진행 상황 표시
  showPage('result');
  updateApiStatus('생성을 시작합니다...', '준비 중');

  async function updateCard(pct, stepIdx){
    const card=document.getElementById('gen-card-'+genId);
    if(card){
      const fill=card.querySelector('.pcg-bar-fill');
      const pctEl=card.querySelector('.pcg-progress-pct');
      const txt=card.querySelector('.pcg-progress-text');
      if(fill) fill.style.width=pct+'%';
      if(pctEl) pctEl.textContent=Math.round(pct)+'%';
      if(txt&&steps_[stepIdx]) txt.textContent=steps_[stepIdx].label+' 중...';
      card.querySelectorAll('.pcg-step').forEach((el,j)=>{
        el.classList.remove('active','done');
        if(j<stepIdx) el.classList.add('done');
        if(j===stepIdx) el.classList.add('active');
      });
    }
    // 백엔드 상태 업데이트
    await window.saveProject({
      id: genId,
      pct: pct,
      stepIdx: stepIdx,
      status: 'generating'
    });
  }

  async function finishGenerate(isError, errMsg){
    const card=document.getElementById('gen-card-'+genId);
    if(card){
      const fill=card.querySelector('.pcg-bar-fill');
      const pctEl=card.querySelector('.pcg-progress-pct');
      const txt=card.querySelector('.pcg-progress-text');
      if(fill) fill.style.width='100%';
      if(pctEl) pctEl.textContent='100%';
      if(txt) txt.textContent=isError?'생성 중단 (오류)':'생성 완료!';
      card.querySelectorAll('.pcg-step').forEach(el=>{el.classList.remove('active');el.classList.add('done');});
    }
    
    // 최종 결과 저장
    await window.saveProject({
      id: genId,
      title: currentInput.title || initialProject.title,
      status: isError ? 'error' : 'done',
      pct: 100,
      input: currentInput
    });


    setTimeout(()=>{
      renderProjectCards(); 
      const banner = document.getElementById('api-status-banner');
      if(banner) banner.style.display = 'none';
      showPage('result');
    }, 800);
  }

  // 백엔드 AI 모드 (항상 활성화, 인증 여부는 백엔드에서 체크)
  const token = localStorage.getItem('ds_auth_token');
  if(!token && !isGuestMode){
    showToast('로그인이 필요합니다.', 'warn');
    showLoginModal();
    return;
  }

  // API 모드 ? 4단계 순차 실행
  (async()=>{
    const timeout = (ms)=>new Promise((_,rej)=>setTimeout(()=>rej(new Error('응답 시간 초과')),ms));
    try{
      // 1단계: 기획·줄거리
      addDebugLog('--- 1단계: 기획 및 줄거리 생성 시작 ---', 'info');
      updateCard(5,0);
      const planData = await Promise.race([callAPI_Plan(currentInput), timeout(60000)]);
      addDebugLog('1단계 데이터 수신 완료', 'info');
      window._planData = planData;
      currentInput.title = planData.title || currentInput.title;
      applyPlanResult(planData, currentInput);
      updateCard(20,0);

      // 2단계: 캐스팅·제작비
      addDebugLog('--- 2단계: 캐스팅 및 제작비 산출 시작 ---', 'info');
      updateCard(25,1);
      const prodData = await Promise.race([callAPI_Production(currentInput), timeout(45000)]);
      addDebugLog('2단계 데이터 수신 완료', 'info');
      applyProductionResult(prodData, currentInput);
      updateCard(45,1);

      // 3단계: PPL
      addDebugLog('--- 3단계: PPL 제안서 생성 시작 ---', 'info');
      updateCard(50,2);
      const pplData = await Promise.race([callAPI_PPL(currentInput, planData), timeout(30000)]);
      if(pplData?.ppl?.length){
        addDebugLog(`3단계 데이터 수신 완료 (${pplData.ppl.length}건)`, 'info');
        window._apiPplData=pplData.ppl;
        buildPplPanel(pplData.ppl);
        document.getElementById('ppl-total-val').textContent=window._planData?.stats?.ppl||pL(parseInt(currentInput.episodes)||8);
      }
      updateCard(65,2);

      // 4단계: 1화 대본
      addDebugLog('--- 4단계: 1화 대본 집필 시작 (Claude 4.6 Sonnet) ---', 'info');
      updateCard(70,3);
      const scriptData = await Promise.race([callAPI_Script(currentInput, planData, 0), timeout(60000)]);
      if(scriptData?.script?.length){
        addDebugLog(`4단계 데이터 수신 완료 (${scriptData.script.length}씬)`, 'info');
        window._scripts[0]=scriptData.script;
        aiScript=scriptData.script;
      } else {
        addDebugLog('4단계 결과에 스크립트가 없어 데모 데이터로 대체합니다.', 'warn');
        aiScript=buildDemoScript(currentInput,0);
      }
      updateCard(90,3);

      // 사이드바 대본 목록 업데이트
      updateScriptSidebar();
      addDebugLog('전체 생성 프로세스 성공적으로 완료!', 'info');
      showToast('AI 생성 완료! 2화부터는 대본 패널에서 생성하세요.','success','?',4000);
      finishGenerate(false,null);

    } catch(e){
      addDebugLog(`프로세스 중 치명적 오류: ${e.message}`, 'error');
      console.error('생성 오류:', e);
      // 오류 난 단계 이후는 데모로 폴백
      if(!window._planData) applyDemoResult(currentInput);
      showToast(`일부 항목 오류: ${e.message} ? 데모 데이터로 대체됩니다.`,'warn','??',6000);
      finishGenerate(true, e.message);
    }
  })();
}

/* ===================================
   DEMO RESULT (API 키 없거나 오류 시 폴백)
=================================== */
function applyDemoResult(input){
  const title=input.title||'무제';
  const logline=input.logline||'두 사람이 만나 특별한 이야기를 써 내려간다.';
  const genre=input.genre||'로맨틱 코미디';
  const platform=input.platform||'OTT 오리지널';
  const epCount=parseInt(input.episodes)||8;
  const runtime=input.runtime||60;
  const chars=input.chars||[];
  const c1=chars[0]||{name:'주인공',age:'20대',job:'직장인',role:'여주'};
  const c2=chars[1]||{name:'상대역',age:'20대',job:'직장인',role:'남주'};

  document.getElementById('result-hero-title-el').textContent=title;
  document.getElementById('result-logline').textContent=logline;
  document.getElementById('result-badge').innerHTML=`? ${platform} · ${genre} · ${epCount}부작`;
  document.getElementById('result-tags').innerHTML=
    `<span class="result-hero-tag">회당 ${runtime}분</span>
     <span class="result-hero-tag">총 제작비 ${bL(epCount)}</span>
     <span class="result-hero-tag">PPL ${pL(epCount)}</span>`;
  document.getElementById('sidebar-title-label').textContent=title;
  document.getElementById('sidebar-meta').innerHTML=
    `<span class="meta-tag">${platform}</span><span class="meta-tag">${genre}</span><span class="meta-tag">${epCount}부작</span>`;
  document.getElementById('stat-budget').textContent=bL(epCount);
  document.getElementById('stat-scenes').textContent=(epCount*25)+'씬';
  document.getElementById('stat-ppl').textContent=pL(epCount);
  if(sampleImgUrl){
    const s=document.getElementById('result-hero-sample');
    s.style.backgroundImage=`url('${sampleImgUrl}')`;s.classList.add('loaded');
    const ob=document.getElementById('overview-img-banner');
    const oi=document.getElementById('overview-sample-img');
    ob.style.display='block';oi.src=sampleImgUrl;
  }
  document.getElementById('ov-budget').innerHTML=bL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-avg').innerHTML=aL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-ppl').innerHTML=pL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-net').innerHTML=nL(epCount)+'<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-logline').textContent=logline;
  document.getElementById('ov-story').textContent=
    `${c1.name}(${c1.job||'직장인'})의 이야기. ${logline} 우연한 만남으로 ${c2.name}(${c2.job||'직장인'})와 얽히게 된 두 사람은 서로의 상처와 꿈을 마주하며 점점 가까워진다. ${epCount}화에 걸친 여정 끝에 두 사람은 진심을 고백하고 함께 나아갈 길을 선택한다.`;
  document.getElementById('ov-conflicts').innerHTML=`
    <div class="conflict-card red"><div class="conflict-label" style="color:var(--red)">핵심 갈등 ? ${c1.name}의 비밀</div><div class="conflict-desc">${c1.name}이 숨긴 과거가 두 사람의 신뢰를 흔들며 관계의 위기를 불러온다.</div></div>
    <div class="conflict-card gold"><div class="conflict-label" style="color:var(--gold)">과거 악연 ? 운명적 얽힘</div><div class="conflict-desc">${c1.name}과 ${c2.name}는 알지 못했던 과거의 연결고리를 발견하며 혼란에 빠진다.</div></div>
    <div class="conflict-card teal"><div class="conflict-label" style="color:var(--teal)">감정 갈등 ? 삼각 긴장</div><div class="conflict-desc">제3의 인물이 두 사람 사이에 끼어들며 감정 전쟁이 시작된다.</div></div>
    <div class="conflict-card ink"><div class="conflict-label" style="color:var(--ink2)">외부 압박 ? 현실의 벽</div><div class="conflict-desc">주변의 반대와 현실적 장애물이 두 사람의 감정을 끊임없이 시험한다.</div></div>`;
  document.getElementById('ppl-total-val').textContent=pL(epCount);
  aiEpisodes=buildDemoEpisodes(input);
  aiScript=buildDemoScript(input);
  const se=document.getElementById('sidebar-script-eps');
  if(se) se.innerHTML=aiEpisodes.map((_,i)=>`
    <button class="sidebar-item" onclick="showScriptEp(${i})"><div class="sidebar-dot"></div>${i+1}화${aiEpisodes[i]?` ? ${aiEpisodes[i].title.slice(0,8)||''}`:''}</button>`).join('');
}
function bL(ep){return ep<=4?'64억':ep<=8?'127.5억':ep<=12?'190억':'248억';}
function pL(ep){return ep<=4?'3.2억':ep<=8?'6.5억':ep<=12?'9억':'12억';}
function aL(ep){return ep<=4?'16억':ep<=8?'15.9억':'15.5억';}
function nL(ep){return ep<=4?'60.8억':ep<=8?'121억':'236억';}

/* ===================================
   유사 컨텐츠 패널
=================================== */
let _simAllRefs=[];
function buildSimilarPanel(){
  const apiData=window._apiSimilar;
  const input=currentInput||{};
  const genre=input.genre||'로맨틱 코미디';
  const platform=input.platform||'OTT 오리지널';
  const title=input.title||'우리 드라마';
  const budgetNum=parseInt(input.episodes||8)*16;
  _simAllRefs=(apiData?.refs?.length?apiData.refs:null)||getSimilarRefs(genre,platform);
  const ratings=_simAllRefs.map(r=>parseFloat(r.rating)||0).filter(v=>v>0);
  const avgRating=ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1):'?';
  const maxRating=ratings.length?Math.max(...ratings).toFixed(1):'?';
  const budgets=_simAllRefs.map(r=>parseFloat(r.budgetNum)||0).filter(v=>v>0);
  const avgBudget=budgets.length?Math.round(budgets.reduce((a,b)=>a+b,0)/budgets.length):0;
  const sumWrap=document.getElementById('similar-summary-wrap');
  if(sumWrap) sumWrap.innerHTML=`
    <div class="sim-summary-grid">
      <div class="sim-summary-card"><div class="sim-summary-num">${_simAllRefs.length}</div><div class="sim-summary-label">레퍼런스 작품</div></div>
      <div class="sim-summary-card"><div class="sim-summary-num">${avgRating}%</div><div class="sim-summary-label">평균 시청률</div></div>
      <div class="sim-summary-card"><div class="sim-summary-num">${maxRating}%</div><div class="sim-summary-label">최고 시청률</div></div>
      <div class="sim-summary-card"><div class="sim-summary-num">${avgBudget?avgBudget+'억':'?'}</div><div class="sim-summary-label">평균 제작비</div></div>
    </div>`;
  renderSimCards(_simAllRefs);
  const chartWrap=document.getElementById('similar-chart-wrap');
  if(chartWrap){
    const bc=['#1D9E75','#C9933A','#7F77DD','#D85A30','#378ADD','#639922'];
    const rD=_simAllRefs.map(r=>({name:r.title.slice(0,6),val:parseFloat(r.rating)||0}));
    const bD=_simAllRefs.map(r=>({name:r.title.slice(0,6),val:parseFloat(r.budgetNum)||0}));
    const mR=Math.max(...rD.map(d=>d.val),1);
    const mB=Math.max(...bD.map(d=>d.val),1);
    chartWrap.innerHTML=`
      <div class="sim-section-title">흥행 지표 비교</div>
      <div class="sim-chart-grid">
        <div class="sim-chart-card">
          <div class="sim-chart-title">최고 시청률 (%)</div>
          ${rD.map((d,i)=>`<div class="sim-bar-row"><div class="sim-bar-label" title="${_simAllRefs[i]?.title||''}">${d.name}</div><div class="sim-bar-track"><div class="sim-bar-fill" style="width:${Math.round(d.val/mR*100)}%;background:${bc[i%bc.length]}"></div></div><div class="sim-bar-val">${d.val||'?'}%</div></div>`).join('')}
          <div class="sim-bar-row" style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border)">
            <div class="sim-bar-label" style="color:var(--gold);font-weight:700">${title.slice(0,6)}(목표)</div>
            <div class="sim-bar-track"><div class="sim-bar-fill" style="width:55%;background:var(--gold)"></div></div>
            <div class="sim-bar-val" style="color:var(--gold)">목표</div>
          </div>
        </div>
        <div class="sim-chart-card">
          <div class="sim-chart-title">제작비 규모 (억원)</div>
          ${bD.map((d,i)=>`<div class="sim-bar-row"><div class="sim-bar-label" title="${_simAllRefs[i]?.title||''}">${d.name}</div><div class="sim-bar-track"><div class="sim-bar-fill" style="width:${d.val?Math.round(d.val/mB*100):0}%;background:${bc[i%bc.length]}"></div></div><div class="sim-bar-val">${d.val||'?'}억</div></div>`).join('')}
          <div class="sim-bar-row" style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border)">
            <div class="sim-bar-label" style="color:var(--gold);font-weight:700">${title.slice(0,6)}(계획)</div>
            <div class="sim-bar-track"><div class="sim-bar-fill" style="width:${Math.min(Math.round(budgetNum/mB*100),100)}%;background:var(--gold)"></div></div>
            <div class="sim-bar-val" style="color:var(--gold)">${budgetNum}억</div>
          </div>
        </div>
      </div>`;
  }
  const diffWrap=document.getElementById('similar-diff-wrap');
  if(diffWrap){
    const diffs=(apiData?.diff)||getDefaultDiff(genre,title);
    diffWrap.innerHTML=`
      <div class="sim-section-title">레퍼런스 대비 차별화 분석</div>
      <div style="margin-bottom:14px;font-size:13px;color:var(--ink2);line-height:1.7;background:var(--paper2);border-radius:var(--r);padding:14px 16px;border:0.5px solid var(--border)">
        <strong style="color:var(--ink)">${title}</strong>은 위 레퍼런스 작품들과 장르·소재는 유사하지만, 아래 항목에서 차별화됩니다.
      </div>
      <div class="sim-diff-grid">
        ${diffs.plus.map(d=>`<div class="sim-diff-card plus"><div class="sim-diff-icon">+</div><div class="sim-diff-title">${d.title}</div><div class="sim-diff-desc">${d.desc}</div></div>`).join('')}
        ${diffs.minus.map(d=>`<div class="sim-diff-card minus"><div class="sim-diff-icon">!</div><div class="sim-diff-title">${d.title}</div><div class="sim-diff-desc">${d.desc}</div></div>`).join('')}
      </div>`;
  }
}
function renderSimCards(refs){
  const tc=['linear-gradient(135deg,#1a1410,#3d2b0e)','linear-gradient(135deg,#0e1a2d,#1a3050)','linear-gradient(135deg,#1a0e2d,#2d1a50)','linear-gradient(135deg,#0e2d1a,#1a5035)','linear-gradient(135deg,#2d1a0e,#503020)','linear-gradient(135deg,#1a2d0e,#305020)'];
  const wrap=document.getElementById('similar-cards-wrap');if(!wrap)return;
  wrap.innerHTML=`
    <div class="sim-section-title">장르·소재 유사 레퍼런스 드라마</div>
    <div class="sim-cards-grid">
      ${refs.map((r,i)=>`
        <div class="sim-card" data-platform="${r.platform||''}">
          <div class="sim-card-thumb" style="background:${tc[i%tc.length]}">
            <div class="sim-card-thumb-inner">${r.title.slice(0,4)}</div>
            <div class="sim-card-platform-badge">${r.platform||''}</div>
            <div class="sim-card-rank">${i+1}</div>
          </div>
          <div class="sim-card-body">
            <div class="sim-card-title" title="${r.title}">${r.title}</div>
            <div class="sim-card-meta">${r.year||''}년 · ${r.eps||'?'}부작 · ${r.genre||''}</div>
            <div class="sim-card-tags">${(r.tags||[]).map(t=>`<span class="sim-card-tag">${t}</span>`).join('')}</div>
            <div class="sim-card-scores">
              <div class="sim-score-item">
                <div class="sim-score-label">시청률</div>
                <div class="sim-score-val ${parseFloat(r.rating||0)>=15?'green':''}">${r.rating||'?'}%</div>
                <div class="sim-score-bar-wrap"><div class="sim-score-bar" style="width:${Math.min(parseFloat(r.rating||0)*4,100)}%;background:${parseFloat(r.rating||0)>=15?'#1D9E75':'var(--gold)'}"></div></div>
              </div>
              <div class="sim-score-item">
                <div class="sim-score-label">제작비</div>
                <div class="sim-score-val">${r.budget||'?'}</div>
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}
function filterSimilar(platform,btn){
  document.querySelectorAll('.sim-ott-badge').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const filtered=platform==='전체'?_simAllRefs:_simAllRefs.filter(r=>(r.platform||'').includes(platform));
  renderSimCards(filtered.length?filtered:_simAllRefs);
}
function getSimilarRefs(genre,platform){
  const db={
    '로맨틱 코미디':[
      {title:'눈물의 여왕',year:2024,eps:16,platform:'tvN',genre:'로맨틱 코미디',rating:'24.9',budget:'300억',budgetNum:300,tags:['재벌','치유','순정']},
      {title:'나의 해방일지',year:2022,eps:16,platform:'JTBC',genre:'로맨스·드라마',rating:'8.6',budget:'150억',budgetNum:150,tags:['일상','감성','직장인']},
      {title:'쌈 마이웨이',year:2017,eps:16,platform:'KBS2',genre:'로맨틱 코미디',rating:'11.2',budget:'90억',budgetNum:90,tags:['청춘','성장','로컬']},
      {title:'식샤를 합시다',year:2013,eps:16,platform:'tvN',genre:'로맨스·음식',rating:'4.1',budget:'60억',budgetNum:60,tags:['음식','골목','일상']},
      {title:'커피프린스 1호점',year:2007,eps:17,platform:'MBC',genre:'로맨틱 코미디',rating:'23.6',budget:'80억',budgetNum:80,tags:['카페','신분차','클래식']},
      {title:'멜로가 체질',year:2019,eps:16,platform:'JTBC',genre:'로맨스·힐링',rating:'3.8',budget:'100억',budgetNum:100,tags:['30대','우정','감성']},
    ],
    '스릴러':[
      {title:'비밀의 숲',year:2017,eps:16,platform:'tvN',genre:'스릴러·수사',rating:'9.6',budget:'120억',budgetNum:120,tags:['검사','경찰','정치']},
      {title:'시그널',year:2016,eps:16,platform:'tvN',genre:'수사·미스터리',rating:'12.5',budget:'110억',budgetNum:110,tags:['무전기','시간','미제']},
      {title:'킹덤',year:2019,eps:6,platform:'넷플릭스',genre:'좀비·사극',rating:'?',budget:'200억',budgetNum:200,tags:['좀비','사극','OTT']},
      {title:'하이에나',year:2020,eps:16,platform:'SBS',genre:'법정·스릴러',rating:'9.2',budget:'130억',budgetNum:130,tags:['변호사','대립','로맨스']},
      {title:'D.P.',year:2021,eps:6,platform:'넷플릭스',genre:'군대·드라마',rating:'?',budget:'100억',budgetNum:100,tags:['군대','탈영','사회']},
      {title:'나쁜 녀석들',year:2014,eps:11,platform:'OCN',genre:'액션·범죄',rating:'5.2',budget:'70억',budgetNum:70,tags:['범죄자','형사','액션']},
    ],
    '사극':[
      {title:'미스터 선샤인',year:2018,eps:24,platform:'tvN',genre:'시대극·멜로',rating:'18.1',budget:'430억',budgetNum:430,tags:['개화기','멜로','대작']},
      {title:'킹덤',year:2019,eps:6,platform:'넷플릭스',genre:'사극·좀비',rating:'?',budget:'200억',budgetNum:200,tags:['OTT','좀비','조선']},
      {title:'구르미 그린 달빛',year:2016,eps:18,platform:'KBS2',genre:'퓨전 사극',rating:'23.3',budget:'150억',budgetNum:150,tags:['왕세자','변장','로맨스']},
      {title:'철인왕후',year:2020,eps:20,platform:'tvN',genre:'퓨전 사극',rating:'17.4',budget:'180억',budgetNum:180,tags:['빙의','코미디','조선']},
      {title:'육룡이 나르샤',year:2015,eps:50,platform:'SBS',genre:'정통 사극',rating:'21.8',budget:'350억',budgetNum:350,tags:['조선건국','역사','대작']},
      {title:'동이',year:2010,eps:60,platform:'MBC',genre:'궁중 사극',rating:'30.8',budget:'200억',budgetNum:200,tags:['숙빈','조선','로맨스']},
    ],
    '휴먼':[
      {title:'나의 아저씨',year:2018,eps:16,platform:'tvN',genre:'휴먼 드라마',rating:'8.6',budget:'100억',budgetNum:100,tags:['치유','직장','관계']},
      {title:'응답하라 1988',year:2015,eps:20,platform:'tvN',genre:'청춘·성장',rating:'18.8',budget:'80억',budgetNum:80,tags:['골목','가족','추억']},
      {title:'이상한 변호사 우영우',year:2022,eps:16,platform:'ENA',genre:'법정·휴먼',rating:'17.5',budget:'120억',budgetNum:120,tags:['자폐','변호사','성장']},
      {title:'동백꽃 필 무렵',year:2019,eps:40,platform:'KBS2',genre:'로맨스·성장',rating:'23.8',budget:'130억',budgetNum:130,tags:['지방','싱글맘','성장']},
      {title:'눈이 부시게',year:2019,eps:12,platform:'JTBC',genre:'판타지·휴먼',rating:'7.6',budget:'80억',budgetNum:80,tags:['시간','가족','감동']},
      {title:'디어 마이 프렌즈',year:2016,eps:12,platform:'tvN',genre:'휴먼·가족',rating:'8.2',budget:'90억',budgetNum:90,tags:['중년','우정','감동']},
    ],
    '막장':[
      {title:'펜트하우스',year:2020,eps:21,platform:'SBS',genre:'막장·스릴러',rating:'28.8',budget:'200억',budgetNum:200,tags:['재벌','복수','욕망']},
      {title:'부부의 세계',year:2020,eps:16,platform:'JTBC',genre:'멜로·스릴러',rating:'28.4',budget:'150억',budgetNum:150,tags:['불륜','복수','심리']},
      {title:'스카이 캐슬',year:2018,eps:20,platform:'JTBC',genre:'드라마·사회',rating:'23.8',budget:'100억',budgetNum:100,tags:['입시','욕망','사회']},
      {title:'결혼작사 이혼작곡',year:2021,eps:32,platform:'TV조선',genre:'막장·로맨스',rating:'7.4',budget:'70억',budgetNum:70,tags:['불륜','결혼','자극']},
      {title:'아내의 유혹',year:2008,eps:129,platform:'MBC',genre:'막장·복수',rating:'36.4',budget:'50억',budgetNum:50,tags:['복수','성형','막장']},
      {title:'황후의 품격',year:2018,eps:52,platform:'MBC',genre:'막장·궁중',rating:'12.8',budget:'80억',budgetNum:80,tags:['황실','복수','자극']},
    ],
  };
  const key=Object.keys(db).find(k=>genre.includes(k))||'로맨틱 코미디';
  return db[key];
}
function getDefaultDiff(genre,title){
  const map={
    '로맨틱 코미디':{
      plus:[
        {title:'공간 밀착형 서사',desc:'단일 건물·골목이라는 좁은 공간에서 발생하는 밀도 높은 감정 충돌이 차별점. 기존 재벌·직장 배경과 차별되는 따뜻한 로컬 감성.'},
        {title:'현실 갈등 결합',desc:'부동산·재개발이라는 2030 공감 소재를 로맨스 갈등 축으로 활용. 판타지 설정 없이도 긴장감 있는 서사 구축 가능.'},
      ],
      minus:[
        {title:'대중 인지도 확보',desc:'신선한 소재이지만 기존 재벌·전문직 로맨스보다 대중 친숙도 낮음. 마케팅 단계에서 세계관 홍보 전략 필요.'},
        {title:'시각적 스펙터클',desc:'골목·상가 배경 특성상 대규모 로케이션 없어 영상미 차별화 어려움. 음식 비주얼과 골목 감성 촬영에 집중 필요.'},
      ],
    },
    '스릴러':{
      plus:[
        {title:'캐릭터 내면 서사',desc:'사건 중심이 아닌 인물의 심리적 궤적에 집중하는 구조로 장르 포화 시장에서 차별화 가능.'},
        {title:'로컬 공동체 배경',desc:'특정 지역 커뮤니티를 배경으로 현실감 있는 서스펜스 구축. 해외 플랫폼 수출에 유리한 K-로컬 정서.'},
      ],
      minus:[
        {title:'수사물 포화 경쟁',desc:'tvN·OCN 수사물과의 직접 경쟁 불가피. 차별화 포인트를 마케팅 초기 단계부터 명확히 강조해야 함.'},
        {title:'제작비 압박',desc:'스릴러 특성상 VFX·야간 촬영 비중 높아 예산 초과 리스크 관리 중요. 회차별 예산 배분 전략 필수.'},
      ],
    },
    '사극':{
      plus:[
        {title:'현대적 재해석',desc:'정통 사극 문법에 현대적 감수성을 결합해 젊은 시청층 진입 장벽 낮춤. OTT 글로벌 유통에 유리한 포맷.'},
        {title:'K-콘텐츠 수출력',desc:'사극 장르는 해외 스트리밍 플랫폼에서 높은 수출 단가를 형성. 글로벌 팬덤 확보 가능성 높음.'},
      ],
      minus:[
        {title:'높은 제작비',desc:'세트·의상·CG 비중이 높아 제작비 편차가 큼. 철저한 사전 제작과 VFX 단가 협상이 수익성 좌우.'},
        {title:'역사 고증 리스크',desc:'역사적 사실과의 충돌 시 여론 반발 가능. 사전에 역사 자문단 구성 및 팩트체크 프로세스 필요.'},
      ],
    },
    '휴먼':{
      plus:[
        {title:'공감 서사',desc:'일상적이고 보편적인 감정을 다루어 세대를 넘는 공감대 형성. 장기 화제성 유지에 유리.'},
        {title:'제작비 효율',desc:'대규모 액션·VFX 없이 배우 연기와 대사로 승부하는 구조. 상대적으로 낮은 제작비로 높은 완성도 가능.'},
      ],
      minus:[
        {title:'초반 흡인력',desc:'느린 호흡의 서사는 1-2화 이탈률이 높음. 오프닝 씬에서 강한 감정 포인트 설계 필수.'},
        {title:'OTT 알고리즘 불리',desc:'빠른 전개를 선호하는 OTT 플랫폼 알고리즘에서 상대적으로 불리. 에피소드 단위 클리프행어 강화 필요.'},
      ],
    },
  };
  const key=Object.keys(map).find(k=>genre.includes(k))||'로맨틱 코미디';
  return map[key];
}

/* ===================================
   전체 대본 보기
=================================== */
function showFullScript(){
  const modal = document.getElementById('fullscript-modal');
  if(!modal) return;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  const btns = document.getElementById('fullscript-ep-btns');
  if(btns && aiEpisodes){
    btns.innerHTML = aiEpisodes.map((_,i)=>`
      <button id="fsbtn-${i}" onclick="renderFullScriptEp(${i})"
        style="padding:4px 10px;border-radius:8px;border:0.5px solid var(--border);background:${i===0?'var(--gold)':'var(--paper2)'};color:${i===0?'#fff':'var(--ink2)'};font-size:11px;font-weight:600;cursor:pointer;font-family:var(--sans)">
        ${i+1}화
      </button>`).join('');
  }
  renderFullScriptEp(0);
}
function renderFullScriptEp(epIdx){
  const input = currentInput||{};
  const script = epIdx===0 ? (aiScript||buildDemoScript(input,0)) : buildDemoScript(input,epIdx);
  if(aiEpisodes) aiEpisodes.forEach((_,i)=>{
    const b=document.getElementById('fsbtn-'+i);
    if(b){b.style.background=i===epIdx?'var(--gold)':'var(--paper2)';b.style.color=i===epIdx?'#fff':'var(--ink2)';}
  });
  const ep=aiEpisodes?.[epIdx];
  const titleEl=document.getElementById('fullscript-title');
  const subEl=document.getElementById('fullscript-subtitle');
  if(titleEl) titleEl.textContent=`${epIdx+1}화 대본${ep?' ? '+ep.title:''}`;
  if(subEl)   subEl.textContent=ep?`엔딩: ${ep.ending}`:'';
  const body=document.getElementById('fullscript-body');
  if(!body) return;
  body.innerHTML=script.map(scene=>`
    <div style="margin-bottom:44px">
      <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:16px;padding-bottom:8px;border-bottom:1.5px solid var(--gold);letter-spacing:.04em">${scene.heading}</div>
      ${scene.lines.map(line=>{
        if(line.type==='action') return `<div style="font-size:14px;color:var(--ink2);line-height:2;margin-bottom:6px;padding:0 16px">${line.text}</div>`;
        if(line.type==='direction') return `<div style="font-size:13px;color:var(--ink3);line-height:1.8;margin:4px 0 8px;padding:0 16px;font-style:italic">${line.text}</div>`;
        if(line.type==='dialog'){
          const p=line.paren?`<span style="font-size:12px;color:var(--ink3);font-weight:400"> (${line.paren})</span>`:'';
          return `<div style="margin:14px 0;padding:0 32px">
            <div style="font-size:12px;font-weight:700;color:var(--ink);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px">${line.char}${p}</div>
            <div style="font-size:15px;color:var(--ink);line-height:1.9;padding-left:0">${line.line}</div>
          </div>`;
        }
        return '';
      }).join('')}
    </div>`).join('');
  document.getElementById('fullscript-modal').scrollTop=0;
}
function closeFullScript(){
  const m=document.getElementById('fullscript-modal');
  if(m) m.style.display='none';
  document.body.style.overflow='';
}

function showPanel(id){
  document.querySelectorAll('.result-panel').forEach(p=>p.classList.remove('active'));
  const sideIds=['overview','characters','episodes','budget','ppl','similar','script'];
  document.querySelectorAll('.sidebar-item').forEach((b,i)=>b.classList.toggle('active',sideIds[i]===id));
  const panel=document.getElementById('panel-'+id);
  if(panel) panel.classList.add('active');
  if(id==='similar') buildSimilarPanel();
  // 대본 패널: result-main은 overflow:hidden, 나머지는 overflow-y:auto
  const rm = document.getElementById('result-main');
  if(rm) rm.style.overflowY = id==='script' ? 'hidden' : 'auto';
  // 플로팅 에이전트 버튼
  if(id==='script') showScriptPanel();
  else hideScriptPanel();
}
function buildResultPanels(){
  const g=document.getElementById('char-cards-r');if(g)g.innerHTML='';
  const b=document.getElementById('ep-bars-r');if(b)b.innerHTML='';
  buildCharCards();buildEpList();buildBudget();buildPplPanel();
}
function startTitleEdit(){
  const el=document.getElementById('result-hero-title-el');
  const inp=document.getElementById('result-title-edit-input');
  inp.value=el.textContent;el.style.display='none';inp.style.display='inline-block';inp.focus();
}
function finishTitleEdit(){
  const el=document.getElementById('result-hero-title-el');
  const inp=document.getElementById('result-title-edit-input');
  const v=inp.value.trim();
  if(v){el.textContent=v;document.getElementById('sidebar-title-label').textContent=v;}
  inp.style.display='none';el.style.display='inline-block';
  showToast('제목이 수정되었습니다.','success','??',2000);
}

/* ===================================
   대본 패널 ? 화 탭 + 가로 씬 카드
=================================== */
let currentSceneIdx = 0;  // 현재 선택된 씬 인덱스

function showScriptEp(idx){
  currentEpIdx = idx;
  currentSceneIdx = 0;
  showPanel('script');
  renderEpTabs();

  // 해당 화 대본이 있으면 표시, 없으면 생성 유도 화면
  const script = getScript(idx);
  if(script){
    aiScript = script;
    renderSceneRow();
    renderSceneDetail(0);
  } else if(idx===0){
    // 1화는 데모 폴백
    aiScript = buildDemoScript(currentInput, 0);
    renderSceneRow();
    renderSceneDetail(0);
  } else {
    // 2화 이상 ? 생성 유도 + 씬 요약 미리보기
    renderScriptGeneratePrompt(idx);
  }

  document.querySelectorAll('#sidebar-script-eps .sidebar-item')
    .forEach((b,i)=>b.classList.toggle('active', i===idx));
  updateScriptSidebar();
}

/* 대본 미생성 화 ? 씬 요약 + 생성 버튼 */
function renderScriptGeneratePrompt(idx){
  const ep = aiEpisodes?.[idx];
  const row = document.getElementById('script-scene-row');
  const detail = document.getElementById('script-scene-detail');
  if(!row||!detail) return;

  // 씬 요약 카드 (결정 근거용)
  const scenes = ep?.scenes||[];
  const sceneCards = scenes.map((s,i)=>{
    const num = Array.isArray(s) ? s[0] : s.num||`S#${i+1}`;
    const loc = Array.isArray(s) ? s[1] : s.loc||'';
    const desc= Array.isArray(s) ? s[2] : s.desc||'';
    const chars= Array.isArray(s) ? '' : (s.chars||[]).join('·');
    return `<div style="background:var(--paper2);border:0.5px solid var(--border);border-radius:var(--r);padding:12px 14px;min-width:200px;flex-shrink:0">
      <div style="font-size:10px;font-weight:700;color:var(--gold);margin-bottom:4px">${num}</div>
      <div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:4px">${loc}</div>
      ${chars?`<div style="font-size:10px;color:var(--teal);margin-bottom:6px">등장: ${chars}</div>`:''}
      <div style="font-size:11px;color:var(--ink3);line-height:1.6">${desc}</div>
    </div>`;
  }).join('');

  row.innerHTML=`<div style="display:flex;gap:10px;padding:4px 0;overflow-x:auto">${sceneCards}</div>`;

  detail.innerHTML=`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;text-align:center;gap:20px">
      <div style="font-family:var(--serif);font-size:20px;font-weight:700;color:var(--ink)">${ep?.num||idx+1}화 ? ${ep?.title||''}</div>
      <div style="font-size:13px;color:var(--ink3);max-width:480px;line-height:1.7">${ep?.logline||ep?.story?.slice(0,120)||''}</div>
      <div style="background:var(--paper2);border:0.5px solid var(--border);border-radius:var(--r2);padding:16px 20px;max-width:480px;width:100%;text-align:left">
        <div style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">엔딩 컷</div>
        <div style="font-size:13px;color:var(--ink);font-style:italic">"${ep?.ending||''}"</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button id="btn-gen-script-${idx}" class="btn btn-primary" onclick="generateScriptForEp(${idx})" style="padding:12px 28px;font-size:14px">
          ? ${idx+1}화 대본 생성
        </button>
        ${idx>0?`<button class="btn btn-ghost" onclick="showScriptEp(${idx-1})" style="font-size:13px">← ${idx}화 보기</button>`:''}
      </div>
      <div style="font-size:11px;color:var(--ink3)">위 씬 요약을 확인하고 이 내용으로 진행하려면 생성 버튼을 누르세요.</div>
    </div>`;
}



/* 화 탭 바 렌더 */
function renderEpTabs(){
  if(!aiEpisodes) return;
  const track = document.getElementById('script-ep-tab-track');
  if(!track) return;
  track.innerHTML = aiEpisodes.map((ep,i)=>`
    <button class="script-ep-tab ${i===currentEpIdx?'active':''}" onclick="changeScriptEp(${i})">
      <span class="ep-tab-num">${i+1}</span>${ep.title.slice(0,8)}
    </button>`).join('');
  // 활성 탭으로 스크롤
  setTimeout(()=>{
    const active = track.querySelector('.script-ep-tab.active');
    if(active) active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }, 50);
}

/* 씬 카드 가로 행 렌더 */
function renderSceneRow(){
  if(!currentInput) return;
  // 해당 화 저장된 대본 우선, 없으면 현재 aiScript
  const src = getScript(currentEpIdx) || aiScript || buildDemoScript(currentInput, currentEpIdx);
  if(!src||!src.length) return;
  const row = document.getElementById('script-scene-row');
  if(!row) return;

  row.innerHTML = src.map((scene, i)=>{
    const firstLine = scene.lines[0];
    const preview = firstLine
      ? (firstLine.type==='dialog' ? `"${firstLine.line}"` : firstLine.text)
      : '';
    const typeMap = {action:'scene-badge-action',dialog:'scene-badge-dialog',direction:'scene-badge-dir'};
    const badge = firstLine ? typeMap[firstLine.type]||'scene-badge-action' : 'scene-badge-action';
    const badgeLabel = {action:'지문',dialog:'대사',direction:'방향'}[firstLine?.type]||'지문';

    return `<div class="scene-card ${i===currentSceneIdx?'active':''}" id="scene-card-${i}" onclick="selectSceneCard(${i})">
      <div class="scene-card-num">S#${i+1}</div>
      <div class="scene-card-heading">${scene.heading.replace(/^S# \d+\.\s*/,'')}</div>
      <div class="scene-card-preview">${(preview||'').slice(0,60)}</div>
      <span class="scene-mini-badge ${badge}">${badgeLabel}</span>
    </div>`;
  }).join('');

  // 첫 진입 시 첫 씬 자동 렌더
  if(currentSceneIdx===0) renderSceneDetail(0);
}

/* 씬 카드 선택 */
function selectSceneCard(idx){
  currentSceneIdx = idx;
  // 카드 활성 상태 업데이트
  document.querySelectorAll('.scene-card').forEach((c,i)=>c.classList.toggle('active', i===idx));
  // 상세 대본 렌더
  renderSceneDetail(idx);
  // 선택된 카드가 보이도록 스크롤
  const card = document.getElementById('scene-card-'+idx);
  if(card) card.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
}

/* 씬 상세 대본 렌더 */
function renderSceneDetail(idx){
  const src = getScript(currentEpIdx) || aiScript || buildDemoScript(currentInput, currentEpIdx);
  if(!src||!src[idx]) return;
  const scene = src[idx];
  const detail = document.getElementById('script-scene-detail');
  if(!detail) return;

  const linesHtml = scene.lines.map((l, li)=>{
    let inner = '';
    let preview = '';
    if(l.type==='action'){
      inner = `<div class="scene-action">${l.text}</div>`;
      preview = l.text.slice(0,30);
    } else if(l.type==='dialog'){
      inner = `<div class="scene-dialog"><div class="scene-char-name">${l.char}</div>${l.paren?`<div class="scene-parenthetical">(${l.paren})</div>`:''}<div class="scene-line">${l.line}</div></div>`;
      preview = `${l.char}: ${l.line.slice(0,25)}`;
    } else if(l.type==='direction'){
      inner = `<div class="scene-direction">${l.text}</div>`;
      preview = l.text.slice(0,30);
    }
    return `<div class="script-line-wrap" onmouseenter="showLineEditBtn(this)" onmouseleave="hideLineEditBtn(this)">
      ${inner}
      <button class="line-edit-btn" onclick="openFloatingAgentForLine(${idx},${li},'${preview.replace(/'/g,"\\'")}')">? 수정</button>
    </div>`;
  }).join('');

  detail.innerHTML = `
    <div class="scene-detail-header">
      <span class="scene-detail-num">S#${idx+1}</span>
      <span class="scene-detail-heading">${scene.heading}</span>
    </div>
    ${linesHtml}`;

  // 하단 고정 에이전트 바 업데이트
  const fixedAgent = document.getElementById('script-agent-fixed');
  const fixedLabel = document.getElementById('script-agent-fixed-label');
  if(fixedAgent){
    fixedAgent.style.display = 'block';
    if(fixedLabel) fixedLabel.textContent = `AGENT ? S#${idx+1} ${scene.heading} 수정 요청`;
    const inp = document.getElementById('script-agent-fixed-input');
    if(inp){ inp.value=''; inp.placeholder=`예: 이 씬 대사 톤을 가볍게 / 지문을 더 영화적으로 / 재헌이 먼저 말을 걸게`; }
  }

  // 플로팅 에이전트 컨텍스트 업데이트
  updateFloatingAgentContext(scene.heading, idx);
  window._currentSceneIdx = idx;
}

function showLineEditBtn(el){ /* CSS hover */ }
function hideLineEditBtn(el){ /* CSS hover */ }

function sendFixedAgentScene(){
  const inp  = document.getElementById('script-agent-fixed-input');
  const resp = document.getElementById('script-agent-fixed-resp');
  if(!inp||!resp) return;
  const msg = inp.value.trim(); if(!msg) return;
  inp.value = '';
  resp.className = 'agent-response show';
  resp.innerHTML = `<div style="display:flex;align-items:center;gap:6px;color:var(--ink3)"><div class="typing-dots"><span></span><span></span><span></span></div><span style="font-size:11px;margin-left:4px">수정 중...</span></div>`;
  const sceneIdx = window._currentSceneIdx || 0;
  setTimeout(()=>{
    const replies=[
      `S#${sceneIdx+1} "${msg.slice(0,20)}" 방향으로 수정했습니다.`,
      `대사 톤을 조정했습니다. "${msg.slice(0,15)}" 반영 완료.`,
      `지문과 대사를 "${msg.slice(0,15)}" 방향으로 재작성했습니다.`,
      `씬 흐름 유지하면서 "${msg.slice(0,20)}" 내용 반영 완료.`,
    ];
    resp.innerHTML=`<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);margin-bottom:5px">? AGENT 응답</div>${replies[Math.floor(Math.random()*replies.length)]}
      <div style="margin-top:8px;display:flex;gap:6px">
        <button style="font-size:11px;padding:3px 10px;border-radius:6px;border:0.5px solid var(--teal);background:none;color:var(--teal);cursor:pointer;font-family:var(--sans)" onclick="showToast('씬이 적용되었습니다.','success','?',2000);this.closest('.agent-response').classList.remove('show')">? 적용</button>
        <button style="font-size:11px;padding:3px 10px;border-radius:6px;border:0.5px solid var(--border2);background:none;color:var(--ink3);cursor:pointer;font-family:var(--sans)" onclick="this.closest('.agent-response').classList.remove('show')">취소</button>
      </div>`;
  },1200);
}



/* 화 변경 */
function changeScriptEp(idx){
  if(!aiEpisodes||idx<0||idx>=aiEpisodes.length) return;
  currentEpIdx = idx;
  currentSceneIdx = 0;
  renderEpTabs();
  renderSceneRow();
  renderSceneDetail(0);
  document.querySelectorAll('#sidebar-script-eps .sidebar-item')
    .forEach((b,i)=>b.classList.toggle('active', i===idx));
}

/* 씬 행 좌우 스크롤 버튼 */
function scrollSceneRow(dir){
  const row = document.getElementById('script-scene-row');
  if(row) row.scrollBy({left: dir * 320, behavior:'smooth'});
}

/* 구버전 함수 호환 */
function scrollEpProgress(dir){
  if(dir<0 && currentEpIdx>0) changeScriptEp(currentEpIdx-1);
  if(dir>0 && aiEpisodes && currentEpIdx<aiEpisodes.length-1) changeScriptEp(currentEpIdx+1);
}
function renderScriptPanel(){ renderEpTabs(); renderSceneRow(); renderSceneDetail(currentSceneIdx); }


/* ===================================
   CAST
=================================== */
const castData=[
  {name:'주인공1',role:'주연 여주',av:'av-g',init:'주',desc:'깜찍발랄한 캐릭터',actors:[
    {name:'박은빈',detail:'30세 · 코믹·감성 최정상',fee:'회당 2,500만원',img:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face'},
    {name:'이유미',detail:'30세 · OTT 친화적',fee:'회당 1,800만원',img:'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face'},
    {name:'고민시',detail:'29세 · 트렌디한 이미지',fee:'회당 1,500만원',img:'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&h=200&fit=crop&crop=face'},
  ]},
  {name:'주인공2',role:'주연 남주',av:'av-p',init:'남',desc:'냉철한 완벽주의',actors:[
    {name:'변우석',detail:'31세 · 현재 최고 인기',fee:'회당 3,000만원',img:'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face'},
    {name:'채종협',detail:'32세 · 완벽주의 최적',fee:'회당 2,200만원',img:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face'},
    {name:'위하준',detail:'34세 · OTT 흥행 검증',fee:'회당 2,000만원',img:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face'},
  ]},
  {name:'조연',role:'조연',av:'av-o',init:'조',desc:'갈등 유발 조연',actors:[
    {name:'천우희',detail:'35세 · 입체적 조연 전문',fee:'회당 800만원',img:'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=face'},
    {name:'이엘',detail:'35세 · 도시적 이미지',fee:'회당 600만원',img:'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face'},
    {name:'오나라',detail:'48세 · 카리스마',fee:'회당 500만원',img:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face'},
  ]},
];
function buildCharCards(){
  const grid=document.getElementById('char-cards-r');if(!grid)return;
  const d=JSON.parse(JSON.stringify(castData));
  if(currentInput?.chars?.length){currentInput.chars.forEach((c,i)=>{if(d[i]){d[i].name=c.name||d[i].name;d[i].role=c.role||d[i].role;d[i].desc=c.personality||c.job||d[i].desc;}});}
  grid.innerHTML=d.map((c,i)=>`<div class="char-card-r ${i===0?'selected':''}" onclick="selectChar(${i})"><div class="char-av ${c.av}">${c.init}</div><div class="cname">${c.name}</div><div class="crole">${c.role}</div><div class="cdesc">${c.desc}</div><div class="char-default-tag">${c.actors[0]?.name||''} 추천</div></div>`).join('');
  renderCast(0);
  buildFullCastTable();
  buildRelationMap();
}
function selectChar(i){document.querySelectorAll('.char-card-r').forEach((c,j)=>c.classList.toggle('selected',j===i));renderCast(i);}
/* 인물 관계도 SVG ? 컴팩트 & 실제 관계 반영 */
function buildRelationMap(){
  const wrap = document.getElementById('char-relation-map');
  if(!wrap) return;

  const chars = (currentInput?.chars||[]).filter(c=>c.name);
  if(chars.length < 2){ wrap.innerHTML=''; return; }

  const male   = chars.find(c=>c.role==='남주');
  const female = chars.find(c=>c.role==='여주');
  const subs   = chars.filter(c=>c.role==='조연').slice(0,5);
  if(!male||!female){ wrap.innerHTML=''; return; }

  function relOf(c){
    const t = (c.personality||'').toLowerCase();
    if(t.includes('라이벌')||t.includes('경쟁'))      return {label:'라이벌',  color:'#EF4444',dash:'6,3',  to:'both'};
    if(t.includes('삼각')||t.includes('접근'))         return {label:'삼각관계',color:'#A78BFA',dash:'4,3',  to:'male'};
    if(t.includes('방해')||t.includes('투자')||t.includes('압박')) return {label:'압박',color:'#EF4444',dash:'5,3',  to:'both'};
    if(t.includes('상사')||t.includes('내친')||t.includes('악연')) return {label:'과거악연',color:'#F97316',dash:'6,3',  to:'male'};
    if(t.includes('막내')||t.includes('동료')||t.includes('동경')) return {label:'조력',     color:'#22C55E',dash:'3,2',  to:'both'};
    if(t.includes('우승')||t.includes('참가'))         return {label:'참가자',  color:'#5EAED4',dash:'3,2',  to:'both'};
    return {label:'관계',color:'#94A3B8',dash:'3,3',to:'both'};
  }

  // 컴팩트 사이즈 W×H
  const W=480, H=210;
  const cx=W/2, cy=H*0.46;

  // 남주 좌, 여주 우 ? 중앙에 로맨스 강조
  const mPos = {x:cx-100, y:cy};
  const fPos = {x:cx+100, y:cy};

  // 조연 반원 배치 (위쪽 호)
  const arcPositions = [
    {x:cx-200, y:cy-60},   // 좌
    {x:cx-80,  y:cy-80},   // 좌중
    {x:cx,     y:cy-90},   // 상중
    {x:cx+80,  y:cy-80},   // 우중
    {x:cx+200, y:cy-60},   // 우
  ];

  let lines='', nodes='';

  // 남주 ↔ 여주 로맨스선 (굵은 골드, 중앙 라벨)
  const midX=(mPos.x+fPos.x)/2, midY=mPos.y;
  lines += `<line x1="${mPos.x}" y1="${mPos.y}" x2="${fPos.x}" y2="${fPos.y}"
    stroke="#C9933A" stroke-width="2" opacity="0.8"/>
  <text x="${midX}" y="${midY-10}" font-size="9" fill="#C9933A"
    text-anchor="middle" font-weight="700" opacity="0.95">♥ 로맨스</text>`;

  // 조연 연결선
  subs.forEach((c,i)=>{
    const pos = arcPositions[i];
    const rel = relOf(c);
    const targets = rel.to==='both' ? [mPos,fPos]
                  : rel.to==='male' ? [mPos] : [fPos];
    targets.forEach(t=>{
      const lmx=(pos.x+t.x)/2, lmy=(pos.y+t.y)/2;
      lines += `<line x1="${pos.x}" y1="${pos.y}" x2="${t.x}" y2="${t.y}"
        stroke="${rel.color}" stroke-width="1.2" stroke-dasharray="${rel.dash}" opacity="0.5"/>
      <text x="${lmx}" y="${lmy-4}" font-size="8" fill="${rel.color}"
        text-anchor="middle" opacity="0.85">${rel.label}</text>`;
    });
  });

  // 주연 노드
  function mainNode(p, n, label, color){
    return `<circle cx="${p.x}" cy="${p.y}" r="20" fill="${color}" opacity="0.15"/>
    <circle cx="${p.x}" cy="${p.y}" r="17" fill="${color}" opacity="0.88"/>
    <text x="${p.x}" y="${p.y+1}" font-size="11" font-weight="700"
      fill="#fff" text-anchor="middle" dominant-baseline="middle">${n[0]}</text>
    <text x="${p.x}" y="${p.y+26}" font-size="10" font-weight="700"
      fill="var(--ink)" text-anchor="middle">${n}</text>
    <text x="${p.x}" y="${p.y+37}" font-size="8"
      fill="var(--ink3)" text-anchor="middle">${label}</text>`;
  }

  // 조연 노드
  function subNode(p, n, label){
    return `<circle cx="${p.x}" cy="${p.y}" r="13" fill="#94A3B8" opacity="0.18"/>
    <circle cx="${p.x}" cy="${p.y}" r="11" fill="#94A3B8" opacity="0.72"/>
    <text x="${p.x}" y="${p.y+1}" font-size="9" font-weight="700"
      fill="#fff" text-anchor="middle" dominant-baseline="middle">${n[0]}</text>
    <text x="${p.x}" y="${p.y+20}" font-size="9" font-weight="600"
      fill="var(--ink)" text-anchor="middle">${n}</text>
    <text x="${p.x}" y="${p.y+30}" font-size="7.5"
      fill="var(--ink3)" text-anchor="middle">${label.slice(0,8)}</text>`;
  }

  nodes += mainNode(mPos, male.name, (male.job||'').slice(0,8), '#C9933A');
  nodes += mainNode(fPos, female.name, (female.job||'').slice(0,8), '#5EAED4');
  subs.forEach((c,i)=>{
    nodes += subNode(arcPositions[i], c.name, (c.job||c.role||'').slice(0,10));
  });

  // 범례
  const legendItems = [
    {color:'#C9933A', dash:'none', label:'로맨스'},
    {color:'#EF4444', dash:'5,3',  label:'갈등·압박'},
    {color:'#A78BFA', dash:'4,3',  label:'삼각관계'},
    {color:'#F97316', dash:'6,3',  label:'과거악연'},
    {color:'#22C55E', dash:'3,2',  label:'조력'},
  ];
  const legend = legendItems.map(l=>`
    <div style="display:flex;align-items:center;gap:3px">
      <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2"
        stroke="${l.color}" stroke-width="${l.dash==='none'?2:1.5}"
        ${l.dash!=='none'?`stroke-dasharray="${l.dash}"`:''}/>
      </svg>
      <span>${l.label}</span>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="relation-map-wrap">
      <div class="relation-map-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>? 인물 관계도</span>
        <span style="font-size:10px;color:var(--ink3);font-weight:400">${chars.length}인</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
        style="width:100%;display:block;max-height:210px">
        ${lines}${nodes}
      </svg>
      <div class="relation-map-legend">${legend}
        <span style="margin-left:auto">?? 남주 · ?? 여주 · ? 조연</span>
      </div>
    </div>`;
}

function renderCast(i){
  const d=castData[i];if(!d)return;
  document.getElementById('cast-title-r').textContent=d.name;
  document.getElementById('cast-role-r').textContent=d.role+' ? 추천 캐스팅';
  document.getElementById('cast-list-r').innerHTML=d.actors.map((a,k)=>`
    <div class="cast-item ${k===0?'top':''}">
      <div class="cast-photo"><img src="${a.img}" alt="${a.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=cast-photo-placeholder>${a.name[0]}</div>'"></div>
      <div class="cast-rank-badge ${k===0?'rank-top':k===1?'rank-2nd':'rank-3rd'}">${k+1}</div>
      <div class="cast-info-wrap"><div class="cast-name-row"><span class="cast-name-r">${a.name}</span>${k===0?'<span class="top-badge">추천 1순위</span>':''}</div><div class="cast-detail-r">${a.detail}</div></div>
      <div class="cast-fee-r">${a.fee}</div>
    </div>`).join('');
}

/* ===================================
   EPISODES
=================================== */
function buildDemoEpisodes(input){
  const n=parseInt(input.episodes)||8;
  const c1=input.chars?.[0]?.name||'주인공', c2=input.chars?.[1]?.name||'상대역';
  const j1=input.chars?.[0]?.job||'직장인', j2=input.chars?.[1]?.job||'직장인';
  const ll=input.logline||'두 사람의 이야기';
  const templates=[
    {title:`${c1}, ${c2}를 만나다`,story:`${c1}(${j1})은 ${ll} 우연한 사건으로 ${c2}(${j2})와 첫 만남을 갖는다. 어색하고 불편한 첫인상이지만 둘은 예상치 못한 방식으로 엮이게 된다.`,ending:`${c2}, ${c1}의 뒷모습을 오래 바라보다 시선을 거둔다`},
    {title:`가까워지는 거리`,story:`사소한 사건을 계기로 두 사람이 자주 마주치게 된다. ${c1}은 ${c2}의 의외의 면을 발견하고 마음이 조금씩 흔들리기 시작한다.`,ending:`${c1}, 혼자 미소 짓다 스스로 놀란다`},
    {title:`숨겨진 비밀`,story:`${c2}에게 감춰진 과거가 있다는 것을 ${c1}이 우연히 눈치챈다. 그러나 직접 묻지 못하고 혼자 마음을 정리한다.`,ending:`${c2}, 오래된 사진을 꺼내보다 서랍 깊이 넣는다`},
    {title:`균열의 시작`,story:`두 사람 사이에 오해가 생기고 제3의 인물이 끼어들며 갈등이 고조된다. ${c1}은 상처를 받고 거리를 두기 시작한다.`,ending:`빗속에 혼자 서 있는 ${c1}`},
    {title:`위기`,story:`갈등이 정점에 달한다. ${c2}의 비밀이 드러나고 ${c1}은 배신감을 느낀다. 두 사람 사이의 거리가 가장 멀어지는 순간이다.`,ending:`${c2}, 결심한 듯 핸드폰을 집어든다`},
    {title:`진심`,story:`${c2}가 처음으로 솔직하게 자신의 마음을 털어놓는다. ${c1}은 그 말을 듣고 흔들리지만 쉽게 마음을 열지 못한다.`,ending:`${c1}, 문 앞에서 오래 서 있다가 돌아선다`},
    {title:`화해`,story:`작은 계기로 두 사람이 오해를 풀고 서로의 상처를 이해하게 된다. 처음보다 더 단단해진 신뢰가 싹튼다.`,ending:`두 사람, 말없이 나란히 걷는다`},
    {title:`새로운 시작`,story:`외부의 방해에도 불구하고 두 사람이 함께하기로 결심한다. 주변의 반대를 넘어서는 과정에서 서로의 소중함을 다시 확인한다.`,ending:`두 사람, 처음으로 손을 잡는다`},
    {title:`운명의 선택`,story:`두 사람의 관계를 위협하는 마지막 장애물이 등장한다. ${c1}과 ${c2}는 각자의 선택 앞에 서게 된다.`,ending:`${c2}, ${c1}에게 달려간다`},
    {title:`함께하는 내일`,story:`모든 갈등이 해결되고 두 사람이 함께할 미래를 그린다. 작지만 확실한 행복의 시작.`,ending:`간판에 불이 켜지며 ? 두 사람 미소`},
    {title:`고백`,story:`${c1}이 먼저 솔직한 마음을 전한다. ${c2}의 반응을 기다리는 긴장된 순간.`,ending:`${c2}의 입가에 미소가 번진다`},
    {title:`엔딩`,story:`두 사람의 이야기가 완성된다. 시청자에게 여운을 남기는 마지막 장면.`,ending:`페이드아웃. 엔드 크레딧`},
    {title:`에필로그 I`,story:`일정 시간이 흐른 후의 두 사람. 함께하는 일상의 단면들.`,ending:`카메라가 천천히 멀어진다`},
    {title:`에필로그 II`,story:`두 사람이 새로운 도전 앞에 서 있다. 함께라면 무엇이든 가능하다.`,ending:`함께 웃으며 앞으로 나아간다`},
    {title:`스페셜 에디션`,story:`주요 장면 하이라이트와 미공개 씬. 두 사람의 케미스트리를 다시 한번.`,ending:`OST와 함께 ? 팬 서비스`},
    {title:`파이널`,story:`모든 이야기의 대단원. 남겨진 모든 복선이 회수된다.`,ending:`THE END`},
  ];
  const scenes6=[
    [`S#1`,`오프닝 / 낮`,`이야기의 시작. 주인공의 일상 소개`],
    [`S#2`,`주요 배경 / 낮`,`사건의 발단`],
    [`S#3`,`실내 / 오후`,`첫 번째 감정 포인트`],
    [`S#4`,`거리 / 저녁`,`두 인물의 엇갈림`],
    [`S#5`,`실내 / 밤`,`회차 클라이맥스`],
    [`S#6`,`엔딩 씬 / 밤`,`다음 화 복선`],
  ];
  return Array.from({length:n},(_,i)=>{
    const tpl=templates[i%templates.length];
    return {num:i+1,title:tpl.title,story:tpl.story,ending:tpl.ending,scenes:scenes6};
  });
}
function buildEpList(){
  const el=document.getElementById('ep-list-r');if(!el)return;
  el.innerHTML='';
  const colors=['#9FE1CB','#EEEDFE','#FAECE7'];
  const tcs=['#04342C','#26215C','#4A1B0C'];
  (aiEpisodes||[]).forEach((ep,i)=>{
    const div=document.createElement('div');div.className='ep-item-r';
    div.innerHTML=`<div class="ep-left-r"><div class="ep-dot-r" style="background:${colors[i%3]};color:${tcs[i%3]}">${ep.num}</div><div class="ep-line-r"></div></div>
    <div class="ep-content-r">
      <div class="ep-header-r" onclick="toggleEp(${i})" style="cursor:pointer">
        <span class="ep-num-r" style="color:${tcs[i%3]}">${ep.num}화</span>
        <span class="ep-title-r">${ep.title}</span>
        <button class="ep-edit-btn" onclick="event.stopPropagation();openEpDialog(${i})" title="이 회차 수정">＋ 수정</button>
        <span class="ep-chev" id="echev-${i}" style="margin-left:8px">▶</span>
      </div>
      <div class="ep-detail-r" id="edetail-${i}">
        <div class="ep-body-r">${ep.story}</div>
        <span class="ep-ending-r">엔딩: ${ep.ending}</span>
        <div class="scene-list-r">${(ep.scenes||[]).map(s=>{
          const num  = Array.isArray(s)?s[0]:s.num||'S#?';
          const loc  = Array.isArray(s)?s[1]:s.loc||'';
          const desc = Array.isArray(s)?s[2]:s.desc||'';
          const chars= Array.isArray(s)?'':(s.chars||[]).join('·');
          return `<div class="scene-row">
            <span class="scene-num">${num}</span>
            <span class="scene-loc">${loc}</span>
            <div class="scene-desc-r">
              ${chars?`<span style="font-size:10px;color:var(--teal);margin-right:6px">${chars}</span>`:''}
              ${desc}
            </div>
          </div>`;
        }).join('')}</div>
      </div>
    </div>`;
    el.appendChild(div);
  });
}
function toggleEp(i){const d=document.getElementById('edetail-'+i);const c=document.getElementById('echev-'+i);const o=d.classList.contains('open');d.classList.toggle('open',!o);c.style.transform=o?'':'rotate(90deg)';}

/* ===================================
   BUDGET
=================================== */
const epItemsBase={ep1:[1420,3110,5120,1960,363,335,365,330,630,432],ep2:[990,3350,5120,1810,235,270,690,300,700,452],ep3:[660,3115,5120,1820,175,200,1650,350,600,402],ep4:[1400,3250,6030,2090,440,290,1300,340,750,476],ep5:[570,3285,5120,1790,210,230,625,400,600,634],ep6:[600,3275,5120,1790,180,200,225,320,600,402],ep7:[750,3230,5120,1790,150,200,270,380,600,402],ep8:[910,3410,5760,2170,400,290,3095,630,950,817]};
const itemLabels=['로케이션·세트','출연료','스태프 인건비','촬영 장비','미술·소품','의상·분장','VFX','음악·효과음','후반 작업','기타'];
let _epItemsCache={};
function buildBudget(){
  const n=currentInput?parseInt(currentInput.episodes)||8:8;
  _epItemsCache={};
  for(let i=1;i<=n;i++){const bk='ep'+((i-1)%8+1);_epItemsCache['ep'+i]=(epItemsBase[bk]||epItemsBase.ep1).map(v=>Math.round(v*(0.9+Math.random()*.2)));}
  const bars=document.getElementById('ep-bars-r');if(!bars)return;
  const tots=Object.values(_epItemsCache).map(arr=>{const s=arr.reduce((a,b)=>a+b,0);return s+Math.round(s*.1);});
  const max=Math.max(...tots);
  bars.innerHTML=tots.map((v,i)=>`<div class="ep-bar-row-r"><span class="ep-bar-label-r">${i+1}화</span><div class="ep-bar-track-r"><div class="ep-bar-fill-r" style="width:${Math.round(v/max*100)}%">${v.toLocaleString()}만원</div></div><span class="ep-bar-val-r">${(v/10000).toFixed(2)}억</span></div>`).join('');
  const tv=tots.reduce((a,b)=>a+b,0);const av=Math.round(tv/n);
  document.getElementById('budget-sum-wrap').innerHTML=`<div class="bcard"><div class="bcard-label">총 제작비</div><div class="bcard-value">${bL(n)}</div><div class="bcard-unit">${tv.toLocaleString()}만원</div></div><div class="bcard"><div class="bcard-label">회당 평균</div><div class="bcard-value">${aL(n)}</div><div class="bcard-unit">${av.toLocaleString()}만원</div></div><div class="bcard"><div class="bcard-label">PPL 수익</div><div class="bcard-value">${pL(n)}</div><div class="bcard-unit">차감 가능</div></div><div class="bcard"><div class="bcard-label">순 제작비</div><div class="bcard-value">${nL(n)}</div><div class="bcard-unit">PPL 차감 후</div></div>`;
  const tl=['전체',...Array.from({length:n},(_,i)=>`${i+1}화`)];
  document.getElementById('btabs').innerHTML=tl.map((l,i)=>`<button class="btab ${i===0?'active':''}" onclick="switchBTab(${i})">${l}</button>`).join('');
  switchBTab(0);
}
function switchBTab(idx){
  document.querySelectorAll('.btab').forEach((t,i)=>t.classList.toggle('active',i===idx));
  const wrap=document.getElementById('btable-wrap');const n=currentInput?parseInt(currentInput.episodes)||8:8;
  if(idx===0){const avgs=itemLabels.map((_,i)=>Math.round(Object.values(_epItemsCache).reduce((s,arr)=>s+(arr[i]||0),0)/n));const sub=avgs.reduce((a,b)=>a+b,0);const res=Math.round(sub*.1);
    wrap.innerHTML=`<table class="btable"><thead><tr><th>항목</th><th style="text-align:right">회당 평균</th></tr></thead><tbody>${avgs.map((v,i)=>`<tr><td>${itemLabels[i]}</td><td style="text-align:right">${v.toLocaleString()}만원</td></tr>`).join('')}<tr><td style="color:var(--ink3)">예비비 10%</td><td style="text-align:right">${res.toLocaleString()}만원</td></tr><tr class="tr-total"><td>합계</td><td style="text-align:right;color:var(--gold)">${(sub+res).toLocaleString()}만원</td></tr></tbody></table>`;return;}
  const arr=_epItemsCache['ep'+idx]||epItemsBase['ep'+((idx-1)%8+1)];const sub=arr.reduce((a,b)=>a+b,0);const res=Math.round(sub*.1);const tot=sub+res;
  wrap.innerHTML=`<table class="btable"><thead><tr><th>항목</th><th style="text-align:right">금액</th></tr></thead><tbody>${arr.map((v,i)=>`<tr><td>${itemLabels[i]}</td><td style="text-align:right">${v.toLocaleString()}만원</td></tr>`).join('')}<tr><td style="color:var(--ink3)">예비비 10%</td><td style="text-align:right">${res.toLocaleString()}만원</td></tr><tr class="tr-total"><td>${idx}화 합계 <span class="verify-badge">검증 완료</span></td><td style="text-align:right;color:var(--gold)">${tot.toLocaleString()}만원</td></tr></tbody></table>`;
}

/* ===================================
   SCRIPT
=================================== */
function buildDemoScript(input, epIdx=0){
  const chars=input?.chars||[];
  const c1=chars[0]?.name||'한소원', c2=chars[1]?.name||'강재윤';
  const j1=chars[0]?.job||'쉐프', j2=chars[1]?.job||'건물주';
  const a1=chars[0]?.age||'25세', a2=chars[1]?.age||'29세';
  const p1=chars[0]?.personality||'깜찍발랄, 실수투성이';
  const p2=chars[1]?.personality||'냉철한 완벽주의';
  const setting=input?.setting||'서울 마포구 오래된 골목';
  const ep=aiEpisodes?.[epIdx];
  const epTitle=ep?ep.title:`${epIdx+1}화`;

  if(epIdx===0) return [
    {heading:`S# 1. ${setting} 골목길 / 낮`,lines:[
      {type:'action',text:`서울 마포구 어딘가. 오래된 주택가 골목.`},
      {type:'action',text:`빛바랜 간판들 사이, 유독 낡은 2층 건물 하나가 눈에 띈다. 1층 유리창에 손글씨 임대 전단이 붙어있다.`},
      {type:'action',text:`골목 초입에 커다란 캐리어 두 개를 질질 끌며 나타나는 ${c1}(${a1}, ${j1}). 머리는 반쯤 풀렸고, 앞치마를 가방에 매달고 왔다. 보는 것만으로도 숨이 찬 행색.`},
      {type:'action',text:`${c1}, 건물을 올려다보며 눈을 가늘게 뜬다.`},
      {type:'dialog',char:c1,paren:'중얼거리며',line:'맞네, 맞아. 엄마가 맨날 여기 앉아서 파 다듬었잖아.'},
      {type:'action',text:`${c1}의 시선이 1층 유리창 너머 텅 빈 공간에 닿는다.`},
      {type:'action',text:`눈가가 살짝 떨린다. 금방이라도 울 것 같은 얼굴.`},
      {type:'dialog',char:c1,paren:'훌쩍이며',line:'엄마. 나 왔어?'},
      {type:'direction',text:'쾅!'},
      {type:'action',text:`열려 있던 건물 문이 바람에 세게 닫히며 ${c1}의 이마를 강타한다.`},
      {type:'dialog',char:c1,paren:'',line:'아악!!'},
      {type:'action',text:`캐리어 두 개가 도미노처럼 쓰러진다.`},
      {type:'direction',text:'(E) 쿵, 쾅, 데구르르?'},
      {type:'action',text:`${c1}, 이마를 부여잡고 잠시 하늘을 바라본다.`},
      {type:'dialog',char:c1,paren:'눈물 글썽이며',line:'...오늘 정말 재수없다.'},
    ]},
    {heading:`S# 2. 건물 1층 계단 입구 / 낮`,lines:[
      {type:'action',text:`${c1}, 이마를 부여잡고 비틀거리며 건물 안으로 들어선다.`},
      {type:'action',text:`계단 위에서 서류를 들고 내려오던 ${c2}(${a2}, ${j2})와 정면으로 부딪힌다.`},
      {type:'action',text:`서류가 공중으로 흩날린다. 두 사람, 동시에 굳는다.`},
      {type:'action',text:`${c2}, 흩어진 서류를 내려다본다. 천천히. 아주 천천히.`},
      {type:'dialog',char:c2,paren:'조용하고 건조하게',line:'...지금 뭐 하신 거예요.'},
      {type:'dialog',char:c1,paren:'이마 잡은 채',line:'저도 몰라요! 문이 먼저?'},
      {type:'dialog',char:c2,paren:'',line:'서류가 열두 장입니다.'},
      {type:'dialog',char:c1,paren:'',line:'예?'},
      {type:'dialog',char:c2,paren:'',line:'지금 바닥에 열두 장이 흩어져 있어요. 순서 다 뒤섞였고요.'},
      {type:'dialog',char:c1,paren:'얼른 줍기 시작하며',line:'아, 죄송해요! 제가 주울게요?'},
      {type:'action',text:`바닥에 쪼그려 앉은 ${c1}, 서류를 집다가 캐리어에 걸려 앞으로 쏠린다.`},
      {type:'action',text:`${c2}의 구두 앞으로 고꾸라지는 ${c1}.`},
      {type:'action',text:`정적. ${c2}, ${c1}을 내려다본다. 표정 변화 없음.`},
      {type:'dialog',char:c2,paren:'낮게',line:'...혹시 오늘 재수가 없는 날이에요, 원래?'},
      {type:'dialog',char:c1,paren:'바닥에 엎드린 채, 고개만 들어',line:'아니요. 저 원래 이래요.'},
      {type:'action',text:`${c2}, 미간이 좁아진다.`},
      {type:'action',text:`${c1}, 서류를 모두 주워 건넨다. ${c2}, 순서를 확인하며 눈살을 찌푸린다.`},
      {type:'dialog',char:c2,paren:'',line:'반 이상 뒤집혔네요.'},
      {type:'dialog',char:c1,paren:'',line:'죄송해요... 근데 저 사실 여기 임대 문의 하러 왔거든요.'},
      {type:'action',text:`${c2}의 시선이 천천히 ${c1}에게 향한다. 아무 말 없이.`},
    ]},
    {heading:`S# 3. 건물 1층 빈 상가 / 낮`,lines:[
      {type:'action',text:`텅 빈 상가 안. 오래된 타일 바닥, 주방 설비 흔적이 남아있다.`},
      {type:'action',text:`${c1}, 공간을 천천히 둘러본다. 손끝으로 조리대 흔적을 쓸어본다.`},
      {type:'dialog',char:c1,paren:'작게, 혼잣말로',line:'엄마 손때가 여기도 있네.'},
      {type:'action',text:`${c2}, 출입구에 기대어 계약서를 펼친다. ${c1}의 감상 따위엔 관심 없다.`},
      {type:'dialog',char:c2,paren:'',line:'보증금 오천에 월세 이백오십. 인테리어 공사 시 사전 허가 필수. 영업시간 준수, 소음 기준 초과 시 즉시 시정.'},
      {type:'dialog',char:c1,paren:'멍하게 듣다가',line:'...저기, 혹시 여기 전에 식당이었나요?'},
      {type:'dialog',char:c2,paren:'',line:'네.'},
      {type:'dialog',char:c1,paren:'',line:'어떤 식당이요?'},
      {type:'action',text:`${c2}, 잠깐 서류에서 눈을 뗀다.`},
      {type:'dialog',char:c2,paren:'',line:'작은 한식집이었어요. 오래됐는데. 왜요?'},
      {type:'dialog',char:c1,paren:'피식 웃으며',line:'아뇨. 그냥요.'},
      {type:'action',text:`${c1}, 창가 쪽으로 걸어가다가 바닥 타일 틈에 걸려 또 비틀한다. 가까스로 벽을 잡는다.`},
      {type:'dialog',char:c2,paren:'눈을 감았다 뜨며',line:'하느님, 제가 뭘 잘못했죠.'},
      {type:'dialog',char:c1,paren:'못 들은 척',line:'계약서 어디 서명하면 돼요?'},
      {type:'action',text:`${c2}, 계약서를 ${c1}에게 내민다. ${c1}이 펜을 받아드는 순간?`},
      {type:'direction',text:'(E) 딸깍? 펜 뚜껑 열리는 소리.'},
      {type:'action',text:`서명하는 ${c1}의 손이 미세하게 떨린다.`},
      {type:'dialog',char:c1,paren:'작게',line:'...엄마. 나 여기 계약한다.'},
      {type:'action',text:`${c2}, 그 말을 들었는지 못 들었는지. 서류를 접으며 나간다.`},
    ]},
    {heading:`S# 4. 건물 2층 재윤의 사무실 / 낮`,lines:[
      {type:'action',text:`심플하고 정돈된 사무실. 책상 위 물건들이 자로 잰 듯 정렬돼 있다.`},
      {type:'action',text:`${c2}, 계약서를 서랍에 넣으며 자리에 앉는다.`},
      {type:'action',text:`노트북을 열고 새 파일을 만든다.`},
      {type:'direction',text:`[INSERT ? 파일명: 세입자 ${c1} ? 리스크 관리 항목]`},
      {type:'dialog',char:c2,paren:'혼잣말, 무감하게',line:'1. 보행 중 낙상 가능. 2. 캐리어 파손 가능. 3. 화재 위험 있음 ? 저게 주방을 쓴다고?'},
      {type:'action',text:`${c2}, 창밖을 내려다본다.`},
      {type:'action',text:`아래 골목에서 ${c1}이 쓰러진 캐리어를 다시 세우다가 또 넘어뜨리고 있다.`},
      {type:'action',text:`${c2}의 눈이 가늘어진다.`},
      {type:'dialog',char:c2,paren:'중얼',line:'4. 본인이 가장 큰 리스크.'},
      {type:'action',text:`타이핑을 멈추고 잠시 생각하는 ${c2}.`},
      {type:'dialog',char:c2,paren:'혼잣말',line:'5. 이상하게 신경이 쓰임.'},
      {type:'action',text:`${c2}, 그 항목을 바로 삭제한다.`},
    ]},
    {heading:`S# 5. 시크릿가든 (빈 상가 내부) / 저녁`,lines:[
      {type:'action',text:`해가 지고, 텅 빈 공간에 ${c1} 혼자 남았다.`},
      {type:'action',text:`주저앉아 무릎을 끌어안는다. 낡은 타일 바닥에 손바닥을 댄다. 차갑고 오래된 감촉.`},
      {type:'dialog',char:c1,paren:'조용히',line:'엄마. 나 여기 계약했어.'},
      {type:'direction',text:'(E) 골목 바람 소리.'},
      {type:'dialog',char:c1,paren:'',line:'맨날 이 식당 작고 냄새난다고 했잖아. 미안해. 진짜로.'},
      {type:'action',text:`눈물이 볼을 타고 흐른다. ${c1}, 손등으로 거칠게 닦는다.`},
      {type:'dialog',char:c1,paren:'코 훌쩍이며, 억지로 씩씩하게',line:'근데 나 여기서 잘 할 거야. 엄마 레시피대로. 약속해.'},
      {type:'action',text:`핸드폰을 꺼낸다. 저장된 사진을 연다.`},
      {type:'direction',text:'[INSERT ? 핸드폰 화면: 허름한 식당 앞에서 앞치마 입고 활짝 웃는 중년 여성]'},
      {type:'action',text:`${c1}, 사진을 한참 보다가.`},
      {type:'dialog',char:c1,paren:'피식',line:'나도 엄마처럼 웃을 수 있으면 좋겠다.'},
      {type:'action',text:`그때, 위층에서 ${c2}의 발소리가 또각또각 들린다.`},
      {type:'action',text:`${c1}, 얼른 눈물을 닦고 표정을 정돈한다. 아무렇지 않은 척.`},
      {type:'action',text:`발소리가 지나간다. 다시 조용해지는 공간.`},
      {type:'action',text:`${c1}, 다시 사진을 본다. 이번엔 웃으면서.`},
    ]},
    {heading:`S# 6. 건물 복도 / 저녁`,lines:[
      {type:'action',text:`계단을 내려오던 ${c2}, 상가 문 앞에서 멈춘다.`},
      {type:'action',text:`문 틈으로 흘러나오는 빛. 그리고 ${c1}의 콧소리.`},
      {type:'action',text:`${c2}, 문을 열려다가. 멈춘다.`},
      {type:'action',text:`들린다 ? 흐느끼는 소리가 아닌, 콧노래.`},
      {type:'action',text:`엉망진창이지만 어딘가 익숙한 멜로디. ${c2}, 미간을 찌푸린다.`},
      {type:'dialog',char:c2,paren:'속으로',line:'...저 멜로디.'},
      {type:'action',text:`${c2}, 한 발 다가서다가. 돌아선다.`},
      {type:'action',text:`계단을 다시 올라간다. 발소리가 조용해진다.`},
      {type:'action',text:`2층 복도. ${c2}, 창밖을 본다. 골목에 가로등이 켜지고 있다.`},
      {type:'dialog',char:c2,paren:'혼잣말, 아주 작게',line:'...왜 알고 있지.'},
      {type:'action',text:`${c2}, 주머니에 손을 넣고 사무실로 돌아간다.`},
    ]},
    {heading:`S# 7. 시크릿가든 주방 / 다음 날 아침`,lines:[
      {type:'action',text:`공사 시작 첫날. ${c1}, 혼자서 낡은 주방 설비를 닦고 있다. 노래를 흥얼거리며.`},
      {type:'direction',text:'(E) 끼익? 녹슨 수도꼭지 소리.'},
      {type:'action',text:`${c1}, 수도꼭지를 틀자마자.`},
      {type:'direction',text:'콰아아아!'},
      {type:'action',text:`수도관이 터지며 물이 사방으로 쏟아진다.`},
      {type:'dialog',char:c1,paren:'',line:'으아아악!!'},
      {type:'action',text:`물벼락을 맞은 ${c1}. 온몸이 흠뻑 젖는다.`},
      {type:'direction',text:'(E) 위층 발소리. 빠르게 내려오는 소리.'},
      {type:'action',text:`${c2}, 문을 확 열고 들어오다가. 물 천지인 주방. 흠뻑 젖은 ${c1}.`},
      {type:'action',text:`두 사람, 시선이 마주친다.`},
      {type:'dialog',char:c2,paren:'3초 정적 후',line:'...수도 잠금 밸브 위치 파악하고 작업하셨어요?'},
      {type:'dialog',char:c1,paren:'물 뚝뚝 흘리며',line:'...그게 어딨어요?'},
      {type:'action',text:`${c2}, 눈을 감는다.`},
      {type:'dialog',char:c2,paren:'조용히, 그러나 단호하게',line:'공사 전 체크리스트. 내일까지 제출해주세요.'},
      {type:'dialog',char:c1,paren:'황당해서',line:'지금 물이 이렇게 나오는데 체크리스트요?'},
      {type:'dialog',char:c2,paren:'',line:'그러니까 체크리스트가 필요한 겁니다.'},
      {type:'action',text:`돌아서는 ${c2}. ${c1}, 물 뚝뚝 흘리며 그 뒤통수를 노려본다.`},
      {type:'dialog',char:c1,paren:'이 갈며, 속으로',line:'저 인간... 로봇이야, 사람이야.'},
    ]},
    {heading:`S# 8. 시크릿가든 주방 / 아침 (연속)`,lines:[
      {type:'action',text:`${c2}, 2층으로 올라가다 멈춘다. 공구 가방을 내려다본다.`},
      {type:'action',text:`잠깐의 정적.`},
      {type:'action',text:`다시 계단을 내려간다. 표정 없이.`},
      {type:'action',text:`${c1}, 수건으로 물기를 닦다가 문 열리는 소리에 돌아본다. ${c2}가 공구 가방을 들고 들어온다.`},
      {type:'dialog',char:c1,paren:'눈 동그랗게',line:'어... 뭐예요?'},
      {type:'dialog',char:c2,paren:'바닥 수도 밸브 앞에 쪼그려 앉으며',line:'수도관 교체요. 제 건물이니까 제가 합니다.'},
      {type:'dialog',char:c1,paren:'',line:'아, 그거는 제가 불러서 할게요?'},
      {type:'dialog',char:c2,paren:'',line:'어차피 터질 거였어요. 노후 배관이라.'},
      {type:'action',text:`공구를 꺼내는 ${c2}. 일 시작하는 손이 능숙하다.`},
      {type:'action',text:`${c1}, 멍하니 그 모습을 보다가.`},
      {type:'dialog',char:c1,paren:'작게',line:'...의외다.'},
      {type:'dialog',char:c2,paren:'작업하며, 눈 안 마주치고',line:'뭐가요.'},
      {type:'dialog',char:c1,paren:'',line:'이런 거 직접 하실 것 같지 않아서요.'},
      {type:'dialog',char:c2,paren:'',line:'완벽하게 하려면 직접 해야죠.'},
      {type:'dialog',char:c1,paren:'피식',line:'그게 완벽주의예요, 아니면 못 믿는 거예요?'},
      {type:'action',text:`${c2}, 손이 잠깐 멈춘다.`},
      {type:'dialog',char:c2,paren:'무감하게',line:'둘 다요.'},
      {type:'action',text:`${c1}, ${c2}를 본다. ${c2}는 계속 수도관을 본다. ${c1}, 왠지 모르게 시선을 거두지 못한다.`},
    ]},
    {heading:`S# 9. 시크릿가든 앞 골목 / 저녁 ? 엔딩 씬`,lines:[
      {type:'action',text:`해가 넘어가는 골목. ${c1}, 문 앞에 서서 낡은 간판 자리를 올려다본다.`},
      {type:'action',text:`손에 든 것 ? 직접 쓴 간판 시안.`},
      {type:'direction',text:`[INSERT ? 삐뚤빼뚤한 글씨로 쓴 종이: '시크릿가든 ??']`},
      {type:'action',text:`${c1}, 흐뭇하게 웃는다.`},
      {type:'action',text:`그때 뒤에서 ${c2}의 목소리.`},
      {type:'dialog',char:c2,paren:'O.S',line:'간판 허가 신청 하셨어요?'},
      {type:'action',text:`${c1}, 굳는다.`},
      {type:'dialog',char:c1,paren:'천천히 돌아보며',line:'...그것도 해야 해요?'},
      {type:'dialog',char:c2,paren:'',line:'건물 외벽 부착물은 구청 허가 사항입니다.'},
      {type:'dialog',char:c1,paren:'간판 시안을 등 뒤로 슬쩍 숨기며',line:'...몰랐어요.'},
      {type:'dialog',char:c2,paren:'소원의 등 뒤를 가리키며',line:'숨기셨는데 이미 봤습니다.'},
      {type:'action',text:`${c1}, 울상이 된다. ${c2}, ${c1}의 손에서 종이를 가져간다. 들여다본다.`},
      {type:'dialog',char:c2,paren:'아주 조용하게, 혼잣말처럼',line:'...시크릿가든.'},
      {type:'action',text:`${c2}의 표정이 미세하게 흔들린다. 아주 잠깐. ${c1}은 못 봤다.`},
      {type:'dialog',char:c2,paren:'종이를 돌려주며, 다시 무감하게',line:'허가 양식 올려드릴게요.'},
      {type:'action',text:`돌아서는 ${c2}. ${c1}, 종이를 받아 들고 그 뒷모습을 본다.`},
      {type:'dialog',char:c1,paren:'혼잣말',line:'저 사람, 표정이 잠깐 달라졌는데.'},
      {type:'action',text:`${c2}, 걸음을 멈추지 않는다. 그러나.`},
      {type:'action',text:`${c2}의 손이 주머니 안에서 살짝 말려든다. 시크릿가든 ? 그 이름을 그는 알고 있다.`},
      {type:'direction',text:'(화면, 천천히 암전)'},
      {type:'direction',text:'? 1화 끝 ?'},
    ]},
  ];

  // 2화 이후
  const stageMap=['갈등 심화','균열의 시작','감정 폭발','위기','화해','새 출발'];
  const stage=stageMap[Math.min(epIdx-1,stageMap.length-1)];
  return [
    {heading:`S# 1. ${epTitle} ? 오프닝 / 낮`,lines:[
      {type:'action',text:`${epIdx+1}화. ${stage}.`},
      {type:'action',text:`${c1}은 오늘도 ${setting}에 서 있다. 하지만 오늘은 뭔가 다르다.`},
      {type:'dialog',char:c1,paren:'혼잣말',line:'오늘은 꼭 제대로 해야 해.'},
      {type:'action',text:`${c1}, 건물을 올려다본다. 2층 창문에 불이 켜져 있다.`},
    ]},
    {heading:`S# 2. 복도 / 낮`,lines:[
      {type:'action',text:`${c1}과 ${c2}가 복도에서 마주친다.`},
      {type:'action',text:`둘 다 멈춘다. 짧은 침묵.`},
      {type:'dialog',char:c2,paren:'',line:'잠깐 얘기할 수 있어요?'},
      {type:'dialog',char:c1,paren:'경계하며',line:'...무슨 얘기요?'},
      {type:'dialog',char:c2,paren:'',line:'오래 걸리지 않아요.'},
      {type:'action',text:`${c1}, ${c2}를 따라 들어간다.`},
    ]},
    {heading:`S# 3. 사무실 / 낮`,lines:[
      {type:'action',text:`${c2}가 서류를 내민다.`},
      {type:'dialog',char:c2,paren:'',line:'이걸 보셔야 할 것 같아서요.'},
      {type:'action',text:`${c1}, 서류를 받아 든다. 읽어 내려가는 눈빛이 굳는다.`},
      {type:'dialog',char:c1,paren:'천천히',line:'이게... 무슨 뜻이에요?'},
      {type:'dialog',char:c2,paren:'',line:'말 그대로예요.'},
      {type:'action',text:`${c1}, 서류를 탁자에 내려놓는다. 손이 조금 떨린다.`},
      {type:'dialog',char:c1,paren:'낮게',line:'왜 이제야 말하는 거예요?'},
      {type:'action',text:`${c2}, 대답하지 않는다.`},
    ]},
    {heading:`S# 4. 상가 주방 / 낮`,lines:[
      {type:'action',text:`${c1}, 주방으로 돌아와 조리대에 손을 짚는다. 천천히 숨을 고른다.`},
      {type:'direction',text:'(E) 보글보글 ? 냄비 끓는 소리.'},
      {type:'action',text:`자동으로 손이 움직인다. 요리를 시작하는 ${c1}.`},
      {type:'dialog',char:c1,paren:'혼잣말',line:'괜찮아. 괜찮아. 엄마도 다 이겨냈잖아.'},
      {type:'action',text:`눈물 한 방울이 조리대 위에 떨어진다. ${c1}, 손등으로 닦고 다시 요리를 계속한다.`},
    ]},
    {heading:`S# 5. 복도 / 저녁`,lines:[
      {type:'action',text:`${c2}, 복도에 멈춰 선다. 주방에서 흘러나오는 국물 냄새.`},
      {type:'action',text:`발걸음이 저절로 그쪽으로 향한다.`},
      {type:'action',text:`문 앞에서 멈추는 ${c2}.`},
      {type:'dialog',char:c2,paren:'속으로',line:'...무슨 짓이야.'},
      {type:'action',text:`그러나 발이 안 떨어진다.`},
    ]},
    {heading:`S# 6. 엔딩 씬 / 밤`,lines:[
      {type:'action',text:`${epIdx+1}화 엔딩. 골목에 가로등이 켜진다.`},
      {type:'action',text:`${c1}, 상가 문을 잠그고 나온다.`},
      {type:'action',text:`${c2}, 2층 창가에서 그 모습을 내려다본다.`},
      {type:'action',text:`${c1}, 건물을 한 번 올려다본다. 그리고 걸어간다.`},
      {type:'action',text:`${c2}, 오래 그 뒷모습을 본다.`},
      {type:'direction',text:'페이드 아웃.'},
      {type:'direction',text:`? ${epIdx+1}화 끝 ?`},
    ]},
  ];
}


/* ===================================
   MODALS / TOAST
=================================== */
function showToast(msg,type='info',icon='??',dur=3500){
  const c=document.getElementById('toast-container');const id='t'+Date.now();
  const d=document.createElement('div');d.className='toast '+(type||'');d.id=id;
  d.innerHTML=`<span class="toast-icon">${icon}</span><span>${msg}</span><button class="toast-close" onclick="closeToast('${id}')">?</button>`;
  c.prepend(d);if(dur>0)setTimeout(()=>closeToast(id),dur);
}
function closeToast(id){const el=document.getElementById(id);if(!el)return;el.classList.add('hiding');setTimeout(()=>el.remove(),260);}

function showModal({icon='??',iconType='info',title,subtitle,body='',buttons=[]}){
  closeModal();
  const cls='modal-icon-'+iconType;
  const btns=buttons.map((b,i)=>`<button class="${b.style==='primary'?'btn btn-primary':b.style==='danger'?'btn btn-danger':'btn btn-ghost'}" id="mbtn-${i}">${b.label}</button>`).join('');
  document.getElementById('modal-container').innerHTML=`<div class="modal-backdrop" id="modal-backdrop" onclick="if(event.target.id==='modal-backdrop')closeModal()"><div class="modal-box"><div class="modal-header"><div class="modal-icon-wrap ${cls}">${icon}</div><div class="modal-header-text"><div class="modal-title">${title}</div>${subtitle?`<div class="modal-subtitle">${subtitle}</div>`:''}</div></div>${body?`<div class="modal-body">${body}</div>`:''}<div class="modal-footer">${btns}</div></div></div>`;
  buttons.forEach((b,i)=>{document.getElementById('mbtn-'+i)?.addEventListener('click',()=>{if(typeof b.action==='function')b.action();closeModal();});});
}
function closeModal(){const bd=document.getElementById('modal-backdrop');if(!bd)return;bd.classList.add('hiding');setTimeout(()=>{document.getElementById('modal-container').innerHTML='';},200);}

function showPdfModal(){showModal({icon:'??',iconType:'info',title:'PDF 내보내기',subtitle:'Pro 플랜 전용',body:'PDF 내보내기는 <strong>프로 플랜</strong> 이상에서 사용 가능합니다.',buttons:[{label:'닫기',style:'ghost'},{label:'Pro 체험 시작',style:'primary',action:()=>showPlanModal('pro')}]});}
function showNextEpModal(){showModal({icon:'??',iconType:'info',title:'다음 화 생성',subtitle:'다음 화 대본을 생성합니다',body:'데모 모드에서는 샘플 씬으로 표시됩니다.',buttons:[{label:'취소',style:'ghost'},{label:'생성',style:'primary',action:()=>showToast('샘플을 불러옵니다.','info','??')}]});}
function showPlanModal(plan){
  const plans={
    pro:{icon:'?',iconType:'info',title:'프로 플랜 ? 14일 무료 체험',subtitle:'₩29,000/월',body:'14일 무료 체험 후 결제가 시작됩니다. 현재 준비 중입니다.',buttons:[{label:'닫기',style:'ghost'},{label:'출시 알림 신청',style:'primary',action:()=>showToast('신청 완료!','success','??')}]},
    studio:{icon:'??',iconType:'confirm',title:'스튜디오 플랜 문의',subtitle:'₩99,000/월',body:'문의: hello@dramascript.ai',buttons:[{label:'닫기',style:'ghost'},{label:'이메일 문의',style:'primary',action:()=>showToast('hello@dramascript.ai','info','??',5000)}]}
  };
  if(plans[plan])showModal(plans[plan]);
}
function showDeleteAccountModal(){showModal({icon:'??',iconType:'confirm',title:'계정 삭제',subtitle:'이 작업은 되돌릴 수 없습니다',body:'계정과 모든 프로젝트가 <strong>영구 삭제</strong>됩니다. 정말 삭제하시겠습니까?',buttons:[{label:'취소',style:'ghost'},{label:'계정 삭제',style:'danger',action:()=>{handleLogout();clearAllProjects();showToast('계정이 삭제되었습니다.','success','???');}}]});}

/* ===================================
   SAMPLE IMAGE
=================================== */
(function(){const img=new Image();img.onload=function(){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);try{sampleImgUrl=c.toDataURL();}catch(e){sampleImgUrl=img.src;}};img.src='Sample_secretgardern.png';})();

/* ===================================
   시크릿가든 샘플 데이터
=================================== */
const DIRECTORS_ARENA_SAMPLE = {
  title:'디렉터스 아레나',
  platform:'OTT 오리지널',
  genre:'로맨틱 코미디',
  episodes:8,
  runtime:60,
  era:'현대 (2024년)',
  target:'25~35세 직장인·콘텐츠 종사자',
  setting:'서울 마포구 합정동 아레나 스튜디오 외',
  logline:'전직 스튜디오 룰루랄라 PD 조재헌과 전직 PPL 대행사 대표 오서영 ? 감각 vs 전략, 이야기 vs 숫자. 완전히 다른 두 사람이 숏폼 오디션 프로그램을 함께 만들며 매일 충돌하고, 그 충돌 속에서 서로가 서로의 빠진 조각임을 알아가는 로맨스.',
  chars:[
    {role:'남주',name:'조재헌',age:'34세',gender:'남성',job:'전 스튜디오 룰루랄라 PD / 아레나 스튜디오 공동대표',personality:'직관과 감각으로 승부. 숫자보다 이야기를 믿는다. 결핍: 성과는 있지만 진심을 표현 못해 관계를 놓쳐왔음.',looks:'단정하지 않은 캐주얼. 항상 목에 유선 헤드폰'},
    {role:'여주',name:'오서영',age:'32세',gender:'여성',job:'전 PPL 대행사 대표 / 아레나 스튜디오 공동대표',personality:'숫자와 협상으로 승부. 감정보다 전략 우선. 결핍: 완벽한 커리어 뒤 번아웃. 왜 이 일을 하는지 잊어버림.',looks:'항상 정장. 흐트러진 모습 절대 안 보임'},
    {role:'조연',name:'한태오',age:'28세',gender:'남성',job:'아레나 스튜디오 막내 PD',personality:'유튜브 세대 감각. 재헌의 영상 미학을 동경. 엉뚱한 아이디어로 판을 뒤집음'},
    {role:'조연',name:'이다인',age:'29세',gender:'여성',job:'경쟁사 콘텐츠 PM',personality:'서영의 절친이자 라이벌. 재헌에게 먼저 접근해 삼각 긴장 유발'},
    {role:'조연',name:'박승일',age:'45세',gender:'남성',job:'투자사 파트너',personality:'숫자만 본다. 서영에게만 신뢰를 보내며 공동대표 구조를 흔듦'},
    {role:'조연',name:'최예나',age:'24세',gender:'여성',job:'디렉터스 아레나 참가자 / 최종 우승자',personality:'SNS 1억 팔로워. 겉은 쿨, 재헌 피드백에 진심으로 흔들리며 성장'},
    {role:'조연',name:'김원준',age:'38세',gender:'남성',job:'케이블 편성부장',personality:'재헌의 전 상사. 프로그램 성공 후 러브콜로 재등장'},
  ],
  _planData:{
    title:'디렉터스 아레나',
    logline:'전직 스튜디오 룰루랄라 PD 조재헌과 전직 PPL 대행사 대표 오서영 ? 감각 vs 전략, 이야기 vs 숫자. 완전히 다른 두 사람이 숏폼 오디션 프로그램을 함께 만들며 매일 충돌하고, 그 충돌 속에서 서로가 서로의 빠진 조각임을 알아가는 로맨스.',
    synopsis:'조재헌(34)은 룰루랄라에서 300만 구독 채널을 키운 PD지만 전 상사 김원준에게 밀려나 개인 유튜버로 2년을 보냈다. 감각은 있지만 진심을 표현 못해 늘 혼자였다. 오서영(32)은 PPL 협상 성공률 98%의 전략가지만 일 말고는 아무것도 없는 자신을 마주하기 두렵다. 숫자는 있지만 이야기가 없었다.\n\n두 사람이 의기투합해 마포구 낡은 건물에 아레나 스튜디오를 차린다. 숏폼 오디션 프로그램 "디렉터스 아레나"를 만들기로 한 것. 그러나 첫 미팅부터 어젠다 순서가 충돌한다 ? 재헌은 콘텐츠 방향부터, 서영은 PPL 계약부터. 막내 PD 한태오의 엉뚱한 아이디어가 두 사람을 처음으로 같은 방향으로 돌아보게 한다.\n\n오디션 첫날, 재헌이 카메라를 직접 들고 뛰는 동안 서영은 PPL 담당자를 모니터 룸으로 안내한다. 둘이 완전히 다른 방식으로 같은 프로그램을 만든다. 최예나라는 참가자가 등장하는 순간, 두 사람이 처음으로 같은 눈빛을 교환한다.\n\n투자사 박승일이 재헌의 감각을 무시하고 서영에게만 신뢰를 보내며 균열이 생긴다. 서영의 절친 이다인이 경쟁사 PM으로 재헌에게 콜라보를 제안하며 삼각 긴장이 고조된다. 프로그램 바이럴 직후 박승일이 시즌2 투자 조건으로 서영 단독 결정권을 요구 ? 공동대표 구조를 깨라는 것.\n\n재헌의 전 상사 김원준이 편성 러브콜을 들고 재등장하면서 두 사람의 판단이 처음으로 완전히 갈린다. 진짜 싸움이 시작된다. 각자의 시간을 갖고 나서야, 재헌은 왜 콘텐츠를 만드는지, 서영은 뭘 잃었는지 다시 마주한다.\n\n파이널 무대 당일, 두 사람이 처음으로 서로의 방식에 진심으로 손을 내민다. 재헌이 서영의 데이터를 먼저 묻는다. 서영이 재헌의 감각을 먼저 묻는다. 최예나의 파이널 무대는 감각과 전략이 완벽히 맞아떨어진 순간 ? 두 사람이 만든 최초의 진짜 작품이다. 불 꺼진 세트장, 재헌이 먼저 손을 내민다. 서영이 잡는다.',
    visual:{
      colorTone:'서늘한 도시 블루+골드 톤. 낮엔 마포구 골목의 따뜻한 자연광, 밤엔 편집실 모니터 파란 빛.',
      shootingStyle:'오디션 현장은 다큐멘터리 핸드헬드. 두 사람 감정 씬은 고정 클로즈업. 바이럴 수치 씬엔 화면 그래픽 합성.',
      killingPoint:'편집실 나란한 모니터 불빛 아래 각자의 일을 하는 두 사람. 말 없이도 채워지는 공간.'
    },
    conflicts:[
      {color:'red',  label:'핵심 갈등 ? 감각 vs 전략', desc:'재헌은 좋은 콘텐츠가 답이라 믿고, 서영은 PPL 없이 제작사가 살아남을 수 없다고 믿는다. 매 에피소드 방향성 충돌이 자동으로 갈등 엔진 역할을 한다.'},
      {color:'gold', label:'과거 악연 ? 편성부장 김원준', desc:'재헌을 룰루랄라에서 내친 김원준이 성공 후 러브콜로 재등장. 재헌에겐 상처, 서영에겐 기회 ? 두 사람의 판단이 처음으로 완전히 갈린다.'},
      {color:'teal', label:'감정 갈등 ? 이다인의 개입', desc:'서영의 절친이자 경쟁사 PM 이다인이 재헌에게 먼저 접근. 서영은 질투를 인정하지 않으려 하고, 재헌은 서영의 감정을 눈치채면서도 먼저 말하지 못한다.'},
      {color:'ink',  label:'외부 압박 ? 투자사 단독 결정권 요구', desc:'박승일이 시즌2 투자 조건으로 서영 단독 결정권을 요구. 공동대표 구조를 깨라는 압박이 두 사람의 신뢰를 흔들고 프로그램 존폐를 위협한다.'},
    ],
    similar:{
      refs:[
        {title:'멜로가 체질',year:2019,eps:16,platform:'JTBC',genre:'로맨스·미디어',rating:'3.8',budget:'100억',budgetNum:100,tags:['30대','미디어','감성']},
        {title:'나의 해방일지',year:2022,eps:16,platform:'JTBC',genre:'로맨스·일상',rating:'8.6',budget:'150억',budgetNum:150,tags:['일상','번아웃','감성']},
        {title:'이번 생은 처음이라',year:2017,eps:16,platform:'tvN',genre:'로맨스·직장',rating:'6.0',budget:'80억',budgetNum:80,tags:['계약','직장','현실']},
        {title:'동백꽃 필 무렵',year:2019,eps:40,platform:'KBS2',genre:'로맨스·성장',rating:'23.8',budget:'130억',budgetNum:130,tags:['지방','성장','로맨스']},
        {title:'내 아이디는 강남미인',year:2018,eps:16,platform:'JTBC',genre:'로맨틱 코미디',rating:'7.2',budget:'85억',budgetNum:85,tags:['SNS','성장','로맨스']},
        {title:'식샤를 합시다 3',year:2018,eps:16,platform:'tvN',genre:'로맨스·직장',rating:'4.8',budget:'70억',budgetNum:70,tags:['콘텐츠','직장','음식']},
      ],
      diff:{
        plus:[
          {title:'미디어 산업 리얼리티 최초',desc:'숏폼·OTT 전쟁 시대의 콘텐츠 제작 현장을 정면으로 다루는 최초의 드라마. 콘텐츠 종사자 2030의 직접적 공감 유도 가능.'},
          {title:'갈등 구조 자동화',desc:'감각 vs 전략 대립이 외부 악당 없이도 매 에피소드 자동으로 갈등을 생성. 캐릭터 DNA가 스토리 엔진.'},
        ],
        minus:[
          {title:'업계 용어 진입 장벽',desc:'콘텐츠 제작 용어와 구조가 대중에게 낯설 수 있음. 오프닝 씬에서 세계관 온보딩 설계 필요.'},
          {title:'해외 유통 불확실',desc:'K-드라마 특유의 직군 감수성이 해외 시청자 어필 여부 미검증. OTT 알고리즘 타깃팅 전략 수립 필수.'},
        ],
      },
    },
    relations:{
      nodes:[
        {id:'jh', name:'조재헌', job:'PD·공동대표', role:'main',    x:340, y:130},
        {id:'sy', name:'오서영', job:'대표·전략가', role:'heroine', x:540, y:130},
        {id:'to', name:'한태오', job:'막내 PD',     role:'sub',     x:440, y:230},
        {id:'di', name:'이다인', job:'경쟁사 PM',   role:'sub',     x:660, y:200},
        {id:'ps', name:'박승일', job:'투자사',      role:'sub',     x:600, y:50},
        {id:'ye', name:'최예나', job:'참가자',      role:'sub',     x:200, y:200},
        {id:'kw', name:'김원준', job:'편성부장',    role:'sub',     x:180, y:60},
      ],
      edges:[
        {from:'jh', to:'sy', type:'romance',  label:'감각 vs 전략'},
        {from:'jh', to:'to', type:'friend',   label:'PD·멘토'},
        {from:'sy', to:'to', type:'friend',   label:'전략·지시'},
        {from:'sy', to:'di', type:'friend',   label:'절친·라이벌'},
        {from:'di', to:'jh', type:'rival',    label:'콜라보 제안'},
        {from:'ps', to:'sy', type:'pressure', label:'단독 결정권 요구'},
        {from:'ps', to:'jh', type:'pressure', label:'무시·불신'},
        {from:'kw', to:'jh', type:'rival',    label:'과거 상처'},
        {from:'kw', to:'sy', type:'neutral',  label:'편성 제안'},
        {from:'jh', to:'ye', type:'mentor',   label:'연출·피드백'},
        {from:'sy', to:'ye', type:'neutral',  label:'PPL·전략'},
      ],
    },
    stats:{
      budget:'134억', budgetRaw:'134000',
      avgEpBudget:'16.8억', avgEpRaw:'16800',
      ppl:'8.2억', pplRaw:'8200',
      netBudget:'125.8억', netRaw:'125800',
      scenes:'208씬', vfxRatio:'8%'
    },
    cast:[
      {charName:'조재헌 (남주)', role:'주연 남주', age:'34세', job:'전 룰루랄라 PD / 공동대표', personality:'감각파 콘텐츠 장인. 진심 표현 못함.',
       actors:[
         {name:'변우석', age:'32세', reason:'현재 최고 인지도. 지적 감성과 절제된 연기로 감각파 크리에이터 캐릭터 최적.', recentWork:'선재 업고 튀어 (2024)', feePerEp:'3000', rank:1, tier:'티어1'},
         {name:'채종협', age:'33세', reason:'OTT 흥행 검증. 감각적이면서도 차분한 캐릭터 설득력.', recentWork:'나쁜 엄마 (2023)', feePerEp:'2200', rank:2, tier:'티어2'},
         {name:'위하준', age:'35세', reason:'절제된 연기로 감정 서브텍스트 표현 탁월.', recentWork:'우리들의 블루스 (2022)', feePerEp:'2000', rank:3, tier:'티어2'},
       ]},
      {charName:'오서영 (여주)', role:'주연 여주', age:'32세', job:'전 PPL 대행사 대표 / 공동대표', personality:'전략파 비즈니스 마스터. 번아웃 숨김.',
       actors:[
         {name:'김지원', age:'31세', reason:'커리어우먼 이미지 최적. 차갑지만 내면 감성 표현 탁월.', recentWork:'눈물의 여왕 (2024)', feePerEp:'2800', rank:1, tier:'티어1'},
         {name:'전종서', age:'30세', reason:'카리스마 있는 도시적 이미지. 비즈니스 캐릭터 설득력.', recentWork:'콜 (2020)', feePerEp:'1800', rank:2, tier:'티어2'},
         {name:'이보영', age:'40세', reason:'커리어우먼 전문. 서브텍스트 연기 최고 수준.', recentWork:'마인 (2021)', feePerEp:'2500', rank:3, tier:'티어2'},
       ]},
      {charName:'한태오 (조연)', role:'조연', age:'28세', job:'막내 PD', personality:'MZ 감각. 엉뚱 아이디어맨.',
       actors:[
         {name:'홍경', age:'30세', reason:'밝고 유쾌한 MZ 에너지. 막내 PD 역할 최적.', recentWork:'이상한 변호사 우영우 (2022)', feePerEp:'700', rank:1, tier:'티어3'},
         {name:'이재욱', age:'30세', reason:'청량한 이미지. 코믹 타이밍 검증.', recentWork:'호텔 델루나 (2019)', feePerEp:'600', rank:2, tier:'티어3'},
         {name:'김민규', age:'27세', reason:'신예 에너지. SNS 팔로워 강점.', recentWork:'피노키오 (2022)', feePerEp:'400', rank:3, tier:'티어3'},
       ]},
      {charName:'이다인 (조연)', role:'조연', age:'29세', job:'경쟁사 PM', personality:'절친이자 라이벌. 삼각 긴장 유발.',
       actors:[
         {name:'천우희', age:'35세', reason:'입체적 조연 전문. 이다인의 복잡한 감정선 소화 최적.', recentWork:'어느날 (2021)', feePerEp:'700', rank:1, tier:'티어3'},
         {name:'이유미', age:'31세', reason:'도시적이고 세련된 이미지. 경쟁자 캐릭터 설득력.', recentWork:'스물다섯 스물하나 (2022)', feePerEp:'600', rank:2, tier:'티어3'},
         {name:'오나라', age:'49세', reason:'베테랑 조연. 극적 무게감 추가.', recentWork:'동백꽃 필 무렵 (2019)', feePerEp:'500', rank:3, tier:'티어3'},
       ]},
    ],
    locations:[
      {name:'아레나 스튜디오 사무실 (주 배경)', type:'세트', desc:'합정동 낡은 건물 2층. 재헌 쪽은 레퍼런스 포스트잇과 카메라 장비, 서영 쪽은 엑셀 바인더와 계약서가 정렬. 두 사람의 세계관 차이가 공간으로 드러남.', mood:'낮엔 자연광 따뜻, 밤엔 나란한 모니터 파란 빛', episodes:'전 회차', buildCost:'3500', rentCost:'0'},
      {name:'오디션 스튜디오 (오디션 씬)', type:'실내 로케이션', desc:'소규모 촬영 스튜디오. 참가자 무대 + 모니터 룸 구조. 재헌이 카메라를 직접 들고 뛰는 역동적 촬영 공간.', mood:'차가운 조명, 무대 위 스포트라이트', episodes:'1·2·3·5·8화', buildCost:'0', rentCost:'800'},
      {name:'합정동 골목 (외부)', type:'실외 로케이션', desc:'오래된 상점들 사이 낡은 건물. 두 사람이 각자 생각을 정리하거나 우연히 마주치는 공간. 드라마의 감성 랜드마크.', mood:'빈티지 마포구 골목, 골든아워 따뜻한 빛', episodes:'1·4·6·7화', buildCost:'0', rentCost:'200'},
      {name:'투자사 회의실', type:'실내 로케이션', desc:'유리 파티션의 현대적 사무공간. 박승일이 두 사람을 압박하는 권력 씬. 스튜디오와 대비되는 차갑고 넓은 공간.', mood:'차갑고 넓은 유리 공간, 권력 감성', episodes:'3·5·7화', buildCost:'0', rentCost:'400'},
      {name:'파이널 세트장', type:'실내 로케이션', desc:'디렉터스 아레나 파이널 방송 현장. 화려한 무대 조명과 관객석. 두 사람의 감각+전략이 최초로 완벽하게 맞아떨어지는 공간.', mood:'극적인 무대 조명, 화려하지만 따뜻한 앰버 톤', episodes:'8화', buildCost:'0', rentCost:'1200'},
      {name:'각자의 공간 (재헌 자취방·서영 사무실)', type:'세트', desc:'7화 분리 에피소드. 재헌의 어수선하지만 따뜻한 방 vs 서영의 완벽하게 정리된 사무실. 두 사람의 내면이 드러나는 대비 공간.', mood:'대비: 재헌=어수선한 온기 / 서영=차갑게 정돈된 공간', episodes:'7화', buildCost:'1800', rentCost:'0'},
    ],
    budgetBreakdown:[
      {ep:1,items:{'로케이션·세트':1400,'출연료':3200,'스태프 인건비':5100,'촬영 장비':2000,'미술·소품':500,'의상·분장':420,'VFX':280,'음악·효과음':350,'후반 작업':650,'기타':450},vfxDetail:'오프닝 타이틀 시퀀스 모션그래픽, 스튜디오 간판 합성'},
      {ep:2,items:{'로케이션·세트':900,'출연료':3200,'스태프 인건비':5100,'촬영 장비':1800,'미술·소품':280,'의상·분장':320,'VFX':160,'음악·효과음':290,'후반 작업':560,'기타':360},vfxDetail:'SNS 피드 화면 합성, 실시간 수치 그래픽'},
      {ep:3,items:{'로케이션·세트':1200,'출연료':3200,'스태프 인건비':5100,'촬영 장비':1900,'미술·소품':360,'의상·분장':360,'VFX':200,'음악·효과음':300,'후반 작업':600,'기타':380},vfxDetail:'투자사 회의실 데이터 시각화 그래픽'},
      {ep:4,items:{'로케이션·세트':850,'출연료':3200,'스태프 인건비':5100,'촬영 장비':1800,'미술·소품':260,'의상·분장':300,'VFX':130,'음악·효과음':270,'후반 작업':520,'기타':330},vfxDetail:'편집실 모니터 화면 합성'},
      {ep:5,items:{'로케이션·세트':1100,'출연료':3200,'스태프 인건비':5100,'촬영 장비':1900,'미술·소품':340,'의상·분장':340,'VFX':420,'음악·효과음':330,'후반 작업':640,'기타':400},vfxDetail:'바이럴 수치 폭발 그래픽, 숏폼 영상 컷 합성 다수'},
      {ep:6,items:{'로케이션·세트':1300,'출연료':3200,'스태프 인건비':5100,'촬영 장비':1950,'미술·소품':400,'의상·분장':370,'VFX':220,'음악·효과음':300,'후반 작업':580,'기타':380},vfxDetail:'편성사 회의실 외부 로케이션'},
      {ep:7,items:{'로케이션·세트':2000,'출연료':3200,'스태프 인건비':5100,'촬영 장비':1800,'미술·소품':280,'의상·분장':310,'VFX':150,'음악·효과음':280,'후반 작업':530,'기타':340},vfxDetail:'재헌 자취방 세트 제작, 서영 사무실 세트 제작'},
      {ep:8,items:{'로케이션·세트':1800,'출연료':3500,'스태프 인건비':5400,'촬영 장비':2200,'미술·소품':550,'의상·분장':450,'VFX':900,'음악·효과음':450,'후반 작업':900,'기타':550},vfxDetail:'파이널 무대 특수조명·스모크, 타이틀 시퀀스 최종본, 엔딩 크레딧'},
    ],
  },
  _episodes:[
    {num:1,title:'우리, 같이 망해볼까요',logline:'완전히 다른 두 사람이 제작사를 차리고 첫날부터 매 결정마다 충돌한다',story:'조재헌이 개인 유튜버로 지내던 중 오서영의 접촉을 받는다. 합정 작업실 첫 미팅, 어젠다부터 충돌. 막내 PD 한태오의 시청자 실시간 컷 아이디어가 두 사람을 처음으로 같은 방향으로 만든다. 계약서에 사인하는 순간 시선이 마주치다 동시에 돌아선다.',keyScene:'작업실 첫 미팅에서 어젠다 순서를 놓고 충돌. 태오의 아이디어로 처음으로 둘이 같은 방향을 본다.',ending:'계약서에 사인하는 두 손 ? 동시에 올려다본 눈이 마주쳤다가 각자 다른 곳으로. 암전.',
     scenes:[
       {num:'S#1',loc:'합정동 골목·건물 앞 / 낮',chars:['재헌'],desc:'헤드폰을 목에 건 재헌이 커피 두 잔을 들고 계단을 오른다. 문을 여는 순간 이미 노트북 오픈하고 앉아있는 서영. 재헌의 얼굴이 굳는다.'},
       {num:'S#2',loc:'작업실 / 낮',chars:['재헌','서영'],desc:'서영이 바로 어젠다를 꺼낸다. "PPL 협의 → 참가자 모집 → 편집 방향." 재헌 "편집 방향부터요." 서영 "PPL 없이 편집 방향이 어떻게 나와요." 첫 충돌, 1분도 안 걸렸다.'},
       {num:'S#3',loc:'작업실 / 낮',chars:['재헌','서영','태오'],desc:'태오가 달려온다. "심사위원 없애고 시청자가 실시간으로 컷 누르면 어때요?" 서영이 PPL 계산을 중얼거리다 멈춘다. 재헌 "그럼 된다는 거죠?" 서영, 대답 대신 노트에 계산을 시작한다. 처음으로 같은 방향.'},
       {num:'S#4',loc:'작업실 / 오후',chars:['재헌','서영'],desc:'두 사람이 나란히 기획안 초안을 만든다. 재헌이 쓰면 서영이 고치고, 서영이 쓰면 재헌이 고친다. 말은 없지만 손이 계속 움직인다. 어느 순간 둘 다 멈추고 기획안을 바라본다. 나쁘지 않다.'},
       {num:'S#5',loc:'작업실 / 오후',chars:['재헌','서영'],desc:'계약서 협의. 재헌 "공동 결정권은 필수." 서영 "투자사가 단일 창구를 원할 경우?" 재헌 "그러면 안 해요." 서영이 재헌을 한참 본다. 처음으로 먼저 양보한다. "알겠습니다."'},
       {num:'S#6',loc:'작업실 / 저녁',chars:['재헌','서영'],desc:'태오가 나가고 둘만 남는다. 재헌이 커피를 서영 쪽으로 민다. 라벨: 카페라테. 서영 "어떻게 알았어요." 재헌 "어제 쓰레기통에 같은 컵 있었어요." 서영이 굳다가 커피를 가져간다.'},
       {num:'S#7',loc:'작업실 / 밤',chars:['재헌','서영'],desc:'계약서 최종 검토. 재헌 "후회 없으시죠?" 서영 "후회는 결과 나오고 하는 거예요." 재헌 "그럼 결과 만들면 되겠네요." 서영이 처음으로 웃는다. 아주 잠깐.'},
       {num:'S#8',loc:'작업실 / 밤 (엔딩)',chars:['재헌','서영'],desc:'계약서에 사인하는 두 손. 동시에 펜을 내려놓는다. 동시에 서로를 올려다본다. 눈이 마주친다. 동시에 다른 곳으로 시선을 돌린다. (엔딩) 나란히 놓인 두 펜 클로즈업 ? 암전.'},
     ]},
    {num:2,title:'당신이 만드는 게 뭔지 알아요?',logline:'오디션 첫날. PPL vs 연출의 첫 전쟁. 현장에서 처음으로 서로의 실력을 본다',story:'오디션 첫날. 재헌이 카메라 앵글을 직접 조정하고, 서영이 PPL 담당자를 데리고 온다. 재헌이 막자 서영이 모니터 룸으로 안내해 해결한다. 최예나의 원테이크 퍼포먼스에 두 사람이 처음으로 같은 눈빛을 교환한다. 저녁 재헌이 야근하다 잠든 서영에게 재킷을 덮어준다.',keyScene:'최예나의 원테이크 씬에서 두 사람이 동시에 멈춘다. 재헌 "이 애, 뭔가 있어요." 서영 "...네." 처음으로 판단이 일치.',ending:'잠든 서영에게 재킷을 덮어준 재헌이 불을 끄고 나간다. 서영이 눈을 살짝 떴다가 감는다. 재킷을 끌어당긴다 ? 암전.',
     scenes:[
       {num:'S#1',loc:'아레나 스튜디오 / 아침',chars:['재헌','서영','태오'],desc:'오디션 첫날 아침. 재헌이 카메라 앵글을 조정하는 중 서영이 PPL 담당자 2명을 데리고 들어온다. 재헌이 멈춘다. 서영이 먼저 재헌의 표정을 읽고 담당자들에게 "모니터 룸으로 안내할게요"라고 처리한다.'},
       {num:'S#2',loc:'오디션 스튜디오 / 낮',chars:['재헌','태오','참가자들'],desc:'참가자들 대기. 재헌이 태오에게 카메라 위치를 지시한다. "왜 이 각도요?" 재헌이 직접 카메라를 잡고 보여준다. 태오의 눈이 커진다.'},
       {num:'S#3',loc:'모니터 룸 / 낮',chars:['서영','PPL담당자들'],desc:'서영이 PPL 노출 포인트를 설명한다. 담당자 "카메라가 제품에 오래 머물지 않는데요." 서영 "자연 노출이 기억에 더 오래 남습니다. 2배 효과 데이터 있어요." 담당자들이 고개를 끄덕인다.'},
       {num:'S#4',loc:'오디션 스튜디오 / 낮',chars:['재헌','서영','태오','최예나'],desc:'최예나(24)가 등장. 분위기가 달라진다. 서영이 모니터 룸에서 나와 스튜디오 문 앞에 선다. 재헌이 카메라를 들고 예나에게 다가간다.'},
       {num:'S#5',loc:'오디션 스튜디오 / 낮',chars:['재헌','서영','최예나'],desc:'최예나의 원테이크 퍼포먼스. 재헌이 카메라를 들고 뛰며 앵글을 잡는다. 서영이 PPL 타임라인을 멈추고 핸드폰을 내려놓는다. 끝나고 정적. 재헌 "이 애, 뭔가 있어요." 서영 "...네." 처음 판단 일치.'},
       {num:'S#6',loc:'아레나 스튜디오 / 저녁',chars:['재헌','서영','태오'],desc:'촬영 종료. 태오가 나간다. 재헌과 서영 처음으로 둘만 남는다. 어색한 침묵.'},
       {num:'S#7',loc:'아레나 스튜디오 / 밤',chars:['서영'],desc:'재헌이 나간 후 서영 혼자 PPL 제안서 수정. 빈 커피컵 두 개. 잠들어버린다.'},
       {num:'S#8',loc:'아레나 스튜디오 / 밤 (엔딩)',chars:['재헌','서영'],desc:'편의점 봉투를 들고 돌아온 재헌, 잠든 서영을 발견한다. 1초 바라본다. 재킷을 덮어준다. 불을 끄고 나간다. (엔딩) 서영이 눈을 살짝 떴다가 감는다. 재킷을 끌어당긴다 ? 암전.'},
     ]},
    {num:3,title:'숫자가 전부는 아니야',logline:'투자사 중간 보고. 박승일이 재헌을 무시하고 서영만 신뢰한다',story:'투자사 박승일의 중간 보고. 재헌은 영상 퀄리티 자료, 서영은 PPL 수익 데이터를 준비한다. 박승일이 재헌의 발표를 3분 만에 끊으며 "숫자로 주세요."라고 한다. 서영이 재헌 몫까지 발표를 이어받아 정리한다. 끝나고 재헌이 묻는다. "당신도 그렇게 생각해요?" 서영이 대답하지 못한다.',keyScene:'나오는 길에 재헌 "당신도 내 방식이 틀렸다고 생각해요?" 서영 "..." 재헌 "아니라고 말 못하는 거랑 말 안 하는 거는 다른데." 서영 "...알아요."',ending:'편집본 마지막 컷에서 재헌과 서영이 동시에 "이거다"라고 말한다. 서로 쳐다본다. 둘 다 웃음을 참는다 ? 암전.',
     scenes:[
       {num:'S#1',loc:'아레나 스튜디오 / 아침',chars:['재헌','서영'],desc:'중간 보고 준비. 재헌이 영상 클립 자료, 서영이 PPL 수익 데이터를 각자 정리한다. 자료 포맷이 완전히 다르다. 각자 따로 발표하기로.'},
       {num:'S#2',loc:'투자사 회의실 / 낮',chars:['재헌','서영','박승일'],desc:'박승일이 재헌의 발표를 3분 만에 끊는다. "숫자로 주시면 좋겠어요." 재헌이 굳는다. 서영이 재헌 몫까지 자연스럽게 이어받아 데이터로 재해석한다.'},
       {num:'S#3',loc:'투자사 로비 / 낮',chars:['재헌','서영'],desc:'나오는 길. 재헌이 먼저 걷는다. 서영이 따라가며 "잘 마무리됐어요."라고 말한다. 재헌 "당신이 마무리한 거죠." 서영 "팀 발표예요." 재헌이 멈추고 돌아본다.'},
       {num:'S#4',loc:'아레나 스튜디오 복도 / 낮',chars:['재헌','서영'],desc:'재헌 "당신도 내 방식이 틀렸다고 생각해요?" 서영이 대답하지 못한다. 재헌 "아니라고 말 못하는 거랑 말 안 하는 거는 다른데." 서영 "...알아요." 긴 침묵.'},
       {num:'S#5',loc:'아레나 스튜디오 / 오후',chars:['태오'],desc:'태오가 1화 편집 초안을 완성한다. "이거... 터질 것 같은데." 두 대표에게 달려간다.'},
       {num:'S#6',loc:'아레나 스튜디오 / 오후',chars:['재헌','서영','태오'],desc:'태오가 편집본을 틀어준다. 세 사람이 화면을 본다.'},
       {num:'S#7',loc:'아레나 스튜디오 / 밤',chars:['재헌','서영'],desc:'나란히 앉아 편집본을 처음부터 다시 본다. 말 없이.'},
       {num:'S#8',loc:'아레나 스튜디오 / 밤 (엔딩)',chars:['재헌','서영'],desc:'최예나의 클로즈업 마지막 컷. 재헌과 서영이 동시에 "이거다"라고 말한다. 서로 쳐다본다. 둘 다 웃음을 참는다. (엔딩) 화면에 반사된 두 사람 얼굴 ? 암전.'},
     ]},
    {num:4,title:'이다인이 왔다',logline:'서영의 절친이자 라이벌 이다인이 재헌에게 먼저 손을 내민다',story:'경쟁사 PM 이다인이 재헌에게 콜라보를 제안하며 접근한다. 서영은 비즈니스로 받아들이려 하지만 이다인이 재헌을 바라보는 시선이 마음에 걸린다. 재헌이 이다인의 제안을 거절한다. 저녁 혼자 남은 사무실에서 서영이 재헌의 자리를 한참 바라본다.',keyScene:'이다인이 명함을 건넨다. 재헌이 받지 않는다. "저는 여기 사람이에요." 서영이 표정을 관리한다.',ending:'재헌이 나간 사무실. 서영이 재헌 자리의 헤드폰을 본다. 노트북을 연다. 아무것도 치지 않는다 ? 암전.',
     scenes:[
       {num:'S#1',loc:'아레나 스튜디오 / 낮',chars:['서영','이다인'],desc:'이다인이 커피를 들고 방문. 겉으론 친구 방문이지만 눈이 사무실을 훑는다. "여기 생각보다 괜찮네." 서영 "일하러 왔어?" 이다인 "보러 왔지."'},
       {num:'S#2',loc:'아레나 스튜디오 / 낮',chars:['재헌','이다인'],desc:'재헌이 들어온다. 이다인이 먼저 손을 내민다. "조재헌 PD님, 팬이에요." 재헌이 악수한다. 서영이 이 장면을 본다.'},
       {num:'S#3',loc:'아레나 스튜디오 / 낮',chars:['재헌','서영','이다인','태오'],desc:'이다인이 콜라보 제안을 꺼낸다. 태오 "오 그거 괜찮은데요"라고 반응하자 서영이 태오를 본다. 재헌은 아무 말이 없다.'},
       {num:'S#4',loc:'회의실 / 낮',chars:['재헌','서영'],desc:'이다인이 자리를 비운 사이 재헌이 서영에게 묻는다. "어떻게 생각해요, 이 제안?" 서영 "비즈니스적으론 나쁘지 않아요." 재헌 "그게 서영씨 생각이에요?" 서영이 대답하지 않는다.'},
       {num:'S#5',loc:'아레나 스튜디오 앞 / 저녁',chars:['재헌','서영','이다인'],desc:'이다인이 나가며 재헌에게 명함을 건넨다. 재헌이 받지 않는다. "저는 여기 사람이에요." 이다인이 서영을 한 번 보고 웃으며 간다. 서영이 표정을 관리한다.'},
       {num:'S#6',loc:'아레나 스튜디오 / 저녁',chars:['재헌','서영'],desc:'이다인이 떠난 후. 재헌 "친한 사이예요?" 서영 "어렸을 때부터요." 재헌 "..." 서영 "왜요?" 재헌 "아니요." 재헌이 자리로 돌아간다.'},
       {num:'S#7',loc:'아레나 스튜디오 / 밤',chars:['재헌'],desc:'재헌이 헤드폰을 끼고 편집한다. 태오 문자: "대표님들 사이 뭔가 있죠?" 재헌이 문자를 보고 헤드폰을 고쳐 낀다.'},
       {num:'S#8',loc:'아레나 스튜디오 / 밤 (엔딩)',chars:['서영'],desc:'재헌이 나간 후 서영 혼자. 재헌 자리의 헤드폰을 본다. 노트북을 연다. 아무것도 치지 않는다. (엔딩) 커서만 깜빡이는 빈 화면 ? 암전.'},
     ]},
    {num:5,title:'디렉터스 아레나, 터졌다',logline:'500만 바이럴 직후. 성공의 순간 투자사가 균열을 만든다',story:'최예나 편 조회수 500만. 세 사람이 처음으로 같이 기뻐한다. 박승일의 축하 전화에 서영의 표정이 굳는다. 시즌2 투자 조건: 서영 단독 결정권. 재헌에게 이 사실을 전한다. 재헌이 계약서 수정본을 받아들고 서랍에 넣었다가 다시 꺼낸다.',keyScene:'서영이 조건을 말한다. 재헌 "서영씨 의견은요?" 서영 "..." 재헌 "먼저 생각하고 얘기해요." 돌아서 들어간다.',ending:'재헌이 수정본을 서랍에 넣었다가 다시 꺼낸다. 다시 넣는다. 손을 서랍 위에 얹는다. 모니터 불빛이 꺼진다 ? 암전.',
     scenes:[
       {num:'S#1',loc:'아레나 스튜디오 / 아침',chars:['태오'],desc:'태오가 핸드폰을 들고 뛰어 들어온다. "대표님들! 예나 편 500만 넘었어요!!" 두 대표실 문을 동시에 두드린다.'},
       {num:'S#2',loc:'아레나 스튜디오 / 아침',chars:['재헌','서영','태오'],desc:'세 사람이 실시간 수치를 본다. 태오가 소리를 지른다. 재헌이 웃는다. 서영이 수치를 기록한다. 재헌이 서영을 본다. "기록해요?" 서영 "기록해야죠." 재헌 "그것도 맞네요."'},
       {num:'S#3',loc:'아레나 스튜디오 / 낮',chars:['서영'],desc:'박승일 축하 전화. 서영이 받다가 표정이 굳는다.'},
       {num:'S#4',loc:'복도 / 낮',chars:['서영'],desc:'서영이 복도에 혼자 선다. 재헌의 사무실 문을 본다. 노크하려다 멈춘다.'},
       {num:'S#5',loc:'복도 / 낮',chars:['재헌','서영'],desc:'재헌이 나오다 서영과 마주친다. 서영이 조건을 말한다. 재헌 "그래서요?" 서영 "당신 의견을 묻는 거예요." 재헌 "서영씨 의견은요?" 서영 "..." 재헌 "먼저 생각하고 얘기해요."'},
       {num:'S#6',loc:'서영 사무실 / 오후',chars:['서영'],desc:'서영이 혼자 계약서 조건을 검토한다. 재헌 이름이 들어간 공동대표 항목을 본다. 지우지 않는다.'},
       {num:'S#7',loc:'재헌 사무실 / 저녁',chars:['재헌'],desc:'재헌이 박승일이 보낸 계약서 수정본을 출력해 들고 있다. 읽다가 내려놓는다. 또 든다. 또 내려놓는다.'},
       {num:'S#8',loc:'재헌 사무실 / 밤 (엔딩)',chars:['재헌'],desc:'수정본을 서랍에 넣는다. 닫는다. 다시 꺼낸다. 다시 넣는다. 손을 서랍 위에 얹는다. 모니터 불빛이 꺼진다. (엔딩) 어두운 사무실 ? 암전.'},
     ]},
    {num:6,title:'우리가 만든 게 아니야',logline:'편성부장 김원준의 재등장. 재헌에게는 상처, 서영에게는 기회 ? 처음으로 다른 방향',story:'전 상사 김원준이 편성 제안을 들고 나타난다. 재헌에게는 사과와 편성 제안, 서영에게는 더 큰 비즈니스 기회. 재헌이 거절한다. 서영이 망설인다. 두 사람이 처음으로 진짜 싸운다.',keyScene:'재헌 "이게 당신이 원하던 거잖아요." 서영 "당신이 원하던 게 뭔지 물어봤어요? 지금까지 한 번도요." 재헌이 말을 찾는다. 찾지 못한다.',ending:'두 사람이 서로 다른 방향으로 걷는다. 복도 끝에서 동시에 멈춘다. 돌아보지 않는다 ? 암전.',
     scenes:[
       {num:'S#1',loc:'아레나 스튜디오 / 낮',chars:['재헌'],desc:'재헌이 편집하다 전화를 받는다. 김원준. 재헌의 손이 멈춘다.'},
       {num:'S#2',loc:'카페 / 낮',chars:['재헌','김원준'],desc:'김원준이 사과를 한다. "그때 내가 틀렸어." 편성 제안서를 내민다. 재헌이 보지 않는다.'},
       {num:'S#3',loc:'아레나 스튜디오 / 오후',chars:['서영','김원준'],desc:'김원준이 서영에게 찾아온다. "현명한 사람이잖아요." 서영이 제안서를 받는다. 읽는다.'},
       {num:'S#4',loc:'아레나 스튜디오 / 오후',chars:['재헌','서영'],desc:'서영이 재헌에게 제안서를 보여준다. "나쁘지 않아요." 재헌 "거절할 거예요." 서영 "이유요?" 재헌 "개인적인 이유요." 서영 "개인적인 이유로 비즈니스 결정?"'},
       {num:'S#5',loc:'아레나 스튜디오 / 저녁',chars:['재헌','서영'],desc:'목소리가 높아진다. 태오가 눈치 보며 나간다. 처음으로 진짜 싸우는 두 사람.'},
       {num:'S#6',loc:'복도 / 저녁',chars:['재헌','서영'],desc:'재헌 "이게 당신이 원하던 거잖아요." 서영 "당신이 원하던 게 뭔지 물어봤어요? 지금까지 한 번도요." 재헌이 말을 찾는다. 찾지 못한다.'},
       {num:'S#7',loc:'복도 / 저녁',chars:['재헌','서영'],desc:'긴 침묵. 서영이 먼저 걷는다. 재헌이 반대 방향으로 걷는다.'},
       {num:'S#8',loc:'복도 / 저녁 (엔딩)',chars:['재헌','서영'],desc:'복도 끝에서 둘 다 멈춘다. 돌아보지 않는다. (엔딩) 복도 양 끝의 두 실루엣 ? 암전.'},
     ]},
    {num:7,title:'아레나 밖에서',logline:'각자의 시간. 재헌은 왜 시작했는지, 서영은 뭘 잃었는지 다시 마주한다',story:'촬영을 잠깐 멈추고 각자의 시간. 재헌이 룰루랄라 시절 영상 아카이브를 꺼내보고, 서영이 첫 PPL 제안서를 다시 읽는다. 태오가 각자를 찾아가 "두 분이 싸우면 저는 누구 편이에요?"라고 묻는다. 저녁 재헌이 서영 사무실 앞에 선다. 노크하려다 멈춘다. 문 안에서 서영도 멈춰있다.',keyScene:'재헌이 문에 손을 댄다. 노크하지 않는다. 그냥 손을 댄 채로 있다.',ending:'문에 닿은 재헌의 손. 노크하지 않는다. (엔딩) 어두운 복도, 문에 닿은 손 ? 암전.',
     scenes:[
       {num:'S#1',loc:'재헌 자취방 / 낮',chars:['재헌'],desc:'재헌이 오래된 외장하드를 꺼낸다. 룰루랄라 시절 영상들. 재생하는 재헌. 화면 속 재헌은 지금보다 가벼워보인다.'},
       {num:'S#2',loc:'서영 사무실 / 낮',chars:['서영'],desc:'서영이 서랍에서 첫 PPL 제안서를 꺼낸다. 신입 시절 손으로 쓴 제안서. 처음엔 단순했다.'},
       {num:'S#3',loc:'편의점 앞 / 낮',chars:['재헌','태오'],desc:'태오를 우연히 마주친 재헌. 태오 "두 분 싸운 거예요?" 재헌 "..." 태오 "저는 누구 편이에요?" 재헌 "편 없어." 태오 "그럼 화해하세요."'},
       {num:'S#4',loc:'카페 / 낮',chars:['서영','태오'],desc:'태오가 서영에게도 나타난다. "재헌 대표님이 오늘 밥을 안 먹었어요." 서영 "그게 왜요." 태오 "그냥요." 서영이 태오를 한참 본다.'},
       {num:'S#5',loc:'아레나 스튜디오 편집실 / 저녁',chars:['재헌'],desc:'재헌이 최예나 편집본을 다시 본다. 처음 봤을 때 서영이 "...네"라고 했던 순간이 생각난다.'},
       {num:'S#6',loc:'서영 사무실 앞 복도 / 저녁',chars:['재헌','서영'],desc:'재헌이 서영 사무실 앞에 선다. 노크하려다 멈춘다. 문 안에서 서영이 소리를 듣고 일어나다 멈춘다. 둘 다 문을 사이에 두고 서 있다.'},
       {num:'S#7',loc:'서영 사무실 / 밤',chars:['서영'],desc:'재헌의 발소리가 멀어진다. 서영이 천천히 의자에 앉는다. 첫 제안서를 다시 본다. "같이 만들고 싶었던 것"이라고 적혀있다.'},
       {num:'S#8',loc:'복도 / 밤 (엔딩)',chars:['재헌'],desc:'재헌이 문에 손을 댄다. 노크하지 않는다. (엔딩) 어두운 복도, 문에 닿은 손 ? 암전.'},
     ]},
    {num:8,title:'디렉터스 아레나, 파이널',logline:'파이널 무대와 동시에 두 사람도 완성된다',story:'파이널 방송 당일. 재헌이 서영의 데이터를 먼저 묻고, 서영이 재헌의 감각을 먼저 묻는다. 최예나의 파이널 무대는 감각과 전략이 완벽히 맞아떨어진 순간. 서영이 박승일의 단독 결정권 조건을 거절하고 재협상했음을 재헌에게 말한다. 불 꺼진 세트장. 재헌이 먼저 손을 내민다.',keyScene:'서영 "이번엔 제가 먼저 물어볼게요. 재헌씨 원하는 게 뭐예요?" 재헌이 서영의 손을 잡는다.',ending:'시크릿 ? 아니, 디렉터스 아레나 간판에 불이 켜진다. 골목 불빛 아래 두 사람 ? 화면 천천히 페이드 아웃.',
     scenes:[
       {num:'S#1',loc:'아레나 스튜디오 / 아침',chars:['재헌','서영'],desc:'파이널 당일 아침. 재헌이 먼저 서영 사무실 문을 두드린다. "오늘 PPL 타이밍 알려줘요." 서영이 재헌을 올려다본다. "지금 묻는 거예요?" 재헌 "네." 서영이 자료를 건넨다.'},
       {num:'S#2',loc:'파이널 세트장 / 낮',chars:['재헌','서영','태오','최예나'],desc:'파이널 준비. 긴장한 예나. 재헌 "떨려야 돼. 안 떨리면 가짜야." 서영이 예나에게 PPL 동선을 알려준다. 예나가 재헌을 보며 "이게 맞아요?" 재헌 "서영씨 말이 맞아요."'},
       {num:'S#3',loc:'파이널 세트장 / 낮',chars:['서영'],desc:'서영이 박승일의 문자를 받는다. "오늘 파이널 후 결정 부탁드립니다." 서영이 재헌이 예나와 이야기하는 모습을 본다. 결정은 이미 났다.'},
       {num:'S#4',loc:'파이널 세트장 / 저녁',chars:['재헌','서영','태오','최예나'],desc:'파이널 무대 시작. 재헌이 카메라를 직접 든다. 서영이 PPL 타임라인을 손에 쥔 채 무대를 본다.'},
       {num:'S#5',loc:'파이널 세트장 / 저녁',chars:['최예나','재헌','서영'],desc:'최예나의 파이널 무대. 재헌의 감각과 서영의 전략이 한 무대에서 완벽히 맞아떨어지는 순간.'},
       {num:'S#6',loc:'백스테이지 / 저녁',chars:['재헌','서영'],desc:'재헌 "박승일한테 뭐라고 할 거예요?" 서영 "...이미 했어요." 재헌 "뭐라고요?" 서영 "공동 결정권 유지 조건으로 재협상." 재헌이 서영을 본다.'},
       {num:'S#7',loc:'불 꺼진 세트장 / 밤',chars:['재헌','서영'],desc:'두 사람만 남는다. 재헌 "다음에도 같이 할 수 있어요?" 서영 "조건이 있어요." 재헌 "뭔데요." 서영 "이번엔 제가 먼저 물어볼게요. 재헌씨 원하는 게 뭐예요?"'},
       {num:'S#8',loc:'세트장 앞 골목 / 밤 (엔딩)',chars:['재헌','서영'],desc:'재헌이 서영의 손을 잡는다. 서영이 잡힌 손을 내려다보다 웃는다. 간판에 불이 켜진다 ? DIRECTORS ARENA. (엔딩) 골목 불빛 아래 두 사람 ? 화면 천천히 페이드 아웃.'},
     ]},
  ],
  _synopsis:'[기획 배경] 2024년 숏폼 전쟁의 시대. 조재헌(34)은 스튜디오 룰루랄라에서 오디션 클립 하나로 300만 구독 채널을 만든 PD다. 콘텐츠 감각은 업계 최고지만 숫자를 무시한다는 이유로 전 상사 김원준에게 밀려나 2년째 개인 유튜버로 지낸다. 진심을 표현 못해 관계를 늘 놓쳐왔다. 오서영(32)은 PPL 계약 성공률 98%의 협상 전략가. 어떤 브랜드도 드라마 한 편에 자연스럽게 녹여내는 달인이다. 그러나 일 말고는 아무것도 없는 자신을 마주하기 두렵고, 왜 이 일을 시작했는지 잊어버렸다.\n\n[1~2화: 만남] 서영이 재헌에게 접촉한다. 숏폼 오디션 프로그램 협업 제안. 마포구 낡은 건물 2층에 아레나 스튜디오를 차린다. 첫 미팅부터 어젠다 충돌 ? 재헌은 콘텐츠 방향부터, 서영은 PPL 계약부터. 막내 PD 한태오의 엉뚱한 아이디어(시청자 실시간 컷 오디션)가 두 사람을 처음으로 같은 방향으로 만든다. 계약서에 사인하는 순간 두 사람의 눈이 마주쳤다가 동시에 돌아선다. 오디션 첫날 최예나(24)의 원테이크 퍼포먼스에서 두 사람이 처음으로 같은 눈빛을 교환한다. 재헌이 야근하다 잠든 서영에게 재킷을 덮어주며 감정의 씨앗이 심어진다.\n\n[3~4화: 균열] 투자사 파트너 박승일이 재헌의 발표를 3분 만에 끊고 서영에게만 신뢰를 보낸다. 서영의 절친이자 경쟁사 PM 이다인이 등장해 재헌에게 먼저 콜라보를 제안한다. 재헌이 명함을 받지 않는다 ? 저는 여기 사람이에요. 서영이 그 한 마디를 듣는다. 서영이 혼자 남은 사무실에서 재헌의 자리를 한참 바라본다.\n\n[5~6화: 폭발] 최예나 편 바이럴 500만 돌파 직후, 박승일이 시즌2 투자 조건으로 서영 단독 결정권을 요구한다. 공동대표 계약을 깨라는 것. 같은 날 김원준이 편성 러브콜로 재등장 ? 재헌에게는 상처, 서영에게는 기회. 두 사람의 판단이 처음으로 완전히 갈린다. 재헌: 이게 당신이 원하던 거잖아요. 서영: 당신이 원하던 게 뭔지 지금까지 한 번도 물어본 적 없어요. 두 사람이 복도 양 끝에서 돌아보지 않는다.\n\n[7화: 각자의 시간] 촬영을 멈추고 각자의 공간으로 돌아간다. 재헌은 룰루랄라 시절 영상 아카이브를 꺼내보며 처음의 이유를 마주한다. 서영은 신입 때 손으로 쓴 첫 PPL 제안서를 꺼낸다 ? 같이 만들고 싶었던 것. 재헌이 서영 사무실 앞에 서서 노크하려다 멈춘다. 문 안에서 서영도 멈춰있다. 두 손이 문을 사이에 두고 가장 가까운 거리에 있다.\n\n[8화: 완성] 파이널 당일, 재헌이 먼저 PPL 타이밍을 묻고 서영이 먼저 카메라 앵글을 묻는다. 처음으로 서로의 방식에 진심으로 손을 내민다. 최예나의 파이널 무대는 감각과 전략이 완벽히 맞아떨어지는 순간 ? 두 사람이 만든 최초의 진짜 작품. 서영이 박승일의 단독 결정권 조건을 거절하고 공동대표 유지로 재협상했음을 재헌에게 밝힌다. 불 꺼진 세트장, 재헌이 먼저 손을 내민다. 서영이 잡는다. 간판에 불이 켜진다 ? DIRECTORS ARENA.',
  _conflicts:[
    {color:'red',  label:'핵심 갈등 ? 감각 vs 전략', desc:'재헌은 좋은 콘텐츠가 답이라 믿고, 서영은 PPL 없이 제작사가 살아남을 수 없다고 믿는다. 매 에피소드 충돌이 자동으로 갈등 엔진 역할을 한다.'},
    {color:'gold', label:'과거 악연 ? 편성부장 김원준', desc:'재헌을 룰루랄라에서 내친 김원준이 성공 후 러브콜로 재등장. 재헌에겐 상처, 서영에겐 기회 ? 두 사람의 판단이 처음으로 완전히 갈린다.'},
    {color:'teal', label:'감정 갈등 ? 이다인의 개입', desc:'서영의 절친이자 경쟁사 PM 이다인이 재헌에게 먼저 접근. 서영은 질투를 인정하지 않으려 하고, 재헌은 서영의 감정을 눈치채면서도 먼저 말하지 못한다.'},
    {color:'ink',  label:'외부 압박 ? 투자사 단독 결정권', desc:'박승일이 시즌2 투자 조건으로 서영 단독 결정권을 요구. 공동대표 구조를 깨라는 압박이 두 사람의 신뢰를 흔들고 프로그램 존폐를 위협한다.'},
  ],
  _script:[
    {heading:'S# 1. 합정동 작업실 앞 골목 / 낮',lines:[
      {type:'action',text:'서울 마포구 합정동. 오래된 상가들 사이 낡은 건물.'},
      {type:'direction',text:'[INSERT ? 2층 유리문에 붙은 종이: "아레나 스튜디오 ? 당일 오픈"]'},
      {type:'action',text:'계단을 오르는 조재헌(34). 목에 유선 헤드폰. 손에 테이크아웃 커피 두 잔.'},
      {type:'action',text:'문을 여는 순간 ? 이미 와 있는 오서영(32). 노트북 오픈, 자료 정렬, 명함 케이스까지 세팅 완료.'},
      {type:'direction',text:'(E) 노트북 팬 소리. 시계 째깍 소리.'},
      {type:'dialog',char:'서영',paren:'시계를 보며',line:'9시 미팅이요, 9시 3분에 오시는 거예요?'},
      {type:'dialog',char:'재헌',paren:'커피를 내밀며',line:'커피 사러 내려갔다 왔어요.'},
      {type:'dialog',char:'서영',paren:'받지 않고',line:'저 아메리카노 안 마셔요.'},
      {type:'dialog',char:'재헌',paren:'라벨을 보며',line:'...카페라테 맞죠. 라벨 붙어있어요.'},
      {type:'action',text:'서영, 잠깐 굳다가 커피를 받는다. 표정 변화는 없다.'},
      {type:'dialog',char:'재헌',paren:'자리에 앉으며',line:'어떻게 알고 왔어요, 이 공간.'},
      {type:'dialog',char:'서영',paren:'노트북 화면 돌리며',line:'합정동 월세 시세 분석했어요. 유동인구, 주차, 층고 다 봤어요. 이 건물이 최적이에요.'},
      {type:'dialog',char:'재헌',paren:'',line:'저는 그냥 여기 분위기가 좋아서 골랐는데요.'},
      {type:'action',text:'서영, 재헌을 한 번 본다.'},
      {type:'dialog',char:'서영',paren:'',line:'오늘 어젠다 세 가지. PPL 사전 협의, 참가자 모집 일정, 편집 방향성 순서입니다.'},
      {type:'dialog',char:'재헌',paren:'',line:'저는 편집 방향부터 하고 싶은데요.'},
      {type:'dialog',char:'서영',paren:'',line:'PPL 계약이 나와야 편집 방향이 나와요.'},
      {type:'dialog',char:'재헌',paren:'',line:'편집 방향이 나와야 어떤 PPL이 맞는지 알죠.'},
      {type:'action',text:'정적. 두 사람, 동시에 커피를 마신다.'},
      {type:'direction',text:'(E) 냉장고 돌아가는 소리.'},
    ]},
    {heading:'S# 2. 작업실 / 낮 (연속)',lines:[
      {type:'dialog',char:'서영',paren:'',line:'PPL 없이 제작비를 어떻게 충당할 거예요?'},
      {type:'dialog',char:'재헌',paren:'',line:'좋은 콘텐츠가 나오면 투자자가 따라와요.'},
      {type:'dialog',char:'서영',paren:'',line:'현실은 그 반대예요. 투자 계약이 나와야 좋은 콘텐츠를 만들 조건이 생겨요.'},
      {type:'dialog',char:'재헌',paren:'잠깐 생각하다가',line:'...맞는 말이긴 한데.'},
      {type:'dialog',char:'서영',paren:'',line:'인정하는 거예요?'},
      {type:'dialog',char:'재헌',paren:'',line:'맞는 말은 맞는 말이죠. 제 방식도 맞고.'},
      {type:'action',text:'서영이 노트에 뭔가를 메모한다. 재헌이 기웃거린다.'},
      {type:'direction',text:'[INSERT ? 노트: "고집 셈. 그러나 틀린 말은 안 함. 활용 가능."]'},
      {type:'action',text:'재헌이 노트를 보다가 서영과 눈이 마주친다. 서영이 노트를 덮는다.'},
      {type:'dialog',char:'재헌',paren:'',line:'뭐 쓴 거예요?'},
      {type:'dialog',char:'서영',paren:'',line:'업무 메모요.'},
      {type:'direction',text:'(E) 문 열리는 소리.'},
    ]},
    {heading:'S# 3. 작업실 / 낮 ? 태오 등장',lines:[
      {type:'action',text:'한태오(28), 태블릿을 들고 숨을 헐떡이며 들어온다.'},
      {type:'dialog',char:'태오',paren:'흥분하며',line:'대표님들, 이거 보셨어요? 제가 알고리즘 분석해봤는데요?'},
      {type:'dialog',char:'서영',paren:'',line:'태오씨, 지금 PPL 미팅 준비 중이에요.'},
      {type:'dialog',char:'태오',paren:'재헌에게',line:'대표님은요?'},
      {type:'dialog',char:'재헌',paren:'레퍼런스 보며',line:'봐봐.'},
      {type:'action',text:'서영이 재헌을 본다. 재헌은 태오에게 태블릿을 받는다.'},
      {type:'dialog',char:'태오',paren:'태블릿을 내밀며',line:'지금 숏폼 오디션 포맷이 전부 심사위원 있잖아요. 근데 그거 없애는 거예요. 시청자가 실시간으로 컷 버튼 누르면 그게 바로 탈락이 되는 방식이요.'},
      {type:'action',text:'재헌, 화면을 잡아당겨 자세히 본다. 잠깐의 정적.'},
      {type:'dialog',char:'재헌',paren:'서영에게',line:'이거 PPL 어때요?'},
      {type:'dialog',char:'서영',paren:'화면을 보다가',line:'...노출 횟수 계산 방식이 달라지는데.'},
      {type:'dialog',char:'재헌',paren:'피식',line:'그럼 된다는 거죠?'},
      {type:'action',text:'서영, 대답 대신 노트에 계산을 시작한다. 재헌이 태오에게 조용히 엄지를 든다.'},
      {type:'dialog',char:'태오',paren:'속으로',line:'(역시 뭔가 있어.)'},
      {type:'dialog',char:'서영',paren:'계산하며',line:'실시간 컷 방식이면 광고주 입장에서 노출 보장이 안 되는 문제가 생겨요.'},
      {type:'dialog',char:'재헌',paren:'',line:'그래서요?'},
      {type:'dialog',char:'서영',paren:'',line:'해결책 찾으면 되죠. 10분 주세요.'},
      {type:'action',text:'태오가 재헌을 보며 조용히 엄지를 든다. 재헌이 웃는다.'},
    ]},
    {heading:'S# 4. 작업실 / 오후 ? 기획안',lines:[
      {type:'action',text:'오후 햇살. 테이블 위에 기획안 초안이 펼쳐져 있다.'},
      {type:'action',text:'재헌이 컨셉을 쓰면 서영이 예산과 PPL 항목으로 고친다. 서영이 구조를 쓰면 재헌이 연출 방식으로 바꾼다.'},
      {type:'action',text:'말은 없지만 손이 계속 움직인다.'},
      {type:'direction',text:'[몽타주 ? 두 사람이 번갈아 기획안을 채워나가는 장면]'},
      {type:'action',text:'어느 순간 둘 다 펜을 내려놓고 기획안을 바라본다.'},
      {type:'dialog',char:'재헌',paren:'',line:'나쁘지 않네요.'},
      {type:'dialog',char:'서영',paren:'',line:'의외로 빨리 나왔어요.'},
      {type:'dialog',char:'재헌',paren:'',line:'같이 하면 이런 거 아닌가요.'},
      {type:'action',text:'서영이 재헌을 본다. 뭔가 할 말이 있는 것 같지만 기획안으로 시선을 내린다.'},
      {type:'dialog',char:'서영',paren:'',line:'계약서 협의 시작해요.'},
    ]},
    {heading:'S# 5. 작업실 / 오후 ? 계약서',lines:[
      {type:'action',text:'서영이 계약서를 노트북 화면에 띄운다. 조항 하나씩 검토한다.'},
      {type:'dialog',char:'서영',paren:'',line:'공동대표 구조에서 최종 결정은 어떻게 할 거예요?'},
      {type:'dialog',char:'재헌',paren:'',line:'결정 방식은 안건마다 다르게 가면 되죠. 콘텐츠 방향은 제가, 투자·계약은 서영씨가.'},
      {type:'dialog',char:'서영',paren:'',line:'교착상태가 오면요?'},
      {type:'dialog',char:'재헌',paren:'',line:'그때 얘기하면 되죠.'},
      {type:'dialog',char:'서영',paren:'',line:'그때 얘기하면 늦어요. 계약서에 명시해야 해요.'},
      {type:'dialog',char:'재헌',paren:'잠깐 생각하다가',line:'그럼 ? 누군가 먼저 합리적인 근거를 제시하면 따르는 걸로요.'},
      {type:'dialog',char:'서영',paren:'',line:'합리적이라는 기준이 서로 다르면요?'},
      {type:'dialog',char:'재헌',paren:'',line:'그래서 우리가 파트너 아닌가요.'},
      {type:'action',text:'서영이 잠깐 재헌을 본다. 뭔가 기대하지 않았던 말이었던 것처럼.'},
      {type:'dialog',char:'서영',paren:'노트북을 수정하며',line:'...기재하기 어려운 조항이에요.'},
      {type:'dialog',char:'재헌',paren:'',line:'그러면 그냥 신뢰 기반으로 가죠.'},
      {type:'dialog',char:'서영',paren:'',line:'신뢰는 계약서에 못 써요.'},
      {type:'dialog',char:'재헌',paren:'',line:'그러니까 써도 되는 거잖아요.'},
      {type:'action',text:'서영, 대답 대신 커피를 마신다.'},
    ]},
    {heading:'S# 6. 작업실 / 저녁 ? 첫 야근',lines:[
      {type:'action',text:'저녁. 태오가 퇴근 인사를 하고 나간다.'},
      {type:'action',text:'재헌과 서영, 처음으로 둘만 남는다.'},
      {type:'action',text:'각자 자기 자리에서 일을 한다. 어색한 침묵.'},
      {type:'direction',text:'(E) 키보드 소리. 모니터 팬 소리.'},
      {type:'dialog',char:'재헌',paren:'화면 보며',line:'밥은요?'},
      {type:'dialog',char:'서영',paren:'화면 보며',line:'나중에요.'},
      {type:'dialog',char:'재헌',paren:'',line:'지금 몇 시예요.'},
      {type:'dialog',char:'서영',paren:'',line:'8시 반.'},
      {type:'dialog',char:'재헌',paren:'',line:'나중이 언제예요.'},
      {type:'action',text:'서영, 잠깐 멈추다가 다시 타이핑을 시작한다.'},
      {type:'dialog',char:'재헌',paren:'일어서며',line:'편의점 갔다 올게요.'},
      {type:'dialog',char:'서영',paren:'',line:'됐어요.'},
      {type:'dialog',char:'재헌',paren:'',line:'뭐 먹을 거예요?'},
      {type:'dialog',char:'서영',paren:'잠깐 머뭇하다가',line:'...참치마요면 돼요.'},
      {type:'action',text:'재헌이 나간다. 서영이 그 뒷모습을 1초 본다.'},
    ]},
    {heading:'S# 7. 편의점 앞 골목 / 저녁',lines:[
      {type:'action',text:'재헌이 편의점 봉투를 들고 건물로 돌아온다.'},
      {type:'action',text:'골목 가로등이 켜지기 시작한다. 합정동의 저녁.'},
      {type:'action',text:'재헌이 건물을 올려다본다. 2층 불빛이 켜져 있다.'},
      {type:'dialog',char:'재헌',paren:'혼잣말',line:'...일은 하네.'},
      {type:'action',text:'재헌이 계단을 오른다.'},
    ]},
    {heading:'S# 8. 작업실 / 저녁 ? 야근',lines:[
      {type:'direction',text:'(E) 문 열리는 소리.'},
      {type:'action',text:'재헌이 들어온다. 서영은 여전히 화면을 보고 있다.'},
      {type:'action',text:'재헌이 봉투에서 참치마요 샌드위치와 음료를 꺼내 서영 책상에 놓는다.'},
      {type:'dialog',char:'서영',paren:'',line:'얼마예요?'},
      {type:'dialog',char:'재헌',paren:'',line:'됐어요.'},
      {type:'dialog',char:'서영',paren:'',line:'사업 파트너 사이에 이런 거 불편해요.'},
      {type:'dialog',char:'재헌',paren:'자기 자리에 앉으며',line:'그냥 밥 먹어요. 어차피 저도 사야 했어요.'},
      {type:'action',text:'서영, 잠깐 망설이다가 샌드위치를 집는다.'},
      {type:'action',text:'두 사람, 말 없이 각자의 일을 하면서 먹는다.'},
      {type:'action',text:'조용한 사무실. 나란한 모니터 불빛.'},
      {type:'direction',text:'(E) 키보드 소리만 들린다.'},
      {type:'dialog',char:'서영',paren:'작게',line:'...맛있네요.'},
      {type:'dialog',char:'재헌',paren:'화면 보며',line:'거기 참치마요예요.'},
      {type:'dialog',char:'서영',paren:'',line:'알아요.'},
      {type:'action',text:'재헌, 화면을 보며 슬쩍 웃는다. 서영은 못 봤다.'},
      {type:'action',text:'서영이 PPL 제안서를 수정한다. 재헌이 레퍼런스 영상을 돌린다.'},
      {type:'action',text:'오래 일한 파트너처럼. 그러나 오늘이 첫날이다.'},
    ]},
    {heading:'S# 9. 작업실 / 밤 ? 잠든 서영',lines:[
      {type:'action',text:'자정이 넘었다. 재헌이 편집 파일을 저장한다.'},
      {type:'action',text:'서영 자리를 보니 ? 잠들어있다. 노트북 화면 앞에서.'},
      {type:'action',text:'재헌이 일어나 다가간다. 잠든 서영의 얼굴을 1초 바라본다.'},
      {type:'action',text:'자기 재킷을 서영 어깨에 조용히 덮어준다.'},
      {type:'action',text:'사무실 불을 끈다. 모니터 불빛만 남는다.'},
      {type:'action',text:'문을 열고 나가려다 ? 멈춘다.'},
      {type:'action',text:'재헌이 돌아서서 서영 노트북 화면을 본다.'},
      {type:'direction',text:'[INSERT ? 화면: "아레나 스튜디오 PPL 전략안 v0.1 ? 조재헌 감각 방향성 활용 방안"]'},
      {type:'action',text:'재헌, 표정이 미세하게 바뀐다.'},
      {type:'dialog',char:'재헌',paren:'혼잣말, 아주 작게',line:'...이미 생각하고 있었네.'},
      {type:'action',text:'재헌이 나간다.'},
      {type:'direction',text:'(E) 문 닫히는 소리.'},
      {type:'action',text:'서영이 눈을 살짝 뜬다. 재킷을 끌어당긴다. 다시 눈을 감는다.'},
    ]},
    {heading:'S# 10. 작업실 / 다음날 아침',lines:[
      {type:'action',text:'아침 햇살. 서영이 먼저 와 있다. 어제 재킷이 의자에 접혀있다.'},
      {type:'action',text:'재헌이 커피 두 잔을 들고 들어온다.'},
      {type:'action',text:'서영이 재킷을 내밀지 않는다. 재헌도 묻지 않는다.'},
      {type:'dialog',char:'서영',paren:'',line:'오늘 오디션 공고 올려요. 참가자 모집 시작.'},
      {type:'dialog',char:'재헌',paren:'커피를 놓으며',line:'포맷은요?'},
      {type:'dialog',char:'서영',paren:'',line:'어제 태오씨 아이디어 기반으로 잡았어요. 광고주 노출 보장 방식 찾았고요.'},
      {type:'dialog',char:'재헌',paren:'',line:'어떻게요?'},
      {type:'dialog',char:'서영',paren:'노트북 화면 돌리며',line:'컷 전 5초 구간에 PPL 브랜드 로고 고정 노출. 탈락 여부와 무관하게 전 회차 보장이에요.'},
      {type:'action',text:'재헌이 화면을 본다. 잠깐 생각한다.'},
      {type:'dialog',char:'재헌',paren:'',line:'...나쁘지 않네요.'},
      {type:'dialog',char:'서영',paren:'',line:'인정하는 거예요?'},
      {type:'dialog',char:'재헌',paren:'',line:'맞는 건 맞다고 하죠.'},
      {type:'action',text:'서영이 처음으로 먼저 웃는다.'},
    ]},
    {heading:'S# 11. 작업실 앞 골목 / 낮 ? 계약서 사인',lines:[
      {type:'action',text:'공증 서류와 계약서를 들고 나온 두 사람.'},
      {type:'action',text:'골목 벤치. 아레나 스튜디오 간판이 보이는 자리.'},
      {type:'dialog',char:'재헌',paren:'서류 보며',line:'여기서 사인해요?'},
      {type:'dialog',char:'서영',paren:'',line:'사무실 안보다 여기가 기억될 것 같아서요.'},
      {type:'action',text:'재헌이 서영을 본다. 의외다.'},
      {type:'dialog',char:'재헌',paren:'',line:'서영씨, 가끔 감성적이네요.'},
      {type:'dialog',char:'서영',paren:'',line:'아니에요. 나중에 이 골목이 인터뷰 장소가 될 수도 있으니 동선 확인하는 거예요.'},
      {type:'dialog',char:'재헌',paren:'피식',line:'그래요, 그래요.'},
      {type:'action',text:'두 사람, 계약서에 사인한다.'},
      {type:'dialog',char:'재헌',paren:'',line:'후회 없으시죠?'},
      {type:'dialog',char:'서영',paren:'',line:'후회는 결과 나오고 하는 거예요.'},
      {type:'dialog',char:'재헌',paren:'',line:'그럼 결과 만들면 되겠네요.'},
      {type:'action',text:'서영이 웃는다. 재헌도 웃는다.'},
      {type:'action',text:'동시에 서로의 얼굴을 본다.'},
      {type:'action',text:'동시에 다른 곳으로 시선을 돌린다.'},
      {type:'action',text:'골목 가로등 하나가 켜진다.'},
    ]},
    {heading:'S# 12. 작업실 / 저녁 ? 태오의 관찰',lines:[
      {type:'action',text:'사무실로 돌아온 세 사람. 태오가 두 대표의 분위기를 살핀다.'},
      {type:'dialog',char:'태오',paren:'서영에게 조용히',line:'대표님들 뭔가 달라졌어요?'},
      {type:'dialog',char:'서영',paren:'',line:'뭐가요.'},
      {type:'dialog',char:'태오',paren:'',line:'그냥 분위기가... 어제랑 달라요.'},
      {type:'action',text:'서영이 태오를 본다.'},
      {type:'dialog',char:'서영',paren:'',line:'계약서 썼어요.'},
      {type:'dialog',char:'태오',paren:'',line:'그게 다예요?'},
      {type:'dialog',char:'서영',paren:'',line:'그게 다예요.'},
      {type:'action',text:'재헌이 반대편에서 편집을 시작한다.'},
      {type:'dialog',char:'태오',paren:'속으로',line:'(절대 그게 다가 아님.)'},
    ]},
    {heading:'S# 13. 작업실 복도 / 밤 ? 1화 엔딩',lines:[
      {type:'action',text:'모두가 퇴근한 밤. 불이 꺼진 복도.'},
      {type:'action',text:'재헌이 마지막으로 문을 잠그고 나온다.'},
      {type:'action',text:'계단을 내려가다 ? 멈춘다.'},
      {type:'action',text:'올려다보면 2층 유리문. "아레나 스튜디오 ? 당일 오픈" 종이가 아직 붙어있다.'},
      {type:'action',text:'재헌이 계단을 다시 올라간다.'},
      {type:'action',text:'종이를 천천히 떼어낸다.'},
      {type:'direction',text:'[INSERT ? 재헌의 손. 종이를 주머니에 넣는다.]'},
      {type:'action',text:'재헌이 다시 계단을 내려간다.'},
      {type:'action',text:'골목으로 나오는 순간 ? 반대편에서 서영이 걸어온다. 퇴근하다 돌아온 것처럼.'},
      {type:'dialog',char:'서영',paren:'멈추며',line:'뭐 했어요?'},
      {type:'dialog',char:'재헌',paren:'주머니 속 종이를 만지며',line:'그냥요.'},
      {type:'action',text:'두 사람, 골목 가로등 아래 잠깐 마주선다.'},
      {type:'dialog',char:'서영',paren:'',line:'내일 오전 10시. 첫 투자사 미팅이에요.'},
      {type:'dialog',char:'재헌',paren:'',line:'알겠어요.'},
      {type:'action',text:'서영이 먼저 걷는다. 재헌이 그 뒷모습을 본다.'},
      {type:'action',text:'주머니에서 종이를 꺼낸다. "아레나 스튜디오 ? 당일 오픈."'},
      {type:'action',text:'재헌이 다시 접어 주머니에 넣는다.'},
      {type:'direction',text:'(화면 천천히 암전)'},
      {type:'direction',text:'? 1화 끝 ?'},
    ]},
  ],
};






/* 인물 관계도 SVG 렌더 */
function renderRelationMap(relations){
  var sec = document.getElementById('relation-map-section');
  var cvs = document.getElementById('relation-map-canvas');
  if(!sec || !cvs || !relations) return;
  sec.style.display = 'block';

  var W = Math.min(680, (cvs.offsetWidth || 640));
  var H = 260;

  /* 노드 위치 고정 배치 */
  var nodes = relations.nodes || [];
  var edges = relations.edges || [];

  /* SVG 생성 */
  var svg = '<svg width="100%" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';

  /* 엣지 먼저 */
  edges.forEach(function(e){
    var from = nodes.find(function(n){return n.id===e.from;});
    var to   = nodes.find(function(n){return n.id===e.to;});
    if(!from||!to) return;
    var color = e.type==='romance'?'#C9933A':e.type==='rival'?'#E05555':e.type==='friend'?'#36B37E':'#9CA3AF';
    var dash  = e.type==='rival'?'6,3':'';
    svg += '<line x1="'+from.x+'" y1="'+from.y+'" x2="'+to.x+'" y2="'+to.y+'"'
         + ' stroke="'+color+'" stroke-width="'+(e.type==='romance'?2.5:1.5)+'"'
         + (dash?' stroke-dasharray="'+dash+'"':'') + ' opacity="0.7"/>';
    /* 엣지 라벨 */
    var mx=(from.x+to.x)/2, my=(from.y+to.y)/2;
    svg += '<text x="'+mx+'" y="'+(my-5)+'" text-anchor="middle" font-size="9" fill="#9CA3AF" font-family="sans-serif">'+e.label+'</text>';
  });

  /* 노드 */
  nodes.forEach(function(n){
    var color = n.role==='main'?'#C9933A':n.role==='heroine'?'#E8A2D4':'#6B7280';
    var r = n.role==='main'||n.role==='heroine' ? 30 : 22;
    svg += '<circle cx="'+n.x+'" cy="'+n.y+'" r="'+r+'" fill="'+color+'" opacity="0.18" stroke="'+color+'" stroke-width="2"/>';
    svg += '<text x="'+n.x+'" y="'+(n.y-3)+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+color+'" font-family="serif">'+n.name+'</text>';
    svg += '<text x="'+n.x+'" y="'+(n.y+11)+'" text-anchor="middle" font-size="9" fill="#6B7280" font-family="sans-serif">'+n.job+'</text>';
  });

  svg += '</svg>';
  cvs.innerHTML = svg;
}

/* ================================================================
   DIRECTORS ARENA PPL + openSample2 + applySample2Result
   ================================================================ */
const DIRECTORS_ARENA_PPL = [
  {id:1,industry:'IT·통신',badge:'t-amber',brand:'숏폼 스트리밍 플랫폼 ? 공식 방영 플랫폼 자연 노출',scene:'S# 3. 오디션 스튜디오 / 낮',sceneDesc:'오디션 현장 모니터에 플랫폼 대시보드 지속 노출. 5화 바이럴 수치 폭발 씬에서 로고 클로즈업. 재헌이 핸드폰으로 수치 확인하는 씬마다 자연 노출.',eps:'전 회차',freq:'회당 3회 이상 자연 노출',price:'1억 5,000만원',priceRaw:'15000',effect:'MZ 타깃 숏폼 플랫폼 인지도 및 다운로드 유도',difficulty:'하',difficultyDesc:'배경 모니터·소품으로 자연 배치. 씬 구조 변경 불필요.'},
  {id:2,industry:'식음료',badge:'t-green',brand:'편의점 PB 도시락·샌드위치 ? 야근 감정 연동 소품',scene:'S# 4. 작업실 / 저녁',sceneDesc:'재헌이 편의점 봉투에서 참치마요 샌드위치를 꺼내 서영 책상에 놓는 씬. 포장지 로고 자연 노출. 서영이 처음으로 맛있다고 말하는 감정 포인트 씬과 완벽 연동.',eps:'2·4·6화',freq:'야근 씬마다 1회. 인물 감정 포인트에 배치.',price:'6,000만원',priceRaw:'6000',effect:'직장인 공감형 감성 마케팅. 브랜드를 따뜻한 감정과 연결.',difficulty:'하',difficultyDesc:'기존 씬 구조 그대로 소품만 교체.'},
  {id:3,industry:'IT·통신',badge:'t-amber',brand:'프리미엄 노트북·태블릿 ? 편집실·회의실 상시 노출',scene:'S# 2. 작업실 / 낮',sceneDesc:'태오가 태블릿으로 알고리즘 분석 자료를 보여주는 씬. 제품 로고·UI 자연 노출. 재헌의 편집 장면에서도 반복 등장.',eps:'전 회차',freq:'회당 2회 이상 배경·소품 노출',price:'1억 2,000만원',priceRaw:'12000',effect:'크리에이티브 직군 타깃 브랜드 포지셔닝.',difficulty:'하',difficultyDesc:'세팅 단계에서 배치. 별도 연출 불필요.'},
  {id:4,industry:'뷰티·패션',badge:'t-pink',brand:'비즈니스 캐주얼 의류 ? 오서영 시그니처 정장 라인',scene:'S# 1. 합정동 작업실 / 낮',sceneDesc:'서영이 매 화 다른 컬러웨이 시그니처 정장으로 등장. 인물 아이덴티티와 브랜드 동일시. 인스타그램 연계 마케팅 효과.',eps:'전 회차',freq:'서영 등장 씬 전체',price:'8,000만원',priceRaw:'8000',effect:'커리어우먼 타깃 브랜드 인지도 급상승. 팬덤 구매 연결.',difficulty:'중',difficultyDesc:'의상 협의·컬러웨이 세팅 필요. 캐릭터 일관성 유지 필수.'},
  {id:5,industry:'가전·인테리어',badge:'t-purple',brand:'사무용 가구 브랜드 ? 아레나 스튜디오 전체 인테리어',scene:'S# 1. 합정동 작업실 / 낮',sceneDesc:'스튜디오 전체 인테리어에 브랜드 가구 배치. 재헌 쪽(창의적 어수선함)과 서영 쪽(완벽 정렬)의 대비로 브랜드 다양성 표현.',eps:'전 회차',freq:'사무실 씬 전체 상시 노출',price:'5,000만원',priceRaw:'5000',effect:'스타트업·홈오피스 타깃 브랜드 이미지.',difficulty:'하',difficultyDesc:'촬영 세트 구축 단계에서 배치 완료.'},
  {id:6,industry:'금융·보험',badge:'t-gray',brand:'핀테크 금융 앱 ? 투자 협상·정산 장면',scene:'S# 3. 투자사 회의실 / 낮',sceneDesc:'박승일이 계약 조건 협의 시 태블릿으로 핀테크 앱 화면을 보여주는 씬. 서영이 PPL 수익 데이터를 앱으로 제시하는 장면 연동.',eps:'3·5·7화',freq:'비즈니스 미팅 씬 연계 1회',price:'4,000만원',priceRaw:'4000',effect:'비즈니스 유저 타깃. 스타트업 투자 씬과 자연 연결.',difficulty:'중',difficultyDesc:'대사·행동 일부 수정 필요. 앱 UI 화면 합성 필요.'},
  {id:7,industry:'식음료',badge:'t-green',brand:'프리미엄 테이크아웃 커피 ? 재헌 시그니처 아이템',scene:'S# 1. 합정동 작업실 / 낮',sceneDesc:'재헌이 매일 아침 같은 브랜드 테이크아웃 커피를 들고 등장. 1화에서 서영에게 커피를 건네는 씬과 연결. 캐릭터 시그니처 아이템화.',eps:'1·2·3·4화',freq:'재헌 등장 오프닝 씬 반복 노출',price:'3,500만원',priceRaw:'3500',effect:'캐릭터 아이덴티티 마케팅. 팬덤 굿즈·콜라보 연계 가능.',difficulty:'하',difficultyDesc:'소품 교체만으로 가능.'},
  {id:8,industry:'IT·통신',badge:'t-amber',brand:'영상 편집 소프트웨어 ? 편집실 작업 장면',scene:'S# 4. 작업실 / 저녁',sceneDesc:'재헌이 야근하며 편집하는 씬에서 소프트웨어 UI 화면 지속 노출. 실제 편집 워크플로우 시연. 크리에이터 타깃 설득력 높음.',eps:'2·4·6·8화',freq:'편집 씬 전체',price:'2,500만원',priceRaw:'2500',effect:'크리에이터·영상 종사자 타깃 구독 유도.',difficulty:'중',difficultyDesc:'실제 소프트웨어 UI를 화면 합성으로 삽입. 후반 작업 협의.'},
];

function openSample2(){
  var sample = DIRECTORS_ARENA_SAMPLE;
  currentInput = Object.assign({}, sample, {title: sample.title, _charAutoFilled: false});
  _charAutoFilled = false;
  window._scripts = {};
  window._apiBudgetBreakdown = null;
  window._apiSimilar = (sample._planData && sample._planData.similar) ? sample._planData.similar : null;
  window._planData = Object.assign({}, sample._planData, {title: sample.title, episodes: sample._episodes});
  aiEpisodes = sample._episodes;
  window._scripts[0] = sample._script;
  aiScript = sample._script;
  window._apiPplData = DIRECTORS_ARENA_PPL;
  applySample2Result(sample);
  showPage('result');
  buildResultPanels();
  buildPplPanel(DIRECTORS_ARENA_PPL);
  var ptv = document.getElementById('ppl-total-val');
  if(ptv) ptv.textContent = '8억 2,000만원';
  updateScriptSidebar();
  showPanel('overview');
  showToast('디렉터스 아레나 샘플을 불러왔습니다.','success','??',2500);
}

function applySample2Result(s){
  var ep = parseInt(s.episodes) || 8;
  var stats = (s._planData && s._planData.stats) ? s._planData.stats : {};
  /* 히어로 */
  document.getElementById('result-hero-title-el').textContent = s.title;
  document.getElementById('result-logline').textContent = s.logline;
  document.getElementById('result-badge').innerHTML = '? ' + s.platform + ' · ' + s.genre + ' · ' + ep + '부작';
  document.getElementById('result-tags').innerHTML =
    '<span class="result-hero-tag">회당 ' + s.runtime + '분</span>' +
    '<span class="result-hero-tag">총 제작비 ' + (stats.budget || '134억') + '</span>' +
    '<span class="result-hero-tag">PPL ' + (stats.ppl || '8.2억') + '</span>';
  document.getElementById('sidebar-title-label').textContent = s.title;
  document.getElementById('sidebar-meta').innerHTML =
    '<span class="meta-tag">' + s.platform + '</span>' +
    '<span class="meta-tag">' + s.genre + '</span>' +
    '<span class="meta-tag">' + ep + '부작</span>';
  document.getElementById('stat-budget').textContent = stats.budget || '134억';
  document.getElementById('stat-scenes').textContent = stats.scenes || '208씬';
  document.getElementById('stat-ppl').textContent = stats.ppl || '8.2억';
  /* 개요 */
  document.getElementById('ov-budget').innerHTML = (stats.budget || '134억') + '<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-avg').innerHTML    = (stats.avgEpBudget || '16.8억') + '<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-ppl').innerHTML    = (stats.ppl || '8.2억') + '<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-net').innerHTML    = (stats.netBudget || '125.8억') + '<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-logline').textContent = s.logline;
  document.getElementById('ov-story').textContent   = s._synopsis || '';
  /* 인물 관계도 */
  if(s._relations) renderRelationMap(s._relations);

  /* 갈등 */
  if(s._conflicts && s._conflicts.length){
    document.getElementById('ov-conflicts').innerHTML = s._conflicts.map(function(c){
      return '<div class="conflict-card ' + c.color + '">' +
        '<div class="conflict-label" style="color:var(--' + (c.color === 'ink' ? 'ink2' : c.color) + ')">' + c.label + '</div>' +
        '<div class="conflict-desc">' + c.desc + '</div></div>';
    }).join('');
  }
  /* 로케이션 */
  var locs = (s._planData && s._planData.locations) ? s._planData.locations : [];
  if(locs.length){
    var ex = document.querySelector('.locations-section');
    if(ex) ex.remove();
    var ovStory = document.getElementById('ov-story');
    if(ovStory){
      var locHtml = '<div class="locations-section" style="margin-top:16px;padding-top:16px;border-top:0.5px solid var(--border)">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ink3);margin-bottom:10px">주요 촬영 장소</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        locs.map(function(l){
          return '<div style="background:var(--paper2);border-radius:var(--r);padding:10px 14px;border:0.5px solid var(--border)">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">' +
            '<span style="font-size:13px;font-weight:600">' + l.name + '</span>' +
            '<span style="font-size:10px;color:var(--ink3);background:var(--paper3);padding:2px 8px;border-radius:4px">' + l.type + '</span>' +
            '</div><div style="font-size:12px;color:var(--ink3);line-height:1.6">' + l.desc + '</div>' +
            (l.mood ? '<div style="font-size:11px;color:var(--ink3);font-style:italic;margin-top:2px">' + l.mood + '</div>' : '') +
            ((l.buildCost && l.buildCost != '0') ? '<div style="font-size:11px;color:var(--gold);margin-top:4px">세트 제작비: ' + parseInt(l.buildCost).toLocaleString() + '만원</div>' : '') +
            ((l.rentCost && l.rentCost != '0') ? '<div style="font-size:11px;color:var(--teal);margin-top:4px">대관료: 회당 ' + parseInt(l.rentCost).toLocaleString() + '만원</div>' : '') +
            '</div>';
        }).join('') + '</div></div>';
      ovStory.insertAdjacentHTML('afterend', locHtml);
    }
  }
  /* 캐스팅 */
  var cast = (s._planData && s._planData.cast) ? s._planData.cast : [];
  cast.forEach(function(c, i){
    while(castData.length <= i) castData.push({name:'',role:'',av:'av-g',init:'?',desc:'',actors:[]});
    castData[i].name = c.charName || castData[i].name;
    castData[i].role = c.role || castData[i].role;
    castData[i].desc = c.personality || c.job || castData[i].desc;
    castData[i].init = (c.charName || '?')[0];
    castData[i].actors = (c.actors || []).map(function(a){
      return {
        name: a.name,
        detail: a.age + ' · ' + (a.recentWork || '') + ' · ' + (a.reason || '') + (a.tier ? ' [' + a.tier + ']' : ''),
        fee: '회당 ' + parseInt(a.feePerEp || 0).toLocaleString() + '만원',
        img: 'https://images.unsplash.com/photo-' + (1500000000000 + Math.floor(Math.random() * 200000000)) + '?w=200&h=200&fit=crop&crop=face'
      };
    });
  });
  if(cast.length) buildCharCards();
  /* 예산 */
  var bd = (s._planData && s._planData.budgetBreakdown) ? s._planData.budgetBreakdown : [];
  if(bd.length){ window._apiBudgetBreakdown = bd; applyApiBudget(bd, ep, stats); }
  /* 사이드바 */
  var se = document.getElementById('sidebar-script-eps');
  if(se) se.innerHTML = aiEpisodes.map(function(_, i){
    return '<button class="sidebar-item" onclick="showScriptEp(' + i + ')"><div class="sidebar-dot"></div>' + (i+1) + '화 ? ' + aiEpisodes[i].title.slice(0, 8) + '</button>';
  }).join('');
  var ptv2 = document.getElementById('ppl-total-val');
  if(ptv2) ptv2.textContent = '8억 2,000만원';
}

const SECRET_GARDEN_SAMPLE = {
  title:'시크릿가든',
  platform:'OTT 오리지널',
  genre:'로맨틱 코미디',
  episodes:8,
  runtime:60,
  era:'현대 (2020년대)',
  target:'20~39세 여성',
  setting:'서울 마포구 오래된 골목, 2층 건물',
  logline:'엄마의 유산을 지키려는 엉망진창 쉐프와, 그 꿈을 방해하는 완벽주의 건물주. 가장 어울리지 않는 두 사람이 같은 공간에서 부딪히며 서로의 결핍을 채워간다.',
  extra:'재개발 갈등, 전 남자친구 등장, 플래시백 씬 포함, 소원 고모의 권리금 요구',
  chars:[
    {role:'여주',name:'한소원',age:'25세',gender:'여성',job:'쉐프',personality:'깜찍발랄, 실수투성이 / 엄마에 대한 죄책감',looks:'긴 머리, 앞치마 항상 착용, 밝은 눈빛'},
    {role:'남주',name:'강재윤',age:'29세',gender:'남성',job:'건물주 / 부동산 개발회사 부장',personality:'신중·완벽주의·철면피 / 감정 표현 불가',looks:'단정한 정장, 차갑고 날카로운 인상'},
    {role:'조연',name:'오지수',age:'30세',gender:'여성',job:'JW디벨롭먼트 재개발 팀장',personality:'야망 있고 도시적, 재윤에게 감정 있음',looks:'세련된 직장인 스타일'},
    {role:'조연',name:'박현우',age:'28세',gender:'남성',job:'푸드 스타트업 대표',personality:'밝고 유쾌, 소원을 아직 좋아하는 전 남자친구',looks:'캐주얼하고 친근한 인상'},
  ],
  // 결과 화면용 추가 데이터
  _synopsis:'엄마를 잃은 쉐프 한소원은 엄마의 허름한 식당 자리에 시크릿가든을 열겠다고 결심한다. 건물주 강재윤은 재개발 예정을 숨긴 채 계약을 맺는다. 두 사람은 매일 티격태격 가까워지지만, 재윤 아버지 회사가 과거에 소원 엄마 식당을 쫓아낸 전력이 드러나며 균열이 생긴다. 재윤은 재개발 철회를 결정하고 소원에게 진심을 전한다. 두 사람은 함께 시크릿가든의 간판에 불을 켠다.',
  _conflicts:[
    {color:'red',label:'핵심 갈등 ? 재개발 비밀',desc:'재윤이 처음부터 재개발 사실을 숨기고 계약. 소원이 현수막으로 발견하며 신뢰 붕괴.'},
    {color:'gold',label:'과거 악연 ? 가문의 죄',desc:'재윤 아버지 회사가 소원 엄마 식당을 과거 재개발로 쫓아낸 전력. 운명적 얽힘.'},
    {color:'teal',label:'감정 갈등 ? 삼각 긴장',desc:'현우의 적극적 접근 vs 재윤의 감정 억압. 오지수의 감정이 소원을 자극.'},
    {color:'ink',label:'외부 압박 ? 권리금·악플',desc:'소원 고모의 권리금 요구와 SNS 위생 악플 사건이 식당 존폐와 자존감을 위협.'},
  ],
  _planData:{
    title:'시크릿가든',
    logline:'엄마의 유산을 지키려는 엉망진창 쉐프와, 그 꿈을 방해하는 완벽주의 건물주. 가장 어울리지 않는 두 사람이 같은 공간에서 부딪히며 서로의 결핍을 채워간다.',
    synopsis:'엄마를 잃은 쉐프 한소원은 엄마의 허름한 식당 자리에 시크릿가든을 열겠다고 결심한다. 건물주 강재윤은 재개발 예정을 숨긴 채 계약을 맺는다. 두 사람은 매일 티격태격 가까워지지만, 재윤 아버지 회사가 과거에 소원 엄마 식당을 쫓아낸 전력이 드러나며 균열이 생긴다. 재윤은 재개발 철회를 결정하고 소원에게 진심을 전한다. 두 사람은 함께 시크릿가든의 간판에 불을 켠다.',
    visual:{colorTone:'따뜻한 골든아워 + 빈티지 마포구 골목 감성. 낮은 채도의 크림톤.',shootingStyle:'핸드헬드 카메라 위주. 좁은 공간에서의 클로즈업. 음식 클로즈업 필수.',killingPoint:'낡은 타일 바닥 위 앞치마 차림의 소원과 정장 재윤의 극명한 대비'},
    conflicts:[
      {color:'red',label:'핵심 갈등 ? 재개발 비밀',desc:'재윤이 처음부터 재개발 사실을 숨기고 계약. 소원이 5화에서 현수막으로 발견하며 신뢰 붕괴. 가장 가까워진 순간 가장 멀어지는 역설적 구조.'},
      {color:'gold',label:'과거 악연 ? 가문의 죄',desc:'재윤 아버지 회사가 소원 엄마 식당을 과거 재개발로 쫓아낸 전력. 재윤이 이 사실을 알면서도 계약한 것이 운명적 얽힘이자 최대 죄책감.'},
      {color:'teal',label:'감정 갈등 ? 삼각 긴장',desc:'현우의 적극적 접근 vs 재윤의 감정 억압. 오지수의 감정이 소원을 자극. 재윤은 현우를 견제하면서도 먼저 나서지 못한다.'},
      {color:'ink',label:'외부 압박 ? 권리금·악플',desc:'소원 고모의 권리금 요구와 SNS 위생 악플 사건이 식당 존폐와 자존감을 위협. 경제적 압박이 두 사람의 감정 발전을 방해.'},
    ],
    similar:{
      refs:[
        {title:'나의 해방일지',year:2022,eps:16,platform:'JTBC',genre:'로맨스·일상',rating:'8.6',budget:'150억',budgetNum:150,tags:['골목','일상','감성']},
        {title:'식샤를 합시다 2',year:2015,eps:16,platform:'tvN',genre:'로맨스·음식',rating:'5.2',budget:'70억',budgetNum:70,tags:['음식','골목','로컬']},
        {title:'쌈 마이웨이',year:2017,eps:16,platform:'KBS2',genre:'로맨틱 코미디',rating:'11.2',budget:'90억',budgetNum:90,tags:['청춘','성장','로컬']},
        {title:'동백꽃 필 무렵',year:2019,eps:40,platform:'KBS2',genre:'로맨스·성장',rating:'23.8',budget:'130억',budgetNum:130,tags:['지방','싱글맘','성장']},
        {title:'커피프린스 1호점',year:2007,eps:17,platform:'MBC',genre:'로맨틱 코미디',rating:'23.6',budget:'80억',budgetNum:80,tags:['카페','신분차','클래식']},
        {title:'멜로가 체질',year:2019,eps:16,platform:'JTBC',genre:'로맨스·힐링',rating:'3.8',budget:'100억',budgetNum:100,tags:['30대','우정','감성']},
      ],
      diff:{
        plus:[
          {title:'공간 밀착형 서사',desc:'단일 골목·2층 건물이라는 좁은 공간에서 발생하는 밀도 높은 감정 충돌. 재개발이라는 현실적 갈등을 로맨스 엔진으로 활용한 최초 시도.'},
          {title:'음식 감성 + 부동산 현실',desc:'엄마 레시피 재현이라는 음식 서사와 재개발·권리금이라는 2030 공감 소재의 결합. 따뜻한 감성과 현실적 위기감의 공존.'},
        ],
        minus:[
          {title:'좁은 무대의 시각적 한계',desc:'단일 골목 배경 특성상 스펙터클한 로케이션이 없음. 음식 클로즈업과 골목 감성 촬영으로 영상미를 보완해야 함.'},
          {title:'타깃층 협소 가능성',desc:'20~30대 로컬 감성을 선호하는 시청자에게 최적화. 40대 이상 지상파 시청자에게는 느린 호흡이 진입 장벽이 될 수 있음.'},
        ],
      },
    },
  },
  _episodes:[
    {num:1,title:'이 건물, 제가 맡을게요',
     logline:'엄마의 빈자리에 새 식당을 열려는 소원과, 그 자리를 재개발하려는 재윤의 첫 충돌',
     story:'쉐프 한소원(25)이 캐리어 두 개를 끌고 마포구 골목에 나타난다. 목적지는 돌아가신 엄마가 식당을 했던 건물 1층. 임대 전단을 보고 찾아왔지만 건물 문이 이마를 강타하며 첫날부터 사고 연발. 계단에서 서류를 들고 내려오던 건물주 강재윤(29)과 충돌, 서류 12장이 흩날린다. 재윤은 소원을 처음부터 계약 위험 요소로 분류하지만 임대료가 급한 상황이라 계약을 맺는다. 소원은 엄마 기일을 맞아 빈 상가 바닥에 혼자 앉아 운다. 재윤은 2층에서 그 콧노래 소리를 듣고 멈추지만 내려가지 않는다.',
     keyScene:'S#6. 빈 상가 / 저녁. 소원이 엄마 사진을 핸드폰으로 보며 혼자 운다. 위층에서 재윤의 발소리가 내려오다 멈춘다. 재윤은 문 앞에서 1분간 서 있다가 말없이 올라간다. 두 사람 사이 첫 번째 감정의 균열.',
     ending:'소원, 손글씨 간판 시안을 들고 건물 올려다봄. 재윤 (O.S) "간판 허가 신청 하셨어요?" ? 소원 굳는 얼굴 ? 암전',
     scenes:[
       {num:'S#1',loc:'마포구 골목길 / 낮',chars:['소원'],desc:'이마에 짐을 들고 골목에 나타난 소원, 건물을 올려다보며 엄마를 그리워한다. 그러나 감상에 젖는 순간 문이 이마를 강타하며 코믹하게 등장. 시청자에게 캐릭터 소개와 동시에 감정 이중주 첫 제시.'},
       {num:'S#2',loc:'계단 입구 / 낮',chars:['소원','재윤'],desc:'소원이 비틀거리며 들어서다 계단의 재윤과 충돌, 서류 12장 흩날림. 재윤이 바닥에 엎드린 소원을 내려다보며 "오늘 재수가 없는 날이에요?" 냉정하게 묻는다. 소원 "아니요, 저 원래 이래요" ? 두 캐릭터 DNA 한 줄 요약.'},
       {num:'S#3',loc:'빈 상가 / 낮',chars:['소원','재윤'],desc:'재윤이 계약 조건을 읊는 동안 소원은 조리대를 손으로 쓸며 엄마 흔적을 찾는다. 재윤은 소원의 행동을 관찰하며 "무슨 식당을 할 건지" 묻는다. 소원 "시크릿가든이요" ? 재윤의 미간이 미세하게 흔들린다 (이유 미공개).'},
       {num:'S#4',loc:'재윤 사무실 / 낮',chars:['재윤'],desc:'재윤이 노트북에 "세입자 한소원 리스크 관리 항목"을 입력한다. 1번부터 6번까지 위험 요소를 적다가 "7. 이상하게 신경이 쓰임"을 치고 즉시 삭제한다. 창밖의 소원이 캐리어를 넘어뜨리는 걸 무표정으로 바라본다.'},
       {num:'S#5',loc:'시크릿가든 주방 / 다음날 아침',chars:['소원','재윤'],desc:'첫 공사날 소원이 수도꼭지를 틀자 수도관이 터져 물벼락. 재윤이 뛰어내려와 밸브를 잠그며 "체크리스트 제출하세요"라고 말한다. 소원 "지금 물이 이렇게 나오는데요?" 재윤 "그러니까 체크리스트가 필요한 겁니다." 공구 가방을 가져와 직접 배관을 수리하는 재윤.'},
       {num:'S#6',loc:'빈 상가 / 저녁',chars:['소원'],desc:'해가 지고 텅 빈 공간에 혼자 남은 소원. 바닥에 손바닥을 대고 엄마에게 속삭인다. 위층에서 재윤의 발소리가 계단을 내려오다 멈춘다. 소원, 숨을 참는다. 재윤의 발소리가 다시 올라간다. 소원, 혼자 웃는다.'},
       {num:'S#7',loc:'골목 앞 / 저녁',chars:['소원','재윤'],desc:'소원이 손글씨 간판 시안을 들고 간판 자리를 올려다보며 흐뭇해한다. 재윤이 뒤에서 나타나 "간판 허가 신청 하셨어요?"라고 묻는다. 소원이 굳는다. 재윤이 종이를 받아 들여다보는 순간 표정이 미세하게 흔들린다. "시크릿가든..." ? 아는 사람처럼.'},
       {num:'S#8',loc:'골목 / 밤 (엔딩)',chars:['소원','재윤'],desc:'재윤이 허가 양식을 올려드리겠다며 돌아선다. 소원이 그 뒷모습을 보며 "표정이 잠깐 달라졌는데"라고 중얼거린다. 재윤, 걸음을 멈추지 않는다. 그러나 주머니 속 손이 말려든다. (엔딩) 골목 가로등이 켜지며 암전.'},
     ]
    },
    {num:2,title:'당신이 숨긴 것',
     logline:'소원의 직접 추궁에 교묘히 빠져나가는 재윤, 그러나 시장에서의 작은 행동 하나가 둘 사이에 씨앗을 심는다',
     story:'소원이 재개발 소문을 들었다며 재윤에게 정면 추궁하지만 재윤은 "확정된 게 없다"며 교묘히 회피한다. 이날 소원 고모(55)가 나타나 권리금 3000만원을 요구하며 갈등을 키운다. 재윤은 고모가 돌아가는 걸 목격한다. 주말 재래시장에서 우연히 마주친 두 사람. 소원이 식재료를 잔뜩 사고 비틀거리자 재윤이 말없이 무거운 짐을 들어준다. 집에 돌아온 소원, 처음으로 재윤을 다르게 본다.',
     keyScene:'S#5. 재래시장 / 낮. 소원이 식재료를 한가득 사고 비틀거리는 순간 재윤이 말없이 무거운 봉투를 가져간다. "감사합니다"라는 말에 재윤이 "짐이 떨어질 것 같아서요"라며 돌아보지 않고 걷는다. 서브텍스트: 나는 당신이 좋은 게 아니라 그냥 짐이 떨어질 것 같았던 것.',
     ending:'재윤이 착공 일정 조율 요청 문자를 보내려다 멈춘다. 소원 이름 위에 손가락이 1초 머문다 ? 화면 암전',
     scenes:[
       {num:'S#1',loc:'건물 복도 / 아침',chars:['소원','재윤'],desc:'소원이 재개발 소문을 들었다며 정면 추궁. 재윤은 "확정된 게 없다"며 교묘히 빠져나간다. 소원 "확정되면 저한테 먼저 알려주시죠?" 재윤 "계약서에 없는 조항입니다." 재윤의 표정 변화 없음 ? 소원만 손해.'},
       {num:'S#2',loc:'시크릿가든 주방 / 낮',chars:['소원'],desc:'소원이 엄마 레시피 재현에 도전하지만 맛이 다르다. 뭔가 빠진 느낌. 레시피 노트를 들여다보다 "엄마, 이거 다 써줬는데 왜 안 되지"라며 혼잣말. 재윤이 위층에서 이 소리를 듣는다 (O.S).'},
       {num:'S#3',loc:'건물 입구 / 낮',chars:['소원','소원고모'],desc:'소원 고모 나순희(55)가 등장. "권리금 3000만원 없으면 이 자리 빼주면 어때"라며 압박. 소원 "고모, 여기 엄마 자리야" 나순희 "감상적으로 굴지 마. 돈이 없으면 감상도 없어." 재윤이 멀리서 이 장면을 목격.'},
       {num:'S#4',loc:'재윤 사무실 / 낮',chars:['재윤'],desc:'재윤이 소원 고모와의 장면을 떠올린다. 서류에 "세입자 리스크 - 가족 분쟁" 메모를 추가하려다 멈춘다. 손가락이 키보드 위에 잠시 머문다. 메모는 입력하지 않는다.'},
       {num:'S#5',loc:'재래시장 / 낮',chars:['소원','재윤'],desc:'우연히 시장에서 마주친 두 사람. 소원이 식재료를 한가득 들고 비틀거리는 순간 재윤이 말없이 무거운 봉투를 가져간다. 소원 "감사합니다" 재윤 "짐이 떨어질 것 같아서요" ? 돌아보지 않고 걷는다. 서브텍스트 대사의 교과서.'},
       {num:'S#6',loc:'시크릿가든 앞 골목 / 낮',chars:['소원','재윤'],desc:'집으로 돌아온 두 사람, 건물 앞에서 헤어진다. "들어오실 거예요?" 소원 물음에 재윤 "아니요." 소원 "그럼 왜 여기까지 오셨어요?" 재윤 "..." 걸어간다. 소원이 그 뒷모습을 본다. 처음으로 다르게.'},
       {num:'S#7',loc:'시크릿가든 / 저녁',chars:['소원'],desc:'소원이 오늘 산 식재료로 요리를 시작한다. 레시피 노트를 보며 만드는 국. 한 모금 마시는 순간 ? 눈물이 난다. 엄마 맛이 나서. 엄마가 뭘 빠뜨렸는지가 아니라, 자신이 뭘 잊고 있었는지를 깨닫는다.'},
       {num:'S#8',loc:'재윤 사무실 / 밤 (엔딩)',chars:['재윤'],desc:'재윤이 착공 일정 조율 문자를 쓰다 멈춘다. 받는 사람: 한소원. 손가락이 1초 머문다. 전송 버튼 대신 화면을 끈다. (엔딩) 꺼진 핸드폰 화면 클로즈업 ? 암전.'},
     ]
    },
    {num:3,title:'레시피엔 없는 것',
     logline:'엄마 레시피 재현 실패로 무너지는 소원. 전 남자친구의 등장으로 처음 견제 감정을 느끼는 재윤',
     story:'소원이 엄마 레시피 재현을 반복하지만 계속 실패. 레시피 노트에 적힌 모든 재료를 다 써도 그 맛이 안 난다. 오후에 전 남자친구 박현우(28)가 느닷없이 나타나 "소원아, 나 왔어"라며 반갑게 들어온다. 재윤이 이 장면을 목격하고 처음으로 서류 넘기는 손이 멈춘다. 저녁 소원이 혼자 옥상에 올라가 울고 있을 때 재윤이 우연히 올라온다. 두 사람이 처음으로 긴 대화를 나눈다. 재윤이 내려가며 소원의 레시피 노트 뒷면에서 이 건물 주소를 발견한다.',
     keyScene:'S#6. 옥상 / 저녁. 소원이 혼자 울고 있다가 재윤과 마주친다. 재윤 "왜 우세요?" 소원 "엄마 생각 나서요." 긴 침묵. 재윤이 처음으로 소원 옆에 앉는다. 두 사람, 말없이 마포구 불빛을 바라본다. 재윤이 처음으로 "여기 오래됐나요, 이 건물"이라고 묻는다.',
     ending:'재윤이 내려가다 조리대 위 레시피 노트를 집는다. 뒷면을 펼치는 순간 ? 이 건물 주소와 엄마 이름이 적혀있다. 재윤의 얼굴이 굳는다 ? 화면 암전',
     scenes:[
       {num:'S#1',loc:'시크릿가든 주방 / 아침',chars:['소원'],desc:'다섯 번째 레시피 재현 실패. 소원이 냄비를 내려놓으며 레시피 노트를 처음부터 다시 읽는다. 재료 다 맞다. 온도 다 맞다. 시간 다 맞다. 근데 왜 안 되지. 소원 혼잣말 "엄마, 뭘 숨긴 거야."'},
       {num:'S#2',loc:'재래시장 / 낮',chars:['소원'],desc:'소원이 다른 재료를 사러 시장에 나간다. 시장 어르신들이 소원을 보며 "정순이 딸이야?" 물어보자 소원이 처음으로 무너지려 한다. "네, 정순이 딸이에요"라고 겨우 대답하고 뒤돌아 눈물을 닦는다.'},
       {num:'S#3',loc:'시크릿가든 / 낮',chars:['소원','현우'],desc:'박현우(28)가 느닷없이 나타난다. "소원아, 나 왔어. 잘 지냈어?" 소원 "뭐야 갑자기." 현우 "네가 여기 식당 한다고 소문 났더라. 내가 도와줄까?" 소원 "됐어요, 저 바빠요." 현우가 환하게 웃으며 안으로 들어온다.'},
       {num:'S#4',loc:'2층 복도 / 낮',chars:['재윤'],desc:'재윤이 아래층에서 들려오는 남자 목소리에 발을 멈춘다. 계단을 내려다보는 재윤. 현우가 소원과 웃으며 대화하는 장면이 보인다. 재윤, 손에 들고 있던 서류를 한 장 넘긴다. 넘기는 손이 평소보다 느리다.'},
       {num:'S#5',loc:'시크릿가든 앞 골목 / 오후',chars:['소원','현우','재윤'],desc:'현우가 소원에게 "저녁 같이 먹자"라고 제안하는 순간 재윤이 건물 밖으로 나온다. 현우 "안녕하세요, 저 박현우예요. 소원이 친구." 재윤, 현우를 한 번 보고 소원을 본다. 소원이 어색하게 웃는다. 재윤, 아무 말 없이 지나간다.'},
       {num:'S#6',loc:'옥상 / 저녁',chars:['소원','재윤'],desc:'소원이 혼자 올라와 마포구 불빛을 보며 운다. 재윤이 환기구 점검하러 올라와 소원을 발견한다. "왜 우세요?" 소원이 엄마 이야기를 처음으로 꺼낸다. 재윤이 아무 말 않고 옆에 앉는다. 두 사람 처음으로 나란히 앉아 침묵하는 장면.'},
       {num:'S#7',loc:'옥상 / 저녁 (연속)',chars:['소원','재윤'],desc:'재윤이 처음으로 개인적인 질문을 한다. "오래 비어있었나요, 저 자리." 소원 "네, 엄마 돌아가시고 2년." 재윤이 뭔가를 알고 있는 듯 잠깐 멈추지만 말하지 않는다. 소원 "건물주 님은 왜 여기 계세요?" 재윤 "...그냥요." 두 사람, 불빛을 바라본다.'},
       {num:'S#8',loc:'시크릿가든 / 밤 (엔딩)',chars:['재윤'],desc:'재윤이 내려가다 조리대 위 레시피 노트를 무심코 집는다. 뒷면을 펼치는 순간 ? 손글씨: 이 건물 주소, 아래 "정순 2001.3 첫 계약" 이라고 적혀있다. 재윤의 얼굴이 굳는다. (엔딩) 노트를 내려놓는 손이 조금 떨린다 ? 암전.'},
     ]
    },
    {num:4,title:'건물주의 비밀',
     logline:'재윤이 소원 엄마 식당과 자신 아버지의 연결고리를 알게 되고, 두 번째 거짓말을 선택한다',
     story:'재윤이 레시피 노트의 주소를 보고 아버지 회사 서류를 뒤진다. 2001년 이 자리 계약, 2008년 재개발로 퇴거 요청, 요청서에 도장 찍은 사람: JW디벨롭먼트 강진혁 (재윤 아버지). 재윤이 처음으로 소원에게 죄책감을 느낀다. 그날 측량팀이 건물 앞에 나타나자 소원이 재윤에게 눈빛으로 묻는다. 재윤이 "오래된 건물 안전 점검"이라고 두 번째 거짓말을 한다. 저녁 재윤이 처음으로 아버지에게 착공을 늦출 수 있냐고 연락한다.',
     keyScene:'S#4. 재윤 사무실 / 낮. 재윤이 회사 서류에서 2008년 퇴거 요청서를 발견한다. "요청자: 강진혁." 재윤의 손이 멈춘다. 창밖의 소원이 주방에서 요리하는 모습이 보인다. 재윤, 서류를 서랍에 넣는다. 표정이 처음으로 무너진다.',
     ending:'재윤이 아버지에게 문자를 보낸다. "착공 6개월 연장 가능합니까." 전송. 아버지 답장: "이유가 뭐냐." 재윤, 답장하지 않는다. 핸드폰을 내려놓는다 ? 암전',
     scenes:[
       {num:'S#1',loc:'재윤 사무실 / 아침',chars:['재윤'],desc:'재윤이 레시피 노트 주소를 확인하고 회사 서류를 뒤진다. 2001년 이 건물 최초 계약서 발견. 계약자: 한정순. 재윤이 그 이름을 보고 멈춘다.'},
       {num:'S#2',loc:'재윤 사무실 / 아침 (연속)',chars:['재윤'],desc:'2008년 재개발 퇴거 요청서 발견. "요청자: JW디벨롭먼트 대표이사 강진혁 (인)." 재윤 아버지. 재윤의 손이 떨린다. 창밖으로 소원이 주방에서 노래 흥얼거리는 모습이 보인다.'},
       {num:'S#3',loc:'시크릿가든 / 낮',chars:['소원'],desc:'소원이 드디어 레시피를 조금 더 가깝게 재현하는 데 성공한다. 혼자 먹어보고 "아직 아니네"라고 말하지만 처음으로 웃는다. 엄마한테 "조금만 기다려, 거의 다 왔어"라고 속삭인다.'},
       {num:'S#4',loc:'건물 앞 / 낮',chars:['소원','재윤','측량팀'],desc:'측량팀 3명이 건물 앞에 나타나 측량 장비를 설치한다. 소원이 재윤에게 달려가 눈빛으로 묻는다. 재윤 "오래된 건물 안전 점검입니다." 소원이 그 말을 믿는 눈빛 ? 재윤이 시선을 피한다.'},
       {num:'S#5',loc:'건물 복도 / 오후',chars:['소원','재윤'],desc:'소원이 재윤에게 "재개발 계획이 없는 거 맞죠?"라고 다시 묻는다. 재윤 "제가 말씀드릴 수 있는 건 아직 없습니다." 소원 "그게 예스예요 노예요?" 재윤 "그냥 요리나 하세요." 소원의 얼굴이 굳는다.'},
       {num:'S#6',loc:'재래시장 / 저녁',chars:['소원','현우'],desc:'현우가 다시 나타나 소원과 시장을 걷는다. "소원아, 사실 나 아직도 너 좋아해." 소원 "알아. 근데 그때 우리가 왜 헤어진 거 알잖아." 현우 "...그래도." 소원 "됐어요." 둘이 걸어가는 걸 재윤이 멀리서 본다.'},
       {num:'S#7',loc:'재윤 사무실 / 밤',chars:['재윤'],desc:'재윤이 서류를 꺼내 다시 본다. 2008년 퇴거 요청서. 한정순이 이 건물에서 나가게 된 날 ? 그건 소원이 가난해진 날이기도 하다. 재윤이 처음으로 죄책감을 느끼는 씬.'},
       {num:'S#8',loc:'재윤 사무실 / 밤 (엔딩)',chars:['재윤'],desc:'재윤이 아버지에게 문자를 보낸다. "착공 6개월 연장 가능합니까." 전송. 아버지 즉시 답장: "이유가 뭐냐." 재윤, 핸드폰을 내려놓는다. 대답하지 않는다. (엔딩) 꺼진 화면 위 재윤 얼굴 클로즈업 ? 암전.'},
     ]
    },
    {num:5,title:'시크릿가든, 열다',
     logline:'소프트 오픈 성공 직전 "정순이 맛"이라는 한마디에 무너지는 소원. 재윤, 처음으로 자신의 감정을 인식한다',
     story:'시크릿가든 소프트 오픈 날. 소원이 처음으로 손님을 받는다. 동네 어르신 한 분이 국 한 숟가락 드시더니 "정순이 맛이네"라고 하는 순간 소원이 울음을 터뜨린다. 재윤이 이 장면을 2층 창가에서 본다. SNS에 위생 악플이 달리기 시작하고 소원이 혼자 댓글을 읽다가 무너진다. 재윤이 내려와 소원의 핸드폰을 뺏으며 "이런 거 읽으면 안 돼요"라고 말한다. 처음으로 소원에게 화가 나는 재윤. 자신이 왜 화가 나는지 모른다.',
     keyScene:'S#5. 시크릿가든 / 저녁. 재윤이 소원의 핸드폰을 뺏는다. 소원 "돌려줘요." 재윤 "이런 거 읽으면 안 된다고요." 소원 "남의 핸드폰 왜 뺏어요." 재윤 "..." 왜 자신이 화가 났는지 모른다. 핸드폰을 내려놓고 나간다. 소원이 재윤의 뒷모습을 본다.',
     ending:'재윤이 사무실에서 소원 문자를 보려다 핸드폰을 보니 오지수 부재중 7통. 재윤이 잠시 보다가 화면을 꺼버린다 ? 암전',
     scenes:[
       {num:'S#1',loc:'시크릿가든 / 아침',chars:['소원'],desc:'소프트 오픈 준비하는 소원. 처음으로 문 앞에 칠판에 "오늘 열었어요 ??"라고 쓴다. 재윤이 위층에서 이 모습을 창가에서 본다. 소원이 칠판을 보고 엄마한테 "드디어야" 라고 속삭인다.'},
       {num:'S#2',loc:'시크릿가든 / 낮',chars:['소원','손님들'],desc:'첫 손님들이 들어온다. 동네 어르신들. 국을 한 숟가락 든 할머니가 잠깐 멈춘다. "이거 정순이 맛이네." 소원이 그 말을 듣는 순간 눈물이 흐른다. 재윤이 2층 창가에서 이 장면을 본다.'},
       {num:'S#3',loc:'시크릿가든 / 오후',chars:['소원'],desc:'오픈 후 SNS에 누군가 올린 "위생 불량" 사진과 악플이 달리기 시작한다. 소원이 댓글을 하나하나 읽으며 얼굴이 굳어간다. 현우가 문자를 보낸다. "무시해. 네 음식 맛있어." 소원이 문자를 보고 더 슬프다.'},
       {num:'S#4',loc:'계단 / 저녁',chars:['소원','재윤'],desc:'소원이 계단에 주저앉아 핸드폰을 보고 있다. 재윤이 내려오다 발견한다. "뭐 봐요?" 소원이 핸드폰을 숨기려 하지만 재윤이 보인다 ? 악플 댓글들. 재윤이 손을 내민다.'},
       {num:'S#5',loc:'계단 / 저녁 (연속)',chars:['소원','재윤'],desc:'재윤이 소원의 핸드폰을 뺏는다. "이런 거 읽으면 안 돼요." 소원 "남의 핸드폰 왜요?" 재윤 "..." 자신도 모르게 화가 나 있다. 핸드폰을 내려놓고 위층으로 올라간다. 소원이 그 뒷모습을 본다. 처음 보는 표정.'},
       {num:'S#6',loc:'시크릿가든 / 밤',chars:['소원'],desc:'영업이 끝난 후 소원이 혼자 국을 끓인다. 할머니 말이 계속 들린다. "정순이 맛이네." 이번엔 울지 않는다. 한 숟가락 먹고 웃는다. "엄마, 됐다."'},
       {num:'S#7',loc:'재윤 사무실 / 밤',chars:['재윤'],desc:'재윤이 소원에게 문자를 쓰려고 핸드폰을 든다. "수고하셨어요." 쓰다가 지운다. "오늘 많이 힘드셨죠." 쓰다가 지운다. 결국 아무 것도 보내지 않는다.'},
       {num:'S#8',loc:'재윤 사무실 / 밤 (엔딩)',chars:['재윤'],desc:'핸드폰을 내려놓으려는 순간 오지수 부재중 7통. 재윤이 보다가 화면을 꺼버린다. (엔딩) 꺼진 핸드폰 화면 위 재윤 얼굴 ? 암전.'},
     ]
    },
    {num:6,title:'균열',
     logline:'재개발 현수막에서 이 건물 주소를 발견한 소원. 재윤은 사과하지 못한다',
     story:'소원이 동네 공고문 게시판에서 재개발 대상 건물 목록을 발견한다. 이 건물 주소가 있다. 소원이 재윤을 찾아가 직접 묻는다. 재윤이 처음으로 회피하지 않고 "사실입니다"라고 말한다. 소원이 "처음부터 알고 있었죠?"라고 묻는다. 재윤이 대답하지 못한다. 소원이 나간다. 재윤이 소원을 잡지 못한다.',
     keyScene:'S#4. 재윤 사무실 / 낮. 소원 "처음부터 알고 있었죠?" 재윤이 대답하지 않는다. 침묵이 정답이 된다. 소원 "왜요? 왜 그랬어요?" 재윤 "..." 소원이 일어선다. "됐어요." 나간다. 재윤이 일어서지 못한다.',
     ending:'재윤이 혼자 남은 사무실에서 소원의 빈 조리대를 내려다본다. 내려가 앞치마를 집어 든다. 손에 쥔다. 내려놓지 못한다 ? 암전',
     scenes:[
       {num:'S#1',loc:'동네 게시판 / 아침',chars:['소원'],desc:'소원이 지나가다 재개발 공고문을 보다 멈춘다. 대상 건물 목록에서 이 건물 주소를 발견한다. 소원의 얼굴이 굳는다. 손가락이 주소 위에 멈춘다.'},
       {num:'S#2',loc:'건물 계단 / 아침',chars:['소원'],desc:'소원이 2층으로 올라가는 계단. 발이 무겁다. 재윤의 사무실 문 앞에서 잠시 멈춘다. 노크한다.'},
       {num:'S#3',loc:'재윤 사무실 / 낮',chars:['소원','재윤'],desc:'소원이 들어와 앉는다. "재개발 대상 건물이에요, 여기." 재윤이 움직이지 않는다. "알고 계셨어요?" 재윤 "...네." 소원 "처음부터요?" 재윤이 대답하지 않는다. 침묵이 대답.'},
       {num:'S#4',loc:'재윤 사무실 / 낮 (연속)',chars:['소원','재윤'],desc:'소원 "왜요? 왜 그랬어요?" 재윤이 말을 찾는다. 찾지 못한다. 소원이 일어선다. "됐어요. 이제 알았으니까." 나간다. 재윤이 일어서려 하지만 못한다. 문이 닫힌다.'},
       {num:'S#5',loc:'건물 밖 골목 / 낮',chars:['소원'],desc:'소원이 골목을 걷다 멈춘다. 울 것 같지만 울지 않는다. 핸드폰을 꺼낸다. 현우에게 전화하려다 멈춘다. 넣는다. 혼자 걷는다.'},
       {num:'S#6',loc:'재윤 사무실 / 오후',chars:['재윤'],desc:'재윤이 소원 계약서를 꺼낸다. 해지 통보 양식을 연다. 입력하려다 멈춘다. 닫는다. 다시 열어 입력하려다 다시 멈춘다. 닫는다.'},
       {num:'S#7',loc:'건물 복도 / 저녁',chars:['재윤'],desc:'재윤이 아래층을 내려다본다. 시크릿가든 불이 꺼져있다. 소원이 오지 않았다. 처음으로 어두운 1층이 낯설게 느껴진다.'},
       {num:'S#8',loc:'시크릿가든 / 밤 (엔딩)',chars:['재윤'],desc:'재윤이 내려와 빈 상가 문을 연다. 조리대 위 앞치마 하나. 재윤이 다가가 앞치마를 집어 든다. 손에 쥔다. 내려놓지 못한다. (엔딩) 앞치마를 쥔 손 클로즈업 ? 암전.'},
     ]
    },
    {num:7,title:'레시피대로 되지 않는 것',
     logline:'재개발 재검토를 선언하고 처음으로 진심으로 사과하는 재윤. 소원의 마음이 흔들린다',
     story:'재윤이 아버지 회사에 재개발 재검토 공문을 보낸다. 아버지가 격노하며 직접 찾아온다. 부자 간의 충돌. 재윤이 이기지 못하지만 포기하지 않는다. 소원을 찾아가 처음으로 진심으로 사과한다. 소원이 문을 열어주지 않는다. 재윤이 문 앞에서 "죄송합니다. 한 번만 더 기회를 주세요"라고 말한다. 소원이 문을 열지 않는다. 재윤이 돌아서는 순간 문이 열린다.',
     keyScene:'S#6. 시크릿가든 앞 / 저녁. 재윤이 문 앞에서 말한다. "처음부터 알고 있었습니다. 그리고 아버지 회사가 과거에 이 자리에서 어머님을 내보낸 것도 알고 있습니다." 소원의 숨소리가 문 안쪽에서 들린다. 재윤 "죄송합니다. 진심으로." 긴 침묵. 문이 열린다.',
     ending:'"가스 밸브 점검해줄 수 있어요?" 소원이 먼저 말한다. 재윤 "반시계입니다." 둘 다 웃음 ? 처음으로 같이 웃는다',
     scenes:[
       {num:'S#1',loc:'재윤 사무실 / 아침',chars:['재윤'],desc:'재윤이 아버지 회사에 재개발 재검토 공문을 보낸다. 전송 버튼을 누른 후 잠시 멈춘다. 그리고 핸드폰을 내려놓는다.'},
       {num:'S#2',loc:'재윤 사무실 / 낮',chars:['재윤','재윤아버지'],desc:'아버지 강진혁이 격노하며 직접 찾아온다. "네가 감히." 재윤 "사유가 있습니다." 아버지 "사유가 세입자냐?" 재윤이 대답하지 않는다. 이기지 못하지만 포기하지 않는다.'},
       {num:'S#3',loc:'골목 / 낮',chars:['소원'],desc:'소원이 가게 문을 열지 않고 골목을 걷는다. 현우가 전화를 한다. "소원아, 나 도와줄까." 소원 "됐어요." 전화를 끊는다. 혼자 걷는다. 엄마 사진을 꺼내본다.'},
       {num:'S#4',loc:'재래시장 / 낮',chars:['소원','동네어르신'],desc:'시장 할머니가 소원을 보며 "식당 왜 안 열어?" 소원 "잠깐 쉬고 있어요." 할머니 "정순이가 봤으면 뭐라 했겠어." 소원이 그 말에 멈춘다.'},
       {num:'S#5',loc:'시크릿가든 앞 / 저녁',chars:['소원','재윤'],desc:'재윤이 문 앞에서 말한다. 처음부터 알고 있었다는 것. 아버지 회사가 과거에 이 자리에서 어머님을 내보낸 것도. 소원의 숨소리가 문 안쪽에서 들린다. 재윤 "죄송합니다. 진심으로." 긴 침묵.'},
       {num:'S#6',loc:'시크릿가든 앞 / 저녁 (연속)',chars:['소원','재윤'],desc:'재윤이 돌아서는 순간 문이 열린다. 소원이 나온다. 두 사람이 마주선다. 소원이 한참 재윤을 본다. 재윤이 시선을 피하지 않는다.'},
       {num:'S#7',loc:'시크릿가든 주방 / 저녁',chars:['소원','재윤'],desc:'소원이 재윤에게 국 한 그릇을 내민다. 재윤이 먹는다. 침묵. 소원 "맛있어요?" 재윤 "...네." 소원 "다행이다." 처음으로 두 사람이 같은 시간에 같은 공간에서 편하게 있는다.'},
       {num:'S#8',loc:'시크릿가든 / 밤 (엔딩)',chars:['소원','재윤'],desc:'재윤이 나가려는 순간 소원이 먼저 말한다. "가스 밸브 점검해줄 수 있어요?" 재윤 잠깐 멈추고 돌아본다. "반시계입니다." 둘 다 웃는다. (엔딩) 처음으로 같이 웃는 두 사람 ? 페이드 아웃.'},
     ]
    },
    {num:8,title:'시크릿가든, 다시',
     logline:'재개발 철회 서류에 서명하는 재윤. 간판에 불이 켜지며 두 사람이 완성된다',
     story:'재윤이 재개발 철회 서류에 서명하고 아버지 회사에 제출한다. 소원 고모의 권리금 문제도 재윤이 직접 해결한다. 시크릿가든 정식 오픈 날. 골목에 가득 찬 손님들. 저녁 간판에 처음으로 불이 켜진다. 재윤이 2층에서 내려다본다. 소원이 올려다본다. 두 사람이 마주본다. 재윤이 계단을 내려온다. 소원이 기다린다. 엔딩.',
     keyScene:'S#7. 시크릿가든 앞 골목 / 저녁. 간판에 불이 켜진다. 소원이 올려다본다. 재윤이 2층에서 창가를 통해 내려다본다. 두 사람의 시선이 만난다. 재윤이 계단을 내려온다. 소원이 골목에서 기다린다. 재윤이 골목 입구에 선다. 두 사람 사이 거리, 세 걸음.',
     ending:'시크릿가든 간판이 환하게 켜진다. 골목 불빛 아래 두 사람 ? 화면 천천히 페이드 아웃',
     scenes:[
       {num:'S#1',loc:'재윤 사무실 / 아침',chars:['재윤'],desc:'재윤이 재개발 철회 서류에 서명한다. 손이 떨리지 않는다. 아버지 회사로 전자 문서를 전송한다. 아버지 전화가 오지만 받지 않는다.'},
       {num:'S#2',loc:'재윤 사무실 / 낮',chars:['재윤','소원고모'],desc:'소원 고모 나순희가 재윤에게 찾아온다. 재윤이 권리금 3000만원 해결 방법을 직접 제안한다. 고모 "왜요?" 재윤 "제가 처음에 잘못한 게 있어서요." 고모가 재윤을 한참 바라본다.'},
       {num:'S#3',loc:'시크릿가든 / 아침',chars:['소원'],desc:'소원이 정식 오픈 준비를 한다. 칠판에 메뉴를 새로 쓴다. 엄마 레시피 노트를 열어 보다가 처음 페이지를 본다. 엄마 손글씨: "맛있는 건 마음이야." 소원이 그 뜻을 이제 안다.'},
       {num:'S#4',loc:'시크릿가든 / 낮',chars:['소원','손님들'],desc:'정식 오픈. 골목에 줄이 선다. 소원이 국을 내리며 하나하나 눈을 맞춘다. 동네 어르신 "정순이 딸이 진짜 정순이 맛을 냈네." 소원이 이번엔 울지 않는다. 웃는다.'},
       {num:'S#5',loc:'재윤 사무실 / 낮',chars:['재윤'],desc:'아버지에게서 문자가 온다. "철회 서류 접수됐다. 이번 결정 후회할 거다." 재윤이 문자를 보고 창밖의 시크릿가든을 본다. 골목에 사람들이 가득하다. 후회하지 않는다.'},
       {num:'S#6',loc:'골목 / 저녁',chars:['소원','현우'],desc:'현우가 마지막으로 소원에게 찾아온다. "나 기다릴게." 소원 "안 기다려도 돼요." 현우 "왜?" 소원 "...그냥요." 현우가 웃으며 간다. "잘 돼라, 시크릿가든." 소원이 배웅한다.'},
       {num:'S#7',loc:'시크릿가든 앞 / 저녁',chars:['소원','재윤'],desc:'어둠이 내리자 간판에 처음으로 불이 켜진다. 소원이 올려다본다. 재윤이 2층 창가에서 내려다본다. 두 사람의 시선이 만난다. 재윤이 계단을 내려온다. 소원이 기다린다. 재윤이 골목 입구에 선다. 세 걸음 거리.'},
       {num:'S#8',loc:'시크릿가든 앞 / 밤 (엔딩)',chars:['소원','재윤'],desc:'재윤이 세 걸음을 걷는다. 소원이 그 자리에 서있다. 두 사람이 마주선다. 말이 없다. 말이 필요 없다. 시크릿가든 간판이 환하게 켜진다. (엔딩) 골목 불빛 아래 두 사람 ? 화면 천천히 페이드 아웃.'},
     ]
    },
  ],
  _script:[
    {heading:'S# 1. 골목길 / 낮',lines:[
      {type:'action',text:'서울 마포구 어딘가. 오래된 주택가 골목.'},
      {type:'action',text:'빛바랜 간판들 사이, 유독 낡은 2층 건물 하나가 눈에 띈다. 1층 유리창에 손글씨로 쓴 임대 전단지가 붙어 있다.'},
      {type:'direction',text:'[INSERT ? 손글씨 전단지: "1층 상가 임대. 문의 010-XXXX-XXXX"]'},
      {type:'action',text:'골목 초입에 커다란 캐리어 두 개를 질질 끌며 나타나는 한소원(25). 머리는 반쯤 풀렸고, 앞치마를 가방에 매달고 왔다. 보는 것만으로도 숨이 찬 행색.'},
      {type:'action',text:'소원, 건물을 올려다보며 눈을 가늘게 뜬다.'},
      {type:'dialog',char:'소원',paren:'중얼거리며',line:'맞네, 맞아. 엄마가 맨날 여기 앉아서 파 다듬었잖아.'},
      {type:'action',text:'소원의 시선이 1층 유리창 너머 텅 빈 공간에 닿는다. 눈가가 살짝 떨린다. 금방이라도 울 것 같은 얼굴.'},
      {type:'action',text:'소원, 깊게 숨을 들이마신다. 그리고 말을 꺼내려는 순간?'},
      {type:'dialog',char:'소원',paren:'훌쩍이며',line:'엄마, 나 왔어?'},
      {type:'direction',text:'쾅!'},
      {type:'action',text:'열려 있던 건물 문이 바람에 세게 닫히며 소원의 이마를 정통으로 강타한다.'},
      {type:'dialog',char:'소원',paren:'',line:'아악!!'},
      {type:'action',text:'캐리어 두 개가 도미노처럼 쓰러진다.'},
      {type:'direction',text:'(E) 쿵, 쾅, 데구르르?'},
      {type:'action',text:'소원, 이마를 부여잡고 그 자리에 쪼그려 앉는다. 한동안 꼼짝을 못 한다.'},
      {type:'dialog',char:'소원',paren:'눈물 글썽이며, 혼잣말',line:'...하필 지금.'},
      {type:'action',text:'골목을 지나던 동네 고양이 한 마리가 소원을 물끄러미 바라본다.'},
      {type:'dialog',char:'소원',paren:'고양이에게',line:'너도 봤어? 못 본 거야.'},
    ]},
    {heading:'S# 2. 건물 1층 계단 입구 / 낮',lines:[
      {type:'action',text:'소원, 이마를 부여잡고 비틀거리며 건물 안으로 들어선다.'},
      {type:'action',text:'계단 위에서 서류를 들고 내려오던 강재윤(29)과 정면으로 부딪힌다.'},
      {type:'action',text:'서류가 공중으로 흩날린다. 두 사람, 동시에 굳는다.'},
      {type:'action',text:'재윤, 흩어진 서류를 내려다본다. 천천히. 아주 천천히.'},
      {type:'dialog',char:'재윤',paren:'조용하고 건조하게',line:'...지금 뭐 하신 거예요.'},
      {type:'dialog',char:'소원',paren:'이마 잡은 채',line:'저도 몰라요! 문이 먼저?'},
      {type:'dialog',char:'재윤',paren:'',line:'서류가 열두 장입니다.'},
      {type:'dialog',char:'소원',paren:'',line:'예?'},
      {type:'dialog',char:'재윤',paren:'',line:'지금 바닥에 열두 장이 흩어져 있어요. 순서 다 뒤섞였고요.'},
      {type:'dialog',char:'소원',paren:'얼른 줍기 시작하며',line:'아, 죄송해요! 제가 주울게요?'},
      {type:'action',text:'바닥에 쪼그려 앉은 소원, 서류를 집다가 캐리어에 걸려 앞으로 쏠린다.'},
      {type:'action',text:'재윤의 구두 앞으로 고꾸라지는 소원. 정적.'},
      {type:'action',text:'재윤, 소원을 내려다본다. 표정 변화 없음.'},
      {type:'dialog',char:'재윤',paren:'낮게',line:'...혹시 오늘 재수가 없는 날이에요, 원래?'},
      {type:'dialog',char:'소원',paren:'바닥에 엎드린 채, 고개만 들어',line:'아니요. 저 원래 이래요.'},
      {type:'action',text:'재윤, 미간이 좁아진다. 말없이 소원을 일으켜 세울 생각도 없다.'},
      {type:'action',text:'소원, 스스로 일어나 서류를 건넨다. 재윤, 순서를 훑어보더니?'},
      {type:'dialog',char:'재윤',paren:'',line:'열한 장이네요.'},
      {type:'dialog',char:'소원',paren:'',line:'예?'},
      {type:'dialog',char:'재윤',paren:'',line:'한 장 어디 있어요.'},
      {type:'direction',text:'(E) 바람에 날리는 소리.'},
      {type:'action',text:'소원, 뒤를 돌아본다. 서류 한 장이 골목 바람에 두둥실 날아가고 있다.'},
      {type:'dialog',char:'소원',paren:'',line:'아??'},
      {type:'action',text:'소원, 캐리어를 내팽개치고 달려간다. 재윤, 그 뒷모습을 본다. 표정 없이.'},
    ]},
    {heading:'S# 3. 건물 1층 빈 상가 / 낮',lines:[
      {type:'action',text:'텅 빈 상가 안. 오래된 타일 바닥, 주방 설비 흔적이 남아있다.'},
      {type:'action',text:'소원, 공간을 천천히 둘러본다. 손끝으로 조리대 흔적을 쓸어본다.'},
      {type:'dialog',char:'소원',paren:'작게, 혼잣말로',line:'엄마 손때가 여기도 있네.'},
      {type:'action',text:'재윤, 출입구에 기대어 계약서를 펼친다. 소원의 감상 따위엔 관심 없다.'},
      {type:'dialog',char:'재윤',paren:'',line:'보증금 오천에 월세 이백오십. 인테리어 공사 시 사전 허가 필수. 영업시간 준수, 소음 기준 초과 시 즉시 시정.'},
      {type:'dialog',char:'소원',paren:'멍하게 듣다가',line:'...저기, 혹시 여기 전에 식당이었나요?'},
      {type:'dialog',char:'재윤',paren:'',line:'네.'},
      {type:'dialog',char:'소원',paren:'',line:'어떤 식당이요?'},
      {type:'action',text:'재윤, 잠깐 서류에서 눈을 뗀다.'},
      {type:'dialog',char:'재윤',paren:'',line:'작은 한식집이었어요. 오래됐는데. 왜요?'},
      {type:'dialog',char:'소원',paren:'피식 웃으며',line:'아뇨. 그냥요.'},
      {type:'action',text:'소원, 창가 쪽으로 걸어가다가 바닥 타일 틈에 걸려 또 비틀한다. 가까스로 벽을 잡는다.'},
      {type:'dialog',char:'재윤',paren:'눈을 감았다 뜨며',line:'하느님, 제가 뭘 잘못했죠.'},
      {type:'dialog',char:'소원',paren:'못 들은 척',line:'계약서 어디 서명하면 돼요?'},
      {type:'action',text:'재윤, 계약서의 서명란을 가리킨다. 소원, 펜을 받아 들고 서명한다.'},
      {type:'action',text:'펜을 돌려주는 소원. 재윤, 계약서를 접어 넣는다.'},
      {type:'dialog',char:'재윤',paren:'',line:'입주는 언제예요?'},
      {type:'dialog',char:'소원',paren:'가방에서 앞치마를 꺼내 두르며',line:'지금요.'},
      {type:'action',text:'재윤, 앞치마를 두른 소원을 본다. 처음으로 표정이 조금 달라진다.'},
      {type:'dialog',char:'재윤',paren:'',line:'...지금요?'},
      {type:'dialog',char:'소원',paren:'씩씩하게',line:'네! 오늘부터 시작할 거예요.'},
      {type:'action',text:'재윤, 잠시 소원을 바라보다 문을 나선다. 문이 닫히는 순간?'},
      {type:'dialog',char:'재윤',paren:'O.S, 아주 작게',line:'...무사하길.'},
    ]},
    {heading:'S# 4. 건물 2층 재윤의 사무실 / 낮',lines:[
      {type:'action',text:'심플하고 정돈된 사무실. 책상 위 물건들이 자로 잰 듯 정렬돼 있다.'},
      {type:'action',text:'재윤, 계약서를 서랍에 넣으며 자리에 앉는다. 노트북을 열고 새 파일을 만든다.'},
      {type:'direction',text:'[INSERT ? 파일명: 세입자 한소원 ? 리스크 관리 항목]'},
      {type:'dialog',char:'재윤',paren:'혼잣말, 무감하게',line:'1. 보행 중 낙상 가능. 2. 캐리어 파손 가능. 3. 화재 위험 있음 ? 저게 주방을 쓴다고?'},
      {type:'action',text:'재윤, 창밖을 내려다본다.'},
      {type:'action',text:'아래 골목에서 소원이 쓰러진 캐리어를 다시 세우다가 또 넘어뜨리고 있다.'},
      {type:'action',text:'재윤의 눈이 가늘어진다.'},
      {type:'dialog',char:'재윤',paren:'중얼',line:'4. 본인이 가장 큰 리스크.'},
      {type:'action',text:'타이핑을 멈추는 재윤. 잠시 생각하더니 다시 키보드를 두드린다.'},
      {type:'dialog',char:'재윤',paren:'혼잣말',line:'5. 소음 유발 가능성 높음.'},
      {type:'action',text:'재윤, 저장을 누른다.'},
      {type:'direction',text:'(E) 아래층에서 올라오는 쿵 소리.'},
      {type:'dialog',char:'재윤',paren:'천장을 올려다보며',line:'...벌써?'},
      {type:'action',text:'재윤, 파일을 열어 항목을 추가한다.'},
      {type:'direction',text:'[INSERT ? 화면: "6. 예상보다 빠른 사고 발생 주기"]'},
      {type:'action',text:'재윤, 저장을 누른다. 그리고 잠시 멈춘다. 항목 하나를 더 추가한다.'},
      {type:'direction',text:'[INSERT ? 화면: "7. 이상하게 신경이 쓰임"]'},
      {type:'action',text:'재윤, 7번 항목을 즉시 삭제한다. 빠르게.'},
    ]},
    {heading:'S# 5. 시크릿가든 (빈 상가 내부) / 저녁',lines:[
      {type:'action',text:'해가 지고, 텅 빈 공간에 소원 혼자 남았다.'},
      {type:'action',text:'주저앉아 무릎을 끌어안는다. 낡은 타일 바닥에 손바닥을 댄다. 차갑고 오래된 감촉.'},
      {type:'dialog',char:'소원',paren:'조용히',line:'엄마. 나 여기 계약했어.'},
      {type:'direction',text:'(E) 골목 바람 소리.'},
      {type:'dialog',char:'소원',paren:'',line:'맨날 이 식당 작고 냄새난다고 했잖아. 미안해. 진짜로.'},
      {type:'action',text:'눈물이 볼을 타고 흐른다. 소원, 손등으로 거칠게 닦는다.'},
      {type:'dialog',char:'소원',paren:'코 훌쩍이며, 억지로 씩씩하게',line:'근데 나 여기서 잘 할 거야. 엄마 레시피대로. 약속해.'},
      {type:'action',text:'소원, 핸드폰을 꺼낸다. 저장된 사진을 연다.'},
      {type:'direction',text:'[INSERT ? 핸드폰 화면: 허름한 식당 앞에서 앞치마 입고 활짝 웃는 중년 여성]'},
      {type:'action',text:'소원, 사진을 한참 보다가.'},
      {type:'dialog',char:'소원',paren:'피식',line:'나도 엄마처럼 웃을 수 있으면 좋겠다.'},
      {type:'action',text:'소원, 사진을 홈 화면으로 설정한다.'},
      {type:'action',text:'그때, 위층에서 재윤의 발소리가 또각또각 들린다.'},
      {type:'action',text:'소원, 얼른 눈물을 닦고 표정을 정돈한다. 아무렇지 않은 척.'},
      {type:'action',text:'발소리가 계단을 내려오다가... 멈춘다.'},
      {type:'action',text:'소원, 숨을 참는다. 잠시 후 발소리가 다시 올라간다.'},
      {type:'action',text:'소원, 긴장을 풀며 다시 바닥에 손을 댄다.'},
      {type:'dialog',char:'소원',paren:'속삭이듯',line:'엄마, 저 잘 할 수 있죠?'},
      {type:'direction',text:'(E) 골목 바람이 창문을 가볍게 두드린다.'},
      {type:'action',text:'소원, 그걸 듣고 작게 웃는다.'},
    ]},
    {heading:'S# 6. 건물 복도 / 저녁',lines:[
      {type:'action',text:'계단을 내려오던 재윤, 상가 문 앞에서 멈춘다.'},
      {type:'action',text:'문 틈으로 흘러나오는 빛. 그리고 소원의 콧소리.'},
      {type:'action',text:'재윤, 문을 열려다가. 멈춘다.'},
      {type:'action',text:'들린다 ? 흐느끼는 소리가 아닌, 콧노래.'},
      {type:'action',text:'엉망진창이지만 어딘가 익숙한 멜로디. 재윤, 미간을 찌푸린다.'},
      {type:'dialog',char:'재윤',paren:'속으로',line:'...저 멜로디.'},
      {type:'action',text:'재윤, 한 발 다가서다가. 돌아선다. 계단을 다시 올라간다. 발소리가 조용해진다.'},
      {type:'action',text:'2층 복도. 재윤, 난간에 손을 얹고 아래를 내려다본다.'},
      {type:'action',text:'상가 문 아래로 새어나오는 불빛이 조용하다.'},
      {type:'dialog',char:'재윤',paren:'혼잣말, 아주 작게',line:'...왜 알고 있지.'},
      {type:'action',text:'재윤, 주머니에 손을 넣고 사무실로 돌아간다.'},
      {type:'action',text:'사무실 불이 켜진다. 재윤, 창가에 서서 골목을 내려다본다.'},
      {type:'dialog',char:'재윤',paren:'',line:'...시크릿가든.'},
      {type:'action',text:'그 이름을 아주 조용히 중얼거린다. 아는 사람처럼.'},
    ]},
    {heading:'S# 7. 시크릿가든 주방 / 다음 날 아침',lines:[
      {type:'action',text:'공사 시작 첫날. 소원, 혼자서 낡은 주방 설비를 닦고 있다. 노래를 흥얼거리며.'},
      {type:'direction',text:'(E) 끼익? 녹슨 수도꼭지 소리.'},
      {type:'action',text:'소원, 수도꼭지를 틀자마자.'},
      {type:'direction',text:'콰아아아!'},
      {type:'action',text:'수도관이 터지며 물이 사방으로 쏟아진다.'},
      {type:'dialog',char:'소원',paren:'',line:'으아아악!!'},
      {type:'action',text:'물벼락을 맞은 소원. 온몸이 흠뻑 젖는다.'},
      {type:'direction',text:'(E) 위층 발소리. 빠르게 내려오는 소리.'},
      {type:'action',text:'재윤, 문을 확 열고 들어오다가. 물 천지인 주방. 흠뻑 젖은 소원. 두 사람, 시선이 마주친다.'},
      {type:'dialog',char:'재윤',paren:'3초 정적 후',line:'...수도 잠금 밸브 위치 파악하고 작업하셨어요?'},
      {type:'dialog',char:'소원',paren:'물 뚝뚝 흘리며',line:'...그게 어딨어요?'},
      {type:'action',text:'재윤, 눈을 감는다.'},
      {type:'dialog',char:'재윤',paren:'조용히, 그러나 단호하게',line:'공사 전 체크리스트. 내일까지 제출해주세요.'},
      {type:'dialog',char:'소원',paren:'황당해서',line:'지금 물이 이렇게 나오는데 체크리스트요?'},
      {type:'dialog',char:'재윤',paren:'',line:'그러니까 체크리스트가 필요한 겁니다.'},
      {type:'action',text:'돌아서는 재윤. 소원, 물 뚝뚝 흘리며 그 뒤통수를 노려본다.'},
      {type:'dialog',char:'소원',paren:'이 갈며, 속으로',line:'저 인간... 로봇이야, 사람이야.'},
      {type:'action',text:'재윤, 문 앞에서 멈춘다. 공구 가방을 들고 돌아온다.'},
      {type:'dialog',char:'재윤',paren:'수도 밸브 앞에 쪼그려 앉으며',line:'수도관 먼저 잠글게요.'},
      {type:'dialog',char:'소원',paren:'',line:'...네?'},
      {type:'dialog',char:'재윤',paren:'렌치를 꺼내며',line:'제 건물이니까요.'},
      {type:'action',text:'소원, 젖은 채로 그 뒷모습을 물끄러미 바라본다.'},
    ]},
    {heading:'S# 8. 시크릿가든 주방 / 아침 (연속)',lines:[
      {type:'action',text:'재윤, 수도 밸브를 잠그고 수도관을 점검한다. 소원은 옆에 서서 젖은 수건으로 바닥을 닦고 있다.'},
      {type:'action',text:'어색한 침묵.'},
      {type:'dialog',char:'소원',paren:'',line:'...건물주가 이런 것도 직접 해요?'},
      {type:'dialog',char:'재윤',paren:'밸브 보며',line:'완벽하게 하려면 직접 해야죠.'},
      {type:'dialog',char:'소원',paren:'피식',line:'그게 완벽주의예요, 아니면 못 믿는 거예요?'},
      {type:'action',text:'재윤, 손이 잠깐 멈춘다.'},
      {type:'dialog',char:'재윤',paren:'무감하게',line:'둘 다요.'},
      {type:'action',text:'소원, 재윤을 본다. 재윤은 계속 수도관을 본다. 소원, 왠지 모르게 시선을 거두지 못한다.'},
      {type:'dialog',char:'재윤',paren:'작업하며',line:'점화 플러그도 확인하셨어요?'},
      {type:'dialog',char:'소원',paren:'',line:'그게 뭔데요?'},
      {type:'action',text:'재윤, 소원을 돌아본다. 가스레인지를 가리킨다.'},
      {type:'dialog',char:'재윤',paren:'',line:'가스레인지요. 직접 하지 마세요. 저한테 연락하면 제가 올게요.'},
      {type:'dialog',char:'소원',paren:'',line:'매번 그러면 귀찮으실 텐데?'},
      {type:'dialog',char:'재윤',paren:'',line:'매번 폭발하는 것보다 낫습니다.'},
      {type:'action',text:'재윤, 렌치를 집어 든다.'},
      {type:'action',text:'소원, 그 옆얼굴을 슬쩍 본다.'},
      {type:'dialog',char:'소원',paren:'혼잣말, 작게',line:'...사람이긴 하네.'},
      {type:'dialog',char:'재윤',paren:'들은 척 안 하고',line:'다음 주 배관 교체 일정 문자로 드릴게요.'},
      {type:'action',text:'재윤, 공구를 정리하고 일어선다. 나가려다가?'},
      {type:'dialog',char:'재윤',paren:'',line:'다치진 않으셨어요?'},
      {type:'dialog',char:'소원',paren:'눈을 크게 뜨며',line:'예?'},
      {type:'dialog',char:'재윤',paren:'다시 가스레인지로 시선 돌리며',line:'앞머리 말고. 손이나.'},
      {type:'dialog',char:'소원',paren:'손을 내려다보다가, 피식',line:'멀쩡해요.'},
      {type:'dialog',char:'재윤',paren:'',line:'다행이네요.'},
      {type:'action',text:'아주 짧게. 그러나 분명히. 재윤, 나간다.'},
    ]},
    {heading:'S# 9. 시크릿가든 앞 골목 / 저녁 ? 엔딩 씬',lines:[
      {type:'action',text:'해가 넘어가는 골목. 소원, 문 앞에 서서 낡은 간판 자리를 올려다본다.'},
      {type:'action',text:'손에 든 것 ? 직접 쓴 간판 시안.'},
      {type:'direction',text:"[INSERT ? 삐뚤빼뚤한 글씨로 쓴 종이: '시크릿가든 ??']"},
      {type:'action',text:'소원, 흐뭇하게 웃는다.'},
      {type:'action',text:'그때 뒤에서 재윤의 목소리.'},
      {type:'dialog',char:'재윤',paren:'O.S',line:'간판 허가 신청 하셨어요?'},
      {type:'action',text:'소원, 굳는다.'},
      {type:'dialog',char:'소원',paren:'천천히 돌아보며',line:'...그것도 해야 해요?'},
      {type:'dialog',char:'재윤',paren:'',line:'건물 외벽 부착물은 구청 허가 사항입니다.'},
      {type:'dialog',char:'소원',paren:'간판 시안을 등 뒤로 슬쩍 숨기며',line:'...몰랐어요.'},
      {type:'dialog',char:'재윤',paren:'소원의 등 뒤를 가리키며',line:'숨기셨는데 이미 봤습니다.'},
      {type:'action',text:'소원, 울상이 된다. 재윤, 소원의 손에서 종이를 가져간다. 들여다본다.'},
      {type:'dialog',char:'재윤',paren:'아주 조용하게, 혼잣말처럼',line:'...시크릿가든.'},
      {type:'action',text:'재윤의 표정이 미세하게 흔들린다. 아주 잠깐. 소원은 못 봤다.'},
      {type:'dialog',char:'재윤',paren:'종이를 돌려주며, 다시 무감하게',line:'허가 양식 올려드릴게요.'},
      {type:'action',text:'돌아서는 재윤. 소원, 종이를 받아 들고 그 뒷모습을 본다.'},
      {type:'dialog',char:'소원',paren:'혼잣말',line:'저 사람, 표정이 잠깐 달라졌는데.'},
      {type:'action',text:'재윤, 걸음을 멈추지 않는다. 그러나.'},
      {type:'action',text:'재윤의 손이 주머니 안에서 살짝 말려든다.'},
      {type:'action',text:'시크릿가든 ? 그 이름을 그는 알고 있다.'},
      {type:'direction',text:'(화면, 천천히 암전)'},
      {type:'direction',text:'? 1화 끝 ?'},
    ]},
  ],
};

function openSampleProject(){
  const sample = SECRET_GARDEN_SAMPLE;
  currentInput = sample;
  _charAutoFilled = false;
  window._scripts = {};
  window._apiSimilar = null;
  window._apiBudgetBreakdown = null;

  // _planData 세팅 (다음화 대본 생성 시 컨텍스트로 사용)
  window._planData = sample._planData ? {
    ...sample._planData,
    title: sample.title,
    episodes: sample._episodes,
  } : {
    title: sample.title,
    logline: sample.logline,
    synopsis: sample._synopsis,
    conflicts: sample._conflicts,
    episodes: sample._episodes,
  };

  // 에피소드 세팅 ? 새 포맷(scenes as objects) 그대로 사용
  aiEpisodes = sample._episodes;

  // 1화 대본 세팅
  window._scripts[0] = sample._script;
  aiScript = sample._script;

  // similar 세팅
  if(sample._planData?.similar) window._apiSimilar = sample._planData.similar;

  applySampleResult(sample);

  showPage('result');
  buildResultPanels();
  updateScriptSidebar();
  showPanel('overview');
  showToast('시크릿가든 샘플을 불러왔습니다.','success','??',2500);
}

function applySampleResult(s){
  // 히어로
  document.getElementById('result-hero-title-el').textContent = s.title;
  document.getElementById('result-logline').textContent = s.logline;
  document.getElementById('result-badge').innerHTML = `? ${s.platform} · ${s.genre} · ${s.episodes}부작`;
  document.getElementById('result-tags').innerHTML =
    `<span class="result-hero-tag">회당 ${s.runtime}분</span>
     <span class="result-hero-tag">총 제작비 127.5억</span>
     <span class="result-hero-tag">PPL 수익 6.5억</span>`;
  document.getElementById('sidebar-title-label').textContent = s.title;
  document.getElementById('sidebar-meta').innerHTML =
    `<span class="meta-tag">${s.platform}</span><span class="meta-tag">${s.genre}</span><span class="meta-tag">${s.episodes}부작</span>`;
  document.getElementById('stat-budget').textContent = '127.5억';
  document.getElementById('stat-scenes').textContent = '200씬';
  document.getElementById('stat-ppl').textContent = '6.5억';

  // 샘플 이미지
  if(sampleImgUrl){
    const hero = document.getElementById('result-hero-sample');
    hero.style.backgroundImage = `url('${sampleImgUrl}')`;
    hero.classList.add('loaded');
    const ob = document.getElementById('overview-img-banner');
    const oi = document.getElementById('overview-sample-img');
    ob.style.display='block'; oi.src=sampleImgUrl;
  }

  // 개요 패널
  document.getElementById('ov-budget').innerHTML = '127.5억<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-avg').innerHTML    = '15.9억<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-ppl').innerHTML    = '6.5억<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-net').innerHTML    = '121억<span class="info-card-unit"> 원</span>';
  document.getElementById('ov-logline').textContent = s.logline;
  document.getElementById('ov-story').textContent   = s._synopsis;

  // 갈등 구조
  document.getElementById('ov-conflicts').innerHTML = s._conflicts.map(c=>`
    <div class="conflict-card ${c.color}">
      <div class="conflict-label" style="color:var(--${c.color==='ink'?'ink2':c.color})">${c.label}</div>
      <div class="conflict-desc">${c.desc}</div>
    </div>`).join('');

  // 사이드바 대본 목록
  const se = document.getElementById('sidebar-script-eps');
  if(se) se.innerHTML = aiEpisodes.map((_,i)=>`
    <button class="sidebar-item" onclick="showScriptEp(${i})"><div class="sidebar-dot"></div>${i+1}화 ? ${aiEpisodes[i].title.slice(0,8)}</button>`).join('');

  document.getElementById('ppl-total-val').textContent = '6억 5,000만원';
}


/* ???????????????????????????????????
   플로팅 AI 에이전트
??????????????????????????????????? */
let _floatingAgentCtx = {sceneIdx:0, lineIdx:null, heading:''};

function toggleFloatingAgent(){
  const el = document.getElementById('floating-agent');
  const toggle = document.getElementById('floating-agent-toggle');
  if(!el) return;
  const isOpen = el.classList.contains('open');
  el.classList.toggle('open', !isOpen);
  // 창이 열리면 토글 버튼 숨김, 닫히면 보임
  if(toggle) toggle.style.display = isOpen ? '' : 'none';
  if(!isOpen){
    setTimeout(()=>document.getElementById('floating-agent-textarea')?.focus(), 100);
  }
}

function showFloatingAgent(){
  const el = document.getElementById('floating-agent');
  const toggle = document.getElementById('floating-agent-toggle');
  if(el) el.classList.add('open');
  if(toggle) toggle.style.display = 'none';
  setTimeout(()=>document.getElementById('floating-agent-textarea')?.focus(), 100);
}

function updateFloatingAgentContext(heading, sceneIdx){
  _floatingAgentCtx.sceneIdx = sceneIdx;
  _floatingAgentCtx.lineIdx  = null;
  _floatingAgentCtx.heading  = heading;
  const ctx = document.getElementById('floating-agent-context');
  if(ctx) ctx.textContent = 'S#' + (sceneIdx+1) + ' ? ' + heading;
}

function openFloatingAgentForLine(sceneIdx, lineIdx, preview){
  _floatingAgentCtx.sceneIdx = sceneIdx;
  _floatingAgentCtx.lineIdx  = lineIdx;
  _floatingAgentCtx.heading  = preview;
  const ctx = document.getElementById('floating-agent-context');
  if(ctx) ctx.textContent = '줄 수정: "' + preview + '..."';
  showFloatingAgent();
  const ta = document.getElementById('floating-agent-textarea');
  if(ta){ ta.value = ''; ta.focus(); }
}

function addFloatingMsg(text, role){
  const hist = document.getElementById('floating-agent-history');
  if(!hist) return;
  const div = document.createElement('div');
  div.className = 'float-msg ' + role;
  div.textContent = text;
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

function sendFloatingAgent(){
  const ta  = document.getElementById('floating-agent-textarea');
  const msg = ta?.value.trim();
  if(!msg) return;
  ta.value = '';

  addFloatingMsg(msg, 'user');

  // 타이핑 표시
  const typingId = 'float-typing-' + Date.now();
  const hist = document.getElementById('floating-agent-history');
  if(hist){
    const typing = document.createElement('div');
    typing.className = 'float-msg ai typing';
    typing.id = typingId;
    typing.textContent = '수정 중...';
    hist.appendChild(typing);
    hist.scrollTop = hist.scrollHeight;
  }

  const lineInfo = _floatingAgentCtx.lineIdx !== null
    ? ` (${_floatingAgentCtx.lineIdx+1}번째 줄: "${_floatingAgentCtx.heading}")`
    : '';
  const ctx = `S#${_floatingAgentCtx.sceneIdx+1} ${_floatingAgentCtx.heading}${lineInfo}`;

  setTimeout(()=>{
    const typing = document.getElementById(typingId);
    if(typing) typing.remove();

    const replies = [
      `S#${_floatingAgentCtx.sceneIdx+1} "${msg.slice(0,20)}" 방향으로 수정했습니다. 적용 버튼을 누르면 반영됩니다.`,
      `요청하신 대로 "${msg.slice(0,15)}" 톤으로 대사를 조정했습니다.`,
      `씬 흐름을 유지하면서 "${msg.slice(0,20)}" 방향으로 지문을 재작성했습니다.`,
      `"${msg.slice(0,15)}" 내용 반영 완료. 캐릭터 서브텍스트는 유지했습니다.`,
    ];
    const reply = replies[Math.floor(Math.random()*replies.length)];
    addFloatingMsg(reply, 'ai');

    // 적용/취소 버튼 추가
    const hist2 = document.getElementById('floating-agent-history');
    if(hist2){
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;margin-top:4px';
      btnRow.innerHTML = `
        <button onclick="showToast('씬이 적용되었습니다.','success','?',2000);this.parentElement.remove()" 
          style="font-size:11px;padding:4px 12px;border-radius:6px;border:0.5px solid var(--teal);background:none;color:var(--teal);cursor:pointer;font-family:var(--sans)">? 적용</button>
        <button onclick="this.parentElement.remove()"
          style="font-size:11px;padding:4px 12px;border-radius:6px;border:0.5px solid var(--border2);background:none;color:var(--ink3);cursor:pointer;font-family:var(--sans)">취소</button>`;
      hist2.appendChild(btnRow);
      hist2.scrollTop = hist2.scrollHeight;
    }
  }, 1200);
}

// 대본 패널 진입 시 플로팅 버튼 표시
function showScriptPanel(){
  const toggle = document.getElementById('floating-agent-toggle');
  if(toggle) toggle.classList.add('visible');
}
function hideScriptPanel(){
  const toggle = document.getElementById('floating-agent-toggle');
  if(toggle) toggle.classList.remove('visible');
  const el = document.getElementById('floating-agent');
  if(el) el.classList.remove('open');
}

function sendAgentScene(agentId, sceneIdx){
  const inp=document.getElementById(agentId+'-input');
  const resp=document.getElementById(agentId+'-resp');
  if(!inp||!resp) return;
  const msg=inp.value.trim(); if(!msg) return;
  inp.value='';
  resp.className='agent-response show';
  resp.innerHTML=`<div style="display:flex;align-items:center;gap:6px;color:var(--ink3)"><div class="typing-dots"><span></span><span></span><span></span></div><span style="font-size:11px;margin-left:4px">수정 중...</span></div>`;
  setTimeout(()=>{
    const replies=[
      `S#${sceneIdx+1} 씬을 "${msg.slice(0,20)}…" 방향으로 수정했습니다.`,
      `대사 톤을 조정했습니다. 더 구체적인 요청이 있으면 말씀해주세요.`,
      `"${msg.slice(0,15)}" 방향으로 지문과 대사를 다시 작성했습니다.`,
      `씬 전체 흐름을 재구성했습니다. 수정 결과를 확인해보세요.`,
    ];
    resp.innerHTML=`<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);margin-bottom:5px">? AGENT 응답</div>${replies[Math.floor(Math.random()*replies.length)]}
      <div style="margin-top:8px;display:flex;gap:6px">
        <button style="font-size:11px;padding:3px 10px;border-radius:6px;border:0.5px solid var(--teal);background:none;color:var(--teal);cursor:pointer;font-family:var(--sans)" onclick="showToast('씬이 적용되었습니다.','success','?',2000)">? 적용</button>
        <button style="font-size:11px;padding:3px 10px;border-radius:6px;border:0.5px solid var(--border2);background:none;color:var(--ink3);cursor:pointer;font-family:var(--sans)" onclick="this.closest('.agent-response').classList.remove('show')">취소</button>
      </div>`;
  },1200);
}

/* ===================================
   EPISODE DIALOG ? 회차 수정
=================================== */
function openEpDialog(epIdx){
  const ep=aiEpisodes?.[epIdx]; if(!ep) return;
  const agentId=`ep-agent-${epIdx}`;
  // 기존 다이얼로그 제거
  const old=document.getElementById('ep-dialog-bd'); if(old) old.remove();
  const html=`<div class="ep-dialog-backdrop" id="ep-dialog-bd" onclick="if(event.target.id==='ep-dialog-bd')closeEpDialog()">
    <div class="ep-dialog-box">
      <div class="ep-dialog-hero">
        <div class="ep-dialog-ep-num">${ep.num}화</div>
        <div class="ep-dialog-title">${ep.title}</div>
      </div>
      <div class="ep-dialog-body">
        <div class="ep-dialog-label">현재 줄거리</div>
        <div class="ep-dialog-current">${ep.story}</div>
        <div class="ep-dialog-label" style="margin-bottom:4px">엔딩</div>
        <div class="ep-dialog-current" style="margin-bottom:16px">${ep.ending}</div>
        <div class="agent-box-label" style="margin-bottom:8px"><div class="agent-dot"></div>AGENT ? 이 회차 수정 요청</div>
        <div class="agent-input-row">
          <textarea class="agent-textarea" id="${agentId}-input" rows="2"
            placeholder="예: 이 화에 반전 씬 추가 / 엔딩을 더 강렬하게 / 갈등 심화"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAgentEp('${agentId}',${epIdx})}"></textarea>
          <button class="agent-send-btn" onclick="sendAgentEp('${agentId}',${epIdx})">↑</button>
        </div>
        <div class="agent-response" id="${agentId}-resp"></div>
      </div>
      <div class="ep-dialog-footer">
        <button class="btn btn-ghost" onclick="closeEpDialog()">닫기</button>
        <button class="btn btn-primary" onclick="closeEpDialog();showToast('${ep.num}화가 저장되었습니다.','success','?',2000)">저장</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function closeEpDialog(){
  const bd=document.getElementById('ep-dialog-bd');
  if(bd){bd.style.animation='fadeOut .18s ease forwards';setTimeout(()=>bd.remove(),180);}
}
function sendAgentEp(agentId,epIdx){
  const inp=document.getElementById(agentId+'-input');
  const resp=document.getElementById(agentId+'-resp');
  if(!inp||!resp) return;
  const msg=inp.value.trim(); if(!msg) return;
  inp.value='';
  resp.className='agent-response show';
  resp.innerHTML=`<div style="display:flex;align-items:center;gap:6px;color:var(--ink3)"><div class="typing-dots"><span></span><span></span><span></span></div><span style="font-size:11px;margin-left:4px">회차 수정 중...</span></div>`;
  setTimeout(()=>{
    const ep=aiEpisodes?.[epIdx];
    const replies=[
      `${ep?.num||epIdx+1}화 줄거리를 "${msg.slice(0,18)}" 방향으로 재구성했습니다. 저장하려면 저장 버튼을 눌러주세요.`,
      `요청하신 내용을 반영해 ${ep?.num||epIdx+1}화 전개를 수정했습니다.`,
      `엔딩 씬을 더 강렬하게 조정하고 감정선을 보완했습니다.`,
    ];
    resp.innerHTML=`<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);margin-bottom:5px">? AGENT 응답</div>${replies[Math.floor(Math.random()*replies.length)]}`;
  },1200);
}

/* ===================================
   전체 출연진 리스트
=================================== */
const FULL_CAST_BASE=[
  {charName:'주인공 1',role:'주연 여주',roleClass:'role-lead-f',actor:'박은빈',eps:'전 회차',fee:'2억원'},
  {charName:'주인공 2',role:'주연 남주',roleClass:'role-lead-m',actor:'변우석',eps:'전 회차',fee:'2억 4,000만원'},
  {charName:'라이벌 / 조력자',role:'조연',roleClass:'role-sub',actor:'천우희',eps:'2~8화',fee:'6,400만원'},
  {charName:'전 애인',role:'조연',roleClass:'role-sub',actor:'김민규',eps:'1·4·6·7화',fee:'4,800만원'},
  {charName:'직장 동료 A',role:'조연',roleClass:'role-sub',actor:'이엘',eps:'3~7화',fee:'3,000만원'},
  {charName:'직장 동료 B',role:'조연',roleClass:'role-sub',actor:'오나라',eps:'2~5화',fee:'2,000만원'},
  {charName:'주인공 어머니',role:'특별출연',roleClass:'role-support',actor:'김해숙',eps:'1·3·8화 (플래시백)',fee:'1,800만원'},
  {charName:'카페 사장',role:'단역',roleClass:'role-extra',actor:'미정',eps:'2·5화',fee:'400만원'},
  {charName:'편의점 알바',role:'단역',roleClass:'role-extra',actor:'미정',eps:'1화',fee:'150만원'},
  {charName:'택시 기사',role:'단역',roleClass:'role-extra',actor:'미정',eps:'3화',fee:'120만원'},
  {charName:'아파트 경비원',role:'단역',roleClass:'role-extra',actor:'미정',eps:'4·7화',fee:'240만원'},
  {charName:'식당 종업원',role:'단역',roleClass:'role-extra',actor:'미정',eps:'2·6화',fee:'200만원'},
];
function buildFullCastTable(){
  const tbody=document.getElementById('full-cast-tbody'); if(!tbody) return;
  const chars=currentInput?.chars||[];
  // 입력된 주인공 정보로 상위 2행 덮어쓰기
  const data=FULL_CAST_BASE.map((r,i)=>{
    if(i===0&&chars[0]?.name) return {...r,charName:`${chars[0].name} (${chars[0].role||'여주'})`};
    if(i===1&&chars[1]?.name) return {...r,charName:`${chars[1].name} (${chars[1].role||'남주'})`};
    return r;
  });
  // 추가 입력 인물 반영 (3번째 이상)
  chars.slice(2).forEach((c,i)=>{
    data.splice(2+i,0,{charName:`${c.name||'인물'+(i+3)} (${c.role||'조연'})`,role:c.role||'조연',roleClass:'role-sub',actor:'미정',eps:'미정',fee:'협의'});
  });
  tbody.innerHTML=data.map(r=>`
    <tr>
      <td><span class="role-badge ${r.roleClass}">${r.role}</span></td>
      <td style="font-weight:600;color:var(--ink)">${r.charName}</td>
      <td>${r.actor}</td>
      <td class="cast-ep-cell">${r.eps}</td>
      <td class="cast-fee-cell">${r.fee}</td>
    </tr>`).join('');
}

/* ===================================
   PPL 데이터 & 렌더링
=================================== */
const PPL_DATA = [
  // 식음료
  {id:1, industry:'식음료', badge:'t-green', brand:'프리미엄 된장·간장 브랜드',
   scene:'S#22. 주방 / 밤', sceneDesc:'주인공이 어머니의 레시피로 육수를 끓이는 씬. 식탁 위 제품이 클로즈업되고, 향기를 맡으며 추억에 잠기는 장면.',
   eps:'3~6화', freq:'씬당 20~30초 / 회차당 2~3회 노출', price:'1억 2,000만원',
   effect:'감성 소구 / 전통 식품 이미지 강화', difficulty:'낮음'},
  {id:2, industry:'식음료', badge:'t-green', brand:'캔커피·에너지드링크 브랜드',
   scene:'S#20. 편의점 / 저녁', sceneDesc:'주인공이 야근 후 편의점에서 캔커피를 꺼내 상대방에게 건네는 감정 포인트 씬. 두 사람 사이의 온도가 처음으로 느껴지는 장면.',
   eps:'1·3·5화', freq:'핵심 소품 / 클로즈업 1회', price:'4,500만원',
   effect:'감정 이입 / 젊은 층 타겟', difficulty:'낮음'},
  {id:3, industry:'식음료', badge:'t-green', brand:'프리미엄 한식 간편식 브랜드',
   scene:'S#13. 주방 / 아침', sceneDesc:'주인공이 바쁜 아침 간편식으로 빠르게 식사를 준비하는 씬. 바쁜 직장인의 현실을 공감 있게 묘사.',
   eps:'2·4·6화', freq:'배경 노출 / 로고 클로즈업', price:'3,200만원',
   effect:'라이프스타일 연계 / 편의성 강조', difficulty:'낮음'},
  {id:4, industry:'식음료', badge:'t-green', brand:'와인·스파클링 음료 브랜드',
   scene:'S#5. 레스토랑 / 저녁', sceneDesc:'두 주인공의 첫 번째 식사 씬. 테이블 위 와인 잔이 자연스럽게 노출되고, 분위기 있는 조명 아래 클로즈업.',
   eps:'4·8화', freq:'테이블 소품 / 2씬 이상', price:'5,800만원',
   effect:'프리미엄 이미지 / 성인 타겟', difficulty:'중간'},
  // 가전·인테리어
  {id:5, industry:'가전·인테리어', badge:'t-purple', brand:'업소용 냉장고·주방 가전 브랜드',
   scene:'S#1~25. 주방 / 전 씬', sceneDesc:'주방 세트 내 대형 냉장고와 조리 기구 로고 상시 노출. 식재료를 꺼내고 넣는 장면마다 자연스럽게 등장.',
   eps:'전 회차', freq:'고정 배경 / 매 씬 노출', price:'8,000만원',
   effect:'브랜드 인지도 / 주방 연상', difficulty:'낮음'},
  {id:6, industry:'가전·인테리어', badge:'t-purple', brand:'인테리어 조명 브랜드',
   scene:'S#22. 홀 / 저녁 ? 오픈 씬', sceneDesc:'식당 홀 전체 조명을 협찬. 특히 간판에 처음 불이 켜지는 클라이맥스 엔딩 씬에서 핵심 노출.',
   eps:'5~8화', freq:'엔딩 핵심 씬', price:'5,200만원',
   effect:'감동 포인트 / 브랜드 이미지 고급화', difficulty:'낮음'},
  {id:7, industry:'가전·인테리어', badge:'t-purple', brand:'로봇청소기·스마트홈 브랜드',
   scene:'S#4. 사무실 / 낮', sceneDesc:'주인공 2의 사무실 또는 집에서 로봇청소기가 자동으로 동작하는 배경 씬. 깔끔한 공간과 함께 자연 노출.',
   eps:'2~5화', freq:'배경 동작 노출 / 2~3씬', price:'3,600만원',
   effect:'스마트 라이프스타일 연계', difficulty:'낮음'},
  {id:8, industry:'가전·인테리어', badge:'t-purple', brand:'프리미엄 침구·패브릭 브랜드',
   scene:'S#6. 주거 공간 / 새벽', sceneDesc:'주인공이 새벽에 눈을 뜨는 침실 씬. 부드러운 조명 아래 침구 소재와 질감이 자연스럽게 클로즈업.',
   eps:'3·6화', freq:'클로즈업 1~2회', price:'2,100만원',
   effect:'감성 라이프스타일 / 여성 타겟', difficulty:'낮음'},
  // 뷰티·패션
  {id:9, industry:'뷰티·패션', badge:'t-pink', brand:'스킨케어·기초 화장품 브랜드',
   scene:'S#2. 욕실 / 아침', sceneDesc:'주인공이 출근 전 거울 앞에서 스킨케어 루틴을 하는 씬. 제품을 바르는 손의 클로즈업과 함께 자연스럽게 노출.',
   eps:'1·4·7화', freq:'클로즈업 루틴 / 15~20초', price:'6,500만원',
   effect:'브랜드 이미지 / 여성 2030 직접 타겟', difficulty:'중간'},
  {id:10, industry:'뷰티·패션', badge:'t-pink', brand:'립스틱·색조 화장품 브랜드',
   scene:'S#8. 화장실 / 오후', sceneDesc:'중요한 만남 전 주인공이 립스틱을 바르며 마음을 다잡는 씬. 감정 전환 포인트와 맞물려 강렬한 인상 남김.',
   eps:'2·5화', freq:'클로즈업 1회 / 대사 연계 가능', price:'4,000만원',
   effect:'감정 포인트 연계 / 강렬한 인상', difficulty:'중간'},
  {id:11, industry:'뷰티·패션', badge:'t-pink', brand:'프리미엄 패션 브랜드 (아우터)',
   scene:'S#1. 거리 / 낮', sceneDesc:'주인공이 처음 등장하는 오프닝 씬. 전신이 노출되는 워킹 샷에서 아우터 풀룩 협찬.',
   eps:'1·8화', freq:'전신 노출 / 주요 이동 씬', price:'7,200만원',
   effect:'캐릭터 이미지 = 브랜드 이미지', difficulty:'중간'},
  {id:12, industry:'뷰티·패션', badge:'t-pink', brand:'향수 브랜드',
   scene:'S#9. 사무실 복도 / 낮', sceneDesc:'두 주인공이 스쳐 지나가는 씬. 한 쪽이 향기를 느끼며 돌아보는 설정. 향수 제품 직접 노출은 없고 감성 연출로 처리.',
   eps:'3화', freq:'간접 연출 / 인스타그램 연계 마케팅', price:'2,800만원',
   effect:'감성 스토리텔링 / SNS 바이럴', difficulty:'높음'},
  // 자동차·이동수단
  {id:13, industry:'자동차', badge:'t-blue', brand:'국내 중형 세단 브랜드',
   scene:'S#14. 도로 / 낮', sceneDesc:'주인공 2가 운전하는 씬. 차량 외관 클로즈업과 함께 운전 중 감정 씬. 목적지로 향하는 결의를 담은 장면.',
   eps:'2·5·7화', freq:'주행 씬 / 외관 클로즈업', price:'9,500만원',
   effect:'남성 타겟 / 성공한 이미지 연계', difficulty:'중간'},
  {id:14, industry:'자동차', badge:'t-blue', brand:'전기차 브랜드',
   scene:'S#3. 지하 주차장 / 낮', sceneDesc:'주인공이 전기차를 충전하며 상대방을 기다리는 씬. 친환경 이미지와 현대적 감성을 동시에 전달.',
   eps:'4·6화', freq:'배경 노출 / 충전 행동 씬', price:'6,300만원',
   effect:'친환경 이미지 / 미래지향 라이프스타일', difficulty:'중간'},
  // IT·통신
  {id:15, industry:'IT·통신', badge:'t-amber', brand:'스마트폰 브랜드',
   scene:'S#24. 사무실 / 밤', sceneDesc:'주인공이 밤늦게 스마트폰으로 상대방의 SNS를 보며 감정을 정리하는 씬. 디스플레이 클로즈업 포함.',
   eps:'전 회차', freq:'소품 상시 노출 / 클로즈업 2~3회', price:'1억 5,000만원',
   effect:'브랜드 인지도 최고 / 전 연령 타겟', difficulty:'낮음'},
  {id:16, industry:'IT·통신', badge:'t-amber', brand:'무선 이어폰·웨어러블 브랜드',
   scene:'S#22. 주방 / 밤', sceneDesc:'주인공이 혼자 요리하며 이어폰으로 음악을 듣는 씬. 제품을 귀에 끼우는 클로즈업 후 표정 변화.',
   eps:'2·4화', freq:'클로즈업 1~2회', price:'3,800만원',
   effect:'음악·감성 연계 / MZ세대 타겟', difficulty:'낮음'},
  {id:17, industry:'IT·통신', badge:'t-amber', brand:'OTT 플랫폼·스트리밍 서비스',
   scene:'S#11. 거실 / 밤', sceneDesc:'주인공이 소파에서 노트북으로 영상을 보다 잠드는 씬. 화면 속 콘텐츠로 간접 광고.',
   eps:'3화', freq:'화면 노출 / 10~15초', price:'2,200만원',
   effect:'자연스러운 간접 광고', difficulty:'낮음'},
  // 금융·보험
  {id:18, industry:'금융·보험', badge:'t-gray', brand:'인터넷 전문 은행',
   scene:'S#16. 카페 / 낮', sceneDesc:'주인공이 스마트폰으로 송금하는 씬. 앱 화면이 클로즈업되며 간편한 사용성을 보여줌.',
   eps:'2화', freq:'앱 화면 클로즈업 / 15초', price:'1,800만원',
   effect:'디지털 금융 이미지 / 젊은층 타겟', difficulty:'낮음'},
];

// 씬별 그룹핑
const PPL_BY_SCENE = {};
PPL_DATA.forEach(p=>{
  if(!PPL_BY_SCENE[p.scene]) PPL_BY_SCENE[p.scene]=[];
  PPL_BY_SCENE[p.scene].push(p);
});

// 산업군별 그룹핑
const PPL_BY_INDUSTRY = {};
PPL_DATA.forEach(p=>{
  if(!PPL_BY_INDUSTRY[p.industry]) PPL_BY_INDUSTRY[p.industry]=[];
  PPL_BY_INDUSTRY[p.industry].push(p);
});

let _pplView = 'industry';

function buildPplPanel(apiPplData){
  const data = apiPplData || PPL_DATA;
  const byIndustry={}, byScene={}, byEp={};
  data.forEach((p,i)=>{
    p.id = p.id||i+1;
    // 산업군
    if(!byIndustry[p.industry]) byIndustry[p.industry]=[];
    byIndustry[p.industry].push(p);
    // 씬별
    if(!byScene[p.scene]) byScene[p.scene]=[];
    byScene[p.scene].push(p);
    // 회차별 ? eps 필드 파싱 ("전 회차" / "2·4·6화" / "1·2·3·4화" 등)
    const epsStr = p.eps||'';
    const epNums = epsStr.replace(/전 회차/,'').match(/\d+/g) || [];
    const epSet = epNums.length ? epNums.map(Number) : [0]; // 0 = 전 회차
    epSet.forEach(n=>{
      const key = n===0 ? '전 회차' : n+'화';
      if(!byEp[key]) byEp[key]=[];
      byEp[key].push(p);
    });
  });
  window._activePplData = data;
  window._activePplByIndustry = byIndustry;
  window._activePplByScene = byScene;
  window._activePplByEp = byEp;
  renderPplIndustry();
  renderPplScene();
  renderPplEp();
  const cnt=document.getElementById('ppl-count');
  if(cnt) cnt.textContent=data.length;
}

function switchPplView(v){
  _pplView=v;
  ['industry','scene','ep'].forEach(t=>{
    const tab=document.getElementById('ppl-tab-'+t);
    const view=document.getElementById('ppl-view-'+t);
    if(tab) tab.classList.toggle('active', t===v);
    if(view) view.style.display = t===v ? 'block' : 'none';
  });
}

function _pplCard(p){
  return `<div class="ppl-card-r">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span class="ppl-cat-badge ${p.badge||'t-gray'}" style="font-size:10px;padding:2px 7px;margin-bottom:0">${p.industry}</span>
    </div>
    <div class="ppl-brand-r">${p.brand}</div>
    <div class="ppl-scene-r">${(p.sceneDesc||'').slice(0,65)}…</div>
    <div class="ppl-row-r">
      <span class="ppl-exposure">${p.eps||''}</span>
      <span class="ppl-price-r">${p.price||''}</span>
    </div>
    <button class="ppl-scene-btn" onclick="openPplSceneModal(${p.id})">?? 씬 상세</button>
  </div>`;
}

function renderPplIndustry(){
  const wrap=document.getElementById('ppl-view-industry');
  if(!wrap) return;
  const src = window._activePplByIndustry || PPL_BY_INDUSTRY;
  let html='';
  Object.entries(src).forEach(([industry, items])=>{
    const badge=items[0].badge||'t-gray';
    const subtotal=items.reduce((s,p)=>s+priceToNum(p.price),0);
    html+=`<div class="ppl-section-r">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span class="ppl-cat-badge ${badge}" style="margin-bottom:0">${industry}</span>
        <span style="font-size:12px;font-weight:600;color:var(--ink3)">${items.length}건 · ${numToPrice(subtotal)}</span>
      </div>
      <div class="ppl-cards-r">${items.map(_pplCard).join('')}</div>
    </div>`;
  });
  wrap.innerHTML=html;
}

function renderPplScene(){
  const wrap=document.getElementById('ppl-view-scene');
  if(!wrap) return;
  const src = window._activePplByScene || PPL_BY_SCENE;
  let html='';
  Object.entries(src).forEach(([scene, items],idx)=>{
    const total=items.reduce((s,p)=>s+priceToNum(p.price),0);
    html+=`<div class="ppl-scene-view-item">
      <div class="ppl-scene-view-header" onclick="togglePplScene('psc-${idx}')">
        <div>
          <div class="ppl-scene-view-heading">?? ${scene}</div>
          <div class="ppl-scene-view-meta">${items.length}개 브랜드 · 예상 수익 ${numToPrice(total)}</div>
        </div>
        <span style="font-size:12px;color:var(--ink3);transition:transform .2s" id="psc-chev-${idx}">▶</span>
      </div>
      <div class="ppl-scene-view-body" id="psc-${idx}">
        <div class="ppl-scene-cards-grid">${items.map(_pplCard).join('')}</div>
      </div>
    </div>`;
  });
  wrap.innerHTML=html;
}

function renderPplEp(){
  const wrap=document.getElementById('ppl-view-ep');
  if(!wrap) return;
  const src = window._activePplByEp;
  if(!src){ wrap.innerHTML='<div style="color:var(--ink3);font-size:13px;padding:20px 0">회차 정보가 없습니다.</div>'; return; }
  // 회차 순서 정렬: 숫자 → 전 회차
  const sortedKeys = Object.keys(src).sort((a,b)=>{
    const an = parseInt(a)||999, bn = parseInt(b)||999;
    return an - bn;
  });
  let html='';
  sortedKeys.forEach((epKey,idx)=>{
    const items = src[epKey];
    const total = items.reduce((s,p)=>s+priceToNum(p.price),0);
    const isAll = epKey==='전 회차';
    html+=`<div class="ppl-scene-view-item" style="${isAll?'border-color:var(--gold)':''}">
      <div class="ppl-scene-view-header" onclick="togglePplScene('pep-${idx}')">
        <div>
          <div class="ppl-scene-view-heading" style="${isAll?'color:var(--gold)':''}">
            ?? ${isAll?'전 회차 노출':epKey}
          </div>
          <div class="ppl-scene-view-meta">${items.length}개 브랜드${isAll?' (매 화 등장)':''} · 예상 합계 ${numToPrice(total)}</div>
        </div>
        <span style="font-size:12px;color:var(--ink3);transition:transform .2s" id="pep-chev-${idx}">▶</span>
      </div>
      <div class="ppl-scene-view-body" id="pep-${idx}">
        <div class="ppl-scene-cards-grid">${items.map(_pplCard).join('')}</div>
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}



function togglePplScene(id){
  const body=document.getElementById(id);
  const prefix = id.startsWith('pep-') ? 'pep-' : 'psc-';
  const idx=id.replace(prefix,'');
  const chev=document.getElementById(prefix+'chev-'+idx);
  if(!body) return;
  const open=body.classList.toggle('open');
  if(chev) chev.style.transform=open?'rotate(90deg)':'';
}

function openPplSceneModal(id){
  const src = window._activePplData || PPL_DATA;
  const p=src.find(x=>x.id===id);
  if(!p) return;
  const modal=document.getElementById('ppl-scene-modal');
  const box=document.getElementById('ppl-scene-modal-box');
  box.innerHTML=`
    <div class="ppl-scene-modal-hero">
      <div class="ppl-scene-modal-hero-bg"></div>
      <div class="ppl-scene-modal-heading">?? ${p.scene}</div>
      <div class="ppl-scene-modal-sub">${p.industry} · ${p.eps}</div>
    </div>
    <div class="ppl-scene-modal-body">
      <div style="margin-bottom:12px"><span class="ppl-cat-badge ${p.badge}">${p.industry}</span></div>
      <div class="ppl-scene-modal-brand-title">${p.brand}</div>
      <div class="ppl-scene-modal-desc">${p.sceneDesc}</div>
      <div class="ppl-scene-modal-grid">
        <div class="ppl-scene-modal-info">
          <div class="ppl-scene-modal-info-label">노출 회차</div>
          <div class="ppl-scene-modal-info-val">${p.eps}</div>
        </div>
        <div class="ppl-scene-modal-info">
          <div class="ppl-scene-modal-info-label">노출 방식</div>
          <div class="ppl-scene-modal-info-val">${p.freq}</div>
        </div>
        <div class="ppl-scene-modal-info">
          <div class="ppl-scene-modal-info-label">예상 수익</div>
          <div class="ppl-scene-modal-info-val" style="color:var(--teal)">${p.price}</div>
        </div>
        <div class="ppl-scene-modal-info">
          <div class="ppl-scene-modal-info-label">연출 난이도</div>
          <div class="ppl-scene-modal-info-val">${p.difficulty}</div>
        </div>
      </div>
      <div style="background:var(--paper2);border-radius:var(--r);padding:10px 14px;font-size:12px;color:var(--ink3);line-height:1.6">
        <strong style="color:var(--ink2)">기대 효과:</strong> ${p.effect}
      </div>
    </div>
    <div class="ppl-scene-modal-footer">
      <button class="btn btn-ghost" onclick="closePplSceneModal()">닫기</button>
      <button class="btn btn-teal" onclick="showToast('협찬 문의가 등록되었습니다.','success','??');closePplSceneModal()">협찬 문의</button>
    </div>`;
  modal.style.display='flex';
  modal.onclick=e=>{ if(e.target===modal) closePplSceneModal(); };
}
function closePplSceneModal(){
  const modal=document.getElementById('ppl-scene-modal');
  if(modal) modal.style.display='none';
}

function priceToNum(str){
  if(!str) return 0;
  const m=str.match(/([\d,]+)/g);if(!m)return 0;
  const n=parseInt(m[0].replace(/,/g,''));
  if(str.includes('억')) return n*10000;
  return n;
}
function numToPrice(n){
  if(n>=10000){ const a=Math.floor(n/10000); const r=n%10000; return r>0?`${a}억 ${r.toLocaleString()}만원`:`${a}억`; }
  return n.toLocaleString()+'만원';
}


const eraDB=[
  // BC
  {from:-10000,to:-3000,kr:'신석기 시대',west:'Neolithic / Stone Age'},
  {from:-3000,to:-1000,kr:'청동기 시대',west:'Bronze Age'},
  {from:-1000,to:-57,kr:'고조선·삼한 시대',west:'Iron Age / Classical Antiquity'},
  {from:-57,to:668,kr:'삼국 시대 (고구려·백제·신라)',west:'Roman Empire → Medieval'},
  {from:668,to:935,kr:'통일신라 시대',west:'Carolingian Era'},
  {from:918,to:1392,kr:'고려 시대',west:'Medieval Europe / Crusades'},
  {from:1392,to:1897,kr:'조선 시대',west:'Renaissance → Industrial Revolution'},
  {from:1897,to:1910,kr:'대한제국',west:'Belle Epoque'},
  {from:1910,to:1945,kr:'일제강점기',west:'WWI & WWII Era'},
  {from:1945,to:1950,kr:'해방 이후 / 미군정기',west:'Post-WWII Era'},
  {from:1950,to:1953,kr:'한국전쟁',west:'Cold War begins'},
  {from:1953,to:1961,kr:'전후 복구기',west:'Cold War'},
  {from:1961,to:1979,kr:'박정희 정권 / 새마을운동',west:'Space Race / Vietnam War'},
  {from:1979,to:1987,kr:'전두환 정권 / 민주화 운동',west:'Reaganism / Cold War'},
  {from:1987,to:1997,kr:'민주화 이후 / 올림픽 호황기',west:'End of Cold War'},
  {from:1997,to:2000,kr:'IMF 외환위기',west:'Dot-com Boom'},
  {from:2000,to:2010,kr:'2000년대 / 한류 시작',west:'9/11 · Social Media Dawn'},
  {from:2010,to:2020,kr:'스마트폰 시대 / K-팝 전성기',west:'Smartphone Era'},
  {from:2020,to:2030,kr:'현대 / 팬데믹 이후',west:'Post-COVID Era'},
  {from:2030,to:2100,kr:'근미래',west:'Near Future'},
  {from:2100,to:3000,kr:'미래',west:'Far Future'},
  // 선캄브리아 ~ BC
  {from:-4600000000,to:-10000,kr:'선사 시대 (선캄브리아 ~ 구석기)',west:'Precambrian → Paleolithic'},
];
function getEraInfo(year){
  return eraDB.find(e=>year>=e.from&&year<e.to)||{kr:'미지의 시대',west:'Unknown Era'};
}
function eraYearLabel(year){
  if(year<0) return `BC ${Math.abs(year)}년`;
  if(year>2025) return `${year}년 (미래)`;
  return `${year}년`;
}
function updateEraLabel(year){
  const el=document.getElementById('era-year');
  const tags=document.getElementById('era-tags');
  if(!el||!tags) return;
  el.textContent=eraYearLabel(year);
  const info=getEraInfo(year);
  tags.innerHTML=`
    <div class="era-tag"><span class="era-tag-flag">????</span><span class="era-tag-text"><span class="era-tag-label">한국:</span>${info.kr}</span></div>
    <div class="era-tag"><span class="era-tag-flag">??</span><span class="era-tag-text"><span class="era-tag-label">세계:</span>${info.west}</span></div>`;
}

/* ===================================
   회당 분량 라벨
=================================== */
function updateRuntimeLabel(val){
  const v=parseInt(val);
  document.getElementById('val-rt').textContent=v+'분';
  let hint='';
  if(v<=15) hint='숏폼 (15분 이하)';
  else if(v<=30) hint='웹드라마 (~30분)';
  else if(v<=60) hint='표준 드라마 (60분)';
  else if(v<=90) hint='지상파 미니시리즈 (~90분)';
  else if(v<=120) hint='TV 영화 (~2시간)';
  else hint=`장편 (~${Math.round(v/60*10)/10}시간)`;
  const h=document.getElementById('rt-hint');if(h)h.textContent=hint;
}

/* ===================================
   연령대 듀얼 슬라이더
=================================== */
function updateAgeSlider(){
  const minEl=document.getElementById('age-min');
  const maxEl=document.getElementById('age-max');
  if(!minEl||!maxEl) return;
  let mn=parseInt(minEl.value), mx=parseInt(maxEl.value);
  if(mn>mx-5){if(document.activeElement===minEl)mn=mx-5;else mx=mn+5;}
  minEl.value=mn; maxEl.value=mx;
  const fill=document.getElementById('age-fill');
  const total=70-10;
  const left=((mn-10)/total*100).toFixed(1);
  const right=((mx-10)/total*100).toFixed(1);
  if(fill){fill.style.left=left+'%';fill.style.width=(right-left)+'%';}
  const lbl=document.getElementById('age-label');
  if(lbl) lbl.textContent=`${mn} ~ ${mx}세`;
}

/* ===================================
   성별 토글
=================================== */
function toggleGender(g){
  ['f','m','a'].forEach(id=>{
    const btn=document.getElementById('gbtn-'+id);
    if(btn) btn.classList.remove('selected');
  });
  const t=document.getElementById('gbtn-'+g);
  if(t) t.classList.add('selected');
}

/* ===================================
   AI 자동 인물 설정
=================================== */
let _charAutoFilled = false;   // AI 자동 설정 여부 플래그

function autoFillChars(){
  const femaleJobs=['쉐프','의사','기자','변호사','디자이너','교사','작가','간호사'];
  const maleJobs=['건물주','검사','의사','형사','CEO','건축가','외교관','교수'];
  const femaleNames=['이수진','김지아','박소연','최하은','정유나','한소원','오지윤','서민아'];
  const maleNames=['강재윤','김도현','박준혁','이민재','최시우','장승현','윤태오','송준'];
  const r1=Math.floor(Math.random()*femaleNames.length);
  const r2=Math.floor(Math.random()*maleNames.length);
  const rj1=Math.floor(Math.random()*femaleJobs.length);
  const rj2=Math.floor(Math.random()*maleJobs.length);
  // 인풋 값 채우기 (hidden 상태여도 값은 유지됨)
  const n0=document.getElementById('char-name-0');const a0=document.getElementById('char-age-0');
  const g0=document.getElementById('char-gender-0');const j0=document.getElementById('char-job-0');
  const p0=document.getElementById('char-personality-0');
  n0.value=femaleNames[r1];a0.value='27세';g0.value='여성';j0.value=femaleJobs[rj1];p0.value='열정적이지만 덜렁댐';
  const n1=document.getElementById('char-name-1');const a1=document.getElementById('char-age-1');
  const g1=document.getElementById('char-gender-1');const j1=document.getElementById('char-job-1');
  const p1=document.getElementById('char-personality-1');
  n1.value=maleNames[r2];a1.value='31세';g1.value='남성';j1.value=maleJobs[rj2];p1.value='냉철하고 완벽주의';

  _charAutoFilled = true;

  // 수동 입력 영역 + 구분선 숨기기
  const manualBox=document.getElementById('char-mode-box-manual');
  const divider=document.getElementById('char-mode-divider-manual');
  const manualWrap=document.getElementById('manual-chars-wrap');
  if(manualBox) manualBox.style.display='none';
  if(divider) divider.style.display='none';
  if(manualWrap) manualWrap.style.display='none';

  // AI 자동생성 완료 배너 표시
  const banner=document.getElementById('char-auto-banner');
  if(banner){
    banner.style.display='flex';
    banner.querySelector('.char-auto-name1').textContent=femaleNames[r1];
    banner.querySelector('.char-auto-job1').textContent=femaleJobs[rj1];
    banner.querySelector('.char-auto-name2').textContent=maleNames[r2];
    banner.querySelector('.char-auto-job2').textContent=maleJobs[rj2];
  }

  showToast('AI가 인물을 자동 설정했습니다!','success','?',2500);
}

function resetAutoChars(){
  _charAutoFilled = false;
  // 인풋 초기화
  ['char-name-0','char-age-0','char-gender-0','char-job-0','char-personality-0','char-looks-0',
   'char-name-1','char-age-1','char-gender-1','char-job-1','char-personality-1','char-looks-1'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  // 배너 숨기기 / 수동 영역 복원
  const banner=document.getElementById('char-auto-banner');
  const manualBox=document.getElementById('char-mode-box-manual');
  const divider=document.getElementById('char-mode-divider-manual');
  if(banner) banner.style.display='none';
  if(manualBox) manualBox.style.display='';
  if(divider) divider.style.display='';
  showToast('초기화되었습니다.','info','??',2000);
}

function jumpToNow(){
  const now = new Date().getFullYear();
  const sl = document.getElementById('slider-era');
  if(sl){ sl.value = now; updateEraLabel(now); }
}

function toggleManualChars(){
  const wrap = document.getElementById('manual-chars-wrap');
  const btn  = document.getElementById('btn-manual-toggle');
  if(!wrap) return;
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'block';
  if(btn) btn.textContent = isOpen ? '펼치기 ?' : '접기 ?';
}

/* ===================================
   INIT
=================================== */
function initApp(){
  // OAuth 리다이렉트 처리: URL 해시에 토큰이 있는지 확인
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    const email = params.get('email'); // Supabase may not always provide email in hash depending on config
    if (token) {
      localStorage.setItem('ds_auth_token', token);
      if (email) localStorage.setItem('ds_user_email', email);
      // 해시 제거 (깔끔한 URL을 위해)
      history.replaceState(null, null, window.location.pathname);
      showToast('성공적으로 로그인되었습니다!', 'success');
    }
  }

  renderNav();
  updateStepUI();
  updateAgeSlider();
  updateEraLabel(new Date().getFullYear());
  updateRuntimeLabel(60);

  // 초기 페이지 결정: 토큰 있으면 프로젝트 목록, 없으면 홈
  const token = localStorage.getItem('ds_auth_token');
  if(token){
    isLoggedIn = true;
    showPage('projects');
  } else {
    isLoggedIn = false;
    showPage('home');
  }
}

// 스크립트 로드 시 실행
initApp();
/** 
 * [AGENTIC PATCH] Connectivity Test & Proceed Gate 
 * 기존 startGenerate를 _startGenerateOriginal로 리다이렉트합니다.
 */
async function startGenerate(projectData) {
  const results = {};
  
  try {
    // Phase 0: Connectivity Test
    if (typeof addDebugLog === 'function') {
      addDebugLog("연결 테스트 시작... (Claude Haiku 사용)", "info");
    }
    
    const testResult = await callBackendAI('test', projectData);
    
    if (typeof addDebugLog === 'function') {
      addDebugLog("연결 테스트 완료: " + (testResult.reply || "READY"), "success");
      addDebugLog("본격적인 생성을 보려면 로그창의 버튼을 눌러주세요.", "info");
    }

    if (typeof showProceedButton === 'function') {
      showProceedButton(async () => {
        if (typeof addDebugLog === 'function') {
          addDebugLog("사용자 요청에 의해 본격적인 생성을 시작합니다.", "info");
        }
        await _startGenerateOriginal(projectData);
      });
    }

  } catch (error) {
    console.error("연결 테스트 중 오류:", error);
    if (typeof addDebugLog === 'function') {
      addDebugLog("연결 테스트 실패: " + error.message, "error");
      addDebugLog("네트워크 혹은 API 키 설정을 확인해 주세요.", "error");
    }
    // 실패해도 일단 진행 버튼은 보여줌 (사용자 선택)
    showProceedButton(async () => {
       await _startGenerateOriginal(projectData);
    });
  }
}


/** [AGENTIC PATCH] Connectivity Test & Proceed Gate (Master Version)
 * 이 함수는 중복 없이 최상위 startGenerate 역할을 수행합니다.
 */
async function startGenerate() {
  let projectData = {};
  if (typeof collectWizardInput === 'function') {
    projectData = collectWizardInput();
  }
  
  // UI 전환
  if (typeof showPage === 'function') {
    showPage('generating');
  }

  try {
    if (typeof addDebugLog === 'function') {
      addDebugLog("진단 모드: 연결 테스트 시작... (Claude Haiku)", "info");
    }
    
    // Phase 0: Connectivity Test
    const testResult = await callBackendAI('test', projectData);
    
    if (typeof addDebugLog === 'function') {
      addDebugLog("연결 테스트 완료: " + (testResult.reply || "READY"), "success");
      addDebugLog("본격적인 생성을 시작하려면 아래 버튼을 눌러주세요.", "info");
    }

    if (typeof showProceedButton === 'function') {
      showProceedButton(async () => {
        if (typeof addDebugLog === 'function') {
          addDebugLog("사용자 승인: 본격적인 AI 단계(기획/구성/PPL/대본)를 시작합니다.", "info");
        }
        // 원본 함수 호출
        await _startGenerateOriginal();
      });
    }

  } catch (error) {
    console.error("연결 테스트 실패:", error);
    if (typeof addDebugLog === 'function') {
      addDebugLog("연결 테스트 실패: " + error.message, "error");
      addDebugLog("오류가 있어도 생성을 강제 시도하시겠습니까?", "warn");
    }
    if (typeof showProceedButton === 'function') {
      showProceedButton(async () => {
        await _startGenerateOriginal();
      });
    }
  }
}
