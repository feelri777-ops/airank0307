import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { TOOLS_DATA } from "../../data/tools";
import { decodeHtmlEntities } from "../../utils";
import { YoutubeLogoFill, BookmarkSimple, BookmarkSimpleFill, ArrowRight } from "../icons/PhosphorIcons";

// 미니 스파크라인 SVG (ScoreInsightPanel 밖에 정의 → remount 방지로 애니메이션 1회만 실행)
// 미니 프로그레스 바 (네온 글로우 & 초정밀 부드러운 성장 애니메이션)
const Spark = ({ pts, color }) => {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const targetPercent = Math.max(2, Math.min(100, pts[pts.length - 1] || 0));

  // 벚꽃 테마(light)일 경우 핑크색 계열로 강제 적용
  const finalColor = theme === "light" ? "#f472b6" : color;

  useEffect(() => {
    // 마운트 후 아주 약간의 대기 시간을 두어 모달 팝업과 애니메이션이 엉키지 않게 함
    const timer = setTimeout(() => {
      setWidth(targetPercent);
    }, 150);
    return () => clearTimeout(timer);
  }, [targetPercent]);
  
  return (
    <div style={{ 
      width: "100%", height: "8px", background: theme === "light" ? "rgba(180,80,100,0.08)" : "rgba(0,0,0,0.15)", 
      borderRadius: "10px", overflow: "visible", position: "relative",
    }}>
      <div style={{ 
        width: `${width}%`, height: "100%", 
        background: finalColor,
        borderRadius: "10px", 
        // 바운스 효과를 없애고 극도로 부드러운 가속도 곡선(Quintic Out) 적용
        transition: "width 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
        position: "relative",
        boxShadow: `0 0 14px ${finalColor}80, 0 0 4px ${finalColor}`,
      }}>
        {/* 리딩 엣지(끝부분) 하이라이트 */}
        <div style={{
          position: "absolute", right: "-1px", top: "-2.5px", bottom: "-2.5px", width: "4px",
          background: "#fff",
          borderRadius: "10px",
          boxShadow: `0 0 8px #fff, 0 0 15px ${finalColor}`,
          opacity: 0.9,
          animation: "pulse 2s infinite"
        }} />
      </div>
    </div>
  );
};

// 점수 상세 바 컴포넌트
const ScoreInsightPanel = ({ tool }) => {
  const [metrics, setMetrics] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    fetch(`/scores.json?t=${new Date().getTime()}`)
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
    { icon: "⭐", label: "종합점수", pts: totalPts, val: Math.round(score), color: "#F59E0B", desc: null },
    { icon: "https://www.google.com/s2/favicons?domain=google.com&sz=32", label: "Google", key: "opr", color: "#4285F4", desc: "Open PageRank 기반 글로벌 도메인 권위도 (구글 트래픽)" },
    { icon: "https://www.google.com/s2/favicons?domain=naver.com&sz=32",  label: "Naver",  key: "ntv", color: "#06B6D4", desc: "네이버 검색 트렌드 API 기반 국내 검색량 (최고점 대비 정규화)" },
    { icon: "https://www.google.com/s2/favicons?domain=x.com&sz=32",      label: "X",      key: "sns", color: "#F97316", desc: "XPOZ API 기반 실시간 트위터(X) 언급량 분석" },
    { icon: "https://www.google.com/s2/favicons?domain=github.com&sz=32", label: "GitHub", key: "ghs", color: "#8B5CF6", desc: "GitHub Stars 수 기반 오픈소스 기술 파급력 (로그 스케일)" },
  ];

  return (
    <div style={{ marginBottom: "6px" }} onClick={(e) => e.stopPropagation()}>
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
                <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {icon && (icon.startsWith("http")
                    ? <img src={icon} alt={label} width={18} height={18} style={{ borderRadius: "var(--r-xs)", objectFit: "contain" }} />
                    : <span style={{ fontSize: "14px", lineHeight: 1 }}>{icon}</span>
                  )}
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", width: "40px", flexShrink: 0, whiteSpace: "nowrap" }}>{label}</span>
                <div style={{ flex: 1 }}><Spark pts={pts} color={color} /></div>
                <span style={{ fontSize: idx === 0 ? "1.6rem" : "1.1rem", fontWeight: 900, color: idx === 0 ? trendColor : color, width: "36px", textAlign: "right", fontFamily: "'Pretendard', sans-serif", lineHeight: 1 }}>{val}</span>
              </div>
              {isActive && finalDesc && (
                <div style={{
                  position: "absolute", left: "72px", bottom: "100%", marginBottom: "6px",
                  fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.4,
                  padding: "6px 10px", background: "var(--bg-card)", borderRadius: "var(--r-xs)",
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

const TOOL_BOARD_MAP = {
  "ChatGPT": "chatgpt",
  "Gemini": "gemini",
  "Claude": "claude",
  "Grok": "grok",
  "NotebookLM": "notebooklm",
  "Microsoft Copilot": "copilot",
  "Copilot": "copilot",
  "GitHub Copilot": "copilot",
  "Perplexity": "perplexity",
  "Perplexity AI": "perplexity",
  "Midjourney": "midjourney",
  "Cursor": "cursor",
  "Stable Diffusion": "stablediffusion",
  "Runway": "runway",
  "Runway ML": "runway",
  "Runway Gen-3": "runway",
  "Suno": "suno",
  "Suno AI": "suno",
  "Windsurf": "windsurf",
  "Notion AI": "notion",
  "Notion": "notion",
  "Sora": "sora",
};

const CAT_LABEL = {
  multimodal: "🔮 멀티모달", text: "💬 텍스트", image: "🎨 이미지", code: "💻 코딩",
  video: "🎬 영상", audio: "🎵 오디오/음악", search: "🔍 연구/검색",
  agent: "🤖 에이전트", other: "📦 기타",
};

const LIFE_LABEL = {
  office: "직장인", student: "학생", freelancer: "프리랜서",
  marketer: "마케터", startup: "스타트업", creator: "크리에이터",
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
      borderRadius: "var(--r-md)",
      padding: "0.75rem",
      width: cardWidth || "340px",
      flexShrink: 0,
      display: "flex", flexDirection: "column",
      boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      height: "fit-content"
    }}>

      {rank <= 30 && <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
        <YoutubeLogoFill size={20} color="var(--text-primary)" />
        <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>인기영상</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "1rem" }}>
        {videos === null ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              height: "80px", borderRadius: "var(--r-xs)",
              background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))
        ) : videos.length > 0 ? (
          videos.slice(0, 4).map((video) => (
            <a
              key={video.videoId}
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", gap: "10px", textDecoration: "none",
                padding: "4px", borderRadius: "var(--r-xs)", background: "var(--bg-secondary)",
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
                width: "140px", height: "82px", borderRadius: "var(--r-xs)",
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
                    width: "22px", height: "22px", background: "#FF0000", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 8px rgba(255,0,0,0.3)"
                  }}>
                    <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "7px solid white", marginLeft: "2px" }} />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{
                  fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", lineHeight: 1.35
                }}>
                  {decodeHtmlEntities(video.title)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>{decodeHtmlEntities(video.channelTitle)}</div>
              </div>
            </a>
          ))
        ) : (
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "16px", borderRadius: "var(--r-xs)", background: "var(--bg-secondary)",
              border: "1px solid var(--border-primary)", textDecoration: "none",
              color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600,
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FF0000"; e.currentTarget.style.color = "#FF0000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <img src="https://www.google.com/s2/favicons?domain=youtube.com&sz=32" alt="YouTube" style={{ width: 20, height: 20 }} />
            YouTube에서 검색하기 <ArrowRight size={14} />
          </a>
        )}
      </div>
      </>}

      {/* 함께 쓰면 좋은 툴 추천 */}
      {(() => {
        const related = getRelatedTools(tool);
        if (!related.length) return null;
        return (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
              함께 쓰면 좋은 AI
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
                    padding: "10px 12px", borderRadius: "var(--r-xs)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-indigo)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <img
                    src={getFaviconUrl(rt.url)}
                    alt={rt.name}
                    style={{ width: 36, height: 36, borderRadius: "var(--r-xs)", flexShrink: 0 }}
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{rt.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getPairReason(tool.cat, rt.cat)}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.62rem", padding: "2px 7px", borderRadius: "var(--r-xs)", background: "var(--accent-gradient)", color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                    {CAT_LABEL[rt.cat]?.replace(/^.\s/, "") ?? rt.cat}
                  </span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// [메인] 모달 컴포넌트
const ToolDetailModal = ({ tool, rank, prevRank, onClose }) => {
  const [iconError, setIconError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const touchStartX = useRef(null);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const faviconUrl = tool ? getFaviconUrl(tool.url) : null;
  const boardId = tool ? TOOL_BOARD_MAP[tool.name] : null;

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

  const vw = window.innerWidth;
  const CARD_WIDTH = vw >= 600
    ? `${Math.round(vw * 0.66)}px`
    : "calc(100vw - 16px)";

  const card1 = (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--r-md)",
      padding: "1.2rem",
      width: CARD_WIDTH,
      flexShrink: 0,
      boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      position: "relative",
    }}>
      <button onClick={onClose} style={{ position: "absolute", top: "10px", right: "10px", background: "var(--bg-tertiary)", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>✕</button>
      <button onClick={toggleBookmark} title={user ? (bookmarked ? "북마크 해제" : "북마크 저장") : "로그인 후 북마크 가능"} style={{ position: "absolute", top: "10px", right: "40px", background: "transparent", border: "none", width: "24px", height: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", color: bookmarked ? "var(--accent-indigo)" : "var(--text-muted)", zIndex: 1 }}>
        {bookmarked ? <BookmarkSimpleFill size={20} /> : <BookmarkSimple size={20} />}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        {!iconError && faviconUrl ? ( <img src={faviconUrl} alt={tool.name} width={32} height={32} style={{ borderRadius: "var(--r-xs)", objectFit: "contain", flexShrink: 0 }} onError={() => setIconError(true)} /> ) : ( <span style={{ fontSize: "1.8rem" }}>{tool.icon}</span> )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{tool.name}</h2>
            {rank ? (
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "var(--r-xs)", padding: "2px 7px", whiteSpace: "nowrap" }}>
                {prevRank && prevRank !== rank ? `${prevRank} › ${rank}위` : `${rank}위`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "12.5px" }}>{tool.desc}</p>

      <ScoreInsightPanel tool={tool} />

      {tool.features && ( <div style={{ marginBottom: "16px" }}><div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>핵심 기능</div><ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>{tool.features.map((f, i) => ( <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}><span style={{ color: "var(--accent-indigo)", fontWeight: 800, fontSize: "0.9rem", marginTop: "2px", flexShrink: 0 }}>✓</span><span style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{f}</span></li>))}</ul></div>)}

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>{(tool.tags || []).filter(tag => tag !== "무료" && tag !== "유료").map((tag) => ( <span key={tag} style={{ fontSize: "0.65rem", padding: "3px 8px", borderRadius: "var(--r-xs)", background: "var(--tag-bg)", color: "var(--tag-color)", border: "1px solid var(--tag-border)", fontWeight: 600 }}>{tag}</span>))}</div>

      <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {tool.cat && ( <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>카테고리</span><span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "var(--r-xs)", background: "var(--accent-gradient)", color: "#fff", fontWeight: 700 }}>{CAT_LABEL[tool.cat] ?? tool.cat}</span></div>)}
        {tool.life?.length > 0 && ( <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}><span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>추천 대상</span><div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>{tool.life.map((l) => ( <span key={l} style={{ fontSize: "0.65rem", padding: "3px 8px", borderRadius: "var(--r-xs)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", fontWeight: 600 }}>{LIFE_LABEL[l] ?? l}</span>))}</div></div>)}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        {tool.url && ( <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px", borderRadius: "var(--r-md)", background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))", color: "#fff", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontWeight: 800, fontSize: "0.9rem", textDecoration: "none", boxShadow: "0 8px 16px rgba(79, 70, 229, 0.2)" }}>공식 사이트 방문 <ArrowRight size={16} /></a>)}
        {boardId && ( <button onClick={() => { onClose(); navigate(`/community/${boardId}`); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px", borderRadius: "var(--r-md)", border: "1px solid var(--accent-indigo)", background: "transparent", color: "var(--accent-indigo)", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>💬 툴 게시판 <ArrowRight size={16} /></button>)}
      </div>
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
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: "var(--r-md)", padding: "1.5rem", width: DESKTOP_CARD_WIDTH, flexShrink: 0, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", position: "relative", height: "fit-content" }}>
            <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "var(--bg-tertiary)", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <button onClick={toggleBookmark} title={user ? (bookmarked ? "북마크 해제" : "북마크 저장") : "로그인 후 북마크 가능"} style={{ position: "absolute", top: "16px", right: "50px", background: "transparent", border: "none", width: "28px", height: "28px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", color: bookmarked ? "var(--accent-indigo)" : "var(--text-muted)" }}>
              {bookmarked ? <BookmarkSimpleFill size={24} /> : <BookmarkSimple size={24} />}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              {!iconError && faviconUrl ? ( <img src={faviconUrl} alt={tool.name} width={40} height={40} style={{ borderRadius: "var(--r-xs)", objectFit: "contain", flexShrink: 0 }} onError={() => setIconError(true)} /> ) : ( <span style={{ fontSize: "2.2rem" }}>{tool.icon}</span> )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{tool.name}</h2>
                  {rank ? (
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "var(--r-xs)", padding: "2px 8px", whiteSpace: "nowrap" }}>
                      {prevRank && prevRank !== rank ? `${prevRank} › ${rank}위` : `${rank}위`}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "16px" }}>{tool.desc}</p>
            <ScoreInsightPanel tool={tool} />
            {tool.features && ( <div style={{ marginBottom: "24px" }}><div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>핵심 기능</div><ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>{tool.features.map((f, i) => ( <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}><span style={{ color: "var(--accent-indigo)", fontWeight: 800, fontSize: "0.95rem", marginTop: "2px", flexShrink: 0 }}>✓</span><span style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{f}</span></li>))}</ul></div>)}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>{(tool.tags || []).filter(tag => tag !== "무료" && tag !== "유료").map((tag) => ( <span key={tag} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "var(--r-xs)", background: "var(--tag-bg)", color: "var(--tag-color)", border: "1px solid var(--tag-border)", fontWeight: 600 }}>{tag}</span>))}</div>
            <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {tool.cat && ( <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>카테고리</span><span style={{ fontSize: "0.75rem", padding: "4px 12px", borderRadius: "var(--r-xs)", background: "var(--accent-gradient)", color: "#fff", fontWeight: 700 }}>{CAT_LABEL[tool.cat] ?? tool.cat}</span></div>)}
              {tool.life?.length > 0 && ( <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}><span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>추천 대상</span><div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{tool.life.map((l) => ( <span key={l} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "var(--r-xs)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", fontWeight: 600 }}>{LIFE_LABEL[l] ?? l}</span>))}</div></div>)}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {tool.url && ( <a href={tool.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px", borderRadius: "var(--r-xs)", background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))", color: "#fff", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontWeight: 800, fontSize: "1rem", textDecoration: "none", transition: "all 0.2s ease", boxShadow: "0 8px 16px rgba(79, 70, 229, 0.2)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 20px rgba(79, 70, 229, 0.3)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(79, 70, 229, 0.2)"; }}>공식 사이트 방문 <ArrowRight size={18} /></a>)}
              {boardId && ( <button onClick={() => { onClose(); navigate(`/community/${boardId}`); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px", borderRadius: "var(--r-xs)", border: "1px solid var(--accent-indigo)", background: "transparent", color: "var(--accent-indigo)", fontFamily: "'IBM Plex Sans KR', 'Pretendard', sans-serif", fontWeight: 800, fontSize: "1rem", cursor: "pointer", transition: "all 0.2s ease" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.08)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>💬 툴 게시판 <ArrowRight size={18} /></button>)}
            </div>
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
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "24px 8px 40px" }}
      >
        {card1}
        {card2}
      </div>
    </div>
  );
};

export default ToolDetailModal;
