import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NewsProvider } from "./context/NewsContext";
import { ToolProvider } from "./context/ToolProvider";
import { GalleryLightboxProvider } from "./context/GalleryLightboxContext";
import { CommunityProvider } from "./context/CommunityContext";
import { useTools } from "./context/ToolContext";
import GlobalStyles from "./styles/GlobalStyles";
import ErrorBoundary from "./components/ErrorBoundary";

import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./pages/admin/AdminLayout";

// 동적 라우팅 컴포넌트 (Lazy Loading)
const MainPage = lazy(() => import("./pages/MainPage"));

// 모달 컴포넌트 (Lazy Loading) - 필요할 때만 로드
const ToolDetailModal = lazy(() => import("./components/modals/ToolDetailModal"));
const ToolAnalysisModal = lazy(() => import("./components/modals/ToolAnalysisModal"));
const NewsPage = lazy(() => import("./pages/News"));
const CommunityDashboard = lazy(() => import("./pages/CommunityDashboard"));
const Community = lazy(() => import("./pages/Community"));
const CommunityPost = lazy(() => import("./pages/CommunityPost"));
const CommunityWrite = lazy(() => import("./pages/CommunityWrite"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Directory = lazy(() => import("./pages/Directory"));
const TreemapPage = lazy(() => import("./pages/TreemapPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCommunity = lazy(() => import("./pages/admin/AdminCommunity"));
const AdminGallery = lazy(() => import("./pages/admin/AdminGallery"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminTools = lazy(() => import("./pages/admin/AdminTools"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminToolEdit = lazy(() => import("./pages/admin/AdminToolEdit"));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '15px' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-primary)', borderTop: '3px solid var(--accent-indigo)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>페이지를 불러오는 중입니다...</p>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

const ModalWrapper = () => {
  const {
    selectedTool, selectedRank, selectedPrevRank, closeToolDetail,
    analysisTool, analysisRank, closeAnalysis
  } = useTools();

  return (
    <Suspense fallback={null}>
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
    </Suspense>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary>
          <GalleryLightboxProvider>
            <CommunityProvider>
              <ThemeProvider>
                <GlobalStyles />
                <ErrorBoundary>
                  <NewsProvider>
                    <ToolProvider>
                      <BrowserRouter>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={<MainLayout />}>
                              <Route index element={<MainPage />} />
                              <Route path="news" element={<NewsPage />} />
                              <Route path="community" element={<CommunityDashboard />} />
                              <Route path="community/:board" element={<Community />} />
                              <Route path="community/:board/write" element={<CommunityWrite />} />
                              <Route path="community/:board/:postId" element={<CommunityPost />} />
                              <Route path="community/:board/:postId/edit" element={<CommunityWrite />} />
                              <Route path="user/:uid" element={<UserProfile />} />
                              <Route path="prompt" element={<div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:"12px", color:"var(--text-muted)" }}><span style={{ fontSize:"2rem" }}>✨</span><p style={{ fontSize:"1rem", fontWeight:700, color:"var(--text-primary)" }}>프롬프트 준비중입니다</p><p style={{ fontSize:"0.85rem" }}>곧 업데이트 될 예정이에요.</p></div>} />
                              <Route path="gallery" element={<Gallery />} />
                              <Route path="directory" element={<Directory />} />
                              <Route path="treemap" element={<TreemapPage />} />
                              <Route path="dashboard" element={<Dashboard />} />
                            </Route>
                            <Route path="/admin" element={<AdminLayout />}>
                              <Route index element={<AdminDashboard />} />
                              <Route path="tools" element={<AdminTools />} />
                              <Route path="community" element={<AdminCommunity />} />
                              <Route path="gallery" element={<AdminGallery />} />
                              <Route path="users" element={<AdminUsers />} />
                              <Route path="reports" element={<AdminReports />} />
                              <Route path="tool-edit/:id" element={<AdminToolEdit />} />
                            </Route>
                          </Routes>
                        </Suspense>
                        <ModalWrapper />
                      </BrowserRouter>
                    </ToolProvider>
                  </NewsProvider>
                </ErrorBoundary>
              </ThemeProvider>
            </CommunityProvider>
          </GalleryLightboxProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}
