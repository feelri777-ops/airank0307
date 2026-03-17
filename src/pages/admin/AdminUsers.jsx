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
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: 0 }}>사용자 계정 상태 및 가입 정보 관리</p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "1.5rem", marginBottom: "2.5rem" 
      }}>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>전체 회원</div>
          <div style={statsValueStyle}>{users.length.toLocaleString()} 명</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>정지 회원</div>
          <div style={{ ...statsValueStyle, color: "#ef4444" }}>{bannedIds.size} 명</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>활성 회원</div>
          <div style={{ ...statsValueStyle, color: "#10b981" }}>{users.length - bannedIds.size} 명</div>
        </div>
      </div>

      {/* Tool Bar */}
      <div style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        gap: "20px", marginBottom: "1.5rem", flexWrap: "wrap" 
      }}>
        <div style={{ position: "relative", flex: "1", maxWidth: "400px" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 닉네임 또는 이메일 검색…"
            style={{
              width: "100%", padding: "12px 18px 12px 42px",
              borderRadius: "14px", border: "1px solid var(--border-primary)",
              background: "var(--bg-card)", color: "var(--text-primary)",
              fontSize: "0.9rem", outline: "none", transition: "all 0.2s"
            }}
          />
          <span style={{ position: "absolute", left: "16px", top: "12px", opacity: 0.5 }}>🔍</span>
        </div>
        
        <button 
          onClick={fetchData} 
          style={{ 
            padding: "10px 18px", borderRadius: "12px", background: "var(--bg-tertiary)", 
            color: "var(--text-secondary)", border: "1px solid var(--border-primary)",
            fontSize: "0.85rem", fontWeight: 700, cursor: "pointer"
          }}
        >
          🔄 새로고침
        </button>
      </div>

      {/* Table Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "5rem", color: "var(--text-muted)" }}>
          사용자 정보를 불러오는 중입니다...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ 
          textAlign: "center", padding: "5rem", background: "var(--bg-card)", 
          borderRadius: "20px", border: "1px solid var(--border-primary)" 
        }}>
          검색 결과가 없습니다.
        </div>
      ) : (
        <div style={{ 
          background: "var(--bg-card)", borderRadius: "20px", 
          border: "1px solid var(--border-primary)", overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-primary)" }}>
                <th style={thStyle}>회원 정보</th>
                <th style={thStyle}>이메일</th>
                <th style={thStyle}>가입경로</th>
                <th style={thStyle}>가입일</th>
                <th style={thStyle}>상태</th>
                <th style={{ ...thStyle, textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isBanned = bannedIds.has(user.uid);
                const provider = user.provider || user.providerId || "google.com";

                return (
                  <tr key={user.uid} style={{ 
                    borderBottom: "1px solid var(--border-primary)",
                    transition: "background 0.15s",
                    background: isBanned ? "rgba(239,68,68,0.02)" : "transparent"
                  }}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                          alt=""
                          style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-primary)" }}
                        />
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                          {user.displayName || "이름 없음"}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{user.email}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800,
                          background: provider.includes("google") ? "rgba(66,133,244,0.1)" : 
                                      provider.includes("kakao") ? "rgba(254,229,0,0.2)" : "rgba(100,100,100,0.1)",
                          color: provider.includes("google") ? "#4285f4" : 
                                 provider.includes("kakao") ? "#9c7c00" : "var(--text-muted)",
                          display: "inline-flex", alignItems: "center", gap: "4px"
                        }}>
                          {provider.includes("google") ? "🔵 Google" : 
                           provider.includes("kakao") ? "🟡 Kakao" : "✉️ Email"}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {user.createdAt ? formatRelativeTime(user.createdAt) : "미상"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {isBanned ? (
                        <span style={{ 
                          fontSize: "0.75rem", fontWeight: 800, color: "#ef4444", 
                          background: "rgba(239,68,68,0.1)", padding: "4px 8px", borderRadius: "6px" 
                        }}>정지됨</span>
                      ) : (
                        <span style={{ 
                          fontSize: "0.75rem", fontWeight: 800, color: "#10b981", 
                          background: "rgba(16,185,129,0.1)", padding: "4px 8px", borderRadius: "6px" 
                        }}>정상</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {isBanned ? (
                        <button onClick={() => unbanUser(user.uid)} disabled={processing === user.uid} style={unbanBtnStyle}>
                          해제
                        </button>
                      ) : (
                        <button onClick={() => banUser(user)} disabled={processing === user.uid} style={banBtnStyle}>
                          정지
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle = {
  padding: "16px 20px", fontSize: "0.8rem", fontWeight: 700, 
  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em"
};

const tdStyle = {
  padding: "14px 20px", verticalAlign: "middle"
};

const statsCardStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border-primary)",
  borderRadius: "24px", padding: "1.5rem", boxShadow: "0 4px 6px rgba(0,0,0,0.01)"
};
const statsLabelStyle = { fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" };
const statsValueStyle = { fontSize: "1.75rem", fontWeight: 900, color: "var(--text-primary)" };

const banBtnStyle = {
  padding: "6px 14px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 700,
  background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)",
  cursor: "pointer", transition: "all 0.2s"
};
const unbanBtnStyle = {
  padding: "6px 14px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 700,
  background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.15)",
  cursor: "pointer", transition: "all 0.2s"
};
