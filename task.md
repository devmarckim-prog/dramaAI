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
- [ ] **Backend & API**
    - [x] Add process error handlers to `serve.js`
    - [/] Debug and Fix Project Deletion in `api/routes/api.js`
        - [ ] Verify Supabase RLS and Guest Fingerprint filtering
        - [ ] Add robust logging for deletion attempts
    - [ ] Update AI Proxy to support Claude 4 series IDs
- [/] **Research & Documentation**
    - [x] Study Claude 4 series documentation
    - [ ] Create `docs/claude_api_study.md` summary
- [ ] **Verification**
    - [ ] Test Guest deletion
    - [ ] Test Auth deletion
    - [ ] Verify Dashboard alignment

## 🚀 긴급 복구 및 서비스 안정화 (완료)
- [x] 서버 프로세스 재가동 (`node serve.js`)
- [x] 포트 8081 가동 상태 확인
- [x] 401 Unauthorized 에러 수정 (게스트용 샘플 조회 API 공개화)
- [x] 프론트엔드 연동 경로 수정 (`/api/admin/samples` -> `/api/samples`)
- [x] 최종 가동 검증 (브라우저 테스트 완료)

## 📊 DB 구조 최신화 및 리뷰 (완료)
- [x] 프로젝트 ID 호환성 수정 (`BIGINT` -> `TEXT`)
- [x] `samples` 테이블 구조 및 RLS 정책 수립
- [x] 마스터 스키마 문서(`SUPABASE_SETUP.md`) 갱신
- [x] 생성 루틴(`Generate`) 저장 프로세스 정밀 검토

## 🛡️ 서버 안정화 및 최종 점검 (완료)
- [x] 서버 강제 재가동 (`node serve.js` 백그라운드 실행)
- [x] 포트 8081 상태 상시 모니터링
- [x] 종료 전 최종 Health Check 검증
- [x] Walkthrough에 서버 가동 상태 명시
