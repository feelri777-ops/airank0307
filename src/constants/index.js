/** 네비게이션 메뉴 항목 */
export const NAV_ITEMS = [
  { id: "ranking",  label: "랭킹",          icon: "trophy" },
  // { id: "treemap",  label: "지형도",      icon: "layout" },  // 준비 중 — 공개 시 주석 해제
  { id: "gallery",  label: "갤러리",        icon: "images" },
  { id: "community",label: "커뮤니티",      icon: "chat-circle" },
  { id: "directory",label: "도구 디렉토리", icon: "folder-open" },
  { id: "news",     label: "뉴스",          icon: "newspaper" },
  { id: "prompt",   label: "프롬프트",      icon: "sparkle" },
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

export const COMMUNITY_CATEGORIES = [
  { id: "all",      label: "전체" },
  { id: "notice",   label: "공지" },
  { id: "question", label: "질문" },
  { id: "tips",     label: "팁&노하우" },
  { id: "free",     label: "자유" },
];
