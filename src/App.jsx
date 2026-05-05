import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import './style/index.css';

// สร้าง Component หลอกๆ ไว้ก่อนสำหรับหน้า Story เพื่อไม่ให้จอขาว
const StoryPlaceholder = () => (
  <div className="p-20 text-center">
    <h1 className="text-2xl font-bold">กำลังเข้าสู่เนื้อเรื่อง...</h1>
    <p>ขณะนี้ยังไม่ได้สร้างหน้า Story.jsx</p>
    <a href="/" className="text-pink-500 underline">กลับหน้าแรก</a>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* เพิ่มบรรทัดนี้เพื่อรองรับ Link จากหน้า Home */}
        <Route path="/story" element={<StoryPlaceholder />} />
      </Routes>
    </Router>
  );
}

export default App;