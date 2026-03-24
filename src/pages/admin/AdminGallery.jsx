import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { formatRelativeTime } from "../../utils";

import { 
  Image as ImageIcon, 
  TrashSimple, 
  ArrowClockwise, 
  ArrowsOut, 
  WarningCircle, 
  Heart,
  X,
  Code
} from "../../components/icons/PhosphorIcons";

export default function AdminGallery() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "galleryPosts"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const deletePost = async (post) => {
    if (!window.confirm("이 게시물을 정말 삭제하시겠습니까?")) return;
    setDeleting(post.id);
    try {
      if (post.storagePath) {
        try { await deleteObject(ref(storage, post.storagePath)); } catch (err) { console.warn(err); }
      }
      await deleteDoc(doc(db, "galleryPosts", post.id));
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) { alert("삭제 실패: " + e.message); }
    finally { setDeleting(null); }
  };

  const toggleSelect = (postId) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) newSet.delete(postId);
      else newSet.add(postId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length && posts.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(posts.map(p => p.id)));
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return alert("삭제할 게시물을 선택해주세요.");
    if (!window.confirm(`선택한 ${selectedIds.size}개의 게시물을 영구적으로 삭제하시겠습니까?`)) return;

    setBulkDeleting(true);
    try {
      const promises = Array.from(selectedIds).map(async (postId) => {
        const post = posts.find((p) => p.id === postId);
        if (post?.storagePath) {
          try { await deleteObject(ref(storage, post.storagePath)); } catch (err) { console.warn(err); }
        }
        await deleteDoc(doc(db, "galleryPosts", postId));
      });
      await Promise.all(promises);
      setPosts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (e) { alert("일괄 삭제 실패: " + e.message); }
    finally { setBulkDeleting(false); }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 950, color: "var(--text-primary)", letterSpacing: "-0.04em", marginBottom: "0.2rem" }}>갤러리 관리 센터</h1>
          <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>총 {posts.length}개의 AI 생성 아트워크가 등록되어 있습니다.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {selectedIds.size > 0 && (
            <button onClick={bulkDelete} disabled={bulkDeleting} style={{ padding: "12px 20px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "14px", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 16px -4px #ef444440" }}>
              <TrashSimple size={20} weight="bold" /> {bulkDeleting ? "삭제 중..." : `선택 항목 삭제 (${selectedIds.size})`}
            </button>
          )}
          <button onClick={fetchPosts} style={{ width: "45px", height: "45px", borderRadius: "14px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}>
            <ArrowClockwise size={22} weight="bold" />
          </button>
        </div>
      </header>

      {loading ? <div style={{ textAlign: "center", padding: "4rem", fontWeight: 800 }}>갤러리 시퀀스 로드 중...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Multi-Select Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "1rem 1.5rem", background: "var(--bg-secondary)", borderRadius: "16px", marginBottom: "1rem" }}>
            <input type="checkbox" checked={selectedIds.size === posts.length && posts.length > 0} onChange={toggleSelectAll} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
            <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "var(--text-primary)" }}>전체 항목 선택</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {posts.map((post) => {
              const isBanned = post.reportCount >= 5;
              const isSelected = selectedIds.has(post.id);
              return (
                <div key={post.id} style={{ 
                  background: "var(--bg-card)", borderRadius: "24px", border: isSelected ? "2px solid var(--accent-indigo)" : "1px solid var(--border-primary)",
                  overflow: "hidden", position: "relative", boxShadow: isSelected ? "var(--shadow-lg)" : "var(--shadow-sm)", transition: "background 0.3s, color 0.3s, border-color 0.3s, transform 0.3s, box-shadow 0.3s"
                }}>
                  {/* Select Checkbox at top-left */}
                  <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 5 }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(post.id)} style={{ width: "22px", height: "22px", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
                  </div>

                  {/* Image Thumb */}
                  <div onClick={() => setSelectedPost(post)} style={{ position: "relative", width: "100%", height: "240px", cursor: "pointer", overflow: "hidden", background: "#000" }}>
                    <img src={post.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }} 
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1.0)"}
                    />
                    {isBanned && <div style={{ position: "absolute", top: "12px", right: "12px", background: "#ef4444", color: "#fff", padding: "4px 10px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "4px" }}><WarningCircle size={14} weight="fill" /> 신고 누적</div>}
                  </div>

                  <div style={{ padding: "1.2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text-primary)", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{post.title || "제목 없음"}</h3>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, marginTop: "2px" }}>BY {post.displayName || "익명 계정"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.2rem", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Heart size={16} color="#f43f5e" weight="fill" /> {post.likeCount || 0}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><WarningCircle size={16} color="#ef4444" weight="fill" /> {post.reportCount || 0}</div>
                      <div style={{ marginLeft: "auto", fontSize: "0.7rem", opacity: 0.6 }}>{post.createdAt ? formatRelativeTime(post.createdAt) : ""}</div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setSelectedPost(post)} style={{ flex: 1, height: "40px", borderRadius: "12px", background: "var(--bg-secondary)", border: "none", color: "var(--text-primary)", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><ArrowsOut size={18} /> 상세보기</button>
                      <button onClick={() => deletePost(post)} disabled={deleting === post.id} style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#ef444415", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><TrashSimple size={20} weight="bold" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Detail Viewer */}
      {selectedPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }} onClick={() => setSelectedPost(null)}>
          <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "1000px", borderRadius: "32px", overflow: "hidden", border: "1px solid var(--border-primary)", display: "flex" }} onClick={e => e.stopPropagation()}>
            <div style={{ flex: 1.2, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", maxHeight: "80vh" }}>
              <img src={selectedPost.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1, padding: "2.5rem", position: "relative", overflowY: "auto", maxHeight: "80vh" }}>
              <button onClick={() => setSelectedPost(null)} style={{ position: "absolute", top: "20px", right: "20px", background: "var(--bg-secondary)", border: "none", borderRadius: "12px", width: "40px", height: "40px", cursor: "pointer", color: "var(--text-primary)" }}><X size={20} weight="bold" /></button>
              
              <div style={{ marginBottom: "2rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "var(--accent-indigo)", background: "rgba(99,102,241,0.1)", padding: "4px 10px", borderRadius: "8px", textTransform: "uppercase" }}>{selectedPost.modelName || "AI ARTWORK"}</span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 950, color: "var(--text-primary)", margin: "0.8rem 0", letterSpacing: "-0.04em" }}>{selectedPost.title || "제목 없음"}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.9rem" }}>{selectedPost.displayName} · {selectedPost.createdAt ? formatRelativeTime(selectedPost.createdAt) : ""}</div>
              </div>

              <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "20px" }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 900, marginBottom: "4px" }}>LIKE</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 950 }}>{selectedPost.likeCount || 0}</div>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 900, marginBottom: "4px" }}>REPORT</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "#ef4444" }}>{selectedPost.reportCount || 0}</div>
                </div>
              </div>

              {selectedPost.description && (
                <div style={{ marginBottom: "2rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.5rem" }}>설명</div>
                  <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{selectedPost.description}</p>
                </div>
              )}

              {selectedPost.prompt && (
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}><Code size={18} weight="bold" /> 생성 프롬프트</div>
                  <div style={{ background: "var(--bg-secondary)", padding: "1.2rem", borderRadius: "16px", fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "monospace", whiteSpace: "pre-wrap", border: "1px solid var(--border-primary)", lineHeight: 1.5 }}>{selectedPost.prompt}</div>
                </div>
              )}

              <button onClick={() => deletePost(selectedPost)} style={{ width: "100%", marginTop: "2rem", padding: "16px", borderRadius: "16px", border: "none", background: "#ef4444", color: "#fff", fontWeight: 900, fontSize: "1rem", cursor: "pointer" }}>이 게시물 즉시 삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
