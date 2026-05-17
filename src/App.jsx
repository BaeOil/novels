import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
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
const WriterLayout = ({ children }) => {
  return (
    <div className="writer-layout">
      <WriterSidebar />
      <main className="writer-layout__content">
        {children}
      </main>
    </div>
  );
};

const createNavigateHandler = (navigate) => (page, payload = {}) => {
  switch (page) {
    case "dashboard":
      navigate("/dashboard");
      break;
    case "create-novel":
      navigate("/create");
      break;
    case "chapters":
      if (payload?.novelId) {
        navigate(`/writer/${payload.novelId}/chapters`);
      } else {
        navigate("/dashboard");
      }
      break;
    case "story-tree":
      if (payload?.novelId) {
        navigate(`/storytree/${payload.novelId}`);
      } else {
        navigate("/dashboard");
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
    case "write":
      if (payload?.novelId) {
        navigate(`/writer/${payload.novelId}/chapters`);
      } else {
        navigate("/dashboard");
      }
      break;
    default:
      navigate("/");
      break;
  }
};

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
  return (
    <WriterLayout>
      <WriterDashboardPage onNavigate={createNavigateHandler(navigate)} />
    </WriterLayout>
  );
};

const CreateNovelRoute = () => {
  const navigate = useNavigate();
  return (
    <WriterLayout>
      <CreateNovelPage onNavigate={createNavigateHandler(navigate)} />
    </WriterLayout>
  );
};

const ChapterManagerRoute = () => {
  const navigate = useNavigate();
  const { novelId } = useParams();
  return (
    <WriterLayout>
      <ChapterManagerPage novelId={novelId} onNavigate={createNavigateHandler(navigate)} />
    </WriterLayout>
  );
};

function App() {
  return (
    <Router>
      <Routes>

        {/* ==================================================
            Reader Routes
        ================================================== */}

        <Route path="/" element={<HomePageRoute />} />

        <Route path="/novel/:id" element={<NovelDetailRoute />} />

        {/* 🎯 🟢 จุดแก้ไข: ปรับเส้นทางผังเมืองให้รับพารามิเตอร์รหัสนิยาย (:novelId) จาก URL
            คราวนี้เวลาพิมพ์หรือ Link วิ่งมาที่ /storytree/1 หรือ /storytree/5 หน้าเว็บจะดึง ID ไปยิง Go API ได้ถูกต้องทันทีครับน้า */}
        <Route path="/storytree/:novelId" element={<StoryTreeRoute />} />

        {/* แบบที่ 1: เข้ามาอ่านครั้งแรก (ไม่มี sceneId ลอยมา) จะใช้ URL: /reading/1 */}
        <Route path="/reading/:novelId" element={<ReadingRoute />} />

        {/* แบบที่ 2: อ่านกิ่งต่อๆ ไป (มี sceneId ส่งมาด้วย) จะใช้ URL: /reading/1/12 */}
        <Route path="/reading/:novelId/:sceneId" element={<ReadingRoute />} />

        {/* ==================================================
            Writer Routes
        ================================================== */}

        <Route path="/dashboard" element={<WriterDashboardRoute />} />
        <Route path="/create" element={<CreateNovelRoute />} />
        <Route path="/writer/:novelId/chapters" element={<ChapterManagerRoute />} />

      </Routes>
    </Router>
  );
}

export default App;
