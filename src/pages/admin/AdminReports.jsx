import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  orderBy 
} from "firebase/firestore";
import { 
  WarningCircle, 
  CheckCircle, 
  Trash, 
  Info, 
  Check, 
  NotePencil,
  ArrowRight,
  ShieldCheck,
  Globe,
  Tag,
  Plus,
  ArrowUpRight
} from "../../components/icons/PhosphorIcons";

// --- 개별 도구 비교 컴포넌트 ---
const ToolDiffView = ({ error, onApply }) => {
  const [currentTool, setCurrentTool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        if (!error.docId || error.docId === "id") {
           setLoading(false);
           return;
        }
        const d = await getDoc(doc(db, "tools", error.docId));
        if (d.exists()) setCurrentTool(d.data());
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrent();
  }, [error.docId]);

  if (loading) return <div style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.85rem" }}>데이터 로드 중...</div>;
  
  return (
    <div style={{ marginTop: "15px", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", background: "var(--bg-secondary)", padding: "12px", gap: "10px" }}>
        {/* Before */}
        <div style={{ opacity: currentTool ? 0.7 : 0.4 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px" }}>CURRENT (BEFORE)</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 700 }}>{currentTool?.name || "찾을 수 없음"}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {currentTool?.desc || "설명 없음"}
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowRight size={20} color="var(--text-muted)" />
        </div>

        {/* After */}
        <div style={{ background: "var(--accent-indigo)10", padding: "8px", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--accent-indigo)", marginBottom: "4px" }}>SUGGESTED (AFTER)</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 900 }}>{error.toolName || "정보 없음"}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", marginTop: "4px" }}>
             {error.suggestedFix}
          </div>
        </div>
      </div>
      
      {!currentTool && (
        <div style={{ padding: "10px 12px", color: "#ef4444", fontSize: "0.75rem", background: "#ef444410", textAlign: "center" }}>
           ID 불일치: 툴 정보를 불러올 수 없어 자동 반영이 불가능합니다. 수동 수정을 이용해 주세요.
        </div>
      )}

      <div style={{ padding: "12px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", gap: "10px" }}>
         <button 
          onClick={onApply}
          disabled={!currentTool}
          style={{ 
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 16px", borderRadius: "10px", border: "none", 
            background: "var(--accent-indigo)", color: "#fff", 
            fontWeight: 800, cursor: currentTool ? "pointer" : "not-allowed", fontSize: "0.85rem",
            opacity: currentTool ? 1 : 0.3
          }}
        >
          <Check size={16} weight="bold" />
          이 제안대로 즉시 반영하기
        </button>
      </div>
    </div>
  );
};

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "adminReports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      try {
        const data = snap.docs.map(d => {
          const docData = d.data();
          return { 
            ...docData, id: d.id,
            displayDate: docData.createdAt ? docData.createdAt.toDate().toLocaleString() : "방금 전"
          };
        });
        setReports(data);
        
        // 리포트가 있고, 아직 활성 리포트가 선택되지 않은 경우만 첫 번째로 설정
        // 의존성 배열에서 activeReport를 뺐으므로 더 이상 무한루프 위험 없음
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }, (error) => setLoading(false));
    return () => unsubscribe();
  }, []); // 의존성 배열 비움 (안정성 확보)

  // 별도의 이펙트로 첫 활성 리포트 설정 (구독과 분리)
  useEffect(() => {
    if (reports.length > 0 && !activeReport) {
      setActiveReport(reports[0]);
    }
  }, [reports, activeReport]);

  // --- 새로운 탭에서 수정 페이지 열기 ---
  const openEditor = (toolId) => {
    if (!toolId || toolId === "id") {
      alert("⚠️ 이 도구는 ID 정보를 포함하고 있지 않아 직접 수정할 수 없습니다.");
      return;
    }
    window.open(`/admin/tool-edit/${toolId}`, '_blank');
  };

  const handleApplyFix = async (docId, errorData) => {
    if (!window.confirm("제안된 수정 사항을 실제 데이터베이스(설명글)에 즉시 반영할까요?")) return;
    try {
      const toolRef = doc(db, "tools", docId);
      await updateDoc(toolRef, {
        desc: errorData.suggestedFix, 
        last_updated_by_ai: new Date().toISOString(),
        ai_recommendation_pending: false,
        ai_recommendation_applied: true
      });
      alert("✅ 제안된 내용으로 도구 설명이 즉시 업데이트되었습니다!");
    } catch (err) {
      alert("❌ 반영 중 오류 발생: " + err.message);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("이 보고서를 영구 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "adminReports", id));
    setActiveReport(null);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto", animation: "fadeIn 0.5s ease-out" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 950, color: "var(--text-primary)", letterSpacing: "-1px" }}>에이전트 제어실</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.15rem", fontWeight: 500 }}>통합 분석 보고서를 검토하고 새 탭에서 즉시 수정합니다.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "30px", height: "calc(100vh - 250px)" }}>
        {/* Report List */}
        <div style={{ 
          background: "var(--card-bg)", borderRadius: "24px", padding: "12px", 
          border: "1px solid var(--border-color)", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: "8px"
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>동기화 중...</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>도착한 보고서가 없습니다.</div>
          ) : (
            reports.map(r => (
              <div 
                key={r.id} onClick={() => setActiveReport(r)}
                style={{ 
                  padding: "18px", borderRadius: "18px", cursor: "pointer",
                  background: activeReport?.id === r.id ? "var(--accent-indigo)" : "transparent",
                  border: `1px solid ${activeReport?.id === r.id ? "transparent" : "var(--border-color)"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "8px", fontWeight: 800, color: activeReport?.id === r.id ? "#ffffff90" : "var(--text-muted)" }}>
                  <span>{r.displayDate}</span>
                  <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: "#ffffff40", color: "#fff" }}>{r.type.toUpperCase()}</span>
                </div>
                <div style={{ fontWeight: 900, color: activeReport?.id === r.id ? "#fff" : "var(--text-primary)", fontSize: "0.95rem" }}>{r.summary}</div>
              </div>
            ))
          )}
        </div>

        {/* Detail Content */}
        <div style={{ 
          background: "var(--card-bg)", borderRadius: "24px", padding: "40px", 
          border: "1px solid var(--border-color)", overflowY: "auto"
        }}>
          {activeReport ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: 950, color: "var(--text-primary)" }}>
                     {activeReport.type === "new_tool_recommendation" ? "✨ 신규 AI 도구 도입 제안" : "📊 통합 분석 및 점검 보고서"}
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{activeReport.displayDate} 작성</p>
                </div>
                <button onClick={() => handleDeleteReport(activeReport.id)} style={{ padding: "10px 20px", borderRadius: "14px", border: "none", background: "#ef444415", color: "#ef4444", fontWeight: 800, cursor: "pointer" }}>보고서 삭제</button>
              </div>

              {/* [1] NEW TOOL RECOMMENDATION */}
              {activeReport.type === "new_tool_recommendation" && activeReport.data?.recommendations && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                   {activeReport.data.recommendations.map((tool, idx) => (
                     <div key={idx} style={{ 
                       background: "var(--bg-secondary)", padding: "24px", borderRadius: "24px", 
                       border: "1px solid var(--border-primary)", position: "relative"
                     }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                           <h4 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 950, color: "var(--accent-indigo)" }}>{tool.name}</h4>
                           <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ background: "var(--bg-card)", color: "var(--text-primary)", padding: "6px 12px", borderRadius: "10px", fontSize: "0.75rem", textDecoration: "none", fontWeight: 800, border: "1px solid var(--border-primary)" }}>URL 방문 ↗</a>
                        </div>
                        <p style={{ margin: "0 0 16px 0", fontSize: "1rem", color: "var(--text-primary)", fontWeight: 700, lineHeight: 1.4 }}>{tool.desc}</p>
                        <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-primary)" }}>
                           <span style={{ fontSize: "0.7rem", fontWeight: 950, color: "var(--text-muted)", display: "block", marginBottom: "6px", letterSpacing: "1px" }}>AI STRATEGY (추천 이유)</span>
                           <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5, fontWeight: 500 }}>{tool.reason}</p>
                        </div>
                        <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                           <button 
                              onClick={() => {
                                const params = new URLSearchParams({
                                  mode: 'new',
                                  name: tool.name || '',
                                  url: tool.url || '',
                                  desc: tool.desc || '',
                                  cat: tool.cat || 'text',
                                  tags: tool.tags || ''
                                });
                                window.open(`/admin/tool-edit/new?${params.toString()}`, '_blank');
                              }}
                              style={{ 
                                padding: "8px 16px", borderRadius: "10px", border: "none", 
                                background: "var(--accent-indigo)", color: "#fff", 
                                fontWeight: 800, cursor: "pointer", fontSize: "0.8rem",
                                display: "flex", alignItems: "center", gap: "6px"
                              }}
                           >
                              <Plus size={16} weight="bold" />
                              현장에 즉시 투입(등록하기)
                           </button>
                           <span style={{ fontSize: "0.7rem", fontWeight: 950, color: "var(--accent-emerald)", background: "var(--accent-emerald)10", padding: "6px 12px", borderRadius: "30px", border: "1px solid var(--accent-emerald)" }}>#{tool.cat?.toUpperCase() || "NEW"}</span>
                        </div>
                     </div>
                   ))}
                </div>
              )}

              {/* [2] ERROR & UPDATE (SCOUT FULL TYPE) */}
              {activeReport.type === "tool_scout_full" && (
                <>
                  {/* Errors Section */}
                  {activeReport.data?.errors && activeReport.data.errors.length > 0 && (
                    <div style={{ marginBottom: "3rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                        <WarningCircle size={24} color="#ef4444" weight="fill" />
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 950 }}>치명적 오류 및 링크 유실 ({activeReport.data.errors.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {activeReport.data.errors.map((err, idx) => (
                           <div key={idx} style={{ padding: "24px", borderRadius: "24px", border: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
                              <div onClick={() => openEditor(err.docId)} style={{ fontWeight: 950, fontSize: "1.2rem", color: "var(--accent-indigo)", cursor: "pointer", textDecoration: "underline" }}>{err.toolName} ↗</div>
                              <div style={{ color: "#ef4444", fontWeight: 800, marginTop: "10px" }}>이슈: {err.issue}</div>
                              <ToolDiffView error={err} onApply={() => handleApplyFix(err.docId, err)} />
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Updates Section */}
                  {activeReport.data?.updates && activeReport.data.updates.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                        <Info size={24} color="var(--accent-indigo)" weight="fill" />
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 950 }}>데이터 정합성 및 보강 제안 ({activeReport.data.updates.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {activeReport.data.updates.map((upd, idx) => (
                          <div key={idx} style={{ padding: "24px", borderRadius: "24px", border: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
                            <div onClick={() => openEditor(upd.docId)} style={{ fontWeight: 950, fontSize: "1.1rem", color: "var(--accent-indigo)", cursor: "pointer", textDecoration: "underline" }}>{upd.toolName} ↗</div>
                            <p style={{ marginTop: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{upd.content}</p>
                            
                            {(upd.suggestedCat || (upd.suggestedTags && upd.suggestedTags.length > 0)) && (
                              <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                                {upd.suggestedCat && (
                                  <div style={{ background: "var(--accent-indigo)10", padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--accent-indigo)" }}>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 950, color: "var(--accent-indigo)", display: "block", marginBottom: "4px" }}>추천 카테고리</span>
                                    <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text-primary)" }}>{upd.suggestedCat}</span>
                                  </div>
                                )}
                                {upd.suggestedTags && upd.suggestedTags.length > 0 && (
                                  <div style={{ background: "var(--accent-emerald)10", padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--accent-emerald)" }}>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 950, color: "var(--accent-emerald)", display: "block", marginBottom: "4px" }}>추천 태그</span>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                      {upd.suggestedTags.map(t => <span key={t} style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>#{t}</span>)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              선택된 보고서가 없거나 로딩 중입니다.
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminReports;
