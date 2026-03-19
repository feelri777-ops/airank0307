import { useState, useRef, useEffect } from "react";
import { ArrowLeft, PaperPlaneRight, Sparkle, ChatCircleText, Image as ImageIcon } from "../icons/PhosphorIcons";
import { getAIConciergeResponse } from "../../services/aiService";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const AIConciergeModal = ({ isOpen, onClose, tools }) => {
  const [prompt, setPrompt] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(""); // 현재 진행 중인 질문 저장
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 초기 로드 시 북마크 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("airank_ai_bookmarks");
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [result, isLoading, currentQuestion]);

  if (!isOpen) return null;

  // 북마크 저장 함수
  const toggleBookmark = async (q, r) => {
    if (!auth.currentUser) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }

    try {
      // undefined 필드 제거를 위해 JSON 직렬화 후 다시 파싱 (안전한 저장)
      const sanitizedResult = JSON.parse(JSON.stringify(r));

      await addDoc(collection(db, "aiBookmarks"), {
        uid: auth.currentUser.uid,
        prompt: q,
        result: sanitizedResult,
        createdAt: serverTimestamp()
      });
      alert("질문과 답변이 개인 대시보드에 저장되었습니다!");
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const removeBookmark = (id) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem("airank_ai_bookmarks", JSON.stringify(updated));
  };

  const handleSearch = async (targetPrompt = prompt) => {
    const query = targetPrompt || prompt;
    if (!query.trim()) return;
    
    // UI 즉시 반영: 질문을 채팅창에 올리고 입력창 비우기
    setCurrentQuestion(query);
    setPrompt("");
    
    setIsLoading(true);
    setResult(null);
    setErrorMsg(null);
    setShowBookmarks(false);

    try {
      const data = await getAIConciergeResponse(query, tools);
      
      const matchedRecommendations = data.recommendations.map(rec => {
        const fullTool = tools.find(t => String(t.id) === String(rec.id));
        return fullTool ? { ...fullTool, reason: rec.reason } : null;
      }).filter(Boolean);

      setResult({
        message: data.message,
        recommendations: matchedRecommendations,
        combinationTip: data.combinationTip,
        communityIntro: data.communityIntro
      });
    } catch (error) {
      console.error("AI Concierge Failure:", error);
      setErrorMsg(error.message || "AI 분석 중 오류가 발생했습니다.");
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
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        zIndex: 1000,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? "0px" : "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: isMobile ? "24px 24px 0 0" : "32px",
          border: isMobile ? "none" : "1px solid var(--border-primary)",
          width: "100%",
          maxWidth: isMobile ? "100%" : "700px",
          height: isMobile ? "92vh" : "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: isMobile ? "0 -10px 40px rgba(0,0,0,0.3)" : "0 25px 50px -12px rgba(0,0,0,0.6)",
          position: "relative",
        }}
      >
        <style>{`
          @keyframes dotPulse {
            0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
            30% { opacity: 1; transform: translateY(-4px); }
          }
          .thinking-dot {
            width: 6px; height: 6px;
            background: var(--accent-indigo);
            border-radius: 50%;
            display: inline-block;
            animation: dotPulse 1.4s infinite ease-in-out;
          }
          .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
          .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
          
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 10px; }
        `}</style>

        {/* 헤더 */}
        <div style={{
          padding: isMobile ? "1rem 1.2rem" : "1.2rem 1.8rem",
          borderBottom: "1px solid var(--border-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "12px" }}>
            <div style={{
              width: isMobile ? "32px" : "40px", 
              height: isMobile ? "32px" : "40px", 
              borderRadius: "10px",
              background: "var(--accent-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)"
            }}>
              <Sparkle size={isMobile ? 18 : 24} color="white" weight="fill" />
            </div>
            <div>
              <h2 style={{ fontSize: isMobile ? "1rem" : "1.2rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>AIRANK 컨시어지</h2>
              {!isMobile && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>실시간 트렌드 기반의 도구 설계사</p>}
            </div>
          </div>
          <div style={{ display: "flex", gap: isMobile ? "6px" : "10px", alignItems: "center" }}>
            <button 
              onClick={() => setShowBookmarks(!showBookmarks)}
              style={{
                background: showBookmarks ? "var(--bg-tertiary)" : "none",
                border: "1px solid var(--border-primary)",
                borderRadius: "8px",
                padding: isMobile ? "4px 8px" : "6px 12px",
                fontSize: isMobile ? "0.68rem" : "0.75rem",
                cursor: "pointer",
                color: "var(--text-primary)",
                display: "flex", alignItems: "center", gap: "4px"
              }}
            >
              📌 북마크 {bookmarks.length}
            </button>
            <button onClick={onClose} style={{
              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: isMobile ? "1.2rem" : "1.4rem",
              padding: "4px"
            }}>✕</button>
          </div>
        </div>

        {/* 채팅 영역 */}
        <div ref={scrollRef} className="custom-scrollbar" style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: isMobile ? "1.2rem 1rem" : "1.8rem", 
          display: "flex", 
          flexDirection: "column", 
          gap: isMobile ? "20px" : "24px" 
        }}>
          
          {showBookmarks ? (
            <div style={{ animation: "fadeInUp 0.3s ease" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                저장된 질문들 <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>({bookmarks.length})</span>
              </h3>
              {bookmarks.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>아직 저장된 질문이 없습니다.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {bookmarks.map(b => (
                    <div key={b.id} style={{
                      padding: "16px", background: "var(--bg-secondary)", borderRadius: "16px", border: "1px solid var(--border-primary)",
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <div style={{ cursor: "pointer", flex: 1 }} onClick={() => { setPrompt(b.prompt); setResult(b.result); setShowBookmarks(false); }}>
                        <p style={{ margin: "0 0 4px", fontSize: "0.9rem", fontWeight: 600 }}>"{b.prompt}"</p>
                        <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)" }}>{b.date} 저장됨</p>
                      </div>
                      <button onClick={() => removeBookmark(b.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem" }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "20px" }}>
                북마크는 현재 브라우저에 저장됩니다. 로그인 시 자동으로 동기화됩니다.
              </p>
            </div>
          ) : (
            <>
              {/* AI 기본 메시지 */}
              <div style={{ display: "flex", gap: isMobile ? "10px" : "14px", maxWidth: isMobile ? "100%" : "90%" }}>
                <div style={{ width: isMobile ? "30px" : "36px", height: isMobile ? "30px" : "36px", borderRadius: "10px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
                  🤖
                </div>
                <div style={{ 
                  background: "var(--bg-secondary)", 
                  padding: isMobile ? "12px 14px" : "16px 20px", 
                  borderRadius: isMobile ? "0 18px 18px 18px" : "0 24px 24px 24px", 
                  fontSize: isMobile ? "0.85rem" : "0.95rem", 
                  lineHeight: 1.6, 
                  border: "1px solid var(--border-primary)" 
                }}>
                  반가워요! 실시간 트렌드를 반영한 최고의 AI 조합을 추천해 드릴게요. <br />
                  질문을 입력해 보시거나, 저장된 질문을 확인해 보세요.
                </div>
              </div>

              {/* 진행 중인 질문 또는 결과물 상단의 질문 */}
              {(currentQuestion || result) && (
                <div style={{ 
                  alignSelf: "flex-end", 
                  maxWidth: isMobile ? "92%" : "85%", 
                  background: "var(--accent-gradient)", 
                  color: "white", 
                  padding: isMobile ? "12px 15px" : "14px 20px", 
                  borderRadius: isMobile ? "18px 18px 0 18px" : "24px 24px 0 24px", 
                  fontSize: isMobile ? "0.88rem" : "0.95rem", 
                  boxShadow: "0 10px 20px rgba(99, 102, 241, 0.2)", 
                  position: "relative", 
                  animation: "fadeInUp 0.3s ease" 
                }}>
                  {currentQuestion || (result && result.prompt)}
                  {result && (
                    <button 
                      onClick={() => toggleBookmark(currentQuestion, result)}
                      style={{ position: "absolute", bottom: "-25px", right: "0", background: "none", border: "none", color: "var(--accent-indigo)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                    >
                      📌 질문 대시보드 저장
                    </button>
                  )}
                </div>
              )}

              {/* 결과물 출력 */}
              {result && (
                <>
                  <div style={{ display: "flex", gap: isMobile ? "10px" : "14px", maxWidth: "100%", marginTop: "10px" }}>
                    <div style={{ width: isMobile ? "30px" : "36px", height: isMobile ? "30px" : "36px", borderRadius: "10px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
                      🪄
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "16px" }}>
                      <div style={{ 
                        background: "var(--bg-secondary)", 
                        padding: isMobile ? "12px 14px" : "16px 20px", 
                        borderRadius: isMobile ? "0 18px 18px 18px" : "0 24px 24px 24px", 
                        fontSize: isMobile ? "0.85rem" : "0.95rem", 
                        lineHeight: 1.6, 
                        border: "1px solid var(--border-primary)" 
                      }}>
                        {result.message}
                      </div>

                      {/* [A+B 조합 팁] - 테두리 겹침 수정 */}
                      {result.combinationTip && (
                        <div style={{
                          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
                          padding: isMobile ? "15px" : "20px", 
                          border: "1px solid rgba(99, 102, 241, 0.2)",
                          borderRadius: isMobile ? "18px" : "24px", 
                          borderLeft: isMobile ? "4px solid var(--accent-indigo)" : "6px solid var(--accent-indigo)", 
                          animation: "fadeInUp 0.5s ease",
                          boxShadow: "0 4px 15px rgba(0,0,0,0.02)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <Sparkle size={isMobile ? 16 : 20} color="var(--accent-indigo)" weight="fill" />
                            <span style={{ fontWeight: 800, fontSize: isMobile ? "0.88rem" : "0.95rem", color: "var(--accent-indigo)" }}>베스트 시너지 조합 (A+B)</span>
                          </div>
                          <p style={{ margin: 0, fontSize: isMobile ? "0.85rem" : "0.93rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
                             {result.combinationTip}
                          </p>
                        </div>
                      )}

                      {/* 추천 도구 리스트 - 순위 표시 추가 */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {result.recommendations.map((tool, i) => {
                          const faviconUrl = tool.url 
                            ? `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=128`
                            : null;
                          
                          // 도구 리스트에서의 순위 찾기
                          const rankNum = tools.findIndex(t => t.id === tool.id) + 1;

                          return (
                            <div key={tool.id} style={{
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-primary)",
                              padding: isMobile ? "15px" : "20px",
                              borderRadius: isMobile ? "20px" : "26px",
                              display: "flex",
                              flexDirection: "column",
                              gap: isMobile ? "10px" : "14px",
                              animation: "fadeInUp 0.4s ease forwards",
                              animationDelay: `${i * 0.1}s`,
                              opacity: 0,
                              boxShadow: "0 10px 20px rgba(0,0,0,0.04)"
                            }}>
                              <div style={{ display: "flex", gap: isMobile ? "12px" : "18px", alignItems: "flex-start" }}>
                                <div style={{ 
                                  width: isMobile ? "45px" : "60px", 
                                  height: isMobile ? "45px" : "60px", 
                                  borderRadius: isMobile ? "12px" : "18px", 
                                  background: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                                  flexShrink: 0, border: "1px solid var(--border-primary)", overflow: "hidden",
                                  padding: isMobile ? "4px" : "6px"
                                }}>
                                  {faviconUrl ? (
                                    <img src={faviconUrl} alt={tool.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                  ) : (
                                    <div style={{ fontSize: isMobile ? "1.4rem" : "1.8rem" }}>{tool.icon || "🤖"}</div>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? "2px" : "6px", flexWrap: "wrap", gap: "4px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <h4 style={{ margin: 0, fontSize: isMobile ? "1rem" : "1.15rem", fontWeight: 800 }}>{tool.name}</h4>
                                      {rankNum > 0 && (
                                        <span style={{ 
                                          fontSize: isMobile ? "0.6rem" : "0.65rem", fontWeight: 700, background: "rgba(99,102,241,0.1)", 
                                          color: "var(--accent-indigo)", padding: "1px 6px", borderRadius: "100px",
                                          border: "1px solid rgba(99,102,241,0.2)"
                                        }}>
                                          #{rankNum}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: isMobile ? "0.6rem" : "0.7rem", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "8px", fontStyle: "italic", fontWeight: 600 }}>
                                      {tool.cat}
                                    </span>
                                  </div>
                                  {!isMobile && <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{tool.desc}</p>}
                                </div>
                              </div>
                              <div style={{ margin: "2px 0", padding: isMobile ? "10px 14px" : "14px 18px", background: "var(--bg-secondary)", borderRadius: isMobile ? "12px" : "16px", fontSize: isMobile ? "0.8rem" : "0.85rem", borderLeft: isMobile ? "3px solid var(--accent-indigo)" : "5px solid var(--accent-indigo)", color: "var(--text-primary)", lineHeight: 1.6 }}>
                                <strong>🎯 추천 사유:</strong> {tool.reason}
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <a href={`/community?category=${encodeURIComponent(tool.cat || "자유")}`} style={{ textDecoration: "none", fontSize: isMobile ? "0.7rem" : "0.75rem", background: "var(--accent-gradient)", color: "white", padding: isMobile ? "6px 12px" : "10px 20px", borderRadius: "10px", fontWeight: 700, display: "flex", alignItems: "center", gap: isMobile ? "4px" : "8px" }}>
                                  <ChatCircleText size={isMobile ? 16 : 18} weight="fill" /> 커뮤니티로 이동
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "0.85rem", borderTop: "1px solid var(--border-primary)", marginTop: "10px" }}>
                        {result.communityIntro}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {isLoading && (
            <div style={{ display: "flex", gap: isMobile ? "10px" : "14px", animation: "fadeInUp 0.3s ease" }}>
              <div style={{ width: isMobile ? "30px" : "36px", height: isMobile ? "30px" : "36px", borderRadius: "10px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
                🤖
              </div>
              <div style={{ 
                background: "var(--bg-secondary)", 
                padding: isMobile ? "12px 18px" : "18px 24px", 
                borderRadius: isMobile ? "0 18px 18px 18px" : "0 24px 24px 24px", 
                border: "1px solid var(--border-primary)", 
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                flex: 1
              }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                  <span className="thinking-dot"></span>
                  <span className="thinking-dot"></span>
                  <span className="thinking-dot"></span>
                </div>
                <p style={{ margin: 0, fontSize: isMobile ? "0.78rem" : "0.85rem", color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.4 }}>
                  {isMobile ? "사용자님의 맞춤 도구를 구글링 중..." : "사용자님의 상황에 딱 맞는 최강의 도구 조합을 구글링하여 분석 중입니다..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div style={{ padding: isMobile ? "0.8rem 1rem 1.5rem" : "1.5rem", background: "var(--bg-secondary)", borderTop: "1px solid var(--border-primary)" }}>
          <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", borderRadius: isMobile ? "18px" : "22px", border: isMobile ? "1px solid var(--border-primary)" : "2px solid var(--border-primary)", padding: isMobile ? "4px 6px 4px 14px" : "6px 8px 6px 20px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
              placeholder={showBookmarks ? "북마크 리스트를 끄고 질문해 보세요" : isMobile ? "조합 질문하기" : "시너지 낼 수 있는 도구 조합을 물어보세요!"}
              disabled={showBookmarks}
              style={{ flex: 1, background: "none", border: "none", outline: "none", padding: "10px 0", fontSize: isMobile ? "0.92rem" : "1rem", color: "var(--text-primary)", fontFamily: "inherit", resize: "none", height: isMobile ? "40px" : "48px" }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={isLoading || !prompt.trim() || showBookmarks}
              style={{ width: isMobile ? "36px" : "45px", height: isMobile ? "36px" : "45px", borderRadius: isMobile ? "12px" : "16px", background: (prompt.trim() && !showBookmarks) ? "var(--accent-gradient)" : "var(--bg-tertiary)", color: "white", border: "none", cursor: (prompt.trim() && !showBookmarks) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <PaperPlaneRight size={isMobile ? 18 : 22} weight="fill" />
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "8px" }}>
            AIRANK AI는 실시간 랭킹 데이터를 기반으로 분석합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIConciergeModal;
