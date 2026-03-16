import { useEffect, useState } from "react";
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
    if (!window.confirm("이 게시물을 삭제하시겠습니까?")) return;
    setDeleting(postId);
    try {
      const post = posts.find((p) => p.id === postId);

      // Firestore: 댓글 서브컬렉션 + 게시글 일괄 삭제
      const commentsSnap = await getDocs(collection(db, "communityPosts", postId, "comments"));
      const batch = writeBatch(db);
      commentsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "communityPosts", postId));
      await batch.commit();

      // Storage: content HTML에 포함된 이미지/파일 삭제
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

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>커뮤니티 관리</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>전체 게시물 {posts.length}개</p>

      {/* 게시판 필터 */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {[{ id: "all", name: "전체" }, ...BOARDS].map(({ id, name }) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: "6px 14px", borderRadius: "var(--r-sm)", fontSize: "0.82rem", fontWeight: 600,
            cursor: "pointer", border: "1px solid var(--border-primary)",
            background: filter === id ? "var(--accent-indigo)" : "var(--bg-card)",
            color: filter === id ? "#fff" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}>
            {name} {id !== "all" && `(${posts.filter((p) => p.board === id).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>게시물이 없습니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((post) => (
            <div key={post.id} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px", background: "var(--bg-card)",
              border: "1px solid var(--border-primary)", borderRadius: "var(--r-md)",
              opacity: isBusy(post.id) ? 0.6 : 1, transition: "opacity 0.15s",
            }}>
              {/* 현재 게시판 배지 */}
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                background: "rgba(99,102,241,0.08)", color: "var(--accent-indigo)",
                border: "1px solid rgba(99,102,241,0.2)", flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {BOARD_MAP[post.board] || post.board}
              </span>

              {/* 제목 + 메타 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.title}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {post.authorName || post.displayName || "익명"} · {post.createdAt ? formatRelativeTime(post.createdAt) : "-"} · 댓글 {post.commentCount || 0} · 👍 {post.upvoteCount || 0} 👎 {post.downvoteCount || 0}
                </div>
              </div>

              {/* 보기 링크 */}
              {post.board !== "all" && (
                <a
                  href={`/community/${post.board}/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.78rem", color: "var(--accent-indigo)", textDecoration: "none", flexShrink: 0, fontWeight: 600 }}
                >
                  보기
                </a>
              )}

              {/* 게시판 이동 select */}
              <select
                value={post.board}
                disabled={isBusy(post.id)}
                onChange={(e) => movePost(post.id, e.target.value, post.board, post.title)}
                style={{
                  fontSize: "0.8rem", padding: "5px 8px", borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
                  color: "var(--text-primary)", cursor: "pointer", outline: "none", flexShrink: 0,
                }}
              >
                <option value="all">📢 모든 게시판</option>
                {BOARDS.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* 이동 중 표시 */}
              {moving === post.id && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>이동 중…</span>
              )}

              {/* 삭제 버튼 */}
              <button
                onClick={() => deletePost(post.id)}
                disabled={isBusy(post.id)}
                style={{
                  padding: "6px 14px", borderRadius: "var(--r-sm)", fontSize: "0.8rem", fontWeight: 700,
                  background: "rgba(239,68,68,0.1)", color: "#ef4444",
                  border: "1px solid #ef4444", cursor: "pointer", flexShrink: 0,
                  opacity: isBusy(post.id) ? 0.5 : 1,
                }}
              >
                {deleting === post.id ? "삭제 중…" : "삭제"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
