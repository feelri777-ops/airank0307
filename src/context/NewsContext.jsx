import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const NewsContext = createContext();

export function NewsProvider({ children }) {
  const { user } = useAuth();
  const [news, setNews] = useState({ items: [], lastUpdated: '' });
  const [newsBookmarks, setNewsBookmarks] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(() => {
    const saved = localStorage.getItem('selectedArticle');
    return saved ? JSON.parse(saved) : null;
  });

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
    if (selectedArticle) {
      localStorage.setItem('selectedArticle', JSON.stringify(selectedArticle));
    } else {
      localStorage.removeItem('selectedArticle');
    }
  }, [selectedArticle]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "newsBookmarks"), where("uid", "==", user.uid));
      return onSnapshot(q, (snap) => {
        setNewsBookmarks(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
    } else {
      setNewsBookmarks([]);
    }
  }, [user]);

  const toggleNewsBookmark = useCallback(async (article) => {
    if (!user) return;
    const existing = newsBookmarks.find(b => b.link === article.link);
    if (existing) {
      await deleteDoc(doc(db, "newsBookmarks", existing.id));
    } else {
      await addDoc(collection(db, "newsBookmarks"), {
        uid: user.uid,
        link: article.link,
        title: article.title,
        description: article.description,
        relativeTime: article.relativeTime
      });
    }
  }, [user, newsBookmarks]);

  const isNewsBookmarked = useCallback((link) => 
    newsBookmarks.some(b => b.link === link), [newsBookmarks]
  );

  return (
    <NewsContext.Provider value={{
      news,
      newsBookmarks,
      selectedArticle,
      setSelectedArticle,
      toggleNewsBookmark,
      isNewsBookmarked
    }}>
      {children}
    </NewsContext.Provider>
  );
}

export const useNews = () => useContext(NewsContext);
