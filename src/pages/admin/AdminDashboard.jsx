import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../../firebase";

const STATS = [
  { label: "총 가입자", col: "users", icon: "👥", color: "#6366f1" },
  { label: "커뮤니티 게시물", col: "communityPosts", icon: "💬", color: "#10b981" },
  { label: "갤러리 포스트", col: "galleryPosts", icon: "🖼️", color: "#f59e0b" },
  { label: "정지 회원", col: "bannedUsers", icon: "🚫", color: "#ef4444" },
];

export default function AdminDashboard() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    STATS.forEach(async ({ col }) => {
      try {
        const snap = await getCountFromServer(collection(db, col));
        setCounts((prev) => ({ ...prev, [col]: snap.data().count }));
      } catch {
        setCounts((prev) => ({ ...prev, [col]: "-" }));
      }
    });
  }, []);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-primary)", margin: "0 0 0.5rem 0", letterSpacing: "-0.02em" }}>
          관리자 대시보드
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: 0 }}>AIRANK 서비스의 전체 운영 데이터를 한눈에 확인합니다.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "3rem" }}>
        {STATS.map(({ label, col, icon, color }) => (
          <div key={col} style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: "24px", padding: "2rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            position: "relative", overflow: "hidden"
          }}>
            <div style={{ 
              position: "absolute", right: "-10px", bottom: "-10px", fontSize: "5rem", opacity: 0.05, filter: "grayscale(1)" 
            }}>
              {icon}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "1.2rem", background: `${color}15`, padding: "8px", borderRadius: "12px" }}>{icon}</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</span>
            </div>

            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>
              {counts[col]?.toLocaleString() ?? "…"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        padding: "2.5rem", background: "var(--bg-card)", 
        border: "1px solid var(--border-primary)", borderRadius: "24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
      }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>운영 도구 바로가기</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            { href: "/admin/community", label: "💬 커뮤니티 관리", desc: "게시글 및 댓글 모니터링", color: "#10b981" },
            { href: "/admin/gallery", label: "🖼️ 갤러리 관리", desc: "이미지 포스트 검토", color: "#f59e0b" },
            { href: "/admin/users", label: "👥 회원 관리", desc: "사용자 차단 및 정보 확인", color: "#6366f1" },
          ].map(({ href, label, desc, color }) => (
            <a key={href} href={href} style={{
              padding: "1.5rem", borderRadius: "16px",
              border: `1px solid var(--border-primary)`, background: "var(--bg-tertiary)",
              textDecoration: "none", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex", flexDirection: "column", gap: "4px"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = color; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border-primary)"; }}
            >
              <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "1rem" }}>{label}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
