const Footer = () => (
  <footer style={{
    textAlign: "center",
    padding: "2.5rem 1.5rem 2rem",
    borderTop: "1px solid var(--border-primary)",
    marginTop: "3rem",
  }}>
    <p style={{
      fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.8,
      letterSpacing: "0.02em", fontFamily: "var(--font-main)",
    }}>
      <span style={{ color: "var(--accent-indigo)", fontWeight: 600 }}>Google(50%)</span>
      {" · "}
      <span style={{ color: "#03C75A", fontWeight: 600 }}>Naver(25%)</span>
      {" · "}
      <span style={{ color: "#8B5CF6", fontWeight: 600 }}>GitHub(10%)</span>
      {" · "}
      <span style={{ color: "#F43F5E", fontWeight: 600 }}>Social(15%)</span>
      {" "}실시간 가중치 적용
    </p>
    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.6 }}>
      데이터 출처 — Open PageRank · Naver DataLab · GitHub API · XPOZ(X/Twitter)
    </p>
    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px" }}>
      © 2026 <span style={{ fontWeight: 600 }}>AI머씀?</span> All rights reserved. 모든 점수는 참고용입니다.
    </p>
  </footer>
);

export default Footer;
