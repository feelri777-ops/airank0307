import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_CATEGORIES } from "../constants";
import { formatRelativeTime } from "../utils";
import { BOARDS } from "./CommunityDashboard";

const POSTS_PER_PAGE = 20;

const CATEGORY_COLORS = {
  review:   { bg: "#dbeafe", color: "#1d4ed8", darkBg: "#1e3a5f", darkColor: "#60a5fa" },
  question: { bg: "#fef3c7", color: "#b45309", darkBg: "#4a3200", darkColor: "#fbbf24" },
  tips:     { bg: "#d1fae5", color: "#065f46", darkBg: "#063a28", darkColor: "#34d399" },
  free:     { bg: "#f3e8ff", color: "#7e22ce", darkBg: "#3b0764", darkColor: "#c084fc" },
};

const PageWrapper = styled.div`
  max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem;
  @media (max-width: 600px) { padding: 1.5rem 0.5rem; }
`;

const PageHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;
`;

const WriteButton = styled.button`
  padding: 0.5rem 1.25rem; background: var(--accent-gradient); color: #fff;
  border: none; border-radius: var(--r-sm); font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const CategoryTabs = styled.div`
  display: flex; gap: 0.5rem; margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-primary); padding-bottom: 0.75rem; overflow-x: auto;
`;

const CategoryTab = styled.button`
  padding: 0.4rem 1rem; border: none; border-radius: var(--r-lg);
  font-size: 0.875rem; font-weight: ${({ $active }) => ($active ? "700" : "500")};
  cursor: pointer; white-space: nowrap; transition: all 0.2s;
  background: ${({ $active }) => ($active ? "var(--accent-indigo)" : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : "var(--text-secondary)")};
  &:hover {
    background: ${({ $active }) => ($active ? "var(--accent-indigo)" : "var(--bg-tertiary)")};
    color: ${({ $active }) => ($active ? "#fff" : "var(--text-primary)")};
  }
`;

const PostTable = styled.div`
  border: 1px solid var(--border-primary); border-radius: var(--r-md);
  overflow: hidden; background: var(--bg-card);
`;

const PostHeader = styled.div`
  display: grid; grid-template-columns: 50px 1fr 90px 60px 55px;
  padding: 0.65rem 1.25rem; background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 0.8rem; color: var(--text-muted); font-weight: 600;
  @media (max-width: 600px) { display: none; }
`;

const PostRow = styled.div`
  display: grid; grid-template-columns: 50px 1fr 90px 60px 55px;
  padding: 0.9rem 1.25rem; border-bottom: 1px solid var(--border-primary);
  cursor: pointer; transition: background 0.15s; align-items: center;
  &:last-child { border-bottom: none; }
  &:hover { background: var(--bg-tertiary); }
  @media (max-width: 600px) { 
    grid-template-columns: 1fr; 
    padding: 0.75rem 1rem;
    gap: 0.15rem; 
  }
`;

const PostNum = styled.span`
  font-size: 0.8rem; color: var(--text-muted); text-align: center;
  @media (max-width: 600px) { display: none; }
`;

const PostTitleCell = styled.div`display: flex; align-items: center; gap: 0.5rem; min-width: 0;`;

const CategoryBadge = styled.span`
  flex-shrink: 0; font-size: 0.7rem; font-weight: 700;
  padding: 0.2rem 0.5rem; border-radius: var(--r-xs);
  background: ${({ $cat }) => CATEGORY_COLORS[$cat]?.bg || "#e2e8f0"};
  color: ${({ $cat }) => CATEGORY_COLORS[$cat]?.color || "#475569"};
  [data-theme="dark"] & {
    background: ${({ $cat }) => CATEGORY_COLORS[$cat]?.darkBg || "#1e293b"};
    color: ${({ $cat }) => CATEGORY_COLORS[$cat]?.darkColor || "#94a3b8"};
  }
`;

const PostTitle = styled.span`
  font-size: 0.95rem; color: var(--text-primary); font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const CommentCount = styled.span`font-size: 0.78rem; color: var(--accent-indigo); font-weight: 600; flex-shrink: 0;`;

const PostMeta = styled.span`
  font-size: 0.78rem; color: var(--text-muted); text-align: center;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  @media (max-width: 600px) { display: none; }
`;
const DesktopAvatar = styled.img`
  width: 22px; height: 22px; border-radius: 50%; object-fit: cover;
`;
const DesktopFallback = styled.div`
  width: 22px; height: 22px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #fff;
`;

const LikeCount = styled.span`
  font-size: 0.78rem; color: var(--text-muted); text-align: center;
  display: flex; align-items: center; justify-content: center; gap: 0.25rem;
  @media (max-width: 600px) { display: none; }
`;

const MobilePostMeta = styled.div`
  display: none; font-size: 0.95rem; color: var(--text-muted); align-items: center; gap: 0.5rem;
  @media (max-width: 600px) { display: flex; }
`;
const MobileAuthorAvatar = styled.img`
  width: 27px; height: 27px; border-radius: 50%; object-fit: cover;
`;
const MobileAuthorFallback = styled.div`
  width: 27px; height: 27px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #fff;
`;

const LoadMoreButton = styled.button`
  display: block; margin: 1.5rem auto 0; padding: 0.65rem 2.5rem;
  background: transparent; border: 1px solid var(--border-primary);
  border-radius: var(--r-sm); color: var(--text-secondary); font-size: 0.9rem;
  cursor: pointer; transition: all 0.2s;
  &:hover { border-color: var(--accent-indigo); color: var(--accent-indigo); }
`;

const EmptyMessage = styled.div`
  text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-size: 0.95rem;
`;

export default function Community() {
  const navigate = useNavigate();
  const { board } = useParams();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [loading, setLoading] = useState(true);

  const boardInfo = BOARDS.find((b) => b.id === board);

  // 유효하지 않은 board면 대시보드로
  useEffect(() => {
    if (!boardInfo) navigate("/community");
  }, [board, boardInfo, navigate]);

  useEffect(() => {
    if (!boardInfo) return;
    const fetchPosts = async () => {
      setLoading(true);
      try {
        let q;
        if (category === "all") {
          q = query(
            collection(db, "communityPosts"),
            where("board", "==", board),
            orderBy("createdAt", "desc")
          );
        } else {
          q = query(
            collection(db, "communityPosts"),
            where("board", "==", board),
            where("category", "==", category),
            orderBy("createdAt", "desc")
          );
        }
        const snap = await getDocs(q);
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("게시글 로드 오류:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
    setVisibleCount(POSTS_PER_PAGE);
  }, [board, category, boardInfo]);

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;
  const getCategoryLabel = (cat) => COMMUNITY_CATEGORIES.find((c) => c.id === cat)?.label || cat;

  if (!boardInfo) return null;

  return (
    <PageWrapper>
      <PageHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate("/community")}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.875rem" }}
          >
            ← 커뮤니티
          </button>
          <span style={{ color: "var(--border-primary)" }}>|</span>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: "1.4rem", fontWeight: 800,
            color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px",
          }}>
            {boardInfo.logo
              ? <img src={boardInfo.logo} alt={boardInfo.name} width={24} height={24} style={{ borderRadius: 4 }} />
              : <span>{boardInfo.icon}</span>
            } {boardInfo.name}
          </h1>
        </div>
        <WriteButton
          onClick={() => navigate(`/community/${board}/write`)}
          disabled={!user}
          title={!user ? "로그인 후 글쓰기 가능합니다" : ""}
        >
          ✏️ 글쓰기
        </WriteButton>
      </PageHeader>

      <CategoryTabs>
        {COMMUNITY_CATEGORIES.map((cat) => (
          <CategoryTab key={cat.id} $active={category === cat.id} onClick={() => setCategory(cat.id)}>
            {cat.label}
          </CategoryTab>
        ))}
      </CategoryTabs>

      <PostTable>
        <PostHeader>
          <span style={{ textAlign: "center" }}>번호</span>
          <span>제목</span>
          <span style={{ textAlign: "center" }}>작성자</span>
          <span style={{ textAlign: "center" }}>날짜</span>
          <span style={{ textAlign: "center" }}>추천</span>
        </PostHeader>

        {loading ? (
          <EmptyMessage>불러오는 중...</EmptyMessage>
        ) : visiblePosts.length === 0 ? (
          <EmptyMessage>아직 게시글이 없어요. 첫 글을 작성해 보세요!</EmptyMessage>
        ) : (
          visiblePosts.map((post, i) => (
            <PostRow key={post.id} onClick={() => navigate(`/community/${board}/${post.id}`)}>
              <PostNum>{posts.length - i}</PostNum>
              <PostTitleCell>
                {post.category && post.category !== "all" && (
                  <CategoryBadge $cat={post.category}>{getCategoryLabel(post.category)}</CategoryBadge>
                )}
                <PostTitle style={{ fontWeight: 600 }}>{post.title}</PostTitle>
                {post.commentCount > 0 && <CommentCount>[{post.commentCount}]</CommentCount>}
              </PostTitleCell>
              <PostMeta>
                {post.photoURL ? (
                  <DesktopAvatar src={post.photoURL} alt="" />
                ) : (
                  <DesktopFallback>{(post.displayName || "?")[0]}</DesktopFallback>
                )}
                {post.displayName || "익명"}
              </PostMeta>
              <PostMeta style={{ textAlign: "center" }}>{formatRelativeTime(post.createdAt)}</PostMeta>
              <LikeCount>♥ {post.likeCount || 0}</LikeCount>
              <MobilePostMeta style={{ marginTop: "4px" }}>
                {post.photoURL ? (
                  <MobileAuthorAvatar src={post.photoURL} alt="" />
                ) : (
                  <MobileAuthorFallback>{(post.displayName || "?")[0]}</MobileAuthorFallback>
                )}
                <span>{post.displayName || "익명"}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
                <span style={{ marginLeft: "auto", color: "var(--accent-indigo)", fontWeight: 700 }}>
                  ♥ {post.likeCount || 0}
                </span>
              </MobilePostMeta>
            </PostRow>
          ))
        )}
      </PostTable>

      {hasMore && (
        <LoadMoreButton onClick={() => setVisibleCount((v) => v + POSTS_PER_PAGE)}>
          더보기
        </LoadMoreButton>
      )}
    </PageWrapper>
  );
}
