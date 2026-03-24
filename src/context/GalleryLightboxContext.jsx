import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const GalleryLightboxContext = createContext(null);

export function GalleryLightboxProvider({ children }) {
  const { user } = useAuth();
  const [post, setPost] = useState(null);

  useEffect(() => {
    if (!post) return;
    const onKey = (e) => { if (e.key === "Escape") setPost(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [post]);

  const [copied, setCopied] = useState(false);

  const openLightbox = (p) => setPost(p);
  const closeLightbox = () => setPost(null);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    if (!post?.prompt) return;
    navigator.clipboard.writeText(post.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [post]);

  const handleLike = async () => {
    if (!user || !post) return;
    const liked = post.likedBy?.includes(user.uid);
    try {
      await updateDoc(doc(db, "galleryPosts", post.id), {
        likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likeCount: liked ? (post.likeCount || 1) - 1 : (post.likeCount || 0) + 1,
      });
      setPost((prev) => ({
        ...prev,
        likedBy: liked ? prev.likedBy.filter((id) => id !== user.uid) : [...(prev.likedBy || []), user.uid],
        likeCount: liked ? (prev.likeCount || 1) - 1 : (prev.likeCount || 0) + 1,
      }));
    } catch (err) { console.error(err); }
  };

  return (
    <GalleryLightboxContext.Provider value={{ openLightbox, closeLightbox }}>
      {children}
      {post && createPortal(
        (() => {
          const isMobile = window.innerWidth <= 768;
          return (
            <div
              onClick={closeLightbox}
              style={{
                position: "fixed", inset: 0, zIndex: 9998,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                display: "flex",
                alignItems: isMobile ? "flex-end" : "center",
                justifyContent: "center",
                padding: isMobile ? "0" : "20px",
              }}
            >
              <button
                onClick={closeLightbox}
                style={{
                  position: "fixed", top: "16px", right: "16px",
                  background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
                  width: "40px", height: "40px", color: "#fff", fontSize: "1.2rem",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
                }}
              >✕</button>

              {isMobile ? (
                /* ── 모바일: 전체화면 이미지 + 하단 정보 오버레이 ── */
                <>
                  <img
                    src={post.imageUrl}
                    alt={post.title || post.modelName || "AI 이미지"}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 0 }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.25) 72%, transparent 100%)",
                      padding: "28px 16px 30px",
                      maxHeight: "62vh", overflowY: "auto",
                      display: "flex", flexDirection: "column", gap: "10px",
                      color: "#fff", zIndex: 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {post.photoURL && <img src={post.photoURL} alt="" width={26} height={26} loading="lazy" style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{post.displayName}</div>
                          {post.createdAt?.toDate && <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>{post.createdAt.toDate().toLocaleDateString("ko-KR")}</div>}
                        </div>
                      </div>
                      {user && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLike(); }}
                          style={{
                            display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
                            background: post.likedBy?.includes(user.uid) ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.2)",
                            border: "none", borderRadius: "var(--r-lg)", padding: "6px 14px",
                            color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
                          }}
                        >{post.likedBy?.includes(user.uid) ? "♥" : "♡"} {post.likeCount || 0}</button>
                      )}
                    </div>

                    {post.title && <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>{post.title}</h2>}
                    {post.description && <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: "0.82rem", lineHeight: 1.55 }}>{post.description}</p>}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {post.modelName && <span style={{ background: "rgba(99,102,241,0.85)", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-xs)" }}>{post.modelName}</span>}
                      {post.source && <span style={{ background: "rgba(255,255,255,0.15)", fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--r-xs)" }}>{post.source === "self" ? "직접 제작" : "아카이빙"}</span>}
                    </div>

                    {post.tags?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {post.tags.map((t) => <span key={t} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.12)", padding: "2px 7px", borderRadius: "var(--r-sm)" }}>#{t}</span>)}
                      </div>
                    )}

                    {post.prompt && (
                      <div>
                        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginBottom: "4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Prompt</div>
                        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", lineHeight: 1.55, margin: 0 }}>{post.prompt}</p>
                        <button
                          onClick={handleCopy}
                          style={{
                            marginTop: "8px", display: "flex", alignItems: "center", gap: "5px",
                            background: copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.12)",
                            border: "none", borderRadius: "var(--r-md)", padding: "5px 12px",
                            color: "#fff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                          }}
                        >{copied ? "✓ 복사됨" : "📋 프롬프트 복사"}</button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ── PC 레이아웃 ── */
                <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", maxWidth: "1100px", width: "100%", maxHeight: "90vh" }}>
                  <img
                    src={post.imageUrl}
                    alt={post.title || post.modelName || "AI 이미지"}
                    onClick={closeLightbox}
                    style={{ maxHeight: "85vh", maxWidth: "70%", objectFit: "contain", borderRadius: "var(--r-md)", flexShrink: 0, cursor: "pointer" }}
                  />

                  <div onClick={(e) => e.stopPropagation()} style={{
                    flex: 1, minWidth: "220px", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "14px",
                    color: "#fff", paddingTop: "8px", overflowY: "auto", maxHeight: "85vh",
                  }}>
                    {post.title && <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>{post.title}</h2>}
                    {post.description && <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.86rem", lineHeight: 1.6 }}>{post.description}</p>}

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {post.photoURL && <img src={post.photoURL} alt="" width={32} height={32} loading="lazy" style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{post.displayName}</div>
                        {post.createdAt?.toDate && <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>{post.createdAt.toDate().toLocaleDateString("ko-KR")}</div>}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {post.modelName && <span style={{ background: "rgba(99,102,241,0.85)", fontSize: "0.76rem", fontWeight: 700, padding: "3px 10px", borderRadius: "var(--r-sm)" }}>{post.modelName}</span>}
                      {post.source && <span style={{ background: "rgba(255,255,255,0.15)", fontSize: "0.76rem", fontWeight: 600, padding: "3px 10px", borderRadius: "var(--r-sm)" }}>{post.source === "self" ? "직접 제작" : "아카이빙"}</span>}
                      {post.visibility && <span style={{ background: post.visibility === "public" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)", fontSize: "0.76rem", fontWeight: 600, padding: "3px 10px", borderRadius: "var(--r-sm)" }}>{post.visibility === "public" ? "전체 공개" : "비공개"}</span>}
                    </div>

                    {post.tags?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {post.tags.map((t) => <span key={t} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "var(--r-md)" }}>#{t}</span>)}
                      </div>
                    )}

                    {post.prompt && (
                      <div>
                        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginBottom: "5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prompt</div>
                        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.84rem", lineHeight: 1.65, margin: 0 }}>{post.prompt}</p>
                      </div>
                    )}

                    {user && (
                      <button
                        onClick={handleLike}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-start",
                          background: post.likedBy?.includes(user.uid) ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.15)",
                          border: "none", borderRadius: "var(--r-lg)", padding: "8px 18px",
                          color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                      >{post.likedBy?.includes(user.uid) ? "♥" : "♡"} {post.likeCount || 0}</button>
                    )}

                    {post.prompt && (
                      <button
                        onClick={handleCopy}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start",
                          background: copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--r-lg)", padding: "7px 16px",
                          color: "#fff", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                      >{copied ? "✓ 복사됨" : "📋 프롬프트 복사"}</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })(),
        document.body
      )}
    </GalleryLightboxContext.Provider>
  );
}

export const useGalleryLightbox = () => useContext(GalleryLightboxContext);
