const Logo = () => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
      {/* AI 텍스트 + 2진법 패턴 */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 900,
          fontSize: "1.6rem",
          letterSpacing: "-0.03em",
          background: "var(--accent-gradient)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          position: "relative",
        }}>
          AI
          {/* 2진법 패턴 오버레이 */}
          <span style={{
            position: "absolute",
            top: "2px",
            left: "0",
            fontSize: "0.35rem",
            fontFamily: "monospace",
            fontWeight: 400,
            opacity: 0.25,
            lineHeight: 1,
            WebkitTextFillColor: "var(--accent-indigo)",
            color: "var(--accent-indigo)",
            pointerEvents: "none",
            letterSpacing: "0.05em",
          }}>
            01101<br/>10010
          </span>
        </span>
      </div>

      {/* 머씀? 텍스트 */}
      <span style={{
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 700,
        fontSize: "1.4rem",
        color: "var(--text-primary)",
        letterSpacing: "-0.02em",
      }}>
        머씀?
      </span>

      {/* 시상대 아이콘 - 2위(은)/1위(금)/3위(동) */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "1px",
        marginLeft: "4px",
        fontSize: "0.65rem",
        lineHeight: 1,
      }}>
        {/* 2위 - 은색 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span>🥈</span>
          <div style={{ width: "10px", height: "14px", background: "#94a3b8", borderRadius: "2px 2px 0 0" }} />
        </div>
        {/* 1위 - 금색 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span>🥇</span>
          <div style={{ width: "10px", height: "20px", background: "#f59e0b", borderRadius: "2px 2px 0 0" }} />
        </div>
        {/* 3위 - 동색 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span>🥉</span>
          <div style={{ width: "10px", height: "10px", background: "#d97706", borderRadius: "2px 2px 0 0" }} />
        </div>
      </div>
    </div>
  );
};

export default Logo;
