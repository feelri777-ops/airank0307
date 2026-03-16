import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  collection, addDoc, doc, getDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_CATEGORIES } from "../constants";
import { isAdmin } from "../hooks/useAdminGuard";
import { BOARDS } from "./CommunityDashboard";
import RichEditor from "../components/editor/RichEditor";

const PageWrapper = styled.div`max-width: 860px; margin: 0 auto; padding: 2.5rem 1.5rem;`;
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
  transition: all 0.2s;
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

  const boardInfo = BOARDS.find((b) => b.id === board);

  const [category, setCategory] = useState("free");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) navigate(`/community/${board}`);
    if (!boardInfo) navigate("/community");
  }, [user, board, boardInfo, navigate]);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      const snap = await getDoc(doc(db, "communityPosts", postId));
      if (snap.exists()) {
        const data = snap.data();
        if (data.uid !== user?.uid) { navigate(`/community/${board}`); return; }
        setCategory(data.category || "free");
        setTitle(data.title);
        setContent(data.content);
      } else {
        navigate(`/community/${board}`);
      }
    };
    load();
  }, [isEdit, postId, user, board, navigate]);

  const handleSubmit = async () => {
    const plainText = content.replace(/<[^>]*>/g, "").trim();
    if (!title.trim() || !plainText) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateDoc(doc(db, "communityPosts", postId), {
          category, title: title.trim(), content, updatedAt: serverTimestamp(),
        });
        navigate(`/community/${board}/${postId}`);
      } else {
        const docRef = await addDoc(collection(db, "communityPosts"), {
          uid: user.uid,
          displayName: userData?.displayName || user.displayName || "익명",
          photoURL: userData?.photoURL || user.photoURL || "",
          board,
          category,
          title: title.trim(),
          content,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          views: 0,
          likeCount: 0,
          commentCount: 0,
        });
        navigate(`/community/${board}/${docRef.id}`);
      }
    } catch (e) {
      console.error("저장 오류:", e);
      alert("저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const writableCategories = COMMUNITY_CATEGORIES.filter((c) =>
    c.id !== "all" && (c.id !== "notice" || isAdmin(user))
  );
  const plainText = content.replace(/<[^>]*>/g, "").trim();

  if (!boardInfo) return null;

  return (
    <PageWrapper>
      <PageTitle>{isEdit ? "✏️ 게시글 수정" : `✏️ ${boardInfo.name} 글쓰기`}</PageTitle>

      <FormGroup>
        <Label>카테고리</Label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {writableCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </Select>
      </FormGroup>

      <FormGroup>
        <Label>제목</Label>
        <TitleInput
          type="text" placeholder="제목을 입력하세요"
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
        />
      </FormGroup>

      <FormGroup>
        <Label>내용</Label>
        <RichEditor
          value={content}
          onChange={setContent}
          postKey={postId || `new_${user?.uid}`}
          placeholder="내용을 입력하세요.&#10;&#10;텍스트 선택 시 버블 메뉴가 나타납니다.&#10;툴바에서 서식, 이모지, 링크를 삽입할 수 있어요."
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
