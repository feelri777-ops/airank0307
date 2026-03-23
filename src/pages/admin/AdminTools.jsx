import { useEffect, useState, useMemo } from "react";
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, query, onSnapshot, writeBatch
} from "firebase/firestore";
import { db } from "../../firebase";

import { 
  Plus, 
  ArrowClockwise, 
  MagnifyingGlass,
  PencilSimple,
  TrashSimple,
  X,
  FileArrowUp
} from "../../components/icons/PhosphorIcons";

const CAT_OPTIONS = [
  { value: "multimodal", label: "멀티모달" },
  { value: "text", label: "텍스트/LLM" },
  { value: "image", label: "이미지" },
  { value: "video", label: "비디오" },
  { value: "audio", label: "오디오/음악" },
  { value: "code", label: "코드" },
  { value: "search", label: "연구/검색" },
  { value: "agent", label: "에이전트" },
  { value: "other", label: "기타" },
];

const EMPTY_FORM = {
  rank: "", change: "-", name: "", url: "", cat: "text", tags: "",
  desc: "", oneLineReview: "", usp: "", prosCons: "", difficulty: "중",
  usage: "", tech: "", buzz: "", utility: "", growth: "", score: "",
  pricing: "Free", koSupport: "미지원", platform: "Web", icon: "🤖", hidden: false,
};

const commonInputStyle = {
  width: "100%", padding: "12px 14px", fontSize: "0.85rem",
  border: "1px solid var(--border-primary)", background: "var(--bg-card)",
  color: "var(--text-primary)", borderRadius: "10px", outline: "none", 
  boxSizing: "border-box", transition: "all 0.2s"
};

const labelStyle = { 
  fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", 
  marginBottom: "4px", display: "block", marginLeft: "2px" 
};

function BulkImportModal({ onImport, onClose }) {
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const dataArray = Array.isArray(parsed) ? parsed : (parsed.tools ? Object.values(parsed.tools) : [parsed]);
      await onImport(dataArray);
      onClose();
    } catch (e) { alert("JSON 파싱 오류: " + e.message); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "600px", borderRadius: "24px", padding: "2rem", border: "1px solid var(--border-primary)" }}>
         <h2 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "1rem" }}>AI 데이터 일괄 등록</h2>
         <textarea style={{ ...commonInputStyle, height: "300px", fontFamily: "monospace", fontSize: "0.8rem", resize: "none" }} placeholder='[ { "name": "Tool Name", ... }, ... ]' value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
         <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid var(--border-primary)", background: "none", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 700 }}>취소</button>
            <button onClick={handleImport} disabled={loading} style={{ flex: 2, padding: "12px", borderRadius: "12px", border: "none", background: "var(--accent-indigo)", color: "#fff", cursor: "pointer", fontWeight: 800 }}>{loading ? "데이터 처리 중..." : "일괄 등록 시작"}</button>
         </div>
      </div>
    </div>
  );
}

function ToolFormModal({ tool, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (!tool) return EMPTY_FORM;
    const m = tool.metrics || {};
    return {
      rank: tool.rank ?? "", change: tool.change ?? "-", name: tool.name ?? "", url: tool.url ?? "",
      cat: tool.cat ?? "text", tags: Array.isArray(tool.tags) ? tool.tags.join(", ") : "",
      desc: tool.desc ?? "", oneLineReview: tool.oneLineReview ?? "", usp: tool.usp ?? "",
      prosCons: tool.prosCons ?? "", difficulty: tool.difficulty ?? "중",
      usage: m.usage ?? "", tech: m.tech ?? "", buzz: m.buzz ?? "",
      utility: m.utility ?? "", growth: m.growth ?? "", score: tool.score ?? "",
      pricing: tool.pricing ?? "Free", koSupport: tool.koSupport ?? "미지원",
      platform: tool.platform ?? "Web", icon: tool.icon ?? "🤖", hidden: tool.hidden ?? false,
    };
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("툴 이름을 입력해주세요.");
    setSaving(true);
    try {
      const data = {
        ...form,
        rank: form.rank !== "" ? Number(form.rank) : null,
        tags: String(form.tags || "").split(",").map(s => s.trim()).filter(Boolean),
        metrics: {
          usage: Number(form.usage) || 0, tech: Number(form.tech) || 0,
          buzz: Number(form.buzz) || 0, utility: Number(form.utility) || 0,
          growth: Number(form.growth) || 0,
        },
        score: Number(form.score) || 0,
        updatedAt: serverTimestamp(),
      };
      await onSave(data);
      onClose();
    } catch (e) { alert("저장 실패: " + e.message); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} style={{ background: "var(--bg-card)", width: "100%", maxWidth: "850px", maxHeight: "90vh", overflowY: "auto", padding: "2.5rem", borderRadius: "32px", border: "1px solid var(--border-primary)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 950, margin: 0 }}>{tool ? "엔진 정보 수정" : "신규 엔진 등록"}</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: "24px" }}>
            <section>
              <h3 style={{ fontSize: "0.85rem", color: "var(--accent-indigo)", marginBottom: "1rem", fontWeight: 900 }}>BASIC INFO</h3>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "12px" }}>
                <div><label style={labelStyle}>아이콘</label><input style={{...commonInputStyle, textAlign:"center"}} value={form.icon} onChange={e=>set("icon", e.target.value)} /></div>
                <div><label style={labelStyle}>이름 *</label><input style={commonInputStyle} value={form.name} onChange={e=>set("name", e.target.value)} required /></div>
                <div><label style={labelStyle}>URL</label><input style={commonInputStyle} value={form.url} onChange={e=>set("url", e.target.value)} /></div>
              </div>
            </section>
            <section>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div><label style={labelStyle}>카테고리</label><select style={commonInputStyle} value={form.cat} onChange={e=>set("cat", e.target.value)}>{CAT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div><label style={labelStyle}>태그</label><input style={commonInputStyle} value={form.tags} onChange={e=>set("tags", e.target.value)} placeholder="GPT, 에이전트" /></div>
                <div><label style={labelStyle}>난이도</label><select style={commonInputStyle} value={form.difficulty} onChange={e=>set("difficulty", e.target.value)}><option value="하">하</option><option value="중">중</option><option value="상">상</option></select></div>
              </div>
            </section>
            <section style={{ background: "var(--bg-secondary)", padding: "1.5rem", borderRadius: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
                {["usage","tech","buzz","utility","growth","score"].map(k=><div key={k}><label style={{...labelStyle, textAlign:"center"}}>{k.toUpperCase()}</label><input style={{...commonInputStyle, textAlign:"center"}} type="number" value={form[k]} onChange={e=>set(k, e.target.value)} /></div>)}
              </div>
            </section>
            <section>
                <label style={labelStyle}>한줄평/강점/장단점</label>
                <input style={{...commonInputStyle, marginBottom: "8px"}} placeholder="한줄평" value={form.oneLineReview} onChange={e=>set("oneLineReview", e.target.value)} />
                <input style={{...commonInputStyle, marginBottom: "8px"}} placeholder="핵심강점" value={form.usp} onChange={e=>set("usp", e.target.value)} />
                <input style={commonInputStyle} placeholder="장단점" value={form.prosCons} onChange={e=>set("prosCons", e.target.value)} />
            </section>
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "2rem" }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "16px", borderRadius: "14px", border: "1px solid var(--border-primary)", background: "none", fontWeight: 800 }}>취소</button>
          <button type="submit" disabled={saving} style={{ flex: 2, padding: "16px", borderRadius: "14px", border: "none", background: "var(--accent-indigo)", color: "#fff", fontWeight: 900 }}>{saving ? "저장 중..." : "확정"}</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminTools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingTool, setEditingTool] = useState(null);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "tools"), orderBy("rank", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTools(snap.docs.map(d => ({ ...d.data(), _docId: d.id })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsubscribe();
  }, []);

  const handleSave = async (data) => {
    if (editingTool?._docId) { await updateDoc(doc(db, "tools", editingTool._docId), data); }
    else { await addDoc(collection(db, "tools"), data); }
  };

  const handleBulkImport = async (dataArray) => {
    const batch = writeBatch(db);
    for (const item of dataArray) {
      if (!item?.name) continue;
      const existing = tools.find(t => String(t.name).toLowerCase() === String(item.name).toLowerCase());
      const cleanData = {
         ...item,
         updatedAt: serverTimestamp(),
         metrics: {
            usage: Number(item.usage || item.Usage_Score) || 0,
            tech: Number(item.tech || item.Tech_Score) || 0,
            buzz: Number(item.buzz || item.Buzz_Score) || 0,
            utility: Number(item.utility || item.Utility_Score) || 0,
            growth: Number(item.growth || item.Growth_Score) || 0,
         },
         score: Number(item.score || item.Total_Score) || 0,
         rank: Number(item.rank || item.Rank) || 0,
         cat: item.cat || item.Category || "text",
         url: item.url || item.URL || "",
         oneLineReview: item.oneLineReview || item.One_Line_Review || "",
         usp: item.usp || item.USP || "",
         prosCons: item.prosCons || item.Pros_Cons || "",
         koSupport: item.koSupport || item.Korean_Support || "",
         platform: item.platform || item.Platform || "",
         desc: item.desc || item.Description || "",
         pricing: item.pricing || item.Pricing || "",
         tags: Array.isArray(item.tags) ? item.tags : (item.Tags ? String(item.Tags).split(",").map(s => s.trim()) : []),
         change: item.change || item.Change || "-",
      };
      if (existing) { batch.update(doc(db, "tools", existing._docId), cleanData); }
      else { batch.set(doc(collection(db, "tools")), cleanData); }
    }
    await batch.commit();
    alert("데이터 싱크 완료");
  };

  const filtered = useMemo(() => 
    tools.filter(t => String(t.name || "").toLowerCase().includes(search.toLowerCase()))
  , [tools, search]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 950, letterSpacing: "-0.04em" }}>WEEKLY AI MAP <span style={{ color: "var(--accent-indigo)" }}>MASTER</span></h1>
          <p style={{ color: "var(--text-secondary)" }}>AI 툴 순위 및 표준 지표를 매주 관리합니다.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowBulk(true)} style={{ padding: "12px 20px", background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "14px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              {FileArrowUp && <FileArrowUp size={20} />} AI JSON 임포트
            </button>
            <button onClick={() => setEditingTool(false)} style={{ padding: "12px 24px", background: "var(--accent-indigo)", color: "#fff", border: "none", borderRadius: "14px", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              {Plus && <Plus size={20} weight="bold" />} 수동 엔진 등록
            </button>
        </div>
      </header>

      <div style={{ position: "relative", marginBottom: "2rem" }}>
        {MagnifyingGlass && <MagnifyingGlass size={20} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />}
        <input style={{ ...commonInputStyle, paddingLeft: "48px" }} placeholder="검색할 AI 이름을 입력하세요..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
        {loading ? <p>데이터 로딩 중...</p> : (
          filtered.length === 0 ? <p>데이터가 없습니다.</p> :
          filtered.map(t => (
            <div key={t._docId} style={{ display: "flex", alignItems: "center", gap: "20px", padding: "1.2rem", background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: "16px" }}>
              <div style={{ width: "40px", fontSize: "1.2rem", fontWeight: 950, color: "var(--accent-indigo)" }}>#{t.rank || "-"}</div>
              <div style={{ fontSize: "1.5rem" }}>{typeof t.icon === 'string' ? t.icon : "🤖"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                 <div style={{ fontWeight: 800, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(t.name || "")} <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "8px" }}>{String(t.change || "-")}</span></div>
                 <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(t.oneLineReview || "")}</div>
              </div>
              <div style={{ textAlign: "right", marginRight: "20px", flexShrink: 0 }}>
                 <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800 }}>TOTAL</div>
                 <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--accent-indigo)" }}>{Number(t.score || 0).toFixed(1)}</div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                 <button onClick={() => setEditingTool(t)} style={{ width: "40px", height: "40px", borderRadius: "12px", border: "1px solid var(--border-primary)", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{PencilSimple && <PencilSimple size={20} />}</button>
                 <button onClick={async () => { if(window.confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "tools", t._docId)); }} style={{ width: "40px", height: "40px", borderRadius: "12px", border: "none", background: "#ef444420", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{TrashSimple && <TrashSimple size={20} />}</button>
              </div>
            </div>
          ))
        )}
      </div>
      {editingTool !== null && <ToolFormModal tool={editingTool || null} onSave={handleSave} onClose={() => setEditingTool(null)} />}
      {showBulk && <BulkImportModal onImport={handleBulkImport} onClose={() => setShowBulk(false)} />}
    </div>
  );
}
