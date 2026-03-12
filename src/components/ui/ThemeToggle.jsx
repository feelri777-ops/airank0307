import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

const THEMES = [
  { id: 'light', icon: '☀️', label: '라이트' },
  { id: 'dark',  icon: '🌙', label: '다크' },
  { id: 'mono',  icon: '◑',  label: '모노' },
  { id: 'chosun', icon: '🌾', label: '조선' },
];

const TRACK_COLORS = {
  light: 'var(--bg-tertiary)',
  dark:  'var(--bg-tertiary)',
  mono:  'rgba(0, 0, 0, 0.08)',
  chosun: 'rgba(141, 110, 99, 0.15)',
};

const ThemeToggle = () => {
  const { theme, selectTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = THEMES.find((t) => t.id === theme) || THEMES[1];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          height: "30px",
          padding: "0 8px 0 5px",
          borderRadius: "100px",
          border: "1px solid var(--border-primary)",
          background: TRACK_COLORS[theme] || 'var(--bg-tertiary)',
          cursor: "pointer",
          transition: "all 0.3s ease",
          flexShrink: 0,
        }}
      >
        <div style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "var(--accent-gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          flexShrink: 0,
        }}>
          {current.icon}
        </div>
        <span style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1,
        }}>
          {current.label}
        </span>
        <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "1px" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          borderRadius: "12px",
          padding: "6px",
          minWidth: "120px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          zIndex: 200,
        }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { selectTheme(t.id); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "7px 10px",
                borderRadius: "8px",
                border: "none",
                background: theme === t.id ? "var(--bg-tertiary)" : "transparent",
                color: "var(--text-primary)",
                fontFamily: "'Pretendard', sans-serif",
                fontSize: "0.82rem",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: theme === t.id ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (theme !== t.id) e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                if (theme !== t.id) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
