import { useState, useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useCommunity } from "../context/CommunityContext";
import { formatRelativeTime } from "../utils";

// 기존 고정값 대신 빈 배열로 초기화 (하위 호환성 유지)
export let BOARDS = [];

const PageWrapper = styled.div`
  max-width: 960px; margin: 0 auto; padding: 2rem 0.5rem;
  @media (max-width: 600px) { padding: 1rem 0.3rem; }
`;

const Card = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-md);
  padding: 0.9rem 1rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
  @media (max-width: 600px) { padding: 0.8rem 0.6rem; }
`;

function BoardCard({ board, isFavorited, onToggleFavorite }) {
  const navigate = useNavigate();
  const [recentPosts, setRecentPosts] = useState([]);
  const [totalCount, setTotalCount] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "communityPosts"),
      where("board", "==", board.id),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    getDocs(q).then((snap) => {
      setRecentPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(() => {});

    getDocs(query(collection(db, "communityPosts"), where("board", "==", board.id)))
      .then((snap) => setTotalCount(snap.size))
      .catch(() => {});
  }, [board.id]);

  return (
    <Card
      onClick={() => navigate(`/community/${board.id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = board.color;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.12)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-primary)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "var(--r-md)",
          background: `${board.color}18`,
          border: `1px solid ${board.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
        }}>
          <img src={board.logo} alt={board.name} width={32} height={32} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {board.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, board.id); }}
              title={isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "0",
                fontSize: "1.35rem", lineHeight: 1, color: isFavorited ? "#f59e0b" : "var(--text-muted)",
                transition: "transform 0.15s, color 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.3)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {isFavorited ? "★" : "☆"}
            </button>
            {totalCount !== null && (
              <span style={{
                fontSize: "0.7rem", fontWeight: 700,
                padding: "2px 8px", borderRadius: "var(--r-lg)",
                background: `${board.color}18`, color: board.color,
              }}>
                {totalCount}개
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {board.desc}
          </div>
        </div>
      </div>

      {/* 최신글 미리보기 */}
      <div style={{
        borderTop: "1px solid var(--border-primary)",
        paddingTop: "10px",
        display: "flex", flexDirection: "column", gap: "6px",
      }}>
        {recentPosts.length === 0 ? (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>아직 게시글이 없어요. 첫 글을 작성해보세요!</span>
        ) : (
          recentPosts.map((post) => (
            <div
              key={post.id}
              onClick={(e) => { e.stopPropagation(); navigate(`/community/${board.id}/${post.id}`); }}
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            >
              <span style={{
                fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
              }}>
                {post.title}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

const STORAGE_KEY = "communityBoardOrder";
const FAVORITES_KEY = "communityBoardFavorites";

function getOrderedBoards(initialBoards) {
  if (!initialBoards?.length) return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialBoards;
  try {
    const order = JSON.parse(saved);
    const map = new Map(initialBoards.map(b => [b.id, b]));
    const result = order.map(id => map.get(id)).filter(Boolean);
    const remaining = initialBoards.filter(b => !order.includes(b.id));
    return [...result, ...remaining];
  } catch(e) { return initialBoards; }
}

export default function CommunityDashboard() {
  const navigate = useNavigate();
  const { boards: firestoreBoards, loading: firestoreLoading } = useCommunity();
  const [boards, setBoards] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  useEffect(() => {
    if (!firestoreLoading) {
      setBoards(getOrderedBoards(firestoreBoards));
      BOARDS = firestoreBoards; // 전역 변수 업데이트 (다른 컴포넌트용 브릿지)
    }
  }, [firestoreBoards, firestoreLoading]);

  const favoritesSet = new Set(favorites);
  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);

  const toggleFavorite = (e, boardId) => {
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.includes(boardId);
      let next;
      if (isFav) {
        next = prev.filter(id => id !== boardId);
      } else {
        next = [boardId, ...prev]; // 즐겨찾기 추가 시 맨 앞으로
        setBoards(prevBoards => {
          const idx = prevBoards.findIndex(b => b.id === boardId);
          if (idx <= 0) return prevBoards;
          const updated = [...prevBoards];
          const [item] = updated.splice(idx, 1);
          updated.unshift(item);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.map(b => b.id)));
          return updated;
        });
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverId(id);
    setDropPosition(e.clientY < midY ? "before" : "after");
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === targetId) {
      setDragOverId(null); setDropPosition(null);
      return;
    }
    setBoards((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((b) => b.id === dragId.current);
      let toIdx = next.findIndex((b) => b.id === targetId);
      const [item] = next.splice(fromIdx, 1);
      toIdx = next.findIndex((b) => b.id === targetId);
      const insertAt = dropPosition === "before" ? toIdx : toIdx + 1;
      next.splice(insertAt, 0, item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map((b) => b.id)));
      return next;
    });
    dragId.current = null;
    setDragOverId(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    setDropPosition(null);
    dragId.current = null;
  };

  const resetOrder = () => {
    localStorage.removeItem(STORAGE_KEY);
    setBoards(firestoreBoards); // Reset to the original order from Firestore
  };

  if (firestoreLoading) {
    return (
      <PageWrapper>
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <div className="spinner" style={{ marginBottom: "1rem" }}>⏳</div>
          커뮤니티를 불러오는 중입니다...
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* 헤더 */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif", fontSize: "1.8rem", fontWeight: 800,
          color: "var(--text-primary)", marginBottom: "1rem",
        }}>
          💬 커뮤니티
        </h1>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <button
            onClick={resetOrder}
            style={{
              padding: "6px 12px", borderRadius: "var(--r-sm)", fontSize: "0.75rem", fontWeight: 700,
              border: "1px solid var(--border-primary)", background: "var(--bg-card)",
              color: "var(--text-muted)", cursor: "pointer",
            }}
          >
            순서 초기화
          </button>
          <p style={{ fontSize: "0.72rem", color: "var(--accent-indigo)", fontWeight: 600, opacity: 0.8 }}>
            ⠿ 게시판을 드래그해서 나만의 순서를 정해보세요
          </p>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(440px, 100%), 1fr))",
        gap: "16px",
      }}>
        {boards.map((board) => {
          const isOver = dragOverId === board.id;
          const isDragging = dragId.current === board.id;
          return (
            <div
              key={board.id}
              draggable
              onDragStart={(e) => {
                dragId.current = board.id;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", board.id);
              }}
              onDragOver={(e) => handleDragOver(e, board.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, board.id)}
              onDragEnd={handleDragEnd}
              style={{
                position: "relative",
                opacity: isDragging ? 0.4 : 1,
                transition: "opacity 0.15s, border 0.2s",
                borderTop: isOver && dropPosition === "before" ? "3px solid var(--accent-indigo)" : "3px solid transparent",
                borderBottom: isOver && dropPosition === "after" ? "3px solid var(--accent-indigo)" : "3px solid transparent",
                borderRadius: "var(--r-xs)",
              }}
            >
              {/* 드래그 핸들 */}
              <div
                style={{
                  position: "absolute", top: "8px", right: "10px",
                  fontSize: "0.85rem", color: "var(--text-muted)", cursor: "grab",
                  zIndex: 2, lineHeight: 1, userSelect: "none", opacity: 0.5,
                }}
                title="드래그하여 순서 변경"
              >
                ⠿
              </div>
              <BoardCard
                board={board}
                isFavorited={favoritesSet.has(board.id)}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}
