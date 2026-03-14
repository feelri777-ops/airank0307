import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { formatRelativeTime } from "../../utils";

export default function AdminGallery() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "galleryPosts"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const deletePost = async (post) => {
    if (!window.confirm("이 게시물을 삭제하시겠습니까?")) return;
    setDeleting(post.id);
    try {
      // Storage 파일 삭제 시도 (실패해도 Firestore는 삭제)
      if (post.imageUrl || post.audioUrl) {
        const url = post.imageUrl || post.audioUrl;
        try {
          const storageRef = ref(storage, url);
          await deleteObject(storageRef);
        } catch {
          // URL에서 path 파싱 실패 시 무시
        }
      }
      await deleteDoc(doc(db, "galleryPosts", post.id));
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>갤러리 관리</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>전체 갤러리 포스트 {posts.length}개</p>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>불러오는 중…</div>
      ) : posts.length === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: "2rem" }}>갤러리 포스트가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {posts.map((post) => (
            <div key={post.id} style={{
              background: "var(--bg-card)", border: "1px solid var(--border-primary)",
              borderRadius: "12px", overflow: "hidden",
            }}>
              {/* 썸네일 */}
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "140px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                  🎵
                </div>
              )}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" }}>
                  {post.description || "(설명 없음)"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                  {post.authorName || "익명"} · {post.createdAt ? formatRelativeTime(post.createdAt) : "-"} · ❤️ {post.likeCount || 0}
                </div>
                <button
                  onClick={() => deletePost(post)}
                  disabled={deleting === post.id}
                  style={{
                    width: "100%", padding: "7px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 700,
                    background: "rgba(239,68,68,0.1)", color: "#ef4444",
                    border: "1px solid #ef4444", cursor: "pointer",
                    opacity: deleting === post.id ? 0.5 : 1,
                  }}
                >
                  {deleting === post.id ? "삭제 중…" : "삭제"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
