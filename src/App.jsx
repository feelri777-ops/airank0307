import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NewsProvider } from "./context/NewsContext";
import { ToolProvider } from "./context/ToolProvider";
import { GalleryLightboxProvider } from "./context/GalleryLightboxContext";
import { useTools } from "./context/ToolContext";

import MainLayout from "./layouts/MainLayout";
import MainPage from "./pages/MainPage";
import NewsPage from "./pages/News";
import Community from "./pages/Community";
import CommunityPost from "./pages/CommunityPost";
import CommunityWrite from "./pages/CommunityWrite";
import Gallery from "./pages/Gallery";
import Dashboard from "./pages/Dashboard";
import Directory from "./pages/Directory";
import Prompt from "./pages/Prompt";
import ToolDetailModal from "./components/modals/ToolDetailModal";
import ToolAnalysisModal from "./components/modals/ToolAnalysisModal";

const ModalWrapper = () => {
  const { 
    selectedTool, selectedRank, closeToolDetail,
    analysisTool, analysisRank, closeAnalysis 
  } = useTools();

  return (
    <>
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          rank={selectedRank}
          onClose={closeToolDetail}
        />
      )}
      {analysisTool && (
        <ToolAnalysisModal
          tool={analysisTool}
          rank={analysisRank}
          onClose={closeAnalysis}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <GalleryLightboxProvider>
      <ThemeProvider>
        <NewsProvider>
          <ToolProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<MainPage />} />
                  <Route path="news" element={<NewsPage />} />
                  <Route path="community" element={<Community />} />
                  <Route path="community/write" element={<CommunityWrite />} />
                  <Route path="community/:postId" element={<CommunityPost />} />
                  <Route path="community/:postId/edit" element={<CommunityWrite />} />
                  <Route path="gallery" element={<Gallery />} />
                  <Route path="directory" element={<Directory />} />
                  <Route path="prompt" element={<Prompt />} />
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>
              </Routes>
              <ModalWrapper />
            </BrowserRouter>
          </ToolProvider>
        </NewsProvider>
      </ThemeProvider>
      </GalleryLightboxProvider>
    </AuthProvider>
  );
}
