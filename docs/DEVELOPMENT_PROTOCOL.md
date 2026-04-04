# AI 개발 프로토콜 (AI Development Protocol)

이 문서는 AI 코딩 어시스턴트(Antigravity 등)가 프로젝트를 수정하거나 업데이트할 때 반드시 준수해야 하는 규칙을 정의합니다.

## 1. 버전 관리 및 동기화 (Version Management)

- **규칙**: `VERSION.md` 파일에 새로운 버전을 기록하거나 내용을 수정할 때, 반드시 아래 파일의 상수를 함께 업데이트하여 UI와 동기화해야 합니다.
- **대상 파일**: `js/modules/state.js`
- **대상 상수**: `export const APP_VERSION = 'vX.XX';`
- **목적**: 로고 옆의 버전 표시(`version-tag`)가 문서상의 버전과 항상 일치하도록 보장하기 위함입니다.
- **예외**: 사용자가 명시적으로 "지금은 놔두라"고 지시한 경우에는 예외로 합니다.

## 2. 배포 절차 및 검증 (Deployment & Verification)

- **규칙**: `supabase/functions/generate/index.ts` 코드를 수정하거나 프롬프트를 변경한 경우, 반드시 아래 명령어를 통해 Edge Function을 재배포해야 합니다.
- **명령어**: `supabase functions deploy generate` (또는 환경에 따라 `npx supabase ...`)
- **검증**: 배포 성공 로그(`Deployed Functions on project...`)를 확인한 후 사용자에게 완료 보고를 해야 합니다.

## 3. 히스토리 기록 (History Tracking)

- 수정 사항이 완료될 때마다 `VERSION.md`에 변경 내역을 소수점 2자리 형식으로 업데이트합니다. (예: v0.12 -> v0.13)
