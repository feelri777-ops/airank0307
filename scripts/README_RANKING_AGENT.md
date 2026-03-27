# 🚀 Ranking Agent v2.0 실행 가이드

## 📋 개편 내용

### ✅ 주요 변경 사항
1. **Perplexity API → Google Gemini 3 Flash Preview** 교체
2. **Google Search Grounding** 활성화 (실시간 웹 검색)
3. **세부 점수 6가지 요소** 수집
   - Usage_Score (사용량)
   - Tech_Score (기술력)
   - Buzz_Score (화제성)
   - Utility_Score (실용성)
   - Growth_Score (성장성)
   - Total_Score (종합 점수)
4. **강화된 중복 제거** 및 에러 핸들링
5. **자동 재시도 로직** (최대 3회)
6. **백업 데이터 시스템** (Fallback Pool)

---

## 🔧 실행 전 준비사항

### 1. 환경 변수 확인
`.env` 파일에 다음 키가 설정되어 있는지 확인:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Firebase 인증 확인
다음 중 하나가 설정되어 있어야 합니다:
- `FIREBASE_SERVICE_ACCOUNT` 환경 변수
- `serviceAccountKey.json` 파일 (프로젝트 루트)

### 3. 의존성 설치 확인
```bash
npm install
```

---

## 🎯 실행 방법

### Windows PowerShell
```powershell
cd "C:\Users\400041460038\Desktop\code main\airank0307-main (1)"
node scripts/ranking_agent.js
```

### Windows CMD
```cmd
cd "C:\Users\400041460038\Desktop\code main\airank0307-main (1)"
node scripts\ranking_agent.js
```

### Git Bash / WSL
```bash
cd "/c/Users/400041460038/Desktop/code main/airank0307-main (1)"
node scripts/ranking_agent.js
```

---

## 📊 실행 과정

### 1단계: 초기화 (5초)
- Firebase 연결
- Gemini API 초기화
- 기존 랭킹 데이터 로드

### 2단계: 데이터 수집 (20~30분 예상)
- 10개씩 10번 호출 (1~10위, 11~20위, ..., 91~100위)
- 각 호출마다 2초 대기 (Rate Limiting 방지)
- Google Search로 실시간 데이터 수집
- 자동 중복 제거

### 3단계: 저장 및 완료 (5초)
- adminReports 컬렉션에 저장
- 통계 출력 (평균 점수, 상위/하위 3개 툴)

---

## 🛡️ 안전 장치

### 1. 다단계 재시도 시스템
```
1차 시도 실패 → 3초 후 재시도
2차 시도 실패 → 3초 후 재시도
3차 시도 실패 → 5초 후 최종 재시도
최종 실패 → Fallback 데이터 사용
```

### 2. 중복 제거 알고리즘
- 청크 내부 중복 제거
- 전역 중복 제거 (제품군 키워드 매칭)
- 대소문자 무관 비교

### 3. 데이터 검증
- 필수 필드 검증 (Name, Rank, URL)
- 점수 범위 검증 (0.0~100.0)
- JSON 파싱 오류 처리

### 4. Fallback Pool
API 실패 시 20개의 검증된 AI 툴 데이터 사용:
- ChatGPT, Claude, Gemini
- Midjourney, DALL-E 3, Stable Diffusion
- GitHub Copilot, Cursor, Perplexity AI
- 등 주요 AI 툴 포함

---

## 📈 출력 예시

```
🚀 [Ranking Agent v2.0] 2026년 3월 4주차 (2026-03-24 ~ 2026-03-30 기준) 글로벌 AI 툴 랭킹 생성 시작...

🔧 AI 엔진: Google Gemini 3 Flash Preview + Google Search Grounding

📡 Firestore에서 현재 1~100위 데이터를 가져오는 중...
✅ 기존 데이터 100개 로드 완료

🤖 [Ranking Agent] 1위부터 10위 분석 중 (Gemini 3 Flash Preview + Google Search)...
   ✅ 1위부터 10위: 10개 항목 수집 완료
   📊 진행률: 10/100 완료 (10%) [이번 구간 +10개]

🤖 [Ranking Agent] 11위부터 20위 분석 중 (Gemini 3 Flash Preview + Google Search)...
   ✅ 11위부터 20위: 10개 항목 수집 완료
   📊 진행률: 20/100 완료 (20%) [이번 구간 +10개]

...

✅ 총 100개 도구 수집 완료 (중복 제거됨)

💾 Firestore adminReports에 저장 중...

🎉 [완료] adminReports에 보고서 저장 완료!
   📄 보고서 ID: abc123xyz
   📊 수집된 툴: 100개
   ⚠️  관리자 에이전트 제어실에서 최종 승인 후 랭킹이 갱신됩니다.

📈 [통계]
   평균 Total Score: 78.45
   상위 3개 툴: ChatGPT, Claude, Gemini
   하위 3개 툴: ToolA, ToolB, ToolC
```

---

## ⚠️ 문제 해결

### 오류: "GEMINI_API_KEY가 설정되지 않았습니다"
**해결**: `.env` 파일에 `VITE_GEMINI_API_KEY=your_key` 추가

### 오류: "Firebase 인증 정보를 찾을 수 없습니다"
**해결**:
1. `serviceAccountKey.json` 파일을 프로젝트 루트에 추가
2. 또는 `FIREBASE_SERVICE_ACCOUNT` 환경 변수 설정

### 오류: "Gemini API 호출 실패"
**해결**:
- API 키 유효성 확인
- API 쿼터 확인 (Google AI Studio)
- 네트워크 연결 확인

### 경고: "10개를 다 채우지 못함"
**정상 동작**: 자동으로 재시도합니다. 3회 실패 시 Fallback 데이터 사용

### 중복 툴이 많이 제외됨
**정상 동작**: 중복 제거 알고리즘이 작동 중입니다.

---

## 🔍 디버깅 모드

상세 로그를 보려면 코드 내 디버그 플래그 활성화:
```javascript
// scripts/ranking_agent.js 파일 상단에 추가
const DEBUG = true;
```

---

## 📞 지원

문제가 지속되면:
1. 전체 에러 로그 복사
2. `.env` 파일 확인 (키는 제외)
3. Firebase 프로젝트 설정 확인

---

## 🎉 성공적으로 완료되면

1. **adminReports 확인**
   - Firebase Console → Firestore → adminReports 컬렉션
   - 최신 문서 확인 (status: "pending")

2. **관리자 승인 대기**
   - 관리자 에이전트 제어실에서 보고서 확인
   - 승인 시 tools 컬렉션에 반영

3. **프론트엔드 확인**
   - 웹사이트에서 새 랭킹 확인
   - 세부 점수 요소 표시 확인

---

## 📝 변경 이력

### v2.0 (2026-03-27)
- Perplexity → Gemini 3 Flash Preview 전환
- Google Search Grounding 추가
- 세부 점수 6가지 수집
- 중복 제거 로직 강화
- 에러 핸들링 개선

### v1.0 (이전 버전)
- Perplexity API 사용
- 기본 랭킹 수집
