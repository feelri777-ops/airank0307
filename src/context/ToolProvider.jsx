import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import ToolContext from "./ToolContext";
import { useAuth } from "./AuthContext";

const CACHE_KEY = "airank_tools_cache_v3";
const CACHE_TTL = 60 * 60 * 1000; // 1시간

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function ToolProvider({ children }) {
  const { user } = useAuth();
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scoresUpdated, setScoresUpdated] = useState(null);

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

    const loadTools = async () => {
      try {
        // 1. 캐시 확인
        const cached = loadCache();

        // 2. scores.json 병렬 로드
        const timestamp = Date.now();
        const [firestoreTools, scoresRes] = await Promise.all([
          cached
            ? Promise.resolve(cached)
            : getDocs(collection(db, "tools")).then(snap =>
                snap.docs.map(d => ({ ...d.data(), id: Number(d.id) }))
              ),
          fetch(`/scores.json?t=${timestamp}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (!isMounted) return;

        // 캐시 저장 (신규 로드한 경우만)
        if (!cached) saveCache(firestoreTools);

        const scoresMap = scoresRes?.tools || {};

        // 3. 점수 병합 + hidden 필터 + manualScore 적용
        const merged = firestoreTools
          .filter(t => !t.hidden)
          .map(tool => {
            const live = scoresMap[String(tool.id)];
            // manualScore가 있으면 자동 점수 무시
            if (tool.manualScore != null) {
              return { ...tool, score: tool.manualScore, change: tool.change ?? 0 };
            }
            if (!live) return tool;
            const change = live.change != null && live.change !== 0 ? live.change : tool.change;
            return { ...tool, ...live, change };
          });

        setTools(merged);
        setScoresUpdated(scoresRes?.updated || null);
        setError(null);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTools();
    return () => { isMounted = false; };
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
