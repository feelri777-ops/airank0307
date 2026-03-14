import React, { useState, useEffect, useRef, useMemo } from "react";
import { TOOLS_DATA } from "../data/tools.js";
import ToolDetailModal from "../components/modals/ToolDetailModal.jsx";

const CAT_COLORS = {
  text:         { bg: "#3B82F6", label: "텍스트 AI" },
  chatbot:      { bg: "#0EA5E9", label: "챗봇 AI" },
  image:        { bg: "#8B5CF6", label: "이미지 AI" },
  code:         { bg: "#10B981", label: "코딩 AI" },
  video:        { bg: "#F59E0B", label: "영상 AI" },
  audio:        { bg: "#EF4444", label: "오디오 AI" },
  search:       { bg: "#06B6D4", label: "검색 AI" },
  productivity: { bg: "#F97316", label: "생산성 AI" },
  design:       { bg: "#EC4899", label: "디자인 AI" },
  photo:        { bg: "#A78BFA", label: "사진 AI" },
  automation:   { bg: "#14B8A6", label: "자동화 AI" },
  education:    { bg: "#84CC16", label: "교육 AI" },
};

// 재귀 이진 분할 트리맵 레이아웃
function layoutTreemap(items, x, y, w, h) {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].value;
    splitIdx = i + 1;
    if (acc >= total / 2) break;
  }

  const leftItems = items.slice(0, splitIdx);
  const rightItems = items.slice(splitIdx);
  const leftRatio = leftItems.reduce((s, i) => s + i.value, 0) / total;

  let leftRect, rightRect;
  if (w >= h) {
    leftRect  = { x,                 y, w: w * leftRatio,       h };
    rightRect = { x: x + w * leftRatio, y, w: w * (1 - leftRatio), h };
  } else {
    leftRect  = { x, y,                 w, h: h * leftRatio       };
    rightRect = { x, y: y + h * leftRatio, w, h: h * (1 - leftRatio) };
  }

  return [
    ...layoutTreemap(leftItems,  leftRect.x,  leftRect.y,  leftRect.w,  leftRect.h),
    ...layoutTreemap(rightItems, rightRect.x, rightRect.y, rightRect.w, rightRect.h),
  ];
}

const GAP = 3;

export default function TreemapPage() {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [scores, setScores] = useState({});
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [modalIndex, setModalIndex] = useState(0);

  useEffect(() => {
    fetch("/scores.json")
      .then((r) => r.json())
      .then((d) => setScores(d.tools || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const top100 = useMemo(() => {
    return [...TOOLS_DATA]
      .map((t) => ({ ...t, liveScore: scores[String(t.id)]?.score ?? t.score }))
      .sort((a, b) => b.liveScore - a.liveScore)
      .slice(0, 100)
      .map((t, i) => ({ ...t, rank: i + 1, value: Math.max(t.liveScore, 1) }));
  }, [scores]);

  const layout = useMemo(() => {
    if (!dims.w || !dims.h || !top100.length) return [];
    return layoutTreemap(top100, 0, 0, dims.w, dims.h);
  }, [top100, dims]);

  const handleClick = (item) => {
    const idx = top100.findIndex((t) => t.id === item.id);
    setModalIndex(idx);
    setSelectedTool(item);
  };

  return (
    <div style={{ padding: "20px 24px", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
          🗺️ AI 툴 지형도
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          상위 100개 AI 툴의 점수 비중을 시각화 · 크기가 클수록 종합점수가 높습니다
        </p>
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: 14 }}>
        {Object.entries(CAT_COLORS).map(([cat, { bg, label }]) => (
          <div
            key={cat}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: "0.72rem", color: "var(--text-secondary)",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>

      {/* 트리맵 컨테이너 */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "calc(100vh - 220px)",
          minHeight: 400,
          position: "relative",
          background: "var(--bg-secondary)",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border-color)",
        }}
      >
        {layout.map((item) => {
          const color = CAT_COLORS[item.cat]?.bg || "#888";
          const isHovered = hoveredId === item.id;
          const cellW = Math.max(item.w - GAP * 2, 0);
          const cellH = Math.max(item.h - GAP * 2, 0);
          const minDim = Math.min(cellW, cellH);

          // 텍스트 표시 기준
          const showRank  = cellW > 28 && cellH > 22;
          const showName  = cellW > 44 && cellH > 36;
          const showScore = cellW > 70 && cellH > 60;

          const nameFontSize  = Math.min(minDim * 0.22, 16);
          const rankFontSize  = Math.min(minDim * 0.18, 11);
          const scoreFontSize = Math.min(minDim * 0.14, 10);

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleClick(item)}
              title={`#${item.rank} ${item.name} · ${item.liveScore.toFixed(1)}점`}
              style={{
                position: "absolute",
                left: item.x + GAP,
                top: item.y + GAP,
                width: cellW,
                height: cellH,
                background: isHovered
                  ? color
                  : `${color}cc`,
                borderRadius: 4,
                overflow: "hidden",
                cursor: "pointer",
                transition: "background 0.15s, box-shadow 0.15s",
                boxShadow: isHovered ? `0 0 0 2px white, 0 4px 12px rgba(0,0,0,0.3)` : "none",
                zIndex: isHovered ? 10 : 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 4,
                boxSizing: "border-box",
              }}
            >
              {showRank && (
                <div style={{
                  fontSize: rankFontSize,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}>
                  #{item.rank}
                </div>
              )}
              {showName && (
                <div style={{
                  fontSize: nameFontSize,
                  fontWeight: 800,
                  color: "#fff",
                  textAlign: "center",
                  lineHeight: 1.2,
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  wordBreak: "break-word",
                  marginTop: showRank ? 2 : 0,
                  maxWidth: "100%",
                  overflow: "hidden",
                }}>
                  {item.name}
                </div>
              )}
              {showScore && (
                <div style={{
                  fontSize: scoreFontSize,
                  color: "rgba(255,255,255,0.75)",
                  marginTop: 2,
                  fontWeight: 600,
                }}>
                  {item.liveScore.toFixed(1)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 툴 상세 모달 */}
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          tools={top100}
          currentIndex={modalIndex}
          onNavigate={(newIndex) => {
            setModalIndex(newIndex);
            setSelectedTool(top100[newIndex]);
          }}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  );
}
