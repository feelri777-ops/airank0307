import { ChartBar, Info, ShieldCheck, Target, Sparkle } from "../icons/PhosphorIcons";

const RankingGuideSection = () => {
  return (
    <section style={{
      padding: "48px 32px",
      background: "var(--bg-secondary)",
      borderTop: "1px solid var(--border-primary)",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: "var(--accent-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ChartBar size={24} color="white" weight="bold" />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>랭킹은 어떤 기준으로 산출되나요?</h2>
          </div>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
            AIRANK는 매주 월요일, <strong>Google의 차세대 AI(Gemini 3)와 실시간 구글 검색(Google Search)</strong>을 통해 수만 건의 데이터를 검색하고 분석하여 순위를 산출합니다.
          </p>
        </div>

        {/* 5대 지표 */}
        <div style={{ marginBottom: "48px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "28px", color: "var(--text-primary)", textAlign: "center" }}>
            5대 핵심 평가 지표 (Weighting)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            {/* 사용량 */}
            <div style={{
              padding: "24px", background: "var(--bg-card)", borderRadius: "12px",
              border: "1px solid var(--border-primary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#06b6d4"
                }}></div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>사용량 (30%)</div>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0, marginBottom: "8px" }}>
                실제 웹 트래픽, 앱 활성 사용자 수 등 대중적인 보급률 측정
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, opacity: 0.8 }}>
                Google Search 데이터를 통한 트래픽 분석
              </p>
            </div>

            {/* 기술력 */}
            <div style={{
              padding: "24px", background: "var(--bg-card)", borderRadius: "12px",
              border: "1px solid var(--border-primary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#818cf8"
                }}></div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>기술력 (25%)</div>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                AI 모델 성능(Benchmark), 독자적인 기술 혁신성 및 엔진 완성도 평가
              </p>
            </div>

            {/* 화제성 */}
            <div style={{
              padding: "24px", background: "var(--bg-card)", borderRadius: "12px",
              border: "1px solid var(--border-primary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#22d3ee"
                }}></div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>화제성 (20%)</div>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                뉴스 보도량, 소셜 미디어(SNS) 반응, 커뮤니티 내 화제 정도 분석
              </p>
            </div>

            {/* 유용성 */}
            <div style={{
              padding: "24px", background: "var(--bg-card)", borderRadius: "12px",
              border: "1px solid var(--border-primary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#a5b4fc"
                }}></div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>유용성 (15%)</div>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                실무 생산성 향상 기여도 및 사용자들의 실전 팁과 리뷰 종합
              </p>
            </div>

            {/* 성장성 */}
            <div style={{
              padding: "24px", background: "var(--bg-card)", borderRadius: "12px",
              border: "1px solid var(--border-primary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#67e8f9"
                }}></div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>성장성 (10%)</div>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                업데이트 빈도, 이용자 증가 속도 및 향후 발전 가능성 예측
              </p>
            </div>
          </div>
        </div>

        {/* 투명성 시스템 */}
        <div style={{
          padding: "32px", background: "var(--bg-card)", borderRadius: "16px",
          border: "1px solid var(--border-primary)"
        }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={20} color="var(--accent-indigo)" weight="fill" />
            AIRANK만의 특별한 투명성 시스템
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-primary)" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px", color: "var(--accent-indigo)" }}>✨ AI 순혈성 가중치</div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                단순히 AI 기능을 덧붙인 기존 서비스보다, 처음부터 AI 혁신을 위해 개발된 'Pure AI' 도구들에게 더 높은 점수를 부여합니다.
              </p>
            </div>
            <div style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-primary)" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px", color: "var(--accent-indigo)" }}>🛡️ 거대 플랫폼 왜곡 방지</div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                트래픽은 압도적이지만 AI 기술 비중이 낮은 서비스들이 랭킹을 독점하지 않도록 정교한 보정 시스템을 운영합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
            AI머씀?은 인공지능이 인간의 창의성을 돕는 세상을 꿈꿉니다.<br />
            매주 업데이트되는 랭킹을 통해 최고의 AI 파트너를 만나보세요.
          </p>
        </div>
      </div>
    </section>
  );
};

export default RankingGuideSection;
