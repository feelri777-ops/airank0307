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

/** 카테고리 필터 목록 (group: 구분선 렌더링용) */
export const CATEGORIES = [
  { id: "all",          label: "전체" },
  { divider: true },
  { id: "multimodal",   label: "멀티모달",   group: "언어/대화" },
  { id: "text",         label: "텍스트/LLM", group: "언어/대화" },
  { id: "chatbot",      label: "챗봇",       group: "언어/대화" },
  { divider: true },
  { id: "image",        label: "이미지",     group: "시각/창작" },
  { id: "photo",        label: "사진편집",   group: "시각/창작" },
  { id: "design",       label: "디자인",     group: "시각/창작" },
  { id: "video",        label: "비디오",     group: "시각/창작" },
  { id: "audio",        label: "오디오/음악", group: "시각/창작" },
  { divider: true },
  { id: "code",         label: "코드",       group: "개발/자동화" },
  { id: "agent",        label: "에이전트",   group: "개발/자동화" },
  { id: "automation",   label: "자동화",     group: "개발/자동화" },
  { divider: true },
  { id: "productivity", label: "생산성",     group: "업무/교육" },
  { id: "search",       label: "연구/검색",  group: "업무/교육" },
  { id: "education",    label: "교육",       group: "업무/교육" },
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
  { id: "score_desc",   label: "종합점수높은순" },
  { id: "buzz_desc",    label: "화제성높은순" },
  { id: "growth_desc",  label: "성장세높은순" },
  { id: "utility_desc", label: "실용성높은순" },
  { id: "name",         label: "이름순" },
];

export const COMMUNITY_CATEGORIES = [
  { id: "all",      label: "전체" },
  { id: "notice",   label: "공지" },
  { id: "question", label: "질문" },
  { id: "tips",     label: "팁&노하우" },
  { id: "free",     label: "자유" },
];
