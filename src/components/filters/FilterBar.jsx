import { useRef, useMemo, useState, useEffect } from "react";
import { CATEGORIES } from "../../constants";
import Icon from "../ui/Icon";

const MAIN_GROUPS = [
  { id: "all", label: "전체", icon: "globe" },
  { id: "group_lang", label: "언어/대화", icon: "chat-circle", groupName: "언어/대화" },
  { id: "group_visual", label: "시각/창작", icon: "palette", groupName: "시각/창작" },
  { id: "group_dev", label: "개발/자동화", icon: "code", groupName: "개발/자동화" },
  { id: "group_work", label: "업무/교육", icon: "briefcase", groupName: "업무/교육" },
];

const mainTabStyle = (active) => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 16px",
  borderRadius: "12px",
  border: "none",
  background: active ? "var(--accent-indigo)" : "var(--bg-secondary)",
  color: active ? "#ffffff" : "var(--text-secondary)",
  fontSize: "0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  boxShadow: active ? "0 4px 12px rgba(99, 102, 241, 0.25)" : "none",
});

const subTabStyle = (active) => ({
  padding: "5px 14px",
  borderRadius: "100px",
  border: active ? `1.5px solid var(--accent-indigo)` : "1px solid var(--border-primary)",
  background: active ? "rgba(99, 102, 241, 0.08)" : "transparent",
  color: active ? "var(--accent-indigo)" : "var(--text-secondary)",
  fontSize: "0.78rem",
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  transition: "all 0.2s ease",
  whiteSpace: "nowrap",
});

const FilterBar = ({ category, onCategoryChange }) => {
  const [activeGroup, setActiveGroup] = useState("all");

  // 현재 선택된 카테고리의 그룹을 찾아 activeGroup 동기화
  useEffect(() => {
    if (category === "all") {
      setActiveGroup("all");
      return;
    }
    const currentCat = CATEGORIES.find(c => c.id === category);
    if (currentCat?.group) {
        const group = MAIN_GROUPS.find(g => g.groupName === currentCat.group);
        if (group) setActiveGroup(group.id);
    }
  }, [category]);

  const handleGroupClick = (group) => {
    setActiveGroup(group.id);
    if (group.id === "all") {
      onCategoryChange("all");
    } else {
      // 그룹 내 첫 번째 카테고리로 자동 선택하거나, 그룹 필터링 로직에 따라 처리
      // 여기서는 그룹만 클릭했을 때는 전체 리스트를 보여줄 수도 있고, 첫 번째 항목을 선택할 수도 있음.
      // 일단 '전체' 효과를 위해 초기화 대신 그룹 상태만 변경
    }
  };

  const filteredSubCategories = useMemo(() => {
    if (activeGroup === "all") return [];
    const groupName = MAIN_GROUPS.find(g => g.id === activeGroup)?.groupName;
    return CATEGORIES.filter(c => c.group === groupName);
  }, [activeGroup]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "4px", marginBottom: "0" }}>
      {/* 1단: 메인 그룹 탭 */}
      <div 
        className="filter-scroll-container"
        style={{ 
          display: "flex", 
          gap: "8px", 
          overflowX: "auto", 
          width: "100%", 
          padding: "4px 16px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {MAIN_GROUPS.map((group) => (
          <button
            key={group.id}
            onClick={() => handleGroupClick(group)}
            style={mainTabStyle(activeGroup === group.id)}
          >
            <Icon 
              name={group.icon} 
              size={18} 
              weight={activeGroup === group.id ? "fill" : "bold"}
              color="inherit" 
            />
            {group.label}
          </button>
        ))}
      </div>

      {/* 2단: 세부 카테고리 (애니메이션 효과를 위해 존재 여부에 따라 렌더링) */}
      {filteredSubCategories.length > 0 && (
        <div 
          className="filter-scroll-container"
          style={{ 
            display: "flex", 
            gap: "4px", 
            overflowX: "auto", 
            width: "100%", 
            padding: "2px 16px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            animation: "fadeIn 0.3s ease",
          }}
        >
          {filteredSubCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              style={subTabStyle(category === cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .filter-scroll-container::-webkit-scrollbar { display: none; }
          @media (min-width: 1025px) {
            .filter-scroll-container {
              justify-content: center !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default FilterBar;
