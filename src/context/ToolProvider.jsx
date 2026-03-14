import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import ToolContext from "./ToolContext";
import { useAuth } from "./AuthContext";
import { TOOLS_DATA } from "../data/tools";

export function ToolProvider({ children }) {
  const { user } = useAuth();
  const [tools, setTools] = useState(TOOLS_DATA);
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

  useEffect(() => {
    let isMounted = true;
    const timestamp = Date.now();

    setIsLoading(true);
    fetch(`/scores.json?t=${timestamp}`)
      .then((r) => {
        if (!r.ok) throw new Error("점수 데이터를 불러오지 못했습니다.");
        return r.json();
      })
      .then((data) => {
        if (!isMounted || !data?.tools) return;
        setTools((prev) =>
          prev.map((tool) => {
            const live = data.tools[String(tool.id)];
            if (!live) return tool;
            // change는 scores.json에 값이 없으면(0이거나 null) tools.js 원본 값 유지
            const change = live.change != null && live.change !== 0 ? live.change : tool.change;
            return { ...tool, ...live, change };
          })
        );
        setScoresUpdated(data.updated || null);
        setError(null);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

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
          const { toolId } = d.data();
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
      await setDoc(docRef, { ...existing, type: null }); // 혹은 deleteDoc
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
  }), [tools, isLoading, error, scoresUpdated, selectedTool, selectedRank, analysisTool, analysisRank, bookmarkCounts, toolReactions, toggleToolReaction, getToolReaction, reactionCounts]);

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
}

