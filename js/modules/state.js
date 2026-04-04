/**
 * Global State Management
 */

export const APP_VERSION = 'v0.26';

export const state = {
  isLoggedIn: !!localStorage.getItem('ds_auth_token') && localStorage.getItem('ds_auth_token') !== 'mock_token',
  isGuestMode: localStorage.getItem('ds_guest_mode') === 'true',
  currentUser: { 
    email: localStorage.getItem('ds_user_email') || null,
    avatar: localStorage.getItem('ds_user_avatar') || null
  },
  userProfile: {
    role: localStorage.getItem('ds_user_role') || 'user',
    credits: parseInt(localStorage.getItem('ds_user_credits')) || 0,
    plan: localStorage.getItem('ds_user_plan') || 'Free'
  },
  currentStep: 0,
  totalSteps: 5,
  charCount: 2,
  aiEpisodes: null,
  aiScript: null,
  currentInput: null,
  sampleImgUrl: null,
  currentEpIdx: 0,
  currentSceneIdx: 0,
  generatingId: null,
  
  // Cache for dynamic data
  scripts: {}, // Indexed by episode index
  planData: null,
  apiSimilar: null,
  apiBudgetBreakdown: null,
  apiPplData: null,
  epItemsCache: {}
};

// Legacy compatibility (linking window properties to state object if needed during transition)
// window._state = state;
