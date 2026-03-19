import { useState, useEffect, useMemo, useCallback } from "react";
import { useTools } from "../context/ToolContext";
import { useNews } from "../context/NewsContext";

import FilterBar from "../components/filters/FilterBar";
import RightSidebar from "../components/sidebar/RightSidebar";
import ToolCard from "../components/tools/ToolCard";
import WizardModal from "../components/modals/WizardModal";
import HeroSection from "../components/hero/HeroSection";
import { SORT_OPTIONS } from "../constants";

const ScoreDataNotice = ({ error, scoresUpdated }) => {
  const isStale = scoresUpdated && (Date.now() - new Date(scoresUpdated).getTime()) > 48 * 60 * 60 * 1000;
  if (!error && !isStale) return null;

  const updatedStr = scoresUpdated
    ? new Date(scoresUpdated).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      margin: "0 0 12px",
      padding: "8px 14px",
      borderRadius: "var(--r-sm)",
      background: "rgba(234, 179, 8, 0.08)",
      border: "1px solid rgba(234, 179, 8, 0.3)",
      fontSize: "0.78rem",
      color: "var(--text-secondary)",
    }}>
      <span style={{ fontSize: "1rem" }}>⚠️</span>
      <span>
        {error
          ? "점수 데이터를 불러오지 못했습니다. 현재 점수는 추정값으로, 실제와 다를 수 있습니다."
          : `마지막 점수 갱신: ${updatedStr} — 데이터가 오래되어 실제와 다를 수 있습니다.`
        }
      </span>
    </div>
  );
};

export default function MainPage() {
  const { tools, openToolDetail, bookmarkCounts, reactionCounts, error, scoresUpdated } = useTools();
  const { news } = useNews();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("score_desc");
  const [showWizard, setShowWizard] = useState(false);
  
  // 초기 개수 10개로 설정
  const [visibleCount, setVisibleCount] = useState(10);

  // 전체 순위 맵 (score_desc 기준 고정)
  const globalRankMap = useMemo(() => {
    const sorted = [...tools].sort((a, b) => b.score - a.score);
    const map = {};
    sorted.forEach((t, i) => { map[t.id] = i + 1; });
    return map;
  }, [tools]);

  const prevRankMap = useMemo(() => {
    const sorted = [...tools].sort((a, b) => (b.score - b.change) - (a.score - a.change));
    const map = {};
    sorted.forEach((t, i) => { map[t.id] = i + 1; });
    return map;
  }, [tools]);

  const handleToolClick = useCallback((toolObj) => {
    openToolDetail(toolObj, globalRankMap[toolObj.id] || 999, prevRankMap[toolObj.id] || 999);
  }, [openToolDetail, globalRankMap, prevRankMap]);

  const filteredTools = useMemo(() => {
    let data = [...tools];
    if (category !== "all") data = data.filter((t) => t.cat === category);
    if (searchQuery.trim()) {
      const q = searchQuery.normalize("NFC").toLowerCase();
      const norm = (s) => (s || "").normalize("NFC").toLowerCase();
      data = data.filter((t) =>
        norm(t.name).includes(q) ||
        (t.nameKo && norm(t.nameKo).includes(q)) ||
        norm(t.desc).includes(q) ||
        (t.ytKo && norm(t.ytKo).includes(q)) ||
        (t.gtKo && norm(t.gtKo).includes(q)) ||
        (t.naverKw && Array.isArray(t.naverKw) && t.naverKw.some(kw => norm(kw).includes(q)))
      );
    }
    if (sortBy === "score_desc")  data.sort((a, b) => (b.score || 0) - (a.score || 0));
    else if (sortBy === "google_desc") data.sort((a, b) => (b.metrics?.opr ?? 0) - (a.metrics?.opr ?? 0));
    else if (sortBy === "naver_desc")  data.sort((a, b) => (b.metrics?.ntv ?? 0) - (a.metrics?.ntv ?? 0));
    else if (sortBy === "x_desc")      data.sort((a, b) => (b.metrics?.sns ?? 0) - (a.metrics?.sns ?? 0));
    else data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
    return data;
  }, [tools, category, searchQuery, sortBy]);

  useEffect(() => {
    setVisibleCount(10);
  }, [category, searchQuery, sortBy]);

  // 모바일 전용 뉴스 섹션 컴포넌트
  const MobileNewsSection = () => {
    if (!news || !news.items) return null;
    
    return (
      <div className="mobile-news-box">
        <div className="mobile-news-header">
          <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>📰 실시간 주요 뉴스</span>
          <a href="/news" style={{ fontSize: "0.75rem", color: "var(--accent-indigo)", textDecoration: "none", fontWeight: 600 }}>전체보기 ❯</a>
        </div>
        <div className="mobile-news-list">
          {news.items.slice(0, 5).map((item, idx) => (
            <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="mobile-news-item">
              <span className="dot">•</span> 
              <span className="title">{item.title}</span>
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenWizard={() => setShowWizard(true)}
      />

      <div className="main-grid">
        {/* FilterBar: 전체 컬럼 span */}
        <div style={{ gridColumn: "1 / -1" }}>
          <FilterBar
            category={category}
            onCategoryChange={setCategory}
          />
        </div>

        {/* Row 3: 경고 배너 + 정렬 버튼 (가운데 컬럼) */}
        <div className="sort-middle-col" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <ScoreDataNotice error={error} scoresUpdated={scoresUpdated} />
          <div className="sort-container">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={`sort-btn ${sortBy === opt.id ? "active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <main style={{ minWidth: 0 }}>

          {filteredTools.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🤖</div>
              <p style={{ fontSize: "1rem", fontWeight: 500 }}>검색 결과가 없습니다</p>
            </div>
          ) : (
            <>
              {/* 1. 툴 카드 리스트 */}
              <div className="tools-grid">
                {filteredTools.slice(0, visibleCount).map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    rank={globalRankMap[tool.id] || 999}
                    onClick={handleToolClick}
                  />
                ))}
              </div>

              {/* 2. 더보기 버튼 (툴 리스트 바로 아래) */}
              {filteredTools.length > visibleCount && (
                <div style={{ textAlign: "center", marginTop: "24px", marginBottom: "32px" }}>
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    style={{
                      padding: "12px 48px",
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--border-primary)",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      fontFamily: "'Pretendard', sans-serif",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "var(--shadow-sm)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
                  >
                    순위 더보기 ({filteredTools.length - visibleCount}개 남음)
                  </button>
                </div>
              )}

              {/* 3. 뉴스 섹션 (더보기 버튼 아래) */}
              <MobileNewsSection />
            </>
          )}
        </main>

        <RightSidebar />
      </div>

      <WizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        tools={tools}
      />
    </>
  );
}
