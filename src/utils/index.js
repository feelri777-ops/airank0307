/** Firestore Timestamp 또는 Date → 상대 시간 문자열 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return date.toLocaleDateString("ko-KR");
};

/** 
 * HTML 엔티티 디코딩 (&#39;, &quot;, &amp;, &#61;, &#x3D; 등 모든 형태 처리)
 */
export const decodeHtmlEntities = (text) => {
  if (!text) return "";
  
  // 1. 기본 엔티티 객체
  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&nbsp;": " ",
    "&#39;": "'",
    "&apos;": "'"
  };

  // 2. 이름 기반 엔티티 변환 및 숫자형 엔티티(&#123;, &#xABC;) 변환
  return text.replace(/&(#?[xX]?\w+);/g, (match, p1) => {
    // 미리 정의된 엔티티인 경우
    if (entities[match]) return entities[match];

    // 숫자형 엔티티인 경우 (&#1000; 또는 &#xABC;)
    if (p1.startsWith("#")) {
      const isHex = p1.charAt(1).toLowerCase() === "x";
      const code = parseInt(p1.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return !isNaN(code) ? String.fromCharCode(code) : match;
    }

    return match;
  });
};
