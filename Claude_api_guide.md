# Claude API Guide

## 올바른 모델명 (Model Names) 및 최대 출력 토큰 (Max Output Tokens)

Anthropic API를 사용할 때는 정확한 모델명을 지정해야 하며, 각 모델별로 가용한 최대 토큰(Max Tokens) 값이 다릅니다. 이 값을 초과하여 설정하면 에러가 발생합니다.

### 추천하는 최신 모델 리스트
1. **Claude 4.6 Sonnet (최신 추천: 복합한 기획, 시놉시스, 대본)**
   - **모델명**: `claude-sonnet-4-6`
   - **Max Output Tokens**: 8,192 (API 요청 시 최대값)

2. **Claude 4.5 Haiku (최신 추천: 빠르고 가벼운 생성, 에피소드 요약)**
   - **모델명**: `claude-haiku-4-5-20251001`
   - **Max Output Tokens**: 8,192

3. **Claude 3.5 Sonnet (구버전)**
   - **모델명**: `claude-3-5-sonnet-20241022`
   - **Max Output Tokens**: 8,192

### 자주 발생하는 오류 및 주의사항
- ❌ `claude-3-5-sonnet-20240620` (구버전)
- ❌ `claude-3-haiku-20240307` (구버전)
- 🆗 `claude-haiku-4-5-20251001`, `claude-sonnet-4-6` (정식 모델명)
- `max_tokens`에는 모델 스펙 내의 정수를 넘겨주어야 하며, 3.5 Sonnet/Haiku의 경우 최대 8192까지 허용됩니다. 이전 버전들은 대부분 4096이 최대치입니다.

## 코드 수정 규칙
- API 호출 시 **반드시 위 모델명을 명시적으로 사용**하거나, 서버/Edge Function에 이 값이 잘 맵핑되어 있는지 확인할 것.
- `max_tokens` 값이 모델별 제한을 넘지 않도록 설정할 것.
