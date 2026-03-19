import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, writeBatch, collectionGroup
} from "firebase/firestore";
import { ref as sRef, uploadBytes, getDownloadURL as storageDL } from "firebase/storage";
import { updateProfile, sendPasswordResetEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth, storage } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useGalleryLightbox } from "../context/GalleryLightboxContext";
import { useNews } from "../context/NewsContext";
import { useTools } from "../context/ToolContext";
import ThemeToggle from "../components/ui/ThemeToggle";
import Icon from "../components/ui/Icon";
import { useCommunity } from "../context/CommunityContext";
import { ArrowLeft, ArrowRight } from "../components/icons/PhosphorIcons";

// ── 섹션 메뉴 정의 ──────────────────────────────────────────
const MENU = [
  { id: "home",         icon: "house",       label: "대시보드 홈" },
  { id: "community",    icon: "chat-circle", label: "커뮤니티 활동" },
  { id: "library",      icon: "images",      label: "내 라이브러리" },
  { id: "liked",        icon: "heart",       label: "갤러리 좋아요" },
  { id: "news",         icon: "newspaper",   label: "뉴스 북마크" },
  { id: "toolBookmarks",icon: "bookmark",    label: "툴 북마크" },
];

// ── 이미지 압축 헬퍼 ────────────────────────────────────────
const compressAvatar = (file) => new Promise((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 300;
    const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      resolve(new File([blob], "avatar.webp", { type: "image/webp" }));
    }, "image/webp", 0.7);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

// ── 작은 갤러리 카드 ─────────────────────────────────────────
const ThumbCard = ({ post, onClick, isMobile }) => (
  <div
    onClick={onClick}
    style={{
      borderRadius: "var(--r-md)", overflow: "hidden", cursor: "pointer",
      border: "1px solid var(--border-primary)",
      background: "var(--bg-card)",
      transition: "transform 0.15s, box-shadow 0.15s",
      breakInside: "avoid", marginBottom: "10px",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
  >
    <img
      src={post.imageUrl}
      alt={post.title || ""}
      loading="lazy"
      style={{ width: "100%", display: "block", maxHeight: isMobile ? "130px" : "180px", objectFit: "cover" }}
    />
    <div style={{ padding: "6px 10px" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.title || "(제목 없음)"}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>♥ {post.likeCount || 0}</div>
    </div>
  </div>
);

// ── 통계 카드 ────────────────────────────────────────────────
const StatCard = ({ label, value, icon }) => (
  <div style={{
    background: "var(--bg-card)", border: "1px solid var(--border-primary)",
    borderRadius: "var(--r-md)", padding: "16px 20px",
    display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 120px",
  }}>
    <Icon name={icon} size={22} />
    <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value ?? "—"}</span>
    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
  </div>
);

// ── 아바타 스타일 10종 ───────────────────────────────────────
const AVATAR_STYLES = [
  { label: "🤖 로봇",     style: "bottts",      seeds: ["Felix","Sasha","Milo","Luna","Zara"] },
  { label: "🧝 동화풍",   style: "adventurer",  seeds: ["Alice","Bruno","Clara","Dante","Elena"] },
  { label: "👤 비트모지", style: "avataaars",   seeds: ["Alex","Jordan","Sam","Taylor","Casey"] },
  { label: "🎨 일러스트", style: "lorelei",     seeds: ["Rose","Ivy","Oak","Maple","Cedar"] },
  { label: "🟦 픽셀아트", style: "pixel-art",   seeds: ["Pixel1","Pixel2","Pixel3","Pixel4","Pixel5"] },
  { label: "😀 이모지",   style: "fun-emoji",   seeds: ["Emoji1","Emoji2","Emoji3","Emoji4","Emoji5"] },
  { label: "🧑 사람",     style: "open-peeps",  seeds: ["Peep1","Peep2","Peep3","Peep4","Peep5"] },
  { label: "🌸 캐릭터",   style: "notionists",  seeds: ["Nova","Iris","Blaze","Skye","River"] },
];
const dicebearUrl = (style, seed) => `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
const randomSeed = () => Math.random().toString(36).substring(2, 10);

// ── 홈 섹션 ──────────────────────────────────────────────────
const HomeSection = ({ user, stats, isMobile, onLogout, onDeleteConfirm }) => {
  const { userData, updateUserData } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(userData?.displayName || user.displayName || "");
  const [saving, setSaving] = useState(false);
  const [nickError, setNickError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarTab, setAvatarTab] = useState(0);
  const [currentPhotoURL, setCurrentPhotoURL] = useState(
    user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName || "default"}`
  );

  // userData 로드 시 닉네임 초기값 동기화
  useEffect(() => {
    if (userData?.displayName && !editingName) {
      setNewName(userData.displayName);
    }
  }, [userData?.displayName, editingName]);

  // ── 아바타: 로봇 선택 ──
  const handleSelectAvatar = async (url) => {
    setSavingAvatar(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: url });
      await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });
      setCurrentPhotoURL(url);
      setShowAvatarPicker(false);
    } catch (e) { console.error(e); }
    finally { setSavingAvatar(false); }
  };

  // ── 아바타: 개인 사진 업로드 ──
  const handleAvatarFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setSavingAvatar(true);
    try {
      const compressed = await compressAvatar(f);
      const storageRef = sRef(storage, `avatars/${user.uid}.webp`);
      await uploadBytes(storageRef, compressed);
      const url = await storageDL(storageRef);
      await updateProfile(auth.currentUser, { photoURL: url });
      await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });
      setCurrentPhotoURL(url);
      setShowAvatarPicker(false);
    } catch (e) { console.error(e); }
    finally { setSavingAvatar(false); }
  };

  // ── 닉네임 저장 (중복확인 + 일괄 업데이트) ──
  const handleSaveName = async () => {
    const trimmed = newName.trim();
    // userData.displayName과 비교하여 이미 저장된 이름과 같으면 바로 종료
    // (Retrying 시 Auth는 업데이트되었으나 Firestore는 아닐 수 있으므로 userData 기준이 안전)
    if (!trimmed || trimmed === userData?.displayName) {
      setEditingName(false);
      setNewName(userData?.displayName || user?.displayName || "");
      return;
    }
    // 닉네임 형식 검사 (2~12자, 한글/영문/숫자)
    if (!/^[가-힣a-zA-Z0-9]{2,12}$/.test(trimmed)) {
      setNickError("2~12자, 한글·영문·숫자만 사용 가능합니다.");
      return;
    }
    setSaving(true);
    setNickError("");
    try {
      // 중복 확인
      const dupSnap = await getDocs(query(collection(db, "users"), where("displayName", "==", trimmed)));
      if (!dupSnap.empty && dupSnap.docs.some(d => d.id !== user.uid)) {
        setNickError("이미 사용 중인 닉네임입니다.");
        setSaving(false);
        return;
      }
      // 1. 핵심 프로필 업데이트 (인증 정보 + Firestore 유저 문서)
      await updateProfile(auth.currentUser, { displayName: trimmed });
      
      const currentHistory = Array.isArray(userData?.nicknameHistory) ? userData.nicknameHistory : [];
      const oldName = userData?.displayName || user.displayName;
      const newHistory = (oldName && oldName !== trimmed && !currentHistory.includes(oldName))
        ? [...currentHistory, oldName]
        : currentHistory;

      await updateUserData(user.uid, { 
        displayName: trimmed,
        nicknameHistory: newHistory 
      });

      // 2. 관련 게시글/댓글 일괄 업데이트 (백그라운드 처리 느낌으로 진행)
      try {
        const [gpSnap, cpSnap] = await Promise.all([
          getDocs(query(collection(db, "galleryPosts"), where("uid", "==", user.uid))),
          getDocs(query(collection(db, "communityPosts"), where("uid", "==", user.uid))),
        ]);

        let ccDocs = [];
        try {
          // collectionGroup은 인덱스가 없으면 에러가 발생할 수 있으므로 개별 처리
          const ccSnap = await getDocs(query(collectionGroup(db, "comments"), where("uid", "==", user.uid)));
          ccDocs = ccSnap.docs;
        } catch (ce) {
          console.warn("댓글 인덱스 미설정 등으로 인해 댓글 닉네임 업데이트는 건너뜁니다.", ce);
        }

        const allDocs = [...gpSnap.docs, ...cpSnap.docs, ...ccDocs];
        if (allDocs.length > 0) {
          const CHUNK = 450;
          for (let i = 0; i < allDocs.length; i += CHUNK) {
            const batch = writeBatch(db);
            allDocs.slice(i, i + CHUNK).forEach(d => batch.update(d.ref, { displayName: trimmed }));
            await batch.commit();
          }
        }
      } catch (be) {
        console.error("일괄 업데이트 중 일부 오류 발생:", be);
        // 게시글 업데이트 실패 시에도 이미 프로필은 변경되었으므로 사용자에게 알림만 남김
      }

      setNickError("");
      setEditingName(false);
    } catch (e) {
      console.error(e);
      setNickError("저장 중 오류가 발생했습니다.");
    } finally { setSaving(false); }
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetMsg("비밀번호 재설정 메일을 발송했습니다.");
      setTimeout(() => setResetMsg(""), 4000);
    } catch (e) { setResetMsg("오류가 발생했습니다."); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 프로필 카드 */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        borderRadius: "var(--r-lg)", padding: isMobile ? "20px 16px" : "24px",
        display: "flex", gap: "16px", alignItems: "flex-start",
        flexDirection: isMobile ? "column" : "row", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {/* 아바타 */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={currentPhotoURL}
              alt={user.displayName}
              width={isMobile ? 60 : 76} height={isMobile ? 60 : 76}
              onClick={() => setShowAvatarPicker(true)}
              style={{ borderRadius: "50%", border: "3px solid var(--border-primary)", cursor: "pointer", display: "block", transition: "opacity 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            />
            <div onClick={() => setShowAvatarPicker(true)} style={{
              position: "absolute", bottom: 0, right: 0,
              background: "var(--accent-indigo, #6366f1)", borderRadius: "50%",
              width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", color: "#fff", cursor: "pointer", border: "2px solid var(--bg-card)",
            }}>✏️</div>
          </div>
          {isMobile && (
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>{user.displayName}</div>
              {user.providerData.some(p => p.providerId === "password") && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{user.email}</div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px", width: isMobile ? "100%" : "auto" }}>
          {/* 닉네임 */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>닉네임</div>
            {editingName ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setNickError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNickError(""); } }}
                    placeholder="2~12자, 한글·영문·숫자"
                    style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", flex: 1, minWidth: "120px", border: "1px solid var(--border-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none" }}
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={saving} style={btnStyle("indigo")}>{saving ? "저장 중..." : "저장"}</button>
                  <button onClick={() => { setEditingName(false); setNickError(""); }} style={btnStyle("ghost")}>취소</button>
                </div>
                {nickError && <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>{nickError}</span>}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>{user.displayName}</span>
                <button onClick={() => setEditingName(true)} style={btnStyle("ghost", "sm")}>✏️ 수정</button>
              </div>
            )}
          </div>
          {!isMobile && user.providerData.some(p => p.providerId === "password") && (
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>이메일</div>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{user.email}</span>
            </div>
          )}
          {user.providerData.some(p => p.providerId === "password") && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={handlePasswordReset} style={btnStyle("ghost", "sm")}>🔑 비밀번호 재설정 메일 발송</button>
              {resetMsg && <span style={{ fontSize: "0.78rem", color: "var(--accent-indigo, #6366f1)", fontWeight: 600 }}>{resetMsg}</span>}
            </div>
          )}
        </div>
      </div>

      {/* 활동 요약 카드 */}
      <div>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>활동 요약</div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <StatCard label="내 작품 수" value={stats.myPosts} icon="images" />
          <StatCard label="받은 좋아요" value={stats.receivedLikes} icon="heart" />
          <StatCard label="내 북마크" value={stats.bookmarks} icon="bookmark" />
        </div>
      </div>

      {/* 로그아웃 / 회원탈퇴 */}
      <div style={{ paddingTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={onLogout} style={{ ...btnStyle("ghost"), fontSize: "0.84rem" }}>🚪 로그아웃</button>
        <button onClick={onDeleteConfirm} style={{ ...btnStyle("danger"), fontSize: "0.84rem" }}>⚠ 회원탈퇴</button>
      </div>

      {/* 아바타 선택 모달 */}
      {showAvatarPicker && (
        <div onClick={() => setShowAvatarPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: "var(--r-lg)", padding: "20px", width: "100%", maxWidth: "440px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>프로필 사진 변경</h3>

            {/* 개인 사진 업로드 */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--r-md)", border: "1px solid var(--border-primary)" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "7px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-primary)", background: "var(--bg-card)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>
                📷 내 사진 업로드
                <input type="file" accept="image/*" onChange={handleAvatarFileChange} style={{ display: "none" }} />
              </label>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>자동 압축 · WebP 변환</span>
            </div>

            {/* 스타일 탭 */}
            <div style={{ overflowX: "auto", scrollbarWidth: "none" }}>
              <div style={{ display: "flex", gap: "6px", paddingBottom: "2px", minWidth: "max-content" }}>
                {AVATAR_STYLES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setAvatarTab(i)}
                    style={{
                      padding: "5px 10px", borderRadius: "var(--r-lg)", border: "1px solid",
                      borderColor: avatarTab === i ? "var(--accent-indigo, #6366f1)" : "var(--border-primary)",
                      background: avatarTab === i ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
                      color: avatarTab === i ? "var(--accent-indigo, #6366f1)" : "var(--text-muted)",
                      fontSize: "0.75rem", fontWeight: avatarTab === i ? 700 : 500,
                      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 아바타 그리드: 5개 프리셋 + 랜덤 */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              {AVATAR_STYLES[avatarTab].seeds.map((seed, i) => {
                const url = dicebearUrl(AVATAR_STYLES[avatarTab].style, seed);
                return (
                  <button key={i} onClick={() => handleSelectAvatar(url)} disabled={savingAvatar}
                    style={{ background: currentPhotoURL === url ? "rgba(99,102,241,0.18)" : "var(--bg-secondary)", border: currentPhotoURL === url ? "2px solid var(--accent-indigo, #6366f1)" : "2px solid var(--border-primary)", borderRadius: "50%", padding: "3px", cursor: "pointer", transition: "all 0.15s", opacity: savingAvatar ? 0.6 : 1 }}>
                    <img src={url} alt={`avatar-${i}`} width={54} height={54} style={{ borderRadius: "50%", display: "block" }} />
                  </button>
                );
              })}
              {/* 랜덤 버튼 */}
              <button
                onClick={() => handleSelectAvatar(dicebearUrl(AVATAR_STYLES[avatarTab].style, randomSeed()))}
                disabled={savingAvatar}
                style={{ width: "60px", height: "60px", borderRadius: "50%", border: "2px dashed var(--border-primary)", background: "var(--bg-secondary)", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1px", opacity: savingAvatar ? 0.6 : 1, transition: "all 0.15s" }}
                title="랜덤 생성"
              >
                <span>🎲</span>
                <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 600 }}>랜덤</span>
              </button>
            </div>

            {savingAvatar && <p style={{ margin: 0, textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>저장 중...</p>}
          </div>
        </div>
      )}
    </div>
  );
};

// ── 라이브러리 섹션 ──────────────────────────────────────────
const LibrarySection = ({ user, isMobile }) => {
  const [posts, setPosts] = useState(null);
  const { openLightbox } = useGalleryLightbox();

  useEffect(() => {
    if (posts !== null) return;
    getDocs(query(collection(db, "galleryPosts"), where("uid", "==", user.uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPosts(list);
      })
      .catch(() => setPosts([]));
  }, [user.uid]); // eslint-disable-line

  if (posts === null) return <LoadingSpinner />;

  return (
    <div>
      <SectionHeader title="내 라이브러리" desc={`업로드한 작품 ${posts.length}개`} />
      {posts.length === 0 ? (
        <Empty msg="아직 업로드한 작품이 없어요." link="/gallery" linkText="갤러리에서 업로드하기" />
      ) : (
        <div style={{ columns: isMobile ? "2 120px" : "3 140px", gap: "10px" }}>
          {posts.map((p) => <ThumbCard key={p.id} post={p} isMobile={isMobile} onClick={() => openLightbox(p)} />)}
        </div>
      )}
    </div>
  );
};

// ── 갤러리 좋아요 섹션 ──────────────────────────────────────
const LikedSection = ({ user, isMobile }) => {
  const [posts, setPosts] = useState(null);
  const { openLightbox } = useGalleryLightbox();

  useEffect(() => {
    if (posts !== null) return;
    getDocs(query(collection(db, "galleryPosts"), where("likedBy", "array-contains", user.uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPosts(list);
      })
      .catch(() => setPosts([]));
  }, [user.uid]); // eslint-disable-line

  if (posts === null) return <LoadingSpinner />;

  return (
    <div>
      <SectionHeader title="갤러리 좋아요" desc={`${posts.length}개`} />
      {posts.length === 0 ? (
        <Empty msg="좋아요한 작품이 없어요." link="/gallery" linkText="갤러리 둘러보기" />
      ) : (
        <div style={{ columns: isMobile ? "2 120px" : "3 140px", gap: "10px" }}>
          {posts.map((p) => <ThumbCard key={p.id} post={p} isMobile={isMobile} onClick={() => openLightbox(p)} />)}
        </div>
      )}
    </div>
  );
};

// ── 뉴스 북마크 섹션 ────────────────────────────────────────
const NewsBookmarkSection = ({ newsBookmarks, toggleNewsBookmark, isMobile }) => {
  return (
    <div>
      <SectionHeader title="뉴스 북마크" desc={`${newsBookmarks.length}개`} />
      {newsBookmarks.length === 0 ? (
        <Empty msg="북마크한 뉴스가 없어요." link="/news" linkText="뉴스 보러가기" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {newsBookmarks.map((b) => (
            <div
              key={b.id}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                borderRadius: "var(--r-md)", padding: isMobile ? "14px 14px" : "16px 18px",
                display: "flex", gap: "12px", alignItems: "flex-start",
              }}
            >
              <a
                href={b.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: isMobile ? "0.86rem" : "0.9rem", color: "var(--text-primary)", textDecoration: "none", lineHeight: 1.45, display: "block" }}
              >
                {b.title}
              </a>
              <button
                onClick={() => toggleNewsBookmark(b)}
                title="북마크 삭제"
                style={{
                  flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                  color: "#ef4444", fontSize: "1rem", padding: "2px 4px",
                  borderRadius: "var(--r-xs)", lineHeight: 1,
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 툴 북마크 섹션 ──────────────────────────────────────────
const ToolBookmarkSection = ({ user, isMobile }) => {
  const { tools, openToolDetail } = useTools();
  const [bookmarks, setBookmarks] = useState(null);

  useEffect(() => {
    if (bookmarks !== null) return;
    getDocs(query(collection(db, "bookmarks"), where("uid", "==", user.uid)))
      .then((snap) => setBookmarks(snap.docs.map((d) => d.data())))
      .catch(() => setBookmarks([]));
  }, [user.uid]); // eslint-disable-line

  const handleOpen = (toolId) => {
    if (!tools || !tools.length) return;
    const sorted = [...tools].sort((a, b) => (b.score || 0) - (a.score || 0));
    const idx = sorted.findIndex((t) => t.id === toolId);
    if (idx !== -1) openToolDetail(sorted[idx], idx + 1);
  };

  if (bookmarks === null) return <LoadingSpinner />;

  return (
    <div>
      <SectionHeader title="툴 북마크" desc={`${bookmarks.length}개`} />
      {bookmarks.length === 0 ? (
        <Empty msg="북마크한 AI 도구가 없어요." link="/" linkText="AI 도구 둘러보기" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {bookmarks.map((b, i) => {
            const tool = tools?.find((t) => t.id === b.toolId);
            const name = tool?.name || b.toolName || b.toolId || "AI 도구";
            const desc = tool?.description || b.description || "";
            const category = tool?.category || b.category || "";
            return (
              <div
                key={i}
                onClick={() => handleOpen(b.toolId)}
                style={{
                  background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                  borderRadius: "var(--r-md)", padding: isMobile ? "14px" : "16px 18px",
                  display: "flex", gap: "12px", alignItems: "center",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: isMobile ? "0.88rem" : "0.92rem", color: "var(--text-primary)", marginBottom: "2px" }}>{name}</div>
                  {desc && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</div>}
                </div>
                {category && (
                  <span style={{ flexShrink: 0, fontSize: "0.7rem", fontWeight: 600, color: "var(--accent-indigo, #6366f1)", background: "rgba(99,102,241,0.1)", padding: "3px 8px", borderRadius: "var(--r-lg)" }}>
                    {category}
                  </span>
                )}
                <span style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: "0.8rem", display: "flex", alignItems: "center" }}><ArrowRight size={14} /></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 커뮤니티 활동 섹션 ──────────────────────────────────────
const CommunitySection = ({ user, isMobile }) => {
  const [tab, setTab] = useState("posts");
  const [myPosts, setMyPosts] = useState(null);
  const [myComments, setMyComments] = useState(null);
  const navigate = useNavigate();
  const { boards } = useCommunity();

  const loadPosts = useCallback(() => {
    if (myPosts !== null) return;
    getDocs(query(collection(db, "communityPosts"), where("uid", "==", user.uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMyPosts(list);
      })
      .catch(() => setMyPosts([]));
  }, [user.uid, myPosts]);

  const loadComments = useCallback(() => {
    if (myComments !== null) return;
    getDocs(query(collectionGroup(db, "comments"), where("uid", "==", user.uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMyComments(list);
      })
      .catch(() => setMyComments([]));
  }, [user.uid, myComments]);

  useEffect(() => { if (tab === "posts") loadPosts(); else loadComments(); }, [tab]); // eslint-disable-line

  const tabStyle = (active) => ({
    padding: isMobile ? "7px 16px" : "8px 20px",
    borderRadius: "var(--r-lg)", fontSize: "0.83rem", fontWeight: 700,
    cursor: "pointer", border: "1px solid",
    borderColor: active ? "var(--accent-indigo, #6366f1)" : "var(--border-primary)",
    background: active ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
    color: active ? "var(--accent-indigo, #6366f1)" : "var(--text-secondary)",
    transition: "all 0.15s",
  });

  return (
    <div>
      <SectionHeader title="커뮤니티 활동" />
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setTab("posts")} style={tabStyle(tab === "posts")}>내 게시글</button>
        <button onClick={() => setTab("comments")} style={tabStyle(tab === "comments")}>내 댓글</button>
      </div>

      {tab === "posts" && (
        myPosts === null ? <LoadingSpinner /> :
        myPosts.length === 0 ? <Empty msg="작성한 게시글이 없어요." link="/community" linkText="커뮤니티 가기" /> :
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {myPosts.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/community/${p.board}/${p.id}`)}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                borderRadius: "var(--r-md)", padding: isMobile ? "12px 14px" : "14px 16px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: isMobile ? "0.88rem" : "0.92rem", color: "var(--text-primary)" }}>{p.title || "(제목 없음)"}</span>
                {p.board && (() => {
                  const board = boards.find(b => b.id === p.board);
                  return board ? (
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, flexShrink: 0,
                      padding: "2px 8px", borderRadius: "var(--r-lg)",
                      background: `${board.color}18`, color: board.color,
                      border: `1px solid ${board.color}30`,
                    }}>
                      {board.name}
                    </span>
                  ) : null;
                })()}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {p.createdAt?.toDate?.().toLocaleDateString("ko-KR")} · 댓글 {p.commentCount || 0} · 조회 {p.views || 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "comments" && (
        myComments === null ? <LoadingSpinner /> :
        myComments.length === 0 ? <Empty msg="작성한 댓글이 없어요." /> :
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {myComments.map((c) => (
            <div
              key={c.id}
              onClick={() => c.postId && navigate(`/community/${c.postId}`)}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                borderRadius: "var(--r-md)", padding: isMobile ? "12px 14px" : "14px 16px",
                cursor: c.postId ? "pointer" : "default",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (c.postId) e.currentTarget.style.background = "var(--bg-secondary)"; }}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
            >
              <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: "4px", lineHeight: 1.5 }}>{c.content}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {c.createdAt?.toDate?.().toLocaleDateString("ko-KR")}
                {c.postTitle && <> · <span style={{ color: "var(--accent-indigo, #6366f1)" }}>{c.postTitle}</span></>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 공통 헬퍼 컴포넌트 ──────────────────────────────────────
const SectionHeader = ({ title, desc }) => (
  <div style={{ marginBottom: "18px" }}>
    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>{title}</h2>
    {desc && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>{desc}</div>}
  </div>
);

const LoadingSpinner = () => (
  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>불러오는 중...</div>
);

const Empty = ({ msg, link, linkText }) => (
  <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
    <div style={{ fontSize: "0.9rem", marginBottom: "12px" }}>{msg}</div>
    {link && <Link to={link} style={{ color: "var(--accent-indigo, #6366f1)", fontWeight: 700, fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>{linkText} <ArrowRight size={14} /></Link>}
  </div>
);

const btnStyle = (variant, size = "md") => {
  const base = {
    border: "none", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 600,
    padding: size === "sm" ? "4px 10px" : "8px 16px",
    fontSize: size === "sm" ? "0.78rem" : "0.88rem",
    transition: "all 0.15s",
  };
  if (variant === "indigo") return { ...base, background: "var(--accent-indigo, #6366f1)", color: "#fff" };
  if (variant === "danger") return { ...base, background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" };
  return { ...base, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)" };
};

// ── 대시보드 메인 ────────────────────────────────────────────
export default function Dashboard() {
  const { user, userData, updateUserData, logout } = useAuth();
  const { newsBookmarks, toggleNewsBookmark } = useNews();
  const { tools, openToolDetail } = useTools();
  const navigate = useNavigate();
  const location = useLocation();
  const [section, setSection] = useState(() => location.state?.section || "home");
  const [stats, setStats] = useState({ myPosts: null, receivedLikes: null, bookmarks: null });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 통계 로드 및 설정 여부 확인
  useEffect(() => {
    if (!user) return;

    // 설정이 안 된 사용자라면 메인으로 보내거나 설정 유도
    if (userData && !userData.setupCompleted) {
       // navigate("/", { state: { openSetup: true } }); 
       // 또는 대시보드 내에서 설정 섹션을 강제로 보여줄 수도 있습니다.
    }

    getDocs(query(collection(db, "galleryPosts"), where("uid", "==", user.uid)))
      .then((snap) => {
        const posts = snap.docs.map((d) => d.data());
        setStats((prev) => ({
          ...prev,
          myPosts: posts.length,
          receivedLikes: posts.reduce((acc, p) => acc + (p.likeCount || 0), 0),
        }));
      }).catch(() => {});
    getDocs(query(collection(db, "bookmarks"), where("uid", "==", user.uid)))
      .then((snap) => setStats((prev) => ({ ...prev, bookmarks: snap.size })))
      .catch(() => {});
  }, [user, userData]);

  const handleLogout = () => { logout(); navigate("/"); };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError("비밀번호를 입력해주세요."); return; }
    setDeleting(true);
    setDeleteError("");
    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteUser(auth.currentUser);
      navigate("/");
    } catch (e) {
      setDeleteError(e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
        ? "비밀번호가 올바르지 않습니다." : "오류가 발생했습니다. 다시 시도해주세요.");
    } finally { setDeleting(false); }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: "480px", margin: "6rem auto", textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1rem" }}>로그인이 필요합니다</h1>
        <Link to="/" style={{ color: "var(--accent-indigo, #6366f1)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}><ArrowLeft size={16} /> 홈으로</Link>
      </div>
    );
  }

  // ── 모바일 레이아웃 ───────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 120px)" }}>
        {/* 상단 탭 바 */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-primary)",
          padding: "0 4px", overflow: "visible",
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              display: "flex", gap: "0", overflowX: "auto", flex: 1,
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {MENU.map((m) => {
                const active = section === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSection(m.id)}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "12px 14px", border: "none", background: "transparent",
                      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                      borderBottom: active ? "2px solid var(--accent-indigo, #6366f1)" : "2px solid transparent",
                      color: active ? "var(--accent-indigo, #6366f1)" : "var(--text-muted)",
                      fontWeight: active ? 700 : 500,
                      fontSize: "0.82rem",
                      transition: "all 0.15s",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div style={{ flexShrink: 0, padding: "0 10px" }}>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div style={{ flex: 1, padding: "20px 16px" }}>
          {section === "home" && <HomeSection user={user} stats={stats} isMobile={true} onLogout={handleLogout} onDeleteConfirm={() => setDeleteConfirm(true)} />}
          {section === "library" && <LibrarySection user={user} isMobile={true} />}
          {section === "liked" && <LikedSection user={user} isMobile={true} />}
          {section === "news" && <NewsBookmarkSection newsBookmarks={newsBookmarks} toggleNewsBookmark={toggleNewsBookmark} isMobile={true} />}
          {section === "toolBookmarks" && <ToolBookmarkSection user={user} isMobile={true} />}
          {section === "community" && <CommunitySection user={user} isMobile={true} />}
        </div>

        {/* 회원탈퇴 모달 */}
        {deleteConfirm && <DeleteModal
          deletePassword={deletePassword}
          setDeletePassword={setDeletePassword}
          deleteError={deleteError}
          deleting={deleting}
          onConfirm={handleDeleteAccount}
          onClose={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
        />}
      </div>
    );
  }

  // ── PC 레이아웃 ───────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 120px)", maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem", gap: "0" }}>

      {/* 사이드바 */}
      <aside style={{
        width: "220px", flexShrink: 0,
        background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        borderRadius: "var(--r-lg)", display: "flex", flexDirection: "column",
        height: "fit-content", position: "sticky", top: "80px",
      }}>
        {/* 유저 정보 */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border-primary)" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>대시보드</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
              alt="" width={34} height={34} style={{ borderRadius: "50%" }}
            />
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{user.displayName}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>{user.email}</div>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <nav style={{ padding: "10px 8px", display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {MENU.map((m) => (
            <button
              key={m.id}
              onClick={() => setSection(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                background: section === m.id ? "rgba(99,102,241,0.12)" : "transparent",
                color: section === m.id ? "var(--accent-indigo, #6366f1)" : "var(--text-secondary)",
                fontWeight: section === m.id ? 700 : 500,
                fontSize: "0.88rem", transition: "all 0.15s", textAlign: "left",
              }}
            >
              <Icon name={m.icon} size={16} />
              {m.label}
            </button>
          ))}
        </nav>

        {/* 테마 변경 */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-primary)", display: "flex", justifyContent: "flex-start" }}>
          <ThemeToggle dropUp />
        </div>

      </aside>

      {/* 메인 컨텐츠 */}
      <main style={{ flex: 1, minWidth: 0, padding: "0 0 2rem 24px" }}>
        {section === "home" && <HomeSection user={user} stats={stats} isMobile={false} onLogout={handleLogout} onDeleteConfirm={() => setDeleteConfirm(true)} />}
        {section === "library" && <LibrarySection user={user} isMobile={false} />}
        {section === "liked" && <LikedSection user={user} isMobile={false} />}
        {section === "news" && <NewsBookmarkSection newsBookmarks={newsBookmarks} toggleNewsBookmark={toggleNewsBookmark} isMobile={false} />}
        {section === "toolBookmarks" && <ToolBookmarkSection user={user} isMobile={false} />}
        {section === "community" && <CommunitySection user={user} isMobile={false} />}
      </main>

      {/* 회원탈퇴 모달 */}
      {deleteConfirm && <DeleteModal
        deletePassword={deletePassword}
        setDeletePassword={setDeletePassword}
        deleteError={deleteError}
        deleting={deleting}
        onConfirm={handleDeleteAccount}
        onClose={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
      />}
    </div>
  );
}

// ── 회원탈퇴 확인 모달 ──────────────────────────────────────
const DeleteModal = ({ deletePassword, setDeletePassword, deleteError, deleting, onConfirm, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        borderRadius: "var(--r-lg)", padding: "28px", width: "100%", maxWidth: "400px",
        display: "flex", flexDirection: "column", gap: "16px",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#ef4444" }}>⚠ 회원탈퇴</h3>
      <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        탈퇴 시 모든 데이터가 삭제됩니다. 확인을 위해 비밀번호를 입력해주세요.
      </p>
      <input
        type="password"
        placeholder="비밀번호 확인"
        value={deletePassword}
        onChange={(e) => setDeletePassword(e.target.value)}
        style={{
          padding: "10px 14px", borderRadius: "var(--r-md)",
          border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
          color: "var(--text-primary)", fontSize: "0.92rem", outline: "none",
        }}
      />
      {deleteError && <p style={{ margin: 0, color: "#ef4444", fontSize: "0.82rem" }}>{deleteError}</p>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onConfirm}
          disabled={deleting}
          style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 600, padding: "8px 16px", fontSize: "0.88rem", flex: 1 }}
        >
          {deleting ? "처리 중..." : "탈퇴 확인"}
        </button>
        <button
          onClick={onClose}
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 600, padding: "8px 16px", fontSize: "0.88rem", flex: 1 }}
        >
          취소
        </button>
      </div>
    </div>
  </div>
);
