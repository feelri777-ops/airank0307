import { ChartBar } from "../icons/PhosphorIcons";

const RankingGuideSection = () => {
  return (
    <section style={{
      padding: "20px 24px",
      background: "var(--bg-secondary)",
      borderTop: "1px solid var(--border-primary)",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "6px",
              background: "var(--accent-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ChartBar size={16} color="white" weight="bold" />
            </div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              랭킹은 어떤 기준으로 산출되나요?
            </h2>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.3, margin: 0, marginLeft: "36px" }}>
            Google의 AI(Gemini 3)와 실시간 검색 데이터 분석
          </p>
        </div>

        {/* 5대 지표 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "14px" }}>
          {/* 사용량 */}
          <div style={{
            padding: "12px", background: "var(--bg-card)", borderRadius: "8px",
            border: "1px solid var(--border-primary)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#06b6d4", flexShrink: 0
              }}></div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>사용량 <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: 500 }}>(30%)</span></div>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: "1.3", margin: 0 }}>
              웹 트래픽, 활성 사용자 수
            </p>
          </div>

          {/* 기술력 */}
          <div style={{
            padding: "12px", background: "var(--bg-card)", borderRadius: "8px",
            border: "1px solid var(--border-primary)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#818cf8", flexShrink: 0
              }}></div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>기술력 <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: 500 }}>(25%)</span></div>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: "1.3", margin: 0 }}>
              모델 성능, 기술 혁신성
            </p>
          </div>

          {/* 화제성 */}
          <div style={{
            padding: "12px", background: "var(--bg-card)", borderRadius: "8px",
            border: "1px solid var(--border-primary)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#22d3ee", flexShrink: 0
              }}></div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>화제성 <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: 500 }}>(20%)</span></div>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: "1.3", margin: 0 }}>
              뉴스, SNS 반응
            </p>
          </div>

          {/* 유용성 */}
          <div style={{
            padding: "12px", background: "var(--bg-card)", borderRadius: "8px",
            border: "1px solid var(--border-primary)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#a5b4fc", flexShrink: 0
              }}></div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>유용성 <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: 500 }}>(15%)</span></div>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: "1.3", margin: 0 }}>
              업무 생산성 향상
            </p>
          </div>

          {/* 성장성 */}
          <div style={{
            padding: "12px", background: "var(--bg-card)", borderRadius: "8px",
            border: "1px solid var(--border-primary)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#67e8f9", flexShrink: 0
              }}></div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>성장성 <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: 500 }}>(10%)</span></div>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: "1.3", margin: 0 }}>
              업데이트, 이용자 증가
            </p>
          </div>
        </div>

        {/* 투명성 시스템 */}
        <div style={{
          padding: "12px 14px", background: "var(--bg-card)", borderRadius: "8px",
          border: "1px solid var(--border-primary)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px"
        }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", color: "var(--accent-indigo)" }}>
              ✨ AI 순혈성
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.3 }}>
              Pure AI 도구에 더 높은 점수 부여
            </p>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", color: "var(--accent-indigo)" }}>
              🛡️ 왜곡 방지
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.3 }}>
              AI 기술 비중 낮은 서비스 견제
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RankingGuideSection;
