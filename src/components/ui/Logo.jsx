import React from "react";

const Logo = ({ onClick }) => {
  const handleClick = () => {
    if (onClick) { onClick(); return; }
    if (window.location.pathname === "/") {
      window.location.reload();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div onClick={handleClick} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
      {/* AI 텍스트 + 2진법 패턴 */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 900,
          fontSize: "1.6rem",
          letterSpacing: "-0.03em",
          background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          position: "relative",
        }}>
          AI
          {/* 2진법 패턴 오버레이 (디자인 매칭) */}
          <span style={{
            position: "absolute",
            top: "2px",
            left: "0",
            fontSize: "0.38rem",
            fontFamily: "monospace",
            fontWeight: 400,
            opacity: 0.3,
            lineHeight: 1,
            WebkitTextFillColor: "#6366f1",
            color: "#6366f1",
            pointerEvents: "none",
            letterSpacing: "0.02em",
          }}>
            01101<br/>10010
          </span>
        </span>
      </div>

      {/* 머씀? 텍스트 */}
      <span style={{
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 700,
        fontSize: "1.45rem",
        color: "var(--text-primary)",
        letterSpacing: "-0.02em",
      }}>
        머씀?
      </span>

      {/* 시상대 아이콘 (디자인 매칭) */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "1.5px",
        marginLeft: "4px",
        height: "24px",
      }}>
        {/* 2위 - 은색 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "0.6rem", marginBottom: "-1px" }}>🥈</span>
          <div style={{ width: "10px", height: "12px", background: "linear-gradient(to bottom, #cbd5e1, #94a3b8)", borderRadius: "2px 2px 0 0" }} />
        </div>
        {/* 1위 - 금색 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "0.6rem", marginBottom: "-1px" }}>🥇</span>
          <div style={{ width: "10px", height: "18px", background: "linear-gradient(to bottom, #fbbf24, #f59e0b)", borderRadius: "2px 2px 0 0" }} />
        </div>
        {/* 3위 - 동색 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "0.6rem", marginBottom: "-1px" }}>🥉</span>
          <div style={{ width: "10px", height: "8px", background: "linear-gradient(to bottom, #fb923c, #d97706)", borderRadius: "2px 2px 0 0" }} />
        </div>
      </div>
    </div>
  );
};

export default Logo;
