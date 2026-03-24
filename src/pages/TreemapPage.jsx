import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTools } from "../context/ToolContext";
import ToolDetailModal from "../components/modals/ToolDetailModal.jsx";

const CAT_COLORS = {
  text:         { bg: "#3B82F6", label: "텍스트 AI" },
  multimodal:   { bg: "#6366F1", label: "멀티모달 AI" },
  image:        { bg: "#8B5CF6", label: "이미지 AI" },
  code:         { bg: "#10B981", label: "코딩 AI" },
  video:        { bg: "#F59E0B", label: "영상 AI" },
  audio:        { bg: "#EF4444", label: "오디오 AI" },
  search:       { bg: "#06B6D4", label: "검색 AI" },
  productivity: { bg: "#F97316", label: "생산성 AI" },
  agent:        { bg: "#1488CC", label: "에이전트 AI" },
  other:        { bg: "#64748B", label: "기타 AI" },
};

// 재귀 이진 분할 트리맵 레이아웃
function layoutTreemap(items, x, y, w, h) {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
  let acc = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    acc += (Number(items[i].value) || 0);
    splitIdx = i + 1;
    if (acc >= total / 2) break;
  }

  const leftItems = items.slice(0, splitIdx);
  const rightItems = items.slice(splitIdx);
  const leftRatio = leftItems.reduce((s, i) => s + (Number(i.value) || 0), 0) / (total || 1);

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

const GAP = 2;

export default function TreemapPage() {
  const containerRef = useRef(null);
  const { tools } = useTools();
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);

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
    if (!tools || tools.length === 0) return [];
    return [...tools]
      .filter(t => t && t.id)
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 100)
      .map((t, i) => ({ 
        ...t, 
        rank: i + 1, 
        value: Math.max(Number(t.score) || 1, 1),
        cat: t.cat || 'other'
      }));
  }, [tools]);

  const layout = useMemo(() => {
    if (!dims.w || !dims.h || !top100.length) return [];
    return layoutTreemap(top100, 0, 0, dims.w, dims.h);
  }, [top100, dims]);

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          🗺️ AI 툴 지형도
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}>
          상위 100개 AI 툴의 영향력 시각화 · 면적이 넓을수록 높은 랭킹 점수를 의미합니다.
        </p>
      </div>

      {/* 범례 (업데이트된 카테고리 대응) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: 20 }}>
        {Object.entries(CAT_COLORS).map(([cat, { bg, label }]) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: bg }} />
            {label}
          </div>
        ))}
      </div>

      {/* 트리맵 컨테이너 */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "calc(100vh - 240px)",
          minHeight: 450,
          position: "relative",
          background: "rgba(0,0,0,0.05)",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid var(--border-primary)",
        }}
      >
        {layout.length === 0 && (
          <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            데이터를 불러오는 중입니다...
          </div>
        )}
        {layout.map((item) => {
          const color = CAT_COLORS[item.cat]?.bg || CAT_COLORS.other.bg;
          const isHovered = hoveredId === item.id;
          const cellW = Math.max(item.w - GAP * 2, 0);
          const cellH = Math.max(item.h - GAP * 2, 0);
          const minDim = Math.min(cellW, cellH);

          // 텍스트 표시 기준
          const showRank  = cellW > 30 && cellH > 25;
          const showName  = cellW > 50 && cellH > 40;
          const showScore = cellW > 80 && cellH > 70;

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedTool(item)}
              style={{
                position: "absolute",
                left: item.x + GAP,
                top: item.y + GAP,
                width: cellW,
                height: cellH,
                background: isHovered ? color : `${color}cc`,
                borderRadius: 8,
                cursor: "pointer",
                transition: "background 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isHovered ? `inset 0 0 0 2px rgba(255,255,255,0.4), 0 8px 24px rgba(0,0,0,0.2)` : "none",
                zIndex: isHovered ? 10 : 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 6,
                transform: isHovered ? "scale(1.02)" : "scale(1)",
              }}
            >
              {showRank && (
                <div style={{ fontSize: Math.min(minDim * 0.15, 12), fontWeight: 800, color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>
                  #{item.rank}
                </div>
              )}
              {showName && (
                <div style={{
                  fontSize: Math.min(minDim * 0.2, 18),
                  fontWeight: 900,
                  color: "#fff",
                  textAlign: "center",
                  lineHeight: 1.1,
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  wordBreak: "break-all",
                  marginTop: 4,
                  maxWidth: "100%",
                }}>
                  {item.name}
                </div>
              )}
              {showScore && (
                <div style={{ fontSize: Math.min(minDim * 0.12, 11), color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: 700 }}>
                  {Number(item.score).toFixed(1)}
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
          rank={selectedTool.rank}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  );
}
