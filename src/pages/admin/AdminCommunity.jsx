import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, getDocs, doc, writeBatch, updateDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { BOARDS } from "../CommunityDashboard";
import { formatRelativeTime } from "../../utils";

// HTML content에서 Firebase Storage URL 추출 후 일괄 삭제
const deleteStorageFiles = async (htmlContent) => {
  if (!htmlContent) return;
  const matches = htmlContent.match(/https:\/\/firebasestorage\.googleapis\.com\/[^\s"'>]+/g);
  if (!matches) return;
  await Promise.allSettled(
    matches.map((url) => deleteObject(ref(storage, url)).catch(() => {}))
  );
};

const BOARD_MAP = { all: "모든 게시판", ...Object.fromEntries(BOARDS.map((b) => [b.id, b.name])) };

export default function AdminCommunity() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [moving, setMoving] = useState(null);
  
  // Mouse Drag Scroll for Filter Bar
  const scrollRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);
  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const deletePost = async (postId) => {
    if (!window.confirm("이 게시물을 영구적으로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
    setDeleting(postId);
    try {
      const post = posts.find((p) => p.id === postId);
      const commentsSnap = await getDocs(collection(db, "communityPosts", postId, "comments"));
      const batch = writeBatch(db);
      commentsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "communityPosts", postId));
      await batch.commit();
      await deleteStorageFiles(post?.content);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const movePost = async (postId, targetBoardId, currentBoardId, title) => {
    if (targetBoardId === currentBoardId) return;
    const targetName = BOARD_MAP[targetBoardId];
    if (!window.confirm(`"${title}"\n\n→ [${targetName}] 게시판으로 이동하시겠습니까?`)) return;
    setMoving(postId);
    try {
      await updateDoc(doc(db, "communityPosts", postId), { board: targetBoardId });
      setPosts((prev) =>
        prev.map((p) => p.id === postId ? { ...p, board: targetBoardId } : p)
      );
    } catch (e) {
      alert("이동 실패: " + e.message);
    } finally {
      setMoving(null);
    }
  };

  const filtered = filter === "all" ? posts : posts.filter((p) => p.board === filter);
  const isBusy = (postId) => deleting === postId || moving === postId;

  // Stats calculation
  const totalPosts = posts.length;
  const today = new Date().toISOString().split('T')[0];
  const todayPosts = posts.filter(p => p.createdAt?.toDate().toISOString().split('T')[0] === today).length;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header Section */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)", margin: "0 0 0.3rem 0", letterSpacing: "-0.02em" }}>
          커뮤니티 관리
        </h1>
        <p style={{ fontSize: "0.96rem", color: "var(--text-muted)", margin: 0 }}>게시글 모니터링 및 카테고리 관리 도구</p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem", marginBottom: "1.5rem"
      }}>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>전체 게시글</div>
          <div style={statsValueStyle}>{totalPosts.toLocaleString()}</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>오늘 올라온 글</div>
          <div style={{ ...statsValueStyle, color: "var(--accent-indigo)" }}>{todayPosts}</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>필터링된 결과</div>
          <div style={statsValueStyle}>{filtered.length}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ 
        position: "sticky", top: "0", zIndex: 10,
        background: "var(--bg-primary)", padding: "10px 0", marginBottom: "1.5rem",
        borderBottom: "1px solid var(--border-primary)"
      }}>
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ 
            display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "12px",
            scrollbarWidth: "none", msOverflowStyle: "none",
            cursor: isDown ? "grabbing" : "grab", userSelect: "none",
            WebkitOverflowScrolling: "touch"
          }}
          className="admin-filter-scroll"
        >
          <style>{`
            .admin-filter-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          {[{ id: "all", name: "전체보기" }, ...BOARDS].map(({ id, name }) => {
            const isActive = filter === id;
            const count = id === "all" ? posts.length : posts.filter((p) => p.board === id).length;
            return (
              <button key={id} onClick={() => setFilter(id)} style={{
                padding: "8px 16px", borderRadius: "0", fontSize: "0.88rem", fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                border: "1px solid",
                borderColor: isActive ? "var(--accent-indigo)" : "var(--border-primary)",
                background: isActive ? "var(--accent-indigo)" : "var(--bg-card)",
                color: isActive ? "#fff" : "var(--text-secondary)",
                boxShadow: isActive ? "0 4px 12px rgba(99,102,241,0.25)" : "none",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}>
                {name} <span style={{ opacity: 0.7, marginLeft: "6px" }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.88rem" }}>
          <div className="spinner" style={{ marginBottom: "0.75rem" }}>⏳</div>
          게시글 데이터를 불러오는 중입니다...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "3rem 1.5rem", background: "var(--bg-card)",
          borderRadius: "0", border: "2px dashed var(--border-primary)"
        }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>표시할 게시글이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((post) => {
            const isBanned = post.reportCount >= 5;
            const postNum = posts.length - posts.findIndex(p => p.id === post.id);

            return (
              <div key={post.id} style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "1rem 1.2rem", background: isBanned ? "rgba(239,68,68,0.05)" : "var(--bg-card)",
                border: "1px solid",
                borderColor: isBanned ? "#ef4444" : "var(--border-primary)",
                borderRadius: "0",
                opacity: isBusy(post.id) ? 0.6 : 1, transition: "all 0.2s",
                boxShadow: isBanned ? "0 4px 12px rgba(239,68,68,0.1)" : "0 2px 4px rgba(0,0,0,0.02)"
              }}
              className="admin-post-item"
              >
                {/* Category & Info */}
                <div style={{ width: "110px", flexShrink: 0 }}>
                  <div style={{
                    fontSize: "0.68rem", fontWeight: 800, padding: "5px 8px", borderRadius: "0",
                    background: isBanned ? "#ef4444" : "rgba(99,102,241,0.08)",
                    color: isBanned ? "#fff" : "var(--accent-indigo)",
                    border: "1px solid",
                    borderColor: isBanned ? "#ef4444" : "rgba(99,102,241,0.15)",
                    textAlign: "center",
                    textTransform: "uppercase", letterSpacing: "0.02em"
                  }}>
                    {BOARD_MAP[post.board] || post.board} #{postNum}
                  </div>
                </div>

                {/* Title & Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "1.04rem", fontWeight: 700, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginBottom: "6px",
                    display: "flex", alignItems: "center", gap: "6px"
                  }}>
                    {post.title}
                    {isBanned && <span style={{ fontSize: "0.68rem", padding: "3px 8px", background: "#ef4444", color: "#fff", borderRadius: "0" }}>신고 누적</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.84rem", color: "var(--text-muted)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{post.authorName || post.displayName || "익명"}</span>
                    <span>|</span>
                    <span>{post.createdAt ? formatRelativeTime(post.createdAt) : "-"}</span>
                    <span>|</span>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <span>💬 {post.commentCount || 0}</span>
                      <span>👍 {post.upvoteCount || 0}</span>
                      <span>👎 {post.downvoteCount || 0}</span>
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>🚨 {post.reportCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  {/* View */}
                  {post.board && post.board !== "all" && (
                    <a
                      href={`/community/${post.board}/${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="원본 보기"
                      style={actionIconBtnStyle}
                    >
                      🔍
                    </a>
                  )}

                  {/* Move Select */}
                  <div style={{ position: "relative" }}>
                    <select
                      value={post.board}
                      disabled={isBusy(post.id)}
                      onChange={(e) => movePost(post.id, e.target.value, post.board, post.title)}
                      style={modernSelectStyle}
                    >
                      {BOARDS.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deletePost(post.id)}
                    disabled={isBusy(post.id)}
                    style={{
                      padding: "8px 16px", borderRadius: "0", fontSize: "0.8rem", fontWeight: 800,
                      background: "rgba(239,68,68,0.08)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex", alignItems: "center", gap: "5px"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
                  >
                    {deleting === post.id ? "..." : "삭제"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styles
const statsCardStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border-primary)",
  borderRadius: "0", padding: "1rem", boxShadow: "0 4px 6px rgba(0,0,0,0.02)"
};
const statsLabelStyle = { fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" };
const statsValueStyle = { fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)" };

const actionIconBtnStyle = {
  width: "32px", height: "32px", borderRadius: "0",
  background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
  display: "flex", alignItems: "center", justifyContent: "center",
  textDecoration: "none", fontSize: "0.96rem", cursor: "pointer", transition: "all 0.2s"
};

const modernSelectStyle = {
  appearance: "none", padding: "8px 11px", borderRadius: "0",
  border: "1px solid var(--border-primary)", background: "var(--bg-tertiary)",
  color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 600,
  cursor: "pointer", outline: "none", minWidth: "96px"
};
