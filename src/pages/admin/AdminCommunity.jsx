import { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot, doc,
  deleteDoc, updateDoc, setDoc, getDocs, where, writeBatch
} from "firebase/firestore";
import { db } from "../../firebase";

import { 
  ThumbsUp, 
  ThumbsUpFill,
  ThumbsDown, 
  Siren,
  ArrowRight,
  TrashSimple
} from "../../components/icons/PhosphorIcons";

// 통계 섹션 컴포넌트
function StatsCard({ label, count, color }) {
  return (
    <div style={{
      padding: "1rem", background: "var(--bg-card)",
      border: "1px solid var(--border-primary)", borderRadius: "16px",
      flex: 1, minWidth: "160px", boxShadow: "var(--shadow-sm)"
    }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color }}>{count}</div>
    </div>
  );
}

// 아이콘 뱃지 컴포넌트
function StatBadge({ Icon, count, color, bgColor }) {
  if (!Icon) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px",
      borderRadius: "8px", background: bgColor || "var(--bg-secondary)", color: color || "var(--text-secondary)",
      fontSize: "0.8rem", fontWeight: 800, border: `1px solid ${color}20`
    }}>
      <Icon size={16} weight="bold" />
      <span>{count || 0}</span>
    </div>
  );
}

// 게시글 아이템 컴포넌트
function PostItem({ post, boards, onDelete, onMove, isSelected, onSelect }) {
  const dateStr = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : "날짜 없음";
  const isSuspicious = (post.reportCount || 0) > 0 || (post.downvoteCount || 0) > 5;

  const getContentSnippet = (content) => {
    if (!content || typeof content !== 'string') return "내용 없음";
    const plainText = content.replace(/<[^>]*>?/gm, '');
    return plainText.length > 150 ? plainText.substring(0, 150) + "..." : plainText;
  };

  return (
    <div style={{
      display: "flex", gap: "12px", padding: "1rem 1.4rem",
      background: isSelected ? "var(--accent-indigo)08" : (isSuspicious ? "var(--bg-tertiary)" : "var(--bg-card)"), 
      border: isSelected ? "1.5px solid var(--accent-indigo)" : (isSuspicious ? "1.5px solid #ef444450" : "1px solid var(--border-primary)"),
      borderRadius: "20px", marginBottom: "0.8rem",
      boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
      transition: "background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s", position: "relative"
    }}>
      {/* 체크박스 영역 */}
      <div style={{ display: "flex", alignItems: "center", paddingRight: "4px" }}>
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(post.id)}
          style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--accent-indigo)" }}
        />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ 
              fontSize: "0.8rem", fontWeight: 950, color: "#fff", 
              background: "var(--accent-indigo)", padding: "4px 10px", borderRadius: "6px"
            }}>
              {post.board}
            </span>
            <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)", fontWeight: 900, letterSpacing: "-0.01em" }}>{post.title}</strong>
            {post.toolId && (
              <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "#0ea5e9", background: "#0ea5e915", padding: "3px 8px", borderRadius: "6px" }}>
                 🛠 {post.toolId}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ position: "relative", width: "140px" }}>
              <select 
                onChange={(e) => onMove(post.id, e.target.value)}
                value={post.board}
                style={{ 
                  width: "100%", padding: "8px 10px", paddingRight: "24px", borderRadius: "10px", border: "1px solid var(--border-primary)", 
                  background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 800, fontSize: "0.75rem", appearance: "none"
                }}
              >
                {(boards || []).map(b => <option key={b.id} value={b.id}>{b.name}로 이동</option>)}
              </select>
              <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }}>
                <ArrowRight size={12} weight="bold" />
              </div>
            </div>
            <button 
              onClick={() => window.open(`/community/${post.board}/${post.id}`, '_blank')}
              style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 800, fontSize: "0.75rem" }}
            >상세보기</button>
            <button 
              onClick={() => onDelete(post.id)}
              style={{ padding: "8px 14px", borderRadius: "10px", border: "none", background: "#ef444420", color: "#ef4444", cursor: "pointer", fontWeight: 900, fontSize: "0.75rem" }}
            >삭제</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
            <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>{post.displayName || post.authorName || "익명"}</span>
            <span style={{ margin: "0 8px", color: "var(--border-primary)" }}>|</span>
            <span style={{ opacity: 0.8 }}>{dateStr}</span>
          </div>
          
          <div style={{ display: "flex", gap: "5px", marginLeft: "6px" }}>
            <StatBadge Icon={ThumbsUp} count={post.upvoteCount} color={isSuspicious ? "#f43f5e" : "#ef4444"} bgColor={isSuspicious ? "#f43f5e10" : "" } />
            <StatBadge Icon={ThumbsDown} count={post.downvoteCount} />
            <StatBadge Icon={Siren} count={post.reportCount} color="#ef4444" bgColor={isSuspicious ? "#ef444430" : "" } />
          </div>
        </div>

        <div style={{ 
          padding: "8px 12px", borderRadius: "10px", 
          fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5,
          background: "rgba(0,0,0,0.02)",
          border: "1px solid var(--border-primary)",
          marginTop: "2px"
        }}>
          {getContentSnippet(post.content)}
        </div>
      </div>
    </div>
  );
}

// 게시판 아이템 컴포넌트
function BoardItem({ board, onEdit, onDelete }) {
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "communityPosts"), where("board", "==", board.id));
    getDocs(q).then(snap => setPostCount(snap.size));
  }, [board.id]);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "1rem", padding: "1rem",
      background: "var(--bg-card)", border: board.isVisible === false ? "1px solid #ef444450" : "1px solid var(--border-primary)",
      borderRadius: "16px", marginBottom: "0.6rem",
      boxShadow: "var(--shadow-sm)"
    }}>
      <div style={{ 
        width: 50, height: 50, borderRadius: "12px", background: `${board.color}15`,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        border: `1px solid ${board.color}30`
      }}>
        {board.logo ? (
          <img src={board.logo} alt="" width={40} height={40} loading="lazy" style={{ width: "70%", height: "70%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: "1.2rem" }}>🧩</span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <strong style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--text-primary)" }}>{board.name}</strong>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "6px", fontWeight: 800 }}>
            {board.id}
          </span>
          {board.isVisible === false && (
            <span style={{ fontSize: "0.65rem", color: "#ef4444", background: "#ef444415", padding: "2px 8px", borderRadius: "6px", fontWeight: 800 }}>HIDDEN</span>
          )}
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{board.desc}</div>
      </div>
      <div style={{ textAlign: "right", marginRight: "1rem", borderLeft: "1px solid var(--border-primary)", paddingLeft: "1rem" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800 }}>POSTS</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text-primary)" }}>{postCount.toLocaleString()}</div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => onEdit(board)} style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem" }}>수정</button>
        <button onClick={() => onDelete(board.id)} style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "#ef444415", color: "#ef4444", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem" }}>삭제</button>
      </div>
    </div>
  );
}

export default function AdminCommunity() {
  const [activeTab, setActiveTab] = useState("posts");
  const [boards, setBoards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);

  const [form, setForm] = useState({ id: "", name: "", desc: "", logo: "", color: "#6366f1", order: 0, isVisible: true });
  
  // 일괄 선택 상태
  const [selectedPostIds, setSelectedPostIds] = useState([]);

  useEffect(() => {
    const unsubBoards = onSnapshot(query(collection(db, "boards"), orderBy("order", "asc")), (snap) => {
      setBoards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPosts = onSnapshot(query(collection(db, "communityPosts"), orderBy("createdAt", "desc")), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubBoards(); unsubPosts(); };
  }, []);

  const handleOpenModal = (board = null) => {
    if (board) {
      setEditingBoard(board);
      setForm({ ...board, isVisible: board.isVisible !== false });
    } else {
      setEditingBoard(null);
      setForm({ id: "", name: "", desc: "", logo: "", color: "#6366f1", order: boards.length + 1, isVisible: true });
    }
    setIsModalOpen(true);
  };

  const handleSaveBoard = async (e) => {
    e.preventDefault();

    // 유효성 검사
    if (!form.id || form.id.trim() === "") {
      alert("게시판 ID를 입력해주세요. (예: free, tips, notice)");
      return;
    }
    if (!form.name || form.name.trim() === "") {
      alert("게시판 이름을 입력해주세요.");
      return;
    }

    try {
      if (editingBoard) {
        await updateDoc(doc(db, "boards", editingBoard.id), form);
      } else {
        await setDoc(doc(db, "boards", form.id.trim()), form);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("게시판 저장 오류:", err);
      alert(`저장 실패: ${err.message}`);
    }
  };

  const handleDeleteBoard = async (id) => {
    if (!window.confirm("게시판을 삭제하시겠습니까? 관련 게시물은 남게 됩니다.")) return;
    try { await deleteDoc(doc(db, "boards", id)); } catch (err) { alert(err.message); }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("게시글을 영구 삭제하시겠습니까?")) return;
    try { await deleteDoc(doc(db, "communityPosts", id)); } catch (err) { alert(err.message); }
  };

  const handleMovePost = async (postId, targetBoardId) => {
    try {
      await updateDoc(doc(db, "communityPosts", postId), { board: targetBoardId });
      alert("게시판 이동이 완료되었습니다.");
    } catch (err) { alert(err.message); }
  };

  // 체크박스 선택 토글
  const toggleSelectPost = (id) => {
    setSelectedPostIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedPostIds.length === posts.length && posts.length > 0) setSelectedPostIds([]);
    else setSelectedPostIds(posts.map(p => p.id));
  };

  // 일괄 이동
  const handleBulkMove = async (targetBoardId) => {
    if (!targetBoardId) return;
    if (selectedPostIds.length === 0) return;
    if (!window.confirm(`${selectedPostIds.length}개의 게시물을 일괄 이동하시겠습니까?`)) return;

    try {
      const batch = writeBatch(db);
      selectedPostIds.forEach(id => {
        batch.update(doc(db, "communityPosts", id), { board: targetBoardId });
      });
      await batch.commit();
      alert("일괄 이동이 완료되었습니다.");
      setSelectedPostIds([]);
    } catch (err) { alert(err.message); }
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedPostIds.length === 0) return;
    if (!window.confirm(`${selectedPostIds.length}개의 게시물을 '영구 삭제'하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const batch = writeBatch(db);
      selectedPostIds.forEach(id => {
        batch.delete(doc(db, "communityPosts", id));
      });
      await batch.commit();
      alert("일괄 삭제가 완료되었습니다.");
      setSelectedPostIds([]);
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 950, letterSpacing: "-0.04em", marginBottom: "0.2rem", color: "var(--text-primary)" }}>커뮤니티 컨트롤 센터</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem", fontWeight: 500 }}>게시글 모니터링 및 아키텍처 관리를 통합 제어합니다.</p>
      </header>

      <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-primary)" }}>
        {["posts", "boards"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: "1rem 0.5rem", border: "none", background: "none", cursor: "pointer", 
              fontSize: "1rem", fontWeight: 900,
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "4px solid var(--accent-indigo)" : "4px solid transparent",
              transition: "background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s"
            }}
          >
            {tab === "posts" ? "컨텐츠 모니터링" : "게시판 마스터 구성"}
          </button>
        ))}
      </div>

      {activeTab === "posts" ? (
        <section>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
            <StatsCard label="전체 게시글" count={posts.length} color="var(--accent-indigo)" />
            <StatsCard label="누적 신고 수" count={posts.reduce((acc, curr) => acc + (curr.reportCount || 0), 0)} color="#ef4444" />
            <StatsCard label="오늘의 신규 글" count={posts.filter(p => p.createdAt?.toDate().toDateString() === new Date().toDateString()).length} color="var(--color-green)" />
          </div>

          {/* 일괄 작업 바 */}
          <div style={{ 
            marginBottom: "1.5rem", padding: "0.8rem 1.2rem", borderRadius: "18px", 
            background: selectedPostIds.length > 0 ? "var(--accent-indigo)" : "var(--bg-secondary)", 
            color: selectedPostIds.length > 0 ? "#fff" : "var(--text-primary)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: selectedPostIds.length > 0 ? "0 8px 16px -4px var(--accent-indigo)40" : "none",
            transition: "background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input 
                type="checkbox"
                checked={selectedPostIds.length === posts.length && posts.length > 0}
                onChange={toggleSelectAll}
                style={{ width: "22px", height: "22px", cursor: "pointer", accentColor: "var(--accent-indigo)" }}
              />
              <span style={{ fontWeight: 800 }}>
                {selectedPostIds.length > 0 ? `${selectedPostIds.length}개 선택됨` : "게시물 관리"}
              </span>
            </div>

            {selectedPostIds.length > 0 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ position: "relative", width: "150px" }}>
                  <select 
                    onChange={(e) => handleBulkMove(e.target.value)}
                    value=""
                    style={{ 
                      width: "100%", padding: "8px 12px", paddingRight: "28px", borderRadius: "10px", border: "none",
                      background: "rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem", appearance: "none"
                    }}
                  >
                    <option value="" style={{color: "#000"}}>일괄 이동...</option>
                    {boards.map(b => <option key={b.id} value={b.id} style={{color: "#000"}}>{b.name}로 이동</option>)}
                  </select>
                  <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#fff" }}>
                    <ArrowRight size={12} weight="bold" />
                  </div>
                </div>
                <button 
                  onClick={handleBulkDelete}
                  style={{ 
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px", borderRadius: "10px", border: "none", 
                    background: "#fff", color: "#ef4444", cursor: "pointer", fontWeight: 900, fontSize: "0.8rem"
                  }}
                >
                  <TrashSimple size={16} weight="bold" />
                  일괄 삭제
                </button>
              </div>
            )}

            {selectedPostIds.length === 0 && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700 }}>
                상태 요약: {posts.filter(p => (p.reportCount > 0)).length}건의 신고가 접수되었습니다.
              </div>
            )}
          </div>

          <div>
            {loading ? <p>데이터를 불러오는 중...</p> : (
              posts.length > 0 ? (
                posts.map(p => (
                  <PostItem 
                    key={p.id} 
                    post={p} 
                    boards={boards} 
                    onDelete={handleDeletePost} 
                    onMove={handleMovePost} 
                    isSelected={selectedPostIds.includes(p.id)}
                    onSelect={toggleSelectPost}
                  />
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "4rem", background: "var(--bg-secondary)", borderRadius: "24px", color: "var(--text-muted)", fontWeight: 800 }}>등록된 게시글이 없습니다.</div>
              )
            )}
          </div>
        </section>
      ) : (
        <section>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2.5rem" }}>
            <StatsCard label="운영 게시판" count={boards.length} color="var(--accent-indigo)" />
            <StatsCard label="활성 상태" count={boards.filter(b => b.isVisible !== false).length} color="var(--color-green)" />
            <button 
              onClick={() => handleOpenModal()}
              style={{ padding: "0 1.5rem", background: "var(--text-primary)", color: "var(--bg-primary)", border: "none", borderRadius: "14px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", boxShadow: "var(--shadow-md)" }}
            >+ 새 게시판 설계</button>
          </div>
          <div>
            {boards.map(b => <BoardItem key={b.id} board={b} onEdit={handleOpenModal} onDelete={handleDeleteBoard} />)}
          </div>
        </section>
      )}

      {/* 모달 */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "900px", borderRadius: "30px", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 340px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-primary)" }}>
            <div style={{ padding: "2.5rem" }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 950, marginBottom: "2rem", color: "var(--text-primary)" }}>{editingBoard ? "구성 변경" : "신규 설계"}</h2>
              <form onSubmit={handleSaveBoard} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>유니크 ID</label>
                    <input disabled={!!editingBoard} value={form.id} onChange={e => setForm({...form, id: e.target.value})} placeholder="예: chatgpt" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: editingBoard ? "var(--bg-secondary)" : "var(--bg-card)", color: "var(--text-primary)", fontWeight: 700 }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>명칭</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="예: ChatGPT" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)", fontWeight: 700 }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>설명</label>
                  <input value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: "1rem" }}>
                  <input value={form.logo} onChange={e => setForm({...form, logo: e.target.value})} placeholder="로고 URL" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                  <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} style={{ width: "100%", height: "45px", padding: "2px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", cursor: "pointer" }} />
                  <input type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)})} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-primary)", background: "var(--bg-card)", color: "var(--text-primary)", fontWeight: 900 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border-primary)" }}>
                  <input type="checkbox" checked={form.isVisible} onChange={e => setForm({...form, isVisible: e.target.checked})} id="vis_toggle" style={{ cursor: "pointer" }} />
                  <label htmlFor="vis_toggle" style={{ fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", color: "var(--text-primary)" }}>서비스 노출 (Active)</label>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                  <button type="submit" style={{ flex: 1, padding: "14px", background: "var(--accent-indigo)", color: "#fff", border: "none", borderRadius: "14px", fontWeight: 900, fontSize: "1rem", cursor: "pointer" }}>저장하기</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "0 1.5rem", border: "1px solid var(--border-primary)", borderRadius: "14px", fontWeight: 800, color: "var(--text-muted)", cursor: "pointer" }}>취소</button>
                </div>
              </form>
            </div>
            <div style={{ background: "var(--bg-secondary)", padding: "2.5rem", borderLeft: "1px solid var(--border-primary)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 900, marginBottom: "1.5rem", textTransform: "uppercase" }}>실시간 미리보기</div>
              <div style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "20px", boxShadow: "var(--shadow-md)", opacity: form.isVisible ? 1 : 0.6, border: `1px solid var(--border-primary)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ width: 45, height: 45, borderRadius: "12px", background: `${form.color}20`, border: `1px solid ${form.color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {form.logo ? <img src={form.logo} style={{ width: "60%" }} /> : "🧩"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: "1.1rem", color: "var(--text-primary)" }}>{form.name || "입력 대기"}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>{form.id || "ID 미정"}</div>
                  </div>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{form.desc || "설명이 이곳에 표시됩니다."}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
