import { Outlet, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

import GlobalStyles from "../styles/GlobalStyles";
import BackgroundEffects from "../components/layout/BackgroundEffects";
import Navbar from "../components/layout/Navbar";
import TickerBar from "../components/layout/TickerBar";
import Footer from "../components/layout/Footer";

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <>
      <GlobalStyles />
      <BackgroundEffects />

      <div style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        background: "var(--bg-primary)",
        transition: "background 0.35s ease",
      }}>
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        {location.pathname === '/' && <TickerBar />}
        <Outlet /> 
        <Footer />
      </div>
    </>
  );
}
