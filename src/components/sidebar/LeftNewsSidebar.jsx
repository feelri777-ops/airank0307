import { useState, useEffect } from "react";

const FALLBACK_NEWS = [
  { title: "Cursor AI, 기업가치 10조 돌파", link: "https://search.naver.com/search.naver?where=news&query=Cursor+AI", relativeTime: "3시간 전" },
  { title: "국내 AI 스타트업 투자 급증", link: "https://search.naver.com/search.naver?where=news&query=AI+스타트업", relativeTime: "6시간 전" },
  { title: "Suno AI 음악 저작권 소송 결과", link: "https://search.naver.com/search.naver?where=news&query=Suno+AI", relativeTime: "9시간 전" },
  { title: "삼성·LG, 자체 AI 모델 개발 착수", link: "https://search.naver.com/search.naver?where=news&query=삼성+AI", relativeTime: "14시간 전" },
  { title: "AI 코딩 툴 시장 점유율 변화", link: "https://search.naver.com/search.naver?where=news&query=AI+코딩", relativeTime: "2일 전" },
];

const LeftNewsSidebar = () => {
  const [news, setNews] = useState(FALLBACK_NEWS);

  useEffect(() => {
    fetch("/news.json")
      .then((r) => r.json())
      .then((data) => {
        if (data.items?.length > 5) setNews(data.items.slice(5, 10));
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="sidebar-left" style={{
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      minWidth: "220px",
    }}>
      {/* 주요 뉴스 */}
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
          📌 주요 뉴스
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
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              lineHeight: 1.4,
            }}>
              {item.title}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {item.relativeTime}
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
};

export default LeftNewsSidebar;
