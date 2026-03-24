import { useTheme } from '../../context/ThemeContext';

const BLOB_COLORS = {
  light:  { a: '#6366f1', b: '#06b6d4' },
  dark:   { a: '#6366f1', b: '#06b6d4' },
  mono:   { a: '#333333', b: '#888888' },
  community: null, // No blobs for community theme
  // 'community-dark': null, // 보류: 아보레텀 다크 테마
};

const BackgroundEffects = () => {
  const { theme } = useTheme();
  const colors = BLOB_COLORS[theme] ?? BLOB_COLORS.dark;

  // 🌳 Community themes: No blob effects (clean editorial look)
  if (theme === 'community') { // || theme === 'community-dark') { // 보류
    return null;
  }

  return (
    <>
      <div style={{
        position: "fixed",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: colors.a,
        filter: "blur(140px)",
        opacity: "var(--blob-opacity)",
        top: "-150px",
        right: "-100px",
        pointerEvents: "none",
        zIndex: 0,
        transition: "background 0.6s ease",
      }} />
      <div style={{
        position: "fixed",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: colors.b,
        filter: "blur(140px)",
        opacity: "var(--blob-opacity)",
        bottom: "-100px",
        left: "-100px",
        pointerEvents: "none",
        zIndex: 0,
        transition: "background 0.6s ease",
      }} />
    </>
  );
};

export default BackgroundEffects;
