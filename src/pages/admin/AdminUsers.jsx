import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { formatRelativeTime } from "../../utils";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [bannedIds, setBannedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userSnap, banSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "bannedUsers")),
      ]);
      setUsers(userSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setBannedIds(new Set(banSnap.docs.map((d) => d.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const banUser = async (user) => {
    const reason = window.prompt(`${user.displayName}을(를) 정지하는 사유를 입력하세요:`);
    if (reason === null) return;
    setProcessing(user.uid);
    try {
      await setDoc(doc(db, "bannedUsers", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        reason: reason || "사유 없음",
        bannedAt: new Date(),
      });
      setBannedIds((prev) => new Set([...prev, user.uid]));
    } catch (e) {
      alert("정지 실패: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const unbanUser = async (uid) => {
    if (!window.confirm("정지를 해제하시겠습니까?")) return;
    setProcessing(uid);
    try {
      await deleteDoc(doc(db, "bannedUsers", uid));
      setBannedIds((prev) => { const s = new Set(prev); s.delete(uid); return s; });
    } catch (e) {
      alert("해제 실패: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = users.filter((u) =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-primary)", margin: "0 0 0.5rem 0", letterSpacing: "-0.02em" }}>
          회원 관리
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: 0 }}>사용자 상태 관리 및 모니터링</p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "1.5rem", marginBottom: "2.5rem" 
      }}>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>전체 회원</div>
          <div style={statsValueStyle}>{users.length.toLocaleString()}</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>정지된 회원</div>
          <div style={{ ...statsValueStyle, color: "#ef4444" }}>{bannedIds.size}</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>활성 회원</div>
          <div style={{ ...statsValueStyle, color: "#10b981" }}>{users.length - bannedIds.size}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "2rem", position: "relative" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 닉네임 또는 이메일로 검색…"
          style={{
            width: "100%", maxWidth: "480px", padding: "14px 20px 14px 45px",
            borderRadius: "16px", border: "1px solid var(--border-primary)",
            background: "var(--bg-card)", color: "var(--text-primary)",
            fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            outline: "none", transition: "all 0.2s"
          }}
        />
        <span style={{ position: "absolute", left: "18px", top: "14px", opacity: 0.5 }}>🔍</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>사용자 데이터를 불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)", border: "2px dashed var(--border-primary)", borderRadius: "var(--r-lg)" }}>
          검색 결과가 없습니다.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {filtered.map((user) => {
            const isBanned = bannedIds.has(user.uid);
            return (
              <div key={user.uid} style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "1.25rem", background: "var(--bg-card)",
                border: "1px solid",
                borderColor: isBanned ? "#ef4444" : "var(--border-primary)",
                borderRadius: "var(--r-lg)",
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                opacity: isBanned ? 0.85 : 1
              }}>
                <div style={{ position: "relative" }}>
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                    alt={user.displayName}
                    width={50} height={50}
                    style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-primary)" }}
                  />
                  {isBanned && (
                    <div style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 900 }}>!</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {user.displayName || "이름 없음"}
                    </span>
                    {isBanned && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 800, padding: "2px 6px", borderRadius: "6px", background: "rgba(239,68,68,0.1)", color: "#ef4444", textTransform: "uppercase" }}>
                        BANNED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                    <span style={{ 
                      padding: "2px 6px", borderRadius: "6px", 
                      background: user.provider === "google.com" ? "rgba(66,133,244,0.1)" : "rgba(100,100,100,0.1)",
                      color: user.provider === "google.com" ? "#4285f4" : "var(--text-muted)",
                      fontSize: "0.65rem", fontWeight: 800
                    }}>
                      {user.provider?.toUpperCase().split('.')[0] || "EMAIL"}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", opacity: 0.7 }}>
                    가입 {user.createdAt ? formatRelativeTime(user.createdAt) : "미상"}
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {isBanned ? (
                    <button onClick={() => unbanUser(user.uid)} disabled={processing === user.uid} style={unbanBtnStyle}>
                      {processing === user.uid ? "..." : "해제"}
                    </button>
                  ) : (
                    <button onClick={() => banUser(user)} disabled={processing === user.uid} style={banBtnStyle}>
                      {processing === user.uid ? "..." : "정지"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const statsCardStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border-primary)",
  borderRadius: "var(--r-lg)", padding: "1.5rem", boxShadow: "0 4px 6px rgba(0,0,0,0.02)"
};
const statsLabelStyle = { fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" };
const statsValueStyle = { fontSize: "1.75rem", fontWeight: 900, color: "var(--text-primary)" };

const banBtnStyle = {
  padding: "8px 16px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 800,
  background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)",
  cursor: "pointer", transition: "all 0.2s"
};
const unbanBtnStyle = {
  padding: "8px 16px", borderRadius: "10px", fontSize: "0.80rem", fontWeight: 800,
  background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)",
  cursor: "pointer", transition: "all 0.2s"
};
