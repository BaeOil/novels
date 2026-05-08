// src/pages/Home/HomePage.jsx
import React from "react";
import "./HomePage.css";
import NovelCard from "../../../components/NovelCard/NovelCard";
import { mockNovels } from "../../../data/mockData";

// ──────────────────────────────────────────
// TODO: แทนที่ mockNovels ด้วย API call:
//   useEffect(() => {
//     fetch('/api/novels?sort=popular&limit=10')
//       .then(r => r.json()).then(setNovels)
//   }, []);
// ──────────────────────────────────────────

const HERO_BOOK_BG = [
  "linear-gradient(150deg,#c8f7c5,#a8e6cf)",
  "linear-gradient(150deg,#ffd6e7,#ffb3c6)",
  "linear-gradient(150deg,#fff3cd,#ffe082)",
];

const HomePage = ({ onNavigate }) => {
  const handleReadNovel = (novelId) => {
    // TODO: navigate to /novel/:id
    onNavigate("novel-detail", { novelId });
  };

  return (
    <div className="home">

      {/* ── Hero Section ── */}
      <section className="home__hero" aria-label="ส่วนแนะนำ">
        <div className="home__hero-inner">
          {/* Left: text */}
          <div className="home__hero-left">
            <div className="home__hero-eyebrow">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1l1.5 4h4l-3.2 2.3 1.2 3.7L7 9 3.5 11l1.2-3.7L1.5 5h4z" fill="var(--pink-500)"/>
              </svg>
              นิยายทางเลือกแบบ Interactive
            </div>
            <h1 className="home__hero-title">
              ทุกตัวเลือก<br/>
              <span className="home__hero-title-accent">เปลี่ยนชะตา</span><br/>
              ของเรื่องราว
            </h1>
            <p className="home__hero-quote">"เรื่องเดียวกัน — จบไม่เหมือนกัน"</p>
            <p className="home__hero-desc">
              สัมผัสประสบการณ์นิยายทางเลือกรูปแบบใหม่ ที่คุณเป็นผู้กำหนดจุดจบ
              เลือกเส้นทาง ค้นพบตอนจบที่แตกต่าง
            </p>
          </div>

          {/* Right: floating books */}
          <div className="home__hero-right" aria-hidden="true">
            <div className="home__books">
              <div className="home__book home__book--back2" style={{ background: HERO_BOOK_BG[2] }}>
                <span className="home__book-emoji">🔥</span>
              </div>
              <div className="home__book home__book--back1" style={{ background: HERO_BOOK_BG[0] }}>
                <span className="home__book-emoji">🌊</span>
              </div>
              <div className="home__book home__book--main" style={{ background: HERO_BOOK_BG[1] }}>
                <span className="home__book-label">SAKAMOTO<br/>HOLIDAYS</span>
                <span className="home__book-emoji home__book-emoji--main">🎌</span>
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
            </div>
            <button className="home__see-all" aria-label="ดูนิยายทั้งหมด">
              ดูทั้งหมด
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="home__novel-grid" role="list">
            {mockNovels.map((novel) => (
              <div role="listitem" key={novel.id}>
                <NovelCard
                  novel={novel}
                  onClick={() => handleReadNovel(novel.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;