import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useGalleryLightbox } from "../../context/GalleryLightboxContext";

const FALLBACK_NEWS = [
  { title: "OpenAI, GPT-5 출시 임박 소문", link: "https://search.naver.com/search.naver?where=news&query=GPT-5", relativeTime: "2시간 전", hot: true },
  { title: "Anthropic Claude 4 벤치마크 공개", link: "https://search.naver.com/search.naver?where=news&query=Claude+AI", relativeTime: "5시간 전", hot: true },
  { title: "Midjourney 웹앱 정식 출시", link: "https://search.naver.com/search.naver?where=news&query=Midjourney", relativeTime: "8시간 전", hot: true },
  { title: "Google Gemini 2.0 Flash 업데이트", link: "https://search.naver.com/search.naver?where=news&query=Gemini+AI", relativeTime: "12시간 전", hot: false },
  { title: "Cursor IDE, 월 사용자 100만 돌파", link: "https://search.naver.com/search.naver?where=news&query=Cursor+IDE", relativeTime: "1일 전", hot: false },
];

const RightSidebar = () => {
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [galleryPosts, setGalleryPosts] = useState([]);
  const { openLightbox } = useGalleryLightbox();

  useEffect(() => {
    fetch("/news.json")
      .then((r) => r.json())
      .then((data) => {
        if (data.items?.length) setNews(data.items.slice(0, 5));
      })
      .catch(() => {}); // 폴백 유지
  }, []);

  useEffect(() => {
    const q = query(collection(db, "galleryPosts"), orderBy("createdAt", "desc"), limit(6));
    getDocs(q)
      .then((snap) => setGalleryPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  return (
    <aside className="sidebar-right" style={{
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      minWidth: "360px",
      position: "sticky",
      top: "80px",
      alignSelf: "start",
    }}>
      {/* 뉴스 피드 */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "16px",
        border: "1px solid var(--border-primary)",
        padding: "1.2rem",
        boxShadow: "var(--shadow-card)",
      }}>
        <h3 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: "0.9rem",
          fontWeight: 700,
          marginBottom: "12px",
          color: "var(--text-primary)",
        }}>
          📰 최신 뉴스
        </h3>
        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "8px 0",
              borderBottom: i < news.length - 1 ? "1px solid var(--border-primary)" : "none",
              textDecoration: "none",
            }}
          >
            <div style={{
              fontSize: "0.9375rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              lineHeight: 1.4,
              display: "flex",
              gap: "4px",
              alignItems: "flex-start",
            }}>
              {item.title}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {item.relativeTime}
            </div>
          </a>
        ))}
      </div>

      {/* 갤러리 최신 이미지 */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "16px",
        border: "1px solid var(--border-primary)",
        padding: "1.2rem",
        boxShadow: "var(--shadow-card)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}>
            🖼️ 갤러리 최신
          </h3>
          <a href="/gallery" style={{ fontSize: "0.72rem", color: "var(--accent-indigo)", fontWeight: 600, textDecoration: "none" }}>
            더보기 →
          </a>
        </div>
        {galleryPosts.length === 0 ? (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
            갤러리 이미지가 없어요
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
            {galleryPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => openLightbox(post)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "10px", overflow: "hidden", aspectRatio: "1", position: "relative" }}
              >
                <img
                  src={post.imageUrl}
                  alt={post.prompt || ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "10px", transition: "transform 0.2s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default RightSidebar;
