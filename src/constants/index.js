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
];

/**
 * Firestore의 상세 cat 값("Video Generation" 등)을
 * 우리 CATEGORIES id("video" 등)로 매핑하는 함수.
 * 키워드 우선순위: 구체적 → 일반적 순서로 검사.
 */
export function mapCatToGroup(cat) {
  if (!cat) return null;
  const c = cat.toLowerCase();

  // 에이전트 (구체적 키워드 우선)
  if (c.includes("agent") || c.includes("agentic") || c.includes("autonomous")) return "agent";
  // 비디오
  if (c.includes("video") || c.includes("animation") || c.includes("vfx")) return "video";
  // 오디오/음악
  if (c.includes("audio") || c.includes("music") || c.includes("voice") || c.includes("podcast") || c.includes("tts") || c.includes("sound")) return "audio";
  // 이미지
  if (c.includes("image") || c.includes("visual") || c.includes("upscal")) return "image";
  // 디자인
  if (c.includes("design") || c.includes("brand") || c.includes("3d") || c.includes("avatar generation") || c.includes("gaming")) return "design";
  // 코드
  if (c.includes("coding") || c.includes("code") || c.includes("app builder") || c.includes("infrastructure") || c.includes("ide")) return "code";
  // 연구/검색
  if (c.includes("search") || c.includes("research") || c.includes("academic") || c.includes("intelligence") || c.includes("analysis") || c.includes("medical")) return "search";
  // 멀티모달/LLM
  if (c.includes("llm") || c.includes("multimodal")) return "multimodal";
  // 텍스트
  if (c.includes("writing") || c.includes("translation") || c.includes("copywriting") || c.includes("seo")) return "text";
  // 챗봇
  if (c.includes("chatbot") || c.includes("emotional") || c.includes("personal ai") || c.includes("avatar interaction")) return "chatbot";
  // 자동화/마케팅
  if (c.includes("automat") || c.includes("workflow") || c.includes("marketing") || c.includes("e-commerce") || c.includes("inventory")) return "automation";
  // 교육/프레젠테이션
  if (c.includes("present") || c.includes("storytelling") || c.includes("education")) return "education";
  // 생산성 (나머지 업무 도구)
  if (c.includes("productiv") || c.includes("workspace") || c.includes("meeting") || c.includes("transcript")
    || c.includes("document") || c.includes("spreadsheet") || c.includes("knowledge") || c.includes("collaborat")
    || c.includes("form") || c.includes("decision") || c.includes("health") || c.includes("legal")) return "productivity";

  return null;
}

export const COMMUNITY_CATEGORIES = [
  { id: "all",      label: "전체" },
  { id: "notice",   label: "공지" },
  { id: "question", label: "질문" },
  { id: "tips",     label: "팁&노하우" },
  { id: "free",     label: "자유" },
];
