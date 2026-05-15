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

        <Route
          path="/storytree"
          element={
            <ReaderLayout>
              <Storytreepage />
            </ReaderLayout>
          }
        />

        <Route
          path="/reading"
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