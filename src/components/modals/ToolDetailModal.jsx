import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useTools } from "../../context/ToolContext";
import { getTrendyScenarios } from "../../utils/TrendyScenarios";
import Icon from "../ui/Icon";

const decodeHtmlSafe = (text) => {
  if (!text) return "";
  const str = String(text);
  const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&nbsp;": " ", "&#39;": "'", "&apos;": "'" };
  return str.replace(/&(#?[xX]?\w+);/g, (match, p1) => {
    if (entities[match]) return entities[match];
    if (p1.startsWith("#")) {
      const isHex = p1.charAt(1).toLowerCase() === "x";
      const code = parseInt(p1.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return !isNaN(code) ? String.fromCharCode(code) : match;
    }
    return match;
  });
};

const formatViewCount = (count) => {
  if (!count) return "";
  const num = Number(count);
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return `${num}`;
};

const getFaviconUrl = (url) => { if (!url) return null; try { const domain = new URL(url).hostname; return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`; } catch { return null; } };
const getPlanNameFontSize = (text, isBigUI) => { if (!text) return isBigUI ? "0.85rem" : "0.78rem"; if (text.length > 12) return isBigUI ? "0.75rem" : "0.7rem"; return isBigUI ? "0.85rem" : "0.78rem"; };
const getPriceFontSize = (text, isBigUI) => { if (!text) return isBigUI ? "1.15rem" : "0.95rem"; const len = text.length; if (len > 25) return isBigUI ? "0.78rem" : "0.68rem"; if (len > 15) return isBigUI ? "0.92rem" : "0.8rem"; return isBigUI ? "1.15rem" : "0.95rem"; };
const getPriceLineHeight = (text) => (text && text.length > 15 ? 1.15 : 1.3);

const SparkLine = ({ val, color, height = "4px", glow = false }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const target = Math.max(2, Math.min(100, Number(val) || 0));
    const timer = setTimeout(() => { setWidth(target); }, 50);
    return () => clearTimeout(timer);
  }, [val]);
  return (
    <div style={{ width: "100%", height, background: "rgba(128,128,128,0.1)", borderRadius: "10px", overflow: "hidden", boxShadow: glow ? "inset 0 1px 2px rgba(0,0,0,0.1)" : "none" }}>
      <div style={{
        width: `${width}%`,
        height: "100%",
        background: glow ? "linear-gradient(90deg, #6366f1, #06b6d4)" : color, // 그라데이션 적용
        borderRadius: "10px",
        transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: glow ? "0 0 15px rgba(99,102,241,0.5), 0 0 5px rgba(6,182,212,0.3)" : "none", // 네온 글로우
        position: "relative",
        overflow: "hidden"
      }}>
        {glow && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            animation: "shimmer 2s infinite"
          }} />
        )}
      </div>
    </div>
  );
};

const ToolDetailModal = ({ tool, rank, onClose }) => {
  const [iconError, setIconError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [videos, setVideos] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isBigUI, setIsBigUI] = useState(window.innerWidth >= 768);
  const [activeCard, setActiveCard] = useState(0); 
  const [activeUseCasePage, setActiveUseCasePage] = useState(0);
  const [useCaseStage, setUseCaseStage] = useState('visible'); // 'entering' | 'visible' | 'exiting'
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const touchStartX = React.useRef(null);
  const { user, loginWithGoogle } = useAuth();
  const { tools: allTools } = useTools();
  const navigate = useNavigate();
  const faviconUrl = tool ? getFaviconUrl(tool.url) : null;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsBigUI(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 4초 간격으로 활용 사례(Scenario) 페이지 순차적 전환 (Sleek Slide-up & Blur 효과)
  useEffect(() => {
    const trendyList = getTrendyScenarios(tool);
    const totalItems = trendyList.length || 1;
    
    const timer = setInterval(() => {
      setUseCaseStage('exiting');
      setTimeout(() => {
        setActiveUseCasePage(prev => (prev + 1) % totalItems); // 전체 리스트 개수만큼 순환
        setUseCaseStage('entering');
        setTimeout(() => setUseCaseStage('visible'), 50);
      }, 600);
    }, 4000); // 4초 주기로 변경
    return () => clearInterval(timer);
  }, [tool]);

  useEffect(() => {
    if (!user || !tool?.id) return;
    getDoc(doc(db, "bookmarks", `${user.uid}_${tool.id}`)).then(snap => setBookmarked(snap.exists()));
  }, [user, tool?.id]);

  useEffect(() => {
    if (!tool?.name) return;
    fetch(`/youtube-videos.json?v=${Date.now()}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        const vids = data?.videos?.[String(tool?.id)] || data?.videos?.[tool?.name] || [];
        setVideos(Array.isArray(vids) ? vids : []);
      })
      .catch(err => {
        console.error("YouTube videos fetch failed:", err);
        setVideos([]);
      });
  }, [tool?.id, tool?.name]);

  const toggleBookmark = async () => {
    if (!user) {
      if (window.confirm("북마크 기능을 사용하려면 로그인이 필요합니다. 로그인하시겠습니까?")) {
        try { await loginWithGoogle(); } catch (err) { console.error("🔴 Login Error:", err); }
      }
      return;
    }
    try {
      const toolIdStr = String(tool.id);
      const ref = doc(db, "bookmarks", `${user.uid}_${toolIdStr}`);
      if (bookmarked) {
        await deleteDoc(ref);
        setBookmarked(false);
      } else {
        await setDoc(ref, { uid: user.uid, toolId: toolIdStr, toolName: tool.name, savedAt: Date.now() });
        setBookmarked(true);
      }
    } catch (err) {
      console.error("🔴 Bookmark Error:", err);
      alert("북마크 저장 중 오류가 발생했습니다.");
    }
  };

  // ── 드래그 스크롤용 상태 및 Ref (FIX) ──
  const pricingScrollRef = React.useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const startDragging = (e) => {
    if (!pricingScrollRef.current) return;
    e.stopPropagation(); // 모달 닫힘 방지를 위해 전파 차단
    setIsMouseDown(true);
    setDragStartX(e.pageX - pricingScrollRef.current.offsetLeft);
    setDragScrollLeft(pricingScrollRef.current.scrollLeft);
  };

  const stopDragging = () => {
    setIsMouseDown(false);
  };

  const moveDragging = (e) => {
    if (!isMouseDown || !pricingScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - pricingScrollRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5; // 스크롤 속도 배율
    pricingScrollRef.current.scrollLeft = dragScrollLeft - walk;
  };

  const synerToolList = useMemo(() =>
    (allTools || []).filter(t => t && t.id !== tool?.id && (t.cat === tool?.cat))
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)).slice(0, 3)
  , [tool, allTools]);

  if (!tool) return null;

  const metrics = [
    { k: "score", l: "종합점수", c: "var(--accent-indigo)", d: "Google Search 실시간 데이터와 Gemini 3 분석을 통해 산출된 통합 AIRANK 점수입니다.", isMain: true },
    { k: "usage", l: "사용량", c: "var(--accent-cyan)", d: "실제 웹 트래픽, 앱 활성 사용자 수 등 대중적인 보급률을 측정합니다." },
    { k: "tech", l: "기술력", c: "var(--accent-indigo)", d: "AI 모델 성능(Benchmark), 독자적인 기술 혁신성 및 엔진의 완성도를 평가합니다." },
    { k: "buzz", l: "화제성", c: "var(--accent-cyan)", d: "뉴스 보도량, 소셜 미디어(SNS) 반응, 커뮤니티 내 화제 정도를 분석합니다." },
    { k: "utility", l: "유용성", c: "var(--accent-indigo)", d: "실제 업무의 생산성 향상 기여도 및 사용자들의 실전 팁과 리뷰를 종합합니다." },
    { k: "growth", l: "성장성", c: "var(--accent-cyan)", d: "업데이트 빈도, 이용자 증가 속도 및 향후 발전 가능성을 예측합니다." },
  ];

  return (
    <div onClick={onClose} style={{ 
      position: "fixed", inset: 0, zIndex: 2000, 
      background: "rgba(0,0,0,0.2)", backdropFilter: "blur(10px)", 
      overflowY: "auto", overscrollBehavior: "contain", 
      display: "flex", justifyContent: "center", alignItems: "center", 
      padding: isMobile ? "40px 0" : "60px 20px" 
    }}>
      <div onClick={(e) => {}} style={{
        display: "flex",
        flexDirection: "column",
        width: isMobile ? (isBigUI ? "calc(100% - 80px)" : "calc(100% - 32px)") : "100%",
        maxWidth: isBigUI ? (isMobile ? "660px" : "1100px") : "420px",
        height: "fit-content",
        padding: "0"
      }}>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "0" : "22px",
          width: "100%",
          alignItems: "flex-start",
          ...(isMobile ? { overflow: "hidden", position: "relative" } : {})
        }}>
          <div
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 50) setActiveCard(diff > 0 ? 1 : 0);
              touchStartX.current = null;
            }}
            style={isMobile ? {
              display: "flex", flexDirection: "row", width: "200%",
              transform: `translateX(${activeCard === 0 ? "0%" : "-50%"})`,
              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            } : { display: "contents" }}
          >
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: isBigUI ? "36px" : "20px", ...(isMobile ? { width: "50%", flexShrink: 0, padding: isBigUI ? "28px 24px" : "10px 14px" } : { flex: 1, minWidth: 0, padding: "28px 32px 32px" }), position: "relative", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>
              <div style={{ position: "absolute", top: "18px", right: "18px", zIndex: 20 }}>
                <button onClick={(e) => { e.stopPropagation(); toggleBookmark(); }} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", cursor: "pointer", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color: bookmarked ? "var(--accent-indigo)" : "var(--text-muted)", transition: "transform 0.2s, background-color 0.2s", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                  <Icon name={bookmarked ? "bookmark-simple-fill" : "bookmark-simple"} size={22} weight={bookmarked ? "fill" : "bold"} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: isBigUI ? "16px" : "10px" }}>
                {!iconError && faviconUrl ? ( <img src={faviconUrl} alt={tool.name || "Tool"} width={isBigUI ? 58 : 48} height={isBigUI ? 58 : 48} style={{ borderRadius: "14px", objectFit: "contain" }} onError={() => setIconError(true)} /> ) : ( <span style={{ fontSize: isBigUI ? "2.6rem" : "2.2rem" }}>{typeof tool.icon === 'string' ? tool.icon : "🤖"}</span> )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: isBigUI ? "1.7rem" : "1.4rem", fontWeight: 950, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{tool.name || "Unknown Tool"}</h2>
                    <div style={{ background: "var(--accent-indigo)", color: "#fff", padding: isBigUI ? "4px 12px" : "3px 10px", borderRadius: "8px", fontSize: isBigUI ? "0.85rem" : "0.7rem", fontWeight: 900, fontFamily: "var(--font-rounded)" }}>RANK {rank}위</div>
                  </div>
                </div>
              </div>

              {(tool.oneLineReview || tool.One_Line_Review) && (() => {
                const reviewText = tool.oneLineReview || tool.One_Line_Review || "";
                const reviewLen = reviewText.length;
                const desktopBaseSize = (reviewLen > 35 ? 1.05 : reviewLen > 25 ? 1.25 : 1.45) * 1.3;
                const mobileBaseSize = (reviewLen > 35 ? 0.85 : reviewLen > 25 ? 0.95 : 1.1) * 1.3;
                return (
                  <div style={{ marginBottom: isBigUI ? "12px" : "6px", paddingLeft: "12px", borderLeft: "4px solid var(--accent-indigo)", overflow: "hidden", position: "relative", background: "rgba(99,102,241,0.03)", borderRadius: "0 12px 12px 0", padding: isBigUI ? "10px 12px" : "6px 12px" }}>
                    <div className={reviewLen > 15 ? "review-marquee-track" : ""} style={{ display: "flex", gap: "80px", width: "max-content", fontSize: isBigUI ? `${desktopBaseSize}rem` : `${mobileBaseSize}rem`, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                      <span>"{reviewText}"</span>
                      {reviewLen > 15 && <span>"{reviewText}"</span>}
                    </div>
                  </div>
                );
              })()}

              <p style={{ fontSize: isBigUI ? "1rem" : "0.85rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: isBigUI ? "16px" : "10px", fontWeight: 500 }}>{tool.desc || tool.description || "설명이 없습니다."}</p>

              <div onMouseMove={(e) => { if (isBigUI) setMousePos({ x: e.clientX, y: e.clientY }); }} style={{ display: "flex", flexDirection: "column", gap: isBigUI ? "6px" : "2px", marginBottom: isBigUI ? "16px" : "8px", background: "rgba(0,0,0,0.03)", padding: isBigUI ? "12px 16px" : "8px 16px", borderRadius: "22px" }}>
                {(() => {
                  const main = metrics.find(m => m.isMain);
                  const val = Number(tool?.[main.k] ?? tool?.metrics?.[main.k] ?? 0);
                  return (
                    <div key={main.k} onMouseEnter={() => setHoveredMetric(main.k)} onMouseLeave={() => setHoveredMetric(null)} style={{
                      display: "grid", gridTemplateColumns: !isBigUI ? "80px 1fr 42px" : "100px 1fr 55px",
                      alignItems: "center", gap: !isBigUI ? "10px" : "16px", cursor: "help", height: isBigUI ? "32px" : "24px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: !isBigUI ? "0.88rem" : "1.0rem", fontWeight: 950, color: "var(--text-primary)" }}>
                        <Icon name={main.k === 'score' ? 'trend-up' : main.k} size={!isBigUI ? 18 : 22} /> {main.l}
                      </div>
                      <SparkLine val={val} color={main.c} height={!isBigUI ? "7px" : "8.5px"} glow />
                      <div style={{ 
                        fontSize: !isBigUI ? "0.95rem" : "1.25rem", 
                        fontWeight: 1000, 
                        color: "var(--accent-indigo)", 
                        textAlign: "right", 
                        fontFamily: "var(--font-rounded)",
                        textShadow: "0 0 10px rgba(99,102,241,0.2)"
                      }}>{val.toFixed(1)}</div>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", flexDirection: "column", gap: isBigUI ? "8px" : "2px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isBigUI ? "4px 12px" : "2px 12px" }}>
                    {metrics.filter(m => !m.isMain).map(m => {
                      const val = Number(tool?.[m.k] ?? tool?.metrics?.[m.k] ?? 0);
                      const isHovered = hoveredMetric === m.k;
                      return (
                        <div key={m.k} onMouseEnter={() => setHoveredMetric(m.k)} onMouseLeave={() => setHoveredMetric(null)} style={{
                          display: "grid", gridTemplateColumns: !isBigUI ? "55px 1fr 32px" : "70px 1fr 42px",
                          alignItems: "center", gap: !isBigUI ? "6px" : "10px", cursor: "help", height: isBigUI ? "26px" : "20px",
                          padding: isBigUI ? "4px 6px" : "2px 6px", borderRadius: "6px", background: isHovered ? `${m.c}15` : "transparent", transition: "background 0.15s ease" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: !isBigUI ? "0.78rem" : "0.92rem", fontWeight: 800, color: isHovered ? m.c : "var(--text-secondary)", transition: "color 0.15s ease" }}>
                            <Icon name={m.k === 'usage' ? 'wrench' : m.k === 'tech' ? 'cpu' : m.k === 'buzz' ? 'megaphone' : m.k === 'utility' ? 'lightning' : 'chart-line-up'} size={!isBigUI ? 14 : 17} /> {m.l}
                          </div>
                          <SparkLine val={val} color={m.c} height={!isBigUI ? "4px" : "5px"} />
                          <div style={{ fontSize: isBigUI ? "0.9rem" : "0.75rem", fontWeight: 900, color: isHovered ? m.c : "var(--text-primary)", textAlign: "right", opacity: 0.9, fontFamily: "var(--font-rounded)" }}>{val.toFixed(1)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* 사용 팁 (Scenarios) 섹션 - 상단 이동 */}
              <div style={{ background: "var(--bg-secondary)", borderRadius: "14px", padding: isBigUI ? "8px 14px" : "6px 14px", border: "none", marginBottom: isBigUI ? "16px" : "8px", position: "relative" }}>
                <div style={{ 
                  height: isBigUI ? "48px" : "44px", 
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative"
                }}>
                  {(() => {
                    const scenarios = getTrendyScenarios(tool);
                    const currentItem = scenarios[activeUseCasePage % scenarios.length];
                    
                    if (!currentItem) return (
                      <div style={{ fontSize: isBigUI ? "1.0rem" : "0.85rem", color: "var(--text-primary)", fontWeight: 700, lineHeight: 1.5, opacity: 0.5 }}>
                        활용 시나리오 분석 중...
                      </div>
                    );

                    const [job, desc] = currentItem.split(": ");
                    return (
                      <div key={`${activeUseCasePage}`} style={{ 
                        fontSize: isBigUI ? "1.0rem" : "0.85rem", 
                        color: "var(--text-primary)", 
                        lineHeight: 1.4, 
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "flex-start", 
                        gap: "10px",
                        opacity: useCaseStage === 'visible' ? 1 : 0,
                        filter: useCaseStage === 'visible' ? "blur(0)" : "blur(8px)",
                        transform: useCaseStage === 'visible' ? "translateY(0)" : (useCaseStage === 'entering' ? "translateY(12px)" : "translateY(-12px)"),
                        transition: "all 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}>
                        <span style={{ 
                          background: "rgba(99, 102, 241, 0.08)", 
                          color: "var(--accent-indigo)", 
                          padding: "2px 8px", 
                          borderRadius: "4px", 
                          fontSize: "0.72rem", 
                          whiteSpace: "nowrap",
                          border: "1px solid rgba(99, 102, 241, 0.12)",
                          marginTop: "2px"
                        }}>
                          {job || "상황"}
                        </span>
                        <div style={{ 
                          display: "-webkit-box",
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "keep-all", 
                          opacity: 0.95,
                          letterSpacing: "-0.02em"
                        }}>
                          {desc || currentItem}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 결제 플랜 (Pricing) 섹션 */}
              {(() => {
                // 새 포맷(pricingData) 우선, 구 포맷(pricing 배열) fallback
                const pd = tool.pricingData;
                const hasNewFormat = pd && typeof pd === 'object' && !Array.isArray(pd) &&
                  (pd.free || pd.pro || pd.business);
                const hasOldFormat = tool.pricing && Array.isArray(tool.pricing) && tool.pricing.length > 0;

                if (!hasNewFormat && !hasOldFormat) return null;

                // 새 포맷 → 카드 배열로 변환
                const cards = hasNewFormat ? [
                  pd.free?.available !== false && pd.free ? {
                    planName: "Free",
                    price: "무료",
                    isFree: true,
                    details: pd.free.details,
                  } : null,
                  pd.pro ? {
                    planName: "Pro",
                    price: pd.pro.monthly || "확인 필요",
                    subPrice: pd.pro.yearly ? `연간 ${pd.pro.yearly}` : null,
                    details: pd.pro.details,
                  } : null,
                  pd.business ? {
                    planName: "Business",
                    price: pd.business.price || "Contact Sales",
                    details: pd.business.details,
                  } : null,
                ].filter(Boolean)
                // 구 포맷 그대로 사용
                : tool.pricing.map(p => ({
                  planName: p.planName,
                  price: p.price === '0' ? '무료' : (p.price?.includes('$') || p.price?.includes('₩') ? p.price : `$${p.price}`),
                  isFree: p.price === '0',
                  subPrice: p.billing || null,
                  details: p.features?.join(' · ') || null,
                }));

                const reliability = tool.pricingReliability;
                const reliabilityColor = reliability?.score === 'High' ? 'var(--accent-green, #10b981)'
                  : reliability?.score === 'Mid' ? 'var(--accent-yellow, #f59e0b)'
                  : reliability?.score === 'Low' ? 'var(--text-muted)' : null;

                return (
                  <div style={{ marginBottom: isBigUI ? "16px" : "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: isBigUI ? "10px" : "2px", paddingLeft: "4px" }}>
                      <Icon name="tag" size={18} color="var(--accent-indigo)" weight="fill" />
                      <span style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text-primary)" }}>결제 플랜</span>
                      {reliability && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: reliabilityColor, marginLeft: "auto", paddingRight: "4px" }}>
                          {reliability.source}
                        </span>
                      )}
                    </div>
                    <div
                      ref={pricingScrollRef}
                      className="pricing-scrollbar-hide"
                      onMouseDown={startDragging}
                      onMouseLeave={stopDragging}
                      onMouseUp={stopDragging}
                      onMouseMove={moveDragging}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onWheel={(e) => {
                        if (e.deltaY !== 0) {
                          e.preventDefault();
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                      style={{
                        display: "flex",
                        gap: "14px",
                        overflowX: "auto",
                        paddingBottom: isBigUI ? "4px" : "0px",
                        paddingTop: isBigUI ? "4px" : "0px",
                        paddingLeft: "2px",
                        scrollBehavior: isMouseDown ? "auto" : "smooth",
                        cursor: isMouseDown ? "grabbing" : "grab",
                        userSelect: isMouseDown ? "none" : "auto"
                      }}
                    >
                      {cards.map((card, idx) => (
                        <div
                          key={idx}
                          className="pricing-card-snap"
                          style={{
                            flex: "0 0 170px",
                            height: isBigUI ? "160px" : "140px",
                            background: "var(--bg-card)",
                            border: "1.5px solid var(--accent-indigo)",
                            borderRadius: "18px",
                            padding: isBigUI ? "12px 14px" : "6px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: isBigUI ? "6px" : "2px",
                            position: "relative"
                          }}
                        >
                          <div style={{ fontSize: getPlanNameFontSize(card.planName, isBigUI), fontWeight: 950, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                            {card.planName}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "2px", flexWrap: "wrap", lineHeight: getPriceLineHeight(card.price) }}>
                              <span style={{ fontSize: getPriceFontSize(card.price, isBigUI), fontWeight: 1000, color: "var(--text-primary)", fontFamily: "var(--font-rounded)", wordBreak: "keep-all" }}>
                                {card.price}
                              </span>
                              {!card.isFree && card.price !== 'Contact Sales' && !card.price?.includes('/mo') && (
                                <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700 }}>/mo</span>
                              )}
                            </div>
                            {card.subPrice && (
                              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 600, lineHeight: 1.2 }}>
                                {card.subPrice}
                              </div>
                            )}
                          </div>
                          {card.details && (
                            <div style={{ fontSize: isBigUI ? "0.68rem" : "0.65rem", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {card.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* 완벽히 정렬된 통합 안내 섹션 */}
                    <div style={{
                      marginTop: isBigUI ? "2px" : "0px",
                      padding: isBigUI ? "8px 12px" : "6px 10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      border: "1px solid var(--border-primary)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
                    }}>
                      {tool.pricingNote && (
                        <>
                          <div style={{
                            fontSize: isBigUI ? "0.72rem" : "0.68rem",
                            color: "var(--text-muted)",
                            lineHeight: 1.4,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "6px",
                            fontWeight: 600
                          }}>
                            <span style={{ marginTop: "1px", flexShrink: 0 }}>💡</span>
                            <span style={{ overflow: "hidden", wordBreak: "keep-all" }}>{tool.pricingNote}</span>
                          </div>
                          <div style={{ height: "1px", background: "var(--border-primary)", opacity: 0.3 }} />
                        </>
                      )}
                      <div style={{
                        fontSize: isBigUI ? "0.72rem" : "0.68rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "6px",
                        opacity: 0.85,
                        fontWeight: 500
                      }}>
                        <span style={{ marginTop: "1px", flexShrink: 0 }}>💡</span>
                        <span style={{ overflow: "hidden", wordBreak: "keep-all" }}>실제 요금제와 기능 제공 범위는 서비스사 정책에 따라 예고 없이 변경될 수 있습니다. 최종 결제 전 반드시 공식 홈페이지 정보를 확인해 주세요.</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <a href={tool.url || tool.URL || "#"} target="_blank" rel="noopener noreferrer" style={{ flex: isMobile ? 2 : 1.6, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: isBigUI ? "14px" : "10px 8px", borderRadius: "14px", background: "var(--accent-indigo)", color: "#fff", fontWeight: 950, textDecoration: "none", fontSize: isBigUI ? "1.1rem" : "0.8rem", whiteSpace: "nowrap", boxShadow: "0 6px 14px rgba(99,102,241,0.2)" }}>공식 사이트 바로가기 <Icon name="arrow-right" size={isBigUI ? 18 : 14} weight="bold" /></a>
                <button onClick={(e) => { e.stopPropagation(); onClose(); navigate("/community"); }} style={{ flex: 1, padding: isBigUI ? "14px" : "10px 8px", borderRadius: "14px", border: "1px solid var(--border-primary)", background: "none", color: "var(--text-primary)", fontWeight: 900, cursor: "pointer", fontSize: isBigUI ? "1rem" : "0.8rem", whiteSpace: "nowrap" }}>게시판</button>
              </div>
            </div>

            <div style={{ background: "var(--bg-card)", border: "none", borderRadius: isBigUI ? "36px" : "20px", ...(isMobile ? { width: "50%", flexShrink: 0, padding: isBigUI ? "24px" : "16px 14px" } : { flex: 1, minWidth: 0, padding: "20px" }), boxShadow: "0 20px 40px rgba(0,0,0,0.3)", position: "relative" }}>
              {!isMobile && <button onClick={onClose} aria-label="모달 닫기" style={{ position: "absolute", top: "-45px", right: "0", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.2rem", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>✕</button>}
              <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ background: "rgba(255,0,0,0.1)", padding: "8px", borderRadius: "10px", display: "flex" }}>
                    <Icon name="youtube-logo" size={20} weight="fill" color="#FF0000" />
                  </div>
                  <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-primary)" }}>AI 실전 활용 팁</span>
                </div>
                {videos.length === 0 ? ( <div style={{ padding: "30px 20px", textAlign: "center", background: "var(--bg-secondary)", borderRadius: "20px", fontSize: "0.75rem", color: "var(--text-muted)", border: "1px dashed var(--border-primary)" }}>관련 영상이 준비 중입니다.</div> ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {videos.slice(0, 3).map((v, i) => (
                      <a key={i} href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px", textDecoration: "none", padding: "8px", borderRadius: "14px", background: "var(--bg-secondary)", border: "none", transition: "background 0.2s, transform 0.2s", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.background="var(--border-primary)"; }} onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.background="var(--bg-secondary)"; }}>
                        <div style={{ width: isBigUI ? "192px" : "140px", height: isBigUI ? "108px" : "79px", flexShrink: 0, borderRadius: "10px", overflow: "hidden", background: "#000" }}>{v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: isBigUI ? "0.95rem" : "0.75rem", fontWeight: 800, color: "var(--text-primary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, marginBottom: isBigUI ? "8px" : "4px" }}>{decodeHtmlSafe(v.title)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: isBigUI ? "0.78rem" : "0.62rem", color: "var(--text-muted)", fontWeight: 700 }}>
                            {(v.viewCount && v.viewCount > 0) && <span style={{ background: "rgba(0,0,0,0.05)", padding: "2px 7px", borderRadius: "6px" }}>{formatViewCount(v.viewCount)}회</span>}
                            <span style={{ color: "var(--accent-indigo)", opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.channelTitle || "Unknown Channel"}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "14px" }}>
            {[0, 1].map((i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setActiveCard(i); }} style={{ width: activeCard === i ? "24px" : "8px", height: "8px", borderRadius: "4px", background: activeCard === i ? "var(--accent-indigo)" : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s ease, background 0.3s ease" }} />
            ))}
          </div>
        )}
      </div>

      {hoveredMetric && isBigUI && (
        <div style={{
          position: "fixed",
          left: (mousePos.x > window.innerWidth - 300) ? mousePos.x - 290 : mousePos.x + 20,
          top: (mousePos.y > window.innerHeight - 100) ? mousePos.y - 80 : mousePos.y + 20,
          zIndex: 3000,
          pointerEvents: "none",
          maxWidth: "280px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0, 0, 0, 0.1)",
          borderRadius: "12px",
          padding: "12px 16px",
          boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
          animation: "tooltipReveal 0.2s cubic-bezier(0.19, 1, 0.22, 1)",
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "rgba(0,0,0,0.85)",
          lineHeight: 1.5
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: metrics.find(m => m.k === hoveredMetric)?.c || "var(--accent-indigo)" }}>
            <Icon name={hoveredMetric === "score" ? "trend-up" : (hoveredMetric === "usage" ? "wrench" : hoveredMetric === "tech" ? "cpu" : hoveredMetric === "buzz" ? "megaphone" : hoveredMetric === "utility" ? "lightning" : "chart-line-up")} size={16} weight="fill" />
            <span style={{ fontWeight: 900 }}>{metrics.find(m => m.k === hoveredMetric)?.l}</span>
          </div>
          {metrics.find(m => m.k === hoveredMetric)?.d}
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes tooltipReveal { from { opacity: 0; transform: scale(0.95) translateY(5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes marqueeReview { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-50% - 40px)); } }
        .review-marquee-track { animation: marqueeReview 18s linear infinite; animation-delay: 2s; }
        .pricing-scrollbar-hide::-webkit-scrollbar { display: none; }
        .pricing-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ToolDetailModal;
