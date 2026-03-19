import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useTheme } from "../../context/ThemeContext";

import { 
  ChartBar, 
  Wrench, 
  ChatCircle, 
  Images, 
  Users, 
  ArrowLeft,
  Sun,
  Moon,
  ShieldCheck
} from "../../components/icons/PhosphorIcons";

const NAV = [
  { to: "/admin", label: "대시보드", Icon: ChartBar, end: true },
  { to: "/admin/tools", label: "엔진 마스터", Icon: Wrench },
  { to: "/admin/community", label: "커뮤니티 관리", Icon: ChatCircle },
  { to: "/admin/gallery", label: "갤러리 검소", Icon: Images },
  { to: "/admin/users", label: "회원 보안", Icon: Users },
];

export default function AdminLayout() {
  const { isAuthorized } = useAdminGuard();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!isAuthorized) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)", fontFamily: "inherit" }}>
      {/* 사이드바 관제 센터 */}
      <aside style={{
        width: "280px", flexShrink: 0,
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border-primary)",
        padding: "2rem 1.2rem",
        display: "flex", flexDirection: "column", gap: "8px",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        boxShadow: "var(--shadow-sm)"
      }}>
        {/* 상단 로고 & 테마 스위치 */}
        <div style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <ShieldCheck size={24} weight="fill" color="var(--accent-indigo)" />
              <span style={{ fontSize: "0.75rem", fontWeight: 950, color: "var(--text-muted)", letterSpacing: "0.1em" }}>COMMAND CENTER</span>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--text-primary)", letterSpacing: "-0.04em" }}>AIRANK OS</div>
          </div>
          
          <button
            onClick={toggleTheme}
            style={{
              padding: "10px", borderRadius: "14px", border: "1px solid var(--border-primary)",
              background: "var(--bg-secondary)", cursor: "pointer", color: "var(--text-primary)",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1.0)"}
          >
            {theme === 'dark' ? <Moon size={20} weight="fill" /> : <Sun size={20} weight="fill" />}
          </button>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "12px",
                padding: "14px 18px", borderRadius: "18px",
                fontSize: "0.95rem", fontWeight: 900,
                color: isActive ? "#fff" : "var(--text-secondary)",
                background: isActive ? "var(--accent-indigo)" : "transparent",
                textDecoration: "none",
                transition: "all 0.2s",
                boxShadow: isActive ? "0 8px 16px -4px var(--accent-indigo)40" : "none"
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} weight={isActive ? "fill" : "bold"} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 푸터 영역: 복귀 버튼 */}
        <div style={{ marginTop: "auto", paddingTop: "1.5rem" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              width: "100%", padding: "16px", borderRadius: "20px",
              border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: 900,
              cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--text-primary)"; e.currentTarget.style.color = "var(--bg-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          >
            <ArrowLeft size={18} weight="bold" /> 라이브 사이트 복귀
          </button>
        </div>
      </aside>

      {/* 메인 시스템 콘솔 콘텐츠 */}
      <main style={{ flex: 1, padding: "2.5rem", overflowY: "auto", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: "1340px", margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
