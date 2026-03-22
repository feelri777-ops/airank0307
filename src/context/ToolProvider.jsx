import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import ToolContext from "./ToolContext";
import { useAuth } from "./AuthContext";

const CACHE_KEY = "airank_tools_cache_v5";
const CACHE_VERSION = "5.0.0";
const CACHE_TTL = 60 * 60 * 1000; // 1시간

function loadCache() {
  try {
    const v = localStorage.getItem("airank_cache_version");
    if (v !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.setItem("airank_cache_version", CACHE_VERSION);
      return null;
    }
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    localStorage.setItem("airank_cache_version", CACHE_VERSION);
  } catch (e) { console.error("Cache save failed:", e); }
}

export const ToolProvider = ({ children }) => {
  const { user } = useAuth();
  const [tools, setTools] = useState([]);
  const [scoresUpdated, setScoresUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedRank, setSelectedRank] = useState(null);
  const [selectedPrevRank, setSelectedPrevRank] = useState(null);
  const [analysisTool, setAnalysisTool] = useState(null);
  const [analysisRank, setAnalysisRank] = useState(null);

  const [bookmarkCounts, setBookmarkCounts] = useState({});
  const [toolReactions, setToolReactions] = useState([]);
  const [reactionCounts, setReactionCounts] = useState({});

  // Firestore에서 툴 로드 (localStorage 캐시 활용)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // 구글/네이버 점수 배경 데이터 (scores.json) 로드
    let scoresMap = {};
    let scoresUpdatedTime = null;

    const fetchScores = async () => {
      try {
        const timestamp = Date.now();
        const res = await fetch(`/scores.json?t=${timestamp}`).then(r => r.ok ? r.json() : null);
        if (res) {
          scoresMap = res.tools || {};
          scoresUpdatedTime = res.updated || null;
        }
      } catch (e) { console.error("Scores fetch error:", e); }
    };

    // 실시간 Firestore 툴 리스너 가동
    const unsubscribe = onSnapshot(collection(db, "tools"), async (snapshot) => {
      if (!isMounted) return;
      
      // 만약 scoresMap이 아직 안 받아졌다면 한 번 더 시도
      if (Object.keys(scoresMap).length === 0) await fetchScores();

      const firestoreTools = snapshot.docs.map(d => ({
        ...d.data(),
        id: Number(d.id),
        _docId: d.id
      }));

      const merged = firestoreTools
        .filter(t => !t.hidden)
        .map(tool => {
          const live = scoresMap[String(tool.id)];
          if (tool.manualScore != null) {
            return { ...tool, score: tool.manualScore, change: tool.change ?? 0 };
          }
          if (!live) return tool;
          const change = live.change != null && live.change !== 0 ? live.change : tool.change;
          // Firestore 보정 점수가 필수로 우선됨
          const finalScore = tool.score ?? live.score;
          return { ...tool, ...live, score: finalScore, change };
        });

      const sorted = merged.sort((a, b) => (b.score || 0) - (a.score || 0));
      setTools(sorted);
      setScoresUpdated(scoresUpdatedTime);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Firestore Listen error:", err);
      if (isMounted) {
        setError(err.message);
        setIsLoading(false);
      }
    });

    return () => { 
      isMounted = false; 
      unsubscribe(); 
    };
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [bookmarkSnap, reactionSnap] = await Promise.all([
          getDocs(collection(db, "bookmarks")),
          getDocs(collection(db, "toolReactions"))
        ]);

        const bCounts = {};
        bookmarkSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.category === 'news') return;
          const { toolId } = data;
          if (toolId) bCounts[toolId] = (bCounts[toolId] || 0) + 1;
        });
        setBookmarkCounts(bCounts);

        const rCounts = {};
        reactionSnap.docs.forEach((d) => {
          const { toolId, type } = d.data();
          if (!toolId) return;
          if (!rCounts[toolId]) rCounts[toolId] = { likes: 0, dislikes: 0 };
          if (type === "like") rCounts[toolId].likes++;
          else if (type === "dislike") rCounts[toolId].dislikes++;
        });
        setReactionCounts(rCounts);
      } catch (err) {
        console.error("Firebase data fetch error:", err);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "toolReactions"), where("uid", "==", user.uid));
      return onSnapshot(q, (snap) => {
        setToolReactions(snap.docs.map(d => d.data()));
      });
    } else {
      setToolReactions([]);
    }
  }, [user]);

  const openToolDetail = (tool, rank, prevRank) => {
    setSelectedTool(tool);
    setSelectedRank(rank);
    setSelectedPrevRank(prevRank || null);
  };

  const closeToolDetail = () => { setSelectedTool(null); setSelectedPrevRank(null); };
  const openAnalysis = (tool, rank) => {
    setAnalysisTool(tool);
    setAnalysisRank(rank);
  };
  const closeAnalysis = () => setAnalysisTool(null);

  const getToolReaction = useCallback((toolId) => {
    const r = toolReactions.find(r => r.toolId === toolId);
    return r ? r.type : null;
  }, [toolReactions]);

  const toggleToolReaction = useCallback(async (toolId, type) => {
    if (!user) return;
    const docRef = doc(db, "toolReactions", `${user.uid}_${toolId}`);
    const existing = toolReactions.find(r => r.toolId === toolId);

    if (existing?.type === type) {
      await deleteDoc(docRef);
      setReactionCounts(prev => {
        const c = prev[toolId] || { likes: 0, dislikes: 0 };
        return { ...prev, [toolId]: { likes: c.likes - (type === "like" ? 1 : 0), dislikes: c.dislikes - (type === "dislike" ? 1 : 0) } };
      });
    } else {
      await setDoc(docRef, { uid: user.uid, toolId, type });
      setReactionCounts(prev => {
        const c = prev[toolId] || { likes: 0, dislikes: 0 };
        return { ...prev, [toolId]: {
          likes: c.likes + (type === "like" ? 1 : 0) - (existing?.type === "like" ? 1 : 0),
          dislikes: c.dislikes + (type === "dislike" ? 1 : 0) - (existing?.type === "dislike" ? 1 : 0),
        }};
      });
    }
  }, [user, toolReactions]);

  // 관리자 전용: 캐시 무효화 후 Firestore 재로드
  const invalidateToolsCache = useCallback(() => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }, []);

  const value = useMemo(() => ({
    tools,
    isLoading,
    error,
    scoresUpdated,
    openToolDetail,
    closeToolDetail,
    selectedTool,
    selectedRank,
    selectedPrevRank,
    analysisTool,
    analysisRank,
    openAnalysis,
    closeAnalysis,
    bookmarkCounts,
    toolReactions,
    toggleToolReaction,
    getToolReaction,
    reactionCounts,
    invalidateToolsCache,
  }), [tools, isLoading, error, scoresUpdated, selectedTool, selectedRank, analysisTool, analysisRank, bookmarkCounts, toolReactions, toggleToolReaction, getToolReaction, reactionCounts, invalidateToolsCache]);

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
}
