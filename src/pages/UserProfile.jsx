import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  doc, getDoc, collection, query, where, orderBy,
  getDocs, collectionGroup, limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { formatRelativeTime } from "../utils";
import { BOARDS } from "./CommunityDashboard";

const BOARD_MAP = Object.fromEntries(BOARDS.map((b) => [b.id, b.name]));

/* ── 스타일 ── */
const Wrapper = styled.div`max-width: 860px; margin: 0 auto; padding: 2.5rem 1.5rem; @media(max-width:600px){padding:1rem 0.5rem;}`;
const BackBtn = styled.button`
  background: none; border: none; color: var(--text-muted); font-size: 0.875rem;
  cursor: pointer; padding: 0; margin-bottom: 1.5rem; transition: color 0.2s;
  &:hover { color: var(--text-primary); }
`;
const ProfileHeader = styled.div`
  display: flex; align-items: center; gap: 1.25rem;
  background: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--r-md); padding: 1.5rem 2rem; margin-bottom: 1.5rem;
  @media(max-width:600px){padding:1rem;}
`;
const Avatar = styled.img`width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0;`;
const AvatarFallback = styled.div`
  width: 64px; height: 64px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; color: #fff; font-weight: 700; flex-shrink: 0;
`;
const ProfileInfo = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const DisplayName = styled.div`font-size: 1.2rem; font-weight: 800; color: var(--text-primary);`;
const JoinDate = styled.div`font-size: 0.8rem; color: var(--text-muted);`;

const TabRow = styled.div`display: flex; gap: 0; border-bottom: 1px solid var(--border-primary); margin-bottom: 1.25rem;`;
const Tab = styled.button`
  padding: 0.6rem 1.25rem; border: none; background: none;
  font-size: 0.9rem; font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active }) => ($active ? "var(--accent-indigo)" : "var(--text-muted)")};
  border-bottom: 2px solid ${({ $active }) => ($active ? "var(--accent-indigo)" : "transparent")};
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
  &:hover { color: var(--text-primary); }
`;

const PostCard = styled.div`
  display: flex; flex-direction: column; gap: 4px;
  padding: 0.9rem 1.1rem; background: var(--bg-card);
  border: 1px solid var(--border-primary); border-radius: var(--r-sm);
  cursor: pointer; transition: background 0.15s;
  &:hover { background: var(--bg-tertiary); }
`;
const PostTitle = styled.div`font-size: 0.9rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const PostMeta = styled.div`font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;`;
const BoardBadge = styled.span`
  font-size: 0.7rem; font-weight: 700; padding: 1px 7px; border-radius: 10px;
  background: rgba(99,102,241,0.1); color: var(--accent-indigo);
`;
const CommentCard = styled(PostCard)`cursor: default; &:hover { background: var(--bg-card); }`;
const CommentLink = styled.span`
  font-size: 0.75rem; color: var(--accent-indigo); cursor: pointer; font-weight: 600;
  &:hover { text-decoration: underline; }
`;
const CommentText = styled.div`font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; word-break: break-word; margin-top: 4px;`;

const GalleryGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;`;
const GalleryThumb = styled.div`
  aspect-ratio: 1; border-radius: var(--r-sm); overflow: hidden;
  background: var(--bg-tertiary); cursor: pointer;
  img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
  &:hover img { transform: scale(1.04); }
`;

const Empty = styled.div`text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.9rem;`;
const Loading = styled.div`text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.875rem;`;
const NotFoundMsg = styled.div`text-align: center; padding: 6rem 1rem; color: var(--text-muted); font-size: 1rem;`;

export default function UserProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [galleryPosts, setGalleryPosts] = useState([]);

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // 프로필 정보 로드
  useEffect(() => {
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) { setNotFound(true); return; }
      setProfileUser({ id: snap.id, ...snap.data() });
    });
  }, [uid]);

  // 작성글 로드
  useEffect(() => {
    if (!profileUser) return;
    setLoadingPosts(true);
    getDocs(query(
      collection(db, "communityPosts"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    )).then((snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(console.error).finally(() => setLoadingPosts(false));
  }, [profileUser, uid]);

  // 댓글 로드 (collectionGroup)
  useEffect(() => {
    if (!profileUser) return;
    setLoadingComments(true);
    getDocs(query(
      collectionGroup(db, "comments"),
      where("uid", "==", uid),
      limit(50)
    )).then(async (snap) => {
      const raw = snap.docs
        .filter((d) => !d.data().deleted)
        .map((d) => ({ id: d.id, postId: d.ref.parent.parent.id, ...d.data() }));

      // 부모 게시글에서 board + title 조회
      const uniquePostIds = [...new Set(raw.map((c) => c.postId))];
      const postSnaps = await Promise.all(
        uniquePostIds.map((id) => getDoc(doc(db, "communityPosts", id)))
      );
      const boardMap = Object.fromEntries(
        postSnaps.filter((s) => s.exists()).map((s) => [s.id, { board: s.data().board, postTitle: s.data().title }])
      );
      const result = raw
        .map((c) => ({ ...c, ...boardMap[c.postId] }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() ?? new Date(0);
          const tb = b.createdAt?.toDate?.() ?? new Date(0);
          return tb - ta;
        });
      setComments(result);
    }).catch((err) => {
      console.error("댓글 로드 오류 (인덱스 미설정일 수 있음):", err);
      setComments(null); // null = 인덱스 오류 신호
    }).finally(() => setLoadingComments(false));
  }, [profileUser, uid]);

  // 갤러리 로드
  useEffect(() => {
    if (!profileUser) return;
    setLoadingGallery(true);
    getDocs(query(
      collection(db, "galleryPosts"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    )).then((snap) => {
      setGalleryPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(console.error).finally(() => setLoadingGallery(false));
  }, [profileUser, uid]);

  if (notFound) return (
    <Wrapper>
      <BackBtn onClick={() => navigate(-1)}>← 뒤로</BackBtn>
      <NotFoundMsg>존재하지 않는 사용자입니다.</NotFoundMsg>
    </Wrapper>
  );

  if (!profileUser) return (
    <Wrapper>
      <BackBtn onClick={() => navigate(-1)}>← 뒤로</BackBtn>
      <Loading>불러오는 중...</Loading>
    </Wrapper>
  );

  const joinDate = profileUser.createdAt?.toDate?.()
    ? profileUser.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <Wrapper>
      <BackBtn onClick={() => navigate(-1)}>← 뒤로</BackBtn>

      <ProfileHeader>
        {profileUser.photoURL
          ? <Avatar src={profileUser.photoURL} alt={profileUser.displayName} referrerPolicy="no-referrer" />
          : <AvatarFallback>{(profileUser.displayName || "?")[0].toUpperCase()}</AvatarFallback>
        }
        <ProfileInfo>
          <DisplayName>{profileUser.displayName || "익명"}</DisplayName>
          {joinDate && <JoinDate>가입일 {joinDate}</JoinDate>}
          <JoinDate style={{ marginTop: 4 }}>
            게시글 {posts.length}개 · 댓글 {Array.isArray(comments) ? comments.length : "-"}개 · 갤러리 {galleryPosts.length}개
          </JoinDate>
        </ProfileInfo>
      </ProfileHeader>

      <TabRow>
        <Tab $active={activeTab === "posts"} onClick={() => setActiveTab("posts")}>
          작성글 {!loadingPosts && `(${posts.length})`}
        </Tab>
        <Tab $active={activeTab === "comments"} onClick={() => setActiveTab("comments")}>
          댓글 {!loadingComments && Array.isArray(comments) && `(${comments.length})`}
        </Tab>
        <Tab $active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")}>
          갤러리 {!loadingGallery && `(${galleryPosts.length})`}
        </Tab>
      </TabRow>

      {/* 작성글 탭 */}
      {activeTab === "posts" && (
        loadingPosts ? <Loading>불러오는 중...</Loading>
        : posts.length === 0 ? <Empty>작성한 게시글이 없습니다.</Empty>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {posts.map((post) => (
              <PostCard key={post.id} onClick={() => navigate(`/community/${post.board}/${post.id}`)}>
                <PostMeta>
                  <BoardBadge>{BOARD_MAP[post.board] || post.board}</BoardBadge>
                  {post.category && post.category !== "all" && (
                    <span>{post.category}</span>
                  )}
                  <span>{formatRelativeTime(post.createdAt)}</span>
                  {post.commentCount > 0 && <span>댓글 {post.commentCount}</span>}
                  <span>👍 {post.upvoteCount || 0}</span>
                </PostMeta>
                <PostTitle>{post.title}</PostTitle>
              </PostCard>
            ))}
          </div>
        )
      )}

      {/* 댓글 탭 */}
      {activeTab === "comments" && (
        loadingComments ? <Loading>불러오는 중...</Loading>
        : comments === null ? (
          <Empty>댓글 목록을 불러오려면 Firebase 콘솔에서<br/>comments 컬렉션 그룹 인덱스를 설정해야 합니다.</Empty>
        )
        : comments.length === 0 ? <Empty>작성한 댓글이 없습니다.</Empty>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {comments.map((c) => (
              <CommentCard key={c.id}>
                <PostMeta>
                  {c.board && <BoardBadge>{BOARD_MAP[c.board] || c.board}</BoardBadge>}
                  {c.parentId && <span style={{ color: "var(--accent-indigo)", fontSize: "0.7rem" }}>↩ 답글</span>}
                  <span>{formatRelativeTime(c.createdAt)}</span>
                  {c.postTitle && c.board && (
                    <CommentLink onClick={() => navigate(`/community/${c.board}/${c.postId}`)}>
                      "{c.postTitle}" 게시글 →
                    </CommentLink>
                  )}
                </PostMeta>
                <CommentText>{c.content}</CommentText>
              </CommentCard>
            ))}
          </div>
        )
      )}

      {/* 갤러리 탭 */}
      {activeTab === "gallery" && (
        loadingGallery ? <Loading>불러오는 중...</Loading>
        : galleryPosts.length === 0 ? <Empty>등록한 갤러리 작품이 없습니다.</Empty>
        : (
          <GalleryGrid>
            {galleryPosts.map((post) => (
              <GalleryThumb key={post.id} onClick={() => navigate("/gallery")}>
                <img src={post.imageUrl} alt={post.title || ""} loading="lazy" />
              </GalleryThumb>
            ))}
          </GalleryGrid>
        )
      )}
    </Wrapper>
  );
}
