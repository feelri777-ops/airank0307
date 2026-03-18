import { useTheme } from "../../context/ThemeContext";
import HeroLogos from "./HeroLogos";

const THEME_CONFIG = {
  dark: {
    bg: "linear-gradient(to bottom, rgba(10, 10, 15, 0.65), rgba(10, 10, 15, 0.82)), url('/images/hero-vending.png')",
    bgColor: "transparent",
    bgSize: "cover",
    bgPos: "center",
    titleColor: "#fff",
    titleShadow: "0 4px 12px rgba(0,0,0,0.5)",
    gradientText: "linear-gradient(to right, #818cf8, #38bdf8)",
    subColor: "rgba(255,255,255,0.75)",
    subShadow: "0 2px 4px rgba(0,0,0,0.3)",
    inputBg: "rgba(255,255,255,0.1)",
    inputBorder: "rgba(255,255,255,0.2)",
    inputBorderFocus: "rgba(255,255,255,0.5)",
    inputBgFocus: "rgba(255,255,255,0.18)",
    inputColor: "#fff",
    iconColor: "#fff",
    btnBg: "rgba(255,255,255,0.15)",
    btnBgHover: "rgba(255,255,255,0.25)",
    btnBorder: "rgba(255,255,255,0.25)",
    btnColor: "#fff",
    placeholderStyle: `color: rgba(255,255,255,0.5)`,
  },
  mono: {
    bg: "linear-gradient(to bottom, rgba(10, 10, 15, 0.65), rgba(10, 10, 15, 0.82)), url('/images/hero-vending.png')",
    bgColor: "transparent",
    bgSize: "cover",
    bgPos: "center",
    titleColor: "#fff",
    titleShadow: "0 4px 12px rgba(0,0,0,0.5)",
    gradientText: "linear-gradient(to right, #a0a0a0, #e0e0e0)",
    subColor: "rgba(255,255,255,0.75)",
    subShadow: "0 2px 4px rgba(0,0,0,0.3)",
    inputBg: "rgba(255,255,255,0.1)",
    inputBorder: "rgba(255,255,255,0.2)",
    inputBorderFocus: "rgba(255,255,255,0.5)",
    inputBgFocus: "rgba(255,255,255,0.18)",
    inputColor: "#fff",
    iconColor: "#fff",
    btnBg: "rgba(255,255,255,0.15)",
    btnBgHover: "rgba(255,255,255,0.25)",
    btnBorder: "rgba(255,255,255,0.25)",
    btnColor: "#fff",
    placeholderStyle: `color: rgba(255,255,255,0.5)`,
  },
  light: {
    bg: "linear-gradient(160deg, #FFFAFA 0%, #FFF5F5 40%, #FFFAFA 75%, #FFF8F8 100%)",
    bgColor: "transparent",
    bgSize: "cover",
    bgPos: "center",
    titleColor: "#1A1A2E",
    titleShadow: "none",
    gradientText: "linear-gradient(to right, #6366f1, #8b5cf6)",
    subColor: "rgba(50,50,80,0.6)",
    subShadow: "none",
    inputBg: "rgba(255,255,255,0.85)",
    inputBorder: "rgba(99,102,241,0.18)",
    inputBorderFocus: "rgba(99,102,241,0.45)",
    inputBgFocus: "#ffffff",
    inputColor: "#1A1A2E",
    iconColor: "#6366f1",
    btnBg: "linear-gradient(135deg, #c0505c, #c050a0)",
    btnBgHover: "linear-gradient(135deg, #a83040, #a03090)",
    btnBorder: "transparent",
    btnColor: "#fff",
    placeholderStyle: `color: rgba(82,82,110,0.45)`,
  },
  pure: {
    bg: "linear-gradient(135deg, #f8faff 0%, #f0f4ff 30%, #faf0ff 70%, #f8f8ff 100%)",
    bgColor: "transparent",
    bgSize: "cover",
    bgPos: "center",
    titleColor: "#111827",
    titleShadow: "none",
    gradientText: "linear-gradient(to right, #6366f1, #06b6d4)",
    subColor: "rgba(50,50,80,0.6)",
    subShadow: "none",
    inputBg: "rgba(255,255,255,0.9)",
    inputBorder: "rgba(99,102,241,0.2)",
    inputBorderFocus: "rgba(99,102,241,0.5)",
    inputBgFocus: "#fff",
    inputColor: "#111827",
    iconColor: "#6366f1",
    btnBg: "linear-gradient(135deg, #6366f1, #06b6d4)",
    btnBgHover: "linear-gradient(135deg, #5254e0, #05a5bd)",
    btnBorder: "transparent",
    btnColor: "#fff",
    placeholderStyle: `color: rgba(80,80,120,0.45)`,
  },
};

const HeroSection = ({ searchQuery, onSearchChange, onOpenWizard }) => {
  const { theme } = useTheme();
  const cfg = THEME_CONFIG[theme] || THEME_CONFIG.dark;
  const isDark = theme === "dark" || theme === "mono";

  return (
  <section className="hero-section-wrap" style={{
    textAlign: "center",
    padding: "2rem 2rem 2.5rem",
    position: "relative",
    zIndex: 5,
    overflow: "hidden",
    backgroundImage: cfg.bg,
    backgroundColor: cfg.bgColor,
    backgroundSize: cfg.bgSize,
    backgroundPosition: cfg.bgPos,
    backgroundRepeat: "no-repeat",
  }}>
    <style>{`
      @media (min-width: 1101px) {
        .hero-section-wrap { background-size: cover !important; }
      }
      @media (max-width: 1100px) {
        .hero-section-wrap { padding: 1.5rem 1rem 2rem !important; }
      }
      @media (max-width: 600px) {
        .hero-section-wrap {
          padding: 1.2rem 1rem 1.8rem !important;
          background-position: center center !important;
          background-size: ${isDark ? "auto 100%" : "cover"} !important;
        }
      }
      .hero-search-input::placeholder { ${cfg.placeholderStyle}; }
    `}</style>

    {/* 라이트/퓨어 테마용 로고 */}
    {!isDark && <HeroLogos />}

    <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
      {/* 메인 타이틀 */}
      <h1 style={{
        fontFamily: "'Outfit', 'Pretendard', sans-serif",
        fontSize: "clamp(1.6rem, 4vw, 3rem)",
        fontWeight: 900,
        lineHeight: 1.15,
        letterSpacing: "-0.04em",
        marginBottom: "0.7rem",
        ...(!isDark ? {
          // 볼록 유리: 상단 중앙이 밝고 가장자리로 굴절색
          backgroundImage: [
            "radial-gradient(ellipse 80% 60% at 48% 25%,",
            "  rgba(255,255,255,1) 0%,",
            "  rgba(235,245,255,0.95) 18%,",
            "  rgba(190,215,255,0.82) 38%,",
            "  rgba(155,185,245,0.72) 58%,",
            "  rgba(120,160,230,0.65) 80%,",
            "  rgba(100,140,220,0.6) 100%",
            ")",
          ].join(""),
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: [
            "drop-shadow(0 -1px 0px rgba(255,255,255,1))",      // 상단 하이라이트
            "drop-shadow(0  1px 0px rgba(255,255,255,0.7))",    // 하단 내부 반사
            "drop-shadow(0  6px 14px rgba(90,130,255,0.35))",   // 코스틱(굴절 그림자)
            "drop-shadow(0  2px  3px rgba(60,100,200,0.2))",    // 렌즈 깊이감
          ].join(" "),
        } : {
          color: cfg.titleColor,
          textShadow: cfg.titleShadow,
        }),
      }}>
        당신에게 가장 필요한<br />
        <span style={{
          display: "inline-block",
          ...(!isDark ? {
            // 볼록 유리 — 컬러 굴절 버전
            backgroundImage: [
              "radial-gradient(ellipse 85% 55% at 45% 20%,",
              "  rgba(255,255,255,0.98) 0%,",
              "  rgba(210,220,255,0.92) 15%,",
              "  rgba(160,185,255,0.82) 35%,",
              "  rgba(120,155,245,0.75) 55%,",
              "  rgba(90,130,230,0.7)  75%,",
              "  rgba(140,100,220,0.65) 100%",
              ")",
            ].join(""),
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: [
              "drop-shadow(0 -1px 0px rgba(255,255,255,1))",
              "drop-shadow(0  1px 1px rgba(200,210,255,0.6))",
              "drop-shadow(0  7px 18px rgba(80,110,255,0.4))",
              "drop-shadow(0  2px  4px rgba(100,80,220,0.25))",
            ].join(" "),
          } : {
            backgroundImage: cfg.gradientText,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }),
        }}>
          실시간 AI 추출기
        </span>
      </h1>

      {/* 서브 텍스트 */}
      <p style={{
        color: cfg.subColor,
        fontSize: "clamp(0.82rem, 1.3vw, 0.98rem)",
        lineHeight: 1.6,
        margin: "0 auto 1.6rem",
        maxWidth: "480px",
        fontWeight: 400,
        textShadow: cfg.subShadow,
      }}>
        전 세계 검색 데이터를 실시간 수집 —<br />
        지금 가장 주목받는 AI를 큐레이션합니다.
      </p>

      {/* 검색바 + 마법사 버튼 */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{
            position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
            display: "flex", alignItems: "center", pointerEvents: "none", opacity: isDark ? 0.6 : 0.7,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill={cfg.iconColor} viewBox="0 0 256 256">
              <path d="M229.66,218.34l-50.07-50.07a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.31ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
            </svg>
          </span>
          <input
            type="text"
            className="hero-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="어떤 기능의 AI를 찾으시나요?"
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: "100px",
              border: `1px solid ${cfg.inputBorder}`,
              background: cfg.inputBg,
              backdropFilter: isDark ? "blur(10px)" : "blur(8px)",
              color: cfg.inputColor,
              fontFamily: "'Pretendard', sans-serif",
              fontSize: "0.88rem",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s",
              boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.06)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = cfg.inputBorderFocus;
              e.target.style.background = cfg.inputBgFocus;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = cfg.inputBorder;
              e.target.style.background = cfg.inputBg;
            }}
          />
        </div>
        <button
          onClick={onOpenWizard}
          style={{
            padding: "10px 16px",
            borderRadius: "100px",
            border: `1px solid ${cfg.btnBorder}`,
            background: cfg.btnBg,
            backdropFilter: isDark ? "blur(10px)" : "none",
            color: cfg.btnColor,
            fontFamily: "'Pretendard', sans-serif",
            fontSize: "0.84rem",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
            transition: "all 0.2s",
            boxShadow: isDark ? "none" : "0 2px 12px rgba(99,102,241,0.25)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = cfg.btnBgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = cfg.btnBg; }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill={cfg.btnColor} viewBox="0 0 256 256">
            <path d="M208,144a16,16,0,1,1-16-16A16,16,0,0,1,208,144ZM64,80A16,16,0,1,0,80,96,16,16,0,0,0,64,80Zm49.54,90.91a48,48,0,0,1-33.08-80.36,8,8,0,0,0-11-11.64,64,64,0,0,0,44.1,107.07,8,8,0,1,0,.27-16.07Zm78.3-95.73a8,8,0,0,0-11,11.64,48,48,0,0,1-33.08,80.36A8,8,0,1,0,148,183.15a64,64,0,0,0,44.1-107.07ZM152,48a8,8,0,0,0-8,8v16a8,8,0,0,0,16,0V56A8,8,0,0,0,152,48ZM56,152H40a8,8,0,0,0,0,16H56a8,8,0,0,0,0-16Zm160,0H200a8,8,0,0,0,0,16h16a8,8,0,0,0,0-16Z"/>
          </svg>
          AI 추천 마법사
        </button>
      </div>
    </div>
  </section>
  );
};

export default HeroSection;
