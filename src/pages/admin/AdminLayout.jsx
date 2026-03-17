import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useTheme } from "../../context/ThemeContext";
import { useState } from "react";

const NAV = [
  { to: "/admin", label: "대시보드", icon: "📊", end: true },
  { to: "/admin/community", label: "커뮤니티", icon: "💬" },
  { to: "/admin/gallery", label: "갤러리", icon: "🖼️" },
  { to: "/admin/users", label: "회원 관리", icon: "👥" },
];

export default function AdminLayout() {
  const { isAuthorized } = useAdminGuard();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!isAuthorized) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* 사이드바 */}
      <aside style={{
        width: "220px", flexShrink: 0,
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border-primary)",
        padding: "1.5rem 1rem",
        display: "flex", flexDirection: "column", gap: "4px",
      }}>
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "4px" }}>AIRANK</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>관리자 패널</div>
          </div>
          <button 
            onClick={toggleTheme}
            style={{ 
              border: "none", background: "var(--bg-tertiary)", 
              width: "32px", height: "32px", borderRadius: "8px", 
              cursor: "pointer", fontSize: "1.1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)"
            }}
            title="테마 변경"
          >
            {theme === 'dark' ? '🌙' : theme === 'mono' ? '⬛' : '☀️'}
          </button>
        </div>

        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "var(--r-sm)",
              fontSize: "0.9rem", fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--accent-indigo)" : "var(--text-secondary)",
              background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s",
            })}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border-primary)" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-primary)", background: "var(--bg-tertiary)",
              color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600,
              cursor: "pointer", textAlign: "left",
            }}
          >
            ← 사이트로 돌아가기
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
