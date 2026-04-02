/**
 * Entry Point for DramaScript AI - Modular Architecture
 */

import { state } from './modules/state.js';
import * as Auth from './modules/auth.js';
import * as Nav from './modules/navigation.js';
import * as Wizard from './modules/wizard.js';
import * as Projects from './modules/projects_list.js';
import * as Settings from './modules/settings.js';
import * as Dashboard from './modules/dashboard.js';
import { startGenerationFlow, fetchProjects, saveProject, deleteProject, generateScriptForEp } from './modules/api.js';
import * as Script from './modules/script.js';
import * as Admin from './modules/admin.js';
import { syncSamplesFromServer } from './modules/samples.js';

// ==========================================
// 1. GLOBAL EXPORTS (Critical for Legacy HTML support)
// ==========================================
// ==========================================
// 1. GLOBAL EXPORTS (Critical for Legacy HTML support)
// ==========================================
// Moved to top for consistency, but we'll ensure they are reassigned here for clarity
window.showPage = Nav.showPage;
window.showPanel = Nav.showPanel;
window.showToast = Nav.showToast;
window.showModal = Nav.showModal;
window.closeModal = Nav.closeModal;
window.showPlanModal = Nav.showPlanModal;
window.showPdfModal = Nav.showPdfModal;
window.showNextEpModal = Nav.showNextEpModal;
window.showDeleteAccountModal = Nav.showDeleteAccountModal;
window.toggleFloatingAgent = Nav.toggleFloatingAgent;
window.showFloatingAgent = Nav.showFloatingAgent;
window.sendFloatingAgent = Nav.sendFloatingAgent;
window.updateApiStatus = Nav.updateApiStatus;
window.showDebugLog = Nav.showDebugLog;
window.numToPrice = Nav.numToPrice;
window.addDebugLog = Nav.addDebugLog;

// Auth
window.handleLogout = Auth.handleLogout;
window.handleStartBtn = Auth.handleStartBtn;
window.showLoginModal = Auth.showLoginModal;
window.closeLoginModal = Auth.closeLoginModal;
window.doLogin = Auth.doLogin;
window.enterGuestMode = Auth.enterGuestMode;

// Wizard
window.nextStep = Wizard.nextStep;
window.prevStep = Wizard.prevStep;
window.jumpToNow = Wizard.jumpToNow;
window.updateEraLabel = Wizard.updateEraLabel;
window.updateRuntimeLabel = Wizard.updateRuntimeLabel;
window.updateAgeSlider = Wizard.updateAgeSlider;
window.toggleGender = Wizard.toggleGender;
window.autoFillChars = Wizard.autoFillChars;
window.resetAutoChars = Wizard.resetAutoChars;
window.toggleManualChars = Wizard.toggleManualChars;
window.selectOpt = Wizard.selectOpt;
window.addChar = Wizard.addChar;

// Projects & API
window.renderProjectCards = Projects.renderProjectCards;
window.openProject = Projects.openProject;
window.confirmDeleteProject = Projects.confirmDeleteProject;
window.fetchProjects = fetchProjects;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.startGenerate = startGenerate; // Pointing to our unified wrapper at bottom
window.generateScriptForEp = generateScriptForEp;

// Settings
window.onApiKeyInput = Settings.onApiKeyInput;
window.toggleApiKeyVisibility = Settings.toggleApiKeyVisibility;
window.saveApiKey = Settings.saveApiKey;
window.deleteApiKey = Settings.deleteApiKey;
window.testApiKey = Settings.testApiKey;
window.clearAllProjects = Settings.clearAllProjects;
window.renderSettingsProfile = Settings.renderSettingsProfile;
window.loadApiKeyToSettings = Settings.loadApiKeyToSettings;
window.updateApiKeyStatusUI = Settings.updateApiKeyStatusUI;

// Dashboard & Script
window.buildResultPanels = Dashboard.buildResultPanels;
window.renderCast = Dashboard.renderCast;
window.buildCharCards = Dashboard.buildCharCards;
window.buildRelationMap = Dashboard.buildRelationMap;
window.buildEpList = Dashboard.buildEpList;
window.buildBudget = Dashboard.buildBudget;
window.buildPplPanel = Dashboard.buildPplPanel;
window.renderScript = Script.renderScript;
window.renderEpTabs = Script.renderEpTabs;
window.changeScriptEp = Script.changeScriptEp;
window.renderSceneRow = Script.renderSceneRow;
window.selectSceneCard = Script.selectSceneCard;
window.renderSceneDetail = Script.renderSceneDetail;
window.showFullScript = Script.showFullScript;
window.renderFullScriptEp = Script.renderFullScriptEp;
window.closeFullScript = Script.closeFullScript;

// Admin
window.switchAdminTab = Admin.switchAdminTab;
window.initAdmin = Admin.initAdmin;

window.openFloatingAgentForLine = (epIdx, lineIdx) => {
  Nav.showFloatingAgent();
  Nav.addDebugLog(`씬 상세 요청: ${epIdx + 1}화 씬 ${lineIdx + 1}`);
};

console.log("DramaScript AI Global Exports Ready ✅");

// ==========================================
// 2. APP INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => {
    console.error("DramaScript AI Init Error ❌", err);
  });
});

async function initApp() {
  console.log("DramaScript AI Modules Initializing...");
  // IMMEDIATELY show home page to avoid blank screen
  if (window.showPage) window.showPage('home');
  Nav.addDebugLog("시스템 모듈 초기화 시작...");

  // 0. Sync Samples from Cloud
  await syncSamplesFromServer().catch(err => console.warn('[App] Sample sync failed:', err));

  let forceRedirect = false;

  // 1. Auth State Check & Recovery
  Nav.addDebugLog("인증 상태 확인 중...");
  if (window.location.hash.includes('access_token')) {
    Nav.addDebugLog("OAuth 리다이렉트 감지됨. 토큰 처리 중...");
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      localStorage.setItem('ds_auth_token', accessToken);
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        if (payload.email) localStorage.setItem('ds_user_email', payload.email);
        if (payload.user_metadata?.avatar_url) localStorage.setItem('ds_user_avatar', payload.user_metadata.avatar_url);
        Nav.addDebugLog(`사용자 로그인 성공: ${payload.email}`, "success");
      } catch (e) {
        Nav.addDebugLog("토큰 파싱 실패", "error");
      }
      state.isLoggedIn = true;
      state.isGuestMode = false;
      forceRedirect = true;
      await Auth.fetchUserProfile();
      window.history.replaceState(null, '', '/projects');
      Nav.showToast('로그인이 성공적으로 완료되었습니다! 🎉', 'success');
    }
  } else if (localStorage.getItem('ds_auth_token')) {
    Nav.addDebugLog("기존 세션 발견. 자동 로그인됨.");
    state.isLoggedIn = true;
    state.isGuestMode = false;
    await Auth.fetchUserProfile();
  } else if (localStorage.getItem('ds_guest_mode') === 'true') {
    Nav.addDebugLog("게스트 모드 활성화됨.");
    state.isLoggedIn = false;
    state.isGuestMode = true;
  } else {
    Nav.addDebugLog("비로그인 상태 (홈 진입)");
    state.isLoggedIn = false;
    state.isGuestMode = false;
  }

  // 2. Initial UI Render
  const currentPath = window.location.pathname;
  console.log(`[Init] Using Path: ${currentPath}`);
  Nav.addDebugLog(`경로 진입: ${currentPath}`);

  Auth.renderNav();
  Wizard.updateStepUI();

  const isCurrentlyAdmin = currentPath.startsWith('/admin') && !forceRedirect;
  const isSettings = currentPath.startsWith('/settings');
  const isWizard = currentPath.startsWith('/wizard');
  const isProjects = currentPath.startsWith('/projects') || forceRedirect;

  if (isCurrentlyAdmin) {
    console.log("[Init] Admin route. Validating...");
    Nav.showPage('admin');
    Nav.addDebugLog("관리자 페이지 진입.");
  } else if (state.isLoggedIn || state.isGuestMode) {
    // Both LoggedIn and Guest can access Projects/Wizard/Settings
    if (isSettings) Nav.showPage('settings');
    else if (isWizard) Nav.showPage('wizard');
    else {
      // Default to projects list if already authenticated/guest
      Nav.showPage('projects');
    }
  } else {
    // Non-authenticated, Non-guest users stay at home
    Nav.showPage('home');
    Nav.addDebugLog("미로그인 상태 -> 홈 로드 완료.");
  }

  Nav.addDebugLog("API 설정 로드 중...");
  Settings.loadApiKeyToSettings();

  Nav.addDebugLog("DramaScript AI 앱 준비 완료 🚀", "success");
  console.log("DramaScript AI App Initialized 🚀");

  // Premium Scroll Animations
  initScrollAnimations();

  // Scroll Progress Bar
  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const bar = document.getElementById('scroll-progress');
    if (bar) bar.style.width = scrolled + "%";
  });
}

/**
 * Premium Scroll Animations (Reveal on scroll)
 */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once revealed, no need to keep observing
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ==========================================
// 3. WRAPER FUNCTIONS
// ==========================================
async function startGenerate() {
  const input = Wizard.collectWizardInput();
  if (!input) return;

  try {
    await startGenerationFlow(input);
  } catch (e) {
    console.error("Generation Start Error:", e);
    Nav.showToast('생성 시작 중 오류가 발생했습니다.', 'error');
  }
}
