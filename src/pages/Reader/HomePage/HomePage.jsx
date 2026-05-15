import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import NovelCard from "../../../components/NovelCard/NovelCard";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const HERO_BOOK_BG = [
  "linear-gradient(150deg,#c8f7c5,#a8e6cf)",
  "linear-gradient(150deg,#ffd6e7,#ffb3c6)",
  "linear-gradient(150deg,#fff3cd,#ffe082)",
];

const formatMinioUrl = (url) => {
  if (!url) return null;
  return url.replace('http://minio:9000', 'http://localhost:9000');
};

const HomePage = ({ onNavigate }) => {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/novels`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || "ดึงข้อมูลไม่สำเร็จ");
        }

        // ตรวจสอบโครงสร้างข้อมูลที่ส่งกลับมา
        const dataList = payload?.data || payload || [];

        const formattedNovels = dataList.map((data) => {
          return {
            id: data.novel_id || data.id,
            title: data.title || "ไม่มีชื่อเรื่อง",
            
            // ปรับปรุงการจัดการหมวดหมู่: ถ้าไม่มีให้ใส่ "ทั่วไป"
            categories: data.categories && data.categories.length > 0
              ? data.categories.map(cat => typeof cat === "object" ? cat.name : cat)
              : ["ทั่วไป"],

            coverImage: formatMinioUrl(data.cover_image),
            coverEmoji: data.cover_image ? "" : "📘",

            author: {
              displayName: data.author_name || data.pen_name || "ไม่ทราบผู้แต่ง",
              avatarUrl: formatMinioUrl(data.author_avatar),
            },

            synopsis: data.captions || data.introduction || "ไม่มีคำโปรย",
            
            // กำหนดค่าสถิติจาก API หากไม่มีให้เริ่มที่ 0
            stats: {
              views: data.views || 0,
              paths: data.paths_count || 0, // ปรับตามชื่อ field ใน database ของคุณ
              choicePoints: data.choice_points || 0,
              endings: data.endings_count || 1,
            },
            
            isLiked: data.is_liked || false,
            isBookmarked: data.is_bookmarked || false,
          };
        });

        setNovels(formattedNovels);
      } catch (err) {
        console.error("API Error:", err);
        setError("ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้");
        setNovels([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  const handleReadNovel = (novelId) => {
    navigate(`/novel/${novelId}`);
    if (onNavigate) {
      onNavigate("detail", { id: novelId });
    }
  };

  return (
    <div className="home">
      <section className="home__hero">
        <div className="home__hero-inner">
          <div className="home__hero-left">
            <div className="home__hero-eyebrow">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.5 4h4l-3.2 2.3 1.2 3.7L7 9 3.5 11l1.2-3.7L1.5 5h4z" fill="#ec4899" />
              </svg>
              นิยายทางเลือกแบบ Interactive
            </div>
            <h1 className="home__hero-title">
              ทุกตัวเลือก<br />
              <span className="home__hero-title-accent">เปลี่ยนชะตา</span><br />
              ของเรื่องราว
            </h1>
            <p className="home__hero-desc">
              สัมผัสประสบการณ์นิยายทางเลือกที่คุณเป็นผู้กำหนดจุดจบ
            </p>
          </div>
          {/* ตกแต่งด้านขวาด้วยหนังสือและไอคอน */}
          <div className="home__hero-right" aria-hidden="true">
            <div className="home__books">
              <div className="home__book home__book--main" style={{ background: HERO_BOOK_BG[1] }}>
                <span className="home__book-emoji">📖</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home__section">
        <div className="home__section-inner">
          <div className="home__section-header">
            <h2 className="home__section-title">นิยายยอดนิยม</h2>
            {error && <span className="error-text" style={{ color: '#ef4444' }}>{error}</span>}
          </div>

          {loading ? (
            <div className="loading-container">
              <p>กำลังดึงข้อมูลจากระบบ...</p>
            </div>
          ) : (
            <div className="home__novel-grid">
              {novels.length > 0 ? (
                novels.map((novel) => (
                  <div key={novel.id}>
                    <NovelCard
                      novel={novel}
                      onClick={() => handleReadNovel(novel.id)}
                    />
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>ไม่พบรายการนิยายในระบบ</p>
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
