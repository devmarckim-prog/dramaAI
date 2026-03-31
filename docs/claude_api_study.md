# 📘 Claude API 모델 레퍼런스 가이드

> **Last Verified: 2026-03-31** — Source: [Anthropic Official Docs](https://docs.anthropic.com/en/docs/about-claude/models)

---

## 1. 현재 사용 가능한 모델 (Claude 4 Series - Current Generation)

| 어드민 UI 표시 | 실제 API ID (정확) | 특장점 | 권장 용도 |
| :--- | :--- | :--- | :--- |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | 초고속, 최저 비용 | Planning (기획안, 로그라인) |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | 지능+속도 균형 ✅ **추천** | Production (시나리오 집필) |
| **Claude Opus 4.6** | `claude-opus-4-6` | 최고 지능, 최고 비용 | 프리미엄 대본 |

## 2. 레거시 모델 (호환성 유지, 사용 가능)

| API ID | 상태 |
| :--- | :--- |
| `claude-3-5-sonnet-latest` | 사용 가능 (Claude 4로 업그레이드 권장) |
| `claude-3-5-haiku-20241022` | 사용 가능 (Haiku 4.5로 업그레이드 권장) |
| `claude-3-opus-latest` | 사용 가능 (Opus 4.6으로 업그레이드 권장) |

---

## 3. 모델 선택 로직 (api/routes/api.js)

```
요청 Type     →  사용 모델
─────────────────────────────────────────────
plan_core     →  planningModel  (Haiku 4.5 권장 = 저비용)
plan_detail   →  planningModel  (Haiku 4.5 권장 = 저비용)
ppl           →  planningModel  (Haiku 4.5 권장 = 저비용)
script        →  productionModel (Sonnet 4.6 권장 = 고품질)
prod          →  productionModel (Sonnet 4.6 권장 = 고품질)
```

## 4. 모델 교체 흐름 확인 (설계 검증)

```
[어드민 UI] 드롭다운에서 모델 선택
    ↓
[admin.js] saveAdminConfig() → POST /api/admin/config
    ↓
[admin.js (backend)] → Supabase system_settings 테이블에 저장
    ↓
[사용자가 생성 실행] → POST /api/generate
    ↓
[api.js] getSystemConfig() → Supabase에서 읽음 ← 실시간 반영!
    ↓
[api.js] modelMap 통해 올바른 API ID로 변환
    ↓
[Anthropic API] 선택된 모델로 호출
```
✅ **어드민에서 저장하는 즉시 다음 생성부터 새 모델이 적용됩니다.**

---

## 5. 비용 최적화 권장 설정

| 설정 | 권장값 | 이유 |
| :--- | :--- | :--- |
| Planning Model | `claude-haiku-4-5` | 기획 단계는 속도가 중요, 비용 90% 절감 |
| Production Model | `claude-sonnet-4-6` | 대본 품질이 핵심, Sonnet이 최적 균형 |

---

## 6. ⚠️ 주의: 절대 사용하면 안 되는 잘못된 모델 ID

아래 ID들은 **Anthropic API에 존재하지 않아 에러** 발생:
- `claude-3-5-haiku-latest` → `claude-haiku-4-5` 로 사용
- `claude-3-5-sonnet-20240620` → deprecated (구버전)
- `claude-4-sonnet` (아직 미출시 - Anthropic 공식 미확인)

---

*Source: https://docs.anthropic.com/en/docs/about-claude/models*
