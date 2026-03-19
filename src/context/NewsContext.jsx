import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const NewsContext = createContext();

export function NewsProvider({ children }) {
  const { user } = useAuth();
  const [news, setNews] = useState({ items: [], lastUpdated: '' });
  const [newsBookmarks, setNewsBookmarks] = useState([]);
  const [newsStats, setNewsStats] = useState({});

  useEffect(() => {
    const timestamp = Date.now();
    fetch(`/news.json?t=${timestamp}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch news');
        return res.json();
      })
      .then((data) => setNews(data))
      .catch((err) => console.error('News fetch error:', err));
  }, []);

  useEffect(() => {
    // 실시간 뉴스 통계(조회수) 리스너
    const q = query(collection(db, "newsStats"));
    return onSnapshot(q, 
      (snap) => {
        const stats = {};
        snap.forEach(d => {
          const data = d.data();
          if (data.link) {
            stats[data.link] = data.views || 0;
          }
        });
        setNewsStats(stats);
      },
      (err) => console.error('[ERROR] newsStats listener failed:', err)
    );
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "bookmarks"), where("uid", "==", user.uid));
      return onSnapshot(q, 
        (snap) => {
          const filtered = snap.docs
            .map(d => ({ ...d.data(), id: d.id }))
            .filter(b => b.category === 'news');
          setNewsBookmarks(filtered);
        },
        (err) => console.error('[ERROR] bookmarks listener failed:', err)
      );
    } else {
      setNewsBookmarks([]);
    }
  }, [user]);

  const toggleNewsBookmark = useCallback(async (article) => {
    if (!user) {
      console.warn('[DEBUG] No user found. Bookmark toggle aborted.');
      return;
    }
    if (!article?.link) {
      console.warn('[DEBUG] No article link found. Article:', article);
      return;
    }

    try {
      const existing = newsBookmarks.find(b => b.link === article.link);
      if (existing) {
        await deleteDoc(doc(db, "bookmarks", existing.id));
      } else {
        const docData = {
          uid: user.uid,
          category: "news",
          link: article.link,
          title: article.title || 'No Title',
          description: article.description || '',
          relativeTime: article.relativeTime || '',
          hot: !!article.hot,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, "bookmarks"), docData);
      }
    } catch (err) {
      console.error('[ERROR] Failed to toggle news bookmark:', err);
      alert('북마크 처리 중 오류가 발생했습니다: ' + err.message);
    }
  }, [user, newsBookmarks]);

  const isNewsBookmarked = useCallback((link) => 
    newsBookmarks.some(b => b.link === link), [newsBookmarks]
  );

  const incrementNewsView = useCallback(async (link) => {
    if (!link) return;
    try {
      // btoa는 유니코드 문자열 처리 시 에러가 발생하므로 encodeURIComponent와 함께 사용
      const encodedLink = unescape(encodeURIComponent(link));
      const docId = btoa(encodedLink).replace(/\//g, '_').replace(/\+/g, '-').substring(0, 128);
      const docRef = doc(db, "newsStats", docId);
      
      await setDoc(docRef, { 
        views: increment(1),
        link: link,
        lastViewed: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('[ERROR] Failed to increment news view:', err);
      // 조회수 증가 실패는 사용자 경험에 치명적이지 않으므로 무시
    }
  }, []);

  return (
    <NewsContext.Provider value={{
      news,
      newsBookmarks,
      toggleNewsBookmark,
      isNewsBookmarked,
      incrementNewsView,
      newsStats
    }}>
      {children}
    </NewsContext.Provider>
  );
}

export const useNews = () => useContext(NewsContext);
