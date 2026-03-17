import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { formatRelativeTime } from "../../utils";

const ACTION_ICON_BTN_STYLE = {
  width: "32px", height: "32px", borderRadius: "0",
  background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
  display: "flex", alignItems: "center", justifyContent: "center",
  textDecoration: "none", fontSize: "0.96rem", cursor: "pointer", transition: "all 0.2s"
};

export default function AdminGallery() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

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
    if (!window.confirm("이 게시물을 정말 삭제하시겠습니까?")) return;
    setDeleting(post.id);
    try {
      if (post.storagePath) {
        try {
          await deleteObject(ref(storage, post.storagePath));
        } catch (err) {
          console.warn("Storage deletion failed or file not found:", err);
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
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)", margin: "0 0 0.3rem 0" }}>갤러리 관리</h1>
          <p style={{ fontSize: "0.96rem", color: "var(--text-muted)", margin: 0 }}>전체 갤러리 포스트 {posts.length}개</p>
        </div>
        <button
          onClick={fetchPosts}
          style={{
            padding: "8px 16px", borderRadius: "0", background: "var(--bg-tertiary)",
            border: "1px solid var(--border-primary)", color: "var(--text-secondary)",
            fontSize: "0.88rem", fontWeight: 600, cursor: "pointer"
          }}
        >
          갱신 🔄
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.88rem" }}>데이터를 불러오는 중입니다...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.88rem", background: "var(--bg-card)", borderRadius: "0", border: "1px dashed var(--border-primary)" }}>
          표시할 게시물이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {posts.map((post) => {
            const isBanned = post.reportCount >= 5;
            return (
              <div key={post.id} style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "1rem 1.2rem", background: isBanned ? "rgba(239,68,68,0.05)" : "var(--bg-card)",
                border: "1px solid",
                borderColor: isBanned ? "#ef4444" : "var(--border-primary)",
                borderRadius: "0",
                opacity: deleting === post.id ? 0.6 : 1, transition: "all 0.2s",
                boxShadow: isBanned ? "0 4px 12px rgba(239,68,68,0.1)" : "0 2px 4px rgba(0,0,0,0.02)"
              }}>
                {/* Thumbnail */}
                <div
                  onClick={() => setSelectedPost(post)}
                  style={{
                    width: "80px", height: "80px", flexShrink: 0, borderRadius: "0", overflow: "hidden",
                    border: "1px solid var(--border-primary)", cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <img src={post.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "1.04rem", fontWeight: 700, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px"
                  }}>
                    {post.title || "(제목 없음)"}
                    {isBanned && <span style={{ fontSize: "0.68rem", padding: "3px 8px", background: "#ef4444", color: "#fff", borderRadius: "0" }}>신고 누적</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.84rem", color: "var(--text-muted)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{post.displayName || "익명"}</span>
                    <span>|</span>
                    <span>{post.createdAt ? formatRelativeTime(post.createdAt) : "-"}</span>
                    <span>|</span>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <span>❤️ {post.likeCount || 0}</span>
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>🚨 {post.reportCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Labels/Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", width: "140px", justifyContent: "flex-end" }}>
                  {post.modelName && (
                    <span style={{ fontSize: "0.6rem", padding: "3px 6px", background: "rgba(99,102,241,0.1)", color: "var(--accent-indigo)", borderRadius: "0", fontWeight: 600 }}>
                      {post.modelName}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                   <a
                      href={post.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="원본 이미지 보기"
                      style={ACTION_ICON_BTN_STYLE}
                    >
                      🖼️
                    </a>
                  <button
                    onClick={() => deletePost(post)}
                    disabled={deleting === post.id}
                    style={{
                      padding: "8px 16px", borderRadius: "0", fontSize: "0.8rem", fontWeight: 800,
                      background: "rgba(239,68,68,0.08)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
                      transition: "all 0.2s"
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

      {/* Modal */}
      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "2rem"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card)", borderRadius: "0", maxWidth: "900px", width: "100%",
              maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border-primary)",
              position: "relative"
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPost(null)}
              style={{
                position: "absolute", top: "1rem", right: "1rem", background: "rgba(0,0,0,0.5)",
                border: "none", color: "#fff", fontSize: "1.5rem", width: "40px", height: "40px",
                cursor: "pointer", borderRadius: "0", zIndex: 10
              }}
            >
              ✕
            </button>

            {/* Image */}
            <div style={{ width: "100%", maxHeight: "500px", overflow: "hidden", background: "#000" }}>
              <img
                src={selectedPost.imageUrl}
                alt={selectedPost.title}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            {/* Content */}
            <div style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1rem" }}>
                {selectedPost.title || "(제목 없음)"}
              </h2>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem", fontSize: "0.95rem", color: "var(--text-muted)" }}>
                <span><strong>작성자:</strong> {selectedPost.displayName || "익명"}</span>
                <span><strong>작성일:</strong> {selectedPost.createdAt ? formatRelativeTime(selectedPost.createdAt) : "-"}</span>
                {selectedPost.modelName && <span><strong>모델:</strong> {selectedPost.modelName}</span>}
              </div>

              {selectedPost.description && (
                <div style={{
                  background: "var(--bg-tertiary)", padding: "1rem", borderRadius: "0",
                  marginBottom: "1rem", fontSize: "0.95rem", color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap"
                }}>
                  {selectedPost.description}
                </div>
              )}

              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                <span>❤️ 좋아요 {selectedPost.likeCount || 0}</span>
                <span style={{ color: "#ef4444", fontWeight: 700 }}>🚨 신고 {selectedPost.reportCount || 0}</span>
              </div>

              {selectedPost.prompt && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>프롬프트</div>
                  <div style={{
                    background: "var(--bg-tertiary)", padding: "1rem", borderRadius: "0",
                    fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap",
                    fontFamily: "monospace"
                  }}>
                    {selectedPost.prompt}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
