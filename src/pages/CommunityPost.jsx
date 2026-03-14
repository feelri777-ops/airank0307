import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  doc, getDoc, updateDoc, deleteDoc, collection, query, where,
  orderBy, getDocs, addDoc, setDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_CATEGORIES } from "../constants";
import { formatRelativeTime } from "../utils";
import { BOARDS } from "./CommunityDashboard";

const CATEGORY_COLORS = {
  review:   { bg: "#dbeafe", color: "#1d4ed8", darkBg: "#1e3a5f", darkColor: "#60a5fa" },
  question: { bg: "#fef3c7", color: "#b45309", darkBg: "#4a3200", darkColor: "#fbbf24" },
  tips:     { bg: "#d1fae5", color: "#065f46", darkBg: "#063a28", darkColor: "#34d399" },
  free:     { bg: "#f3e8ff", color: "#7e22ce", darkBg: "#3b0764", darkColor: "#c084fc" },
};

const PageWrapper = styled.div`max-width: 860px; margin: 0 auto; padding: 2.5rem 1.5rem;`;
const BackButton = styled.button`
  display: inline-flex; align-items: center; gap: 0.3rem; background: transparent;
  border: none; color: var(--text-muted); font-size: 0.875rem; cursor: pointer;
  padding: 0; margin-bottom: 1.5rem; transition: color 0.2s;
  &:hover { color: var(--text-primary); }
`;
const PostCard = styled.article`
  background: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem;
`;
const PostHeaderRow = styled.div`display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;`;
const CategoryBadge = styled.span`
  font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px;
  background: ${({ $cat }) => CATEGORY_COLORS[$cat]?.bg || "#e2e8f0"};
  color: ${({ $cat }) => CATEGORY_COLORS[$cat]?.color || "#475569"};
  [data-theme="dark"] & {
    background: ${({ $cat }) => CATEGORY_COLORS[$cat]?.darkBg || "#1e293b"};
    color: ${({ $cat }) => CATEGORY_COLORS[$cat]?.darkColor || "#94a3b8"};
  }
`;
const PostTitle = styled.h1`
  font-family: "Outfit", sans-serif; font-size: 1.5rem; font-weight: 700;
  color: var(--text-primary); margin: 0 0 1rem; line-height: 1.4;
`;
const MetaRow = styled.div`
  display: flex; align-items: center; gap: 1rem;
  padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-primary); margin-bottom: 1.5rem;
`;
const AuthorAvatar = styled.img`width: 32px; height: 32px; border-radius: 50%; object-fit: cover;`;
const AuthorAvatarFallback = styled.div`
  width: 32px; height: 32px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; color: #fff; font-weight: 700;
`;
const MetaText = styled.div`display: flex; flex-direction: column; gap: 0.15rem;`;
const AuthorName = styled.span`font-size: 0.875rem; font-weight: 600; color: var(--text-primary);`;
const PostInfo = styled.span`font-size: 0.775rem; color: var(--text-muted);`;
const OwnerActions = styled.div`margin-left: auto; display: flex; gap: 0.5rem;`;
const SmallButton = styled.button`
  padding: 0.35rem 0.85rem; border: 1px solid var(--border-primary); border-radius: 6px;
  background: transparent; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; transition: all 0.15s;
  &:hover {
    border-color: ${({ $danger }) => ($danger ? "#ef4444" : "var(--accent-indigo)")};
    color: ${({ $danger }) => ($danger ? "#ef4444" : "var(--accent-indigo)")};
  }
`;
const MarkdownContent = styled.div`
  color: var(--text-primary); font-size: 0.95rem; line-height: 1.85; min-height: 60px;
  h1, h2, h3, h4 { color: var(--text-primary); margin: 1.25rem 0 0.5rem; font-family: "Outfit", sans-serif; }
  p { margin: 0.6rem 0; }
  code { background: var(--bg-tertiary); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; font-family: monospace; }
  pre { background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 0.75rem 0; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid var(--accent-indigo); margin: 0.75rem 0; padding: 0.25rem 0 0.25rem 1rem; color: var(--text-secondary); }
  a { color: var(--accent-indigo); text-decoration: underline; }
  ul, ol { padding-left: 1.5rem; margin: 0.5rem 0; }
  li { margin: 0.25rem 0; }
  hr { border: none; border-top: 1px solid var(--border-primary); margin: 1.25rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
  th, td { border: 1px solid var(--border-primary); padding: 0.4rem 0.75rem; font-size: 0.875rem; text-align: left; }
  th { background: var(--bg-tertiary); font-weight: 600; }
  img { max-width: 100%; border-radius: 6px; }
  strong { font-weight: 700; } em { font-style: italic; } del { text-decoration: line-through; color: var(--text-muted); }
`;
const ActionBar = styled.div`
  display: flex; justify-content: center;
  padding-top: 1.5rem; border-top: 1px solid var(--border-primary); margin-top: 1.5rem;
`;
const LikeButton = styled.button`
  display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.5rem;
  border: 1px solid ${({ $liked }) => ($liked ? "#ef4444" : "var(--border-primary)")};
  border-radius: 24px;
  background: ${({ $liked }) => ($liked ? "rgba(239,68,68,0.08)" : "transparent")};
  color: ${({ $liked }) => ($liked ? "#ef4444" : "var(--text-muted)")};
  font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.06); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const CommentsSection = styled.div`
  background: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: 12px; padding: 1.5rem;
`;
const CommentSectionTitle = styled.h3`font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.25rem;`;
const CommentForm = styled.form`display: flex; gap: 0.75rem; margin-bottom: 1.5rem; align-items: flex-start;`;
const CommentTextarea = styled.textarea`
  flex: 1; padding: 0.65rem 0.9rem; border: 1px solid var(--border-primary);
  border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary);
  font-size: 0.9rem; font-family: "Pretendard", sans-serif; resize: none; min-height: 72px;
  outline: none; line-height: 1.6;
  &:focus { border-color: var(--accent-indigo); }
  &::placeholder { color: var(--text-muted); }
`;
const CommentSubmitButton = styled.button`
  padding: 0.6rem 1.1rem; background: var(--accent-gradient); color: #fff; border: none;
  border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: opacity 0.2s;
  &:hover { opacity: 0.85; } &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
const CommentList = styled.ul`list-style: none; padding: 0; margin: 0;`;
const CommentItem = styled.li`
  padding: 1rem 0; border-bottom: 1px solid var(--border-primary);
  display: flex; gap: 0.75rem; align-items: flex-start;
  &:last-child { border-bottom: none; }
`;
const CommentAvatar = styled.img`width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;`;
const CommentAvatarFallback = styled.div`
  width: 28px; height: 28px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; color: #fff; font-weight: 700; flex-shrink: 0;
`;
const CommentBody = styled.div`flex: 1; min-width: 0;`;
const CommentMeta = styled.div`display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;`;
const CommentAuthor = styled.span`font-size: 0.825rem; font-weight: 600; color: var(--text-primary);`;
const CommentTime = styled.span`font-size: 0.75rem; color: var(--text-muted);`;
const DeleteCommentBtn = styled.button`
  margin-left: auto; background: transparent; border: none; color: var(--text-muted);
  font-size: 0.75rem; cursor: pointer; padding: 0; transition: color 0.15s;
  &:hover { color: #ef4444; }
`;
const CommentContent = styled.p`
  font-size: 0.875rem; color: var(--text-primary); line-height: 1.65;
  margin: 0; white-space: pre-wrap; word-break: break-word;
`;
const LoginPrompt = styled.p`font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;`;
const NotFound = styled.div`text-align: center; padding: 6rem 1rem; color: var(--text-muted); font-size: 1rem;`;

export default function CommunityPost() {
  const { board, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const boardInfo = BOARDS.find((b) => b.id === board);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "communityPosts", postId);
      const snap = await getDoc(ref);
      if (!snap.exists()) { setNotFound(true); return; }
      setPost({ id: snap.id, ...snap.data() });
      await updateDoc(ref, { views: increment(1) });
    };
    load();
  }, [postId]);

  useEffect(() => {
    const loadComments = async () => {
      const q = query(
        collection(db, "communityComments"),
        where("postId", "==", postId),
        orderBy("createdAt", "asc")
      );
      const snap = await getDocs(q);
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadComments();
  }, [postId]);

  useEffect(() => {
    if (!user) { setLiked(false); return; }
    getDoc(doc(db, "communityLikes", `${user.uid}_${postId}`))
      .then((snap) => setLiked(snap.exists()));
  }, [user, postId]);

  const handleLike = async () => {
    if (!user) { alert("로그인 후 추천할 수 있습니다."); return; }
    const likeRef = doc(db, "communityLikes", `${user.uid}_${postId}`);
    const postRef = doc(db, "communityPosts", postId);
    if (liked) {
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likeCount: increment(-1) });
      setPost((p) => ({ ...p, likeCount: (p.likeCount || 1) - 1 }));
      setLiked(false);
    } else {
      await setDoc(likeRef, { uid: user.uid, postId });
      await updateDoc(postRef, { likeCount: increment(1) });
      setPost((p) => ({ ...p, likeCount: (p.likeCount || 0) + 1 }));
      setLiked(true);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "communityPosts", postId));
    navigate(`/community/${board}`);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const newComment = {
        postId, uid: user.uid,
        displayName: user.displayName || "익명",
        photoURL: user.photoURL || "",
        content: commentText.trim(),
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "communityComments"), newComment);
      await updateDoc(doc(db, "communityPosts", postId), { commentCount: increment(1) });
      setComments((prev) => [...prev, { id: ref.id, ...newComment, createdAt: { toDate: () => new Date() } }]);
      setPost((p) => ({ ...p, commentCount: (p.commentCount || 0) + 1 }));
      setCommentText("");
    } catch (err) {
      console.error("댓글 오류:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "communityComments", commentId));
    await updateDoc(doc(db, "communityPosts", postId), { commentCount: increment(-1) });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPost((p) => ({ ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) }));
  };

  const getCategoryLabel = (cat) => COMMUNITY_CATEGORIES.find((c) => c.id === cat)?.label || cat;

  const backPath = `/community/${board}`;

  if (notFound) return (
    <PageWrapper>
      <BackButton onClick={() => navigate(backPath)}>← {boardInfo?.name || "게시판"}</BackButton>
      <NotFound>존재하지 않는 게시글입니다.</NotFound>
    </PageWrapper>
  );

  if (!post) return (
    <PageWrapper>
      <BackButton onClick={() => navigate(backPath)}>← {boardInfo?.name || "게시판"}</BackButton>
      <NotFound style={{ padding: "4rem" }}>불러오는 중...</NotFound>
    </PageWrapper>
  );

  const isOwner = user && user.uid === post.uid;

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(backPath)}>
        ← {boardInfo ? `${boardInfo.icon} ${boardInfo.name}` : "게시판"}
      </BackButton>

      <PostCard>
        <PostHeaderRow>
          {post.category && <CategoryBadge $cat={post.category}>{getCategoryLabel(post.category)}</CategoryBadge>}
        </PostHeaderRow>

        <PostTitle>{post.title}</PostTitle>

        <MetaRow>
          {post.photoURL
            ? <AuthorAvatar src={post.photoURL} alt={post.displayName} referrerPolicy="no-referrer" />
            : <AuthorAvatarFallback>{(post.displayName || "?")[0].toUpperCase()}</AuthorAvatarFallback>
          }
          <MetaText>
            <AuthorName>{post.displayName || "익명"}</AuthorName>
            <PostInfo>{formatRelativeTime(post.createdAt)} · 조회 {post.views || 0}</PostInfo>
          </MetaText>
          {isOwner && (
            <OwnerActions>
              <SmallButton onClick={() => navigate(`/community/${board}/${postId}/edit`)}>수정</SmallButton>
              <SmallButton $danger onClick={handleDelete}>삭제</SmallButton>
            </OwnerActions>
          )}
        </MetaRow>

        <MarkdownContent>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </MarkdownContent>

        <ActionBar>
          <LikeButton $liked={liked} onClick={handleLike}>♥ 추천 {post.likeCount || 0}</LikeButton>
        </ActionBar>
      </PostCard>

      <CommentsSection>
        <CommentSectionTitle>댓글 {post.commentCount || 0}개</CommentSectionTitle>
        {user ? (
          <CommentForm onSubmit={handleCommentSubmit}>
            <CommentTextarea
              placeholder="댓글을 입력하세요..." value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <CommentSubmitButton type="submit" disabled={submittingComment || !commentText.trim()}>
              등록
            </CommentSubmitButton>
          </CommentForm>
        ) : (
          <LoginPrompt>로그인 후 댓글을 작성할 수 있습니다.</LoginPrompt>
        )}

        <CommentList>
          {comments.length === 0 ? (
            <li style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "1rem 0" }}>
              첫 댓글을 남겨보세요!
            </li>
          ) : (
            comments.map((c) => (
              <CommentItem key={c.id}>
                {c.photoURL
                  ? <CommentAvatar src={c.photoURL} alt={c.displayName} referrerPolicy="no-referrer" />
                  : <CommentAvatarFallback>{(c.displayName || "?")[0].toUpperCase()}</CommentAvatarFallback>
                }
                <CommentBody>
                  <CommentMeta>
                    <CommentAuthor>{c.displayName || "익명"}</CommentAuthor>
                    <CommentTime>{formatRelativeTime(c.createdAt)}</CommentTime>
                    {user && user.uid === c.uid && (
                      <DeleteCommentBtn onClick={() => handleDeleteComment(c.id)}>삭제</DeleteCommentBtn>
                    )}
                  </CommentMeta>
                  <CommentContent>{c.content}</CommentContent>
                </CommentBody>
              </CommentItem>
            ))
          )}
        </CommentList>
      </CommentsSection>
    </PageWrapper>
  );
}
