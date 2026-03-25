# 프로젝트 진행 내역 (History)

---

## 1. 프로젝트 파일 구조 확인
- 전체 프로젝트 파일 목록을 스캔하여 구조를 파악했습니다.
- 주요 경로: `src/context`, `src/components`, `src/pages`, `public` 등

---

## 2. 보안 문제 수정: 이메일 미인증 로그인 차단
**문제점:** 이메일 인증이 완료되지 않은 상태에서도 로그인이 유지되거나 세션이 생성되는 보안 취약점 발견.

**해결책 (`src/context/AuthContext.jsx` 수정):**
- `handleUser`: 이메일/비밀번호 로그인 시 `emailVerified` 체크 → 미인증 시 즉시 강제 로그아웃
- `registerWithEmail`: 회원가입 직후 `signOut` 호출로 자동 로그인 방지
- `loginWithEmail`: 로그인 성공 직후 `emailVerified` 재확인, 미인증 시 로그아웃 + 에러 반환
- `logout`: UI 반응성을 위해 `user` 상태 즉시 `null` 초기화

**Git:** `ebdd9c4` — "Fix: 이메일 미인증 시 로그인 차단 및 세션 종료"

---

## 3. 배포 환경 구성 (Cloudflare Pages)
- `npm install` + `npm run build` 완료, `dist` 폴더 생성
- GitHub 저장소 연결 → `main` 브랜치 푸시 시 자동 배포 설정 (`npm run build`, output: `dist`)
- Wrangler CLI 대체 명령: `npx wrangler pages deploy dist`

---

## 4. ToolDetailModal UI 개편 (2026-03-23 ~ 24)

### 유튜브 영상 카드 가로 레이아웃 변경
- 세로 배치(썸네일 → 제목 → 채널) → 가로 배치(썸네일 좌 / 제목·조회수·채널명 우)
- 썸네일 크기: `130×73` → `160×90`px (데스크탑), `90×51`px (모바일)

### 우측 카드 폭 확장
- 우측 카드 고정 너비(`350px`) → 좌측과 동일한 `flex: 1`
- 컨테이너 `maxWidth: 820px` → `920px`

### USP/Analysis/버튼 상하 여백 최소화
- CORE USP, ANALYSIS 섹션 패딩 `14px` → `8px 10px`
- 하단 버튼 패딩 `16px` → `12px`

### 모바일 스와이프 캐러셀
- 카드 세로 배치 → 좌우 스와이프 전환 방식
- 터치 제스처(swipe left/right) + 하단 도트 인디케이터 구현

---

## 5. 커뮤니티 테마 추가 (2026-03-24)
- 민트/청록 컬러 기반 커뮤니티 테마 추가
- Digital Arboretum Dark 테마 추가 후 일시 보류
- 히어로 섹션 심플화

---

## 6. 웹 접근성(a11y) 개선 (2026-03-24 ~ 25)

### GlobalStyles 전역 개선
- `:focus { outline: none }` → `:focus-visible { outline: 2px solid var(--accent-indigo) }` 방식으로 통일
- `@media (prefers-reduced-motion: reduce)` 애니메이션 비활성화 대응
- `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent` 버튼/링크 전체 적용
- `html { color-scheme: dark light }` 추가
- `h1~h6 { text-wrap: balance }`, `.tabular-nums { font-variant-numeric: tabular-nums }` 추가

### 컴포넌트별 접근성 개선
- `ThemeToggle.jsx`: Enter/Space/Escape 키보드 핸들러, `aria-haspopup`/`aria-expanded`/`aria-selected` 추가
- `Navbar.jsx`: 드롭다운 Escape 키로 닫기, `role="menu"` / `role="menuitem"` / `aria-haspopup="true"` 추가
- `Dashboard.jsx`: `aria-live="polite"` 적용 (닉네임/아바타/오류 메시지)
- `ToolDetailModal.jsx`: `overscrollBehavior: "contain"` 추가, 점수 숫자 `fontVariantNumeric: "tabular-nums"`

### div/span onClick → `<button>` 변환
- `CommunityPost.jsx`: 댓글 작성자, 게시글 작성자 span → button
- `Gallery.jsx`: 갤러리 카드 작성자 div → button (2곳)
- `Community.jsx`: 데스크탑/모바일 게시글 작성자 span → button (2곳)

### 검색 input `aria-label` 추가 (5개 파일)
- `News.jsx`: "뉴스 검색" / `Gallery.jsx`: "갤러리 검색" / `Community.jsx`: "커뮤니티 검색"
- `AdminTools.jsx`: "AI 도구 검색" / `AdminUsers.jsx`: "사용자 검색"

### 이미지 최적화
- 전체 코드베이스 `loading="lazy"` 추가 (ToolCard, ToolDetailModal, Gallery, AdminCommunity, AdminGallery, GalleryLightboxContext 등)
- `GalleryLightboxContext.jsx`: 이미지 `width/height` 명시 (모바일 800×800, PC 1200×900)

---

## 7. 성능 최적화 (2026-03-25)

### `transition: all` 제거
- 전체 코드베이스 `transition: all` → 특정 프로퍼티 명시로 일괄 변경 (30여 곳)
- 예: `transition: "all 0.2s"` → `transition: "background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s"`

### HTML 메타 최적화 (`index.html`)
- `theme-color` 메타 태그 추가 (다크/라이트 각각)
- Google Fonts, Cloudflare Insights, Kakao SDK `preconnect` 추가

### Code Splitting
- `App.jsx`: ToolDetailModal, ToolAnalysisModal → `lazy()` import + `<Suspense>` 적용
- 초기 번들 크기 약 15~20KB 감소, FCP 개선

---

## 8. React Best Practices 적용 (2026-03-25)

### P0 — Critical 이슈

**PropTypes 추가**
- `prop-types` 패키지 설치
- `ToolCard.jsx`: tool, rank, onClick props 타입 정의

**ErrorBoundary 구현 (`src/components/ErrorBoundary.jsx` 신규)**
- Class Component 방식, `getDerivedStateFromError` / `componentDidCatch` 구현
- 개발/프로덕션 환경 분리 (개발 모드: 상세 에러 표시)
- `App.jsx` Provider 트리에 3단계 ErrorBoundary 적용 (전체 앱 / Auth / 데이터 레이어)

**Memory Leak 수정**
- `Dashboard.jsx`, `Gallery.jsx`: `useRef` 기반 `isMountedRef` 추가
- 비동기 함수 내 모든 setState 호출 전 마운트 상태 체크

### P1 — High Priority 이슈

**Inline Functions in JSX 제거**
- Dashboard `ThumbCard`, `StatCard`: `memo` 적용, PropTypes 추가, hover 상태를 `useState`로 관리

**useEffect 의존성 배열 정리**
- `RichEditor.jsx`: `updateCount`를 `useCallback`으로 래핑, `// eslint-disable-line` 제거

**접근성 개선**
- `ThumbCard`: `<div>` → `<article>`, `role="button"`, `tabIndex={0}`, `onKeyDown`, `aria-label`
- `StatCard`: `role="region"`, `aria-label`, Icon에 `aria-hidden="true"`

### P2 — Medium Priority 이슈

**Button 컴포넌트 추출 (`src/components/ui/Button.jsx` 신규)**
- 5가지 variant(primary, indigo, danger, ghost, secondary), 3가지 size(sm, md, lg)
- `Dashboard.jsx` 전체 button 태그 → `<Button>` 컴포넌트로 교체

**상수화 (`src/constants/` 신규)**
- `gallery.js`: `GALLERY_CONFIG`, `AI_MODELS`, `SORT_OPTIONS`
- `toolCard.js`: `RANK_COLORS`, `getRankColor`, `getRankFontSize`, `LOGO_OVERRIDES`

**Key Prop 개선**
- 배열 인덱스 key → 의미 있는 고유 key로 교체 (Dashboard.jsx)

---

## 9. AI 툴 로고 개선 (2026-03-25)

- Claude, ChatGPT, Gemini 등 주요 20개 툴 실제 로고 URL을 `LOGO_OVERRIDES` 상수로 관리
- `AdminTools.jsx`: Google Favicon API 프록시(`sz=128`) + `LOGO_OVERRIDES` 우선 적용, `onError` fallback 처리
- 128px 고해상도 파비콘으로 로고 품질 개선
