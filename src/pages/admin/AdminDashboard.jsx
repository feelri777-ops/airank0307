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
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>대시보드</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "2rem" }}>사이트 전체 현황을 확인합니다.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
        {STATS.map(({ label, col, icon, color }) => (
          <div key={col} style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: "16px", padding: "1.5rem",
            borderLeft: `4px solid ${color}`,
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{icon}</div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color, lineHeight: 1 }}>
              {counts[col] ?? "…"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "2rem", padding: "1.5rem", background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: "16px" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>빠른 이동</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { href: "/admin/community", label: "게시물 관리 →", color: "#10b981" },
            { href: "/admin/gallery", label: "갤러리 관리 →", color: "#f59e0b" },
            { href: "/admin/users", label: "회원 관리 →", color: "#6366f1" },
          ].map(({ href, label, color }) => (
            <a key={href} href={href} style={{
              padding: "10px 20px", borderRadius: "10px", fontSize: "0.9rem", fontWeight: 700,
              color, border: `1px solid ${color}`, background: `${color}15`,
              textDecoration: "none", transition: "all 0.15s",
            }}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
