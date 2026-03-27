import { Outlet, useLocation } from "react-router-dom";
import BackgroundEffects from "../components/layout/BackgroundEffects";
import Navbar from "../components/layout/Navbar";
import TickerBar from "../components/layout/TickerBar";
import RankingGuideSection from "../components/sections/RankingGuideSection";
import Footer from "../components/layout/Footer";

export default function MainLayout() {
  const location = useLocation();

  return (
    <>
      <BackgroundEffects />

      <div style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        background: "var(--bg-primary)",
        transition: "background 0.35s ease",
      }}>
        <Navbar />
        {location.pathname === '/' && <TickerBar />}
        <Outlet />
        <RankingGuideSection />
        <Footer />
      </div>
    </>
  );
}
