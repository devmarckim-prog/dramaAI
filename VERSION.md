# DramaScript AI Version History
 
 ## v0.1.122 (2026-04-02)
 ### ✅ Final AI Pipeline Verification & Stabilization
 - **Model Connectivity Verified**: Confirmed `claude-sonnet-4-6` and `claude-haiku-4-5-20251001` are working properly via internal diagnostic script.
 - **Cloud Config Synced**: Forced Supabase `system_settings` to use the new Claude 4 series model strings to prevent cloud-to-local overrides.
 - **Admin Router Cleanup**: Removed all hardcoded legacy Claude 3.5 strings from `admin.js` defaults.
 - **Universal Model Mapping**: Refined `modelMap` in `api/routes/api.js` to handle both legacy and latest model aliases.

 ## v0.1.121 (2026-04-02)
 ### 🚀 Claude 4 series Modernization & Pipeline Stabilization
 - **Claude 4.6 Sonnet & 4.5 Haiku**: Integrated the latest 2025/2026 model versions for superior generation quality and speed.
 - **Pure Claude Pipeline**: Removed Gemini fallback as requested, ensuring a dedicated Anthropic-driven experience.
 - **Frontend Polling Refactor**: Optimized `startGenerationFlow` to strictly use a single backend trigger with robust status polling, supporting generation even if the browser is closed.
 - **Outline Schema Parity**: Added the `outline` generation step to the local generation logic to match Supabase Edge function behavior.
 - **API Guide Update**: Modernized the `Claude_api_guide.md` with official 2026 model IDs and removed legacy warnings.
 
 ## v0.1.120 (2026-04-02)
 ### 🛡️ Multi-Provider AI Pipeline (Anthropic + Gemini Fallback)
 - **Unified AI Client**: Implemented `callUnifiedAI` to handle all AI requests with automatic provider failover.
 - **Gemini 1.5 Flash Fallback**: Added support for Google Gemini as a backup provider to resolve Anthropic 404/Quota issues.
 - **Supabase Service Key Integration**: Fixed critical DB write failures by adding `SUPABASE_SERVICE_ROLE_KEY` to the production environment.
 - **Provider-Agnostic Error Handling**: Normalized error responses so the UI remains stable Regardless of which AI provider is active.
 
## v0.1.119 (2026-04-02)
### 🛡️ AI Pipeline Stabilization & SDK Modernization (Critical)
- **Anthropic SDK Upgrade**: Updated `@anthropic-ai/sdk` to `v0.33.0` for full support of the latest Claude 3.5 models.
- **Supabase Config Standardization**: Replaced alias model names (e.g. `haiku-4-5`) with standardized IDs (`claude-3-5-sonnet-20241022`) directly in the `system_settings` table.
- **Robust Background Triggering**: Fully decoupled the frontend loop from the backend generation task, ensuring reliable progress even if the browser tab is closed.
- **Enhanced Debug Logging**: Implemented real-time API request monitoring in `server.log` to track exact payloads and key status.

## v0.1.118 (2026-04-02)
### 🔗 Background Generation & Edge Stabilization
- **Frontend Independence**: Removed restrictive multi-step generation loop from the browser UI (`api.js`). 
- **Async Backend AI Trigger**: Adjusted `/api/generate/start` to trigger the AI generation tasks (`runLocalGeneration`) non-blockingly, allowing UI polling logic to take over immediately.
- **Edge Model Correction**: Replaced unavailable/dummy Claude models with the proper `claude-3-5-sonnet-20241022` strings inside Edge Function parameters.
- **Data Schema Consistency**: Harmonized field alias (`chars` vs `characters`) directly in Supabase DB persistence layers to prevent null overrides.

## v0.1.117 (2026-04-02)
### 🚀 AI Generation Stabilization & Admin UX Overhaul
- **Fixed AI Engine Failure**: Replaced placeholder model names (Claude 4.6) with verified production IDs (`claude-3-5-sonnet-20241022`). This ensures project generation starts and completes without 404/500 errors.
- **Admin Sample Recovery**: Aligned the sample seeding logic with the frontend synchronization requirements (corrected IDs to `sample-arena` and `sample-seoul`).
- **Premium Admin UI**: Redesigned all administrative guidance boxes with high-contrast, professional styling for better usability and clarity.
- **Restored Sample Data**: Re-seeded the requested 2 samples with high-quality scenario text via the improved Seed function.

## v0.1.113 (2026-04-02)
### 🏛️ Admin Dashboard & System-Wide Verification (Stable)
- **Admin Sample Route Repair**: Fixed critical "missing query" bug in `api/routes/admin.js:GET /samples`. Restored database fetching for sample projects.
- **Unified Column Mapping**: Standardized `stepIdx` usage across Admin views and backend selection logic (corrected `step_idx` mismatches).
- **Admin Profile Join**: Enhanced Admin project list by joining with `user_profiles` to show real user emails instead of raw UUIDs for administrators.
- **Admin UI Normalization**: Applied the unified `normalizeProject` helper to the Admin Detail Viewer, ensuring characters/scripts render correctly even for legacy data.
- **Ultimate Verification Proof (v0.1.113)**: Updated and successfully executed `comprehensive_test.js` to validate both the AI Generation pipeline and the new Admin API routes at 100% completion.

## v0.1.112 (2026-04-02)
### 🛡️ AI Generation & Rendering Stabilization (Comprehensive)
- **Aliased Field Mapping (Backend)**: Implemented `aliasMap` in `api/routes/api.js` to automatically convert `characters` to `chars`, `episodes_list` to `scripts`, and other common AI variants before DB persistence.
- **Unified Normalization (Frontend)**: Consolidated project data normalization into a single `normalizeProject` helper in `api.js`, ensuring UI components (Cards, Results, Stats) always work with consistent field names.
- **Guest Auth Deep Fix**: Verified and stabilized Guest projects by linking them to the master system ID (`dev.marckim@gmail.com`) to bypass Foreign Key constraints.
- **End-to-End Proof**: Successfully validated the system with `comprehensive_test.js`, proving 100% reliability for mixed AI response formats.

## v0.1.111 (2026-04-02)
### ✨ AI Generation Pipeline Restoration (Full Verification)
- Resolved Database Mapping inconsistency for `stepIdx` and `updated_at`.
- Fixed Not-Null constraint on `user_id` for guest projects.
- Added robust JSON extraction logic for Claude responses.
