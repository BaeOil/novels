import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import WriterSidebar from "./components/WriterSidebar/WriterSidebar";

import HomePage from "./pages/Reader/HomePage/HomePage";
import NovelDetailPage from "./pages/Reader/NovelDetailPage/NovelDetailPage";
import Storytreepage from "./pages/Reader/Storytreepage/Storytreepage";
import ReadingPage from "./pages/Reader/Readingpage/Readingpage";

import WriterDashboardPage from "./pages/Writer/WriterDashboardPage/WriterDashboardPage";
import CreateNovelPage from "./pages/Writer/Createnovelpage/Createnovelpage";

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

function App() {
  return (
    <Router>
      <Routes>

        {/* ==================================================
            Reader Routes
        ================================================== */}

        <Route
          path="/"
          element={
            <ReaderLayout>
              <HomePage />
            </ReaderLayout>
          }
        />

        <Route
          path="/novel/:id"
          element={
            <ReaderLayout>
              <NovelDetailPage />
            </ReaderLayout>
          }
        />

        {/* 🎯 🟢 จุดแก้ไข: ปรับเส้นทางผังเมืองให้รับพารามิเตอร์รหัสนิยาย (:novelId) จาก URL
            คราวนี้เวลาพิมพ์หรือ Link วิ่งมาที่ /storytree/1 หรือ /storytree/5 หน้าเว็บจะดึง ID ไปยิง Go API ได้ถูกต้องทันทีครับน้า */}
        <Route
          path="/storytree/:novelId"
          element={
            <ReaderLayout>
              <Storytreepage />
            </ReaderLayout>
          }
        />

        {/* แบบที่ 1: เข้ามาอ่านครั้งแรก (ไม่มี sceneId ลอยมา) จะใช้ URL: /reading/1 */}
        <Route
          path="/reading/:novelId"
          element={
            <ReaderLayout>
              <ReadingPage />
            </ReaderLayout>
          }
        />

        {/* แบบที่ 2: อ่านกิ่งต่อๆ ไป (มี sceneId ส่งมาด้วย) จะใช้ URL: /reading/1/12 */}
        <Route
          path="/reading/:novelId/:sceneId"
          element={
            <ReaderLayout>
              <ReadingPage />
            </ReaderLayout>
          }
        />

        {/* ==================================================
            Writer Routes
        ================================================== */}

        <Route
          path="/dashboard"
          element={
            <WriterLayout>
              <WriterDashboardPage />
            </WriterLayout>
          }
        />
        <Route
          path="/create"
          element={
            <WriterLayout>
              <CreateNovelPage />
            </WriterLayout>
          }
        />  

      </Routes>
    </Router>
  );
}

export default App;
