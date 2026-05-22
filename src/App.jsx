import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import WriterSidebar from "./components/WriterSidebar/WriterSidebar";

import HomePage from "./pages/Reader/HomePage/HomePage";
import NovelDetailPage from "./pages/Reader/NovelDetailPage/NovelDetailPage";
import Storytreepage from "./pages/Reader/Storytreepage/Storytreepage";
import ReadingPage from "./pages/Reader/Readingpage/Readingpage";

import WriterDashboardPage from "./pages/Writer/WriterDashboardPage/WriterDashboardPage";
import CreateNovelPage from "./pages/Writer/Createnovelpage/Createnovelpage";
import ChapterManagerPage from "./pages/Writer/Chaptermanagerpage/Chaptermanagerpage";
import WriterStoryTreePage from "./pages/Writer/WriterStoryTreePage/WriterStoryTreePage";
import SceneEditorPage from "./pages/Writer/Sceneeditorpage/Sceneeditorpage";
import EditNovelPage from "./pages/Writer/Editnovelpage/Editnovelpage";

import Manageusers from "./pages/Admin/Manageusers/Manageusers";

import AuthPage from "./pages/Auth/AuthPage";
import WriterRegisterPage from "./pages/Auth/WriterRegisterPage";


import "./style/App.css";
import "./style/index.css";

// ======================================================
// Reader Layout
// ======================================================
const ReaderLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main className="reader-layout">
        {children}
      </main>
    </>
  );
};

// ======================================================
// Writer Layout 
// ======================================================
const WriterLayout = ({ children, onNavigate }) => {
  return (
    <div className="writer-layout">
      <WriterSidebar onNavigate={onNavigate} />
      <main className="writer-layout__content">
        {children}
      </main>
    </div>
  );
};

// ======================================================
// Navigation Central Handler (แก้ไข Syntax ปีกกาเรียบร้อยแล้ว)
// ======================================================
const createNavigateHandler = (navigate, currentNovelId = null) => (page, payload = {}) => {
  const activeNovelId = typeof payload === "string" ? payload : (payload?.novelId || currentNovelId);

  switch (page) {
    case "dashboard":
      navigate("/writer/dashboard");
      break;
    case "create-novel":
      navigate("/writer/create");
      break;
    case "chapters":
      if (activeNovelId) {
        navigate(`/writer/${activeNovelId}/chapters`);
      } else {
        navigate("/writer/dashboard");
      }
      break;
    case "story-tree":
      if (activeNovelId) {
        navigate(`/writer/storytree/${activeNovelId}`);
      } else {
        navigate("/writer/dashboard");
      }
      break;
    case "novel-detail":
    case "detail":
      if (payload?.novelId || payload?.id) {
        navigate(`/novel/${payload?.novelId || payload?.id}`);
      } else {
        navigate("/");
      }
      break;
    case "reading": {
      const novelId = payload?.novelId;
      const sceneId = payload?.initialSceneId || payload?.sceneId;
      if (novelId) {
        navigate(`/reading/${novelId}${sceneId ? `/${sceneId}` : ""}`);
      } else {
        navigate("/");
      }
      break;
    }
    case "scene-editor":
      if (activeNovelId && payload?.sceneId) {
        navigate(`/writer/${activeNovelId}/scene/${payload.sceneId}`);
      }
      break;
    case "write":
      if (activeNovelId && payload?.sceneId) {
        navigate(`/writer/${activeNovelId}/scene/${payload.sceneId}`);
      } else {
        console.warn("⚠️ ไม่สามารถเปิดหน้าเขียนได้เนื่องจากข้อมูลไม่ครบ:", { activeNovelId, payload });
      }
      break;
    default:
      navigate("/");
      break;
  }
};

// ======================================================
// Route Wrappers 
// ======================================================
const HomePageRoute = () => {
  const navigate = useNavigate();
  return (
    <ReaderLayout>
      <HomePage onNavigate={createNavigateHandler(navigate)} />
    </ReaderLayout>
  );
};

const NovelDetailRoute = () => {
  const navigate = useNavigate();
  return (
    <ReaderLayout>
      <NovelDetailPage onNavigate={createNavigateHandler(navigate)} />
    </ReaderLayout>
  );
};

const StoryTreeRoute = () => {
  const navigate = useNavigate();
  return (
    <ReaderLayout>
      <Storytreepage onNavigate={createNavigateHandler(navigate)} />
    </ReaderLayout>
  );
};

const ReadingRoute = () => {
  const navigate = useNavigate();
  return (
    <ReaderLayout>
      <ReadingPage onNavigate={createNavigateHandler(navigate)} />
    </ReaderLayout>
  );
};

const WriterDashboardRoute = () => {
  const navigate = useNavigate();
  const navHandler = createNavigateHandler(navigate);
  return (
    <WriterLayout onNavigate={navHandler}>
      <WriterDashboardPage onNavigate={navHandler} />
    </WriterLayout>
  );
};

const CreateNovelRoute = () => {
  const navigate = useNavigate();
  const navHandler = createNavigateHandler(navigate);
  return (
    <WriterLayout onNavigate={navHandler}>
      <CreateNovelPage onNavigate={navHandler} />
    </WriterLayout>
  );
};

const ChapterManagerRoute = () => {
  const navigate = useNavigate();
  const { novelId } = useParams();
  const navHandler = createNavigateHandler(navigate, novelId);
  
  return (
    <WriterLayout onNavigate={navHandler}>
      <ChapterManagerPage novelId={novelId} onNavigate={navHandler} />
    </WriterLayout>
  );
};

const WriterStoryTreeRoute = () => {
  const navigate = useNavigate();
  const { novelId } = useParams();
  const navHandler = createNavigateHandler(navigate, novelId);

  return (
    <WriterLayout onNavigate={navHandler}>
      <WriterStoryTreePage novelId={novelId} onNavigate={navHandler} />
    </WriterLayout>
  );
};

const SceneEditorRoute = () => {
  const navigate = useNavigate();
  const { novelId, sceneId } = useParams();
  const navHandler = createNavigateHandler(navigate, novelId);

  return (
    <WriterLayout onNavigate={navHandler}>
      <SceneEditorPage 
        novelId={novelId} 
        chapterId="1" 
        sceneId={sceneId} 
        onNavigate={navHandler} 
      />
    </WriterLayout>
  );
};

const EditNovelRoute = () => {
  const navigate = useNavigate();
  const navHandler = createNavigateHandler(navigate);
  
  return (
    <WriterLayout onNavigate={navHandler}>
      <EditNovelPage onNavigate={navHandler} />
    </WriterLayout>
  );
};

const getRoleFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const decoded = atob(payload);
    const json = decodeURIComponent(decoded.split('').map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
    const parsed = JSON.parse(json);
    return parsed.role || null;
  } catch (error) {
    return null;
  }
};

const RequireAdminRoute = ({ children }) => {
  const role = getRoleFromToken();
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const RedirectAdminIfNeeded = ({ children }) => {
  const role = getRoleFromToken();
  if (role === 'admin') {
    return <Navigate to="/admin/manage-users" replace />;
  }
  return children;
};

// ======================================================
// Main Application Component
// ======================================================
function App() {
  return (
    <Router>
      <Routes>
        {/* Reader Routes */}
        <Route path="/" element={<RedirectAdminIfNeeded><HomePageRoute /></RedirectAdminIfNeeded>} />
        <Route path="/novel/:id" element={<RedirectAdminIfNeeded><NovelDetailRoute /></RedirectAdminIfNeeded>} />
        <Route path="/storytree/:novelId" element={<RedirectAdminIfNeeded><StoryTreeRoute /></RedirectAdminIfNeeded>} />
        <Route path="/reading/:novelId" element={<RedirectAdminIfNeeded><ReadingRoute /></RedirectAdminIfNeeded>} />
        <Route path="/reading/:novelId/:sceneId" element={<RedirectAdminIfNeeded><ReadingRoute /></RedirectAdminIfNeeded>} />

        {/* Writer Routes */}
        <Route path="/writer/dashboard" element={<RedirectAdminIfNeeded><WriterDashboardRoute /></RedirectAdminIfNeeded>} />
        <Route path="/writer/create" element={<RedirectAdminIfNeeded><CreateNovelRoute /></RedirectAdminIfNeeded>} />
        <Route path="/writer/:novelId/chapters" element={<RedirectAdminIfNeeded><ChapterManagerRoute /></RedirectAdminIfNeeded>} />
        <Route path="/writer/:novelId/scene/:sceneId" element={<RedirectAdminIfNeeded><SceneEditorRoute /></RedirectAdminIfNeeded>} />
        <Route path="/writer/storytree/:novelId" element={<RedirectAdminIfNeeded><WriterStoryTreeRoute /></RedirectAdminIfNeeded>} />
        <Route path="/writer/:novelId/edit" element={<RedirectAdminIfNeeded><EditNovelRoute /></RedirectAdminIfNeeded>} />
        
        {/* Admin Routes */}
        <Route path="/admin/manage-users" element={<RequireAdminRoute><Manageusers /></RequireAdminRoute>} />

        {/* Auth Routes */}
        <Route path="/login-register" element={<AuthPage />} />
        <Route path="/registerwriter" element={<RedirectAdminIfNeeded><WriterRegisterPage /></RedirectAdminIfNeeded>} />
      </Routes>
    </Router>
  );
}

export default App;
