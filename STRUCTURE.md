# AI뭐써? — 코드 구조 문서

> 실시간 AI 도구 랭킹 사이트. SNS 트렌드 점수 기반으로 한국 사용자 관점에서 AI 도구를 평가합니다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Vite + React 18 (plain JS) |
| 스타일링 | CSS 변수 (인라인 스타일, GlobalStyles) |
| 인증 | Firebase Auth (Google OAuth, signInWithPopup) |
| DB | Firebase Firestore (bookmarks 컬렉션) |
| 배포 | Cloudflare Pages (GitHub 자동 배포) |
| 폰트 | Outfit (제목) + Pretendard (본문) |
| 디자인 | Indigo #6366f1 + Cyan #06b6d4 / 라이트·다크 테마 |

---

## 폴더 구조

```
airank-feelri0227/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── scores.json              # GitHub Actions가 갱신하는 실시간 점수
│   └── news.json                # GitHub Actions가 갱신하는 뉴스 데이터
├── scripts/
│   ├── fetch-scores.js          # Naver/YouTube/Google/GitHub 점수 수집 스크립트
│   └── fetch-news.js            # Naver 뉴스 수집 스크립트
├── .github/workflows/
│   ├── update-scores.yml        # 매일 KST 04:00 자동 실행 크론
│   └── update-news.yml          # 2시간마다 자동 실행 크론
└── src/
    ├── main.jsx                 # 앱 진입점 (AuthProvider 래핑)
    ├── App.jsx                  # 루트 컴포넌트 (상태 관리 중심)
    ├── firebase.js              # Firebase 초기화 (auth, provider, db)
    ├── constants/
    │   └── index.js             # NAV_ITEMS, CATEGORIES, LIFE_FILTERS, SORT_OPTIONS
    ├── data/
    │   └── tools.js             # TOOLS_DATA (200개), WIZARD_Q1, WIZARD_Q2
    ├── utils/
    │   └── index.js             # getScoreColor, getScoreTextColor, getRankBadge
    ├── context/
    │   └── AuthContext.jsx      # Google 로그인 상태 전역 관리
    ├── styles/
    │   └── GlobalStyles.jsx     # CSS 변수, 키프레임, 반응형 미디어쿼리
    └── components/
        # ... (컴포넌트 폴더 구조는 이전과 동일)
```

---

## 주요 파일 설명

### `src/data/tools.js`
**200개** AI 도구 데이터. 각 도구의 필드:

```js
{
  id,        // 고유 번호
  cat,       // 카테고리
  icon,      // 이모지 (favicon 실패 시 폴백)
  name,      // 도구 이름
  free,      // 무료 여부
  desc,      // 한 줄 설명
  url,       // 공식 사이트 URL
  features,  // 핵심 기능 5개 (배열)
  tags,      // 태그 배열
  score,     // SNS 종합 점수
  change,    // 7일 변화율
  sns: { naver, youtube, google, github },
  life,      // 추천 직업군 배열
}
```

**카테고리별 도구 수 (200개 기준)**: (실제 데이터 기준으로 업데이트 필요)

---

## 점수 및 뉴스 시스템

### 점수 시스템
- **수집**: `scripts/fetch-scores.js` (Naver, YouTube, Google, GitHub)
- **스케줄**: `.github/workflows/update-scores.yml` (매일 KST 04:00)
- **저장**: `public/scores.json`

### 뉴스 시스템
- **수집**: `scripts/fetch-news.js` (Naver News API)
- **스케줄**: `.github/workflows/update-news.yml` (매 2시간)
- **저장**: `public/news.json`

(이하 내용은 이전과 동일)
