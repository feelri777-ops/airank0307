import { Component } from "react";
import PropTypes from "prop-types";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅 서비스에 에러를 기록할 수 있습니다.
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

    // TODO: 프로덕션에서는 Sentry 등 에러 트래킹 서비스로 전송
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // 페이지 새로고침
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백 UI를 렌더링할 수 있습니다.
      const { fallback } = this.props;

      if (fallback) {
        return typeof fallback === "function"
          ? fallback(this.state.error, this.handleReset)
          : fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            padding: "2rem",
            textAlign: "center",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              marginBottom: "0.5rem",
              color: "var(--text-primary)",
            }}
          >
            문제가 발생했습니다
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
              marginBottom: "1.5rem",
              maxWidth: "500px",
              lineHeight: 1.6,
            }}
          >
            일시적인 오류가 발생했습니다. 페이지를 새로고침하면 문제가 해결될 수
            있습니다.
          </p>

          {import.meta.env.MODE === "development" && this.state.error && (
            <details
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)",
                borderRadius: "8px",
                textAlign: "left",
                maxWidth: "600px",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: "0.5rem" }}>
                에러 상세 정보 (개발 모드)
              </summary>
              <pre style={{ overflow: "auto", fontSize: "0.75rem", lineHeight: 1.4 }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              marginTop: "1.5rem",
              padding: "10px 24px",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#fff",
              background: "var(--accent-indigo, #6366f1)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            🔄 페이지 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

export default ErrorBoundary;
