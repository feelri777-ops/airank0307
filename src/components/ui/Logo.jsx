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
      {/* Google Fonts - VT323 (픽셀 스타일) 적용 */}
      <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet" />
      
      <div style={{
        fontFamily: "'VT323', monospace",
        fontSize: "2.4rem",
        fontWeight: 400,
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        // 기존 그림자 등 단순화하고 제공하신 이미지의 '픽셀' 느낌 강조
        textShadow: "2px 2px 0px rgba(0,0,0,0.15)",
        lineHeight: 1,
      }}>
        {/* 'A','I' - 청록/파랑 계열 픽셀 패턴 느낌 */}
        <span style={{
          background: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>AI</span>
        
        {/* 'R','A' - 오렌지/노랑/파랑 계열 픽셀 패턴 느낌 */}
        <span style={{
          background: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginLeft: "-1px"
        }}>RA</span>

        {/* 'N','K' - 진청/틸/노랑 계열 픽셀 패턴 느낌 */}
        <span style={{
          background: "linear-gradient(135deg, #004e92 0%, #000428 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginLeft: "-1px"
        }}>NK</span>

        {/* '.KR' - 빨강/진청 계열 픽셀 패턴 느낌 */}
        <span style={{
          background: "linear-gradient(135deg, #e52d27 0%, #b31217 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginLeft: "-1px"
        }}>.KR</span>
      </div>
    </div>
  );
};

export default Logo;
