import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { formatRelativeTime } from "../../utils";

import { 
  Users, 
  UserPlus, 
  UserMinus, 
  MagnifyingGlass, 
  ArrowClockwise, 
  TrashSimple,
  Circle
} from "../../components/icons/PhosphorIcons";

// 통계 섹션 컴포넌트 (디자인 통일)
function StatsCard({ label, count, color, Icon }) {
  return (
    <div style={{
      padding: "1.5rem", background: "var(--bg-card)",
      border: "1px solid var(--border-primary)", borderRadius: "24px",
      flex: 1, minWidth: "220px", boxShadow: "var(--shadow-sm)",
      position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", right: "-10px", bottom: "-10px", opacity: 0.05 }}>
        <Icon size={80} weight="fill" color={color} />
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 950, color, letterSpacing: "-0.04em" }}>{count.toLocaleString()}</div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [bannedIds, setBannedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userSnap, banSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "bannedUsers")),
      ]);
      setUsers(userSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setBannedIds(new Set(banSnap.docs.map((d) => d.id)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const banUser = async (user) => {
    const reason = window.prompt(`${user.displayName}을(를) 정지하는 사유를 입력하세요:`);
    if (reason === null) return;
    setProcessing(user.uid);
    try {
      await setDoc(doc(db, "bannedUsers", user.uid), {
        uid: user.uid, email: user.email, displayName: user.displayName,
        reason: reason || "사유 없음", bannedAt: new Date(),
      });
      setBannedIds((prev) => new Set([...prev, user.uid]));
    } catch (e) { alert("정지 실패: " + e.message); }
    finally { setProcessing(null); }
  };

  const unbanUser = async (uid) => {
    if (!window.confirm("정지를 해제하시겠습니까?")) return;
    setProcessing(uid);
    try {
      await deleteDoc(doc(db, "bannedUsers", uid));
      setBannedIds((prev) => { const s = new Set(prev); s.delete(uid); return s; });
    } catch (e) { alert("해제 실패: " + e.message); }
    finally { setProcessing(null); }
  };

  const toggleSelect = (uid) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) newSet.delete(uid);
      else newSet.add(uid);
      return newSet;
    });
  };

  const toggleSelectAll = (filtered) => {
    if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(u => u.uid)));
  };

  const filtered = users.filter((u) =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 950, color: "var(--text-primary)", letterSpacing: "-0.04em", marginBottom: "0.2rem" }}>회원 관리 센터</h1>
        <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>서비스 가입자의 상태를 정밀 모니터링하고 제어합니다.</p>
      </header>

      <div style={{ display: "flex", gap: "1.2rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <StatsCard label="전체 멤버십" count={users.length} color="var(--accent-indigo)" Icon={Users} />
        <StatsCard label="정지된 회원" count={bannedIds.size} color="#ef4444" Icon={UserMinus} />
        <StatsCard label="활성 회원" count={users.length - bannedIds.size} color="#10b981" Icon={UserPlus} />
      </div>

      <div style={{ 
        display: "flex", gap: "12px", marginBottom: "1.5rem", background: "var(--bg-card)", 
        padding: "1rem", borderRadius: "20px", border: "1px solid var(--border-primary)", alignItems: "center" 
      }}>
        <div style={{ position: "relative", flex: 1 }}>
          <MagnifyingGlass size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input 
            value={search} onChange={e => setSearch(e.target.value)} 
            placeholder="이름, 닉네임 또는 이메일 검색..." 
            style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: "14px", border: "none", background: "var(--bg-secondary)", color: "var(--text-primary)", fontWeight: 700 }} 
          />
        </div>
        <button onClick={fetchData} style={{ background: "var(--bg-secondary)", border: "none", borderRadius: "12px", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
          <ArrowClockwise size={20} weight="bold" />
        </button>
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "4rem", fontWeight: 800 }}>서버에서 데이터를 호출 중...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Table Header Wrapper */}
          <div style={{ 
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 120px", 
            padding: "0.8rem 1.5rem", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase" 
          }}>
            <div>회원 정보 (이름 / ID)</div>
            <div>이메일 연락처</div>
            <div>소셜 인증 채널</div>
            <div>가입 일시</div>
            <div style={{ textAlign: "right" }}>운영 제어</div>
          </div>

          {filtered.length === 0 ? <div style={{ textAlign: "center", padding: "4rem", background: "var(--bg-card)", borderRadius: "24px", color: "var(--text-muted)", fontWeight: 800 }}>검색 결과가 없습니다.</div> : (
            filtered.map((user) => {
              const isBanned = bannedIds.has(user.uid);
              const provider = user.provider || user.providerId || "google.com";
              return (
                <div key={user.uid} style={{ 
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 120px", alignItems: "center", 
                  padding: "1.2rem 1.5rem", background: isBanned ? "rgba(239,68,68,0.02)" : "var(--bg-card)",
                  borderRadius: "20px", border: isBanned ? "1px solid #ef444430" : "1px solid var(--border-primary)",
                  boxShadow: "var(--shadow-sm)", transition: "background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ position: "relative" }}>
                      <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                        alt=""
                        style={{ width: "40px", height: "40px", borderRadius: "12px", objectFit: "cover", border: "1px solid var(--border-primary)" }}
                      />
                      <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "12px", height: "12px", borderRadius: "50%", background: isBanned ? "#ef4444" : "#22c55e", border: "2px solid #fff" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, color: "var(--text-primary)", fontSize: "0.95rem" }}>{user.displayName || "익명 계정"}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>{user.uid.substring(0, 10)}...</div>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>{user.email}</div>
                  
                  <div>
                    <span style={{ 
                      padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 900,
                      background: provider.includes("google") ? "rgba(66,133,244,0.1)" : "rgba(100,100,100,0.1)",
                      color: provider.includes("google") ? "#4285f4" : "var(--text-muted)",
                      border: `1px solid ${provider.includes("google") ? "#4285f420" : "transparent"}`
                    }}>
                      {provider.includes("google") ? "GOOGLE CLOUD" : "LOCAL AUTH"}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    {user.createdAt ? formatRelativeTime(user.createdAt) : "기록 없음"}
                  </div>
                  
                  <div style={{ textAlign: "right" }}>
                    {isBanned ? (
                      <button onClick={() => unbanUser(user.uid)} style={{ padding: "8px 16px", borderRadius: "10px", background: "var(--color-green)", color: "#fff", border: "none", fontWeight: 900, fontSize: "0.75rem", cursor: "pointer" }}>정지 해제</button>
                    ) : (
                      <button onClick={() => banUser(user)} style={{ padding: "8px 16px", borderRadius: "10px", background: "#ef444415", color: "#ef4444", border: "none", fontWeight: 900, fontSize: "0.75rem", cursor: "pointer" }}>정지 처분</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
