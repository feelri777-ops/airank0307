import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import Icon from "./Icon";

const THEMES = [
  { id: 'dark',  icon: 'moon', label: '다크' },
  { id: 'mono',  icon: 'palette',  label: '모노' },
  { id: 'community', icon: 'chat-circle', label: '커뮤니티' },
];

const TRACK_COLORS = {
  light: 'var(--bg-tertiary)',
  dark:  'var(--bg-tertiary)',
  // pure:  'var(--bg-tertiary)',
  mono:  'rgba(0, 0, 0, 0.08)',
  community: 'var(--bg-tertiary)',
  'community-dark': 'var(--bg-tertiary)',
};

const ThemeToggle = ({ dropUp = false }) => {
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

  const handleToggleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((prev) => !prev); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleToggleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`테마 선택: 현재 ${current.label}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          height: "30px",
          padding: "0 8px 0 5px",
          borderRadius: "var(--r-pill)",
          border: "1px solid var(--border-primary)",
          background: TRACK_COLORS[theme] || 'var(--bg-tertiary)',
          cursor: "pointer",
          transition: "background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease",
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
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          flexShrink: 0,
        }}>
          <Icon name={current.icon} size={12} color="#fff" />
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
          ...(dropUp ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }),
          right: 0,
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--r-md)",
          padding: "6px",
          minWidth: "120px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          zIndex: 200,
        }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { selectTheme(t.id); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTheme(t.id); setOpen(false); } if (e.key === "Escape") setOpen(false); }}
              role="option"
              aria-selected={theme === t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "7px 10px",
                borderRadius: "var(--r-sm)",
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
              <Icon name={t.icon} size={14} color={theme === t.id ? "var(--accent-indigo)" : "var(--text-secondary)"} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
