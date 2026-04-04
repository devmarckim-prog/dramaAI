# 📝 작업 관리 목록 (Tasks)

## 🎨 프로젝트 카드 디자인 개편 (완료)
- [x] `.project-slate-card` 정사각형 비율(1:1) 적용
- [x] 제목 오버레이 및 하단 그라데이션 가독성 강화
- [x] Create task.md and Implementation Plan
- [x] Admin Dashboard Enhancement (Visibility & Progress)
    - [x] Add visibility toggles (Exposed/Hidden) to Sample Management
    - [x] Add real-time progress bars and creation dates to Sample Management
    - [x] Integrate visibility filtering in public `/api/samples`
    - [x] Add progress bars and creation dates to Admin Project List (Scripts tab)
    - [x] Add progress bars and creation dates to Admin Dashboard (Recent Timeline)
- [x] Logline UX Improvement
    - [x] Set default logline in wizard Step 3
    - [x] Add auto-clearing logic on focus/click
- [x] Serverless Stability (Harden Vercel Production)
    - [x] Fix file-system write errors on Vercel
    - [x] Defensive Supabase client initialization
- [x] Deployment & Verification
    - [x] Push all changes to Vercel
- [x] **Backend & API**
    - [x] Add process error handlers to `serve.js`
    - [x] Fix Backend API Errors
        - [x] Move `/api/generate/start` route to avoid 404 matching conflicts
        - [x] Remove `episodes_count` from `POST /projects` to fix 500 error
        - [x] Verify Supabase client service role permissions
    - [x] Debug and Fix Project Deletion in `api/routes/api.js`
        - [x] Verify Supabase RLS and Guest Fingerprint filtering
        - [x] Add robust logging for deletion attempts
    - [x] Update AI Proxy to support Claude 4 series IDs
- [x] **AI Generation Stall & Progress Fix (v3.5.2)**
    - [x] Fix JSON parsing vulnerabilities in `runLocalGeneration` (Final Phase)
    - [x] Implement robust `updateProject` with auto-serialization for DB persistence
    - [x] Force 100% UI completion on `done` status in `api.js` polling
    - [x] Relocate "Sample Management" to high-visibility position in Admin Sidebar

## 🚀 긴급 복구 및 서비스 안정화 (완료)
- [x] 서버 프로세스 재가동 (`node serve.js`)
- [x] 포트 8081 가동 상태 확인
- [x] 401 Unauthorized 에러 수정 (게스트용 샘플 조회 API 공개화)
- [x] 프론트엔드 연동 경로 수정 (`/api/admin/samples` -> `/api/samples`)
- [x] 최종 가동 검증 (브라우저 테스트 완료)

## 📊 DB 구조 최신화 및 리뷰 (완료)
- [x] 프로젝트 ID 호환성 수정 (`BIGINT` -> `TEXT`)
- [x] `js/modules/projects_list.js` 파일의 100% 진행률 고정 로직 제거
- [x] 에러 발생 시의 진행률(`p.pct`) 출력 및 색상 강조
- [x] 상세 에러 메시지(`p.error_msg`) UI 추가 노출
- [x] (선택사항) 에러 시 '다시 시도' 버튼 가이드 텍스트 보강
- [x] 최종 렌더링 검증 및 Walkthrough 업데이트

## 🛡️ 서버 안정화 및 최종 점검 (완료)
- [x] 서버 강제 재가동 (`node serve.js` 백그라운드 실행)
- [x] 포트 8081 상태 상시 모니터링
- [x] 종료 전 최종 Health Check 검증
- [x] Walkthrough에 서버 가동 상태 명시

## 🔄 갈등 구조 복구 및 버전 동기화 (완료) [v0.24]
- [x] '장군님의 횟집' 데이터베이스 보강 (갈등/캐릭터)
- [x] 프로젝트 로드 시 `conflicts` 필드 매핑 오류 수정 (`projects_list.js`)
- [x] 전역 버전 `v0.24` 동기화 (`state.js`, `index.html`, `VERSION.md`)
- [x] 대시보드 갈등 구조 렌더링 로직 강화 (Deep Search 적용)
- [x] 서버 가동 및 최종 렌더링 상태 검증

## 🍱 디렉터즈 아레나 샘플 고도화 (완료) [v0.30]
- [x] `js/modules/samples.js` 최신 8화 데이터 반영 (프론트엔드)
- [x] Supabase `samples` 테이블 데이터 동기화 (백엔드)
- [x] 최종 가동 및 렌더링 검증
