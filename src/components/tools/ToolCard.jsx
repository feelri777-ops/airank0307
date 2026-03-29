import { useState, memo } from "react";
import PropTypes from "prop-types";
import { useTheme } from "../../context/ThemeContext";
import { LOGO_OVERRIDES, getRankColor, getRankFontSize } from "../../constants/toolCard";
import { translateTag } from "../../constants/index";

import { CaretUp, CaretDown, Minus } from "../icons/PhosphorIcons";

const getFaviconUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const hostname = new URL(cleanUrl).hostname;
    // LOGO_OVERRIDES에 있으면 우선 사용
    if (LOGO_OVERRIDES[hostname]) return LOGO_OVERRIDES[hostname];
    // 없으면 Google favicon API 사용 (더 큰 사이즈)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  }
  catch { return null; }
};

const getScoreColor = (score) => {
  if (score >= 85) return "var(--accent-indigo)";
  return "var(--text-secondary)";
};

const ToolCard = ({ tool, rank, onClick }) => {
  const { theme } = useTheme();
  if (!tool) return null; // Safety Guard

  const isMono = theme === "mono";
  const [iconError, setIconError] = useState(false);
  const faviconUrl = getFaviconUrl(tool.url);

  const score = Number(tool.score || 0);
  const change = tool.change ?? "-";
  const isTop3 = rank <= 3;

  const RankBadge = () => {
    const color = getRankColor(rank, isMono);
    const fontSize = getRankFontSize(rank);
    
    // 변화량 타입 분석
    const changeVal = parseInt(change);
    const isUp = !isNaN(changeVal) && changeVal > 0;
    const isDown = !isNaN(changeVal) && changeVal < 0;
    const isStable = changeVal === 0 || change === "-" || change === "0";

    return (
      <div style={{
        position: "absolute", top: "12px", right: "12px",
        display: "flex", alignItems: "center", gap: "6px",
        lineHeight: 1
      }}>
        {/* 변화량 인디케이터 (Option 2: Floating Icon) */}
        <div style={{
          display: "flex", alignItems: "center", gap: "1px",
          color: isMono ? "var(--text-muted)" : (isUp ? "#22c55e" : isDown ? "#ef4444" : "var(--text-muted)"),
          marginTop: "8px"
        }}>
          {isUp && <CaretUp size={12} weight="bold" />}
          {isDown && <CaretDown size={12} weight="bold" />}
          {isStable && <Minus size={10} weight="bold" />}
          
          <span style={{
            fontSize: "0.75rem", fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            marginLeft: isStable ? "1px" : "0px"
          }}>
            {isStable ? "" : Math.abs(changeVal)}
          </span>
        </div>

        <span style={{
          fontSize, fontWeight: 950, lineHeight: 1,
          color, fontFamily: "'Outfit', 'IBM Plex Sans KR', 'Pretendard', sans-serif",
          flexShrink: 0,
          opacity: 0.9,
          letterSpacing: "-0.05em"
        }}>
          {rank}
        </span>
      </div>
    );
  };

  const inner = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, paddingRight: "60px" }}>
          {!iconError && faviconUrl ? (
            <img src={faviconUrl} alt={tool.name || "Tool"} width={42} height={42} loading="lazy"
              style={{ borderRadius: "10px", objectFit: "contain", flexShrink: 0, filter: isMono ? "grayscale(100%) brightness(0.9)" : "none" }}
              onError={() => setIconError(true)} />
          ) : (
            <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{typeof tool.icon === 'string' ? tool.icon : "🤖"}</span>
          )}
          <h3 style={{
            fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontSize: "1.25rem", fontWeight: 900,
            color: "var(--text-primary)", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "-0.02em"
          }}>
            {tool.name || "Unknown Tool"}
          </h3>
        </div>
        <RankBadge />
      </div>

      <p style={{
        fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.5,
        marginBottom: "12px", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.8rem",
        fontWeight: 500
      }}>
        {tool.oneLineReview || tool.desc || "상세 설명이 없습니다."}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.45rem", fontWeight: 950, lineHeight: 1, color: isMono ? "var(--text-primary)" : getScoreColor(score), fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif" }}>
            {score.toFixed(1)}
          </span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(Array.isArray(tool.tags) ? tool.tags : []).slice(0, 3).map((tag, idx) => {
              const isFirst = idx === 0;
              return (
                <span key={tag} style={{
                  fontSize: "0.78rem", padding: "2px 10px", borderRadius: "10px",
                  background: isFirst ? "var(--accent-indigo)" : "var(--bg-secondary)", 
                  color: isFirst ? "#fff" : "var(--text-secondary)",
                  border: isFirst ? "none" : "1px solid var(--border-primary)", 
                  fontWeight: 800,
                  fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
                }}>
                  {translateTag(tag)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <button
      onClick={() => onClick(tool)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(tool);
        }
      }}
      className="tool-card"
      style={{
        borderRadius: "16px",
        padding: "0.8rem 1.1rem",
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-card)",
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

ToolCard.propTypes = {
  tool: PropTypes.shape({
    id: PropTypes.string,
    _docId: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    tags: PropTypes.arrayOf(PropTypes.string),
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    oneLineReview: PropTypes.string,
    desc: PropTypes.string,
  }).isRequired,
  rank: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default memo(ToolCard);
