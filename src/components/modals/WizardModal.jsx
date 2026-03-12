import { useState } from "react";
import { WIZARD_Q1, WIZARD_Q2 } from "../../data/tools";

const WizardModal = ({ isOpen, onClose, tools }) => {
  const [step, setStep] = useState(1);
  const [q1, setQ1] = useState(null);
  const [q2, setQ2] = useState(null);

  if (!isOpen) return null;

  const getResults = () => {
    return tools
      .filter((t) => t.life.includes(q1))
      .filter((t) => {
        if (!q2) return true;
        const catMap = { text: "text", code: "code", image: "image", video: "video", audio: "audio", design: "design", search: "search", data: "productivity", media: "video" };
        return t.cat === (catMap[q2] || q2);
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const reset = () => { setStep(1); setQ1(null); setQ2(null); };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-overlay)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeInUp 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: "20px",
          border: "1px solid var(--border-primary)",
          padding: "1.5rem",
          maxWidth: "520px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.2rem", fontWeight: 700 }}>✨ AI 도구 찾기 마법사</h2>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {step === 1 && "직업군를 선택하세요"}
              {step === 2 && "주요 작업을 선택하세요"}
              {step === 3 && "딱 맞는 AI 도구를 찾았어요!"}
            </p>
          </div>
          <button onClick={() => { reset(); onClose(); }} style={{
            width: "32px", height: "32px", borderRadius: "8px",
            border: "1px solid var(--border-primary)", background: "transparent",
            color: "var(--text-secondary)", cursor: "pointer", fontSize: "1rem",
          }}>✕</button>
        </div>

        {/* 진행률 */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "1.2rem" }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: step >= s ? "var(--accent-indigo)" : "var(--border-primary)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* 1단계: 직업군 선택 */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>{WIZARD_Q1.question}</p>
            {WIZARD_Q1.opts.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setQ1(opt.value); setStep(2); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${q1 === opt.value ? "var(--accent-indigo)" : "var(--border-primary)"}`,
                  background: q1 === opt.value ? "var(--tag-bg)" : "var(--bg-secondary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  fontFamily: "'Pretendard', sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                <span style={{ fontSize: "1.3rem" }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 2단계: 작업 유형 선택 */}
        {step === 2 && q1 && WIZARD_Q2[q1] && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>{WIZARD_Q2[q1].question}</p>
            {WIZARD_Q2[q1].opts.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setQ2(opt.value); setStep(3); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-primary)",
                  background: "var(--bg-secondary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  fontFamily: "'Pretendard', sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                <span style={{ fontSize: "1.3rem" }}>{opt.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{opt.sub}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setStep(1)} style={{
              marginTop: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-primary)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontFamily: "'Pretendard', sans-serif",
            }}>← 이전</button>
          </div>
        )}

        {/* 3단계: 결과 */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {getResults().length > 0 ? (
              getResults().map((tool, i) => (
                <div key={tool.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-primary)",
                  background: "var(--bg-secondary)",
                  animation: "fadeInUp 0.3s ease forwards",
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0,
                }}>
                  <span style={{ fontSize: "1.5rem" }}>{tool.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{tool.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{tool.desc}</div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
                조건에 맞는 도구가 없습니다. 다른 옵션을 선택해보세요.
              </p>
            )}
            <button onClick={reset} style={{
              marginTop: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent-gradient)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.85rem",
              fontFamily: "'Pretendard', sans-serif",
            }}>처음부터 다시 찾기</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardModal;
