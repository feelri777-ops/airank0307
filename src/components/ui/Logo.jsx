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
    <div onClick={handleClick} style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
      <span style={{
        fontFamily: "'Outfit', 'Pretendard', -apple-system, sans-serif",
        fontSize: "1.5rem",
        fontWeight: 800,
        letterSpacing: "-0.01em",
        background: "var(--accent-gradient)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        lineHeight: 1,
      }}>AIRANK</span>
      <span style={{
        fontFamily: "'Outfit', 'Pretendard', -apple-system, sans-serif",
        fontSize: "1.5rem",
        fontWeight: 800,
        letterSpacing: "-0.01em",
        color: "var(--accent-indigo)",
        opacity: 0.5,
        lineHeight: 1,
      }}>.KR</span>
    </div>
  );
};

export default Logo;
