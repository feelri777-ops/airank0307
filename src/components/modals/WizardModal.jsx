import { useState, useRef, useEffect } from "react";
import { ArrowLeft, PaperPlaneRight, Sparkle, ChatCircleText, Image as ImageIcon } from "../icons/PhosphorIcons";
import { getAIConciergeResponse } from "../../services/aiService";

const AIConciergeModal = ({ isOpen, onClose, tools }) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [result, isLoading]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const data = await getAIConciergeResponse(prompt, tools);
      
      // 추천 도구 ID를 실제 툴 객체와 매칭
      const matchedRecommendations = data.recommendations.map(rec => {
        const fullTool = tools.find(t => String(t.id) === String(rec.id));
        return fullTool ? { ...fullTool, reason: rec.reason } : null;
      }).filter(Boolean);

      setResult({
        message: data.message,
        recommendations: matchedRecommendations,
        communityIntro: data.communityIntro
      });
    } catch (error) {
      console.error("AI Concierge Failure:", error);
      setErrorMsg(error.message || "AI 분석 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setPrompt("");
    setResult(null);
    setIsLoading(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: "24px",
          border: "1px solid var(--border-primary)",
          width: "100%",
          maxWidth: "600px",
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        <style>{`
          @keyframes dotPulse {
            0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
            30% { opacity: 1; transform: translateY(-4px); }
          }
          .thinking-dot {
            width: 6px;
            height: 6px;
            background: var(--text-muted);
            border-radius: 50%;
            display: inline-block;
            animation: dotPulse 1.4s infinite ease-in-out;
          }
          .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
          .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
          
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* 헤더 */}
        <div style={{
          padding: "1.2rem 1.5rem",
          borderBottom: "1px solid var(--border-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "var(--accent-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)"
            }}>
              <Sparkle size={22} color="#white" weight="fill" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>AIRANK 컨시어지</h2>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>당신의 목적에 맞는 최적의 AI를 설계해 드립니다.</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem"
          }}>✕</button>
        </div>

        {/* 채팅 영역 */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* AI 기본 메시지 */}
          <div style={{ display: "flex", gap: "12px", maxWidth: "85%" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              🤖
            </div>
            <div style={{ background: "var(--bg-secondary)", padding: "12px 16px", borderRadius: "0 16px 16px 16px", fontSize: "0.9rem", lineHeight: 1.5 }}>
              안녕하세요! 무엇을 도와드릴까요? <br />
              현재 고민 중인 상황이나 필요한 기능을 적어주시면 딱 맞는 AI 도구를 추천해 드릴게요.
            </div>
          </div>

          {/* 결과물 출력 */}
          {result && (
            <>
              <div style={{ alignSelf: "flex-end", maxWidth: "85%", background: "var(--accent-gradient)", color: "white", padding: "12px 16px", borderRadius: "16px 16px 0 16px", fontSize: "0.9rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                {prompt}
              </div>

              <div style={{ display: "flex", gap: "12px", maxWidth: "95%" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  🪄
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "var(--bg-secondary)", padding: "12px 16px", borderRadius: "0 16px 16px 16px", fontSize: "0.9rem", lineHeight: 1.5 }}>
                    {result.message}
                  </div>

                  {/* 추천 도구 리스트 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {result.recommendations.map((tool, i) => (
                      <div key={tool.id} style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-primary)",
                        padding: "14px",
                        borderRadius: "16px",
                        display: "flex",
                        gap: "12px",
                        animation: "fadeInUp 0.4s ease forwards",
                        animationDelay: `${i * 0.15}s`,
                        opacity: 0,
                      }}>
                        <div style={{ fontSize: "1.8rem", background: "var(--bg-tertiary)", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px" }}>
                          {tool.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 700 }}>{tool.name}</h4>
                          <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{tool.desc}</p>
                          <div style={{
                            padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "8px", fontSize: "0.72rem", borderLeft: "3px solid var(--accent-indigo)", color: "var(--text-primary)"
                          }}>
                            <strong>💡 추천 이유:</strong> {result.recommendations[i].reason}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 커뮤니티 홍보 */}
                  <div style={{
                    marginTop: "10px",
                    background: "rgba(99, 102, 241, 0.05)",
                    border: "1px dashed var(--accent-indigo)",
                    padding: "15px",
                    borderRadius: "16px",
                    textAlign: "center"
                  }}>
                    <p style={{ fontSize: "0.85rem", margin: "0 0 10px", fontWeight: 500 }}>{result.communityIntro}</p>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <a href="/community" style={{ textDecoration: "none", fontSize: "0.75rem", background: "white", color: "black", padding: "6px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        <ChatCircleText size={14} /> 자유게시판
                      </a>
                      <a href="/gallery" style={{ textDecoration: "none", fontSize: "0.75rem", background: "white", color: "black", padding: "6px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        <ImageIcon size={14} /> 갤러리
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isLoading && (
            <div style={{ display: "flex", gap: "12px", maxWidth: "85%", animation: "fadeInUp 0.3s ease" }}>
              <div style={{ 
                width: "32px", height: "32px", borderRadius: "12px", 
                background: "var(--bg-tertiary)", 
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 
              }}>
                🤖
              </div>
              <div style={{ 
                background: "var(--bg-secondary)", 
                padding: "15px 20px", 
                borderRadius: "4px 20px 20px 20px", 
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
              }}>
                <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "12px" }}>
                  <span className="thinking-dot"></span>
                  <span className="thinking-dot"></span>
                  <span className="thinking-dot"></span>
                </div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  상황에 맞는 최적의 AI를 수집하고 분석 중입니다...
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ display: "flex", gap: "12px", maxWidth: "85%" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                ⚠️
              </div>
              <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "0 16px 16px 16px", fontSize: "0.9rem", border: "1px solid #fecaca" }}>
                {errorMsg}
              </div>
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div style={{
          padding: "1.2rem",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-primary)",
        }}>
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            background: "var(--bg-card)",
            borderRadius: "18px",
            border: "1.5px solid var(--border-primary)",
            padding: "4px 6px 4px 16px",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
              placeholder="예: 유튜브 대본을 자동으로 써주는 AI가 필요해"
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                padding: "10px 0",
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                resize: "none",
                height: "44px",
                maxHeight: "120px",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !prompt.trim()}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "14px",
                background: prompt.trim() ? "var(--accent-gradient)" : "var(--bg-tertiary)",
                color: "white",
                border: "none",
                cursor: prompt.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                marginLeft: "8px",
              }}
            >
              <PaperPlaneRight size={20} weight="fill" />
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "10px" }}>
            AIRANK AI는 실시간 랭킹 데이터를 기반으로 가장 유용한 도구를 선별합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIConciergeModal;
