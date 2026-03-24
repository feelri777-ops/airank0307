# 프로젝트 진행 내역 (History)

## 1. 프로젝트 파일 구조 확인
- 전체 프로젝트 파일 목록을 스캔하여 구조를 파악했습니다.
- 주요 경로: `src/context`, `src/components`, `src/pages`, `public` 등

## 2. 보안 문제 수정: 이메일 미인증 로그인 차단
**문제점:** 이메일 인증이 완료되지 않은 상태에서도 로그인이 유지되거나 세션이 생성되는 보안 취약점 발견.

**해결책 (`src/context/AuthContext.jsx` 수정):**
1. **`handleUser` 함수 개선:**
   - Firebase 인증 상태 변경 감지 시, 사용자가 이메일/비밀번호 로그인 방식(`password` provider)인 경우 `emailVerified` 속성을 확인합니다.
   - 인증되지 않은 경우 즉시 `signOut(auth)`을 호출하고 `user` 상태를 `null`로 설정하여 강제 로그아웃 처리했습니다.

2. **`registerWithEmail` 함수 개선:**
   - 회원가입 성공 직후 `signOut(auth)`을 호출하여 자동 로그인을 방지했습니다. 사용자는 이메일 인증 후 다시 로그인해야 합니다.

3. **`loginWithEmail` 함수 개선:**
   - 로그인 시도 시 `signInWithEmailAndPassword` 성공 직후 `emailVerified`를 체크합니다.
   - 미인증 시 즉시 로그아웃하고 에러를 발생시켜 `LoginModal`에서 적절한 메시지를 표시하도록 유도했습니다.

4. **`logout` 함수 개선:**
   - 로그아웃 호출 시 UI 반응성을 높이기 위해 `user` 상태를 즉시 `null`로 초기화했습니다.

## 3. GitHub 저장소 동기화
- **Git Status:** 변경된 `src/context/AuthContext.jsx` 확인
- **Git Add & Commit:** 메시지 `"Fix: 이메일 미인증 시 로그인 차단 및 세션 종료"`
- **Git Push:** `origin main` 브랜치로 푸시 완료 (Hash: `ebdd9c4`)

## 4. 배포 준비 (Cloudflare Pages)
- **의존성 설치:** `npm install` 완료
- **프로젝트 빌드:** `npm run build` 실행 완료
  - 결과물: `dist` 폴더 생성됨
  - 상태: 정적 파일 생성 완료, Cloudflare Pages 배포 준비 끝

## 5. 향후 배포 가이드
Cloudflare Pages 배포는 두 가지 방법으로 가능합니다:
1. **Cloudflare Dashboard 이용 (권장):** GitHub 저장소를 연결하여 `main` 브랜치 푸시 시 자동 배포 설정 (`npm run build`, output: `dist`).
2. **Wrangler CLI 이용:** `npx wrangler pages deploy dist` 명령어 사용.

---

## 6. ToolDetailModal UI 개편 (2026-03-23 ~ 24)

### 유튜브 영상 카드 가로 레이아웃 변경
- 기존 세로 배치(썸네일 → 제목 → 채널)에서 가로 배치로 변경
- 썸네일(왼쪽) + 제목/조회수/채널명(오른쪽) 구성
- 썸네일 크기 단계적 조정: `130×73` → `160×90`px

### 우측 카드 폭 확장
- 우측 카드 고정 너비(`350px`) → 좌측 카드와 동일한 `flex: 1`
- 전체 컨테이너 `maxWidth: 820px` → `920px`

### USP/Analysis/버튼 상하 여백 최소화
- CORE USP, ANALYSIS 섹션 패딩 `14px` → `8px 10px`
- 하단 버튼(`공식 사이트 바로가기`, `게시판`) 패딩 `16px` → `12px`

### 모바일 스와이프 캐러셀
- 모바일에서 카드 세로 배치 대신 좌우 스와이프 전환 방식 도입
- 터치 제스처(swipe left/right) + 하단 도트 인디케이터 구현
- 썸네일 모바일 대응: `90×51px` / 데스크탑: `160×90px`

---

## 7. 커뮤니티 테마 추가 (2026-03-24)
- 민트/청록 컬러 기반 커뮤니티 테마 추가
- Digital Arboretum Dark 테마 추가 후 일시 보류
- 히어로 섹션 심플화

---

## 8. 웹 접근성 개선 (2026-03-24 ~ 25)

### P0 긴급 접근성 개선 (`c38d78d7`)
- 주요 인터랙티브 요소 `aria-label` 추가
- 아이콘 버튼 접근성 보완

### 접근성 & 성능 개선 (`03cc349e`)
- `GlobalStyles.jsx`: `:focus-visible` 포커스 링 스타일 추가
- `GlobalStyles.jsx`: `@media (prefers-reduced-motion: reduce)` 애니메이션 비활성화 대응
- `ToolDetailModal.jsx`: `overscrollBehavior: "contain"` 추가 (모바일 스크롤 이탈 방지)
- `ThemeToggle.jsx`: Enter/Space/Escape 키보드 핸들러 추가, `aria-haspopup`/`aria-expanded`/`aria-selected` 속성 추가

### Navbar 드롭다운 접근성 (`da0cc1a5`)
- 드롭다운 내부 Escape 키로 닫기 지원
- `role="menu"` / `role="menuitem"` 추가
- `aria-haspopup="true"` 추가

---

## 9. 성능 최적화 (2026-03-25)

### `transition: all` 제거
- 전체 코드베이스의 `transition: all` → 특정 프로퍼티 명시로 일괄 변경
- 대상 파일: GlobalStyles, ToolDetailModal, ThemeToggle, FilterBar, LoginModal, MainPage, Dashboard, Gallery, News, CommunityPost 등 30여 곳
- 예: `transition: "all 0.2s"` → `transition: "background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s"`

### 이미지 `loading="lazy"` 추가
- `ToolCard.jsx`: 툴 파비콘 이미지
- `ToolDetailModal.jsx`: 유튜브 썸네일, 시너지 AI 파비콘
- `Gallery.jsx`: 갤러리 포스트 이미지
