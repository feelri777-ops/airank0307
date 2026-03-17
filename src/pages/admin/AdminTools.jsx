import { useEffect, useState, useRef } from "react";
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, query
} from "firebase/firestore";
import { db } from "../../firebase";

const CAT_OPTIONS = [
  { value: "text", label: "텍스트" },
  { value: "image", label: "이미지" },
  { value: "video", label: "비디오" },
  { value: "audio", label: "오디오" },
  { value: "code", label: "코드" },
  { value: "search", label: "검색" },
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
        // 세부점수가 모두 입력된 경우 종합점수 자동 계산 (가중치: 구글50% 네이버25% SNS15% GitHub10%)
        // manualScore가 직접 입력된 경우 우선 적용
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

  const inputStyle = {
    width: "100%", padding: "7px 10px", fontSize: "0.88rem",
    border: "1px solid var(--border-primary)", background: "var(--bg-primary)",
    color: "var(--text-primary)", borderRadius: "0", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} style={{
        background: "var(--bg-card)", width: "100%", maxWidth: "600px",
        maxHeight: "90vh", overflowY: "auto", padding: "1.5rem",
        border: "1px solid var(--border-primary)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
            {tool ? "툴 수정" : "새 툴 등록"}
          </h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>아이콘 (이모지)</label>
            <input style={inputStyle} value={form.icon} onChange={e => set("icon", e.target.value)} maxLength={4} />
          </div>
          <div>
            <label style={labelStyle}>툴 이름 (영문) *</label>
            <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="ChatGPT" required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>툴 이름 (한글)</label>
            <input style={inputStyle} value={form.nameKo} onChange={e => set("nameKo", e.target.value)} placeholder="챗지피티" />
          </div>
          <div>
            <label style={labelStyle}>카테고리</label>
            <select style={inputStyle} value={form.cat} onChange={e => set("cat", e.target.value)}>
              {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>공식 URL</label>
          <input style={inputStyle} value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://chatgpt.com" />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>설명</label>
          <textarea style={{ ...inputStyle, height: "72px", resize: "vertical" }} value={form.desc} onChange={e => set("desc", e.target.value)} />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>주요 기능 (줄바꿈으로 구분)</label>
          <textarea style={{ ...inputStyle, height: "90px", resize: "vertical" }} value={form.features} onChange={e => set("features", e.target.value)} placeholder={"기능 1\n기능 2\n기능 3"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>태그 (쉼표 구분)</label>
            <input style={inputStyle} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="텍스트, 무료, API" />
          </div>
          <div>
            <label style={labelStyle}>네이버 검색 키워드 (쉼표 구분)</label>
            <input style={inputStyle} value={form.naverKw} onChange={e => set("naverKw", e.target.value)} placeholder="ChatGPT, 챗지피티" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>유튜브 검색어 (영문)</label>
            <input style={inputStyle} value={form.yt} onChange={e => set("yt", e.target.value)} placeholder="ChatGPT tutorial" />
          </div>
          <div>
            <label style={labelStyle}>유튜브 검색어 (한글)</label>
            <input style={inputStyle} value={form.ytKo} onChange={e => set("ytKo", e.target.value)} placeholder="챗지피티 사용법" />
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>활용 분야</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {LIFE_OPTIONS.map(v => (
              <button key={v} type="button"
                onClick={() => toggleLife(v)}
                style={{
                  padding: "4px 10px", fontSize: "0.78rem", borderRadius: "0", cursor: "pointer",
                  border: "1px solid var(--border-primary)",
                  background: form.life.includes(v) ? "var(--accent-indigo)" : "var(--bg-tertiary)",
                  color: form.life.includes(v) ? "#fff" : "var(--text-secondary)",
                  fontWeight: form.life.includes(v) ? 700 : 400,
                }}
              >{v}</button>
            ))}
          </div>
        </div>

        {/* 세부 점수 */}
        <div style={{ marginBottom: "12px" }}>
          <label style={{ ...labelStyle, marginBottom: "8px" }}>세부 점수 (0~100, 비워두면 자동 갱신값 사용)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
            {[
              { key: "opr", label: "구글(OPR) 50%" },
              { key: "ntv", label: "네이버(NTV) 25%" },
              { key: "sns", label: "SNS 15%" },
              { key: "ghs", label: "GitHub 10%" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ ...labelStyle, marginBottom: "3px" }}>{label}</label>
                <input
                  style={inputStyle} type="number" min="0" max="100" step="0.01"
                  value={form[key]} onChange={e => set(key, e.target.value)}
                  placeholder="0~100"
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>수동 점수 (비워두면 자동)</label>
            <input style={inputStyle} type="number" min="0" max="100" step="0.01"
              value={form.manualScore} onChange={e => set("manualScore", e.target.value)}
              placeholder="예: 85.5" />
          </div>
          <div>
            <label style={labelStyle}>순위 고정 (비워두면 자동)</label>
            <input style={inputStyle} type="number" min="1"
              value={form.pinnedRank} onChange={e => set("pinnedRank", e.target.value)}
              placeholder="예: 1" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={labelStyle}>옵션</label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form.free} onChange={e => set("free", e.target.checked)} />
              무료 플랜 있음
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form.hidden} onChange={e => set("hidden", e.target.checked)} />
              목록에서 숨기기
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "8px 20px", border: "1px solid var(--border-primary)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600, borderRadius: "0" }}>
            취소
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: "8px 24px", border: "none", background: "var(--accent-indigo, #6366f1)", color: "#fff", cursor: "pointer", fontWeight: 700, borderRadius: "0", opacity: saving ? 0.7 : 1 }}>
            {saving ? "저장 중..." : (tool ? "수정 완료" : "등록")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminTools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [editingTool, setEditingTool] = useState(null);    // null=닫힘, false=신규, obj=수정
  const [deleting, setDeleting] = useState(null);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "tools"), orderBy("score", "desc")));
      setTools(snap.docs.map(d => ({ _docId: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTools(); }, []);

  const handleSave = async (data) => {
    if (editingTool && editingTool._docId) {
      // 수정
      await updateDoc(doc(db, "tools", editingTool._docId), data);
      setTools(prev => prev.map(t =>
        t._docId === editingTool._docId ? { ...t, ...data } : t
      ));
    } else {
      // 신규 등록
      const nextId = Math.max(0, ...tools.map(t => Number(t.id) || 0)) + 1;
      const newData = { ...data, id: nextId, score: 0, change: 0, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, "tools"), newData);
      setTools(prev => [...prev, { _docId: ref.id, ...newData }]);
    }
  };

  const handleDelete = async (tool) => {
    if (!window.confirm(`"${tool.name}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(tool._docId);
    try {
      await deleteDoc(doc(db, "tools", tool._docId));
      setTools(prev => prev.filter(t => t._docId !== tool._docId));
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleHidden = async (tool) => {
    const newHidden = !tool.hidden;
    await updateDoc(doc(db, "tools", tool._docId), { hidden: newHidden, updatedAt: serverTimestamp() });
    setTools(prev => prev.map(t => t._docId === tool._docId ? { ...t, hidden: newHidden } : t));
  };

  const filtered = tools.filter(t => {
    if (!showHidden && t.hidden) return false;
    if (catFilter !== "all" && t.cat !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.name?.toLowerCase().includes(q) || t.nameKo?.toLowerCase().includes(q));
    }
    return true;
  });

  // 순위 계산: manualScore/pinnedRank 적용
  const ranked = [...filtered]
    .map(t => ({ ...t, _effectiveScore: t.manualScore != null ? t.manualScore : (t.score || 0) }))
    .sort((a, b) => b._effectiveScore - a._effectiveScore)
    .map((t, i) => ({ ...t, _rank: i + 1 }));

  const thStyle = {
    padding: "8px 10px", fontSize: "0.75rem", fontWeight: 700,
    color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid var(--border-primary)",
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "8px 10px", fontSize: "0.84rem", borderBottom: "1px solid var(--border-primary)",
    verticalAlign: "middle",
  };
  const btnStyle = (color) => ({
    padding: "4px 10px", fontSize: "0.75rem", border: "1px solid var(--border-primary)",
    background: color || "var(--bg-tertiary)", color: color ? "#fff" : "var(--text-secondary)",
    cursor: "pointer", fontWeight: 600, borderRadius: "0",
  });

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>🛠️ 툴 관리</h1>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
            총 {tools.length}개 등록 · 노출 {tools.filter(t => !t.hidden).length}개
          </p>
        </div>
        <button
          onClick={() => setEditingTool(false)}
          style={{ padding: "9px 18px", border: "none", background: "var(--accent-indigo, #6366f1)", color: "#fff", fontWeight: 700, cursor: "pointer", borderRadius: "0", fontSize: "0.88rem" }}
        >
          + 새 툴 등록
        </button>
      </div>

      {/* 검색 / 필터 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="툴 이름 검색..."
          style={{ padding: "7px 12px", fontSize: "0.88rem", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)", borderRadius: "0", outline: "none", minWidth: "200px" }}
        />
        <select
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: "7px 10px", fontSize: "0.88rem", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)", borderRadius: "0", cursor: "pointer" }}
        >
          <option value="all">전체 카테고리</option>
          {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.84rem", cursor: "pointer", color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
          숨긴 툴 포함
        </label>
        <button onClick={fetchTools} style={{ ...btnStyle(), marginLeft: "auto" }}>↻ 새로고침</button>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>로딩 중...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)" }}>
                <th style={thStyle}>순위</th>
                <th style={thStyle}>아이콘</th>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>한글명</th>
                <th style={thStyle}>카테고리</th>
                <th style={thStyle}>점수</th>
                <th style={thStyle}>변동</th>
                <th style={thStyle}>수동점수</th>
                <th style={thStyle}>순위고정</th>
                <th style={thStyle}>무료</th>
                <th style={thStyle}>상태</th>
                <th style={thStyle}>관리</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 ? (
                <tr><td colSpan={12} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>검색 결과 없음</td></tr>
              ) : ranked.map(tool => (
                <tr key={tool._docId} style={{ opacity: tool.hidden ? 0.45 : 1, background: tool.hidden ? "var(--bg-tertiary)" : "transparent" }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-indigo)" }}>
                    {tool.pinnedRank != null ? `📌${tool.pinnedRank}` : tool._rank}
                  </td>
                  <td style={{ ...tdStyle, fontSize: "1.2rem", textAlign: "center" }}>{tool.icon}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, maxWidth: "140px" }}>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                      {tool.name}
                    </a>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>{tool.nameKo}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "2px 7px", fontSize: "0.72rem", border: "1px solid var(--border-primary)", borderRadius: "0", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                      {CAT_OPTIONS.find(o => o.value === tool.cat)?.label ?? tool.cat}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{(tool.score || 0).toFixed(1)}</td>
                  <td style={{ ...tdStyle, color: (tool.change || 0) > 0 ? "#22c55e" : (tool.change || 0) < 0 ? "#ef4444" : "var(--text-muted)" }}>
                    {(tool.change || 0) > 0 ? "+" : ""}{(tool.change || 0).toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, color: tool.manualScore != null ? "var(--accent-indigo)" : "var(--text-muted)" }}>
                    {tool.manualScore != null ? tool.manualScore : "—"}
                  </td>
                  <td style={{ ...tdStyle, color: tool.pinnedRank != null ? "var(--accent-indigo)" : "var(--text-muted)" }}>
                    {tool.pinnedRank != null ? `#${tool.pinnedRank}` : "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{tool.free ? "✓" : "—"}</td>
                  <td style={tdStyle}>
                    {tool.hidden
                      ? <span style={{ fontSize: "0.72rem", padding: "2px 6px", background: "#ef4444", color: "#fff", borderRadius: "0" }}>숨김</span>
                      : <span style={{ fontSize: "0.72rem", padding: "2px 6px", background: "#22c55e", color: "#fff", borderRadius: "0" }}>노출</span>
                    }
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => setEditingTool(tool)} style={btnStyle()}>수정</button>
                      <button onClick={() => handleToggleHidden(tool)}
                        style={btnStyle(tool.hidden ? "#6366f1" : undefined)}>
                        {tool.hidden ? "노출" : "숨김"}
                      </button>
                      <button
                        onClick={() => handleDelete(tool)}
                        disabled={deleting === tool._docId}
                        style={btnStyle("#ef4444")}
                      >
                        {deleting === tool._docId ? "..." : "삭제"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {editingTool !== null && (
        <ToolFormModal
          tool={editingTool || null}
          onSave={handleSave}
          onClose={() => setEditingTool(null)}
        />
      )}
    </div>
  );
}
