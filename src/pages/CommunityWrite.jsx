import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  collection, addDoc, doc, getDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_CATEGORIES } from "../constants";
import { BOARDS } from "./CommunityDashboard";

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
  border-radius: 8px; background: var(--bg-card); color: var(--text-primary);
  font-size: 0.9rem; cursor: pointer; outline: none;
  &:focus { border-color: var(--accent-indigo); }
`;
const TitleInput = styled.input`
  width: 100%; padding: 0.7rem 1rem; border: 1px solid var(--border-primary);
  border-radius: 8px; background: var(--bg-card); color: var(--text-primary);
  font-size: 1rem; outline: none; box-sizing: border-box;
  &:focus { border-color: var(--accent-indigo); }
  &::placeholder { color: var(--text-muted); }
`;
const ToolbarWrap = styled.div`
  display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
  padding: 6px 8px; background: var(--bg-tertiary);
  border: 1px solid var(--border-primary); border-radius: 8px 8px 0 0;
  border-bottom: none;
`;
const ToolBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  min-width: 28px; height: 28px; padding: 0 6px;
  border: none; border-radius: 5px; background: transparent;
  color: var(--text-secondary); font-size: 0.78rem; font-weight: 700;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
  &:hover { background: var(--bg-card); color: var(--text-primary); }
`;
const ToolDivider = styled.div`width: 1px; height: 18px; background: var(--border-primary); margin: 0 3px;`;

const EditorTabs = styled.div`
  display: flex; gap: 0; border-bottom: 1px solid var(--border-primary); margin-bottom: 0;
`;
const EditorTab = styled.button`
  padding: 0.5rem 1.25rem;
  border: 1px solid ${({ $active }) => ($active ? "var(--border-primary)" : "transparent")};
  border-bottom: ${({ $active }) => ($active ? "1px solid var(--bg-card)" : "1px solid var(--border-primary)")};
  margin-bottom: -1px; background: ${({ $active }) => ($active ? "var(--bg-card)" : "transparent")};
  color: ${({ $active }) => ($active ? "var(--text-primary)" : "var(--text-muted)")};
  font-size: 0.875rem; font-weight: ${({ $active }) => ($active ? "600" : "400")};
  cursor: pointer; border-radius: 6px 6px 0 0; transition: all 0.15s;
`;
const ContentTextarea = styled.textarea`
  width: 100%; min-height: 300px; padding: 1rem;
  border: 1px solid var(--border-primary); border-top: none; border-radius: 0;
  background: var(--bg-card); color: var(--text-primary); font-size: 0.9rem;
  font-family: "Pretendard", monospace; line-height: 1.7; resize: vertical;
  outline: none; box-sizing: border-box;
  &:focus { border-color: var(--accent-indigo); }
  &::placeholder { color: var(--text-muted); }
`;
const PreviewBox = styled.div`
  min-height: 300px; padding: 1rem 1.25rem;
  border: 1px solid var(--border-primary); border-top: none; border-radius: 0 0 8px 8px;
  background: var(--bg-card); color: var(--text-primary); font-size: 0.9rem; line-height: 1.8;
  h1, h2, h3 { color: var(--text-primary); margin: 1rem 0 0.5rem; }
  p { margin: 0.5rem 0; }
  code { background: var(--bg-tertiary); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
  pre { background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; overflow-x: auto; }
  blockquote { border-left: 3px solid var(--accent-indigo); margin: 0.5rem 0; padding-left: 1rem; color: var(--text-secondary); }
  a { color: var(--accent-indigo); }
  hr { border: none; border-top: 1px solid var(--border-primary); margin: 1rem 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid var(--border-primary); padding: 0.4rem 0.75rem; font-size: 0.875rem; }
  th { background: var(--bg-tertiary); }
`;
const HintText = styled.p`font-size: 0.78rem; color: var(--text-muted); margin-top: 0.4rem;`;
const ButtonRow = styled.div`display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;`;
const CancelButton = styled.button`
  padding: 0.6rem 1.5rem; border: 1px solid var(--border-primary); border-radius: 8px;
  background: transparent; color: var(--text-secondary); font-size: 0.9rem; cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: var(--text-secondary); color: var(--text-primary); }
`;
const SubmitButton = styled.button`
  padding: 0.6rem 1.75rem; background: var(--accent-gradient); color: #fff;
  border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export default function CommunityWrite() {
  const navigate = useNavigate();
  const { board, postId } = useParams();
  const { user } = useAuth();
  const isEdit = Boolean(postId);

  const boardInfo = BOARDS.find((b) => b.id === board);

  const [category, setCategory] = useState("free");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tab, setTab] = useState("edit");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const applyFormat = (syntax, placeholder = "텍스트") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    let newText = "";
    let cursorOffset = 0;

    if (syntax === "wrap") {
      newText = content.slice(0, start) + selected + content.slice(end);
    } else if (typeof syntax === "function") {
      const result = syntax(selected);
      newText = content.slice(0, start) + result + content.slice(end);
      cursorOffset = result.length;
    }
    setContent(newText);
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + cursorOffset;
      el.selectionEnd = start + cursorOffset;
    }, 0);
  };

  const fmt = (prefix, suffix = prefix, ph = "텍스트") => () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || ph;
    const result = prefix + selected + suffix;
    const newText = content.slice(0, start) + result + content.slice(end);
    setContent(newText);
    setTimeout(() => { el.focus(); el.selectionStart = start + prefix.length; el.selectionEnd = start + prefix.length + selected.length; }, 0);
  };

  const insertLine = (prefix, ph = "텍스트") => () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const result = prefix + (content.slice(start, el.selectionEnd) || ph);
    const newText = content.slice(0, lineStart) + result + content.slice(el.selectionEnd);
    setContent(newText);
    setTimeout(() => { el.focus(); el.selectionStart = lineStart + prefix.length; el.selectionEnd = lineStart + result.length; }, 0);
  };

  const insertSnippet = (snippet, placeholderLen = 0) => () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const newText = content.slice(0, start) + snippet + content.slice(start);
    setContent(newText);
    setTimeout(() => { el.focus(); el.selectionStart = start + snippet.length - placeholderLen; el.selectionEnd = start + snippet.length; }, 0);
  };

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
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateDoc(doc(db, "communityPosts", postId), {
          category, title: title.trim(), content: content.trim(), updatedAt: serverTimestamp(),
        });
        navigate(`/community/${board}/${postId}`);
      } else {
        const docRef = await addDoc(collection(db, "communityPosts"), {
          uid: user.uid,
          displayName: user.displayName || "익명",
          photoURL: user.photoURL || "",
          board,
          category,
          title: title.trim(),
          content: content.trim(),
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

  const writableCategories = COMMUNITY_CATEGORIES.filter((c) => c.id !== "all");

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

        {/* 마크다운 툴바 */}
        <ToolbarWrap>
          <ToolBtn title="굵게 (Ctrl+B)" onClick={fmt("**", "**", "굵게")}><b>B</b></ToolBtn>
          <ToolBtn title="기울임" onClick={fmt("*", "*", "기울임")}><i>I</i></ToolBtn>
          <ToolBtn title="취소선" onClick={fmt("~~", "~~", "취소선")} style={{ textDecoration: "line-through" }}>S</ToolBtn>
          <ToolDivider />
          <ToolBtn title="제목 1" onClick={insertLine("# ", "제목")}>H1</ToolBtn>
          <ToolBtn title="제목 2" onClick={insertLine("## ", "제목")}>H2</ToolBtn>
          <ToolBtn title="제목 3" onClick={insertLine("### ", "제목")}>H3</ToolBtn>
          <ToolDivider />
          <ToolBtn title="인라인 코드" onClick={fmt("`", "`", "코드")}>{"`코드`"}</ToolBtn>
          <ToolBtn title="코드 블럭" onClick={insertSnippet("\n```\n코드\n```\n", 2)}>{"{ }"}</ToolBtn>
          <ToolDivider />
          <ToolBtn title="인용" onClick={insertLine("> ", "인용")}>&gt;</ToolBtn>
          <ToolBtn title="구분선" onClick={insertSnippet("\n---\n")}>—</ToolBtn>
          <ToolDivider />
          <ToolBtn title="순서없는 목록" onClick={insertLine("- ", "항목")}>• 목록</ToolBtn>
          <ToolBtn title="순서있는 목록" onClick={insertLine("1. ", "항목")}>1. 목록</ToolBtn>
          <ToolDivider />
          <ToolBtn title="링크" onClick={fmt("[", "](URL)", "링크 텍스트")}>🔗</ToolBtn>
          <ToolBtn title="이미지" onClick={insertSnippet("![이미지 설명](URL)", 3)}>🖼</ToolBtn>
        </ToolbarWrap>

        <EditorTabs>
          <EditorTab $active={tab === "edit"} onClick={() => setTab("edit")}>편집</EditorTab>
          <EditorTab $active={tab === "preview"} onClick={() => setTab("preview")}>미리보기</EditorTab>
        </EditorTabs>
        {tab === "edit" ? (
          <ContentTextarea
            ref={textareaRef}
            placeholder={`내용을 입력하세요.\n\n툴바 버튼으로 간편하게 마크다운을 적용하거나\n직접 입력할 수 있어요.`}
            value={content} onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          <PreviewBox>
            {content.trim()
              ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              : <span style={{ color: "var(--text-muted)" }}>미리보기할 내용이 없습니다.</span>
            }
          </PreviewBox>
        )}
        <HintText>마크다운 문법을 지원합니다. (굵게, 기울임, 제목, 코드블럭, 테이블 등)</HintText>
      </FormGroup>

      <ButtonRow>
        <CancelButton onClick={() => navigate(-1)}>취소</CancelButton>
        <SubmitButton
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          {submitting ? "저장 중..." : isEdit ? "수정 완료" : "게시하기"}
        </SubmitButton>
      </ButtonRow>
    </PageWrapper>
  );
}
