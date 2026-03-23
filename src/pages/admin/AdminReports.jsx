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
  Tag
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
        if (data.length > 0 && !activeReport) setActiveReport(data[0]);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }, (error) => setLoading(false));
    return () => unsubscribe();
  }, []);

  // --- 새로운 탭에서 수정 페이지 열기 ---
  const openEditor = (toolId) => {
    if (!toolId || toolId === "id") {
      alert("⚠️ 이 도구는 ID 정보를 포함하고 있지 않아 직접 수정할 수 없습니다 (분석 단계 스킵 툴 등).");
      return;
    }
    // 새 창에서 열기
    window.open(`/admin/tool-edit/${toolId}`, '_blank');
  };

  const handleApplyFix = async (docId, errorData) => {
    if (!window.confirm("제안된 수정 사항을 실제 데이터베이스(설명글)에 즉시 반영할까요?")) return;
    try {
      const toolRef = doc(db, "tools", docId);
      
      // 제안된 내용을 실제 desc 필드에 업데이트! (AI의 추천을 신뢰)
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
                  <h2 style={{ fontSize: "1.6rem", fontWeight: 950, color: "var(--text-primary)" }}>통합 분석 보고서</h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>대상 도구: {activeReport.data?.totalChecked || 250}개 대상</p>
                </div>
                <button onClick={() => handleDeleteReport(activeReport.id)} style={{ padding: "10px 20px", borderRadius: "14px", border: "none", background: "#ef444415", color: "#ef4444", fontWeight: 800, cursor: "pointer" }}>보고서 삭제</button>
              </div>

              {/* Detected Errors */}
              <div style={{ marginBottom: "3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                  <WarningCircle size={20} color="#ef4444" weight="fill" />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 900 }}>감지된 오류 ({activeReport.data?.errors?.length || 0})</h3>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {activeReport.data?.errors?.map((err, idx) => (
                    <div key={idx} style={{ padding: "24px", borderRadius: "24px", border: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
                      <div 
                        onClick={() => openEditor(err.docId)}
                        style={{ 
                          display: "inline-block", fontWeight: 950, fontSize: "1.2rem", 
                          marginBottom: "12px", color: "var(--accent-indigo)", cursor: "pointer",
                          textDecoration: "underline", textDecorationStyle: "dotted", transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = 0.7}
                        onMouseLeave={(e) => e.target.style.opacity = 1}
                      >
                        {err.toolName} (수정 페이지 새 창 열기 ↗)
                      </div>
                      <div style={{ color: "#ef4444", fontWeight: 800, fontSize: "0.95rem", marginBottom: "10px" }}>이슈: {err.issue}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>제안: {err.suggestedFix}</div>
                      <ToolDiffView error={err} onApply={() => handleApplyFix(err.docId, err)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Information Updates */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                  <Info size={20} color="var(--accent-indigo)" weight="fill" />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 900 }}>정보 업데이트 추천 ({activeReport.data?.updates?.length || 0})</h3>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {activeReport.data?.updates?.map((upd, idx) => (
                    <div key={idx} style={{ padding: "20px", borderRadius: "20px", border: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
                      <div 
                        onClick={() => openEditor(upd.docId)}
                        style={{ fontWeight: 900, marginBottom: "8px", color: "var(--accent-indigo)", cursor: "pointer", textDecoration: "underline" }}
                      >
                        {upd.toolName} (수정 페이지 ↗)
                      </div>
                      <div style={{ color: "var(--text-primary)", fontSize: "0.95rem", lineHeight: 1.6 }}>{upd.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              선택된 보고서가 없습니다.
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
