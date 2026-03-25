/**
 * ToolCard 관련 상수
 */

export const RANK_COLORS = {
  GOLD: "#f59e0b",
  SILVER: "#94a3b8",
  BRONZE: "#c77d3a",
  DEFAULT: "var(--text-muted)",
};

export const RANK_FONT_SIZES = {
  TOP_10: "2.0rem",
  TOP_50: "1.5rem",
  TOP_99: "1.1rem",
  DEFAULT: "0.85rem",
};

/**
 * 순위에 따른 색상 반환
 */
export const getRankColor = (rank, isMono) => {
  if (isMono) return "var(--text-primary)";
  if (rank === 1) return RANK_COLORS.GOLD;
  if (rank === 2) return RANK_COLORS.SILVER;
  if (rank === 3) return RANK_COLORS.BRONZE;
  return RANK_COLORS.DEFAULT;
};

/**
 * 순위에 따른 폰트 크기 반환
 */
export const getRankFontSize = (rank) => {
  if (rank <= 10) return RANK_FONT_SIZES.TOP_10;
  if (rank <= 50) return RANK_FONT_SIZES.TOP_50;
  if (rank <= 99) return RANK_FONT_SIZES.TOP_99;
  return RANK_FONT_SIZES.DEFAULT;
};

/**
 * 특정 도메인의 로고 URL을 직접 지정
 * Google favicon API가 정확하지 않거나 CORS 문제가 있는 경우 사용
 *
 * 참고: 일부 사이트는 CORS 정책으로 인해 직접 로드가 안 될 수 있음
 * 이 경우 Google favicon API를 통해 프록시 로드
 */
export const LOGO_OVERRIDES = {
  // Google - favicon API 사용 (안정적)
  "notebooklm.google.com": "https://www.google.com/s2/favicons?domain=notebooklm.google.com&sz=128",
  "gemini.google.com": "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=128",
  "bard.google.com": "https://www.google.com/s2/favicons?domain=bard.google.com&sz=128",

  // Anthropic - favicon API 사용 (CORS 회피)
  "claude.ai": "https://www.google.com/s2/favicons?domain=claude.ai&sz=128",
  "anthropic.com": "https://www.google.com/s2/favicons?domain=anthropic.com&sz=128",

  // OpenAI - favicon API 사용
  "openai.com": "https://www.google.com/s2/favicons?domain=openai.com&sz=128",
  "chat.openai.com": "https://www.google.com/s2/favicons?domain=chat.openai.com&sz=128",
  "chatgpt.com": "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128",

  // Perplexity
  "perplexity.ai": "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=128",
  "www.perplexity.ai": "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=128",

  // Microsoft
  "copilot.microsoft.com": "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=128",
  "bing.com": "https://www.google.com/s2/favicons?domain=bing.com&sz=128",

  // Midjourney
  "midjourney.com": "https://www.google.com/s2/favicons?domain=midjourney.com&sz=128",
  "www.midjourney.com": "https://www.google.com/s2/favicons?domain=midjourney.com&sz=128",

  // Stability AI
  "stability.ai": "https://www.google.com/s2/favicons?domain=stability.ai&sz=128",

  // Sora (OpenAI)
  "sora.com": "https://www.google.com/s2/favicons?domain=sora.com&sz=128",

  // Cursor
  "cursor.sh": "https://www.google.com/s2/favicons?domain=cursor.sh&sz=128",
  "cursor.com": "https://www.google.com/s2/favicons?domain=cursor.com&sz=128",

  // Luma AI
  "lumalabs.ai": "https://www.google.com/s2/favicons?domain=lumalabs.ai&sz=128",
  "luma.ai": "https://www.google.com/s2/favicons?domain=luma.ai&sz=128",

  // Meta
  "meta.ai": "https://www.google.com/s2/favicons?domain=meta.ai&sz=128",

  // Hugging Face
  "huggingface.co": "https://www.google.com/s2/favicons?domain=huggingface.co&sz=128",

  // Replicate
  "replicate.com": "https://www.google.com/s2/favicons?domain=replicate.com&sz=128",

  // Runway
  "runwayml.com": "https://www.google.com/s2/favicons?domain=runwayml.com&sz=128",

  // ElevenLabs
  "elevenlabs.io": "https://www.google.com/s2/favicons?domain=elevenlabs.io&sz=128",

  // Notion
  "notion.so": "https://www.google.com/s2/favicons?domain=notion.so&sz=128",
  "notion.com": "https://www.google.com/s2/favicons?domain=notion.com&sz=128",
};