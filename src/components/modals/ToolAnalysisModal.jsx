import { createPortal } from "react-dom";
import { ArrowRight } from "../icons/PhosphorIcons";

const SNS_PLATFORMS = [
  { key: "naver",   label: "Naver",   domain: "naver.com",   color: "#03C75A" },
  { key: "youtube", label: "YouTube", domain: "youtube.com", color: "#FF0000" },
  { key: "google",  label: "Google",  domain: "google.com",  color: "#4285F4" },
  { key: "github",  label: "GitHub",  domain: "github.com",  color: "#8b949e" },
];

const ToolAnalysisModal = ({ tool, rank, onClose }) => {
  if (!tool) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.65)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: "16px",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          borderRadius: "var(--r-lg)", padding: "1.5rem", width: "100%", maxWidth: "380px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)", position: "relative",
          maxHeight: "85vh", overflowY: "auto"
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px",
          background: "var(--bg-tertiary)", border: "none", borderRadius: "50%",
          width: "32px", height: "32px", cursor: "pointer", color: "var(--text-muted)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>✕</button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span style={{ fontSize: "2.5rem" }}>{tool.icon}</span>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: "1.5rem" }}>{tool.name}</h2>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginTop: "4px" }}>
              심층 분석 리포트
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.9rem", color: "var(--text-primary)" }}>실시간 트렌드 지표</h3>

        {/* 플랫폼 점수 1행 */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "1.25rem" }}>
          {SNS_PLATFORMS.map(({ key, label, domain, color }) => {
            const value = tool.sns?.[key] || 0;
            return (
              <div key={key} style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                padding: "12px 8px",
                background: "var(--bg-secondary)",
                borderRadius: "var(--r-md)",
              }}>
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt={label}
                  style={{ width: 24, height: 24, borderRadius: "var(--r-xs)", flexShrink: 0 }}
                />
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "var(--r-md)", marginBottom: "1.5rem", border: "1px solid var(--border-primary)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          위 데이터는 각 플랫폼 검색량·조회수·언급량을 종합한 <strong>실시간 인기 지표</strong>입니다 (0~100 정규화).
        </div>

        <button
          onClick={() => window.open(tool.url, "_blank")}
          style={{
            width: "100%", padding: "14px", borderRadius: "var(--r-md)",
            background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
            color: "#fff", border: "none", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
          }}
        >
          공식 사이트 바로가기 <ArrowRight size={18} />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ToolAnalysisModal;
