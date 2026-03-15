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
import CommunityDashboard from "./pages/CommunityDashboard";
import Community from "./pages/Community";
import CommunityPost from "./pages/CommunityPost";
import CommunityWrite from "./pages/CommunityWrite";
import Gallery from "./pages/Gallery";
import Dashboard from "./pages/Dashboard";
import Directory from "./pages/Directory";
import TreemapPage from "./pages/TreemapPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCommunity from "./pages/admin/AdminCommunity";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminUsers from "./pages/admin/AdminUsers";
import ToolDetailModal from "./components/modals/ToolDetailModal";
import ToolAnalysisModal from "./components/modals/ToolAnalysisModal";

const ModalWrapper = () => {
  const {
    selectedTool, selectedRank, selectedPrevRank, closeToolDetail,
    analysisTool, analysisRank, closeAnalysis
  } = useTools();

  return (
    <>
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          rank={selectedRank}
          prevRank={selectedPrevRank}
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
                  <Route path="community" element={<CommunityDashboard />} />
                  <Route path="community/:board" element={<Community />} />
                  <Route path="community/:board/write" element={<CommunityWrite />} />
                  <Route path="community/:board/:postId" element={<CommunityPost />} />
                  <Route path="community/:board/:postId/edit" element={<CommunityWrite />} />
                  <Route path="gallery" element={<Gallery />} />
                  <Route path="directory" element={<Directory />} />
                  <Route path="treemap" element={<TreemapPage />} />
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="community" element={<AdminCommunity />} />
                  <Route path="gallery" element={<AdminGallery />} />
                  <Route path="users" element={<AdminUsers />} />
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
