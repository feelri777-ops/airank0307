import { useState, useEffect } from "react";
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
  { id: "opensource", name: "오픈소스",   logo: "https://www.google.com/s2/favicons?domain=huggingface.co&sz=64",     color: "#8B5CF6", desc: "오픈소스 AI 모델 프로젝트 공유" },
  { id: "copilot",    name: "Copilot",    logo: "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=64", color: "#0078D4", desc: "Microsoft Copilot 활용 경험과 팁 공유" },
  { id: "perplexity", name: "Perplexity", logo: "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64",         color: "#20B8CD", desc: "Perplexity AI 검색 활용법과 경험 공유" },
  { id: "midjourney", name: "Midjourney", logo: "https://www.google.com/s2/favicons?domain=midjourney.com&sz=64",         color: "#000000", desc: "Midjourney 이미지 생성 팁과 프롬프트 공유" },
  { id: "cursor",     name: "Cursor",     logo: "https://www.google.com/s2/favicons?domain=cursor.com&sz=64",             color: "#6366F1", desc: "Cursor AI 코딩 경험과 활용법 공유" },
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

export default function CommunityDashboard() {
  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: "2rem" }}>
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

      {/* 게시판 카드 그리드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))",
        gap: "16px",
      }}>
        {BOARDS.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>
    </div>
  );
}
