import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_CATEGORIES } from "../constants";
import { formatRelativeTime } from "../utils";
import { useCommunity } from "../context/CommunityContext";
import { ArrowLeft, PencilSimple } from "../components/icons/PhosphorIcons";

const POSTS_PER_PAGE = 20;

const CATEGORY_COLORS = {
  notice:   { bg: "#fee2e2", color: "#b91c1c", darkBg: "#450a0a", darkColor: "#fca5a5" },
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
  display: grid; grid-template-columns: 50px 1fr 125px 70px 90px;
  padding: 0.65rem 1.25rem; background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 0.8rem; color: var(--text-muted); font-weight: 600;
  @media (max-width: 600px) { display: none; }
`;

const PostRow = styled.div`
  display: grid; grid-template-columns: 50px 1fr 125px 70px 55px;
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

const NoticeRow = styled(PostRow)`
  background: rgba(239, 68, 68, 0.04);
  border-left: 3px solid #ef4444;
  [data-theme="dark"] & { background: rgba(239, 68, 68, 0.07); }
  &:hover { background: rgba(239, 68, 68, 0.09); }
`;

const HotRow = styled(PostRow)`
  background: rgba(251, 191, 36, 0.05);
  border-left: 3px solid #f59e0b;
  [data-theme="dark"] & { background: rgba(251, 191, 36, 0.08); }
  &:hover { background: rgba(251, 191, 36, 0.1); }
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
  width: 31px; height: 31px; border-radius: 50%; object-fit: cover;
`;
const DesktopFallback = styled.div`
  width: 31px; height: 31px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center; font-size: 0.85rem; color: #fff;
`;

const VoteCount = styled.span`
  font-size: 0.78rem; color: var(--text-muted); text-align: center;
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
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
  &:hover { border-color: var(--text-secondary); color: var(--text-primary); }
`;

const SearchContainer = styled.form`
  display: flex; gap: 0.5rem; margin-top: 2rem; justify-content: center; align-items: center;
  @media (max-width: 600px) { flex-direction: row; flex-wrap: wrap; gap: 0.3rem; }
`;
const SearchSelect = styled.select`
  padding: 0.55rem 0.5rem; border: 1px solid var(--border-primary);
  border-radius: var(--r-sm); background: var(--bg-card); color: var(--text-primary);
  font-size: 0.85rem; outline: none; cursor: pointer;
`;
const SearchInput = styled.input`
  flex: 0 1 240px; padding: 0.55rem 0.85rem; border: 1px solid var(--border-primary);
  border-radius: var(--r-sm); background: var(--bg-card); color: var(--text-primary);
  font-size: 0.85rem; outline: none;
  @media (max-width: 600px) { flex: 1; min-width: 140px; }
`;
const SearchButton = styled.button`
  padding: 0.55rem 1rem; background: var(--bg-secondary); color: var(--text-primary);
  border: 1px solid var(--border-primary); border-radius: var(--r-sm);
  font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
  &:hover { background: var(--bg-tertiary); border-color: var(--text-muted); }
`;

const EmptyMessage = styled.div`
  text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-size: 0.95rem;
`;

export default function Community() {
  const navigate = useNavigate();
  const { board } = useParams();
  const { user } = useAuth();
  const { search } = window.location; // query string
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [loading, setLoading] = useState(true);
  
  const { boards, loading: boardsLoading } = useCommunity();
  const boardInfo = boards.find((b) => b.id === board);

  // 유효하지 않은 board면 대시보드로
  useEffect(() => {
    if (!boardsLoading && !boardInfo) navigate("/community");
  }, [board, boardInfo, boardsLoading, navigate]);

  // 검색 상태
  const [searchType, setSearchType] = useState("title");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeSearch, setActiveSearch] = useState({ type: "title", keyword: "" });

  // URL 쿼리 파라미터 (태그 클릭 등) 처리
  useEffect(() => {
    const params = new URLSearchParams(search);
    const q = params.get('q');
    if (q) {
      setSearchType("tag");
      setSearchKeyword(q);
      setActiveSearch({ type: "tag", keyword: q });
    }
  }, [search]);

  useEffect(() => {
    if (boardsLoading || !boardInfo) return;
    const fetchPosts = async () => {
      setLoading(true);
      // URL q가 없을 때만 검색 초기화
      if (!new URLSearchParams(window.location.search).get('q')) {
        setActiveSearch({ type: "title", keyword: "" });
        setSearchKeyword("");
      }
      try {
        const q = query(
          collection(db, "communityPosts"),
          where("board", "in", [board, "all"]),
          orderBy("createdAt", "desc")
        );
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
  }, [board, boardInfo]); 

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch({ type: searchType, keyword: searchKeyword.trim() });
    setVisibleCount(POSTS_PER_PAGE);
  };

  const getCategoryLabel = (id) => COMMUNITY_CATEGORIES.find((c) => c.id === id)?.label || id;

  // 키워드 검색 필터
  const keywordFilter = (p) => {
    if (!activeSearch.keyword) return true;
    const kw = activeSearch.keyword.toLowerCase();
    switch (activeSearch.type) {
      case "title": return p.title?.toLowerCase().includes(kw);
      case "content": return p.content?.replace(/<[^>]*>/g, "").toLowerCase().includes(kw);
      case "title_content":
        return p.title?.toLowerCase().includes(kw) ||
               p.content?.replace(/<[^>]*>/g, "").toLowerCase().includes(kw);
      case "nickname": return p.displayName?.toLowerCase().includes(kw);
      case "tag": return p.tags?.some(t => t.toLowerCase().includes(kw.replace('#', '')));
      default: return true;
    }
  };

  // 어제 날짜 범위 계산
  const now = new Date();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isYesterday = (ts) => {
    if (!ts) return false;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d >= yesterdayStart && d < yesterdayEnd;
  };

  // 핀 로직: 검색 없고 카테고리 "all"일 때만 적용
  const usePinned = !activeSearch.keyword && category === "all";

  const noticePosts   = usePinned ? posts.filter((p) => p.category === "notice") : [];
  const noticeIds     = new Set(noticePosts.map((p) => p.id));
  const hotPosts      = usePinned
    ? posts
        .filter((p) => !noticeIds.has(p.id) && isYesterday(p.createdAt))
        .sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0))
        .slice(0, 3)
    : [];
  const hotIds = new Set(hotPosts.map((p) => p.id));

  // 일반 목록 (공지·HOT 제외, 카테고리·키워드 필터 적용)
  const filteredPosts = posts.filter((p) => {
    if (usePinned && (noticeIds.has(p.id) || hotIds.has(p.id))) return false;
    if (!usePinned && category !== "all" && p.category !== category) return false;
    return keywordFilter(p);
  });

  // 최종 표시 목록
  const pinnedPosts   = [...noticePosts, ...hotPosts]; // 항상 전체 표시
  const visiblePosts  = filteredPosts.slice(0, visibleCount);
  const hasMore       = visibleCount < filteredPosts.length;

  if (!boardInfo) return null;

  return (
    <PageWrapper>
      <PageHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate("/community")}
            style={{ 
              background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", 
              color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem",
              borderRadius: "4px", width: "26px", height: "26px", display: "flex", 
              alignItems: "center", justifyContent: "center" 
            }}
          >
            <ArrowLeft size={16} />
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
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <PencilSimple size={16} /> 글쓰기
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
          <span style={{ textAlign: "center" }}>평가</span>
        </PostHeader>

        {loading ? (
          <EmptyMessage>불러오는 중...</EmptyMessage>
        ) : pinnedPosts.length === 0 && visiblePosts.length === 0 ? (
          <EmptyMessage>아직 게시글이 없어요. 첫 글을 작성해 보세요!</EmptyMessage>
        ) : (
          <>
            {/* 공지 + HOT 고정 게시물 */}
            {pinnedPosts.map((post) => {
              const isNotice = post.category === "notice";
              const Row = isNotice ? NoticeRow : HotRow;
              const pin  = isNotice ? "📌" : "🔥";
              return (
                <Row key={post.id} onClick={() => navigate(`/community/${board}/${post.id}`)}>
                  <PostNum>{pin}</PostNum>
                  <PostTitleCell>
                    <CategoryBadge $cat={post.category}>{getCategoryLabel(post.category)}</CategoryBadge>
                    <PostTitle style={{ fontWeight: 700 }}>{post.title}</PostTitle>
                    {post.commentCount > 0 && <CommentCount>[{post.commentCount}]</CommentCount>}
                  </PostTitleCell>
                  <PostMeta>
                    <span onClick={(e) => { e.stopPropagation(); if (post.uid) navigate(`/user/${post.uid}`); }} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: post.uid ? "pointer" : "default" }}>
                      {post.photoURL ? <DesktopAvatar src={post.photoURL} alt="" /> : <DesktopFallback>{(post.displayName || "?")[0]}</DesktopFallback>}
                      {post.displayName || "익명"}
                    </span>
                  </PostMeta>
                  <PostMeta style={{ textAlign: "center" }}>{formatRelativeTime(post.createdAt)}</PostMeta>
                  <VoteCount>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>👍 {post.upvoteCount || 0}</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700, marginLeft: "4px" }}>👎 {post.downvoteCount || 0}</span>
                  </VoteCount>
                  <MobilePostMeta style={{ marginTop: "4px" }}>
                    <span onClick={(e) => { e.stopPropagation(); if (post.uid) navigate(`/user/${post.uid}`); }} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: post.uid ? "pointer" : "default" }}>
                      {post.photoURL ? <MobileAuthorAvatar src={post.photoURL} alt="" /> : <MobileAuthorFallback>{(post.displayName || "?")[0]}</MobileAuthorFallback>}
                      <span>{post.displayName || "익명"}</span>
                    </span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 700, display: "flex", gap: "8px" }}>
                      <span>👍 {post.upvoteCount || 0}</span>
                      <span>👎 {post.downvoteCount || 0}</span>
                    </span>
                  </MobilePostMeta>
                </Row>
              );
            })}

            {/* 일반 게시물 */}
            {visiblePosts.map((post, i) => (
              <PostRow key={post.id} onClick={() => navigate(`/community/${board}/${post.id}`)}>
                <PostNum>{filteredPosts.length - i}</PostNum>
                <PostTitleCell>
                  {post.category && post.category !== "all" && post.category !== "notice" && (
                    <CategoryBadge $cat={post.category}>{getCategoryLabel(post.category)}</CategoryBadge>
                  )}
                  <PostTitle style={{ fontWeight: 600 }}>{post.title}</PostTitle>
                  {post.commentCount > 0 && <CommentCount>[{post.commentCount}]</CommentCount>}
                </PostTitleCell>
                <PostMeta>
                  <span onClick={(e) => { e.stopPropagation(); if (post.uid) navigate(`/user/${post.uid}`); }} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: post.uid ? "pointer" : "default" }}>
                    {post.photoURL ? <DesktopAvatar src={post.photoURL} alt="" /> : <DesktopFallback>{(post.displayName || "?")[0]}</DesktopFallback>}
                    {post.displayName || "익명"}
                  </span>
                </PostMeta>
                <PostMeta style={{ textAlign: "center" }}>{formatRelativeTime(post.createdAt)}</PostMeta>
                <VoteCount>
                  <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>👍 {post.upvoteCount || 0}</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 700, marginLeft: "4px" }}>👎 {post.downvoteCount || 0}</span>
                </VoteCount>
                <MobilePostMeta style={{ marginTop: "4px" }}>
                  <span onClick={(e) => { e.stopPropagation(); if (post.uid) navigate(`/user/${post.uid}`); }} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: post.uid ? "pointer" : "default" }}>
                    {post.photoURL ? <MobileAuthorAvatar src={post.photoURL} alt="" /> : <MobileAuthorFallback>{(post.displayName || "?")[0]}</MobileAuthorFallback>}
                    <span>{post.displayName || "익명"}</span>
                  </span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{formatRelativeTime(post.createdAt)}</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-primary)", fontWeight: 700, display: "flex", gap: "8px" }}>
                    <span>👍 {post.upvoteCount || 0}</span>
                    <span>👎 {post.downvoteCount || 0}</span>
                  </span>
                </MobilePostMeta>
              </PostRow>
            ))}
          </>
        )}
      </PostTable>

      {hasMore && (
        <LoadMoreButton onClick={() => setVisibleCount((v) => v + POSTS_PER_PAGE)}>
          더보기
        </LoadMoreButton>
      )}

      {/* 검색 바 */}
      <SearchContainer onSubmit={handleSearch}>
        <SearchSelect value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <option value="title">제목</option>
          <option value="content">내용</option>
          <option value="title_content">제목+내용</option>
          <option value="nickname">이름</option>
          <option value="tag">태그</option>
        </SearchSelect>
        <SearchInput 
          placeholder="검색어를 입력하세요" 
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        <SearchButton type="submit">검색</SearchButton>
      </SearchContainer>
    </PageWrapper>
  );
}
