import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { 
  doc, getDoc, updateDoc, addDoc, collection, serverTimestamp 
} from "firebase/firestore";
import { 
  X, Check, Tag, Info, Globe, NotePencil, Plus
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
  { value: "productivity", label: "생산성" },
  { value: "business", label: "비즈니스" },
  { value: "other", label: "기타" },
];

const LIFE_OPTIONS = [
  "office", "student", "freelancer", "marketer", "startup", "creator", "developer"
];

const AdminToolEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isNew = id === "new";
  
  const [form, setForm] = useState({
    icon: "🤖", name: "", nameKo: "", cat: "text", free: true,
    desc: "", url: "", features: "", tags: "",
    naverKw: "", yt: "", ytKo: "",
    life: [], manualScore: "", pinnedRank: "", hidden: false,
    opr: "", ntv: "", ghs: "", sns: "",
  });

  useEffect(() => {
    const fetchOrInit = async () => {
      setLoading(true);
      if (isNew) {
        // --- 신규 등록 모드: URL 파라미터에서 데이터 추출 ---
        const params = new URLSearchParams(location.search);
        setForm(p => ({
          ...p,
          name: params.get("name") || "",
          url: params.get("url") || "",
          desc: params.get("desc") || "",
          cat: params.get("cat") || "text",
          tags: params.get("tags") || "",
          icon: "🚀", // 신규 툴은 로켓 아이콘으로 시작
        }));
        setLoading(false);
      } else {
        // --- 기존 수정 모드: Firestore에서 데이터 로드 ---
        try {
          const docRef = doc(db, "tools", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const tool = docSnap.data();
            setForm({
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
            });
          }
        } catch (err) {
          console.error("툴 정보 로드 실패:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchOrInit();
  }, [id, isNew, location.search]);

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
        last_manual_edit: new Date().toISOString()
      };
      
      if (isNew) {
        // 신규모드: addDoc
        await addDoc(collection(db, "tools"), {
          ...data,
          createdAt: serverTimestamp(),
          rebalance_score: 0,
          view_count: 0,
          bookmark_count: 0
        });
        alert("✅ 신규 도구가 성공적으로 등록되었습니다!");
      } else {
        // 수정모드: updateDoc
        await updateDoc(doc(db, "tools", id), data);
        alert("✅ 변경 사항이 성공적으로 적용되었습니다!");
      }
      window.close();
    } catch (err) {
      alert("❌ 저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const commonInputStyle = {
    width: "100%", padding: "12px 16px", fontSize: "0.9rem",
    border: "1px solid var(--border-primary)", background: "var(--bg-card)",
    color: "var(--text-primary)", borderRadius: "14px", outline: "none", 
    boxSizing: "border-box", transition: "background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s"
  };

  const labelStyle = { 
    fontSize: "0.8rem", fontWeight: 800, color: "var(--text-secondary)", 
    marginBottom: "6px", display: "block", marginLeft: "4px" 
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', gap:'15px' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid var(--border-primary)', borderTop:'3px solid var(--accent-indigo)', borderRadius:'50%', animation:'spin 1s linear infinite' }}></div>
      <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>데이터를 준비하는 중...</p>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: "40px 20px" }}>
      <form onSubmit={handleSubmit} style={{
        background: "var(--bg-card)", width: "100%", maxWidth: "800px",
        margin: "0 auto", padding: "3rem",
        borderRadius: "40px", border: "1px solid var(--border-primary)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.4)", position: "relative"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
          <div>
            <h2 style={{ fontSize: "2rem", fontWeight: 950, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.04em" }}>
              {isNew ? "✨ 신규 도구 하이패스 등록" : "🛠️ 엔진 제원 수정"}
            </h2>
            <p style={{ color: "var(--text-muted)", marginTop: "8px", fontWeight: 600 }}>
               {isNew ? "에이전트로부터 전달받은 최적의 제원입니다." : `ID: ${id}`}
            </p>
          </div>
          <button type="button" onClick={() => window.close()} style={{ background: "var(--bg-secondary)", border: "none", borderRadius: "16px", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* 메인 정보 섹션 */}
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "24px", marginBottom: "24px" }}>
          <div>
            <label style={labelStyle}>아이콘</label>
            <div style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: "20px", textAlign: "center", border: "1px solid var(--border-primary)" }}>
                <input 
                  style={{ border: "none", background: "transparent", textAlign: "center", fontSize: "2.5rem", width: "100%", outline: "none" }} 
                  value={form.icon} onChange={e => set("icon", e.target.value)} maxLength={4} 
                />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <label style={labelStyle}>엔진 이름 (영문) *</label>
            <input style={{...commonInputStyle, fontSize: "1.1rem", fontWeight: 800}} value={form.name} onChange={e => set("name", e.target.value)} placeholder="예: ChatGPT" required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div>
            <label style={labelStyle}>표기 이름 (한글)</label>
            <input style={commonInputStyle} value={form.nameKo} onChange={e => set("nameKo", e.target.value)} placeholder="예: 챗지피티" />
          </div>
          <div>
            <label style={labelStyle}>카테고리</label>
            <select style={{...commonInputStyle, cursor: "pointer", appearance: "none", fontWeight: 700}} value={form.cat} onChange={e => set("cat", e.target.value)}>
              {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>공식 엔드포인트 URL</label>
          <div style={{ position: "relative" }}>
             <Globe size={20} style={{ position: "absolute", left: "16px", top: "14px", color: "var(--text-muted)" }} />
             <input style={{...commonInputStyle, paddingLeft: "48px"}} value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>핵심 설명</label>
          <textarea style={{ ...commonInputStyle, height: "120px", resize: "none", lineHeight: 1.6 }} value={form.desc} onChange={e => set("desc", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div>
            <label style={labelStyle}>태그 (쉼표 구분)</label>
            <input style={commonInputStyle} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="AI, 챗봇, 무료" />
          </div>
          <div>
            <label style={labelStyle}>네이버 키워드</label>
            <input style={commonInputStyle} value={form.naverKw} onChange={e => set("naverKw", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <label style={labelStyle}>활용 타겟 세그먼트</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {LIFE_OPTIONS.map(v => (
              <button key={v} type="button"
                onClick={() => toggleLife(v)}
                style={{
                  padding: "10px 20px", fontSize: "0.85rem", borderRadius: "14px", cursor: "pointer",
                  border: "1px solid var(--border-primary)",
                  background: form.life.includes(v) ? "var(--accent-indigo)" : "var(--bg-secondary)",
                  color: form.life.includes(v) ? "#fff" : "var(--text-secondary)",
                  fontWeight: 900, transition: "background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s"
                }}
              >{v.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "2rem", background: "var(--bg-secondary)", borderRadius: "28px", marginBottom: "3rem" }}>
          <label style={{ ...labelStyle, marginBottom: "20px", color: "var(--text-primary)", fontSize: "0.95rem" }}>성능 메트릭 (0~100)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {[
              { key: "opr", label: "GOOGLE" },
              { key: "ntv", label: "NAVER" },
              { key: "sns", label: "SNS" },
              { key: "ghs", label: "GITHB" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: "0.75rem", fontWeight: 950, marginBottom: "8px", display: "block", textAlign: "center", color: "var(--text-muted)" }}>{label}</label>
                <input
                  style={{...commonInputStyle, padding: "12px", textAlign: "center", fontWeight: 950, border: "none", fontSize: "1.1rem"}} type="number" min="0" max="100" step="0.01"
                  value={form[key]} onChange={e => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "15px" }}>
          <button type="button" onClick={() => window.close()}
            style={{ flex: 1, padding: "20px", borderRadius: "20px", border: "1px solid var(--border-primary)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 900, fontSize: "1.1rem" }}>
            닫기
          </button>
          <button type="submit" disabled={saving}
            style={{ flex: 2, padding: "20px", borderRadius: "20px", border: "none", background: "var(--accent-indigo)", color: "#fff", cursor: "pointer", fontWeight: 950, fontSize: "1.1rem", boxShadow: "0 10px 30px var(--accent-indigo)40" }}>
            {saving ? "전송 중..." : (isNew ? "새 엔진 공식 등록하기" : "변경 사항 적용")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminToolEdit;
