import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebase";
import Logo from "../ui/Logo";
import { NAV_ITEMS } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import { useTools } from "../../context/ToolContext";
import { useNews } from "../../context/NewsContext";
import LoginModal from "../modals/LoginModal";
import ThemeToggle from "../ui/ThemeToggle";
import { useGalleryLightbox } from "../../context/GalleryLightboxContext";

const Navbar = () => {
  const { user, userData, logout } = useAuth();
  const { tools, openToolDetail } = useTools();
  const { newsBookmarks } = useNews();
  const navigate = useNavigate();
  
  const [showDropdown, setShowDropdown] = useState(false); // 로그인 후 프로필 드롭다운
  const [showLoginModal, setShowLoginModal] = useState(false); // 로그인 모달
  
  const [bookmarks, setBookmarks] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const { openLightbox } = useGalleryLightbox();
  const dropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!showDropdown || !user) return;
    const q = query(collection(db, "bookmarks"), where("uid", "==", user.uid));
    getDocs(q).then((snap) => setBookmarks(snap.docs.map((d) => d.data())));
    const q2 = query(
      collection(db, "galleryPosts"),
      where("likedBy", "array-contains", user.uid),
      limit(5)
    );
    getDocs(q2).then((snap) => setLikedPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))).catch(() => {});
  }, [showDropdown, user]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // [추가] 프로필 설정이 안 된 사용자가 로그인되면 자동으로 설정을 띄움
  useEffect(() => {
    if (user && !showLoginModal) {
      // userData가 로드된 후 setupCompleted가 false인 경우 (또는 로드 전인데 닉네임이 없는 경우)
      // userData가 null인 경우는 아직 로딩 중일 수 있으므로 주의
      if (userData && !userData.setupCompleted && location.pathname === "/") {
        setShowLoginModal(true);
      }
    }
  }, [user, userData, showLoginModal, location.pathname]);

  const handleBookmarkClick = (toolId) => {
    if (!tools) return;
    const sorted = [...tools].sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex((t) => t.id === toolId);
    if (idx !== -1) {
      openToolDetail(sorted[idx], idx + 1);
      setShowDropdown(false);
    }
  };

  const getActiveMenu = () => {
    if (location.pathname.startsWith("/community")) return "community";
    if (location.pathname === "/news") return "news";
    if (location.pathname === "/gallery") return "gallery";
    if (location.pathname === "/directory") return "directory";
    if (location.pathname === "/prompt") return "prompt";
    if (location.pathname === "/treemap") return "treemap";
    return "ranking";
  };

  const activeMenu = getActiveMenu();

  // 소셜 로그인 특성상 Firebase Auth의 displayName이 늦게 채워지거나 누락될 수 있으므로
  // Firestore의 userData를 우선적으로 사용합니다.
  const displayName = userData?.displayName || user?.displayName || "사용자";
  const photoURL = userData?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

  return (
    <header className="navbar-header">
      <div className="navbar-top-row">
        <Logo />
        
        <div className="navbar-actions">
          {user ? (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div
                onClick={() => setShowDropdown((prev) => !prev)}
                style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
              >
                <img
                  src={photoURL}
                  alt={displayName}
                  width={30}
                  height={30}
                  style={{ borderRadius: "50%", flexShrink: 0 }}
                />
                <span className="user-name">
                  {displayName.split(" ")[0]}
                </span>
              </div>

              {showDropdown && (
                <div className="navbar-dropdown">
                  <button
                    onClick={() => { navigate("/dashboard"); setShowDropdown(false); }}
                    className="dropdown-item"
                    style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--accent-indigo, #6366f1)" }}
                  >
                    ◈ 대시보드 열기
                  </button>

                  {/* 뉴스 북마크 */}
                  <div className="dropdown-divider" />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 2px" }}>
                    <span className="dropdown-label" style={{ padding: 0 }}>뉴스 북마크 ({newsBookmarks.length})</span>
                    {newsBookmarks.length > 0 && (
                      <button onClick={() => { navigate("/dashboard", { state: { section: "news" } }); setShowDropdown(false); }}
                        style={{ fontSize: "0.72rem", color: "var(--accent-indigo, #6366f1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                        더보기 →
                      </button>
                    )}
                  </div>
                  {newsBookmarks.length === 0 ? (
                    <div className="dropdown-empty">북마크한 뉴스가 없어요</div>
                  ) : (
                    newsBookmarks.slice(0, 5).map((b) => (
                      <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer" className="dropdown-item">
                        {b.title}
                      </a>
                    ))
                  )}

                  {/* 도구 북마크 */}
                  <div className="dropdown-divider" />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 2px" }}>
                    <span className="dropdown-label" style={{ padding: 0 }}>도구 북마크 ({bookmarks.length})</span>
                    {bookmarks.length > 0 && (
                      <button onClick={() => { navigate("/dashboard", { state: { section: "toolBookmarks" } }); setShowDropdown(false); }}
                        style={{ fontSize: "0.72rem", color: "var(--accent-indigo, #6366f1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                        더보기 →
                      </button>
                    )}
                  </div>
                  {bookmarks.length === 0 ? (
                    <div className="dropdown-empty">북마크한 도구가 없어요</div>
                  ) : (
                    bookmarks.slice(0, 5).map((b) => (
                      <button key={b.toolId} onClick={() => handleBookmarkClick(b.toolId)} className="dropdown-item">
                        🔖 {b.toolName}
                      </button>
                    ))
                  )}

                  {/* 좋아요한 갤러리 */}
                  <div className="dropdown-divider" />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 2px" }}>
                    <span className="dropdown-label" style={{ padding: 0 }}>갤러리 좋아요</span>
                    {likedPosts.length > 0 && (
                      <button onClick={() => { navigate("/dashboard", { state: { section: "liked" } }); setShowDropdown(false); }}
                        style={{ fontSize: "0.72rem", color: "var(--accent-indigo, #6366f1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                        더보기 →
                      </button>
                    )}
                  </div>
                  {likedPosts.length === 0 ? (
                    <div className="dropdown-empty">좋아요한 이미지가 없어요</div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", padding: "4px 12px", flexWrap: "wrap" }}>
                      {likedPosts.slice(0, 5).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setShowDropdown(false); openLightbox(p); }}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "var(--r-sm)", overflow: "hidden" }}
                        >
                          <img
                            src={p.imageUrl} alt=""
                            width={52} height={52}
                            style={{ borderRadius: "var(--r-sm)", objectFit: "cover", display: "block", border: "1px solid var(--border-primary)" }}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="dropdown-divider" />
                  <button onClick={() => { logout(); setShowDropdown(false); }} className="dropdown-logout">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="navbar-login-btn"
            >
              <span>로그인</span>
            </button>
          )}

          <ThemeToggle />
        </div>
      </div>

      <nav className="navbar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activeMenu === item.id;
          const path =
            item.id === "ranking"   ? "/" :
            item.id === "treemap"   ? "/treemap" :
            item.id === "gallery"   ? "/gallery" :
            item.id === "community" ? "/community" :
            item.id === "directory" ? "/directory" :
            item.id === "news"      ? "/news" :
            item.id === "prompt"    ? "/prompt" : "/";

          return (
            <Link
              to={path}
              key={item.id}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              {item.icon} {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 로그인 모달 */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </header>
  );
};

export default Navbar;
