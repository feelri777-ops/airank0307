import { ChartBar, Info, X, ShieldCheck, Target, Sparkle } from "../icons/PhosphorIcons";

const RankingMethodModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: "28px",
          border: "1px solid var(--border-primary)",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          position: "relative",
          animation: "modalFadeIn 0.3s ease-out",
        }}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .guide-section {
            padding: 1.5rem 1.8rem;
            border-bottom: 1px solid var(--border-primary);
          }
          .guide-section:last-child {
            border-bottom: none;
          }
          .metric-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
          }
          .metric-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-top: 6px;
            flex-shrink: 0;
          }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 10px; }
        `}</style>

        {/* 헤더 */}
        <div style={{
          padding: "1.2rem 1.8rem",
          borderBottom: "1px solid var(--border-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "var(--accent-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ChartBar size={20} color="white" weight="bold" />
            </div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>랭킹 산출 방식 안내</h2>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px"
          }}>
            <X size={24} />
          </button>
        </div>

        {/* 본문 */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
          <div className="guide-section">
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} color="var(--accent-indigo)" weight="fill" />
              어떻게 순위가 결정되나요?
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              AI머씀?은 매주 월요일, <strong>Google의 차세대 AI(Gemini 3)와 실시간 구글 검색(Google Search)</strong>을 통해 수만 건의 데이터를 검색하고 분석하여 순위를 산출합니다. 사람이 매기는 주관적 순위를 넘어 데이터 기반의 투명한 랭킹을 제공합니다.
            </p>
          </div>

          <div className="guide-section" style={{ background: "var(--bg-secondary)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>
              5대 핵심 평가 지표 (Weighting)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="metric-item">
                <div className="metric-dot" style={{ background: "#06b6d4" }}></div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>사용량 (30%)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>실제 웹 트래픽, 앱 활성 사용자 수 등 대중적인 보급률 측정</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px", opacity: 0.8 }}>Google Search 데이터를 통한 트래픽 분석</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-dot" style={{ background: "#818cf8" }}></div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>기술력 (25%)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>AI 모델 성능(Benchmark), 독자적인 기술 혁신성 및 엔진 완성도 평가</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-dot" style={{ background: "#22d3ee" }}></div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>화제성 (20%)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>뉴스 보도량, 소셜 미디어(SNS) 반응, 커뮤니티 내 화제 정도 분석</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-dot" style={{ background: "#a5b4fc" }}></div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>유용성 (15%)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>실무 생산성 향상 기여도 및 사용자들의 실전 팁과 리뷰 종합</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-dot" style={{ background: "#67e8f9" }}></div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>성장성 (10%)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>업데이트 빈도, 이용자 증가 속도 및 향후 발전 가능성 예측</div>
                </div>
              </div>
            </div>
          </div>

          <div className="guide-section">
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} color="var(--accent-indigo)" weight="fill" />
              AI머씀?만의 특별한 투명성 시스템
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-primary)" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px", color: "var(--accent-indigo)" }}>✨ AI 순혈성 가중치</div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                  단순히 AI 기능을 덧붙인 기존 서비스보다, 처음부터 AI 혁신을 위해 개발된 'Pure AI' 도구들에게 더 높은 점수를 부여합니다.
                </p>
              </div>
              <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-primary)" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px", color: "var(--accent-indigo)" }}>🛡️ 거대 플랫폼 왜곡 방지</div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                  트래픽은 압도적이지만 AI 기술 비중이 낮은 서비스들이 랭킹을 독점하지 않도록 정교한 보정 시스템을 운영합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="guide-section" style={{ textAlign: "center", paddingBottom: "2rem" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
              AI머씀?은 인공지능이 인간의 창의성을 돕는 세상을 꿈꿉니다.<br />
              매주 업데이트되는 랭킹을 통해 최고의 AI 파트너를 만나보세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankingMethodModal;
