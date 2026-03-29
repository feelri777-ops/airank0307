
import React from 'react';
import Icon from './Icon';

const METRICS = [
  {
    id: 'usage',
    label: '사용량 (Usage, 30%)',
    icon: 'chart-bar',
    desc: '실제 웹 트래픽, 앱 활성 사용자 수 등 대중적인 보급률을 측정합니다.'
  },
  {
    id: 'tech',
    label: '기술력 (Tech, 25%)',
    icon: 'target',
    desc: 'AI 모델 성능(Benchmark), 독자적인 기술 혁신성 및 엔진의 완성도를 평가합니다.'
  },
  {
    id: 'buzz',
    label: '화제성 (Buzz, 20%)',
    icon: 'sparkle',
    desc: '뉴스 보도량, 소셜 미디어(SNS) 반응, 커뮤니티 내 화제 정도를 분석합니다.'
  },
  {
    id: 'utility',
    label: '유용성 (Utility, 15%)',
    icon: 'shield-check',
    desc: '실제 업무의 생산성 향상 기여도 및 사용자들의 실전 팁과 리뷰를 종합합니다.'
  },
  {
    id: 'growth',
    label: '성장성 (Growth, 10%)',
    icon: 'trend-up',
    desc: '업데이트 빈도, 이용자 증가 속도 및 향후 발전 가능성을 예측합니다.'
  }
];

const MetricGuide = () => {
  return (
    <section style={{
      marginTop: '48px',
      padding: '32px',
      background: 'var(--bg-card)',
      borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border-primary)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 700, 
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 0 8px 0'
        }}>
          <Icon name="info" size={20} color="var(--accent-indigo)" />
          AIRANK 순위 산출 방식
        </h3>
        <p style={{ 
          fontSize: '0.9rem', 
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          margin: 0
        }}>
          매주 월요일, <strong>Google Search</strong>의 수만 건의 실시간 데이터와 <strong>Gemini 3</strong>의 심층 분석을 결합하여<br />
          객관적이고 정밀한 가중치 기반 5대 지표를 산출합니다.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px' 
      }}>
        {METRICS.map((m) => (
          <div key={m.id} style={{
            padding: '16px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border-primary)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '8px',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.95rem'
            }}>
              <Icon name={m.icon} size={18} color="var(--accent-indigo)" />
              {m.label}
            </div>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              margin: 0
            }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MetricGuide;
