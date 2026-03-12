const Footer = () => (
  <footer style={{
    textAlign: "center",
    padding: "2rem 1.5rem",
    borderTop: "1px solid var(--border-primary)",
    marginTop: "3rem",
  }}>
    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
      데이터 출처: Naver DataLab · Open PageRank · GitHub ·{" "}
      <span style={{ color: "var(--accent-indigo)", fontWeight: 600 }}>AI머씀?</span> 자체 분석
    </p>
    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.6 }}>
      점수 산출: 네이버 검색량 20% · 도메인 PageRank 40% · GitHub 관심도 40% (0–100 정규화)
    </p>
    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
      © 2026 AI머씀? All rights reserved. 모든 점수는 참고용입니다.
    </p>
  </footer>
);

export default Footer;
