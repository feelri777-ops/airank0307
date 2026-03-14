import { useState, useEffect, useRef } from "react";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { TOOLS_DATA } from "../../data/tools";

// 미니 스파크라인 SVG (ScoreInsightPanel 밖에 정의 → remount 방지로 애니메이션 1회만 실행)
const Spark = ({ pts, color }) => {
  const sw = 180, sh = 20;
  const mn = Math.min(...pts) - 0.5;
  const mx = Math.max(...pts) + 0.5;
  const r = mx - mn || 1;
  const sx = (i) => (i / (pts.length - 1)) * sw;
  const sy = (v) => sh - ((v - mn) / r) * sh;
  const pd = pts.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const ad = `${pd} L${sw},${sh} L0,${sh} Z`;
  return (
    <svg viewBox={`0 0 ${sw} ${sh}`} width="100%" height={sh} style={{ overflow: "visible", display: "block" }}>
      <path d={ad} fill={color} style={{ fillOpacity: 0, animation: "sparkFade 0.8s ease 0.2s forwards" }} />
      <path d={pd} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1"
        style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "sparkDraw 0.8s ease forwards" }}
      />
      {pts.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)}
          r={i === pts.length - 1 ? 3 : 2}
          fill={i === pts.length - 1 ? color : "var(--bg-card)"}
          stroke={color} strokeWidth={i === pts.length - 1 ? 0 : 1.2}
          style={{ opacity: 0, animation: `sparkDot 0.3s ease ${0.1 + i * 0.08}s forwards` }}
        />
      ))}
    </svg>
  );
};

// 점수 상세 바 컴포넌트
const ScoreInsightPanel = ({ tool }) => {
  const [metrics, setMetrics] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    fetch("/scores.json")
      .then(r => r.json())
      .then(data => {
        const m = data.tools?.[String(tool.id)]?.metrics;
        if (m) setMetrics(m);
      })
      .catch(() => {});
  }, [tool.id]);

  const isUp = (tool.change ?? 0) > 0;
  const isFlat = (tool.change ?? 0) === 0;
  const trendColor = isFlat ? "#64748b" : isUp ? "#22c55e" : "#f87171";

  // 종합 7일 추이 데이터
  const score = tool.score ?? 0;
  const change = tool.change ?? 0;
  const dailyChange = change / 6;
  const totalPts = Array.from({ length: 7 }, (_, i) =>
    Math.max(0, Math.min(100, score - dailyChange * (6 - i)))
  );

  // 지표별 pseudo 스파크 데이터 (변동폭 ±4, 오늘값 수렴)
  const genPts = (val, key) => {
    const seed = tool.id * 31 + key.charCodeAt(0) * 17;
    const pseudo = (n) => Math.sin(seed + n * 137.5) * 0.5 + 0.5;
    return Array.from({ length: 7 }, (_, i) => {
      if (i === 6) return val;
      return Math.max(0, Math.min(100, val + (pseudo(i) - 0.5) * 8 * (1 - i / 6)));
    });
  };

  const rows = [
    { icon: null,  label: "종합점수", pts: totalPts, val: Math.round(score), color: "#F59E0B", desc: null },
    { icon: "https://www.google.com/s2/favicons?domain=google.com&sz=32", label: "Google", key: "opr", color: "#4285F4", desc: "Open PageRank 기반 글로벌 도메인 권위도 (구글 트래픽)" },
    { icon: "https://www.google.com/s2/favicons?domain=naver.com&sz=32",  label: "Naver",  key: "ntv", color: "#06B6D4", desc: "네이버 검색 트렌드 API 기반 국내 검색량 (최고점 대비 정규화)" },
    { icon: "https://www.google.com/s2/favicons?domain=x.com&sz=32",      label: "X",      key: "sns", color: "#F97316", desc: "XPOZ API 기반 실시간 트위터(X) 언급량 분석" },
    { icon: "https://www.google.com/s2/favicons?domain=github.com&sz=32", label: "GitHub", key: "ghs", color: "#8B5CF6", desc: "GitHub Stars 수 기반 오픈소스 기술 파급력 (로그 스케일)" },
  ];

  return (
    <div style={{ marginBottom: "12px" }} onClick={(e) => e.stopPropagation()}>
      {/* 타이틀 + 변동률 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>점수 상세</span>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: isFlat ? "var(--text-muted)" : isUp ? "#22c55e" : "#f87171" }}>
          {isFlat ? "변동없음" : isUp ? `▲ ${change}%` : `▼ ${Math.abs(change)}%`}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {rows.map(({ icon, label, key, pts: fixedPts, val: fixedVal, color, desc }, idx) => {
          const val = fixedVal ?? Math.round(metrics?.[key] ?? 0);
          const pts = fixedPts ?? (metrics ? genPts(val, key) : null);
          if (!pts) return null;
          const finalDesc = (key === "ghs" && val === 0) ? `${desc} (비오픈소스)` : desc;
          const isActive = activeTooltip === idx;
          return (
            <div key={idx} style={{ position: "relative" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px", cursor: desc ? "pointer" : "default" }}
                onClick={(e) => { if (desc) { e.stopPropagation(); setActiveTooltip(prev => prev === idx ? null : idx); } }}
                onMouseEnter={() => { if (desc) setActiveTooltip(idx); }}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div style={{ width: 24, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {icon && <img src={icon} alt={label} width={22} height={22} style={{ borderRadius: "4px", objectFit: "contain" }} />}
                </div>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", width: "52px", flexShrink: 0, whiteSpace: "nowrap" }}>{label}</span>
                <div style={{ flex: 1 }}><Spark pts={pts} color={color} /></div>
                <span style={{ fontSize: idx === 0 ? "1.6rem" : "1.1rem", fontWeight: 900, color: idx === 0 ? trendColor : color, width: "36px", textAlign: "right", fontFamily: "'Pretendard', sans-serif", lineHeight: 1 }}>{val}</span>
              </div>
              {isActive && finalDesc && (
                <div style={{
                  position: "absolute", left: "72px", bottom: "100%", marginBottom: "6px",
                  fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.4,
                  padding: "6px 10px", background: "var(--bg-card)", borderRadius: "6px",
                  border: "1px solid var(--border-primary)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  zIndex: 20, whiteSpace: "nowrap", pointerEvents: "none", animation: "fadeIn 0.2s ease"
                }}>
                  {finalDesc}
                  <div style={{ position: "absolute", top: "100%", left: "16px", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid var(--border-primary)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};



// 점수 그래프 생성 함수
const generateSparkData = (tool) => {
  const pseudo = (n) => Math.sin(tool.id * 127.1 + n * 311.7) * 0.5 + 0.5;
  const today = tool.score;
  const weekAgo = today / (1 + tool.change / 100);
  return Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return today;
    const t = i / 6;
    const base = weekAgo + (today - weekAgo) * t;
    return Math.round(Math.max(1, Math.min(100, base + (pseudo(i) - 0.5) * 6)));
  });
};

const SparkChart = ({ data, color }) => {
  const w = 200, h = 34;
  const min = Math.min(...data) - 4;
  const max = Math.max(...data) + 4;
  const range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / range) * h]);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ overflow: "visible", display: "block" }}>
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={areaPath} fill="url(#sg)" /><path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={i === pts.length - 1 ? 3.5 : 2} fill={color} />)}
    </svg>
  );
};

const getFaviconUrl = (url) => {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return null; }
};

const CAT_LABEL = {
  text: "💬 텍스트", image: "🎨 이미지", code: "💻 코딩",
  video: "🎬 영상", audio: "🎵 오디오", search: "🔍 검색",
  productivity: "⚡ 생산성", design: "✏️ 디자인",
};

const LIFE_LABEL = {
  office: "직장인", student: "학생", freelancer: "프리랜서",
  marketer: "마케터", startup: "스타트업", creator: "크리에이터",
};

// 카테고리 × 직군 기반 사용 시나리오 자동 생성
const SCENARIO_MAP = {
  text: {
    office:     "보고서·이메일 초안을 5분 안에 완성해보세요",
    student:    "논문 요약과 레포트 작성에 바로 활용해보세요",
    freelancer: "제안서·기획서 초안을 빠르게 잡아보세요",
    marketer:   "광고 카피와 SNS 문구를 대량으로 뽑아보세요",
    startup:    "투자 피칭 문서와 기획서를 빠르게 만들어보세요",
    creator:    "영상 스크립트와 블로그 글을 자동 생성해보세요",
    default:    "텍스트 작업을 AI로 10배 빠르게 처리해보세요",
  },
  image: {
    office:     "프레젠테이션용 이미지를 직접 만들어보세요",
    student:    "과제용 삽화와 커버 이미지를 무료로 만들어보세요",
    freelancer: "클라이언트 시안을 몇 초 만에 뽑아보세요",
    marketer:   "SNS 비주얼 콘텐츠를 매일 빠르게 생성해보세요",
    startup:    "제품 목업 이미지를 AI로 즉시 만들어보세요",
    creator:    "썸네일·일러스트를 AI로 무한 생성해보세요",
    default:    "원하는 이미지를 텍스트만으로 바로 만들어보세요",
  },
  code: {
    office:     "반복 업무 자동화 스크립트를 AI로 만들어보세요",
    student:    "코딩 과제 디버깅과 개념 학습에 써보세요",
    freelancer: "개발 속도를 2배 높이는 코드 보조 도구로 써보세요",
    startup:    "MVP 개발 속도를 획기적으로 높여보세요",
    default:    "코드 작성·디버깅·리뷰를 AI와 함께해보세요",
  },
  video: {
    creator:  "유튜브·릴스용 쇼츠를 AI로 자동 편집해보세요",
    marketer: "광고·제품 소개 영상을 빠르게 제작해보세요",
    office:   "교육 영상이나 발표 자료를 쉽게 만들어보세요",
    default:  "영상 제작의 시간과 비용을 AI로 줄여보세요",
  },
  audio: {
    creator:  "팟캐스트 음성과 AI 내레이션을 즉시 만들어보세요",
    marketer: "광고 음성과 배경음악을 AI로 제작해보세요",
    default:  "원하는 목소리와 음악을 AI로 생성해보세요",
  },
  search: {
    office:  "방대한 정보를 빠르게 요약해서 찾아보세요",
    student: "리서치 시간을 절반으로 줄여보세요",
    default: "AI 검색으로 원하는 정보를 더 빠르게 찾아보세요",
  },
  productivity: {
    office:  "반복 업무를 자동화해서 퇴근을 앞당겨보세요",
    student: "공부 계획과 노트 정리를 AI로 해보세요",
    startup: "팀 생산성을 높이는 AI 워크플로우를 만들어보세요",
    default: "일상 업무를 AI로 자동화해 시간을 벌어보세요",
  },
  automation: {
    office:  "이메일·일정·데이터 처리를 자동화해보세요",
    startup: "반복 운영 업무의 80%를 자동화해보세요",
    default: "노코드로 업무 자동화 워크플로우를 만들어보세요",
  },
  design: {
    creator:  "전문 디자이너 없이 브랜드 자료를 만들어보세요",
    marketer: "마케팅 소재를 5분 안에 디자인해보세요",
    startup:  "제품 UI와 브랜드 디자인을 빠르게 완성해보세요",
    default:  "누구나 전문가 수준의 디자인을 만들 수 있어요",
  },
  education: {
    student: "어떤 개념이든 쉽게 설명받고 바로 이해해보세요",
    office:  "새로운 기술과 지식을 AI 튜터와 빠르게 배워보세요",
    default: "AI 튜터와 함께 어떤 주제든 빠르게 학습해보세요",
  },
};

const getScenario = (tool) => {
  const catMap = SCENARIO_MAP[tool.cat];
  if (!catMap) return "AI의 힘으로 업무 효율을 높여보세요";
  const life = tool.life?.[0];
  return (life && catMap[life]) || catMap.default || "AI의 힘으로 업무 효율을 높여보세요";
};

// 카테고리 보완 관계
const COMPLEMENT_CATS = {
  text:         ["code", "image", "productivity", "design", "search"],
  image:        ["text", "design", "video"],
  code:         ["text", "productivity", "design"],
  video:        ["audio", "text", "image"],
  audio:        ["video", "text"],
  search:       ["text", "productivity"],
  productivity: ["text", "code", "automation"],
  design:       ["image", "text", "code"],
  automation:   ["productivity", "code"],
  education:    ["text", "search"],
};

// 카테고리 조합별 시너지 설명
const PAIR_REASON = {
  "code+text":         "코드 작성 후 문서·설명 자동 생성",
  "image+text":        "이미지 생성 + 텍스트 캡션·카피 작성",
  "design+text":       "디자인 시안 + AI 카피라이팅",
  "design+image":      "이미지 생성 소스로 디자인 작업",
  "audio+video":       "영상에 AI 음성·BGM 자동 추가",
  "image+video":       "이미지 소스로 영상 콘텐츠 제작",
  "code+productivity": "개발 작업 + 반복 업무 자동화",
  "productivity+text": "문서 작성 후 워크플로우 자동화",
  "search+text":       "AI 리서치 후 바로 글쓰기",
  "automation+code":   "코드 생성 + 노코드 자동화 연결",
};

const getPairReason = (catA, catB) => {
  const key = [catA, catB].sort().join("+");
  return PAIR_REASON[key] || "함께 사용하면 시너지 효과";
};

const getRelatedTools = (tool) => {
  const complementCats = COMPLEMENT_CATS[tool.cat] || [];
  return TOOLS_DATA
    .filter(t => t.id !== tool.id)
    .map(t => {
      let score = 0;
      if (t.cat === tool.cat) score += 1;
      if (complementCats.includes(t.cat)) score += 2;
      const lifeOverlap = (t.life || []).filter(l => (tool.life || []).includes(l)).length;
      score += lifeOverlap * 0.4;
      score += t.score / 300; // 인기 보정
      return { ...t, _score: score };
    })
    .filter(t => t._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);
};

// [오른쪽] 심층 분석 카드
const ToolAnalysisCard = ({ tool, rank, cardWidth }) => {
  const [videos, setVideos] = useState(null); // null=로딩중, []=없음, [...]=있음

  useEffect(() => {
    // 캐시 방지를 위해 타임스탬프 추가
    fetch(`/youtube-videos.json?v=${new Date().getTime()}`)
      .then((r) => r.json())
      .then((data) => {
        const toolVideos = data.videos?.[String(tool.id)];
        setVideos(toolVideos || []);
      })
      .catch(() => setVideos([]));
  }, [tool.id]);

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((tool.yt || tool.name) + " 사용법")}`;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-primary)",
      borderRadius: "16px",
      padding: "1.5rem",
      width: cardWidth || "340px",
      flexShrink: 0,
      display: "flex", flexDirection: "column",
      boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      height: "fit-content"
    }}>
      <div style={{ padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "3px", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          <span style={{ color: "var(--accent-indigo)", fontWeight: 700 }}>💡 이렇게 써보세요</span><br/>
          {getScenario(tool)}
        </p>
      </div>

      {/* 함께 쓰면 좋은 툴 추천 */}
      {(() => {
        const related = getRelatedTools(tool);
        if (!related.length) return null;
        return (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
              🤝 함께 쓰면 좋은 툴
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {related.map(rt => (
                <a
                  key={rt.id}
                  href={rt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "3px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-indigo)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(rt.url).hostname}&sz=32`}
                    alt={rt.name}
                    style={{ width: 28, height: 28, borderRadius: "3px", flexShrink: 0 }}
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{rt.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getPairReason(tool.cat, rt.cat)}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.62rem", padding: "2px 7px", borderRadius: "5px", background: "var(--accent-gradient)", color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                    {CAT_LABEL[rt.cat]?.replace(/^.\s/, "") ?? rt.cat}
                  </span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {rank <= 30 && <>
      <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
        🎥 튜토리얼 & 리뷰
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {videos === null ? (
          // 로딩 중
          [1, 2, 3].map((i) => (
            <div key={i} style={{
              height: "70px", borderRadius: "4px",
              background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))
        ) : videos.length > 0 ? (
          // 실제 YouTube 영상 (최대 3개)
          videos.slice(0, 3).map((video) => (
            <a
              key={video.videoId}
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", gap: "12px", textDecoration: "none",
                padding: "8px", borderRadius: "4px", background: "var(--bg-secondary)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "var(--bg-secondary)";
              }}
            >
              <div style={{
                width: "120px", height: "68px", borderRadius: "5px",
                overflow: "hidden", flexShrink: 0, position: "relative", background: "#000"
              }}>
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,0,0,0.2)"
                }}>
                  <div style={{
                    width: "20px", height: "20px", background: "#FF0000", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 8px rgba(255,0,0,0.3)"
                  }}>
                    <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "6px solid white", marginLeft: "1.5px" }} />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{
                  fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", lineHeight: 1.35
                }}>
                  {video.title}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>{video.channelTitle}</div>
              </div>
            </a>
          ))
        ) : (
          // 영상 없음 → YouTube 검색 링크
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "16px", borderRadius: "4px", background: "var(--bg-secondary)",
              border: "1px solid var(--border-primary)", textDecoration: "none",
              color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FF0000"; e.currentTarget.style.color = "#FF0000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <img src="https://www.google.com/s2/favicons?domain=youtube.com&sz=32" alt="YouTube" style={{ width: 20, height: 20 }} />
            YouTube에서 검색하기 →
          </a>
        )}
      </div>
      </>}
    </div>
  );
};

// [메인] 모달 컴포넌트
const ToolDetailModal = ({ tool, rank, onClose }) => {
  const [iconError, setIconError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const touchStartX = useRef(null);
  const { user, login } = useAuth();
  const faviconUrl = tool ? getFaviconUrl(tool.url) : null;

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    if (!user || !tool) { setBookmarked(false); return; }
    const ref = doc(db, "bookmarks", `${user.uid}_${tool.id}`);
    getDoc(ref).then((snap) => setBookmarked(snap.exists()));
  }, [user, tool]);

  const toggleBookmark = async () => {
    if (!user) { login(); return; }
    const ref = doc(db, "bookmarks", `${user.uid}_${tool.id}`);
    if (bookmarked) { await deleteDoc(ref); setBookmarked(false); }
    else { await setDoc(ref, { uid: user.uid, toolId: tool.id, toolName: tool.name, savedAt: Date.now() }); setBookmarked(true); }
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) setCardIndex(diff > 0 ? 1 : 0);
    touchStartX.current = null;
  };

  if (!tool) return null;

  const CARD_WIDTH = "min(92vw, 480px)";

  const card1 = (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-primary)",
      borderRadius: "16px",
      padding: "1.2rem",
      width: CARD_WIDTH,
      flexShrink: 0,
      boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      position: "relative",
    }}>
      <button onClick={onClose} style={{ position: "absolute", top: "10px", right: "10px", background: "var(--bg-tertiary)", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>✕</button>
      <button onClick={toggleBookmark} title={user ? (bookmarked ? "북마크 해제" : "북마크 저장") : "로그인 후 북마크 가능"} style={{ position: "absolute", top: "10px", right: "46px", background: bookmarked ? "rgba(239,68,68,0.1)" : "var(--bg-tertiary)", border: bookmarked ? "1px solid #ef4444" : "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", color: bookmarked ? "#ef4444" : "var(--text-muted)", zIndex: 1 }}>{bookmarked ? "♥" : "♡"}</button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        {!iconError && faviconUrl ? ( <img src={faviconUrl} alt={tool.name} width={32} height={32} style={{ borderRadius: "4px", objectFit: "contain", flexShrink: 0 }} onError={() => setIconError(true)} /> ) : ( <span style={{ fontSize: "1.8rem" }}>{tool.icon}</span> )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{tool.name}</h2>
            {rank <= 3 ? (
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: rank === 1 ? "#F59E0B" : rank === 2 ? "#94A3B8" : "#CD7F32", background: rank === 1 ? "rgba(245,158,11,0.12)" : rank === 2 ? "rgba(148,163,184,0.12)" : "rgba(205,127,50,0.12)", border: `1px solid ${rank === 1 ? "#F59E0B" : rank === 2 ? "#94A3B8" : "#CD7F32"}`, borderRadius: "5px", padding: "2px 7px" }}>
                {rank === 1 ? "👑" : rank === 2 ? "💎" : "🎯"} #{rank}
              </span>
            ) : rank ? (
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "5px", padding: "2px 7px" }}>#{rank}</span>
            ) : null}
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "12.5px" }}>{tool.desc}</p>

      <ScoreInsightPanel tool={tool} />

      {tool.features && ( <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>핵심 기능</div><ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>{tool.features.map((f, i) => ( <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}><span style={{ color: "var(--accent-indigo)", fontWeight: 800, fontSize: "0.9rem", marginTop: "2px", flexShrink: 0 }}>✓</span><span style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{f}</span></li>))}</ul></div>)}

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>{tool.tags.filter(tag => tag !== "무료" && tag !== "유료").map((tag) => ( <span key={tag} style={{ fontSize: "0.65rem", padding: "3px 8px", borderRadius: "3px", background: "var(--tag-bg)", color: "var(--tag-color)", border: "1px solid var(--tag-border)", fontWeight: 600 }}>{tag}</span>))}</div>

      <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {tool.cat && ( <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>카테고리</span><span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "5px", background: "var(--accent-gradient)", color: "#fff", fontWeight: 700 }}>{CAT_LABEL[tool.cat] ?? tool.cat}</span></div>)}
        {tool.life?.length > 0 && ( <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}><span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>추천 대상</span><div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>{tool.life.map((l) => ( <span key={l} style={{ fontSize: "0.65rem", padding: "3px 8px", borderRadius: "3px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", fontWeight: 600 }}>{LIFE_LABEL[l] ?? l}</span>))}</div></div>)}
      </div>

      {tool.url && ( <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "14px", background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))", color: "#fff", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontWeight: 800, fontSize: "0.9rem", textDecoration: "none", boxShadow: "0 8px 16px rgba(79, 70, 229, 0.2)" }}>공식 사이트 방문 →</a>)}
    </div>
  );

  const card2 = (
    <div style={{ width: CARD_WIDTH, flexShrink: 0 }}>
      <ToolAnalysisCard tool={tool} rank={rank} cardWidth={CARD_WIDTH} />
    </div>
  );

  const DESKTOP_CARD_WIDTH = "min(442px, 46vw)";

  if (!isMobile) {
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center", gap: "16px", width: "100%", maxWidth: "1000px", margin: "auto" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: "16px", padding: "1.5rem", width: DESKTOP_CARD_WIDTH, flexShrink: 0, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", position: "relative", height: "fit-content" }}>
            <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "var(--bg-tertiary)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "1rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <button onClick={toggleBookmark} title={user ? (bookmarked ? "북마크 해제" : "북마크 저장") : "로그인 후 북마크 가능"} style={{ position: "absolute", top: "16px", right: "56px", background: bookmarked ? "rgba(239,68,68,0.1)" : "var(--bg-tertiary)", border: bookmarked ? "1px solid #ef4444" : "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", color: bookmarked ? "#ef4444" : "var(--text-muted)" }}>{bookmarked ? "♥" : "♡"}</button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              {!iconError && faviconUrl ? ( <img src={faviconUrl} alt={tool.name} width={40} height={40} style={{ borderRadius: "5px", objectFit: "contain", flexShrink: 0 }} onError={() => setIconError(true)} /> ) : ( <span style={{ fontSize: "2.2rem" }}>{tool.icon}</span> )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{tool.name}</h2>
                  {rank <= 3 ? (
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: rank === 1 ? "#F59E0B" : rank === 2 ? "#94A3B8" : "#CD7F32", background: rank === 1 ? "rgba(245,158,11,0.12)" : rank === 2 ? "rgba(148,163,184,0.12)" : "rgba(205,127,50,0.12)", border: `1px solid ${rank === 1 ? "#F59E0B" : rank === 2 ? "#94A3B8" : "#CD7F32"}`, borderRadius: "5px", padding: "2px 8px" }}>
                      {rank === 1 ? "👑" : rank === 2 ? "💎" : "🎯"} #{rank}
                    </span>
                  ) : rank ? (
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "5px", padding: "2px 8px" }}>#{rank}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "16px" }}>{tool.desc}</p>
            <ScoreInsightPanel tool={tool} />
            {tool.features && ( <div style={{ marginBottom: "24px" }}><div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>핵심 기능</div><ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>{tool.features.map((f, i) => ( <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}><span style={{ color: "var(--accent-indigo)", fontWeight: 800, fontSize: "0.95rem", marginTop: "2px", flexShrink: 0 }}>✓</span><span style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{f}</span></li>))}</ul></div>)}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>{tool.tags.filter(tag => tag !== "무료" && tag !== "유료").map((tag) => ( <span key={tag} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "4px", background: "var(--tag-bg)", color: "var(--tag-color)", border: "1px solid var(--tag-border)", fontWeight: 600 }}>{tag}</span>))}</div>
            <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {tool.cat && ( <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>카테고리</span><span style={{ fontSize: "0.75rem", padding: "4px 12px", borderRadius: "5px", background: "var(--accent-gradient)", color: "#fff", fontWeight: 700 }}>{CAT_LABEL[tool.cat] ?? tool.cat}</span></div>)}
              {tool.life?.length > 0 && ( <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}><span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>추천 대상</span><div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{tool.life.map((l) => ( <span key={l} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "4px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", fontWeight: 600 }}>{LIFE_LABEL[l] ?? l}</span>))}</div></div>)}
            </div>
            {tool.url && ( <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: "4px", background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))", color: "#fff", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontWeight: 800, fontSize: "1rem", textDecoration: "none", transition: "all 0.2s ease", boxShadow: "0 8px 16px rgba(79, 70, 229, 0.2)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 20px rgba(79, 70, 229, 0.3)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(79, 70, 229, 0.2)"; }}>공식 사이트 방문 →</a>)}
          </div>
          <ToolAnalysisCard tool={tool} rank={rank} cardWidth={DESKTOP_CARD_WIDTH} />
        </div>
      </div>
    );
  }

  // 모바일/태블릿 세로 스크롤 UI
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", overflowY: "auto" }}
    >
      <div
        onClick={(e) => { if (e.target.closest("button, a")) e.stopPropagation(); }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "24px 16px 40px" }}
      >
        {card1}
        {card2}
      </div>
    </div>
  );
};

export default ToolDetailModal;
