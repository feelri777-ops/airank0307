import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { formatRelativeTime } from "../utils";

export const BOARDS = [
  { id: "chatgpt",    name: "ChatGPT",    logo: "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64",        color: "#10a37f", desc: "ChatGPT 사용팁, 질문, 경험을 공유해요" },
  { id: "gemini",     name: "Gemini",     logo: "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64",  color: "#4285F4", desc: "Google Gemini 활용법과 토론" },
  { id: "claude",     name: "Claude",     logo: "https://www.google.com/s2/favicons?domain=claude.ai&sz=64",          color: "#CC785C", desc: "Anthropic Claude 활용 경험 공유" },
  { id: "grok",       name: "Grok",       logo: "https://www.google.com/s2/favicons?domain=x.ai&sz=64",               color: "#1DA1F2", desc: "xAI Grok 사용 경험과 팁 공유" },
  { id: "notebooklm", name: "NotebookLM", logo: "https://www.google.com/s2/favicons?domain=notebooklm.google&sz=64", color: "#34A853", desc: "Google NotebookLM 활용법과 연구 팁" },
  { id: "opensource", name: "AI 언더독",  logo: "https://www.google.com/s2/favicons?domain=huggingface.co&sz=64",     color: "#8B5CF6", desc: "아직 덜 알려졌지만 주목할 만한 AI 툴 발굴·공유" },
  { id: "copilot",    name: "Copilot",    logo: "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=64", color: "#0078D4", desc: "Microsoft Copilot 활용 경험과 팁 공유" },
  { id: "perplexity", name: "Perplexity", logo: "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64",         color: "#20B8CD", desc: "Perplexity AI 검색 활용법과 경험 공유" },
  { id: "midjourney", name: "Midjourney", logo: "https://www.google.com/s2/favicons?domain=midjourney.com&sz=64",         color: "#000000", desc: "Midjourney 이미지 생성 팁과 프롬프트 공유" },
  { id: "cursor",     name: "Cursor",     logo: "https://www.google.com/s2/favicons?domain=cursor.com&sz=64",             color: "#6366F1", desc: "Cursor AI 코딩 경험과 활용법 공유" },
  { id: "stablediffusion", name: "Stable Diffusion", logo: "https://www.google.com/s2/favicons?domain=stability.ai&sz=64",    color: "#FF6B2B", desc: "Stable Diffusion 이미지 생성 팁과 모델 공유" },
  { id: "runway",     name: "Runway",     logo: "https://www.google.com/s2/favicons?domain=runwayml.com&sz=64",           color: "#5B5BD6", desc: "Runway 영상 생성 활용법과 크리에이티브 공유" },
  { id: "suno",       name: "Suno",       logo: "https://www.google.com/s2/favicons?domain=suno.com&sz=64",               color: "#FF4D4D", desc: "Suno AI 음악 생성 경험과 팁 공유" },
  { id: "windsurf",   name: "Windsurf",   logo: "https://www.google.com/s2/favicons?domain=codeium.com&sz=64",            color: "#09B6A2", desc: "Windsurf AI 코딩 경험과 활용법 공유" },
  { id: "notion",     name: "Notion AI",  logo: "https://www.google.com/s2/favicons?domain=notion.so&sz=64",              color: "#000000", desc: "Notion AI 활용법과 워크플로우 공유" },
  { id: "sora",       name: "Sora",       logo: "https://www.google.com/s2/favicons?domain=sora.com&sz=64",               color: "#412991", desc: "OpenAI Sora 영상 생성 경험 공유" },
  { id: "free",       name: "자유게시판", logo: "https://www.google.com/s2/favicons?domain=airank.kr&sz=64",               color: "#F59E0B", desc: "AI 전반에 관한 자유로운 이야기" },
];

function BoardCard({ board }) {
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
    <div
      onClick={() => navigate(`/community/${board.id}`)}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        borderRadius: "16px",
        padding: "1.5rem",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
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
          width: 48, height: 48, borderRadius: "12px",
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
            {totalCount !== null && (
              <span style={{
                fontSize: "0.7rem", fontWeight: 700,
                padding: "2px 8px", borderRadius: "20px",
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
        <span style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>→</span>
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
    </div>
  );
}

const STORAGE_KEY = "communityBoardOrder";

function getOrderedBoards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return BOARDS;
    const ids = JSON.parse(saved);
    const map = Object.fromEntries(BOARDS.map((b) => [b.id, b]));
    const ordered = ids.map((id) => map[id]).filter(Boolean);
    // 새로 추가된 게시판은 뒤에 붙임
    BOARDS.forEach((b) => { if (!ids.includes(b.id)) ordered.push(b); });
    return ordered;
  } catch {
    return BOARDS;
  }
}

export default function CommunityDashboard() {
  const [boards, setBoards] = useState(getOrderedBoards);
  const dragId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null); // 현재 호버 중인 카드
  const [dropPosition, setDropPosition] = useState(null); // "before" | "after"

  const handleDragStart = (id) => { dragId.current = id; };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    // 마우스 Y 위치로 카드의 위/아래 절반 판단
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverId(id);
    setDropPosition(e.clientY < midY ? "before" : "after");
  };

  const handleDragLeave = (e) => {
    // 자식 요소로 이동 시 깜빡임 방지
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
      // splice 후 인덱스 재계산
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
    setBoards(BOARDS);
  };

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 0.5rem" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "1.8rem", fontWeight: 800,
              color: "var(--text-primary)", marginBottom: "0.4rem",
            }}>
              💬 커뮤니티
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              AI 도구별 게시판에서 경험을 공유하고 질문해보세요
            </p>
          </div>
          <button
            onClick={resetOrder}
            style={{
              padding: "7px 14px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600,
              border: "1px solid var(--border-primary)", background: "var(--bg-card)",
              color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, marginTop: "4px",
            }}
          >
            순서 초기화
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px" }}>
          ⠿ 핸들을 드래그해서 게시판 순서를 변경할 수 있어요
        </p>
      </div>

      {/* 게시판 카드 그리드 */}
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
              onDragStart={() => handleDragStart(board.id)}
              onDragOver={(e) => handleDragOver(e, board.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, board.id)}
              onDragEnd={handleDragEnd}
              style={{
                position: "relative",
                opacity: isDragging ? 0.4 : 1,
                transition: "opacity 0.15s",
                // 삽입 위치 표시 — 위 or 아래 굵은 선
                borderTop: isOver && dropPosition === "before" ? "3px solid var(--accent-indigo)" : "3px solid transparent",
                borderBottom: isOver && dropPosition === "after" ? "3px solid var(--accent-indigo)" : "3px solid transparent",
                borderRadius: "2px",
              }}
            >
              {/* 드래그 핸들 */}
              <div
                style={{
                  position: "absolute", top: "14px", right: "14px",
                  fontSize: "1rem", color: "var(--text-muted)", cursor: "grab",
                  zIndex: 1, lineHeight: 1, userSelect: "none",
                }}
                title="드래그하여 순서 변경"
              >
                ⠿
              </div>
              <BoardCard board={board} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
