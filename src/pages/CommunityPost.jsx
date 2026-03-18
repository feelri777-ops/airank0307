import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  doc, getDoc, updateDoc, deleteDoc, collection, query,
  orderBy, getDocs, addDoc, setDoc, increment, serverTimestamp, writeBatch, onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_CATEGORIES } from "../constants";
import { formatRelativeTime } from "../utils";
import { BOARDS } from "./CommunityDashboard";
import { isAdmin } from "../hooks/useAdminGuard";
import { 
  PencilSimple, TrashSimple, 
  ThumbsUp, ThumbsUpFill, 
  ThumbsDown, ThumbsDownFill, 
  Siren 
} from "../components/icons/PhosphorIcons";

const CATEGORY_COLORS = {
  notice:   { bg: "#fee2e2", color: "#b91c1c", darkBg: "#450a0a", darkColor: "#fca5a5" },
  review:   { bg: "#dbeafe", color: "#1d4ed8", darkBg: "#1e3a5f", darkColor: "#60a5fa" },
  question: { bg: "#fef3c7", color: "#b45309", darkBg: "#4a3200", darkColor: "#fbbf24" },
  tips:     { bg: "#d1fae5", color: "#065f46", darkBg: "#063a28", darkColor: "#34d399" },
  free:     { bg: "#f3e8ff", color: "#7e22ce", darkBg: "#3b0764", darkColor: "#c084fc" },
};

const PageWrapper = styled.div`
  max-width: 860px; margin: 0 auto; padding: 2.5rem 1.5rem;
  @media (max-width: 600px) { padding: 1rem 0.3rem; }
`;
const BackButton = styled.button`
  display: inline-flex; align-items: center; gap: 0.3rem; background: transparent;
  border: none; color: var(--text-muted); font-size: 0.875rem; cursor: pointer;
  padding: 0; margin-bottom: 1.5rem; transition: color 0.2s;
  &:hover { color: var(--text-primary); }
`;
const PostCard = styled.article`
  background: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--r-md); padding: 1.25rem 2rem; margin-bottom: 1.5rem;
  @media (max-width: 600px) { padding: 0.75rem 0.5rem; }
`;
const PostHeaderRow = styled.div`display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem;`;
const CategoryBadge = styled.span`
  font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: var(--r-xs);
  background: ${({ $cat }) => CATEGORY_COLORS[$cat]?.bg || "#e2e8f0"};
  color: ${({ $cat }) => CATEGORY_COLORS[$cat]?.color || "#475569"};
  [data-theme="dark"] & {
    background: ${({ $cat }) => CATEGORY_COLORS[$cat]?.darkBg || "#1e293b"};
    color: ${({ $cat }) => CATEGORY_COLORS[$cat]?.darkColor || "#94a3b8"};
  }
`;
const PostTitle = styled.h1`
  font-family: "Outfit", sans-serif; font-size: 1.5rem; font-weight: 700;
  color: var(--text-primary); margin: 0.2rem 0 0.5rem; line-height: 1.4;
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
`;
const MetaRow = styled.div`
  display: flex; align-items: center; gap: 0.75rem;
  padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-primary); margin-bottom: 1rem;
`;
const AuthorAvatar = styled.img`width: 32px; height: 32px; border-radius: 50%; object-fit: cover;`;
const AuthorAvatarFallback = styled.div`
  width: 32px; height: 32px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; color: #fff; font-weight: 700;
`;
const MetaText = styled.div`display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;`;
const AuthorName = styled.span`font-size: 0.875rem; font-weight: 600; color: var(--text-primary);`;
const PostInfo = styled.span`font-size: 0.775rem; color: var(--text-muted);`;
const OwnerActions = styled.div`
  margin-left: auto; display: flex; gap: 0.4rem; justify-content: flex-end;
  @media (max-width: 600px) { gap: 0.2rem; }
`;
const SmallButton = styled.button`
  padding: 0.35rem 0.6rem; border: 1px solid var(--border-primary); border-radius: var(--r-xs);
  background: transparent; color: var(--text-muted); font-size: 1rem; cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center;
  &:hover {
    border-color: ${({ $danger }) => ($danger ? "#ef4444" : "var(--accent-indigo)")};
    color: ${({ $danger }) => ($danger ? "#ef4444" : "var(--accent-indigo)")};
    background: ${({ $danger }) => ($danger ? "rgba(239,68,68,0.05)" : "rgba(99,102,241,0.05)")};
  }
`;
const MarkdownContent = styled.div`
  color: var(--text-primary); font-size: 0.95rem; line-height: 1.85; min-height: 60px;
  h1, h2, h3, h4 { color: var(--text-primary); margin: 1.25rem 0 0.5rem; font-family: "Outfit", sans-serif; }
  p { margin: 0.6rem 0; }
  code { background: var(--bg-tertiary); padding: 0.15rem 0.4rem; border-radius: var(--r-xs); font-size: 0.85em; font-family: monospace; }
  pre { background: var(--bg-tertiary); padding: 1rem; border-radius: var(--r-sm); overflow-x: auto; margin: 0.75rem 0; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid var(--accent-indigo); margin: 0.75rem 0; padding: 0.25rem 0 0.25rem 1rem; color: var(--text-secondary); }
  a { color: var(--accent-indigo); text-decoration: underline; }
  ul, ol { padding-left: 1.5rem; margin: 0.5rem 0; }
  li { margin: 0.25rem 0; }
  hr { border: none; border-top: 1px solid var(--border-primary); margin: 1.25rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
  th, td { border: 1px solid var(--border-primary); padding: 0.4rem 0.75rem; font-size: 0.875rem; text-align: left; }
  th { background: var(--bg-tertiary); font-weight: 600; }
  img { max-width: 100%; border-radius: var(--r-xs); }
  strong { font-weight: 700; } em { font-style: italic; } del { text-decoration: line-through; color: var(--text-muted); }
`;
const ActionBar = styled.div`
  display: flex; justify-content: center; gap: 1rem;
  padding-top: 1.5rem; border-top: 1px solid var(--border-primary); margin-top: 1.5rem;
`;
const VoteButton = styled.button`
  display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem;
  border: 1px solid ${({ $active }) => $active ? "var(--text-primary)" : "var(--border-primary)"};
  border-radius: var(--r-lg);
  background: ${({ $active }) => $active ? "var(--bg-tertiary)" : "var(--bg-card)"};
  color: ${({ $active }) => $active ? "var(--text-primary)" : "var(--text-muted)"};
  font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
  &:hover { background: var(--bg-tertiary); border-color: var(--text-muted); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* ── 댓글 섹션 ── */
const CommentsSection = styled.div`
  background: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--r-md); padding: 1.5rem;
`;
const CommentSectionTitle = styled.h3`font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.25rem;`;
const CommentForm = styled.form`display: flex; gap: 0.75rem; margin-bottom: 1.5rem; align-items: flex-start;`;
const CommentTextarea = styled.textarea`
  flex: 1; padding: 0.65rem 0.9rem; border: 1px solid var(--border-primary);
  border-radius: var(--r-sm); background: var(--bg-secondary); color: var(--text-primary);
  font-size: 0.9rem; font-family: "Pretendard", sans-serif; resize: none; min-height: 72px;
  outline: none; line-height: 1.6;
  &:focus { border-color: var(--accent-indigo); }
  &::placeholder { color: var(--text-muted); }
`;
const CommentSubmitButton = styled.button`
  padding: 0.6rem 1.1rem; background: var(--accent-gradient); color: #fff; border: none;
  border-radius: var(--r-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: opacity 0.2s;
  &:hover { opacity: 0.85; } &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
const CommentList = styled.ul`list-style: none; padding: 0; margin: 0;`;
const CommentItem = styled.li`
  padding: 1rem 0; border-bottom: 1px solid var(--border-primary);
  display: flex; gap: 0.75rem; align-items: flex-start;
  &:last-child { border-bottom: none; }
`;
const ReplyItem = styled.li`
  padding: 0.75rem 0 0.75rem 0.75rem; display: flex; gap: 0.65rem; align-items: flex-start;
  border-left: 2px solid var(--border-primary); margin-left: 2.25rem; margin-top: 0.5rem;
`;
const CommentAvatar = styled.img`width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;`;
const CommentAvatarFallback = styled.div`
  width: 28px; height: 28px; border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; color: #fff; font-weight: 700; flex-shrink: 0;
`;
const CommentBody = styled.div`flex: 1; min-width: 0;`;
const CommentMeta = styled.div`display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem; flex-wrap: wrap;`;
const CommentAuthor = styled.span`font-size: 0.825rem; font-weight: 600; color: var(--text-primary);`;
const CommentTime = styled.span`font-size: 0.72rem; color: var(--text-muted);`;
const CommentActionBtn = styled.button`
  background: transparent; border: none; color: var(--text-muted);
  font-size: 0.72rem; cursor: pointer; padding: 0 2px; transition: color 0.15s;
  &:hover { color: ${({ $danger }) => $danger ? "#ef4444" : "var(--accent-indigo)"}; }
`;
const CommentContent = styled.p`
  font-size: 0.875rem; color: var(--text-primary); line-height: 1.65;
  margin: 0; white-space: pre-wrap; word-break: break-word;
`;
const DeletedCommentContent = styled.p`
  font-size: 0.825rem; color: var(--text-muted); font-style: italic;
  margin: 0; line-height: 1.5;
`;
const EditTextarea = styled.textarea`
  width: 100%; padding: 0.55rem 0.75rem; border: 1px solid var(--accent-indigo);
  border-radius: var(--r-sm); background: var(--bg-secondary); color: var(--text-primary);
  font-size: 0.875rem; font-family: "Pretendard", sans-serif; resize: none; min-height: 64px;
  outline: none; line-height: 1.6; box-sizing: border-box; margin-top: 0.4rem;
`;
const ReplyButton = styled.button`
  background: transparent; border: none; color: var(--text-muted);
  font-size: 0.75rem; cursor: pointer; padding: 0.3rem 0; margin-top: 0.4rem;
  transition: color 0.15s; display: flex; align-items: center; gap: 0.25rem;
  &:hover { color: var(--accent-indigo); }
`;
const ReplyFormWrap = styled.div`
  margin: 0.6rem 0 0.4rem 2.25rem; border-left: 2px solid var(--accent-indigo);
  padding-left: 0.75rem;
`;
const LoginPrompt = styled.p`font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;`;
const NotFound = styled.div`text-align: center; padding: 6rem 1rem; color: var(--text-muted); font-size: 1rem;`;

export default function CommunityPost() {
  const { board, postId } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();

  const boardInfo = BOARDS.find((b) => b.id === board);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [vote, setVote] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // 댓글 수정
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");

  // 대댓글
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    let postUnsub = null;
    let commentsUnsub = null;

    if (postId) {
      const postRef = doc(db, "communityPosts", postId);
      postUnsub = onSnapshot(postRef, (snap) => {
        if (!snap.exists()) { setNotFound(true); return; }
        setPost({ id: snap.id, ...snap.data() });
      });

      const commentsRef = query(
        collection(db, "communityPosts", postId, "comments"),
        orderBy("createdAt", "asc")
      );
      commentsUnsub = onSnapshot(commentsRef, (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      // 조회수 증가 (기존 로직 유지)
      updateDoc(postRef, { views: increment(1) }).catch(() => {});
    }

    return () => {
      if (postUnsub) postUnsub();
      if (commentsUnsub) commentsUnsub();
    };
  }, [postId]);

  useEffect(() => {
    if (!user) { setVote(null); return; }
    getDoc(doc(db, "communityVotes", `${user.uid}_${postId}`))
      .then((snap) => setVote(snap.exists() ? snap.data().type : null))
      .catch((err) => console.error("투표 정보 로드 오류:", err));
  }, [user, postId]);

  /* ── 투표 ── */
  const handleVote = async (type) => {
    if (!user) { alert("로그인 후 참여할 수 있습니다."); return; }
    if (isVoting) return;
    
    setIsVoting(true);
    const voteRef = doc(db, "communityVotes", `${user.uid}_${postId}`);
    const postRef = doc(db, "communityPosts", postId);
    
    try {
      if (vote === type) {
        // 투표 취소
        await deleteDoc(voteRef);
        const inc = type === "up" ? { upvoteCount: increment(-1) } : { downvoteCount: increment(-1) };
        await updateDoc(postRef, inc);
        setVote(null);
      } else {
        // 신규 투표 또는 투표 변경
        const batch = writeBatch(db);
        batch.set(voteRef, { 
          uid: user.uid, 
          postId, 
          type, 
          createdAt: serverTimestamp() 
        });
        
        let upInc = 0;
        let downInc = 0;
        
        if (vote === "up") upInc = -1;
        if (vote === "down") downInc = -1;
        if (type === "up") upInc += 1;
        if (type === "down") downInc += 1;
        
        const updateData = {};
        if (upInc !== 0) updateData.upvoteCount = increment(upInc);
        if (downInc !== 0) updateData.downvoteCount = increment(downInc);
        
        if (Object.keys(updateData).length > 0) {
          batch.update(postRef, updateData);
        }
        
        await batch.commit();
        setVote(type);
      }
    } catch (e) {
      console.error("투표 오류:", e);
      if (e.code === 'permission-denied') {
        alert("권한이 없습니다. (Firestore 보안 규칙 확인 필수)");
      } else {
        alert(`투표 처리 중 오류가 발생했습니다: ${e.message}`);
      }
    } finally {
      setIsVoting(false);
    }
  };

  /* ── 게시글 신고 ── */
  const handleReport = async () => {
    if (!user) { alert("로그인 후 신고할 수 있습니다."); return; }
    if (user.uid === post.uid) { alert("본인의 글은 신고할 수 없습니다."); return; }
    
    if (!window.confirm("이 게시물을 신고하시겠습니까? (부적절한 콘텐츠, 스팸 등)")) return;

    const reportRef = doc(db, "communityReports", `${user.uid}_${postId}`);
    const postRef = doc(db, "communityPosts", postId);

    try {
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) {
        alert("이미 신고한 게시물입니다.");
        return;
      }

      const batch = writeBatch(db);
      batch.set(reportRef, { 
        uid: user.uid, postId, board, 
        reportedAt: serverTimestamp() 
      });
      batch.update(postRef, { reportCount: increment(1) });
      
      await batch.commit();
      alert("신고가 접수되었습니다. 관리자 검토 후 조치하겠습니다.");
    } catch (e) {
      console.error("신고 오류:", e);
      alert("신고 처리 중 오류가 발생했습니다.");
    }
  };

  /* ── 게시글 삭제 ── */
  const handleDelete = async () => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "communityPosts", postId));
    navigate(`/community/${board}`);
  };

  /* ── 댓글 등록 ── */
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const newComment = {
        uid: user.uid,
        displayName: userData?.displayName || user.displayName || "익명",
        photoURL: userData?.photoURL || user.photoURL || "",
        content: commentText.trim(),
        parentId: null,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "communityPosts", postId, "comments"), newComment);
      await updateDoc(doc(db, "communityPosts", postId), { commentCount: increment(1) });
      setCommentText("");
    } catch (err) {
      console.error("댓글 오류:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  /* ── 댓글 수정 ── */
  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, "communityPosts", postId, "comments", commentId), {
        content: editText.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
    } catch (err) {
      console.error("댓글 수정 오류:", err);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  /* ── 댓글 삭제 ── */
  const handleDeleteComment = async (commentId, commentUid) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const hasReplies = comments.some((c) => c.parentId === commentId);
    const deletedBy = isAdmin(user) && user.uid !== commentUid ? "admin" : "author";
    try {
      if (hasReplies) {
        await updateDoc(doc(db, "communityPosts", postId, "comments", commentId), {
          deleted: true, deletedBy, deletedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, "communityPosts", postId, "comments", commentId));
      }
      await updateDoc(doc(db, "communityPosts", postId), { commentCount: increment(-1) });
    } catch (err) {
      console.error("댓글 삭제 오류:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  /* ── 대댓글 등록 ── */
  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim() || !user) return;
    setSubmittingReply(true);
    try {
      const newReply = {
        uid: user.uid,
        displayName: userData?.displayName || user.displayName || "익명",
        photoURL: userData?.photoURL || user.photoURL || "",
        content: replyText.trim(),
        parentId,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "communityPosts", postId, "comments"), newReply);
      await updateDoc(doc(db, "communityPosts", postId), { commentCount: increment(1) });
      setReplyingToId(null);
      setReplyText("");
    } catch (err) {
      console.error("대댓글 오류:", err);
      alert("답글 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const getCategoryLabel = (cat) => COMMUNITY_CATEGORIES.find((c) => c.id === cat)?.label || cat;
  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (id) => comments.filter((c) => c.parentId === id);
  const canDeleteComment = (c) => user && (user.uid === c.uid || isAdmin(user));
  const canEditComment = (c) => user && user.uid === c.uid && !c.deleted;

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

  /* ── 댓글/대댓글 단일 렌더 함수 ── */
  const renderComment = (c, isReply = false) => {
    const isEditing = editingCommentId === c.id;
    const Wrapper = isReply ? ReplyItem : CommentItem;
    return (
      <Wrapper key={c.id}>
        <span onClick={() => c.uid && navigate(`/user/${c.uid}`)} style={{ cursor: c.uid ? "pointer" : "default", flexShrink: 0 }}>
          {c.photoURL
            ? <CommentAvatar src={c.photoURL} alt={c.displayName} referrerPolicy="no-referrer" />
            : <CommentAvatarFallback>{(c.displayName || "?")[0].toUpperCase()}</CommentAvatarFallback>
          }
        </span>
        <CommentBody>
          <CommentMeta>
            <CommentAuthor onClick={() => c.uid && navigate(`/user/${c.uid}`)} style={{ cursor: c.uid ? "pointer" : "default" }}>{c.displayName || "익명"}</CommentAuthor>
            <CommentTime>{formatRelativeTime(c.createdAt)}</CommentTime>
            {c.updatedAt && !c.deleted && (
              <CommentTime>(수정됨 · {formatRelativeTime(c.updatedAt)})</CommentTime>
            )}
            {canEditComment(c) && (
              <CommentActionBtn
                onClick={() => {
                  setEditingCommentId(c.id);
                  setEditText(c.content);
                  setReplyingToId(null);
                }}
              >
                수정
              </CommentActionBtn>
            )}
            {canDeleteComment(c) && !c.deleted && (
              <CommentActionBtn $danger onClick={() => handleDeleteComment(c.id, c.uid)}>
                삭제
              </CommentActionBtn>
            )}
          </CommentMeta>

          {c.deleted ? (
            <DeletedCommentContent>
              {c.deletedBy === "admin"
                ? "관리자에 의해 삭제되었습니다."
                : "작성자에 의해 삭제되었습니다."}
            </DeletedCommentContent>
          ) : isEditing ? (
            <div>
              <EditTextarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <CommentSubmitButton
                  type="button"
                  onClick={() => handleEditComment(c.id)}
                  disabled={!editText.trim()}
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
                >
                  저장
                </CommentSubmitButton>
                <SmallButton onClick={() => setEditingCommentId(null)}>취소</SmallButton>
              </div>
            </div>
          ) : (
            <CommentContent>{c.content}</CommentContent>
          )}

          {/* 답글 버튼 (최상위 댓글만) */}
          {!isReply && !c.deleted && user && (
            <ReplyButton
              onClick={() => {
                setReplyingToId(replyingToId === c.id ? null : c.id);
                setReplyText("");
                setEditingCommentId(null);
              }}
            >
              ↩ 답글 {getReplies(c.id).length > 0 ? `${getReplies(c.id).length}개` : ""}
            </ReplyButton>
          )}
        </CommentBody>
      </Wrapper>
    );
  };

  return (
    <PageWrapper>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
        <BackButton onClick={() => navigate(backPath)} style={{ margin: 0 }}>
          ← {boardInfo ? `${boardInfo.name}` : "게시판"}
        </BackButton>
      </div>

      <PostCard>
        <PostTitle>
          {post.category && <CategoryBadge $cat={post.category}>{getCategoryLabel(post.category)}</CategoryBadge>}
          {post.title}
        </PostTitle>

        <MetaRow>
          <span onClick={() => post.uid && navigate(`/user/${post.uid}`)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: post.uid ? "pointer" : "default" }}>
            {post.photoURL
              ? <AuthorAvatar src={post.photoURL} alt={post.displayName} referrerPolicy="no-referrer" />
              : <AuthorAvatarFallback>{(post.displayName || "?")[0].toUpperCase()}</AuthorAvatarFallback>
            }
            <AuthorName>{post.displayName || "익명"}</AuthorName>
          </span>
          <MetaText>
            <span style={{ color: "var(--text-muted)", opacity: 0.5 }}>·</span>
            <PostInfo>{formatRelativeTime(post.createdAt)}</PostInfo>
            <span style={{ color: "var(--text-muted)", opacity: 0.5 }}>·</span>
            <PostInfo>조회 {post.views || 0}</PostInfo>
          </MetaText>
          {isOwner && (
            <OwnerActions>
              <SmallButton onClick={() => navigate(`/community/${board}/${postId}/edit`)} title="수정">
                <PencilSimple size={18} />
              </SmallButton>
              <SmallButton $danger onClick={handleDelete} title="삭제">
                <TrashSimple size={18} />
              </SmallButton>
            </OwnerActions>
          )}
        </MetaRow>

        <MarkdownContent>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </MarkdownContent>

        <ActionBar>
          <VoteButton 
            $active={vote === "up"} 
            onClick={() => handleVote("up")}
            disabled={isVoting}
          >
            {vote === "up" ? <ThumbsUpFill size={20} /> : <ThumbsUp size={20} />} {post.upvoteCount || 0}
          </VoteButton>
          <VoteButton 
            $active={vote === "down"} 
            onClick={() => handleVote("down")}
            disabled={isVoting}
          >
            {vote === "down" ? <ThumbsDownFill size={20} /> : <ThumbsDown size={20} />} {post.downvoteCount || 0}
          </VoteButton>
          <VoteButton 
            onClick={handleReport} 
            disabled={isVoting}
            style={{ marginLeft: "auto", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.8rem", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "5px" }}
          >
            <Siren size={18} /> 신고 {post.reportCount > 0 && <span>({post.reportCount})</span>}
          </VoteButton>
        </ActionBar>
      </PostCard>

      <CommentsSection>
        <CommentSectionTitle>댓글 {post.commentCount || 0}개</CommentSectionTitle>

        {user ? (
          <CommentForm onSubmit={handleCommentSubmit}>
            <CommentTextarea
              placeholder="댓글을 입력하세요..."
              value={commentText}
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
          {topLevelComments.length === 0 ? (
            <li style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "1rem 0" }}>
              첫 댓글을 남겨보세요!
            </li>
          ) : (
            topLevelComments.map((c) => (
              <li key={c.id} style={{ listStyle: "none" }}>
                {renderComment(c, false)}

                {/* 대댓글 목록 */}
                {getReplies(c.id).map((reply) => renderComment(reply, true))}

                {/* 대댓글 작성 폼 */}
                {replyingToId === c.id && user && (
                  <ReplyFormWrap>
                    <CommentTextarea
                      placeholder={`@${c.displayName || "익명"}에게 답글...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ minHeight: "56px", fontSize: "0.85rem" }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <CommentSubmitButton
                        type="button"
                        onClick={() => handleSubmitReply(c.id)}
                        disabled={submittingReply || !replyText.trim()}
                        style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}
                      >
                        {submittingReply ? "등록 중..." : "답글 등록"}
                      </CommentSubmitButton>
                      <SmallButton onClick={() => { setReplyingToId(null); setReplyText(""); }}>
                        취소
                      </SmallButton>
                    </div>
                  </ReplyFormWrap>
                )}
              </li>
            ))
          )}
        </CommentList>
      </CommentsSection>
    </PageWrapper>
  );
}
