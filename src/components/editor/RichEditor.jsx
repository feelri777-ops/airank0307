import { useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import FileUploader from "./FileUploader";

/* ─── 이모지 목록 ─── */
const EMOJI_LIST = [
  "😀","😂","🥹","😍","🤔","😎","🥳","😭","🙏","😅",
  "👍","👎","👏","🔥","💯","❤️","✅","⭐","🎉","💡",
  "📌","📎","✏️","📝","💬","🔗","🖼️","📊","🚀","🤖",
  "🤣","😊","🥰","🤩","😇","🤗","😏","😒","😔","😤",
  "🌟","💫","✨","⚡","🎯","🏆","🎨","🎵","📸","🔍",
];

/* ─── styled ─── */
const Wrap = styled.div`position: relative; width: 100%; overflow: hidden;`;

const Toolbar = styled.div`
  display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-sm) 10px 0 0;
  border-bottom: none;
  user-select: none;
`;

const TB = styled.button`
  display: flex; align-items: center; justify-content: center;
  min-width: 30px; height: 30px; padding: 0 7px;
  border: none; border-radius: var(--r-xs); background: ${({ $active }) => $active ? "var(--bg-card)" : "transparent"};
  color: ${({ $active }) => $active ? "var(--text-primary)" : "var(--text-secondary)"};
  font-size: 0.8rem; font-weight: 700; cursor: pointer;
  transition: all 0.12s; white-space: nowrap;
  box-shadow: ${({ $active }) => $active ? "0 1px 3px rgba(0,0,0,0.1)" : "none"};
  &:hover { background: var(--bg-card); color: var(--text-primary); }
`;

const TDiv = styled.div`width: 1px; height: 20px; background: var(--border-primary); margin: 0 3px; flex-shrink: 0;`;

const EditorArea = styled.div`
  min-height: 320px; max-height: 600px; overflow-y: auto; overflow-x: hidden;
  width: 100%; box-sizing: border-box;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--border-primary);
  border-radius: 0 0 10px 10px;
  background: var(--bg-card); color: var(--text-primary);
  font-size: 0.95rem; line-height: 1.85;
  font-family: var(--font-main); outline: none;
  cursor: text; word-break: break-word; overflow-wrap: break-word;
  transition: border-color 0.15s;
  &:focus { border-color: var(--accent-indigo); }

  /* placeholder */
  &:empty::before {
    content: attr(data-placeholder);
    color: var(--text-muted);
    pointer-events: none;
  }

  /* 내부 스타일 */
  h1 { font-size: 1.6rem; font-weight: 800; margin: 0.8rem 0 0.4rem; color: var(--text-primary); }
  h2 { font-size: 1.25rem; font-weight: 700; margin: 0.7rem 0 0.35rem; color: var(--text-primary); }
  h3 { font-size: 1.05rem; font-weight: 600; margin: 0.6rem 0 0.3rem; color: var(--text-primary); }
  p { margin: 0.3rem 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  s { text-decoration: line-through; }
  ul { margin: 0.4rem 0; padding-left: 1.4rem; list-style: disc; }
  ol { margin: 0.4rem 0; padding-left: 1.4rem; list-style: decimal; }
  li { margin: 0.15rem 0; }
  blockquote {
    border-left: 3px solid var(--accent-indigo);
    margin: 0.6rem 0; padding: 0.4rem 1rem;
    color: var(--text-secondary); background: var(--bg-secondary);
    border-radius: 0 6px 6px 0;
  }
  pre {
    background: var(--bg-tertiary); padding: 0.9rem 1rem;
    border-radius: var(--r-sm); overflow-x: auto; font-size: 0.875rem;
    border: 1px solid var(--border-primary); margin: 0.5rem 0;
    white-space: pre-wrap; word-break: break-word;
  }
  code {
    background: var(--bg-tertiary); padding: 0.15rem 0.4rem;
    border-radius: var(--r-xs); font-size: 0.875em;
    font-family: "Fira Code", "Courier New", monospace;
  }
  a { color: var(--accent-indigo); text-decoration: underline; }
  hr { border: none; border-top: 1px solid var(--border-primary); margin: 0.8rem 0; }
  img { max-width: 100%; width: auto; height: auto; border-radius: var(--r-sm); display: block; }
`;

/* 버블 메뉴 */
const Bubble = styled.div`
  position: absolute; z-index: 200;
  display: flex; align-items: center; gap: 2px;
  padding: 5px 7px;
  background: #1a1a1a; border-radius: var(--r-sm);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  transform: translateX(-50%);
  animation: fadeIn 0.12s ease;
  @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;
const BB = styled.button`
  display: flex; align-items: center; justify-content: center;
  min-width: 26px; height: 26px; padding: 0 5px;
  border: none; border-radius: var(--r-xs); background: transparent;
  color: #e0e0e0; font-size: 0.78rem; font-weight: 700; cursor: pointer;
  transition: all 0.1s;
  &:hover { background: rgba(255,255,255,0.12); color: #fff; }
`;
const BDiv = styled.div`width: 1px; height: 16px; background: rgba(255,255,255,0.15); margin: 0 2px;`;

/* 이모지 패널 */
const EmojiPanel = styled.div`
  position: absolute; z-index: 300;
  top: calc(100% + 4px); right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-lg);
  padding: 10px;
  display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px;
  width: 310px;
`;
const EmojiBtn = styled.button`
  font-size: 1.25rem; border: none; background: transparent;
  border-radius: var(--r-xs); cursor: pointer; padding: 4px;
  transition: background 0.1s;
  &:hover { background: var(--bg-tertiary); }
`;

/* 링크 다이얼로그 */
const LinkDialog = styled.div`
  position: absolute; z-index: 300;
  top: calc(100% + 4px); left: 50%; transform: translateX(-50%);
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-lg);
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px;
  width: 320px;
`;
const LinkInput = styled.input`
  width: 100%; padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-primary); border-radius: var(--r-xs);
  background: var(--bg-secondary); color: var(--text-primary);
  font-size: 0.875rem; outline: none; box-sizing: border-box;
  &:focus { border-color: var(--accent-indigo); }
`;
const LinkRow = styled.div`display: flex; gap: 8px; justify-content: flex-end;`;
const LinkActionBtn = styled.button`
  padding: 0.4rem 0.9rem; border-radius: var(--r-xs); border: none;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  background: ${({ $primary }) => $primary ? "var(--accent-gradient)" : "var(--bg-tertiary)"};
  color: ${({ $primary }) => $primary ? "#fff" : "var(--text-secondary)"};
`;

/* 하단 바 */
const Footer = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.45rem 0.5rem 0;
  font-size: 0.75rem; color: var(--text-muted);
`;

/* ─── 컴포넌트 ─── */
export default function RichEditor({ value, onChange, placeholder = "내용을 입력하세요...", postKey }) {
  const editorRef = useRef(null);
  const emojiRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [bubble, setBubble] = useState(null); // { x, y }
  const savedRange = useRef(null);

  /* 마운트 시 초기값 */
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      updateCount();
    }
  // eslint-disable-next-line
  }, []);

  const updateCount = () => {
    const text = editorRef.current?.innerText || "";
    setCharCount(text.replace(/\s/g, "").length);
    onChange(editorRef.current?.innerHTML || "");
  };

  /* execCommand 래퍼 */
  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateCount();
  // eslint-disable-next-line
  }, []);

  const execBlock = useCallback((tag) => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    updateCount();
  // eslint-disable-next-line
  }, []);

  /* 선택 범위 저장 (링크 삽입 전 포커스 잃기 방지) */
  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  /* 버블 메뉴 */
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
      setBubble(null); return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const edRect = editorRef.current.getBoundingClientRect();
    setBubble({
      x: rect.left - edRect.left + rect.width / 2,
      y: rect.top - edRect.top - 48,
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  /* 이모지 패널 외부 클릭 닫기 */
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* 이모지 삽입 */
  const insertEmoji = (emoji) => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, emoji);
    updateCount();
    setShowEmoji(false);
  };

  /* 링크 삽입 */
  const insertLink = () => {
    if (!linkUrl.trim()) { setShowLink(false); return; }
    editorRef.current?.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand("insertHTML", false, `<a href="${url}" target="_blank">${url}</a>`);
    }
    updateCount();
    setShowLink(false);
    setLinkUrl("");
  };

  /* 인라인 코드 삽입 */
  const insertCode = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      const text = sel.toString();
      document.execCommand("insertHTML", false, `<code>${text}</code>`);
    } else {
      document.execCommand("insertHTML", false, `<code>코드</code>`);
    }
    updateCount();
  };

  /* 코드블럭 삽입 */
  const insertCodeBlock = () => {
    document.execCommand("insertHTML", false, `<pre><code>코드를 입력하세요</code></pre><p><br></p>`);
    updateCount();
  };

  /* 구분선 */
  const insertHR = () => {
    document.execCommand("insertHTML", false, `<hr><p><br></p>`);
    updateCount();
  };

  /* paste: 서식 없이 텍스트만 */
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    updateCount();
  };

  const TOOLBAR = [
    { label: <b>B</b>, title: "굵게", action: () => exec("bold") },
    { label: <i>I</i>, title: "기울임", action: () => exec("italic") },
    { label: <u>U</u>, title: "밑줄", action: () => exec("underline") },
    { label: <s>S</s>, title: "취소선", action: () => exec("strikeThrough") },
    "div",
    { label: "H1", title: "제목 1", action: () => execBlock("h1") },
    { label: "H2", title: "제목 2", action: () => execBlock("h2") },
    { label: "H3", title: "제목 3", action: () => execBlock("h3") },
    "div",
    { label: "• 목록", title: "순서없는 목록", action: () => exec("insertUnorderedList") },
    { label: "1. 목록", title: "순서있는 목록", action: () => exec("insertOrderedList") },
    "div",
    { label: "❝", title: "인용", action: () => execBlock("blockquote") },
    { label: "</>", title: "인라인 코드", action: insertCode },
    { label: "{ }", title: "코드 블럭", action: insertCodeBlock },
    { label: "—", title: "구분선", action: insertHR },
    "div",
    { label: "🔗", title: "링크 삽입", action: () => { saveRange(); setShowLink(v => !v); setShowEmoji(false); } },
  ];

  return (
    <Wrap>
      {/* ─── 툴바 ─── */}
      <Toolbar onMouseDown={(e) => e.preventDefault()}>
        {TOOLBAR.map((item, i) =>
          item === "div"
            ? <TDiv key={i} />
            : <TB key={i} title={item.title} onClick={item.action}>{item.label}</TB>
        )}
        {/* 이모지 버튼 */}
        <TDiv />
        <div style={{ position: "relative" }} ref={emojiRef}>
          <TB title="이모지" onClick={() => { setShowEmoji(v => !v); setShowLink(false); }}>😊</TB>
          {showEmoji && (
            <EmojiPanel>
              {EMOJI_LIST.map((e) => (
                <EmojiBtn key={e} onMouseDown={(ev) => { ev.preventDefault(); insertEmoji(e); }}>{e}</EmojiBtn>
              ))}
            </EmojiPanel>
          )}
        </div>
      </Toolbar>

      {/* ─── 링크 다이얼로그 ─── */}
      {showLink && (
        <LinkDialog>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>링크 삽입</div>
          <LinkInput
            autoFocus
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") insertLink(); if (e.key === "Escape") setShowLink(false); }}
          />
          <LinkRow>
            <LinkActionBtn onClick={() => setShowLink(false)}>취소</LinkActionBtn>
            <LinkActionBtn $primary onClick={insertLink}>삽입</LinkActionBtn>
          </LinkRow>
        </LinkDialog>
      )}

      {/* ─── 에디터 영역 ─── */}
      <div style={{ position: "relative" }}>
        <EditorArea
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={updateCount}
          onKeyUp={updateCount}
          onPaste={handlePaste}
          onMouseUp={handleSelectionChange}
          onKeyDown={(e) => {
            // Tab → 들여쓰기
            if (e.key === "Tab") { e.preventDefault(); exec("insertText", "  "); }
          }}
        />

        {/* ─── 버블 메뉴 ─── */}
        {bubble && (
          <Bubble style={{ left: bubble.x, top: bubble.y }} onMouseDown={(e) => e.preventDefault()}>
            <BB title="굵게" onClick={() => exec("bold")}><b>B</b></BB>
            <BB title="기울임" onClick={() => exec("italic")}><i>I</i></BB>
            <BB title="밑줄" onClick={() => exec("underline")}><u>U</u></BB>
            <BB title="취소선" onClick={() => exec("strikeThrough")}><s>S</s></BB>
            <BDiv />
            <BB title="링크" onClick={() => { saveRange(); setBubble(null); setShowLink(true); }}>🔗</BB>
            <BB title="인라인 코드" onClick={() => { insertCode(); setBubble(null); }}>{"</>"}</BB>
          </Bubble>
        )}
      </div>

      {/* ─── 하단 정보 ─── */}
      <Footer>
        <span>텍스트 선택 후 버블 메뉴 활용 · 탭 키로 들여쓰기</span>
        <span>{charCount.toLocaleString()}자</span>
      </Footer>

      {/* ─── 파일 첨부 ─── */}
      <div style={{ marginTop: "0.75rem" }}>
        <FileUploader
          postKey={postKey}
          onInsertImage={(url, name) => {
            editorRef.current?.focus();
            document.execCommand("insertHTML", false, `<img src="${url}" alt="${name}" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" /><p><br></p>`);
            updateCount();
          }}
          onInsertAudio={(url, name) => {
            editorRef.current?.focus();
            document.execCommand("insertHTML", false, `<div style="margin:0.75rem 0;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-primary);border-radius:10px;"><div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">🎵 ${name}</div><audio controls style="width:100%;height:36px;"><source src="${url}" /></audio></div><p><br></p>`);
            updateCount();
          }}
        />
      </div>
    </Wrap>
  );
}
