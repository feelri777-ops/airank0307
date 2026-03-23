import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useTools } from "../../context/ToolContext";
import { 
  YoutubeLogoFill, BookmarkSimple, BookmarkSimpleFill, ArrowRight, X, Sparkle,
  TrendUp, Cpu, Megaphone, Lightning, Lightbulb, Quotes, Wrench, ChartLineUp
} from "../icons/PhosphorIcons";

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

const SparkLine = ({ val, color, height = "4px", glow = false }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => { 
    const target = Math.max(2, Math.min(100, Number(val) || 0));
    const timer = setTimeout(() => { setWidth(target); }, 50); 
    return () => clearTimeout(timer); 
  }, [val]);
  return (
    <div style={{ width: "100%", height, background: "rgba(128,128,128,0.1)", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ 
        width: `${width}%`, 
        height: "100%", 
        background: color, 
        borderRadius: "10px", 
        transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: glow ? `0 0 10px ${color}66` : "none"
      }} />
    </div>
  );
};

const ToolDetailModal = ({ tool, rank, onClose }) => {
  const [iconError, setIconError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [videos, setVideos] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeCard, setActiveCard] = useState(0);
  const touchStartX = React.useRef(null);
  const { user, loginWithGoogle } = useAuth();
  const { tools: allTools } = useTools();
  const navigate = useNavigate();
  const faviconUrl = tool ? getFaviconUrl(tool.url) : null;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user || !tool?.id) return;
    getDoc(doc(db, "bookmarks", `${user.uid}_${tool.id}`)).then(snap => setBookmarked(snap.exists()));
  }, [user, tool?.id]);

  useEffect(() => {
    if (!tool?.name) return;
    fetch(`/youtube-videos.json?v=${Date.now()}`).then(r => r.json()).then(data => {
      setVideos(data?.videos?.[String(tool?.id)] || data?.videos?.[tool?.name] || []);
    }).catch(() => setVideos([]));
  }, [tool?.id, tool?.name]);

  const toggleBookmark = async () => {
    if (!user) { 
      if (window.confirm("북마크 기능을 사용하려면 로그인이 필요합니다. 로그인하시겠습니까?")) {
        try {
          await loginWithGoogle();
        } catch (err) {
          console.error("🔴 Login Error:", err);
        }
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
        await setDoc(ref, { 
          uid: user.uid, 
          toolId: toolIdStr, 
          toolName: tool.name, 
          savedAt: Date.now() 
        }); 
        setBookmarked(true); 
      }
    } catch (err) {
      console.error("🔴 Bookmark Error:", err);
      alert("북마크 저장 중 오류가 발생했습니다. 권한을 확인해주세요.");
    }
  };

  const synerToolList = useMemo(() => 
    (allTools || []).filter(t => t && t.id !== tool?.id && (t.cat === tool?.cat))
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)).slice(0, 3)
  , [tool, allTools]);

  if (!tool) return null;

  const metrics = [
    { k: "score", l: "종합점수", c: "#fbbf24", i: <TrendUp size={16} />, d: "모든 실시간 데이터를 분석하여 산출된 통합 AIRANK 점수입니다.", isMain: true },
    { k: "usage", l: "활용성", c: "#06b6d4", i: <Wrench size={14} />, d: "실제 업무 현장에서의 범용성과 실무 투입 가치를 측정합니다." },
    { k: "tech", l: "기술력", c: "#818cf8", i: <Cpu size={14} />, d: "엔진의 성능, 독자적인 AI 기술 수준 및 혁신성을 평가합니다." },
    { k: "buzz", l: "인지도", c: "#22d3ee", i: <Megaphone size={14} />, d: "SNS, 미디어 언급량 및 실사용자 트렌드를 반영한 화제성 지표입니다." },
    { k: "utility", l: "유용성", c: "#a5b4fc", i: <Lightning size={14} />, d: "사용자의 시간 절약 및 문제 해결에 기여하는 직접적인 도움 정도입니다." },
    { k: "growth", l: "성장성", c: "#67e8f9", i: <ChartLineUp size={14} />, d: "현재 이용자 증가 추이 및 향후 기술 발전 가능성을 예측합니다." },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", overflowY: "auto", display: "flex", justifyContent: "center", alignItems: isMobile ? "flex-start" : "flex-start", padding: isMobile ? "16px 0 32px" : "60px 20px" }}>
      <div onClick={(e) => {}} style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: isMobile ? "100vw" : "920px",
        height: "fit-content",
        padding: isMobile ? "0" : "0"
      }}>
      {/* 모바일: 스와이프 캐러셀 / 데스크탑: 가로 배치 */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "0" : "18px",
          width: "100%",
          alignItems: "flex-start",
          ...(isMobile ? {
            overflow: "hidden",
            position: "relative",
          } : {})
        }}
      >
      {/* 모바일 슬라이드 트랙 */}
      <div
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) setActiveCard(diff > 0 ? 1 : 0);
          touchStartX.current = null;
        }}
        style={isMobile ? {
          display: "flex",
          flexDirection: "row",
          width: "200%",
          transform: `translateX(${activeCard === 0 ? "0%" : "-50%"})`,
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        } : {
          display: "contents",
        }}
      >
        
        <div 
          onClick={(e) => {
            // Card background/content also closes.
          }}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: isMobile ? "20px" : "30px", ...(isMobile ? { width: "50%", flexShrink: 0, padding: "16px 14px" } : { flex: 1, minWidth: 0, padding: "22px 24px 24px" }), position: "relative", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}
        >
          <div style={{ position: "absolute", top: "18px", right: "18px", zIndex: 20 }}>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleBookmark(); }} 
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", cursor: "pointer", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color: bookmarked ? "var(--accent-indigo)" : "var(--text-muted)", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }} 
              onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.backgroundColor='var(--bg-card)'; }} 
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.backgroundColor='var(--bg-secondary)'; }}
            >
              {bookmarked ? <BookmarkSimpleFill size={22} /> : <BookmarkSimple size={22} />}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            {!iconError && faviconUrl ? ( <img src={faviconUrl} alt={tool.name} width={48} height={48} style={{ borderRadius: "12px", objectFit: "contain" }} onError={() => setIconError(true)} /> ) : ( <span style={{ fontSize: "2.2rem" }}>{tool.icon || "🤖"}</span> )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{tool.name}</h2>
                <div style={{ background: "var(--accent-indigo)", color: "#fff", padding: "3px 10px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 900 }}>RANK {rank}위</div>
              </div>
            </div>
          </div>

          {tool.oneLineReview && (() => {
            const reviewLen = tool.oneLineReview.length;
            const dynamicSize = reviewLen > 35 ? "0.78rem" : reviewLen > 25 ? "0.88rem" : "1rem";
            return (
              <div style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: "3px solid var(--accent-indigo)", overflow: "hidden" }}>
                <div style={{ 
                  fontSize: dynamicSize, 
                  fontWeight: 850, 
                  color: "var(--text-primary)", 
                  lineHeight: 1.3, 
                  whiteSpace: "nowrap", 
                  textOverflow: "ellipsis", 
                  overflow: "hidden" 
                }}>
                  "{tool.oneLineReview}"
                </div>
              </div>
            );
          })()}

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "16px", fontWeight: 500 }}>{tool.desc}</p>

          <div style={{ display: "grid", gap: "4px", marginBottom: "16px", background: "rgba(0,0,0,0.03)", padding: "12px 16px", borderRadius: "22px" }}>
            {metrics.map(m => {
              const val = tool?.[m.k] ?? tool?.metrics?.[m.k] ?? 0;
              const isMain = m.isMain;
              return (
                <div key={m.k} title={m.d} style={{ 
                  display: "grid", 
                  gridTemplateColumns: "100px 1fr 45px", 
                  alignItems: "center", 
                  gap: "16px", 
                  cursor: "help",
                  height: isMain ? "32px" : "28px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: isMain ? "0.92rem" : "0.82rem", fontWeight: isMain ? 950 : 800, color: isMain ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {React.cloneElement(m.i, { size: isMain ? 18 : 16 })} {m.l}
                  </div>
                  <SparkLine val={val} color={m.c} height={isMain ? "7px" : "4px"} glow={isMain} />
                  <span style={{ fontSize: isMain ? "1.05rem" : "0.85rem", fontWeight: 950, color: m.c, textAlign: "right" }}>{Number(val).toFixed(0)}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: "6px", marginBottom: "10px" }}>
            {tool.usp && ( <div style={{ background: "rgba(99,102,241,0.03)", borderRadius: "12px", padding: "8px 10px", border: "1px dashed rgba(99,102,241,0.2)" }}><div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.65rem", fontWeight: 950, color: "var(--accent-indigo)", marginBottom: "3px" }}><Lightbulb size={14} weight="fill" /> 💡 CORE USP</div><div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>{tool.usp}</div></div> )}
            {tool.prosCons && ( <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "8px 10px", border: "1px solid var(--border-primary)" }}><div style={{ fontSize: "0.65rem", fontWeight: 950, color: "var(--text-muted)", marginBottom: "3px" }}>🔍 ANALYSIS</div><div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>{tool.prosCons}</div></div> )}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: isMobile ? 2 : 1.6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: isMobile ? "10px 8px" : "12px",
                borderRadius: "14px",
                background: "var(--accent-indigo)", 
                color: "#fff", 
                fontWeight: 950, 
                textDecoration: "none", 
                fontSize: isMobile ? "0.8rem" : "0.95rem",
                whiteSpace: "nowrap",
                boxShadow: "0 6px 14px rgba(99,102,241,0.2)"
              }}
            >공식 사이트 바로가기 <ArrowRight size={isMobile ? 14 : 16} weight="bold" /></a>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); navigate("/community"); }}
              style={{
                flex: 1,
                padding: isMobile ? "10px 8px" : "12px",
                borderRadius: "14px",
                border: "1px solid var(--border-primary)",
                background: "none",
                color: "var(--text-primary)",
                fontWeight: 900,
                cursor: "pointer",
                fontSize: isMobile ? "0.8rem" : "0.9rem",
                whiteSpace: "nowrap"
              }}
            >게시판</button>
          </div>
        </div>

        {/* [우측 카드]: 유튜브 및 시너지 AI 추천 */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          borderRadius: isMobile ? "20px" : "30px",
          ...(isMobile ? { width: "50%", flexShrink: 0, padding: "16px 14px" } : { flex: 1, minWidth: 0, padding: "16px" }),
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          position: "relative"
        }}>
          {!isMobile && <button onClick={onClose} style={{ position: "absolute", top: "-45px", right: "0", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.2rem", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>✕</button>}
          
          {/* 유튜브 링크 */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "rgba(255,0,0,0.1)", padding: "6px", borderRadius: "8px", display: "flex" }}><YoutubeLogoFill size={20} color="#ff0000" /></div>
              <span style={{ fontSize: "0.9rem", fontWeight: 900 }}>AI 실전 활용 팁</span>
            </div>
            {videos.length === 0 ? (
               <div style={{ padding: "30px 20px", textAlign: "center", background: "var(--bg-secondary)", borderRadius: "20px", fontSize: "0.75rem", color: "var(--text-muted)", border: "1px dashed var(--border-primary)" }}>관련 영상이 준비 중입니다.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {videos.slice(0, 3).map((v, i) => (
                  <a key={i} href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px", textDecoration: "none", padding: "8px", borderRadius: "14px", background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent-indigo)'; e.currentTarget.style.transform='translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-primary)'; e.currentTarget.style.transform='translateY(0)'; }}>
                    <div style={{ width: isMobile ? "90px" : "160px", height: isMobile ? "51px" : "90px", flexShrink: 0, borderRadius: "8px", overflow: "hidden", background: "#000" }}>
                      <img src={v.thumbnail} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: isMobile ? "0.7rem" : "0.88rem", fontWeight: 800, color: "var(--text-primary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, marginBottom: isMobile ? "4px" : "8px" }}>{decodeHtmlSafe(v.title)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: isMobile ? "0.6rem" : "0.73rem", color: "var(--text-muted)", fontWeight: 700 }}>
                        {v.viewCount > 0 && <span style={{ background: "rgba(0,0,0,0.05)", padding: "2px 7px", borderRadius: "6px" }}>{formatViewCount(v.viewCount)}회</span>}
                        <span style={{ color: "var(--accent-indigo)", opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.channelTitle}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: "1px", background: "var(--border-primary)", margin: "0 -24px 24px", opacity: 0.5 }} />

          {/* 시너지 AI 추천 */}
          {synerToolList.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ background: "rgba(99,102,241,0.1)", padding: "6px", borderRadius: "8px", display: "flex" }}><Sparkle size={20} weight="fill" color="var(--accent-indigo)" /></div>
                <span style={{ fontSize: "0.9rem", fontWeight: 900 }}>함께 쓰면 좋은 시너지 AI</span>
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                {synerToolList.map(rt => (
                  <a 
                    key={rt.id} 
                    href={rt.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px", borderRadius: "18px", background: "var(--bg-secondary)", textDecoration: "none", border: "1px solid var(--border-primary)", transition: "all 0.2s" }} 
                    onMouseEnter={e => { e.currentTarget.style.transform='translateX(5px)'; e.currentTarget.style.borderColor='var(--accent-indigo)'; }} 
                    onMouseLeave={e => { e.currentTarget.style.transform='translateX(0)'; e.currentTarget.style.borderColor='var(--border-primary)'; }}
                  >
                    <img src={getFaviconUrl(rt.url)} alt={rt.name} style={{ width: 32, height: 32, borderRadius: "8px" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rt.name}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>{rt.cat}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>{/* 슬라이드 트랙 끝 */}
      </div>{/* 오버플로우 래퍼 끝 */}

      {/* 모바일 도트 인디케이터 */}
      {isMobile && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "14px" }}>
          {[0, 1].map((i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setActiveCard(i); }}
              style={{
                width: activeCard === i ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                background: activeCard === i ? "var(--accent-indigo)" : "rgba(255,255,255,0.3)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
      </div>{/* 컨테이너 끝 */}
    </div>
  );
};

export default ToolDetailModal;
