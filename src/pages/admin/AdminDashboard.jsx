import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../../firebase";

import { 
  Users, 
  ChatCircleText, 
  Image, 
  Siren, 
  ArrowRight,
  EyeSlash
} from "../../components/icons/PhosphorIcons";

const STATS = [
  { label: "총 가입자",       col: "users",            Icon: Users,          color: "#6366f1" },
  { label: "커뮤니티 게시물", col: "communityPosts",   Icon: ChatCircleText, color: "#10b981" },
  { label: "갤러리 포스트",   col: "galleryPosts",     Icon: Image,          color: "#f59e0b" },
  { label: "정지 회원",       col: "bannedUsers",      Icon: EyeSlash,       color: "#f43f5e" },
  { label: "게시물 신고",     col: "communityReports", Icon: Siren,          color: "#ef4444" },
  { label: "갤러리 신고",     col: "galleryReports",   Icon: Siren,          color: "#ef4444" },
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
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ 
          fontSize: "2.4rem", fontWeight: 950, letterSpacing: "-0.04em", 
          marginBottom: "0.2rem", color: "var(--text-primary)" 
        }}>관리자 통찰</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem", fontWeight: 500 }}>
          AIRANK 서비스의 실시간 데이터를 통해 전체 운영 상태를 모니터링합니다.
        </p>
      </header>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "1.2rem", 
        marginBottom: "3rem" 
      }}>
        {STATS.map(({ label, col, Icon, color }) => (
          <div key={col} style={{
            background: "var(--bg-card)", 
            border: "1px solid var(--border-primary)",
            borderRadius: "24px", 
            padding: "1.8rem",
            boxShadow: "var(--shadow-sm)",
            position: "relative", 
            overflow: "hidden",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            {/* 배경 대형 아이콘 */}
            <div style={{
              position: "absolute", right: "-15px", bottom: "-15px", opacity: 0.04,
            }}>
              <Icon size={110} color={color} weight="fill" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ 
                background: `${color}15`, 
                padding: "10px", 
                borderRadius: "14px", 
                display: "flex",
                color: color
              }}>
                <Icon size={24} weight="bold" />
              </div>
              <span style={{ 
                fontSize: "0.85rem", 
                fontWeight: 800, 
                color: "var(--text-muted)", 
                textTransform: "uppercase",
                letterSpacing: "0.02em"
              }}>{label}</span>
            </div>

            <div style={{ 
              fontSize: "3rem", 
              fontWeight: 950, 
              color: "var(--text-primary)", 
              lineHeight: 1,
              letterSpacing: "-0.04em"
            }}>
              {counts[col]?.toLocaleString() ?? "…"}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "2.5rem", 
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)", 
        borderRadius: "32px",
        boxShadow: "var(--shadow-sm)"
      }}>
        <h2 style={{ 
          fontSize: "1.6rem", 
          fontWeight: 950, 
          color: "var(--text-primary)", 
          marginBottom: "1.5rem",
          letterSpacing: "-0.02em"
        }}>운영 엔진 제어실</h2>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: "1rem" 
        }}>
          {[
            { 
              href: "/admin/community", 
              label: "💬 커뮤니티 관리", 
              desc: "전체 게시판 구조 및 유해 게시물 컨트롤러", 
              color: "#6366f1",
              bg: "#6366f108"
            },
            { 
              href: "/admin/gallery", 
              label: "🖼️ 갤러리 아카이브", 
              desc: "AI 이미지 생성 기록 및 부적절 컨텐츠 검토", 
              color: "#f59e0b",
              bg: "#f59e0b08"
            },
            { 
              href: "/admin/users", 
              label: "👥 사용자 멤버십", 
              desc: "회원 등급 관리 및 서비스 접근 권한 제어", 
              color: "#10b981",
              bg: "#10b98108"
            },
          ].map(({ href, label, desc, color, bg }) => (
            <a key={href} href={href} style={{
              padding: "1.6rem", 
              borderRadius: "20px",
              border: `1px solid var(--border-primary)`, 
              background: bg,
              textDecoration: "none", 
              transition: "background 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex", 
              flexDirection: "column", 
              gap: "8px",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.transform = "translateY(-6px)"; 
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.boxShadow = `0 10px 20px -10px ${color}30`;
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = "translateY(0)"; 
              e.currentTarget.style.borderColor = "var(--border-primary)"; 
              e.currentTarget.style.boxShadow = "none";
            }}
            >
              <div style={{ 
                fontWeight: 900, 
                color: "var(--text-primary)", 
                fontSize: "1.15rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                {label}
                <ArrowRight size={18} weight="bold" style={{ opacity: 0.5 }} />
              </div>
              <div style={{ 
                fontSize: "0.85rem", 
                color: "var(--text-secondary)",
                lineHeight: 1.4
              }}>{desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
