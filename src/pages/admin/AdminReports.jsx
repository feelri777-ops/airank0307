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
  getDocs,
  addDoc,
  writeBatch,
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
  ArrowUpRight,
  Trophy,
  X,
  CaretDown,
  CaretUp
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

// --- 랭킹 갱신 제안 미리보기 컴포넌트 ---
const RankingUpdateView = ({ report, onApprove, onReject }) => {
  const [showAll, setShowAll] = useState(false);
  const [approving, setApproving] = useState(false);
  const tools = report.data?.tools || [];
  const preview = showAll ? tools : tools.slice(0, 10);
  const isApproved = report.status === "approved";
  const isRejected = report.status === "rejected";

  return (
    <div>
      {/* 상태 배너 */}
      {isApproved && (
        <div style={{ padding: "12px 20px", borderRadius: "12px", background: "#10b98115", border: "1px solid #10b981", color: "#10b981", fontWeight: 800, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle size={20} weight="fill" /> 승인 완료 — 랭킹이 실제 DB에 반영되었습니다.
        </div>
      )}
      {isRejected && (
        <div style={{ padding: "12px 20px", borderRadius: "12px", background: "#ef444415", border: "1px solid #ef4444", color: "#ef4444", fontWeight: 800, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <WarningCircle size={20} weight="fill" /> 거부됨 — 이 랭킹 제안은 반영되지 않았습니다.
        </div>
      )}

      {/* 미리보기 테이블 */}
      <div style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-secondary)", textAlign: "left" }}>
              {["순위","변동","도구명","카테고리","이용량","기술력","버즈","실무","상승","총점","가격","한국어"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 900, color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((tool, idx) => (
              <tr key={idx} style={{ borderTop: "1px solid var(--border-color)", background: idx % 2 === 0 ? "transparent" : "var(--bg-secondary)" }}>
                <td style={{ padding: "10px 14px", fontWeight: 900, color: "var(--accent-indigo)" }}>#{tool.Rank}</td>
                <td style={{ padding: "10px 14px", fontWeight: 800, color: tool.Change === "NEW" ? "#10b981" : tool.Change?.startsWith("+") ? "#10b981" : "#ef4444" }}>{tool.Change}</td>
                <td style={{ padding: "10px 14px", fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                  <a href={tool.URL} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{tool.Name} ↗</a>
                </td>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>{tool.Category}</td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{tool.Usage_Score}</td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{tool.Tech_Score}</td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{tool.Buzz_Score}</td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{tool.Utility_Score}</td>
                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{tool.Growth_Score}</td>
                <td style={{ padding: "10px 14px", fontWeight: 900, color: "var(--text-primary)" }}>{tool.Total_Score}</td>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>{tool.Pricing}</td>
                <td style={{ padding: "10px 14px", color: tool.Korean_Support === "Y" ? "#10b981" : "var(--text-muted)" }}>{tool.Korean_Support}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 더보기 토글 */}
      {tools.length > 10 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{ width: "100%", marginTop: "12px", padding: "10px", borderRadius: "12px", border: "1px dashed var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          {showAll ? <><CaretUp size={16} /> 상위 10위만 보기</> : <><CaretDown size={16} /> 전체 {tools.length}개 펼쳐보기</>}
        </button>
      )}

      {/* 승인/거부 버튼 */}
      {!isApproved && !isRejected && (
        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button
            onClick={() => { setApproving(true); onApprove().finally(() => setApproving(false)); }}
            disabled={approving}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "none", background: "var(--accent-indigo)", color: "#fff", fontWeight: 900, cursor: approving ? "not-allowed" : "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: approving ? 0.6 : 1 }}
          >
            <CheckCircle size={20} weight="fill" />
            {approving ? "반영 중…" : "✅ 승인 — 실제 랭킹에 반영하기"}
          </button>
          <button
            onClick={onReject}
            disabled={approving}
            style={{ padding: "14px 24px", borderRadius: "14px", border: "1px solid #ef4444", background: "#ef444415", color: "#ef4444", fontWeight: 900, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <X size={20} weight="bold" /> 거부
          </button>
        </div>
      )}
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

  // --- ranking_update 승인: tools 컬렉션 배치 업데이트 및 백업 ---
  const handleApproveRanking = async (report) => {
    if (!window.confirm(`총 ${report.data?.tools?.length || 0}개 도구 랭킹을 실제 DB에 반영할까요?\n기존 랭킹은 자동 백업되며 이 작업 후 롤백이 가능합니다.`)) return;
    const newTools = report.data?.tools || [];
    try {
      // 1. 기존 tools 컬렉션 전체 가져오기 (백업용)
      const toolsSnap = await getDocs(collection(db, "tools"));
      const currentTools = toolsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. adminReports 컬렉션에 백업 문서 저장
      await addDoc(collection(db, "adminReports"), {
        type: "ranking_backup",
        title: "랭킹 덮어쓰기 백업",
        summary: `이전 랭킹 상태 백업 (${currentTools.length}개 도구)`,
        data: { tools: currentTools },
        createdAt: new Date(),
        targetReportId: report.id
      });

      // 3. 500개 배치 한도 고려 — 100개이므로 단일 배치 OK
      const batch = writeBatch(db);
      newTools.forEach(tool => {
        if (!tool.Name) return;
        // tools 컬렉션의 docId는 Rank 기반으로 매핑 (기존 구조 유지)
        const toolRef = doc(db, "tools", String(tool.Rank));
        batch.set(toolRef, {
          rank: tool.Rank,
          change: tool.Change,
          name: tool.Name,
          url: tool.URL,
          cat: tool.Category,
          tags: Array.isArray(tool.Tags) ? tool.Tags : [],
          desc: tool.Description,
          oneLineReview: tool.One_Line_Review,
          usp: tool.USP,
          prosCons: tool.Pros_Cons,
          difficulty: tool.Difficulty,
          score: tool.Total_Score,
          metrics: {
            usage: tool.Usage_Score,
            tech: tool.Tech_Score,
            buzz: tool.Buzz_Score,
            utility: tool.Utility_Score,
            growth: tool.Growth_Score,
          },
          pricing: tool.Pricing,
          koSupport: tool.Korean_Support,
          platform: tool.Platform,
          weekLabel: report.data?.weekLabel || "",
          updatedAt: new Date(),
          updatedByAgent: true,
        }, { merge: true });
      });
      await batch.commit();
      // 리포트 상태 approved로 변경
      await updateDoc(doc(db, "adminReports", report.id), { status: "approved", approvedAt: new Date() });
      alert(`✅ ${newTools.length}개 도구 랭킹 반영 및 기존 랭킹 백업이 완료되었습니다!`);
    } catch (err) {
      alert("❌ 반영 중 오류: " + err.message);
    }
  };

  // --- ranking_backup 복원 (롤백) ---
  const handleRestoreBackup = async (report) => {
    if (!window.confirm("이 백업 시점의 랭킹 데이터로 덮어씌워 롤백하시겠습니까?\n현재 웹에서 표시되는 랭킹 데이터는 지금의 백업 데이터로 대체됩니다.")) return;
    const backupTools = report.data?.tools || [];
    try {
      const batch = writeBatch(db);
      backupTools.forEach(tool => {
        if (!tool.id) return;
        const toolRef = doc(db, "tools", String(tool.id));
        const { id, ...dataToRestore } = tool;
        batch.set(toolRef, dataToRestore);
      });
      await batch.commit();
      
      await updateDoc(doc(db, "adminReports", report.id), { 
        restored: true, 
        restoredAt: new Date(),
        summary: `[복원 완료] 이전 랭킹 상태 백업 (${backupTools.length}개 도구)`
      });
      alert("✅ 랭킹 데이터가 성공적으로 롤백 복원되었습니다!");
    } catch (err) {
      alert("❌ 롤백 중 오류: " + err.message);
    }
  };

  // --- ranking_update 거부 ---
  const handleRejectRanking = async (report) => {
    if (!window.confirm("이 랭킹 제안을 거부하시겠습니까? 데이터는 보존됩니다.")) return;
    await updateDoc(doc(db, "adminReports", report.id), { status: "rejected", rejectedAt: new Date() });
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
                  <span style={{ 
                    fontSize: "0.65rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 900,
                    background: r.type === "ranking_update" ? "#f59e0b" : r.type === "ranking_backup" ? "#10b981" : "#6366f1",
                    color: "#fff"
                  }}>
                    {r.type === "ranking_update" ? "🏆 RANKING" : r.type === "ranking_backup" ? "🛡️ BACKUP" : r.type === "new_tool_recommendation" ? "✨ NEW TOOL" : r.type.toUpperCase()}
                  </span>
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
                     {activeReport.type === "new_tool_recommendation" ? "✨ 신규 AI 도구 도입 제안"
                      : activeReport.type === "ranking_update" ? "🏆 AI 랭킹 갱신 제안"
                      : activeReport.type === "ranking_backup" ? "🛡️ 랭킹 덮어쓰기 백업"
                      : "📊 통합 분석 및 점검 보고서"}
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

              {/* [2] RANKING UPDATE */}
              {activeReport.type === "ranking_update" && (
                <RankingUpdateView
                  report={activeReport}
                  onApprove={() => handleApproveRanking(activeReport)}
                  onReject={() => handleRejectRanking(activeReport)}
                />
              )}

              {/* [2.5] RANKING BACKUP */}
              {activeReport.type === "ranking_backup" && (
                <div style={{ background: "var(--bg-secondary)", padding: "30px", borderRadius: "24px", border: "1px solid var(--border-primary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <CheckCircle size={28} weight="fill" color="var(--accent-emerald)" />
                    <h3 style={{ fontSize: "1.4rem", fontWeight: 950, margin: 0, color: "var(--text-primary)" }}>{activeReport.title || "랭킹 백업 데이터"}</h3>
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "24px" }}>
                    이 백업은 랭킹이 새롭게 승인되어 업데이트될 때 자동 생성되었습니다. 총 <strong>{activeReport.data?.tools?.length || 0}개</strong>의 이전 도구 데이터를 안전하게 보존하고 있습니다.
                  </p>
                  
                  <div style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "16px", border: "1px dashed var(--border-color)", marginBottom: "30px" }}>
                    <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: "8px" }}>
                      <li>이 백업을 활용하면 문제가 발생했을 때 즉시 원래 상태로 롤백할 수 있습니다.</li>
                      <li>롤백 실행 시 현재 라이브 서비스에 있는 툴 랭킹 정보 위에 이 백업 정보가 전부 덮어씌워집니다.</li>
                      <li>상태: {activeReport.restored ? <strong style={{ color: "var(--accent-emerald)" }}>복원 완료 ({activeReport.restoredAt?.toDate().toLocaleString()})</strong> : <strong>안전하게 보관 중</strong>}</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleRestoreBackup(activeReport)}
                    style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: "var(--accent-emerald)", color: "#fff", fontWeight: 900, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                  >
                    <ArrowClockwise size={22} weight="bold" />
                    이 백업 시점으로 기존 랭킹 롤백(원상복구)
                  </button>
                </div>
              )}

              {/* [3] ERROR & UPDATE (SCOUT FULL TYPE) */}
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
