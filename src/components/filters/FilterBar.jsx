import { useRef } from "react";
import { CATEGORIES } from "../../constants";

const pillStyle = (active) => ({
  padding: "5px 12px",
  borderRadius: "var(--r-pill)",
  border: active ? `1px solid var(--accent-indigo)` : "1px solid var(--border-primary)",
  background: active ? "var(--tag-bg)" : "transparent",
  color: active ? "var(--accent-indigo)" : "var(--text-secondary)",
  fontSize: "0.78rem",
  fontFamily: "'Pretendard', sans-serif",
  fontWeight: active ? 600 : 400,
  cursor: "pointer",
  transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
  whiteSpace: "nowrap",
  flexShrink: 0,
  userSelect: "none",
});

const FilterBar = ({ category, onCategoryChange }) => {
  const rowRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  const onMouseDown = (e) => {
    drag.current = { active: true, startX: e.pageX - rowRef.current.offsetLeft, scrollLeft: rowRef.current.scrollLeft, moved: false };
    rowRef.current.style.cursor = "grabbing";
  };
  const onMouseMove = (e) => {
    if (!drag.current.active) return;
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = x - drag.current.startX;
    if (Math.abs(walk) > 4) drag.current.moved = true;
    rowRef.current.scrollLeft = drag.current.scrollLeft - walk;
  };
  const onMouseUp = () => {
    drag.current.active = false;
    rowRef.current.style.cursor = "grab";
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", overflow: "hidden" }}>
      <div
        ref={rowRef}
        className="filter-row"
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          alignItems: "center",
          padding: "2px 0",
          marginBottom: "0.5rem",
          flexWrap: "nowrap",
          cursor: "grab",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {CATEGORIES.map((cat, i) =>
          cat.divider ? (
            <span
              key={`divider-${i}`}
              aria-hidden="true"
              style={{
                width: "1px",
                height: "16px",
                background: "var(--border-primary)",
                flexShrink: 0,
                alignSelf: "center",
                margin: "0 2px",
              }}
            />
          ) : (
            <button
              key={cat.id}
              onClick={() => { if (!drag.current.moved) onCategoryChange(cat.id); }}
              style={pillStyle(category === cat.id)}
            >
              {cat.label}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default FilterBar;
