import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, query, orderBy, getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_CATEGORIES } from "../constants";
import { isAdmin } from "../hooks/useAdminGuard";
import { useCommunity } from "../context/CommunityContext";
// BOARDS는 Firestore에서 동적으로 불러옵니다.
import RichEditor from "../components/editor/RichEditor";

const PageWrapper = styled.div`
  max-width: 860px; margin: 0 auto; padding: 2.5rem 1.5rem;
  @media (max-width: 600px) { padding: 0.75rem 0.5rem; }
`;
const PageTitle = styled.h1`
  font-family: "Outfit", sans-serif; font-size: 1.5rem; font-weight: 700;
  color: var(--text-primary); margin-bottom: 1.75rem;
`;
const FormGroup = styled.div`margin-bottom: 1.25rem;`;
const Label = styled.label`
  display: block; font-size: 0.875rem; font-weight: 600;
  color: var(--text-secondary); margin-bottom: 0.4rem;
`;
const Select = styled.select`
  width: 200px; padding: 0.55rem 0.85rem; border: 1px solid var(--border-primary);
  border-radius: var(--r-sm); background: var(--bg-card); color: var(--text-primary);
  font-size: 0.9rem; cursor: pointer; outline: none;
  &:focus { border-color: var(--accent-indigo); }
`;
const TitleInput = styled.input`
  width: 100%; padding: 0.7rem 1rem; border: 1px solid var(--border-primary);
  border-radius: var(--r-sm); background: var(--bg-card); color: var(--text-primary);
  font-size: 1rem; outline: none; box-sizing: border-box;
  &:focus { border-color: var(--accent-indigo); }
  &::placeholder { color: var(--text-muted); }
`;
const ButtonRow = styled.div`display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;`;
const CancelButton = styled.button`
  padding: 0.6rem 1.5rem; border: 1px solid var(--border-primary); border-radius: var(--r-sm);
  background: transparent; color: var(--text-secondary); font-size: 0.9rem; cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  &:hover { border-color: var(--text-secondary); color: var(--text-primary); }
`;
const SubmitButton = styled.button`
  padding: 0.6rem 1.75rem; background: var(--accent-gradient); color: #fff;
  border: none; border-radius: var(--r-sm); font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export default function CommunityWrite() {
  const navigate = useNavigate();
  const { board, postId } = useParams();
  const { user, userData } = useAuth();
  const isEdit = Boolean(postId);

  const [category, setCategory] = useState("free");
  const [targetBoard, setTargetBoard] = useState(board); 
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState(""); // 추가: 해시태그
  const [summary, setSummary] = useState(""); // 추가: AI 요약
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { boards, loading: boardsLoading } = useCommunity();

  const boardInfo = boards.find((b) => b.id === (isEdit ? targetBoard : board));
  const isNoticeAdmin = isAdmin(user) && category === "notice";

  // 추가 보정: 카테고리가 공지 아닐 때 targetBoard 초기화
  useEffect(() => {
    if (category !== "notice") setTargetBoard(board);
  }, [category, board]);

  // 비로그인 사용자 튕겨내기
  useEffect(() => {
    if (!user) navigate(`/community/${board}`);
  }, [user, board, navigate]);

  // 데이터 불러오기 (수정 모드)
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      const snap = await getDoc(doc(db, "communityPosts", postId));
      if (snap.exists()) {
        const data = snap.data();
        if (data.uid !== user?.uid) { navigate(`/community/${board}`); return; }
        setCategory(data.category || "free");
        setTargetBoard(data.board || board);
        setTitle(data.title || "");
        setContent(data.content || "");
        setTags(data.tags?.join(", ") || "");
        setSummary(data.summary || "");
      } else {
        navigate(`/community/${board}`);
      }
    };
    load();
  }, [isEdit, postId, user, board, navigate]);

  // 자동 저장 (Local Storage)
  useEffect(() => {
    if (isEdit) return;
    const saved = localStorage.getItem(`draft_${board}`);
    if (saved) {
      try {
        const { title: t, content: c, tags: g, category: cat } = JSON.parse(saved);
        if (window.confirm("작성 중이던 임시 저장 글이 있습니다. 불러오시겠습니까?")) {
          setTitle(t || ""); setContent(c || ""); setTags(g || ""); setCategory(cat || "free");
        }
      } catch (e) {}
    }
  }, [board, isEdit]);

  useEffect(() => {
    if (isEdit || !title.trim()) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(`draft_${board}`, JSON.stringify({ title, content, tags, category }));
    }, 2000);
    return () => clearTimeout(timeout);
  }, [title, content, tags, category, board, isEdit]);

  const handleAISummary = async () => {
    const plainText = content.replace(/<[^>]*>/g, "").trim();
    if (plainText.length < 50) { alert("본문이 너무 짧습니다. 최소 50자 이상 작성해 주세요."); return; }
    
    setIsSummarizing(true);
    // TODO: 실제 Claude API 또는 서버리스 함수 연결 필요
    // 현재는 시각적 효과를 위해 1.5초 대기 후 상단 200자 기반으로 시뮬레이션
    setTimeout(() => {
      const mockSummary = plainText.slice(0, 150) + "... (AI가 핵심 내용을 요약했습니다)";
      setSummary(mockSummary);
      setIsSummarizing(false);
    }, 1500);
  };

  const handleSubmit = async () => {
    const plainText = content.replace(/<[^>]*>/g, "").trim();
    if (!title.trim() || !plainText) return;
    setSubmitting(true);
    const finalBoard = isNoticeAdmin ? targetBoard : board;
    
    const postData = {
      board: finalBoard, 
      category, 
      title: title.trim(), 
      content,
      tags: tags.split(",").map(t => t.trim()).filter(t => t),
      summary: summary.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (isEdit) {
        await updateDoc(doc(db, "communityPosts", postId), postData);
        navigate(finalBoard === "all" ? `/community/${board}` : `/community/${finalBoard}/${postId}`);
      } else {
        const docRef = await addDoc(collection(db, "communityPosts"), {
          ...postData,
          uid: user.uid,
          displayName: userData?.displayName || user.displayName || "익명",
          photoURL: userData?.photoURL || user.photoURL || "",
          createdAt: serverTimestamp(),
          views: 0,
          commentCount: 0,
          upvoteCount: 0,
          downvoteCount: 0,
        });
        localStorage.removeItem(`draft_${board}`);
        navigate(finalBoard === "all" ? `/community/${board}` : `/community/${finalBoard}/${docRef.id}`);
      }
    } catch (e) {
      console.error("저장 오류:", e);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 렌더링 생략 (기존 코드 유지 및 필드 추가)
  const writableCategories = COMMUNITY_CATEGORIES.filter((c) =>
    c.id !== "all" && (c.id !== "notice" || isAdmin(user))
  );
  const plainText = content.replace(/<[^>]*>/g, "").trim();

  if (!boardInfo) return null;

  return (
    <PageWrapper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <PageTitle style={{ marginBottom: 0 }}>
          {isEdit ? "✏️ 게시글 수정" : `✏️ ${boardInfo?.name || ""} 글쓰기`}
        </PageTitle>
        {!isEdit && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ✨ 실시간 자동 저장 중
          </div>
        )}
      </div>

      <FormGroup>
        <Label>카테고리</Label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {writableCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </Select>
      </FormGroup>

      {/* 공지 게시판 선택 — 관리자만 표시 */}
      {isNoticeAdmin && (
        <FormGroup>
          <Label>게시 게시판</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <Select
              value={targetBoard}
              onChange={(e) => setTargetBoard(e.target.value)}
              style={{ width: "auto" }}
            >
              <option value="all">📢 모든 게시판</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
        </FormGroup>
      )}

      <FormGroup>
        <Label>제목</Label>
        <TitleInput
          type="text" placeholder="제목을 입력하세요"
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
        />
      </FormGroup>

      <FormGroup>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <Label style={{ marginBottom: 0 }}>내용</Label>
          <button 
            onClick={handleAISummary}
            disabled={isSummarizing || content.length < 50}
            style={{ 
              fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
              color: 'var(--accent-indigo)', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {isSummarizing ? "⏳ 요약 중..." : "✨ AI 3줄 요약"}
          </button>
        </div>
        
        {summary && (
          <div style={{ 
            padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', 
            border: '1px dashed var(--accent-indigo)', marginBottom: '10px', fontSize: '0.85rem',
            color: 'var(--text-primary)', position: 'relative'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-indigo)', marginBottom: '4px' }}>AI SUMMARY</div>
            {summary}
            <button 
              onClick={() => setSummary("")}
              style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >❌</button>
          </div>
        )}

        <RichEditor
          value={content}
          onChange={setContent}
          postKey={postId || `new_${user?.uid}`}
          placeholder="내용을 입력하세요.&#10;&#10;텍스트 선택 시 버블 메뉴가 나타납니다.&#10;툴바에서 서식, 컬러, 미디어를 삽입할 수 있어요."
        />
      </FormGroup>

      <FormGroup>
        <Label>해시태그 (쉼표로 구분)</Label>
        <TitleInput 
          type="text" 
          placeholder="#AI #커서 #추천 (최대 5개)" 
          value={tags} 
          onChange={(e) => setTags(e.target.value)}
        />
      </FormGroup>

      <ButtonRow>
        <CancelButton onClick={() => navigate(-1)}>취소</CancelButton>
        <SubmitButton
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !plainText}
        >
          {submitting ? "저장 중..." : isEdit ? "수정 완료" : "게시하기"}
        </SubmitButton>
      </ButtonRow>
    </PageWrapper>
  );
}

