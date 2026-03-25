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
 * Google favicon API가 정확하지 않은 경우 사용
 */
export const LOGO_OVERRIDES = {
  // Google
  "notebooklm.google.com": "https://www.gstatic.com/lamda/images/favicon_v1_150160cddff7f294ce30.svg",
  "gemini.google.com": "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",

  // Anthropic
  "claude.ai": "https://claude.ai/images/claude_app_icon.png",
  "anthropic.com": "https://claude.ai/images/claude_app_icon.png",

  // OpenAI
  "openai.com": "https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png",
  "chat.openai.com": "https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png",
  "chatgpt.com": "https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png",

  // Perplexity
  "perplexity.ai": "https://www.perplexity.ai/favicon.svg",

  // Microsoft
  "copilot.microsoft.com": "https://copilot.microsoft.com/favicon.ico",
  "bing.com": "https://www.bing.com/sa/simg/favicon-trans-bg-blue-mg.ico",

  // Midjourney
  "midjourney.com": "https://cdn.midjourney.com/favicon.ico",
  "www.midjourney.com": "https://cdn.midjourney.com/favicon.ico",

  // Stability AI
  "stability.ai": "https://stability.ai/favicon.ico",

  // Meta
  "meta.ai": "https://static.xx.fbcdn.net/rsrc.php/yb/r/hLRJ1GG_y0J.ico",

  // Hugging Face
  "huggingface.co": "https://huggingface.co/front/assets/huggingface_logo.svg",

  // Replicate
  "replicate.com": "https://replicate.com/favicon.ico",

  // Runway
  "runwayml.com": "https://runwayml.com/favicon.ico",

  // ElevenLabs
  "elevenlabs.io": "https://elevenlabs.io/favicon.ico",

  // Notion
  "notion.so": "https://www.notion.so/images/favicon.ico",
  "notion.com": "https://www.notion.so/images/favicon.ico",
};