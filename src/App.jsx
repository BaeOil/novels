import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import NavbarWriter from "./components/Navbarwriter/Navbarwriter";
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
import { i } from "framer-motion/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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
      <NavbarWriter onNavigate={onNavigate} />
      <main className="writer-layout__content">
        {children}
      </main>
    </div>
  );
};

// ======================================================
// Navigation Central Handler
// ======================================================
const createNavigateHandler = (navigate, currentNovelId = null) => (page, payload = {}) => {
  const activeNovelId = typeof payload === "string" ? payload : (payload?.novelId || currentNovelId);

  switch (page) {
    case "dashboard":
      navigate("/writer/dashboard");
      break;
    case "create-novel":
      if (activeNovelId) {
        navigate(`/writer/${activeNovelId}/edit`);
      } else {
        navigate("/writer/create");
      }
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
        navigate(`/writer/${activeNovelId}/storytree`);
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

const LegacyWriterStoryTreeRedirect = () => {
  const { novelId } = useParams();
  return <Navigate to={`/writer/${novelId}/storytree`} replace />;
};

const SceneEditorRoute = () => {
  const navigate = useNavigate();
  const { novelId, sceneId } = useParams();
  const navHandler = createNavigateHandler(navigate, novelId);

  const [chapterId, setChapterId] = useState("");
  const [loadingChapter, setLoadingChapter] = useState(true);
  const [chapterError, setChapterError] = useState(null);

  useEffect(() => {
    if (!sceneId) {
      setChapterId("");
      setLoadingChapter(false);
      return;
    }

    let active = true;
    setLoadingChapter(true);
    setChapterError(null);

    fetch(`${API_BASE_URL}/scenes/${sceneId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`ไม่สามารถโหลดข้อมูลฉากได้ (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const sceneData = data?.data || data || {};
        const resolvedId = sceneData.chapterId ?? sceneData.chapter_id ?? "";
        setChapterId(resolvedId ? String(resolvedId) : "");
      })
      .catch((err) => {
        if (!active) return;
        console.error("SceneEditorRoute load chapterId error:", err);
        setChapterError(err.message || "เกิดข้อผิดพลาดในการโหลด chapterId");
      })
      .finally(() => {
        if (!active) return;
        setLoadingChapter(false);
      });

    return () => {
      active = false;
    };
  }, [sceneId]);

  return (
    <WriterLayout onNavigate={navHandler}>
      {loadingChapter ? (
        <div style={{ padding: 28, color: "var(--gray-700)" }}>
          กำลังโหลดข้อมูลตอนของฉาก...
        </div>
      ) : (
        <SceneEditorPage
          novelId={novelId}
          chapterId={chapterId}
          sceneId={sceneId}
          onNavigate={navHandler}
        />
      )}
      {chapterError && (
        <div style={{ padding: 18, color: "#B91C1C", fontSize: 13 }}>
          {chapterError}
        </div>
      )}
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
        <Route path="/writer/:novelId/storytree" element={<RedirectAdminIfNeeded><WriterStoryTreeRoute /></RedirectAdminIfNeeded>} />
        <Route path="/writer/storytree/:novelId" element={<RedirectAdminIfNeeded><LegacyWriterStoryTreeRedirect /></RedirectAdminIfNeeded>} />
        <Route path="/writer/:novelId/edit" element={<RedirectAdminIfNeeded><EditNovelRoute /></RedirectAdminIfNeeded>} />
        
        {/* Admin Routes */}
        <Route path="/admin/manage-users" element={<RequireAdminRoute><Manageusers /></RequireAdminRoute>} />

        {/* Auth Routes */}
        <Route path="/login-register" element={<AuthPage />} />
        
        {/* 📝 แก้ไขจุดนี้: ส่งฟังก์ชันเปล่าเพื่อไม่ให้เกิด Error เวลาคอมโพเนนต์เรียกใช้ Props */}
        <Route 
          path="/registerwriter" 
          element={
            <RedirectAdminIfNeeded>
              <WriterRegisterPage 
                onComplete={() => console.log("สมัครสมาชิกสำเร็จ")} 
                onBack={() => console.log("กดย้อนกลับหน้าแรก")} 
              />
            </RedirectAdminIfNeeded>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
