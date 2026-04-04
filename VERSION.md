# VERSION HISTORY

## v0.24 (2026-04-05) - Conflict Structure Repair & Final Synchronization
- **Conflict Mapping Fix**: `openProject` 함수에서 `conflicts` 데이터가 누락되던 렌더링 엔진 오류 수정.
- **장군님의 횟집 데이터 보강**: 시놉시스에 맞는 5대 주요 갈등 구조 및 캐릭터 상세 정보 강제 업데이트 완료.
- **전역 버전 동기화**: `state.js`, `index.html`, `VERSION.md` 버전을 `v0.24`로 통일.
- **데이터 로드 안정화**: DB 업데이트 후 즉시 대시보드에 반영되도록 정규화 로직 최적화.

## v0.23 (2026-04-05) - Admin Sample Sync & Data Completeness
- **Admin Sample Sync**: 어드민 샘플 관리와 라이브 대시보드 간의 실시간 동기화 구현 (Dynamic SAMPLES_CACHE).
- **UI 개선**: 어드민 샘플 관리 카드 내 '샘플보기(미리보기)' 버튼 추가.
- **데이터 무결성**: 샘플 데이터 조회 시 캐릭터, 예산, PPL, 갈등 구조 등 전체 데이터 상세 로드 보장.
- **구조 개선**: `samples.js`의 하드코딩 의존성 제거 및 서버 기반 동적 확장성 확보.

## v0.22 (2026-04-04) - DB 매핑 및 렌더링 안정화 (Deep Search 강화)
- **Backend Aliasing**: `POST /projects`에서 `characters`, `episodes_list`, `total_budget` 등 다양한 필드명을 자동 매핑하도록 개선하여 데이터 유실 방지.
- **Frontend Deep Search 고도화**: `_findDeepValue` 헬퍼 함수를 도입하여 예산(Budget), PPL, 갈등(Conflicts) 데이터를 객체 트리 깊은 곳에서 자동 추출.
- **정규화 엔진 강화**: `normalizeProject` 함수가 더 넓은 범위의 중첩 데이터 구조를 통합 관리하도록 업그레이드.

## v0.20 (2026. 4. 4. 오전 9:40:00)
- **갈등 분석 데이터 Deep Search 도입**: dashboard.js 내에서 갈등 데이터가 객체 깊숙이 숨겨져 있어도 무조건 찾아내는 재귀적 탐색(Recursive Search) 로직 구현.
- **데이터 규격 정규화 보강**: api.js의 normalizeProject 엔진에서 다양한 중첩 구조(p.data.input 등)까지 대응하도록 매핑 규칙 강화.
- **데이터 실시간 가시성 확보**: 샘플 프로젝트(디렉터즈 아레나)의 갈등 분석 데이터가 화면에 누락 없이 출력되도록 안정화 완료.

## v0.19 (2026. 4. 4. 오전 7:38:14)
- **DB 매핑 최적화**: Supabase DB 필드(chars, stats, budget)와 UI 간의 매핑 로직 강화.
- **렌더링 안정화**: normalizeProject 엔진을 통한 데이터 규격 통일 및 카드 렌더링 오류 수정.
- **데이터 보존**: 생성 완료 시 AI가 생성한 실제 데이터를 우선순위로 저장하도록 로직 보강.

## v0.18 (2026. 4. 4. 오전 7:34:48)
- **모델명 표준화**: AI 모델명을 Anthropic 최신 규격(claude-haiku-4-5-20251001, claude-sonnet-4-6)으로 통일 및 api.js modelMap 업데이트.
- **오류 수정**: Edge Function과 API 서버 간의 모델명 불일치로 인한 404 오류 가능성 제거.
- **시스템 설정 동기화**: DB의 system_settings에 저장된 모델명과 코드 내 modelMap 동기화.

# DramaScript AI Version History

## v0.25 (2026-04-04)
- **Full Version Synchronization**: Updated all UI components (Header, Meta, State) to v0.25 to resolve staleness issues.
- **Web Deployment**: Synchronized all local changes to the web repository.

## v0.24 (2026-04-03)
### Fixed
- **생성 실패 시 진행률 버그 수정**: 에러 발생 시 진행률이 100%로 고정되던 현상을 수정하여 실제 실패 지점을 표시하도록 개선.
- **에러 피드백 강화**: 프로젝트 카드에 구체적인 에러 메시지(error_msg)를 노출하여 실패 원인 파악 용이성 증대.

## [v0.16] - 2026-04-03
### Added
- **멀티턴 대본 생성 시스템 (Multi-turn Scene Generation)**: 씬별 순차 생성 및 AI 문맥 유지 기능 도입.
- **회차별 상태 관리**: 에피소드별 '대기/작성 중/완성' 상태 추적 및 DB 저장.
- **다음 화 자동 요약**: 완성된 회차의 스토리를 요약하여 다음 화 생성 시 참고 데이터로 활용.
- **실시간 프로그레스 UI**: 씬 단위 생성 진행률 표시 및 라이브 렌더링.
- **DB 마이그레이션 스크립트**: `episodes` 테이블 확장 (script_history, current_scene_idx 등).

### Improved
- **AI 응답 안정성**: JSON 파싱 실패 시 재시도 프롬프트 및 전처리 로직 강화.
- **Vercel Timeout 회피**: 씬 단위 분할 요청 방식으로 타임아웃 오류 근본적 해결.

## [v0.15] - 2026-04-03
### Added
- **재시도 프롬프트 강화 (Advanced Retry Intelligence)**: JSON 파싱 실패 시, 따옴표 제거 및 줄바꿈 처리 규칙이 포함된 고성능 복구 프롬프트 도입.
- **인프라 최적화 (Vercel Timeout)**: `vercel.json`의 `maxDuration`을 60초로 상향 조정하여 긴 AI 응답 대기 안정성 확보.
- **개발 프로토콜 공식화**: Edge Function 수정 시 `supabase functions deploy` 명령 실행을 필수 절차로 명시.

### Fixed
- Vercel 환경에서의 서버리스 함수 타임아웃 오류 방지.

## [v0.14] - 2026-04-03
### Added
- **JSON 파싱 안정성 강화 (JSON Extraction Hardening)**: AI 응답 내 마크다운 제거, 제어 문자 정제, 특정 블록 추출 로직 도입.
- **파싱 실패 시 자동 재시도 (Auto-Retry)**: JSON 파싱 실패 시 "JSON만 다시 출력" 프롬프트로 1회 자동 재시도 구현 (백엔드 및 Edge Function 공통).
- **프롬프트 가이드라인 강화**: 문자열 내부 큰따옴표(") 사용 금지 및 이스케이프 강제 지침 추가.

### Fixed
- CORE 단계 등에서 따옴표 미처리로 인한 `Unexpected token` 파싱 에러 해결.

 ## [v0.13] - 2026-04-03
### Added
- 기존 `synopsis` 필드에 잘못 저장된 JSON 데이터를 각 필드(`title`, `logline`, `chars`, `synopsis`)로 분산시키는 마이그레이션 스크립트(`migrate_json_data.js`) 실행 완료.

### Fixed
- Supabase Edge Function (`generate`) 내 데이터 매핑 로직 보완: AI가 응답하는 다양한 JSON 구조(중첩 객체 등)를 필터링하여 DB 컬럼에 정확히 매핑되도록 수정.
- 캐릭터 데이터 필드명(`chars` vs `characters`) 호환성 개선.

 ## v0.12 (2026-04-03)
 ### 🔧 엔진 및 UI 시스템 통합 업데이트
 - **프로그레스바 역주행 완전 해결**: `_displayedPct` 상태 변수 도입으로 서버 폴링 데이터가 화면 수치보다 낮을 경우 무시하도록 설계.
 - **동적 버전 동기화 시스템**: `state.js`에서 버전을 관리하며 UI(`index.html`)의 모든 버전 태그를 JS가 자동 동기화하도록 구현.
 - **백엔드 오피스 최적화**: 
   - 좌측 메뉴 스크롤바 제거 및 불필요한 디자인 요소(샘플 카드 내 진행률 등) 대거 정리.
   - 샘플 데이터 수정 시 실시간으로 메인 화면에 반영되는 'Live Sync' 적용.
   - 삭제 버튼 위치 조정 등 사용자 경험(UX) 개선.
 - **안정성 강화**: 데이터 로딩 중 로딩 애니메이션이 무한 반복되는 증상 해결.

 ## v0.1.135 (2026-04-03)
 ### 🔧 프로그레스바 역주행 수정
 - **원인**: 프론트 스무더(300ms 타이머)가 6%로 올려놓으면, 3초 폴링이 서버에서 `pct:5`를 읽어와 강제로 5%로 덮어쓰는 충돌 발생.
 - **수정**:
   1. `_displayedPct` 모듈 변수 도입 — projectId별 "화면에 표시된 최대 pct" 추적
   2. `_updateBarUI(projectId, newPct)` 헬퍼 추가 — `Math.max(prev, newPct)` 로 감소 불가
   3. `startPolling`: `renderProjectCards()` 호출 제거 → `_updateBarUI` + 상태 텍스트만 직접 업데이트
   4. `startProgressSmoother`: `_updateBarUI` 사용으로 스무더도 감소 방지 보장
   5. `projects_list.js`: 타깃 업데이트 조건을 `>=` → `>` 로 강화 (동일값 보존)


 ### 🖥️ 백엔드 오피스 UI 3종 개선
 - **사이드바 스크롤 제거**: `.admin-nav` 및 `.admin-sidebar`에 `overflow: hidden` 적용. 좌측 메뉴에 불필요한 스크롤바 완전 제거.
 - **샘플 카드 진행률 바 삭제**: 샘플 프로젝트 관리 카드에서 "생성 진행률" 프로그레스 바 제거. 불필요한 요소 정리.
 - **삭제 버튼 이동**: 샘플 카드 상단 헤더 우측으로 삭제 버튼 이동 (노출 토글 옆). 빠르게 접근 가능.
 - **로딩 스피너 즉시 제거**: 탭 전환 시 데이터 로드 완료 후 `removeLoader()` 항상 호출. 완료됐는데도 스피너가 남아있던 현상 수정.
 - **어드민 → 샘플 즉시 반영**: 어드민에서 저장(saveAllAdminSamples) 시 `sample-updated` 커스텀 이벤트를 dispatch. `samples.js`의 `DIRECTORS_ARENA_SAMPLE` / `SEOUL_NIGHT_SAMPLE` export 변수가 즉시 업데이트됨. 이후 사용자가 샘플 카드 클릭 시 어드민 수정사항이 바로 반영.


 ### 🔬 전체 생성 로직 철저 리뷰 & 핵심 버그 11건 수정

 **수정된 치명적 버그 (P1)**
 - **BUG-01 제거**: `pool` 미선언 ReferenceError — 존재하지 않는 pg Pool을 호출하던 게스트 PG 폴백 분기 코드 전면 제거. 이로 인한 런타임 크래시 원인 제거.
 - **BUG-02 복구**: `getSystemConfig()` 함수가 항상 하드코딩 defaults만 반환하던 버그 수정. 이제 Supabase `system_settings` 테이블에서 실제 모델/프롬프트 설정을 읽음. 관리자 패널 설정 변경이 AI 생성에 실제 반영됨.
 - **BUG-03 수정**: `generate/step` Step 2~5에서 `resultData`(이전 HTTP 요청의 변수, 빈 객체)를 참조하던 버그. DB에서 읽은 `project.xxx` 값만 참조하도록 수정. null 프롬프트 방지.
 - **BUG-04 추가**: `generate/step` switch 문에 `case 1`이 누락되어 step=1 호출 시 항상 500 에러 발생. 인물 기초 설정(Phase 2, 35%) step 추가.
 - **BUG-05 수정**: `admin.js` samples GET에서 없는 `updated_at` 컬럼으로 정렬 시도 → 500 에러. `id` 정렬로 변경. upsert에서도 `updated_at` 필드 제거.

 **수정된 중간 버그 (P2)**
 - **BUG-07 제거**: `POST /projects` 에서 `stats` 필드 중복 대입 코드 제거.
 - **BUG-08 수정**: `runLocalGeneration`의 episodes alias 변환 시 `Array.isArray()` 체크 추가. 숫자형 에피소드 수가 scripts 필드로 잘못 저장되던 버그 방지.
 - **BUG-09 수정**: `saveProject()` 반환값에서 project ID 추출 안전화. `data.project?.id`가 null이면 경고 로그 출력.
 - **BUG-10 수정**: 게스트 프로젝트 마이그레이션 실패 시 로컬 데이터를 삭제하지 않도록 수정. 서버 저장 성공 확인 후에만 localStorage 삭제.
 - **BUG-11 보호**: `generate/step`의 모든 DB 업데이트 전에 `serviceSupabase` null 체크 추가.


 ### ✨ AI Conflict Analysis & UI Flicker Reduction
 - **Conflict Analysis Phase**: Integrated a new "Conflict Analysis" step into the AI generation pipeline (Backend Phase 3). This generates deep internal, interpersonal, and social conflicts for each project.
 - **Flicker-Free Progress Bars**: Refactored `renderProjectCards` to use targeted DOM updates for generating projects, eliminating the full-page refresh flicker during polling.
 - **Elegant Relationship Map**: Simplified the character connection SVG with smaller nodes and a more compact vertical layout for a cleaner dashboard experience.
 - **AI Pipeline Step Indexing**: Fixed sequential numbering and labeling of generation phases in the backend for more accurate progress tracking.
 
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
