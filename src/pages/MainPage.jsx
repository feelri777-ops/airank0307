import { useState, useEffect, useMemo, useCallback } from "react";
import { useTools } from "../context/ToolContext";
import { useNews } from "../context/NewsContext";

import FilterBar from "../components/filters/FilterBar";
import RightSidebar from "../components/sidebar/RightSidebar";
import ToolCard from "../components/tools/ToolCard";
import WizardModal from "../components/modals/WizardModal";
import HeroSection from "../components/hero/HeroSection";
import { SORT_OPTIONS, mapCatToGroup } from "../constants";


export default function MainPage() {
  const { tools: rawTools, openToolDetail } = useTools();
  const { news } = useNews();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("score_desc");
  const [showWizard, setShowWizard] = useState(false);

  const [visibleCount, setVisibleCount] = useState(10);

  // 0. 기초 데이터 정제 (null 제거 및 id 보장)
  const tools = useMemo(() => 
    (Array.isArray(rawTools) ? rawTools : []).filter(t => t && (t.id || t._docId))
  , [rawTools]);

  // 1. 전체 순위 맵 (score_desc 기준 고정)
  const globalRankMap = useMemo(() => {
    const sorted = [...tools].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const map = {};
    sorted.forEach((t, i) => { map[t.id || t._docId] = i + 1; });
    return map;
  }, [tools]);

  // 2. 과거 순위 추정을 위한 이전 점수 맵
  const prevRankMap = useMemo(() => {
    const sorted = [...tools].sort((a, b) => {
      const aPrev = (Number(a.score) || 0) - (parseInt(String(a.change || "0").replace(/[^0-9-]/g, "")) || 0);
      const bPrev = (Number(b.score) || 0) - (parseInt(String(b.change || "0").replace(/[^0-9-]/g, "")) || 0);
      return bPrev - aPrev;
    });
    const map = {};
    sorted.forEach((t, i) => { map[t.id || t._docId] = i + 1; });
    return map;
  }, [tools]);

  const handleToolClick = useCallback((toolObj) => {
    const id = toolObj.id || toolObj._docId;
    openToolDetail(toolObj, globalRankMap[id] || 999, prevRankMap[id] || 999);
  }, [openToolDetail, globalRankMap, prevRankMap]);

  const filteredTools = useMemo(() => {
    let data = [...tools];
    if (category !== "all") data = data.filter((t) => t.cat === category || mapCatToGroup(t.cat) === category);
    
    if (searchQuery.trim()) {
      const q = searchQuery.normalize("NFC").toLowerCase();
      const norm = (s) => String(s || "").normalize("NFC").toLowerCase();
      
      data = data.filter((t) => {
        // 검색 대상 필드 확장
        const targetFields = [
          t.name, 
          t.nameKo, 
          t.desc, 
          t.oneLineReview, 
          t.usp, 
          t.ytKo, 
          t.gtKo,
          ...(Array.isArray(t.tags) ? t.tags : []),
          ...(Array.isArray(t.naverKw) ? t.naverKw : []),
          ...(t.prosCons?.pros || []),
          ...(t.prosCons?.cons || [])
        ];
        return targetFields.some(field => field && norm(field).includes(q));
      });
    }

    // 정렬 로직
    if (sortBy === "score_desc")   data.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    else if (sortBy === "buzz_desc")    data.sort((a, b) => (Number(b.metrics?.buzz) || 0) - (Number(a.metrics?.buzz) || 0));
    else if (sortBy === "growth_desc")  data.sort((a, b) => (Number(b.metrics?.growth) || 0) - (Number(a.metrics?.growth) || 0));
    else if (sortBy === "utility_desc") data.sort((a, b) => (Number(b.metrics?.utility) || 0) - (Number(a.metrics?.utility) || 0));
    else data.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    
    return data;
  }, [tools, category, searchQuery, sortBy]);

  useEffect(() => {
    setVisibleCount(10);
  }, [category, searchQuery, sortBy]);

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
        <div style={{ gridColumn: "1 / -1" }}>
          <FilterBar category={category} onCategoryChange={setCategory} />
        </div>

        <div className="sort-middle-col" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
              <div className="tools-grid">
                {filteredTools.slice(0, visibleCount).map((tool) => (
                  <ToolCard
                    key={tool.id || tool._docId}
                    tool={tool}
                    rank={globalRankMap[tool.id || tool._docId] || 999}
                    onClick={handleToolClick}
                  />
                ))}
              </div>

              {filteredTools.length > visibleCount && (
                <div style={{ textAlign: "center", marginTop: "24px", marginBottom: "32px" }}>
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    style={{
                      padding: "12px 48px", borderRadius: "var(--r-md)",
                      border: "1px solid var(--border-primary)", background: "var(--bg-card)",
                      color: "var(--text-primary)", fontFamily: "'Pretendard', sans-serif",
                      fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
                      transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    순위 더보기 ({filteredTools.length - visibleCount}개 남음)
                  </button>
                </div>
              )}
              <MobileNewsSection />
            </>
          )}
        </main>
        <RightSidebar />
      </div>

      <WizardModal isOpen={showWizard} onClose={() => setShowWizard(false)} tools={tools} />
    </>
  );
}
