const PLATFORMS = [
  { label: "Naver", domain: "naver.com" },
  { label: "Google", domain: "google.com" },
  { label: "X", domain: "x.com" },
  { label: "GitHub", domain: "github.com" },
];

const HeroSection = ({ searchQuery, onSearchChange, onOpenWizard }) => (
  <section className="hero-section-wrap" style={{
    textAlign: "center",
    padding: "3.5rem 2rem 3rem",
    position: "relative",
    zIndex: 5,
    backgroundImage: "linear-gradient(to bottom, rgba(10, 10, 15, 0.7), rgba(10, 10, 15, 0.85)), url('/images/hero-vending.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}>
    <style>{`
      @media (min-width: 1101px) {
        .hero-section-wrap {
          background-size: 150% auto !important;
        }
      }
      @media (max-width: 1100px) {
        .hero-section-wrap {
          padding: 2.5rem 1rem 2rem !important;
        }
      }
      @media (max-width: 600px) {
        .hero-section-wrap { 
          padding: 2rem 1rem 1.5rem !important;
          background-position: center top;
        }
      }
      @keyframes pulse-dot {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
    <div className="hero-content" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* 배지 */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "0.75rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--accent-cyan)",
        fontWeight: 700,
        marginBottom: "1.5rem",
        background: "rgba(34, 211, 238, 0.1)",
        padding: "5px 15px",
        borderRadius: "20px",
        border: "1px solid rgba(34, 211, 238, 0.2)"
      }}>
        REAL-TIME AI INSIGHT
      </div>

      {/* 메인 타이틀 */}
      <h1 style={{
        fontFamily: "'Outfit', 'Pretendard', sans-serif",
        fontSize: "clamp(1.8rem, 5vw, 3.5rem)",
        fontWeight: 900,
        lineHeight: 1.1,
        letterSpacing: "-0.04em",
        marginBottom: "1.2rem",
        color: "#fff",
        textShadow: "0 4px 12px rgba(0,0,0,0.5)"
      }}>
        당신에게 가장 필요한<br />
        <span style={{
          background: "linear-gradient(to right, #4f46e5, #0ea5e9)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          display: "inline-block",
        }}>
          실시간 AI 추출기
        </span>
      </h1>

      {/* 서브 텍스트 */}
      <p style={{
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)",
        lineHeight: 1.6,
        marginBottom: "2rem",
        maxWidth: "540px",
        margin: "0 auto 2.5rem",
        fontWeight: 500,
        textShadow: "0 2px 4px rgba(0,0,0,0.3)"
      }}>
        전 세계의 검색 데이터를 실시간으로 수집하여<br />
        지금 이 순간 가장 주목받는 AI를 큐레이션합니다.
      </p>

      {/* 갱신 배지 */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        borderRadius: "12px",
        fontSize: "0.75rem",
        color: "#fff",
        marginBottom: "2rem",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <span style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 10px #22c55e",
          display: "inline-block",
          animation: "pulse-dot 2s ease-in-out infinite",
        }} />
        매일 AM 03:00 엔진 자동 갱신 중
      </div>

      {/* 검색 바 + 마법사 버튼 */}
      <div style={{
        display: "flex",
        flexDirection: window.innerWidth < 640 ? "column" : "row",
        gap: "12px",
        maxWidth: "600px",
        margin: "0 auto",
        alignItems: "center",
      }}>
        <div style={{ flex: 1, position: "relative", width: "100%" }}>
          <span style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "1.2rem",
            opacity: 0.7,
          }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="어떤 기능의 AI를 찾으시나요?"
            style={{
              width: "100%",
              padding: "16px 20px 16px 50px",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
              color: "#fff",
              fontFamily: "'Pretendard', sans-serif",
              fontSize: "1rem",
              outline: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent-indigo)";
              e.target.style.background = "rgba(0,0,0,0.7)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.2)";
              e.target.style.background = "rgba(0,0,0,0.5)";
            }}
          />
        </div>
        <button
          onClick={onOpenWizard}
          style={{
            width: window.innerWidth < 640 ? "100%" : "auto",
            padding: "16px 24px",
            borderRadius: "16px",
            border: "none",
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            color: "#fff",
            fontFamily: "'Pretendard', sans-serif",
            fontSize: "0.95rem",
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 15px 35px rgba(99, 102, 241, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(99, 102, 241, 0.4)";
          }}
        >
          ✨ AI 추천 마법사
        </button>
      </div>
    </div>
  </section>
);

export default HeroSection;
