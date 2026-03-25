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

export const LOGO_OVERRIDES = {
  "notebooklm.google.com": "https://www.google.com/s2/favicons?domain=notebooklm.google&sz=64",
};