import { useState, memo } from "react";
import { useTheme } from "../../context/ThemeContext";

const LOGO_OVERRIDES = {
  "notebooklm.google.com": "https://www.google.com/s2/favicons?domain=notebooklm.google&sz=64",
};

const getFaviconUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const hostname = new URL(cleanUrl).hostname;
    if (LOGO_OVERRIDES[hostname]) return LOGO_OVERRIDES[hostname];
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  }
  catch { return null; }
};

const getRankColor = (rank, isMono) => {
  if (isMono) return "var(--text-primary)";
  if (rank === 1) return "#f59e0b"; // Gold
  if (rank === 2) return "#94a3b8"; // Silver
  if (rank === 3) return "#c77d3a"; // Bronze
  return "var(--text-muted)"; // Softer color for general ranks
};

const getRankFontSize = (rank) => {
  if (rank <= 10) return "2.0rem";
  if (rank <= 50) return "1.5rem";
  if (rank <= 99) return "1.1rem";
  return "0.85rem";
};

const ToolCard = ({ tool, rank, onClick }) => {
  const { theme } = useTheme();
  if (!tool) return null; // Safety Guard

  const isMono = theme === "mono";
  const [iconError, setIconError] = useState(false);
  const faviconUrl = getFaviconUrl(tool.url);

  const score = Number(tool.score || 0);
  const change = tool.change ?? "-"; 
  const progress = Math.min(Math.max(score, 0), 100);

  const RankBadge = () => {
    const color = getRankColor(rank, isMono);
    const fontSize = getRankFontSize(rank);
    return (
      <span style={{
        fontSize, fontWeight: 800, lineHeight: 1,
        color, fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
        flexShrink: 0,
        opacity: rank > 3 ? 0.8 : 1
      }}>
        {rank}
      </span>
    );
  };

  const inner = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {!iconError && faviconUrl ? (
            <img src={faviconUrl} alt={tool.name || "Tool"} width={36} height={36} loading="lazy"
              style={{ borderRadius: "8px", objectFit: "contain", flexShrink: 0, filter: isMono ? "grayscale(100%) brightness(0.9)" : "none" }}
              onError={() => setIconError(true)} />
          ) : (
            <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{typeof tool.icon === 'string' ? tool.icon : "🤖"}</span>
          )}
          <h3 style={{
            fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontSize: "1.2rem", fontWeight: 700,
            color: "var(--text-primary)", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {tool.name || "Unknown Tool"}
          </h3>
        </div>
        <RankBadge />
      </div>

      <p style={{
        fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.4,
        marginBottom: "8px", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.4rem"
      }}>
        {tool.oneLineReview || tool.desc || "상세 설명이 없습니다."}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.4rem", fontWeight: 900, lineHeight: 1, color: isMono ? "var(--text-primary)" : "var(--accent-indigo)", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif" }}>
            {score.toFixed(1)}
          </span>
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
            {(Array.isArray(tool.tags) ? tool.tags : []).slice(0, 2).map((tag) => (
              <span key={tag} style={{
                fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px",
                background: "var(--bg-secondary)", color: "var(--text-secondary)",
                border: "1px solid var(--border-primary)", fontWeight: 600,
                fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        {change !== "-" && change !== 0 && (
          <span style={{ fontSize: "0.75rem", fontWeight: 800, flexShrink: 0, color: isMono ? "var(--text-muted)" : (String(change).includes("▲") || String(change).includes("+") ? "#22c55e" : "#ef4444"), fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif" }}>
            {change}
          </span>
        )}
      </div>

      <div style={{ height: "4px", borderRadius: "2px", background: "rgba(128,128,128,0.1)", overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", borderRadius: "2px", background: isMono ? "var(--text-primary)" : "var(--accent-indigo)", transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
    </>
  );

  const isTop3 = rank <= 3;

  return (
    <button
      onClick={() => onClick(tool)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(tool);
        }
      }}
      className={isTop3 ? "tool-card top-rank" : "tool-card"}
      style={{
        borderRadius: "16px",
        padding: "0.8rem 1.1rem",
        background: isTop3 ? `var(--rank${rank}-bg)` : "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        boxShadow: isTop3 ? `var(--rank${rank}-shadow)` : "var(--shadow-card)",
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: 0,
        animation: `fadeInUp 0.4s ease forwards`,
        animationDelay: `${Math.min(rank, 20) * 0.04}s`,
        textAlign: "left",
        width: "100%",
      }}
    >
      {inner}
    </button>
  );
};

export default memo(ToolCard);
