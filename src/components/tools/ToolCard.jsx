import { useState } from "react";

const LOGO_OVERRIDES = {
  "notebooklm.google.com": "https://www.google.com/s2/favicons?domain=notebooklm.google&sz=64",
};

const getFaviconUrl = (url) => {
  try {
    const hostname = new URL(url).hostname;
    if (LOGO_OVERRIDES[hostname]) return LOGO_OVERRIDES[hostname];
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  }
  catch { return null; }
};

// 정적 그라디언트 테두리 색상
const BORDER_GRADIENT = {
  1: "linear-gradient(135deg, #fde68a, #f59e0b, #d97706, #f59e0b, #fde68a)",
  2: "linear-gradient(135deg, #e2e8f0, #94a3b8, #64748b, #94a3b8, #e2e8f0)",
  3: "linear-gradient(135deg, #e2e8f0, #94a3b8, #64748b, #94a3b8, #e2e8f0)",
};
// 발광 펄스 애니메이션 이름
const GLOW_ANIM = {
  1: "glowPulseGold",
  2: "glowPulseSilver",
  3: "glowPulseSilver",
};
// 순위별 색상
const getRankColor = (rank) => {
  if (rank === 1) return "#f59e0b";
  if (rank === 2) return "#94a3b8";
  if (rank === 3) return "#c77d3a";
  if (rank <= 10) return "#6366f1";
  if (rank <= 50) return "#10b981";
  return "var(--text-muted)";
};

// 순위별 폰트 크기
const getRankFontSize = (rank) => {
  if (rank <= 10) return "2.8rem";
  if (rank <= 50) return "2.1rem";
  if (rank <= 99) return "1.6rem";
  return "1.2rem";
};

// 1~3위 반짝 애니메이션
const getRankAnim = (rank) => {
  if (rank === 1) return "rankSparkGold 1.8s ease-in-out infinite";
  if (rank === 2) return "rankSparkSilver 2.1s ease-in-out infinite";
  if (rank === 3) return "rankSparkBronze 2.4s ease-in-out infinite";
  return "none";
};

const ToolCard = ({ tool, rank, onClick }) => {
  const [iconError, setIconError] = useState(false);
  const faviconUrl = getFaviconUrl(tool.url);

  const score = tool.score ?? 0;
  const change = tool.change ?? 0;
  const progress = Math.min(score, 100);

  const RankBadge = () => {
    const color = getRankColor(rank);
    const fontSize = getRankFontSize(rank);
    const animation = getRankAnim(rank);
    return (
      <span style={{
        fontSize, fontWeight: 900, lineHeight: 1,
        color, fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
        flexShrink: 0,
        animation,
      }}>
        {rank}
      </span>
    );
  };

  const inner = (
    <>
      {/* 상단: 로고 + 이름 + 순위 배지 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {!iconError && faviconUrl ? (
            <img src={faviconUrl} alt={tool.name} width={36} height={36}
              style={{ borderRadius: "8px", objectFit: "contain", flexShrink: 0 }}
              onError={() => setIconError(true)} />
          ) : (
            <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{tool.icon}</span>
          )}
          <h3 style={{
            fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontSize: "1.4rem", fontWeight: 700,
            color: "var(--text-primary)", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {tool.name}
          </h3>
        </div>
        <RankBadge />
      </div>

      {/* 설명 — 2줄 */}
      <p style={{
        fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5,
        marginBottom: "8px", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {tool.desc}
      </p>

      {/* 점수 + 태그 + 변화율 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1, color: "#0ea5e9", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif" }}>
            {score}
          </span>
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
            {tool.tags.filter(t => t !== "무료" && t !== "유료").map((tag) => (
              <span key={tag} style={{
                fontSize: "0.81rem", padding: "3px 9px", borderRadius: "7px",
                background: "var(--tag-bg)", color: "var(--tag-color)",
                border: "1px solid var(--tag-border)", fontWeight: 500,
                fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        {change !== 0 && (
          <span style={{ fontSize: "0.68rem", fontWeight: 700, flexShrink: 0, color: change > 0 ? "#4ade80" : "#f87171", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif" }}>
            {change > 0 ? `▲ ${change}%` : `▼ ${Math.abs(change)}%`}
          </span>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div style={{ height: "3px", borderRadius: "2px", background: "rgba(128,128,128,0.15)", overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", borderRadius: "2px", background: "linear-gradient(90deg, #22c55e, #4ade80)", transition: "width 0.6s ease" }} />
      </div>
    </>
  );

  const isTop3 = rank <= 3;

  if (!isTop3) {
    return (
      <div onClick={onClick} style={{
        borderRadius: "16px",
        animation: `fadeInUp 0.4s ease forwards`,
        animationDelay: `${Math.min(rank, 20) * 0.04}s`,
        opacity: 0,
        cursor: "pointer",
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        padding: "1rem 1.1rem",
        boxShadow: "var(--shadow-card)",
      }}>
        {inner}
      </div>
    );
  }

  const RANK_BG = { 1: "var(--rank1-bg)", 2: "var(--rank2-bg)", 3: "var(--rank3-bg)" };
  const RANK_SHADOW = { 1: "var(--rank1-shadow)", 2: "var(--rank2-shadow)", 3: "var(--rank3-shadow)" };
  const delay = `${Math.min(rank, 20) * 0.04}s`;
  
  return (
    <div 
      onClick={onClick} 
      className="rank-card-glow"
      style={{
        borderRadius: "16px",
        padding: "1rem 1.1rem",
        background: RANK_BG[rank] || "var(--bg-card)",
        border: `1px solid var(--border-primary)`,
        boxShadow: RANK_SHADOW[rank] || "var(--shadow-md)",
        opacity: 0,
        animation: `fadeInUp 0.4s ease forwards`,
        animationDelay: delay,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {inner}
    </div>
  );
};

export default ToolCard;
