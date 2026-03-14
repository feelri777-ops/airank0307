/** 네비게이션 메뉴 항목 */
export const NAV_ITEMS = [
  { id: "ranking",  label: "랭킹",          icon: "🏆" },
  // { id: "treemap",  label: "지형도",      icon: "🗺️" },  // 준비 중 — 공개 시 주석 해제
  { id: "gallery",  label: "갤러리",        icon: "🖼️" },
  { id: "community",label: "커뮤니티",      icon: "💬" },
  { id: "directory",label: "도구 디렉토리", icon: "📂" },
  { id: "news",     label: "뉴스",          icon: "📰" },
  { id: "prompt",   label: "프롬프트",      icon: "✨" },
];

/** 카테고리 필터 목록 */
export const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "text", label: "텍스트" },
  { id: "chatbot", label: "챗봇" },
  { id: "image", label: "이미지" },
  { id: "photo", label: "사진편집" },
  { id: "code", label: "코딩" },
  { id: "video", label: "영상" },
  { id: "audio", label: "오디오" },
  { id: "search", label: "검색" },
  { id: "productivity", label: "생산성" },
  { id: "automation", label: "자동화" },
  { id: "design", label: "디자인" },
  { id: "education", label: "교육" },
];

/** 직업군 필터 목록 */
export const LIFE_FILTERS = [
  { id: "all", label: "전체" },
  { id: "office", label: "직장인 필수" },
  { id: "freelancer", label: "프리랜서 필수" },
  { id: "student", label: "대학생 필수" },
  { id: "creator", label: "크리에이터" },
  { id: "marketer", label: "마케터" },
  { id: "startup", label: "스타트업" },
];

/** 정렬 옵션 */
export const SORT_OPTIONS = [
  { id: "score_desc", label: "종합점수높은순" },
  { id: "google_desc", label: "구글점수높은순" },
  { id: "naver_desc", label: "네이버점수높은순" },
  { id: "x_desc",     label: "X(트위터)높은순" },
  { id: "name",       label: "이름순" },
];

/** 커뮤니티 카테고리 */
export const COMMUNITY_CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "question", label: "질문" },
  { id: "tips", label: "팁&노하우" },
  { id: "free", label: "자유" },
];

/** 트렌드 티커 뉴스 */
export const TICKER_ITEMS = [
  "🔥 ChatGPT 언급량 15% 상승 중!",
  "🚀 Cursor IDE 성장률 1위 — 개발자 사이에서 폭발적 인기",
  "🎬 Sora AI 영상 생성 기능 정식 오픈",
  "🎵 Suno AI v4 업데이트 — 음질 대폭 개선",
  "📈 Claude 3.5 Sonnet 출시 후 점수 급등",
  "🔍 Perplexity AI, 기업용 Pro 플랜 출시",
  "🎨 Midjourney v6.1 포토리얼리즘 강화",
  "⚡ Notion AI 2.0 — 자동 프로젝트 관리 기능 추가",
];
