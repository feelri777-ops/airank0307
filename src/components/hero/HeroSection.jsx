import { useTheme } from "../../context/ThemeContext";

const HeroSection = ({ searchQuery, onSearchChange, onOpenWizard }) => {
  const { theme } = useTheme();
  const hasImage = theme !== "pure" && theme !== "light";

  return (
  <section className="hero-section-wrap" style={{
    textAlign: "center",
    padding: "2rem 2rem 2.5rem",
    position: "relative",
    zIndex: 5,
    backgroundImage: hasImage
      ? "linear-gradient(to bottom, rgba(10, 10, 15, 0.65), rgba(10, 10, 15, 0.82)), url('/images/hero-vending.png')"
      : "none",
    backgroundColor: hasImage ? "transparent" : "var(--bg-secondary)",
    backgroundSize: "cover",
    backgroundPosition: "center",
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
          background-size: auto 100% !important;
        }
      }
    `}</style>

    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* 메인 타이틀 */}
      <h1 style={{
        fontFamily: "'Outfit', 'Pretendard', sans-serif",
        fontSize: "clamp(1.6rem, 4vw, 3rem)",
        fontWeight: 900,
        lineHeight: 1.15,
        letterSpacing: "-0.04em",
        marginBottom: "0.7rem",
        color: "#fff",
        textShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}>
        당신에게 가장 필요한<br />
        <span style={{
          background: "linear-gradient(to right, #818cf8, #38bdf8)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          display: "inline-block",
        }}>
          실시간 AI 추출기
        </span>
      </h1>

      {/* 서브 텍스트 */}
      <p style={{
        color: "rgba(255,255,255,0.75)",
        fontSize: "clamp(0.82rem, 1.3vw, 0.98rem)",
        lineHeight: 1.6,
        margin: "0 auto 1.6rem",
        maxWidth: "480px",
        fontWeight: 400,
        textShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}>
        전 세계 검색 데이터를 실시간 수집 —<br />
        지금 가장 주목받는 AI를 큐레이션합니다.
      </p>

      {/* 검색바 + 마법사 버튼 */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{
            position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
            display: "flex", alignItems: "center", pointerEvents: "none", opacity: 0.6,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="#fff" viewBox="0 0 256 256">
              <path d="M229.66,218.34l-50.07-50.07a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.31ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="어떤 기능의 AI를 찾으시나요?"
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: "100px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              color: "#fff",
              fontFamily: "'Pretendard', sans-serif",
              fontSize: "0.88rem",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.5)"; e.target.style.background = "rgba(255,255,255,0.18)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; e.target.style.background = "rgba(255,255,255,0.1)"; }}
          />
        </div>
        <button
          onClick={onOpenWizard}
          style={{
            padding: "10px 16px",
            borderRadius: "100px",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            color: "#fff",
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
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="#fff" viewBox="0 0 256 256">
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
