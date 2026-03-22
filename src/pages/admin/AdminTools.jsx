import { useEffect, useState } from "react";
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, query, onSnapshot
} from "firebase/firestore";
import { db } from "../../firebase";

import { 
  Plus, 
  ArrowClockwise, 
  MagnifyingGlass,
  PencilSimple,
  TrashSimple,
  Eye,
  EyeSlash,
  ChartLineUp,
  X
} from "../../components/icons/PhosphorIcons";

const CAT_OPTIONS = [
  { value: "multimodal", label: "멀티모달" },
  { value: "text", label: "텍스트" },
  { value: "image", label: "이미지" },
  { value: "video", label: "비디오" },
  { value: "audio", label: "오디오/음악" },
  { value: "code", label: "코드" },
  { value: "search", label: "연구/검색" },
  { value: "agent", label: "에이전트" },
  { value: "other", label: "기타" },
];

const LIFE_OPTIONS = [
  "office", "student", "freelancer", "marketer", "startup", "creator", "developer"
];

const EMPTY_FORM = {
  icon: "🤖", name: "", nameKo: "", cat: "text", free: true,
  desc: "", url: "", features: "", tags: "",
  naverKw: "", yt: "", ytKo: "",
  life: [], manualScore: "", pinnedRank: "", hidden: false,
  opr: "", ntv: "", ghs: "", sns: "",
};

function ToolLogo({ tool }) {
  const [error, setError] = useState(false);
  let faviconUrl = null;
  try {
    if (tool.url) faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=64`;
  } catch (e) {
    faviconUrl = null;
  }
  return (
    <div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {!error && faviconUrl ? (
        <img
          src={faviconUrl}
          alt={tool.name}
          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "8px" }}
          onError={() => setError(true)}
        />
      ) : (
        <span style={{ fontSize: "1.8rem" }}>{tool.icon}</span>
      )}
    </div>
  );
}

// 현대적인 입력창 스타일
const commonInputStyle = {
  width: "100%", padding: "12px 16px", fontSize: "0.9rem",
  border: "1px solid var(--border-primary)", background: "var(--bg-card)",
  color: "var(--text-primary)", borderRadius: "14px", outline: "none", 
  boxSizing: "border-box", transition: "all 0.2s"
};

const labelStyle = { 
  fontSize: "0.8rem", fontWeight: 800, color: "var(--text-secondary)", 
  marginBottom: "6px", display: "block", marginLeft: "4px" 
};

function ToolFormModal({ tool, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (!tool) return EMPTY_FORM;
    return {
      icon: tool.icon ?? "🤖",
      name: tool.name ?? "",
      nameKo: tool.nameKo ?? "",
      cat: tool.cat ?? "text",
      free: tool.free ?? true,
      desc: tool.desc ?? "",
      url: tool.url ?? "",
      features: Array.isArray(tool.features) ? tool.features.join("\n") : "",
      tags: Array.isArray(tool.tags) ? tool.tags.join(", ") : "",
      naverKw: Array.isArray(tool.naverKw) ? tool.naverKw.join(", ") : "",
      yt: tool.yt ?? "",
      ytKo: tool.ytKo ?? "",
      life: Array.isArray(tool.life) ? tool.life : [],
      manualScore: tool.manualScore != null ? String(tool.manualScore) : "",
      pinnedRank: tool.pinnedRank != null ? String(tool.pinnedRank) : "",
      hidden: tool.hidden ?? false,
      opr: tool.metrics?.opr != null ? String(tool.metrics.opr) : "",
      ntv: tool.metrics?.ntv != null ? String(tool.metrics.ntv) : "",
      ghs: tool.metrics?.ghs != null ? String(tool.metrics.ghs) : "",
      sns: tool.metrics?.sns != null ? String(tool.metrics.sns) : "",
    };
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleLife = (v) => set("life", form.life.includes(v)
    ? form.life.filter(l => l !== v)
    : [...form.life, v]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("툴 이름을 입력해주세요.");
    setSaving(true);
    try {
      const data = {
        icon: form.icon.trim() || "🤖",
        name: form.name.trim(),
        nameKo: form.nameKo.trim(),
        cat: form.cat,
        free: form.free,
        desc: form.desc.trim(),
        url: form.url.trim(),
        features: form.features.split("\n").map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
        naverKw: form.naverKw.split(",").map(s => s.trim()).filter(Boolean),
        yt: form.yt.trim() || null,
        ytKo: form.ytKo.trim() || null,
        life: form.life,
        pinnedRank: form.pinnedRank !== "" ? Number(form.pinnedRank) : null,
        hidden: form.hidden,
        metrics: {
          opr: form.opr !== "" ? Number(form.opr) : null,
          ntv: form.ntv !== "" ? Number(form.ntv) : null,
          ghs: form.ghs !== "" ? Number(form.ghs) : null,
          sns: form.sns !== "" ? Number(form.sns) : null,
        },
        manualScore: (() => {
          if (form.manualScore !== "") return Number(form.manualScore);
          const { opr, ntv, ghs, sns } = {
            opr: form.opr !== "" ? Number(form.opr) : null,
            ntv: form.ntv !== "" ? Number(form.ntv) : null,
            ghs: form.ghs !== "" ? Number(form.ghs) : null,
            sns: form.sns !== "" ? Number(form.sns) : null,
          };
          if (opr != null && ntv != null && ghs != null && sns != null) {
            return Number((opr * 0.5 + ntv * 0.25 + sns * 0.15 + ghs * 0.1).toFixed(2));
          }
          return null;
        })(),
        updatedAt: serverTimestamp(),
      };
      await onSave(data);
      onClose();
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "var(--modal-overlay)", backdropFilter: "blur(12px)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} style={{
        background: "var(--bg-card)", width: "100%", maxWidth: "700px",
        maxHeight: "90vh", overflowY: "auto", padding: "2.5rem",
        borderRadius: "32px", border: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-lg)", position: "relative"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 950, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {tool ? "엔진 제원 수정" : "신규 엔진 등록"}
          </h2>
          <button type="button" onClick={onClose} style={{ background: "var(--bg-secondary)", border: "none", borderRadius: "12px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
            <X size={20} weight="bold" />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>아이콘</label>
            <input style={{...commonInputStyle, textAlign: "center", fontSize: "1.5rem"}} value={form.icon} onChange={e => set("icon", e.target.value)} maxLength={4} />
          </div>
          <div>
            <label style={labelStyle}>엔진 이름 (영문) *</label>
            <input style={commonInputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="예: ChatGPT" required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>표기 이름 (한글)</label>
            <input style={commonInputStyle} value={form.nameKo} onChange={e => set("nameKo", e.target.value)} placeholder="예: 챗지피티" />
          </div>
          <div>
            <label style={labelStyle}>카테고리</label>
            <select style={commonInputStyle} value={form.cat} onChange={e => set("cat", e.target.value)}>
              {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>공식 엔드포인트 URL</label>
          <input style={commonInputStyle} value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://..." />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>핵심 설명</label>
          <textarea style={{ ...commonInputStyle, height: "80px", resize: "none" }} value={form.desc} onChange={e => set("desc", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>태그 (쉼표 구분)</label>
            <input style={commonInputStyle} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="AI, 챗봇, 무료" />
          </div>
          <div>
            <label style={labelStyle}>네이버 키워드</label>
            <input style={commonInputStyle} value={form.naverKw} onChange={e => set("naverKw", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>활용 타겟 세그먼트</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {LIFE_OPTIONS.map(v => (
              <button key={v} type="button"
                onClick={() => toggleLife(v)}
                style={{
                  padding: "8px 16px", fontSize: "0.85rem", borderRadius: "12px", cursor: "pointer",
                  border: "1px solid var(--border-primary)",
                  background: form.life.includes(v) ? "var(--accent-indigo)" : "var(--bg-card)",
                  color: form.life.includes(v) ? "#fff" : "var(--text-secondary)",
                  fontWeight: 800, transition: "all 0.2s"
                }}
              >{v.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "20px", marginBottom: "2rem" }}>
          <label style={{ ...labelStyle, marginBottom: "12px", color: "var(--text-primary)" }}>성능 메트릭 (0~100)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { key: "opr", label: "GOOGLE" },
              { key: "ntv", label: "NAVER" },
              { key: "sns", label: "SNS" },
              { key: "ghs", label: "GITHB" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: "0.7rem", fontWeight: 900, marginBottom: "4px", display: "block", textAlign: "center", color: "var(--text-muted)" }}>{label}</label>
                <input
                  style={{...commonInputStyle, padding: "8px", textAlign: "center", fontWeight: 900}} type="number" min="0" max="100" step="0.01"
                  value={form[key]} onChange={e => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "16px", borderRadius: "16px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 800 }}>
            취소
          </button>
          <button type="submit" disabled={saving}
            style={{ flex: 2, padding: "16px", borderRadius: "16px", border: "none", background: "var(--accent-indigo)", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: "1rem", boxShadow: "0 8px 16px -4px var(--accent-indigo)40" }}>
            {saving ? "저장 중..." : (tool ? "변경 사항 적용" : "엔진 가동 시작")}
          </button>
        </div>
      </form>
    </div>
  );
}

function HistoryModal({ tool, onClose }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      const results = [];
      const promises = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        return fetch(`/history/scores-${dateStr}.json`).then(r => r.ok ? r.json() : null)
          .then(data => data ? { date: dateStr, data } : null).catch(() => null);
      });
      const settled = await Promise.all(promises);
      for (const item of settled) {
        if (!item || !item.data.tools?.[String(tool.id)]) continue;
        const toolScore = item.data.tools[String(tool.id)];
        const allScores = Object.entries(item.data.tools).map(([id, v]) => ({ id, score: v.score || 0 })).sort((a, b) => b.score - a.score);
        results.push({ date: item.date, rank: allScores.findIndex(t => t.id === String(tool.id)) + 1, score: toolScore.score, change: toolScore.change });
      }
      setHistory(results.sort((a, b) => b.date.localeCompare(a.date)));
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [tool.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "500px", maxHeight: "80vh", overflowY: "auto", borderRadius: "24px", border: "1px solid var(--border-primary)", padding: "2rem", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 950, color: "var(--text-primary)" }}>{tool.icon} {tool.name} 트렌드</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} weight="bold" /></button>
        </div>
        {loadingHistory ? <div style={{ textAlign: "center", padding: "2rem" }}>분석 중...</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map(h => (
              <div key={h.date} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>{h.date}</span>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 900, color: "var(--accent-indigo)" }}>#{h.rank}</span>
                  <span style={{ fontSize: "0.8rem", color: (h.change || 0) > 0 ? "#22c55e" : "#ef4444", fontWeight: 800 }}>
                    {(h.change || 0) > 0 ? "+" : ""}{(h.change || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [historyTool, setHistoryTool] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "tools"), orderBy("score", "desc"));
    
    // 실시간 리스너로 변경하여 수정 즉시 리스트에 반영되도록 함
    const unsubscribe = onSnapshot(q, (snap) => {
      setTools(snap.docs.map(d => ({ ...d.data(), _docId: d.id, id: Number(d.id) })));
      setLoading(false);
    }, (err) => {
      console.error("Fetch error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (data) => {
    if (editingTool?._docId) {
      await updateDoc(doc(db, "tools", editingTool._docId), data);
    } else {
      const nextId = Math.max(0, ...tools.map(t => Number(t.id) || 0)) + 1;
      await addDoc(collection(db, "tools"), { ...data, id: nextId, score: 0, change: 0, createdAt: serverTimestamp() });
    }
    // onSnapshot이 자동으로 업데이트하므로 fetchTools 제거
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "tools", id));
    // onSnapshot이 자동으로 업데이트하므로 fetchTools 제거
  };

  const filtered = tools.filter(t => {
    if (!showHidden && t.hidden) return false;
    if (catFilter !== "all" && t.cat !== catFilter) return false;
    if (search && !(t.name?.toLowerCase().includes(search.toLowerCase()) || t.nameKo?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const ranked = [...filtered]
    .map(t => ({ ...t, _effectiveScore: t.manualScore != null ? t.manualScore : (t.score || 0) }))
    .sort((a, b) => b._effectiveScore - a._effectiveScore)
    .map((t, i) => ({ ...t, _rank: i + 1 }));

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 950, color: "var(--text-primary)", letterSpacing: "-0.04em", marginBottom: "0.2rem" }}>엔진 마스터 관리</h1>
          <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>총 {tools.length}개의 AI 엔진이 시스템 베이스에 등록되어 있습니다.</p>
        </div>
        <button onClick={() => setEditingTool(false)} style={{ padding: "12px 24px", background: "var(--text-primary)", color: "var(--bg-primary)", border: "none", borderRadius: "14px", fontWeight: 900, cursor: "pointer", boxShadow: "var(--shadow-md)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={20} weight="bold" /> 새 엔진 등록
        </button>
      </header>

      <div style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", background: "var(--bg-card)", padding: "1rem", borderRadius: "20px", border: "1px solid var(--border-primary)", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <MagnifyingGlass size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="엔진 명칭 검색..." style={{ ...commonInputStyle, paddingLeft: "42px", border: "none", background: "var(--bg-secondary)" }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...commonInputStyle, width: "150px", border: "none", background: "var(--bg-secondary)", fontWeight: 800 }}>
          <option value="all">모든 카테고리</option>
          {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => setShowHidden(!showHidden)} style={{ padding: "0 16px", height: "45px", borderRadius: "12px", border: "1px solid var(--border-primary)", background: showHidden ? "var(--bg-tertiary)" : "var(--bg-secondary)", color: showHidden ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>
          {showHidden ? <><Eye size={16} style={{verticalAlign:"middle", marginRight:"4px"}}/>숨김 툴 표시중</> : <><EyeSlash size={16} style={{verticalAlign:"middle", marginRight:"4px"}}/>숨김 툴 가리기</>}
        </button>
        <button onClick={() => window.location.reload()} style={{ background: "var(--bg-secondary)", border: "none", borderRadius: "12px", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
          <ArrowClockwise size={20} weight="bold" />
        </button>
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "4rem", fontWeight: 800 }}>엔진 시퀀스 로드 중...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ranked.map(tool => (
            <div key={tool._docId} style={{ 
              display: "grid", gridTemplateColumns: "80px 60px 1fr 320px 100px 120px", 
              alignItems: "center", padding: "1.2rem 1.5rem", background: tool.hidden ? "var(--bg-secondary)" : "var(--bg-card)",
              borderRadius: "20px", border: "1px solid var(--border-primary)", opacity: tool.hidden ? 0.6 : 1,
              transition: "transform 0.2s"
            }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "var(--accent-indigo)" }}>#{tool.pinnedRank || tool._rank}</div>
              <ToolLogo tool={tool} />
              <div style={{ paddingRight: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button onClick={() => setHistoryTool(tool)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)" }}>{tool.name}</button>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "6px" }}>{(tool.cat || "etc").toUpperCase()}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px", fontWeight: 500 }}>{tool.nameKo}</div>
              </div>
              
              {/* 세부 점수 섹션: 가로 1행으로 변경 */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "0.75rem", fontWeight: 800 }}>
                {[
                  { label: "구글", val: tool.metrics?.opr, color: "#4285F4" },
                  { label: "네이버", val: tool.metrics?.ntv, color: "#03C75A" },
                  { label: "SNS", val: tool.metrics?.sns, color: "#818cf8" },
                  { label: "깃허브", val: tool.metrics?.ghs, color: "#6e5494" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}>
                    <span style={{ color: m.color }}>{m.label}:</span>
                    <span style={{ color: "var(--text-primary)" }}>{(m.val || 0).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)" }}>TOTAL</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text-primary)" }}>{(tool.score || 0).toFixed(1)}</div>
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={() => setEditingTool(tool)} style={{ width: "40px", height: "40px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
                  <PencilSimple size={18} weight="bold" />
                </button>
                <button onClick={async () => {
                  if(window.confirm("삭제하시겠습니까?")) {
                    await deleteDoc(doc(db, "tools", tool._docId));
                  }
                }} style={{ width: "40px", height: "40px", borderRadius: "10px", border: "none", background: "#ef444415", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444" }}>
                  <TrashSimple size={18} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingTool !== null && <ToolFormModal tool={editingTool || null} onSave={handleSave} onClose={() => setEditingTool(null)} />}
      {historyTool && <HistoryModal tool={historyTool} onClose={() => setHistoryTool(null)} />}
    </div>
  );
}
