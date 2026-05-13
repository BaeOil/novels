import React, { useState, useEffect } from "react";
import "./HomePage.css";
import NovelCard from "../../../components/NovelCard/NovelCard";
import { mockNovels } from "../../../data/mockData";

// กำหนด URL ของ Backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const HERO_BOOK_BG = [
  "linear-gradient(150deg,#c8f7c5,#a8e6cf)",
  "linear-gradient(150deg,#ffd6e7,#ffb3c6)",
  "linear-gradient(150deg,#fff3cd,#ffe082)",
];

// ฟังก์ชันช่วยแก้ URL รูปภาพให้ใช้งานได้จริง
const formatMinioUrl = (url) => {
  if (!url) return null;
  // ถ้าเจอ minio ให้เปลี่ยนเป็น localhost เพื่อให้ Browser เข้าถึงได้
  return url.replace('http://minio:9000', 'http://localhost:9000');
};

const HomePage = ({ onNavigate }) => {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/novels`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || "ดึงข้อมูลนิยายไม่สำเร็จ");
        }

        const dataList = payload?.data || payload || [];

        const formattedNovels = dataList.map((data) => {
          // ค้นหาข้อมูลจำลองเพื่อเอามาเติมเต็มส่วนที่ Backend ยังไม่มี
          const mockData = mockNovels.find(m => m.id === (data.novel_id || data.id)) || mockNovels[0];

          return {
            id: data.novel_id || data.id,
            title: data.title || "ไม่พบชื่อเรื่อง",
            categories: data.categories && data.categories.length > 0
              ? data.categories.map(cat => typeof cat === "object" ? cat.name : cat)
              : mockData?.categories || ["ทั่วไป"],

            // ใช้ฟังก์ชันจัดการ URL รูปปก
            coverImage: formatMinioUrl(data.cover_image),
            coverEmoji: data.cover_image ? "" : "📘",

            author: {
              displayName: data.author_name || data.pen_name || "ไม่ทราบผู้แต่ง",
              avatarUrl: formatMinioUrl(data.author_avatar),
            },
            synopsis: data.captions || data.introduction || "",
            stats: {
              views: data.views || 0,
              paths: mockData?.stats?.paths || 0,
              choicePoints: data.choice_points || 0,
              endings: 1,
            },
            isLiked: false,
            isBookmarked: false,
          };
        });

        setNovels(formattedNovels);
      } catch (err) {
        console.error("API Error:", err);
        setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ แสดงข้อมูลจำลองแทน");
        setNovels(mockNovels);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  // ฟังก์ชันจัดการเมื่อคลิกที่นิยาย
  const handleReadNovel = (novelId) => {
    // ส่งไปที่หน้า "detail" พร้อมกับ id ของนิยาย
    // หมายเหตุ: ตรวจสอบใน App.jsx ว่าเคสที่ใช้คือ "detail" หรือ "novel-detail" นะครับ
    onNavigate("detail", { id: novelId });
  };

  return (
    <div className="home">
      {/* ── Hero Section ── */}
      <section className="home__hero" aria-label="ส่วนแนะนำ">
        <div className="home__hero-inner">
          <div className="home__hero-left">
            <div className="home__hero-eyebrow">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1l1.5 4h4l-3.2 2.3 1.2 3.7L7 9 3.5 11l1.2-3.7L1.5 5h4z" fill="#ec4899" />
              </svg>
              นิยายทางเลือกแบบ Interactive
            </div>
            <h1 className="home__hero-title">
              ทุกตัวเลือก<br />
              <span className="home__hero-title-accent">เปลี่ยนชะตา</span><br />
              ของเรื่องราว
            </h1>
            <p className="home__hero-quote">"เรื่องเดียวกัน — จบไม่เหมือนกัน"</p>
            <p className="home__hero-desc">
              สัมผัสประสบการณ์นิยายทางเลือกรูปแบบใหม่ ที่คุณเป็นผู้กำหนดจุดจบ
              เลือกเส้นทาง ค้นพบตอนจบที่แตกต่าง
            </p>
          </div>

          <div className="home__hero-right" aria-hidden="true">
            <div className="home__books">
              <div className="home__book home__book--back2" style={{ background: HERO_BOOK_BG[2] }}>
                <span className="home__book-emoji">🔥</span>
              </div>
              <div className="home__book home__book--back1" style={{ background: HERO_BOOK_BG[0] }}>
                <span className="home__book-emoji">🌊</span>
              </div>
              <div className="home__book home__book--main" style={{ background: HERO_BOOK_BG[1] }}>
                <span className="home__book-label">STORY<br />MAKER</span>
                <span className="home__book-emoji home__book-emoji--main">📖</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Popular Novels ── */}
      <section className="home__section" aria-labelledby="popular-heading">
        <div className="home__section-inner">
          <div className="home__section-header">
            <div>
              <h2 id="popular-heading" className="home__section-title">นิยายยอดนิยม</h2>
              {error && <span style={{ fontSize: "12px", color: "red", marginLeft: "10px" }}>({error})</span>}
            </div>
            <button className="home__see-all" aria-label="ดูนิยายทั้งหมด">
              ดูทั้งหมด
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="loading-container" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
              <p>กำลังโหลดนิยาย...</p>
            </div>
          ) : (
            <div className="home__novel-grid" role="list">
              {novels.length > 0 ? (
                novels.map((novel) => (
                  <div role="listitem" key={novel.id}>
                    <NovelCard
                      novel={novel}
                      onClick={() => handleReadNovel(novel.id)}
                    />
                  </div>
                ))
              ) : (
                <div style={{ padding: "3rem", color: "#94a3b8", textAlign: "center", width: "100%" }}>
                  ยังไม่มีนิยายในระบบ
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;