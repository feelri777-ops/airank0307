import { memo } from "react";
import PropTypes from "prop-types";

/**
 * 재사용 가능한 Button 컴포넌트
 * Dashboard, Gallery 등에서 사용되는 버튼 스타일 통일
 */
const Button = memo(({
  variant = "ghost",
  size = "md",
  children,
  disabled = false,
  type = "button",
  ...props
}) => {
  const variants = {
    primary: {
      background: "var(--accent-indigo, #6366f1)",
      color: "#fff",
      border: "none",
    },
    indigo: {
      background: "var(--accent-indigo, #6366f1)",
      color: "#fff",
      border: "none",
    },
    danger: {
      background: "rgba(239,68,68,0.12)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.3)",
    },
    ghost: {
      background: "var(--bg-tertiary)",
      color: "var(--text-secondary)",
      border: "1px solid var(--border-primary)",
    },
    secondary: {
      background: "var(--bg-secondary)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-primary)",
    },
  };

  const sizes = {
    sm: {
      padding: "4px 10px",
      fontSize: "0.78rem",
    },
    md: {
      padding: "8px 16px",
      fontSize: "0.88rem",
    },
    lg: {
      padding: "10px 20px",
      fontSize: "0.95rem",
    },
  };

  const baseStyle = {
    borderRadius: "var(--r-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    transition: "background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s, opacity 0.15s",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    whiteSpace: "nowrap",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...sizes[size],
        ...variants[variant],
      }}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

Button.propTypes = {
  variant: PropTypes.oneOf(["primary", "indigo", "danger", "ghost", "secondary"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
};

export default Button;