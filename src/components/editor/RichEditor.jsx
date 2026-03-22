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

/* ─── 컬러 목록 ─── */
const TEXT_COLORS = ["#000000", "#555555", "#FF0000", "#FF8C00", "#FFD700", "#32CD32", "#1E90FF", "#8A2BE2", "#FF69B4", "#FFFFFF"];
const BG_COLORS = ["transparent", "#FFFF00", "#FFA500", "#FFC0CB", "#E0FFFF", "#98FB98", "#F0E68C", "#D3D3D3", "#FFFFFF", "#000000"];

/* ─── 폰트 크기 목록 ─── */
const FONT_SIZES = [
  { label: "작음", val: "2", px: "13px" },
  { label: "보통", val: "3", px: "16px" },
  { label: "중간", val: "4", px: "18px" },
  { label: "큼", val: "5", px: "22px" },
  { label: "아주큼", val: "6", px: "28px" },
];

/* ─── styled ─── */
const Wrap = styled.div`position: relative; width: 100%; overflow: visible;`;

const Toolbar = styled.div`
  display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-sm) 10px 0 0;
  border-bottom: none;
  user-select: none;
`;

const TB = styled.button`
  display: flex; align-items: center; justify-content: center;
  min-width: 32px; height: 32px; padding: 0 8px;
  border: none; border-radius: var(--r-xs); background: ${({ $active }) => $active ? "var(--bg-card)" : "transparent"};
  color: ${({ $active }) => $active ? "var(--text-primary)" : "var(--text-secondary)"};
  font-size: 0.85rem; font-weight: 700; cursor: pointer;
  transition: all 0.12s; white-space: nowrap;
  box-shadow: ${({ $active }) => $active ? "0 1px 3px rgba(0,0,0,0.1)" : "none"};
  &:hover { background: var(--bg-card); color: var(--text-primary); }
`;

const TDiv = styled.div`width: 1px; height: 18px; background: var(--border-primary); margin: 0 4px; flex-shrink: 0;`;

const EditorArea = styled.div`
  min-height: 380px; max-height: 800px; overflow-y: auto; overflow-x: hidden;
  width: 100%; box-sizing: border-box;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--border-primary);
  border-radius: 0 0 12px 12px;
  background: var(--bg-card); color: var(--text-primary);
  font-size: 16px; line-height: 1.8;
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
  h1 { font-size: 2rem; font-weight: 800; margin: 1rem 0 0.5rem; color: var(--text-primary); }
  h2 { font-size: 1.6rem; font-weight: 700; margin: 0.9rem 0 0.45rem; color: var(--text-primary); }
  h3 { font-size: 1.3rem; font-weight: 600; margin: 0.8rem 0 0.4rem; color: var(--text-primary); }
  p { margin: 0.5rem 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  s { text-decoration: line-through; }
  ul { margin: 0.5rem 0; padding-left: 1.6rem; list-style: disc; }
  ol { margin: 0.5rem 0; padding-left: 1.6rem; list-style: decimal; }
  li { margin: 0.2rem 0; }
  blockquote {
    border-left: 4px solid var(--accent-indigo);
    margin: 0.8rem 0; padding: 0.6rem 1.25rem;
    color: var(--text-secondary); background: var(--bg-secondary);
    border-radius: 0 8px 8px 0;
  }
  pre {
    background: var(--bg-tertiary); padding: 1.1rem 1.25rem;
    border-radius: var(--r-sm); overflow-x: auto; font-size: 0.9rem;
    border: 1px solid var(--border-primary); margin: 0.75rem 0;
    white-space: pre-wrap; word-break: break-word; font-family: "Fira Code", monospace;
  }
  code {
    background: var(--bg-tertiary); padding: 0.2rem 0.5rem;
    border-radius: var(--r-xs); font-size: 0.9em;
    font-family: "Fira Code", "Courier New", monospace;
    color: var(--accent-indigo);
  }
  a { color: var(--accent-indigo); text-decoration: underline; font-weight: 500; }
  hr { border: none; border-top: 1px dotted var(--border-primary); margin: 1.5rem 0; }
  img { max-width: 100%; border-radius: var(--r-sm); display: block; margin: 1rem 0; cursor: pointer; transition: transform 0.2s; }
  img:hover { transform: scale(1.002); }

  /* 스마트 미디어 임베드용 */
  .embed-yt { position: relative; width: 100%; aspect-ratio: 16/9; margin: 1rem 0; border-radius: 12px; overflow: hidden; background: #000; }
  .embed-tool { 
    display: flex; align-items: center; gap: 12px; padding: 14px; margin: 1rem 0;
    background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px;
    text-decoration: none !important;
  }
`;

/* 버블 메뉴 */
const Bubble = styled.div`
  position: absolute; z-index: 200;
  display: flex; align-items: center; gap: 2px;
  padding: 6px 8px;
  background: #1a1a1a; border-radius: var(--r-sm);
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  transform: translateX(-50%);
  animation: fadeIn 0.12s ease;
`;
const BB = styled.button`
  display: flex; align-items: center; justify-content: center;
  min-width: 28px; height: 28px; padding: 0 6px;
  border: none; border-radius: var(--r-xs); background: transparent;
  color: #e0e0e0; font-size: 0.8rem; font-weight: 700; cursor: pointer;
  transition: all 0.1s;
  &:hover { background: rgba(255,255,255,0.12); color: #fff; }
`;
const BDiv = styled.div`width: 1px; height: 18px; background: rgba(255,255,255,0.15); margin: 0 3px;`;

/* 드롭다운 패널 */
const Panel = styled.div`
  position: absolute; z-index: 300;
  top: calc(100% + 6px); left: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-sm);
  box-shadow: var(--shadow-lg);
  padding: 8px;
`;

const ColorPanel = styled(Panel)`
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; width: 170px;
`;
const ColorBtn = styled.button`
  width: 26px; height: 26px; border: 1px solid var(--border-primary); border-radius: 4px;
  background: ${({ color }) => color}; cursor: pointer;
  &:hover { transform: scale(1.1); }
`;

const SizePanel = styled(Panel)`
  width: 120px; display: flex; flex-direction: column; gap: 2px;
`;
const SizeBtn = styled.button`
  text-align: left; padding: 6px 10px; border: none; background: transparent;
  color: var(--text-primary); font-size: 0.85rem; cursor: pointer; border-radius: 4px;
  &:hover { background: var(--bg-tertiary); }
`;

/* 링크 다이얼로그 */
const Dialog = styled.div`
  position: absolute; z-index: 400;
  top: 50%; left: 50%; translate: -50% -50%;
  background: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: 12px; box-shadow: var(--shadow-xl); padding: 20px;
  width: 360px; display: flex; flex-direction: column; gap: 12px;
`;
const DInput = styled.input`
  width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-primary);
  border-radius: var(--r-sm); background: var(--bg-secondary); color: var(--text-primary);
  font-size: 0.9rem; outline: none;
`;

/* 하단 바 */
const Footer = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 0.5rem 0;
  font-size: 0.78rem; color: var(--text-muted); font-weight: 500;
`;

/* ─── 컴포넌트 ─── */
export default function RichEditor({ value, onChange, placeholder = "내용을 입력하세요...", postKey }) {
  const editorRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null); // 'size', 'color', 'hilite', 'emoji', 'yt'
  const [linkData, setLinkData] = useState({ type: 'link', val: '' }); // type: link, yt, tool
  const [charCount, setCharCount] = useState(0);
  const [bubble, setBubble] = useState(null);
  const savedRange = useRef(null);

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

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateCount();
    setActivePanel(null);
  // eslint-disable-next-line
  }, []);

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreRange = () => {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
      setBubble(null); return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const edRect = editorRef.current.getBoundingClientRect();
    setBubble({
      x: rect.left - edRect.left + rect.width / 2,
      y: rect.top - edRect.top - 54,
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  const insertMedia = (type, val) => {
    if (!val.trim()) { setLinkData({ type: 'link', val: '' }); setActivePanel(null); return; }
    restoreRange();
    editorRef.current?.focus();

    if (type === 'yt') {
      const vidMatch = val.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
      const vid = vidMatch ? vidMatch[1] : null;
      if (vid) {
        document.execCommand("insertHTML", false, `<div class="embed-yt"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe></div><p><br></p>`);
      }
    } else if (type === 'tool') {
      const domain = val.replace(/^https?:\/\//, '').split('/')[0];
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      document.execCommand("insertHTML", false, `<a href="${val}" target="_blank" class="embed-tool"><img src="${favicon}" style="width:40px;height:40px;border-radius:8px;margin:0;" /><div><div style="font-weight:700;color:var(--text-primary);">${domain}</div><div style="font-size:0.75rem;color:var(--text-muted);">AI 도구 바로가기</div></div><span style="margin-left:auto;font-size:1.2rem;">↗</span></a><p><br></p>`);
    } else {
      const url = val.startsWith("http") ? val : `https://${val}`;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) document.execCommand("createLink", false, url);
      else document.execCommand("insertHTML", false, `<a href="${url}" target="_blank">${url}</a>`);
    }
    updateCount();
    setLinkData({ type: 'link', val: '' });
    setActivePanel(null);
  };

  const handlePanel = (p) => setActivePanel(prev => prev === p ? null : p);

  return (
    <Wrap onClick={(e) => { if (activePanel && !e.target.closest('.pro-panel')) setActivePanel(null); }}>
      {/* ─── 툴바 ─── */}
      <Toolbar onMouseDown={(e) => e.preventDefault()}>
        {/* Undo / Redo */}
        <TB title="실행 취소" onClick={() => exec("undo")}><span style={{ fontSize: '1.1rem' }}>⟲</span></TB>
        <TB title="다시 실행" onClick={() => exec("redo")}><span style={{ fontSize: '1.1rem' }}>⟳</span></TB>
        <TDiv />

        {/* Font size */}
        <div style={{ position: "relative" }} className="pro-panel">
          <TB onClick={() => handlePanel('size')}>T<span style={{ fontSize: '0.6rem', marginLeft: '2px' }}>▼</span></TB>
          {activePanel === 'size' && (
            <SizePanel>
              {FONT_SIZES.map(s => (
                <SizeBtn key={s.val} onClick={() => exec("fontSize", s.val)} style={{ fontSize: s.px }}>{s.label}</SizeBtn>
              ))}
            </SizePanel>
          )}
        </div>

        {/* Basic Text */}
        <TB title="굵게" onClick={() => exec("bold")}><b>B</b></TB>
        <TB title="기울임" onClick={() => exec("italic")}><i>I</i></TB>
        <TB title="밑줄" onClick={() => exec("underline")}><u>U</u></TB>
        <TB title="취소선" onClick={() => exec("strikeThrough")}><s>S</s></TB>
        <TDiv />

        {/* Color */}
        <div style={{ position: "relative" }} className="pro-panel">
          <TB onClick={() => handlePanel('color')} title="글자색"><span style={{ borderBottom: '2px solid #FF0000' }}>A</span></TB>
          {activePanel === 'color' && (
            <ColorPanel>
              {TEXT_COLORS.map(c => <ColorBtn key={c} color={c} onClick={() => exec("foreColor", c)} title={c} />)}
            </ColorPanel>
          )}
        </div>
        <div style={{ position: "relative" }} className="pro-panel">
          <TB onClick={() => handlePanel('hilite')} title="배경색"><span style={{ background: '#FFFF00', padding: '0 3px', color: '#000' }}>A</span></TB>
          {activePanel === 'hilite' && (
            <ColorPanel>
              {BG_COLORS.map(c => <ColorBtn key={c} color={c} onClick={() => exec("hiliteColor", c)} title={c} />)}
            </ColorPanel>
          )}
        </div>
        <TDiv />

        {/* Align */}
        <TB title="왼쪽 정렬" onClick={() => exec("justifyLeft")}>⚖️</TB>
        <TB title="가운데 정렬" onClick={() => exec("justifyCenter")}>🏛️</TB>
        <TB title="오른쪽 정렬" onClick={() => exec("justifyRight")}>⚖️</TB>
        <TDiv />

        {/* List / Structure */}
        <TB title="제목 2" onClick={() => exec("formatBlock", "h2")}>H2</TB>
        <TB title="제목 3" onClick={() => exec("formatBlock", "h3")}>H3</TB>
        <TB title="순서없는 목록" onClick={() => exec("insertUnorderedList")}>•</TB>
        <TB title="인용" onClick={() => exec("formatBlock", "blockquote")}>❝</TB>
        <TDiv />

        {/* Smart Embed */}
        <TB title="링크/미디어 삽입" onClick={() => { saveRange(); handlePanel('yt'); }}>🔗</TB>
        <TB title="이모지" onClick={() => handlePanel('emoji')}>😊</TB>
        {activePanel === 'emoji' && (
          <EmojiPanel className="pro-panel">
            {EMOJI_LIST.map((e) => (
              <EmojiBtn key={e} onMouseDown={(ev) => { ev.preventDefault(); exec("insertText", e); setActivePanel(null); }}>{e}</EmojiBtn>
            ))}
          </EmojiPanel>
        )}
      </Toolbar>

      {/* ─── 미디어 삽입 다이얼로그 ─── */}
      {activePanel === 'yt' && (
        <Dialog className="pro-panel">
          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
            <TB $active={linkData.type==='link'} onClick={() => setLinkData({ ...linkData, type: 'link' })}>링크</TB>
            <TB $active={linkData.type==='yt'} onClick={() => setLinkData({ ...linkData, type: 'yt' })}>유튜브</TB>
            <TB $active={linkData.type==='tool'} onClick={() => setLinkData({ ...linkData, type: 'tool' })}>AI 도구</TB>
          </div>
          <DInput
            autoFocus
            placeholder={linkData.type==='yt' ? "YouTube URL 입력" : linkData.type==='tool' ? "AI 서비스 URL 입력" : "https://..." }
            value={linkData.val}
            onChange={(e) => setLinkData({ ...linkData, val: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") insertMedia(linkData.type, linkData.val); }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <CancelButton style={{ padding: '6px 12px' }} onClick={() => setActivePanel(null)}>취소</CancelButton>
            <SubmitButton style={{ padding: '6px 16px' }} onClick={() => insertMedia(linkData.type, linkData.val)}>삽입</SubmitButton>
          </div>
        </Dialog>
      )}

      {/* ─── 에디터 영역 ─── */}
      <div style={{ position: "relative" }}>
        <EditorArea
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={updateCount}
          onKeyUp={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
            updateCount();
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") { e.preventDefault(); exec("insertText", "  "); }
          }}
        />

        {/* ─── 버블 메뉴 ─── */}
        {bubble && (
          <Bubble style={{ left: bubble.x, top: bubble.y }} onMouseDown={(e) => e.preventDefault()}>
            <BB onClick={() => exec("bold")}>B</BB>
            <BB onClick={() => exec("italic")}>I</BB>
            <BB onClick={() => exec("underline")}>U</BB>
            <BDiv />
            <BB onClick={() => { saveRange(); setBubble(null); setActivePanel('yt'); }}>🔗</BB>
            <BB onClick={() => { exec("insertHTML", `<code>${window.getSelection().toString() || 'code'}</code>`); setBubble(null); }}>{"</>"}</BB>
          </Bubble>
        )}
      </div>

      {/* ─── 하단 정보 ─── */}
      <Footer>
        <span>실행 취소(⟲) · 자동 저장 활성화됨</span>
        <span>{charCount.toLocaleString()}자</span>
      </Footer>

      {/* ─── 파일 첨부 ─── */}
      <div style={{ marginTop: "1rem" }}>
        <FileUploader
          postKey={postKey}
          onInsertImage={(url, name) => {
            editorRef.current?.focus();
            document.execCommand("insertHTML", false, `<img src="${url}" alt="${name}" /><p><br></p>`);
            updateCount();
          }}
        />
      </div>
    </Wrap>
  );
}

const CancelButton = styled.button`
  padding: 0.5rem 1rem; border: 1px solid var(--border-primary); border-radius: var(--r-sm);
  background: transparent; color: var(--text-secondary); font-size: 0.85rem; cursor: pointer;
`;
const SubmitButton = styled.button`
  padding: 0.5rem 1.25rem; background: var(--accent-gradient); color: #fff;
  border: none; border-radius: var(--r-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer;
`;

