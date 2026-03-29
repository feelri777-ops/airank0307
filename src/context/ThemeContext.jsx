import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    // 다크 모드 및 기존 비선호 테마들을 'community'로 강제 전환
    if (saved === 'dark' || saved === 'light' || saved === 'pure') return 'community';
    return saved || 'community';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'pure';
      if (prev === 'pure') return 'mono';
      if (prev === 'mono') return 'community';
      // if (prev === 'community') return 'community-dark'; // 보류: 아보레텀 다크 테마
      return 'light';
    });
  };

  const selectTheme = (newTheme) => setTheme(newTheme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, selectTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
