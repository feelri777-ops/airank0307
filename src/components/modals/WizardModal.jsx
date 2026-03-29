import { useState, useRef, useEffect } from "react";
import { ArrowLeft, PaperPlaneRight, Sparkle, ChatCircleText, Image as ImageIcon } from "../icons/PhosphorIcons";
import { getAIConciergeResponse, getAIConciergeDecision } from "../../services/aiService";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const AIConciergeModal = ({ isOpen, onClose, tools }) => {
  const [prompt, setPrompt] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "ai", content: "안녕하세요! 지금 어떤 상황인가요? 어떤 작업을 위해 AI 도구가 필요하신가요? 제가 최적의 조합을 설계해 드릴게요." }
  ]);
  const [step, setStep] = useState(0); // 질문 횟수 카운트
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
  }, [chatHistory, isLoading, result]);

  if (!isOpen) return null;

  // 북마크 저장 함수
  const toggleBookmark = async (q, r) => {
    if (!auth.currentUser) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }

    try {
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
    
    // 1단계 첫 질문 시 initialPrompt 저장
    if (step === 0) setInitialPrompt(query);

    // 사용자 메시지 히스토리에 추가
    const updatedHistory = [...chatHistory, { role: "user", content: query }];
    setChatHistory(updatedHistory);
    setPrompt("");
    setIsLoading(true);
    setErrorMsg(null);
    setShowBookmarks(false);

    try {
      // AI의 판단 (더 질문할지, 추천할지)
      const decision = await getAIConciergeDecision(initialPrompt || query, updatedHistory, step);
      
      if (decision.status === "ASK" && step < 3) {
        // 추가 질문 (최대 3회까지)
        setChatHistory(prev => [...prev, { role: "ai", content: decision.content }]);
        setStep(prev => prev + 1);
      } else {
        // 충분하다고 판단하거나 3회 초과 시 최종 답변
        const data = await getAIConciergeResponse(initialPrompt || query, updatedHistory, tools);
        
        const matchedRecommendations = data.recommendations.map(rec => {
          const fullTool = tools.find(t => String(t.id) === String(rec.id));
          return fullTool ? { ...fullTool, reason: rec.reason } : null;
        }).filter(Boolean);

        setResult({
          prompt: initialPrompt || query,
          message: data.message,
          recommendations: matchedRecommendations,
          combinationTip: data.combinationTip,
          communityIntro: data.communityIntro
        });
        setChatHistory(prev => [...prev, { role: "ai", content: "모든 내용을 분석하여 사용자님을 위한 최적의 리포트를 작성했습니다!" }]);
      }
    } catch (error) {
      console.error("AI Concierge Failure:", error);
      setErrorMsg(error.message || "AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setChatHistory([
      { role: "ai", content: "안녕하세요! 지금 어떤 상황인가요? 어떤 작업을 위해 AI 도구가 필요하신가요? 제가 최적의 조합을 설계해 드릴게요." }
    ]);
    setStep(0);
    setInitialPrompt("");
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
              {/* 대화 내역 렌더링 */}
              {chatHistory.map((chat, idx) => (
                <div key={idx} style={{ 
                  display: "flex", 
                  flexDirection: "column",
                  gap: "10px",
                  alignItems: chat.role === "user" ? "flex-end" : "flex-start",
                  animation: "fadeInUp 0.3s ease"
                }}>
                  <div style={{ display: "flex", gap: "10px", maxWidth: isMobile ? "95%" : "85%", flexDirection: chat.role === "user" ? "row-reverse" : "row" }}>
                    <div style={{ 
                      width: "30px", height: "30px", borderRadius: "8px", 
                      background: chat.role === "user" ? "var(--bg-tertiary)" : "var(--accent-indigo)", 
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.8rem", color: "white" 
                    }}>
                      {chat.role === "user" ? "👤" : "✨"}
                    </div>
                    <div style={{ 
                      background: chat.role === "user" ? "var(--accent-gradient)" : "var(--bg-secondary)", 
                      color: chat.role === "user" ? "white" : "var(--text-primary)", 
                      padding: isMobile ? "10px 14px" : "12px 18px", 
                      borderRadius: chat.role === "user" ? "18px 18px 0 18px" : "0 18px 18px 18px", 
                      fontSize: isMobile ? "0.85rem" : "0.92rem", 
                      lineHeight: 1.5,
                      border: chat.role === "user" ? "none" : "1px solid var(--border-primary)",
                      boxShadow: chat.role === "user" ? "0 4px 12px rgba(99, 102, 241, 0.2)" : "none"
                    }}>
                      {chat.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* 진행 상황 안내 */}
              {!result && !isLoading && step > 1 && step <= 3 && (
                <div style={{ textAlign: "center", padding: "10px", animation: "fadeInUp 0.3s ease" }}>
                  <span style={{ fontSize: "0.75rem", background: "rgba(99,102,241,0.1)", color: "var(--accent-indigo)", padding: "4px 12px", borderRadius: "100px", fontWeight: 700 }}>
                    단계 {step}/3: 상세 정보 수집 중...
                  </span>
                </div>
              )}
              {!result && !isLoading && step === 4 && (
                <div style={{ textAlign: "center", padding: "10px", animation: "fadeInUp 0.3s ease" }}>
                  <span style={{ fontSize: "0.75rem", background: "var(--accent-gradient)", color: "white", padding: "4px 12px", borderRadius: "100px", fontWeight: 700 }}>
                    마지막 단계: 모든 정보를 분석하여 리포트를 생성합니다.
                  </span>
                </div>
              )}

              {/* 결과물 출력 (마지막 요약 리포트) */}
              {result && (
                <div style={{ marginTop: "10px", borderTop: "2px solid var(--accent-indigo)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", gap: isMobile ? "10px" : "14px", maxWidth: "100%" }}>
                    <div style={{ width: isMobile ? "30px" : "36px", height: isMobile ? "30px" : "36px", borderRadius: "10px", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
                      🪄
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "16px" }}>
                      <div style={{ position: "relative" }}>
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
                        <button 
                          onClick={() => toggleBookmark(result.prompt, result)}
                          style={{ position: "absolute", bottom: "-25px", right: "0", background: "none", border: "none", color: "var(--accent-indigo)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                        >
                          📌 이 결과 리포트 대시보드 저장
                        </button>
                      </div>

                      {/* [A+B 조합 팁] */}
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
                            <span style={{ fontWeight: 800, fontSize: isMobile ? "0.88rem" : "0.95rem", color: "var(--accent-indigo)" }}>파이널 베스트 시너지 조합 (A+B)</span>
                          </div>
                          <p style={{ margin: 0, fontSize: isMobile ? "0.85rem" : "0.93rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
                             {result.combinationTip}
                          </p>
                        </div>
                      )}

                      {/* 추천 도구 리스트 */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {result.recommendations.map((tool, i) => {
                          let hostname = "";
                          try {
                            if (tool.url) {
                              // 프로토콜이 없는 경우 대비
                              const urlStr = tool.url.startsWith("http") ? tool.url : `https://${tool.url}`;
                              hostname = new URL(urlStr).hostname;
                            }
                          } catch (e) {
                            console.warn("Invalid URL for favicon:", tool.url);
                          }
                          
                          const faviconUrl = hostname 
                            ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
                            : null;
                          const rankNum = tools ? tools.findIndex(t => t.id === tool.id) + 1 : 0;

                          return (
                            <div key={tool.id} style={{
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-primary)",
                              padding: isMobile ? "15px" : "20px",
                              borderRadius: isMobile ? "20px" : "26px",
                              display: "flex", flexDirection: "column", gap: isMobile ? "10px" : "14px",
                              animation: "fadeInUp 0.4s ease forwards",
                              animationDelay: `${i * 0.1}s`, opacity: 0,
                              boxShadow: "0 10px 20px rgba(0,0,0,0.04)"
                            }}>
                              <div style={{ display: "flex", gap: isMobile ? "12px" : "18px", alignItems: "flex-start" }}>
                                <div style={{ 
                                  width: isMobile ? "45px" : "60px", height: isMobile ? "45px" : "60px", borderRadius: isMobile ? "12px" : "18px", 
                                  background: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                                  flexShrink: 0, border: "1px solid var(--border-primary)", overflow: "hidden", padding: isMobile ? "4px" : "6px"
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
                                          fontSize: "0.6rem", fontWeight: 700, background: "rgba(99,102,241,0.1)", 
                                          color: "var(--accent-indigo)", padding: "1px 6px", borderRadius: "100px", border: "1px solid rgba(99,102,241,0.2)"
                                        }}>
                                          #{rankNum}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: "0.6rem", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "8px", fontWeight: 600 }}>{tool.cat}</span>
                                  </div>
                                  {!isMobile && <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{tool.desc}</p>}
                                </div>
                              </div>
                              <div style={{ padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: "14px", fontSize: "0.85rem", borderLeft: "4px solid var(--accent-indigo)", color: "var(--text-primary)", lineHeight: 1.6 }}>
                                <strong>🎯 맞춤 처방:</strong> {tool.reason}
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <a href={`/community?category=${encodeURIComponent(tool.cat || "자유")}`} style={{ textDecoration: "none", fontSize: "0.72rem", background: "var(--accent-gradient)", color: "white", padding: "8px 16px", borderRadius: "10px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                                  <ChatCircleText size={16} weight="fill" /> 커뮤니티 토론 참여
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "0.85rem", borderTop: "1px solid var(--border-primary)", marginTop: "10px" }}>
                        {result.communityIntro}
                        <div style={{ marginTop: "15px" }}>
                           <button 
                             onClick={reset} 
                             style={{ 
                               background: "var(--accent-gradient)", 
                               color: "white", 
                               padding: "8px 18px", 
                               borderRadius: "100px", 
                               border: "none", 
                               fontSize: "0.8rem", 
                               fontWeight: 700, 
                               cursor: "pointer",
                               boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
                             }}
                           >
                             🔄 새 질문 시작하기
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {errorMsg && (
            <div style={{ 
              background: "rgba(239, 68, 68, 0.05)", 
              border: "1px solid rgba(239, 68, 68, 0.2)", 
              padding: "16px", 
              borderRadius: "14px",
              color: "#ef4444",
              fontSize: "0.85rem",
              textAlign: "center",
              margin: "10px 0",
              animation: "fadeInUp 0.3s ease"
            }}>
              ⚠️ {errorMsg}
              <div style={{ marginTop: "10px" }}>
                <button onClick={reset} style={{ background: "var(--accent-gradient)", color: "white", padding: "6px 12px", border: "none", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>새로 시작하기</button>
              </div>
            </div>
          )}

          {isLoading && (
            <div style={{ display: "flex", gap: isMobile ? "10px" : "14px", animation: "fadeInUp 0.3s ease" }}>
              <div style={{ width: isMobile ? "30px" : "36px", height: isMobile ? "30px" : "36px", borderRadius: "10px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.1rem" }}>
                👾
              </div>
              <div style={{ 
                background: "var(--bg-secondary)", 
                padding: "16px 20px", 
                borderRadius: "0 24px 24px 24px", 
                border: "1px solid var(--border-primary)", 
                flex: 1
              }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                  <span className="thinking-dot"></span>
                  <span className="thinking-dot"></span>
                  <span className="thinking-dot"></span>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  사용자님의 답변을 분석하여 최적의 추천 경로를 판단하고 있습니다...
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
