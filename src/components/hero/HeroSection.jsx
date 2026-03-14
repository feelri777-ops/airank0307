const PLATFORMS = [
  { label: "Naver",  domain: "naver.com" },
  { label: "Google", domain: "google.com" },
  { label: "X",      domain: "x.com" },
  { label: "GitHub", domain: "github.com" },
];

const HeroSection = ({ searchQuery, onSearchChange, onOpenWizard }) => (
  <section style={{
    textAlign: "center",
    padding: "2rem 2rem 1.5rem",
    position: "relative",
    zIndex: 5,
  }}>
    {/* 배지 */}
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "0.7rem",
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: "var(--accent-indigo)",
      fontWeight: 600,
      marginBottom: "1.2rem",
    }}>
      <span style={{ height: "1px", width: "24px", background: "var(--accent-indigo)", opacity: 0.4, display: "inline-block" }} />
      BASED ON REAL SEARCH DATA
      <span style={{ height: "1px", width: "24px", background: "var(--accent-indigo)", opacity: 0.4, display: "inline-block" }} />
    </div>

    {/* 메인 타이틀 */}
    <h1 style={{
      fontFamily: "'Outfit', sans-serif",
      fontSize: "clamp(1.35rem, 4vw, 3rem)",
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: "-0.03em",
      marginBottom: "0.9rem",
      color: "var(--text-primary)",
    }}>
      실제 검색 데이터를 기반으로 한{" "}
      <span style={{
        background: "var(--accent-gradient)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
      }}>
        AI툴 랭킹
      </span>
    </h1>

    {/* 서브 텍스트 */}
    <p style={{
      color: "var(--text-secondary)",
      fontSize: "0.92rem",
      lineHeight: 1.7,
      marginBottom: "1.2rem",
      maxWidth: "460px",
      marginLeft: "auto",
      marginRight: "auto",
    }}>
      Naver, Google, X(Twitter), GitHub의 검색 트렌드를 분석해
      <br />AI 툴의 실제 관심도를 하나의 점수로 계산합니다.
    </p>

    {/* 플랫폼 칩 */}
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: "5px",
      flexWrap: "nowrap",
      marginBottom: "1rem",
    }}>
      {PLATFORMS.map(({ label, domain }) => (
        <div key={domain} style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px",
          borderRadius: "20px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          fontSize: "0.68rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          boxShadow: "var(--shadow-sm)",
          whiteSpace: "nowrap",
        }}>
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt={label}
            style={{ width: 12, height: 12, borderRadius: "3px" }}
          />
          {label}
        </div>
      ))}
    </div>

    {/* 갱신 배지 */}
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "0.72rem",
      color: "var(--text-muted)",
      marginBottom: "1.6rem",
    }}>
      <span style={{
        width: "7px", height: "7px", borderRadius: "50%",
        background: "#22c55e",
        boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
        display: "inline-block",
        animation: "pulse-dot 2s ease-in-out infinite",
      }} />
      매일 AM 03:00 자동 갱신
    </div>

    {/* 검색 바 + 마법사 버튼 */}
    <div style={{
      display: "flex",
      gap: "10px",
      maxWidth: "560px",
      margin: "0 auto",
      alignItems: "center",
    }}>
      <div style={{ flex: 1, position: "relative" }}>
        <span style={{
          position: "absolute",
          left: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "1rem",
          opacity: 0.5,
        }}>🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="AI 도구 이름으로 검색..."
          style={{
            width: "100%",
            padding: "12px 16px 12px 42px",
            borderRadius: "12px",
            border: "1px solid var(--border-primary)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontFamily: "'Pretendard', sans-serif",
            fontSize: "0.9rem",
            outline: "none",
            transition: "border-color 0.2s",
            boxShadow: "var(--shadow-sm)",
          }}
        />
      </div>
      <button
        onClick={onOpenWizard}
        style={{
          padding: "12px 20px",
          borderRadius: "12px",
          border: "none",
          background: "var(--accent-gradient)",
          color: "#fff",
          fontFamily: "'Pretendard', sans-serif",
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
      >
        ✨ 나에게 딱 맞는 AI 찾기
      </button>
    </div>
  </section>
);

export default HeroSection;
