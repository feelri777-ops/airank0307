import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection, query, orderBy, limit, startAfter, where,
  getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, arrayUnion, arrayRemove, serverTimestamp,
  increment, setDoc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../context/AuthContext";
import LoginModal from "../components/modals/LoginModal";

const PAGE_SIZE = 12;

// ── PNG tEXt 청크 파싱 (SD EXIF 자동 추출) ──────────────────
const parsePngPrompt = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const buf = new Uint8Array(e.target.result);
      let pos = 8; // PNG 시그니처 건너뜀
      while (pos < buf.length - 12) {
        const len = ((buf[pos] << 24) | (buf[pos+1] << 16) | (buf[pos+2] << 8) | buf[pos+3]) >>> 0;
        const type = String.fromCharCode(buf[pos+4], buf[pos+5], buf[pos+6], buf[pos+7]);
        if (type === "tEXt") {
          const data = buf.slice(pos + 8, pos + 8 + len);
          const nullIdx = data.indexOf(0);
          if (nullIdx !== -1) {
            const key = new TextDecoder().decode(data.slice(0, nullIdx));
            if (key.toLowerCase() === "parameters" || key.toLowerCase() === "prompt") {
              resolve(new TextDecoder().decode(data.slice(nullIdx + 1)));
              return;
            }
          }
        }
        if (type === "IEND") break;
        pos += 12 + len;
      }
    } catch { /* ignore */ }
    resolve(null);
  };
  reader.onerror = () => resolve(null);
  reader.readAsArrayBuffer(file);
});

// ── 이미지 → WebP 변환 ────────────────────────────────────────
const convertToWebP = (file) => new Promise((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
      resolve(webpFile);
    }, "image/webp", 0.88);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

const MODEL_LIST = [
  "Midjourney v6", "Midjourney v5", "DALL·E 3", "DALL·E 2",
  "Stable Diffusion XL", "Stable Diffusion 1.5", "Flux",
  "Leonardo AI", "Adobe Firefly", "Kling AI", "Ideogram", "직접 입력",
];

// ── 업로드 모달 ─────────────────────────────────────────────
const UploadModal = ({ onClose, onUploaded }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modelSelect, setModelSelect] = useState("");
  const [modelCustom, setModelCustom] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [visibility, setVisibility] = useState("public");
  const [source, setSource] = useState("self");
  const [sourceUrl, setSourceUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [exifExtracted, setExifExtracted] = useState(false);
  // 봇 방지
  const formOpenedAt = useRef(Date.now());
  const honeypotRef = useRef("");

  const modelName = modelSelect === "직접 입력" ? modelCustom : modelSelect;

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("이미지 파일만 업로드 가능합니다."); return; }
    if (f.size > 10 * 1024 * 1024) { setError("파일 크기는 10MB 이하여야 합니다."); return; }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // PNG EXIF 자동 추출
    if (f.type === "image/png") {
      const extracted = await parsePngPrompt(f);
      if (extracted && !prompt) {
        setPrompt(extracted);
        setExifExtracted(true);
      }
    }
  };

  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, "");
      if (tags.length >= 10) return;
      if (!tags.includes(newTag)) setTags((prev) => [...prev, newTag]);
      setTagInput("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ── 봇 방지 검사 ──
    // 1) honeypot: 숨겨진 필드에 값이 있으면 봇으로 판단
    if (honeypotRef.current) { setError("오류가 발생했습니다. 다시 시도해주세요."); return; }
    // 2) 최소 입력 시간: 폼 오픈 후 4초 이내 제출 차단
    if (Date.now() - formOpenedAt.current < 4000) { setError("잠시 후 다시 시도해주세요."); return; }
    // 3) localStorage 쿨다운: 마지막 업로드 후 30초 이내 재업로드 차단
    const lastUpload = parseInt(localStorage.getItem("lastGalleryUpload") || "0", 10);
    if (Date.now() - lastUpload < 30000) { setError("업로드 간격은 30초 이상이어야 합니다."); return; }

    if (!file) { setError("이미지를 선택해주세요."); return; }
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    if (source === "archive" && !sourceUrl.trim()) { setError("출처 URL을 입력해주세요."); return; }

    setUploading(true);
    setError("");
    try {
      // 4) 일일 업로드 횟수 제한 (24시간 내 최대 20개) — 복합 인덱스 불필요하게 uid만 조회 후 클라이언트 필터
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const countSnap = await getDocs(query(collection(db, "galleryPosts"), where("uid", "==", user.uid)));
      const recentCount = countSnap.docs.filter(d => {
        const t = d.data().createdAt;
        return t && (t.toMillis ? t.toMillis() : t.seconds * 1000) >= oneDayAgo;
      }).length;
      if (recentCount >= 20) { setError("24시간 내 업로드는 최대 20개까지 가능합니다."); setUploading(false); return; }

      const webpFile = await convertToWebP(file);
      const storagePath = `gallery/${user.uid}/${Date.now()}.webp`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, webpFile);
      await new Promise((resolve, reject) => {
        uploadTask.on("state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject, resolve
        );
      });
      const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
      await addDoc(collection(db, "galleryPosts"), {
        imageUrl, storagePath,
        uid: user.uid,
        displayName: user.displayName || user.email?.split("@")[0],
        photoURL: user.photoURL || "",
        title: title.trim(),
        description: description.trim(),
        modelName: modelName.trim(),
        prompt: prompt.trim(),
        tags,
        visibility,
        source,
        sourceUrl: source === "archive" ? sourceUrl.trim() : "",
        likeCount: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      });
      localStorage.setItem("lastGalleryUpload", String(Date.now()));
      onUploaded();
      onClose();
    } catch (err) {
      console.error(err);
      setError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const iStyle = {
    padding: "11px 14px", borderRadius: "var(--r-md)",
    border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: "0.92rem", width: "100%",
    boxSizing: "border-box", fontFamily: "var(--font-main)", outline: "none",
  };
  const labelStyle = { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "5px", display: "block" };
  const toggleBtn = (active) => ({
    padding: "7px 16px", borderRadius: "var(--r-lg)", fontSize: "0.82rem", fontWeight: 600,
    cursor: "pointer", border: "1px solid",
    borderColor: active ? "var(--accent-indigo,#6366f1)" : "var(--border-primary)",
    background: active ? "rgba(99,102,241,0.15)" : "var(--bg-secondary)",
    color: active ? "var(--accent-indigo,#6366f1)" : "var(--text-secondary)",
    transition: "all 0.15s",
  });

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        borderRadius: "var(--r-lg)", padding: "2rem", width: "100%", maxWidth: "520px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)", position: "relative",
        display: "flex", flexDirection: "column", gap: "1.1rem",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <button onClick={onClose} style={{
          position: "sticky", top: 0, alignSelf: "flex-end",
          background: "var(--bg-tertiary)", border: "none", borderRadius: "50%",
          width: "32px", height: "32px", cursor: "pointer", color: "var(--text-muted)",
          fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>✕</button>

        <h2 style={{ margin: "-2rem 0 0 0", fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
          이미지 업로드
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* 이미지 선택 */}
          <div>
            <label style={labelStyle}>이미지 *</label>
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "8px", border: "2px dashed var(--border-primary)", borderRadius: "var(--r-md)",
              padding: "1.25rem", cursor: "pointer", minHeight: "130px",
              background: "var(--bg-secondary)", overflow: "hidden",
            }}>
              {preview ? (
                <img src={preview} alt="preview" style={{ maxHeight: "180px", maxWidth: "100%", borderRadius: "var(--r-sm)", objectFit: "contain" }} />
              ) : (
                <>
                  <span style={{ fontSize: "2rem" }}>📁</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>
                    클릭하여 이미지 선택<br />
                    <span style={{ fontSize: "0.72rem" }}>JPG, PNG, WebP · 최대 10MB</span>
                  </span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            </label>
          </div>

          {/* 제목 */}
          <div>
            <label style={labelStyle}>제목 *</label>
            <input type="text" placeholder="작품 제목을 입력하세요" value={title}
              onChange={(e) => setTitle(e.target.value)} style={iStyle} />
          </div>

          {/* 작가 노트 */}
          <div>
            <label style={labelStyle}>작가 노트 (선택)</label>
            <textarea placeholder="작품에 대한 설명, 제작 과정, 남기고 싶은 말 등을 자유롭게 적어주세요." value={description}
              onChange={(e) => setDescription(e.target.value)} rows={3}
              style={{ ...iStyle, resize: "vertical" }} />
          </div>

          {/* AI 모델 */}
          <div>
            <label style={labelStyle}>사용한 AI 모델</label>
            <select value={modelSelect} onChange={(e) => setModelSelect(e.target.value)} style={{ ...iStyle, appearance: "none" }}>
              <option value="">선택하세요</option>
              {MODEL_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {modelSelect === "직접 입력" && (
              <input type="text" placeholder="모델명 직접 입력" value={modelCustom}
                onChange={(e) => setModelCustom(e.target.value)} style={{ ...iStyle, marginTop: "8px" }} />
            )}
          </div>

          {/* 프롬프트 */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                프롬프트
                {exifExtracted && <span style={{ marginLeft: "6px", fontSize: "0.7rem", color: "var(--accent-indigo,#6366f1)", fontWeight: 600 }}>✓ 자동 추출됨</span>}
              </label>
              {prompt && (
                <button type="button" onClick={() => navigator.clipboard.writeText(prompt)}
                  style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  복사
                </button>
              )}
            </div>
            <textarea placeholder="이미지 생성에 사용한 프롬프트" value={prompt}
              onChange={(e) => setPrompt(e.target.value)} rows={3}
              style={{ ...iStyle, resize: "vertical" }} />
          </div>

          {/* 태그 */}
          <div>
            <label style={labelStyle}>태그 (최대 10개 · Enter 또는 , 로 추가)</label>
            <input type="text" placeholder="#실사, #사이버펑크, #인물..." value={tagInput}
              onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag}
              style={iStyle} disabled={tags.length >= 10} />
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {tags.map((t) => (
                  <span key={t} style={{
                    padding: "3px 10px", borderRadius: "var(--r-md)", fontSize: "0.78rem",
                    background: "rgba(99,102,241,0.15)", color: "var(--accent-indigo,#6366f1)",
                    border: "1px solid rgba(99,102,241,0.4)", cursor: "pointer",
                  }} onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                    #{t} ✕
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 출처 */}
          <div>
            <label style={labelStyle}>출처 *</label>
            <div style={{ display: "flex", gap: "6px", marginBottom: source === "archive" ? "8px" : "0" }}>
              <button type="button" onClick={() => { setSource("self"); setSourceUrl(""); }} style={toggleBtn(source === "self")}>직접 제작</button>
              <button type="button" onClick={() => setSource("archive")} style={toggleBtn(source === "archive")}>출처 URL</button>
            </div>
            {source === "archive" && (
              <input
                type="url"
                placeholder="이미지 원본 출처 URL을 입력하세요"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                style={iStyle}
              />
            )}
          </div>

          {/* 공개 범위 */}
          <div>
            <label style={labelStyle}>공개 범위</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <button type="button" onClick={() => setVisibility("public")} style={toggleBtn(visibility === "public")}>전체 공개</button>
              <button type="button" onClick={() => setVisibility("private")} style={toggleBtn(visibility === "private")}>비공개</button>
            </div>
          </div>

          {/* 봇 방지 honeypot (숨김) */}
          <input
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => { honeypotRef.current = e.target.value; }}
            style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
          />

          {/* 프로그레스 + 에러 */}
          {uploading && (
            <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--r-sm)", overflow: "hidden", height: "6px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan))", transition: "width 0.3s" }} />
            </div>
          )}
          {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0, textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={uploading} style={{
            padding: "14px", borderRadius: "var(--r-md)",
            background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
            color: "#fff", border: "none", fontWeight: 700, fontSize: "1rem",
            cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1,
          }}>
            {uploading ? `업로드 중... ${progress}%` : "업로드"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── 라이트박스 ───────────────────────────────────────────────
const Lightbox = ({ post, onClose, onLike, onReport, user }) => {
  const liked = user && post.likedBy?.includes(user.uid);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!post.prompt) return;
    navigator.clipboard.writeText(post.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isMobile = window.innerWidth <= 768;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
        padding: isMobile ? "0" : "20px",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: "16px", right: "16px",
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
          width: "40px", height: "40px", color: "#fff", fontSize: "1.2rem",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10,
        }}
      >✕</button>

      {isMobile ? (
        /* ── 모바일: 전체화면 이미지 + 하단 정보 오버레이 ── */
        <>
          {/* 이미지: 전체 화면 채움 */}
          <img
            src={post.imageUrl}
            alt={post.modelName || "AI 이미지"}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "contain",
              zIndex: 0,
            }}
          />

          {/* 하단 그라디언트 + 정보 오버레이 */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.82) 40%, rgba(0,0,0,0.25) 72%, transparent 100%)",
              padding: "28px 16px 30px",
              maxHeight: "62vh",
              overflowY: "auto",
              display: "flex", flexDirection: "column", gap: "10px",
              color: "#fff",
              zIndex: 1,
            }}
          >
            {/* 작성자 + 좋아요 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div onClick={(e) => { e.stopPropagation(); if (post.uid) navigate(`/user/${post.uid}`); }} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: post.uid ? "pointer" : "default" }}>
                {post.photoURL && <img src={post.photoURL} alt="" width={26} height={26} style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{post.displayName}</div>
                  {post.createdAt?.toDate && <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>{post.createdAt.toDate().toLocaleDateString("ko-KR")}</div>}
                </div>
              </div>
              <button
                onClick={() => onLike(post)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
                  background: liked ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.2)",
                  border: "none", borderRadius: "var(--r-lg)", padding: "6px 14px",
                  color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
                }}
              >
                {liked ? "♥" : "♡"} {post.likeCount || 0}
              </button>
            </div>

            {/* 제목 */}
            {post.title && <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>{post.title}</h2>}

            {/* 작가 노트 */}
            {post.description && <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: "0.82rem", lineHeight: 1.55 }}>{post.description}</p>}

            {/* 배지: 모델명 + 출처 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {post.modelName && <span style={{ background: "rgba(99,102,241,0.85)", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-xs)" }}>{post.modelName}</span>}
              {post.source && <span style={{ background: "rgba(255,255,255,0.15)", fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--r-xs)" }}>{post.source === "self" ? "직접 제작" : "아카이빙"}</span>}
            </div>

            {/* 태그 */}
            {post.tags?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {post.tags.map((t) => <span key={t} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.12)", padding: "2px 7px", borderRadius: "var(--r-sm)" }}>#{t}</span>)}
              </div>
            )}

            {/* 프롬프트 */}
            {post.prompt && (
              <div>
                <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginBottom: "4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Prompt</div>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", lineHeight: 1.55, margin: 0 }}>{post.prompt}</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      background: copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.12)",
                      border: "none", borderRadius: "var(--r-md)", padding: "5px 12px",
                      color: "#fff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                    }}
                  >{copied ? "✓ 복사됨" : "📋 프롬프트 복사"}</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReport(post); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "var(--r-md)", padding: "5px 12px",
                      color: "#fca5a5", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                    }}
                  >🚨 신고</button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
      <div
        style={{
          display: "flex", gap: "24px", alignItems: "flex-start",
          maxWidth: "1100px", width: "100%", maxHeight: "90vh",
        }}
      >
        {/* 이미지 - 클릭 시 닫힘 */}
        <img
          src={post.imageUrl}
          alt={post.modelName || "AI 이미지"}
          onClick={onClose}
          style={{
            maxHeight: "85vh", maxWidth: "70%", objectFit: "contain",
            borderRadius: "var(--r-md)", flexShrink: 0, cursor: "pointer",
          }}
        />

        {/* 사이드 정보 - 클릭 시 닫히지 않음 */}
        <div onClick={(e) => e.stopPropagation()} style={{
          flex: 1, minWidth: "220px", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "14px",
          color: "#fff", paddingTop: "8px", overflowY: "auto", maxHeight: "85vh",
        }}>
          {/* 제목 */}
          {post.title && (
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>
              {post.title}
            </h2>
          )}

          {/* 작가 노트 */}
          {post.description && (
            <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.86rem", lineHeight: 1.6 }}>
              {post.description}
            </p>
          )}

          {/* 작성자 + 날짜 */}
          <div onClick={(e) => { e.stopPropagation(); if (post.uid) navigate(`/user/${post.uid}`); }} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: post.uid ? "pointer" : "default" }}>
            {post.photoURL && (
              <img src={post.photoURL} alt="" width={32} height={32}
                style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{post.displayName}</div>
              {post.createdAt?.toDate && (
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                  {post.createdAt.toDate().toLocaleDateString("ko-KR")}
                </div>
              )}
            </div>
          </div>

          {/* 배지 행: 모델명 + 출처 + 공개범위 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {post.modelName && (
              <span style={{ background: "rgba(99,102,241,0.85)", fontSize: "0.76rem", fontWeight: 700, padding: "3px 10px", borderRadius: "var(--r-sm)" }}>
                {post.modelName}
              </span>
            )}
            {post.source && (
              <span style={{ background: "rgba(255,255,255,0.15)", fontSize: "0.76rem", fontWeight: 600, padding: "3px 10px", borderRadius: "var(--r-sm)" }}>
                {post.source === "self" ? "직접 제작" : "아카이빙"}
              </span>
            )}
            {post.visibility && (
              <span style={{ background: post.visibility === "public" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)", fontSize: "0.76rem", fontWeight: 600, padding: "3px 10px", borderRadius: "var(--r-sm)" }}>
                {post.visibility === "public" ? "전체 공개" : "비공개"}
              </span>
            )}
          </div>

          {/* 태그 */}
          {post.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {post.tags.map((t) => (
                <span key={t} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "var(--r-md)" }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* 프롬프트 */}
          {post.prompt && (
            <div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginBottom: "5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prompt</div>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.84rem", lineHeight: 1.65, margin: 0 }}>
                {post.prompt}
              </p>
            </div>
          )}

          {/* 좋아요 */}
          <button
            onClick={() => onLike(post)}
            style={{
              display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-start",
              background: liked ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.15)",
              border: "none", borderRadius: "var(--r-lg)", padding: "8px 18px",
              color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {liked ? "♥" : "♡"} {post.likeCount || 0}
          </button>

          {/* 프롬프트 복사 */}
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

          {/* 신고 버튼 */}
          <button
            onClick={() => onReport(post)}
            style={{
              padding: "4px 10px", borderRadius: "var(--r-sm)", fontSize: "0.75rem",
              background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", cursor: "pointer", alignSelf: "flex-end", opacity: 0.7
            }}
          >🚨 신고</button>
        </div>
      </div>
      )}
    </div>
  );
};

// ── 수정 모달 ────────────────────────────────────────────────
const EditModal = ({ post, onClose, onSaved }) => {
  const [title, setTitle] = useState(post.title || "");
  const [description, setDescription] = useState(post.description || "");
  const [modelSelect, setModelSelect] = useState(
    MODEL_LIST.includes(post.modelName) ? post.modelName : post.modelName ? "직접 입력" : ""
  );
  const [modelCustom, setModelCustom] = useState(
    MODEL_LIST.includes(post.modelName) ? "" : post.modelName || ""
  );
  const [prompt, setPrompt] = useState(post.prompt || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(post.tags || []);
  const [visibility, setVisibility] = useState(post.visibility || "public");
  const [source, setSource] = useState(post.source || "self");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const modelName = modelSelect === "직접 입력" ? modelCustom : modelSelect;

  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/^#/, "");
      if (tags.length < 10 && !tags.includes(t)) setTags((p) => [...p, t]);
      setTagInput("");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "galleryPosts", post.id), {
        title: title.trim(),
        description: description.trim(),
        modelName: modelName.trim(),
        prompt: prompt.trim(),
        tags,
        visibility,
        source,
      });
      onSaved({ ...post, title: title.trim(), description: description.trim(), modelName: modelName.trim(), prompt: prompt.trim(), tags, visibility, source });
      onClose();
    } catch (err) {
      console.error(err);
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const iStyle = {
    padding: "10px 14px", borderRadius: "var(--r-md)",
    border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: "0.92rem", width: "100%",
    boxSizing: "border-box", fontFamily: "var(--font-main)", outline: "none",
  };
  const lStyle = { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "5px", display: "block" };
  const tBtn = (active) => ({
    padding: "7px 16px", borderRadius: "var(--r-lg)", fontSize: "0.82rem", fontWeight: 600,
    cursor: "pointer", border: "1px solid",
    borderColor: active ? "var(--accent-indigo,#6366f1)" : "var(--border-primary)",
    background: active ? "rgba(99,102,241,0.15)" : "var(--bg-secondary)",
    color: active ? "var(--accent-indigo,#6366f1)" : "var(--text-secondary)",
    transition: "all 0.15s",
  });

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        borderRadius: "var(--r-lg)", padding: "2rem", width: "100%", maxWidth: "480px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", gap: "1rem",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>게시물 수정</h2>
          <button onClick={onClose} style={{ background: "var(--bg-tertiary)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>✕</button>
        </div>
        {/* 이미지 미리보기 */}
        <img src={post.imageUrl} alt="" style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "var(--r-md)" }} />
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div><label style={lStyle}>제목 *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={iStyle} /></div>
          <div><label style={lStyle}>작가 노트 (선택)</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...iStyle, resize: "vertical" }} placeholder="작품 설명, 제작 과정 등을 자유롭게 적어주세요." /></div>
          <div>
            <label style={lStyle}>AI 모델</label>
            <select value={modelSelect} onChange={(e) => setModelSelect(e.target.value)} style={{ ...iStyle, appearance: "none" }}>
              <option value="">선택하세요</option>
              {MODEL_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {modelSelect === "직접 입력" && <input type="text" value={modelCustom} onChange={(e) => setModelCustom(e.target.value)} style={{ ...iStyle, marginTop: "8px" }} />}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ ...lStyle, margin: 0 }}>프롬프트</label>
              {prompt && <button type="button" onClick={() => navigator.clipboard.writeText(prompt)} style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>복사</button>}
            </div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} style={{ ...iStyle, resize: "vertical" }} />
          </div>
          <div>
            <label style={lStyle}>태그 (Enter / , 로 추가, 최대 10개)</label>
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} style={iStyle} disabled={tags.length >= 10} />
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {tags.map((t) => (
                  <span key={t} onClick={() => setTags((p) => p.filter((x) => x !== t))} style={{ padding: "3px 10px", borderRadius: "var(--r-md)", fontSize: "0.78rem", background: "rgba(99,102,241,0.15)", color: "var(--accent-indigo,#6366f1)", border: "1px solid rgba(99,102,241,0.4)", cursor: "pointer" }}>#{t} ✕</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div><label style={lStyle}>공개 범위</label><div style={{ display: "flex", gap: "6px" }}><button type="button" onClick={() => setVisibility("public")} style={tBtn(visibility === "public")}>전체 공개</button><button type="button" onClick={() => setVisibility("private")} style={tBtn(visibility === "private")}>비공개</button></div></div>
            <div><label style={lStyle}>출처</label><div style={{ display: "flex", gap: "6px" }}><button type="button" onClick={() => setSource("self")} style={tBtn(source === "self")}>직접 제작</button><button type="button" onClick={() => setSource("archive")} style={tBtn(source === "archive")}>아카이빙</button></div></div>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0, textAlign: "center" }}>{error}</p>}
          <button type="submit" disabled={saving} style={{ padding: "13px", borderRadius: "var(--r-md)", background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))", color: "#fff", border: "none", fontWeight: 700, fontSize: "1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── 이미지 카드 ─────────────────────────────────────────────
const GalleryCard = ({ post, onLike, onOpen, onEdit, onDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const liked = user && post.likedBy?.includes(user.uid);
  const isOwner = user && post.uid === user.uid;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        breakInside: "avoid", marginBottom: "3px",
        borderRadius: "var(--r-md)", overflow: "hidden",
        position: "relative", cursor: "pointer",
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
        transition: "box-shadow 0.2s, transform 0.2s",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      <img
        src={post.imageUrl} alt={post.modelName || "AI 이미지"}
        loading="lazy"
        style={{ width: "100%", display: "block", objectFit: "cover" }}
      />

      {/* 호버 오버레이 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.25s",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "14px",
      }}>
        {/* 모델명 */}
        {post.modelName && (
          <span style={{
            display: "inline-block", background: "rgba(99,102,241,0.85)", color: "#fff",
            fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: "var(--r-xs)",
            marginBottom: "6px", alignSelf: "flex-start",
          }}>
            {post.modelName}
          </span>
        )}

        {/* 프롬프트 */}
        {post.prompt && (
          <p style={{
            color: "rgba(255,255,255,0.9)", fontSize: "0.78rem",
            lineHeight: 1.4, margin: "0 0 8px 0",
            display: "-webkit-box", WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {post.prompt}
          </p>
        )}

        {/* 작성자 + 좋아요 + 수정/삭제 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={(e) => { e.stopPropagation(); if (post.uid) navigate(`/user/${post.uid}`); }} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: post.uid ? "pointer" : "default" }}>
            {post.photoURL && (
              <img src={post.photoURL} alt="" width={22} height={22}
                style={{ borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.4)" }} />
            )}
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", fontWeight: 600 }}>
              {post.displayName}
            </span>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {isOwner && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onEdit(post); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "var(--r-md)", padding: "4px 8px", color: "#fff", fontSize: "0.75rem", cursor: "pointer" }}>✏️</button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(post); }} style={{ background: "rgba(239,68,68,0.7)", border: "none", borderRadius: "var(--r-md)", padding: "4px 8px", color: "#fff", fontSize: "0.75rem", cursor: "pointer" }}>🗑️</button>
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onLike(post); }}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: liked ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.2)",
                border: "none", borderRadius: "var(--r-lg)", padding: "4px 10px",
                color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              {liked ? "♥" : "♡"} {post.likeCount || 0}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MODEL_OPTIONS = ["All", "Midjourney", "DALL·E 3", "Stable Diffusion XL", "Flux", "Leonardo AI", "Adobe Firefly", "Kling AI", "Ideogram"];
const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "oldest", label: "오래된순" },
];

const selectStyle = {
  padding: "8px 32px 8px 14px", borderRadius: "var(--r-lg)", fontSize: "0.85rem", fontWeight: 600,
  border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
  color: "var(--text-primary)", cursor: "pointer", outline: "none",
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
};

const chipStyle = (active) => ({
  padding: "5px 12px", borderRadius: "var(--r-lg)", fontSize: "0.82rem", fontWeight: 600,
  cursor: "pointer", border: "1px solid",
  borderColor: active ? "var(--accent-indigo, #6366f1)" : "var(--border-primary)",
  background: active ? "rgba(99,102,241,0.15)" : "var(--bg-secondary)",
  color: active ? "var(--accent-indigo, #6366f1)" : "var(--text-secondary)",
  transition: "all 0.15s", whiteSpace: "nowrap",
});

// ── 갤러리 메인 ─────────────────────────────────────────────
export default function Gallery() {
  const { user } = useAuth();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const sentinelRef = useRef(null);

  // 검색 / 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filterModel, setFilterModel] = useState("All");
  const [showTagDrop, setShowTagDrop] = useState(false);
  const searchWrapRef = useRef(null);

  // 로드된 posts에서 전체 태그 추출 (중복 제거, 가나다순)
  const allTags = useMemo(() => {
    const set = new Set();
    posts.forEach((p) => p.tags?.forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b, "ko"));
  }, [posts]);

  // 태그 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowTagDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getOrderBy = (sort) => {
    if (sort === "popular") return ["likeCount", "desc"];
    if (sort === "oldest") return ["createdAt", "asc"];
    return ["createdAt", "desc"];
  };

  const fetchPosts = useCallback(async (after = null, sort = sortBy) => {
    if (loading) return;
    setLoading(true);
    const [field, dir] = getOrderBy(sort);
    try {
      let q = query(collection(db, "galleryPosts"), orderBy(field, dir), limit(PAGE_SIZE));
      if (after) q = query(collection(db, "galleryPosts"), orderBy(field, dir), startAfter(after), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const newPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts((prev) => after ? [...prev, ...newPosts] : newPosts);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("갤러리 로드 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, sortBy]);

  // 초기 로드
  useEffect(() => { fetchPosts(); }, []); // eslint-disable-line

  // 프로필 드롭다운에서 좋아요 이미지 클릭 시 해당 게시물 라이트박스 열기
  useEffect(() => {
    const postId = location.state?.openPostId;
    if (!postId || !user) return;
    getDoc(doc(db, "galleryPosts", postId)).then((snap) => {
      if (snap.exists()) setSelectedPost({ id: snap.id, ...snap.data() });
    }).catch(() => {});
    // state 소비 (뒤로가기 시 재실행 방지)
    window.history.replaceState({}, "");
  }, [location.state, user]); // eslint-disable-line

  // 무한 스크롤
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loading) fetchPosts(lastDoc); },
      { threshold: 0.1 }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, lastDoc, fetchPosts]);

  const handleLike = async (post) => {
    if (!user) { alert("로그인 후 좋아요를 누를 수 있습니다."); return; }
    const liked = post.likedBy?.includes(user.uid);
    const ref2 = doc(db, "galleryPosts", post.id);
    try {
      await updateDoc(ref2, {
        likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likeCount: liked ? (post.likeCount || 1) - 1 : (post.likeCount || 0) + 1,
      });
      const updater = (p) => p.id === post.id ? {
        ...p,
        likedBy: liked ? p.likedBy.filter((id) => id !== user.uid) : [...(p.likedBy || []), user.uid],
        likeCount: liked ? (p.likeCount || 1) - 1 : (p.likeCount || 0) + 1,
      } : p;
      setPosts((prev) => prev.map(updater));
      // 라이트박스에도 즉시 반영
      setSelectedPost((prev) => prev?.id === post.id ? updater(prev) : prev);
    } catch (err) { console.error(err); }
  };

  const handleReport = async (post) => {
    if (!user) { alert("로그인 후 신고할 수 있습니다."); return; }
    if (user.uid === post.uid) { alert("본인의 게시물은 신고할 수 없습니다."); return; }
    if (!window.confirm("이 이미지를 부적절한 콘텐츠로 신고하시겠습니까?")) return;

    const reportRef = doc(db, "galleryReports", `${user.uid}_${post.id}`);
    const postRef = doc(db, "galleryPosts", post.id);

    try {
      const snap = await getDoc(reportRef);
      if (snap.exists()) {
        alert("이미 신고한 게시물입니다.");
        return;
      }

      await setDoc(reportRef, {
        uid: user.uid, postId: post.id,
        reportedAt: serverTimestamp()
      });
      await updateDoc(postRef, { reportCount: increment(1) });
      
      const updater = (p) => p.id === post.id ? { ...p, reportCount: (p.reportCount || 0) + 1 } : p;
      setPosts((prev) => prev.map(updater));
      if (selectedPost?.id === post.id) setSelectedPost((prev) => updater(prev));
      
      alert("신고가 접수되었습니다.");
    } catch (err) {
      console.error(err);
      alert("신고 중 오류가 발생했습니다.");
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setPosts([]);
    setLastDoc(null);
    setHasMore(true);
    fetchPosts(null, newSort);
  };

  const handleUploaded = () => {
    setPosts([]);
    setLastDoc(null);
    setHasMore(true);
    fetchPosts(null, sortBy);
  };

  const handleTagClick = (tag) => {
    const newQ = "#" + tag;
    setSearchQuery((prev) => prev === newQ ? "" : newQ);
    setShowTagDrop(false);
  };

  const handleEdit = (post) => setEditingPost(post);

  const handlePostSaved = (updatedPost) => {
    setPosts((prev) => prev.map((p) => p.id === updatedPost.id ? updatedPost : p));
    if (selectedPost?.id === updatedPost.id) setSelectedPost(updatedPost);
  };

  const handleDelete = async (post) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "galleryPosts", post.id));
      if (post.storagePath) {
        await deleteObject(ref(storage, post.storagePath)).catch(() => {});
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (selectedPost?.id === post.id) setSelectedPost(null);
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 클라이언트 필터링
  const filteredPosts = posts.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    let matchSearch;
    if (!q) {
      matchSearch = true;
    } else if (q.startsWith("#")) {
      // 태그 검색: #뒤 텍스트와 일치하는 태그
      const tagQ = q.slice(1);
      matchSearch = tagQ === "" || p.tags?.some((t) => t.toLowerCase().includes(tagQ));
    } else {
      matchSearch =
        p.prompt?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.displayName?.toLowerCase().includes(q) ||
        p.modelName?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q));
    }
    const matchModel = filterModel === "All" || p.modelName?.includes(filterModel);
    return matchSearch && matchModel;
  });

  // 비로그인 사용자 게이트
  if (!user) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🖼️</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem" }}>AI 갤러리</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.7 }}>
          갤러리는 가입 회원만 이용할 수 있어요.<br />
          로그인하고 다양한 AI 생성 이미지를 감상해보세요.
        </p>
        <button
          onClick={() => setShowLoginModal(true)}
          style={{
            padding: "14px 40px", borderRadius: "var(--r-md)",
            background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
            color: "#fff", border: "none", fontWeight: 700, fontSize: "1.05rem", cursor: "pointer",
          }}
        >
          로그인 / 회원가입
        </button>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "1rem 0" }}>

      {/* ── 헤더 ── */}
      <h1 style={{ textAlign: "center", margin: "0 0 1.5rem 0", fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", padding: "0 1rem" }}>
        AI 갤러리
      </h1>

      {/* ── 검색 + 업로드 ── */}
      <div style={{ maxWidth: "700px", margin: "0 auto 1rem", display: "flex", gap: "10px", padding: "0 1rem" }}>
        <div ref={searchWrapRef} style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            placeholder="검색... #태그, 프롬프트, 작성자, 모델"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (val.startsWith("#")) {
                setShowTagDrop(true);
              } else {
                setShowTagDrop(false);
              }
            }}
            onKeyDown={(e) => { if (e.key === "Escape") { setShowTagDrop(false); setSearchQuery(""); } }}
            onFocus={() => { if (searchQuery.startsWith("#")) setShowTagDrop(true); }}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 12px", borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", fontSize: "0.83rem", outline: "none",
            }}
          />
          {/* 태그 자동완성 드롭다운 */}
          {showTagDrop && (() => {
            const tagQ = searchQuery.slice(1).toLowerCase();
            const matched = allTags.filter((t) => tagQ === "" || t.toLowerCase().includes(tagQ));
            if (matched.length === 0) return null;
            return (
              <ul style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                borderRadius: "var(--r-md)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                listStyle: "none", margin: 0, padding: "6px",
                maxHeight: "220px", overflowY: "auto", zIndex: 200,
              }}>
                {matched.map((tag) => (
                  <li
                    key={tag}
                    onMouseDown={(e) => { e.preventDefault(); handleTagClick(tag); }}
                    style={{
                      padding: "8px 12px", borderRadius: "var(--r-sm)", cursor: "pointer",
                      fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)",
                      display: "flex", alignItems: "center", gap: "6px",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: "var(--accent-indigo, #6366f1)", fontWeight: 700 }}>#</span>
                    {tag}
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            padding: "8px 14px", borderRadius: "var(--r-sm)", flexShrink: 0,
            background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
            color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
          }}
        >+ 업로드</button>
      </div>

      {/* ── 정렬 + 태그 + 모델 필터 + 세이프서치 ── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center",
        justifyContent: "center", marginBottom: "1rem",
        paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-primary)",
        padding: "0 1rem 0.75rem",
      }}>
        {/* 정렬 드롭다운 */}
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          style={selectStyle}
        >
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* 모델 필터 드롭다운 */}
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          style={selectStyle}
        >
          {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m === "All" ? "전체 모델" : m}</option>)}
        </select>

      </div>

      {/* ── 메이슨리 그리드 ── */}
      {filteredPosts.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "6rem 1rem", color: "var(--text-muted)", fontSize: "1rem" }}>
          {posts.length === 0 ? "아직 올라온 작품이 없어요. 첫 번째로 공유해보세요!" : "검색 결과가 없어요."}
        </div>
      ) : (
        <div style={{ columns: "4 140px", gap: "3px" }}>
          {filteredPosts.map((post) => (
            <GalleryCard key={post.id} post={post} onLike={handleLike} onOpen={() => setSelectedPost(post)} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: "40px", marginTop: "16px" }} />
      {loading && (
        <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          불러오는 중...
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />}
      {editingPost && <EditModal post={editingPost} onClose={() => setEditingPost(null)} onSaved={handlePostSaved} />}
      {selectedPost && (
        <Lightbox post={selectedPost} user={user} onLike={handleLike} onReport={handleReport} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}
