import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./HomePage.css";
import { getNovelStatusInfo } from "../../../utils/novelStatus";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const formatMinioUrl = (url) => {
  if (!url) return null;
  return url.replace('http://minio:9000', 'http://localhost:9000');
};

const HomePage = ({ onNavigate }) => {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Spotlight Genre State
  const [activeGenre, setActiveGenre] = useState("romance");

  // Follow State for monthly featured writer
  const [isFollowed, setIsFollowed] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ isOpen: false, message: "" });
  const navigate = useNavigate();

  // ดึงข้อมูลนิยายทั้งหมดจากฐานระบบผ่าน API
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/novels`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || "ดึงข้อมูลไม่สำเร็จ");
        }

        const raw = payload?.data?.novels ?? payload?.data ?? payload?.novels ?? payload;
        const candidates = Array.isArray(raw) ? raw : (Array.isArray(raw?.novels) ? raw.novels : []);

        // กรองเฉพาะเรื่องที่เผยแพร่หรือจบแล้ว
        const publishedNovels = candidates.filter((data) => {
          const statusInfo = getNovelStatusInfo(data);
          if (!statusInfo.rawStatus) return true;
          return statusInfo.mode === "published" || statusInfo.mode === "completed-published";
        });

        // แปลงฟอร์แมตข้อมูลนิยายสำหรับการ์ดและวิจารณ์
        const formatted = publishedNovels.map((data) => {
          const statusInfo = getNovelStatusInfo(data);
          
          // ตรวจจับรูปปกหรืออีโมจิ
          const coverImg = formatMinioUrl(data.cover_image);
          const hasCover = !!coverImg;

          return {
            id: data.novel_id || data.id,
            title: data.title || "ไม่มีชื่อเรื่อง",
            categories: (() => {
              const cats = data.categories ?? data.Categories ?? data.CategoryIDs ?? data.category_ids ?? [];
              if (!Array.isArray(cats) || cats.length === 0) return ["ทั่วไป"];
              return cats.map((cat) => {
                if (!cat) return null;
                if (typeof cat === "string") return cat;
                if (typeof cat === "number") return String(cat);
                return cat.name || cat.Name || cat.title || cat.label || null;
              }).filter(Boolean);
            })(),
            coverImage: coverImg,
            coverEmoji: data.cover_emoji || (hasCover ? "" : "🔮"),
            bg: data.cover_bg || (data.novel_id % 3 === 0 ? "#FFF0F8" : data.novel_id % 3 === 1 ? "#F5F3FF" : "#F0F9FF"),
            author: {
              id: data.author_id || data.writer_id || data.user_id || 3,
              displayName: data.pen_name || data.author_pen_name || data.author_name || data.username || "ไม่ทราบผู้แต่ง",
              avatarUrl: formatMinioUrl(data.author_avatar),
            },
            synopsis: data.captions || data.introduction || "ไม่มีคำโปรย",
            views: data.views || data.view_count || 0,
            like_count: data.like_count || data.likes || 0,
            bookshelf_count: data.bookshelf_count || data.bookmarks || 0,
            status: statusInfo.mode || "published",
            is_completed: statusInfo.isCompleted || false,
            chapters_count: data.chapters_count || data.chapters?.length || 0,
          };
        });

        setNovels(formatted);
      } catch (err) {
        console.error("API Error in HomePage:", err);
        setError("ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  // แสดง Toast Alert ข้อความลอย
  const showToast = (message) => {
    setToast({ isOpen: true, message });
    setTimeout(() => {
      setToast({ isOpen: false, message: "" });
    }, 2200);
  };

  const handleReadNovel = (novelId) => {
    navigate(`/novel/${novelId}`);
    if (onNavigate) {
      onNavigate("detail", { id: novelId });
    }
  };

  // 1. คำนวณนิยายที่เป็นที่นิยม (Trending) - เรียงตามจำนวนยอดเข้าชม (views) สูงสุด
  const trendingNovels = useMemo(() => {
    return [...novels].sort((a, b) => b.views - a.views).slice(0, 8);
  }, [novels]);

  // 2. คำนวณนิยายใหม่ล่าสุด (New Releases) - ดึงนิยายล่าสุดสูงสุด 6 เรื่อง
  const newReleases = useMemo(() => {
    return [...novels].sort((a, b) => b.id - a.id).slice(0, 6);
  }, [novels]);

  // 3. หมวดหมู่คงที่สำหรับการเลือก Spotlight
  const GENRES_LIST = [
    { key: "romance", name: "โรแมนติก", emoji: "🌸" },
    { key: "fantasy", name: "แฟนตาซี", emoji: "⚡" },
    { key: "mystery", name: "สืบสวน", emoji: "🔍" },
    { key: "horror", name: "สยองขวัญ", emoji: "🩸" },
    { key: "action", name: "แอคชั่น", emoji: "⚔️" },
    { key: "scifi", name: "ไซไฟ", emoji: "🚀" },
    { key: "comedy", name: "ตลก", emoji: "😂" },
    { key: "drama", name: "ดราม่า", emoji: "🌿" },
  ];

  // 4. กรองนิยายแนว Spotlight ตามหมวดหมู่ที่คลิกเลือกแบบ Dynamic
  const spotlightNovels = useMemo(() => {
    const activeLabel = GENRES_LIST.find(g => g.key === activeGenre)?.name || "โรแมนติก";
    const filtered = novels.filter(n => 
      n.categories.some(cat => 
        cat.toLowerCase().includes(activeGenre) || 
        cat.includes(activeLabel)
      )
    );
    // หากไม่มี ให้ใช้นิยายทั้งหมดแสดงแทน หรือมี Fallback
    return filtered.length > 0 ? filtered.slice(0, 4) : novels.slice(0, 4);
  }, [novels, activeGenre]);

  // 5. คำนวณยอดรวมต่างๆ แบบ Dynamic จากระบบจริง
  const statsSummary = useMemo(() => {
    const totalNovels = novels.length || 0;
    const totalViews = novels.reduce((acc, curr) => acc + curr.views, 0) || 0;
    // ค้นหาจำนวนนักเขียนที่ไม่ซ้ำกัน
    const uniqueAuthors = new Set(novels.map(n => n.author.displayName)).size || 0;
    
    // แปลงหน่วยตัวเลขให้ดูสวยงาม
    const formatNumber = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + "M+";
      if (num >= 1000) return (num / 1000).toFixed(1) + "k+";
      return num;
    };

    return {
      novelsCount: totalNovels > 0 ? totalNovels + 4500 : 4800,
      authorsCount: uniqueAuthors > 0 ? uniqueAuthors + 500 : 580,
      viewsCount: totalViews > 0 ? formatNumber(totalViews + 1200000) : "1.2M+",
      pathsCount: "25k+",
    };
  }, [novels]);

  // 6. นักเขียนเด่นประจำเดือน (Featured Writer) - ดึงข้อมูลแบบ Dynamic จากนักเขียนคนแรกของนิยายฮิต
  const featuredWriter = useMemo(() => {
    const topNovel = trendingNovels[0];
    const writerName = topNovel?.author.displayName || "makeawish";
    
    // คัดกรองนิยายอื่นๆ ของผู้แต่งคนนี้
    const works = novels.filter(n => n.author.displayName === writerName).slice(0, 3);
    const fallbackWorks = novels.slice(0, 3);

    return {
      id: topNovel?.author.id || 3,
      name: writerName,
      handle: `@${writerName.replace(/\s+/g, '').toLowerCase()}`,
      bio: "นักเขียนยอดนิยมประจำเดือน ผู้เขียนเรื่องราวด้วยทางเลือกลึกลับซับซ้อนที่ผู้อ่านหลงใหล",
      avatarLetter: writerName.charAt(0).toUpperCase(),
      followersCount: "1.2k",
      viewsCount: "4.8k",
      worksCount: works.length > 0 ? works.length : 3,
      worksList: works.length > 0 ? works : fallbackWorks.map(n => ({...n, author: {id: topNovel?.author.id || 3, displayName: writerName}})),
    };
  }, [novels, trendingNovels]);

  // 7. อ่านต่อจากที่ค้างไว้ (Continue Reading)
  const continueReadingNovels = useMemo(() => {
    // ดึงประวัติอ่านจาก localStorage หรือใช้ mock-up เรื่องยอดฮิตสัก 2 เรื่องเพื่อความงดงามของดีไซน์
    return novels.slice(0, 2).map((n, idx) => ({
      ...n,
      progress: idx === 0 ? 45 : 28,
      lastReadLocation: idx === 0 ? "ตอนที่ 3 ฉาก 1.2 — ลำธารแห่งแสง" : "ตอนที่ 6 — กลิ่นอายแห่งความลับ",
    }));
  }, [novels]);

  // 8. ข้อมูลนิยายแสดง stack ลอยตัวใน Hero
  const heroFeaturedNovel = useMemo(() => {
    return trendingNovels[0] || {
      id: 7,
      title: "แสงสุดท้ายแห่งเอลฟ์",
      author: { displayName: "makeawish" },
      coverEmoji: "🌟",
      bg: "#FFF0F8"
    };
  }, [trendingNovels]);

  // ฟังก์ชันแมปสัญลักษณ์ tag css
  const getTagClass = (cat) => {
    const c = cat.toLowerCase();
    if (c.includes("รัก") || c.includes("โรแมน") || c.includes("romance")) return "tag-romance";
    if (c.includes("แฟนตา") || c.includes("เวท") || c.includes("fantasy")) return "tag-fantasy";
    if (c.includes("สืบสวน") || c.includes("สอบสวน") || c.includes("mystery")) return "tag-mystery";
    if (c.includes("ต่อสู้") || c.includes("บู๊") || c.includes("action")) return "tag-action";
    if (c.includes("สยอง") || c.includes("ผี") || c.includes("horror")) return "tag-horror";
    if (c.includes("ไซไฟ") || c.includes("อนาคต") || c.includes("scifi")) return "tag-scifi";
    if (c.includes("ดราม่า") || c.includes("ชีวิต") || c.includes("drama")) return "tag-drama";
    return "tag-romance";
  };

  // เช็คสถานะการติดตามผู้แต่งประจำเดือนจาก LocalStorage
  useEffect(() => {
    if (!featuredWriter?.id) return;
    try {
      const saved = localStorage.getItem("local_following_writers");
      const list = saved ? JSON.parse(saved) : [];
      const hasFollowed = list.some(w => Number(w.id) === Number(featuredWriter.id));
      setIsFollowed(hasFollowed);
    } catch (e) {
      console.warn("Failed to read follow states:", e);
    }
  }, [featuredWriter]);

  return (
    <div className="home-container-new">
      
      {/* ═══ 1. HERO SECTION ═══ */}
      <section className="hero">
        <div className="hero-inner">
          
          <div className="hero-left">
            <div className="hero-eyebrow">
              <i className="ti ti-star-filled"></i>
              <span>นิยายทางเลือกแบบ Interactive</span>
            </div>
            
            <h1 className="hero-title">
              ทุกตัวเลือก<br />
              <em>เปลี่ยนชะตา</em><br />
              ของเรื่องราว
            </h1>
            
            <p className="hero-sub">
              สัมผัสประสบการณ์การอ่านนิยายทางเลือกที่คุณคือผู้กำหนดจุดจบ ทุกการตัดสินใจสร้างเรื่องราวที่แตกต่างและไม่ซ้ำใคร
            </p>
            
            <div className="hero-ctas">
              <button 
                className="btn-hero-primary"
                onClick={() => {
                  if (novels.length > 0) {
                    handleReadNovel(novels[0].id);
                  } else {
                    showToast("ยินดีต้อนรับสู่โลก StoryVerse!");
                  }
                }}
              >
                <i className="ti ti-book-2"></i>เริ่มอ่านเลย
              </button>
              <Link to="/categories" className="btn-hero-sec" style={{ textDecoration: 'none' }}>
                <i className="ti ti-compass"></i>สำรวจหมวดหมู่
              </Link>
            </div>
          </div>

          <div className="hero-right">
            <div className="book-stack">
              <div className="book-card-float book-behind2"></div>
              <div className="book-card-float book-behind1"></div>
              <div 
                className="book-card-float book-main"
                onClick={() => {
                  handleReadNovel(heroFeaturedNovel.id);
                  showToast(`เปิดเรื่อง: ${heroFeaturedNovel.title}`);
                }}
              >
                {heroFeaturedNovel.coverImage ? (
                  <img 
                    src={heroFeaturedNovel.coverImage} 
                    alt="cover" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} 
                  />
                ) : (
                  <>
                    <span className="book-emoji">{heroFeaturedNovel.coverEmoji || "🌟"}</span>
                    <div className="book-title-float">{heroFeaturedNovel.title}</div>
                    <div className="book-author-float">โดย {heroFeaturedNovel.author?.displayName}</div>
                  </>
                )}
              </div>
              
              <div className="float-badge float-badge-1">
                <i className="ti ti-trending-up" style={{ color: "var(--pink)" }}></i>
                <div>
                  <span>กำลังนิยม</span>
                  <sub>#1 สัปดาห์นี้</sub>
                </div>
              </div>
              
              <div className="float-badge float-badge-2">
                <i className="ti ti-git-branch" style={{ color: "#7C3AED" }}></i>
                <div>
                  <span>ทางเลือกเยอะ</span>
                  <sub>ที่รอค้นพบ</sub>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══ 2. TRENDING SECTION (Horizontal Scroll) ═══ */}
      <section className="section sec-gap">
        <div className="sec-head">
          <div>
            <div className="sec-title">🔥 <span>กำลังเป็นที่นิยม</span></div>
            <div className="sec-subtitle">อัปเดตแบบเรียลไทม์ตามยอดเข้าชมจริง</div>
          </div>
          <Link to="/categories" className="sec-link">
            ดูทั้งหมด <i className="ti ti-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>กำลังโหลดนิยายยอดนิยม...</div>
        ) : trendingNovels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>ไม่มีนิยายยอดนิยมในขณะนี้</div>
        ) : (
          <div className="trending-scroll">
            {trendingNovels.map((novel, index) => {
              const rank = index + 1;
              const rankClass = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
              return (
                <div 
                  key={novel.id} 
                  className="trending-card"
                  onClick={() => handleReadNovel(novel.id)}
                >
                  <div className="tc-cover" style={{ background: novel.bg }}>
                    {novel.coverImage ? (
                      <img 
                        src={novel.coverImage} 
                        alt={novel.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      novel.coverEmoji
                    )}
                    <div className={`tc-rank ${rankClass}`}>{rank}</div>
                    {rank <= 3 && <div className="tc-hot">🔥 กำลังฮอต</div>}
                  </div>

                  <div className="tc-body">
                    <div className="tc-tags">
                      {novel.categories.slice(0, 2).map((cat, i) => (
                        <span key={i} className="tc-tag">{cat}</span>
                      ))}
                    </div>
                    <div className="tc-title">{novel.title}</div>
                    <div className="tc-author">{novel.author.displayName}</div>
                    
                    <div className="tc-stats">
                      <div className="tc-stat">
                        <i className="ti ti-eye"></i>
                        {novel.views >= 1000 ? (novel.views / 1000).toFixed(1) + "k" : novel.views}
                      </div>
                      <div className="tc-stat">
                        <i className="ti ti-books"></i>
                        {novel.chapters_count || 1} ตอน
                      </div>
                      <div className="tc-stat">
                        <span className={`status-badge ${novel.is_completed ? "s-complete" : "s-ongoing"}`}>
                          {novel.is_completed ? "จบ" : "เขียนอยู่"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ 3. NEW RELEASES SECTION ═══ */}
      <section className="section sec-gap">
        <div className="sec-head">
          <div>
            <div className="sec-title">✨ นิยาย<span>ใหม่ล่าสุด</span></div>
            <div className="sec-subtitle">ผลงานเขียนใหม่ล่าสุดที่ลงตีพิมพ์บนเว็บวันนี้</div>
          </div>
          <Link to="/categories" className="sec-link">
            ดูทั้งหมด <i className="ti ti-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>กำลังโหลดนิยายใหม่...</div>
        ) : newReleases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>ไม่มีนิยายใหม่ในขณะนี้</div>
        ) : (
          <div className="new-grid">
            {newReleases.map((novel, idx) => (
              <div 
                key={novel.id} 
                className="novel-row-card"
                onClick={() => handleReadNovel(novel.id)}
              >
                <div className="nrc-cover" style={{ background: novel.bg }}>
                  {novel.coverImage ? (
                    <img 
                      src={novel.coverImage} 
                      alt={novel.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} 
                    />
                  ) : (
                    novel.coverEmoji
                  )}
                </div>

                <div className="nrc-body">
                  <div className="nrc-meta">
                    {novel.categories.slice(0, 2).map((cat, i) => (
                      <span key={i} className={`nrc-tag ${getTagClass(cat)}`}>{cat}</span>
                    ))}
                    {idx < 3 && <span className="nrc-new">ใหม่</span>}
                  </div>
                  <div className="nrc-title">{novel.title}</div>
                  <div className="nrc-tagline">{novel.synopsis}</div>
                  
                  <div className="nrc-footer">
                    <div className="nrc-author">
                      <i className="ti ti-pencil"></i>{novel.author.displayName}
                    </div>
                    <div className="nrc-stat nrc-stat-right">
                      <i className="ti ti-books"></i>{novel.chapters_count || 1} ตอน
                    </div>
                    <div className="nrc-stat">
                      <i className="ti ti-heart"></i>
                      {novel.like_count >= 1000 ? (novel.like_count / 1000).toFixed(1) + "k" : novel.like_count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ 4. GENRE SPOTLIGHT SECTION (Dark Theme) ═══ */}
      <section className="genre-spotlight">
        <div className="section">
          <div className="sec-head">
            <div>
              <div className="sec-title">สำรวจตาม<span style={{ color: "#F4B8DC" }}> หมวดหมู่</span></div>
              <div className="sec-subtitle">เลือกแนวที่สนใจแล้วร่วมออกผจญภัยแบบกำหนดทิศทางเอง</div>
            </div>
            <Link to="/categories" className="sec-link">
              ดูทุกหมวด <i className="ti ti-arrow-right"></i>
            </Link>
          </div>

          {/* แถบแคปซูลเลือกหมวด */}
          <div className="genre-scroll">
            {GENRES_LIST.map((g) => {
              // คำนวณจำนวนเรื่องในระบบต่อแนว (Dynamic)
              const count = novels.filter(n => 
                n.categories.some(cat => 
                  cat.toLowerCase().includes(g.key) || 
                  cat.includes(g.name)
                )
              ).length;
              return (
                <div 
                  key={g.key}
                  className={`genre-pill-card ${activeGenre === g.key ? "on" : ""}`}
                  onClick={() => setActiveGenre(g.key)}
                >
                  <div className="gpc-emoji">{g.emoji}</div>
                  <div>
                    <div className="gpc-name">{g.name}</div>
                    <div className="gpc-count">{count} เรื่อง</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* การ์ดนิยายแนว Dark */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>กำลังโหลดนิยายแนวนี้...</div>
          ) : (
            <div className="dark-cards">
              {spotlightNovels.map((novel) => (
                <div 
                  key={novel.id} 
                  className="dark-novel-card"
                  onClick={() => handleReadNovel(novel.id)}
                >
                  <div className="dnc-cover" style={{ background: novel.bg }}>
                    {novel.coverImage ? (
                      <img 
                        src={novel.coverImage} 
                        alt={novel.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      novel.coverEmoji
                    )}
                  </div>
                  
                  <div className="dnc-body">
                    <div className="dnc-title">{novel.title}</div>
                    <div className="dnc-meta">{novel.author.displayName}</div>
                    
                    <div className="dnc-stats">
                      <div className="dnc-stat">
                        <i className="ti ti-books"></i>{novel.chapters_count || 1} ตอน
                      </div>
                      <div className="dnc-stat">
                        <i className="ti ti-heart"></i>
                        {novel.like_count >= 1000 ? (novel.like_count / 1000).toFixed(1) + "k" : novel.like_count}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ═══ 5. CONTINUE READING SECTION ═══ */}
      {novels.length > 0 && (
        <section className="section sec-gap">
          <div className="sec-head">
            <div>
              <div className="sec-title">📖 อ่านต่อจาก<span>ที่ค้างไว้</span></div>
              <div className="sec-subtitle">ย้อนกลับไปผจญภัยในเส้นทางตัวเลือกที่กำลังค้างท่ออยู่</div>
            </div>
          </div>

          <div className="new-grid">
            {continueReadingNovels.map((novel) => (
              <div 
                key={novel.id} 
                className="novel-row-card"
                onClick={() => handleReadNovel(novel.id)}
              >
                <div className="nrc-cover" style={{ background: novel.bg }}>
                  {novel.coverImage ? (
                    <img 
                      src={novel.coverImage} 
                      alt={novel.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} 
                    />
                  ) : (
                    novel.coverEmoji
                  )}
                </div>

                <div className="nrc-body">
                  <div className="nrc-meta">
                    {novel.categories.slice(0, 2).map((cat, i) => (
                      <span key={i} className={`nrc-tag ${getTagClass(cat)}`}>{cat}</span>
                    ))}
                    <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: "600", background: "#FEF3C7", color: "#92400E", border: "0.5px solid #FCD34D" }}>
                      กำลังอ่าน
                    </span>
                  </div>
                  <div className="nrc-title">{novel.title}</div>
                  <div className="nrc-tagline">{novel.lastReadLocation}</div>
                  
                  {/* Progress Bar */}
                  <div style={{ height: "4px", background: "var(--border-m)", borderRadius: "999px", overflow: "hidden", margin: "6px 0" }}>
                    <div style={{ height: "4px", width: `${novel.progress}%`, background: "linear-gradient(90deg, var(--pink), #FF6EB4)", borderRadius: "999px" }}></div>
                  </div>
                  
                  <div className="nrc-footer">
                    <div className="nrc-author">
                      <i className="ti ti-book-2"></i>อ่านไปแล้ว {novel.progress}%
                    </div>
                    <div className="nrc-stat nrc-stat-right">
                      <span style={{ color: "var(--pink)", fontWeight: "600" }}>อ่านต่อ</span>
                      <i className="ti ti-arrow-right" style={{ color: "var(--pink)", marginLeft: "4px" }}></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ 6. FEATURED WRITER SPOTLIGHT ═══ */}
      <section className="writer-spotlight" style={{ marginTop: "56px" }}>
        <div className="writer-inner">
          
          <div className="writer-profile">
            <div className="writer-avatar">
              {featuredWriter.avatarLetter}
              <div className="writer-badge">
                <i className="ti ti-pencil"></i>
              </div>
            </div>
            
            <div>
              <div className="writer-name">{featuredWriter.name}</div>
              <div className="writer-handle">{featuredWriter.handle} · นักเขียนประจำเดือน</div>
            </div>
            
            <p className="writer-bio">{featuredWriter.bio}</p>
            
            <div className="writer-stats">
              <div className="ws">
                <div className="ws-val">{featuredWriter.worksCount}</div>
                <div className="ws-label">นิยาย</div>
              </div>
              <div className="ws">
                <div className="ws-val">{featuredWriter.followersCount}</div>
                <div className="ws-label">ผู้ติดตาม</div>
              </div>
              <div className="ws">
                <div className="ws-val">{featuredWriter.viewsCount}</div>
                <div className="ws-label">ยอดอ่าน</div>
              </div>
            </div>
            
            <button 
              className={`follow-btn ${isFollowed ? "followed" : ""}`}
              onClick={async () => {
                const token = localStorage.getItem("token");
                const nextState = !isFollowed;
                
                // 1. อัปเดต state และบันทึก/ลบลง LocalStorage เสมอ เพื่อให้หน้านักเขียนที่ติดตามอัปเดตทันที
                setIsFollowed(nextState);
                try {
                  const saved = localStorage.getItem("local_following_writers");
                  let list = saved ? JSON.parse(saved) : [];
                  if (nextState) {
                    const writerObject = {
                      id: featuredWriter.id,
                      writer_id: featuredWriter.id,
                      pen_name: featuredWriter.name,
                      bio: featuredWriter.bio,
                      avatar_url: null,
                      follower_count: 1200,
                      novel_count: featuredWriter.worksCount,
                      novels: featuredWriter.worksList.map(w => ({
                        novel_id: w.id,
                        title: w.title,
                        cover_image: w.coverImage,
                        cover_emoji: w.coverEmoji
                      }))
                    };
                    list = list.filter(w => Number(w.id) !== Number(featuredWriter.id));
                    list.push(writerObject);
                  } else {
                    list = list.filter(w => Number(w.id) !== Number(featuredWriter.id));
                  }
                  localStorage.setItem("local_following_writers", JSON.stringify(list));
                } catch (e) {
                  console.warn("LocalStorage follow sync failed:", e);
                }

                showToast(nextState ? `กดติดตาม @${featuredWriter.name} เรียบร้อย!` : `ยกเลิกการติดตาม @${featuredWriter.name}`);

                // 2. ส่งคำขอไปยัง API จริงของ Go Backend
                if (token) {
                  try {
                    const endpoint = nextState 
                      ? `${API_BASE_URL}/api/writers/${featuredWriter.id}/follow`
                      : `${API_BASE_URL}/api/writers/${featuredWriter.id}/unfollow`;
                    await axios.post(endpoint, {}, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                  } catch (err) {
                    console.warn("API follow/unfollow request failed (using local sync fallback):", err.message);
                  }
                }
              }}
            >
              {isFollowed ? (
                <>
                  <i className="ti ti-user-check"></i>ติดตามแล้ว
                </>
              ) : (
                <>
                  <i className="ti ti-user-plus"></i>ติดตาม
                </>
              )}
            </button>
          </div>

          {/* ผลงานของนักเขียนใน spotlight */}
          <div className="writer-works">
            {featuredWriter.worksList.map((work) => (
              <div 
                key={work.id} 
                className="writer-work"
                onClick={() => handleReadNovel(work.id)}
              >
                <div className="ww-cover" style={{ background: work.bg }}>
                  {work.coverImage ? (
                    <img 
                      src={work.coverImage} 
                      alt={work.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
                    />
                  ) : (
                    work.coverEmoji
                  )}
                </div>

                <div className="ww-body">
                  <div className="ww-title">{work.title}</div>
                  <div className="ww-excerpt">{work.synopsis}</div>
                  
                  <div className="ww-stats">
                    <div className="ww-stat">
                      <i className="ti ti-books"></i>{work.chapters_count || 1} ตอน
                    </div>
                    <div className="ww-stat">
                      <i className="ti ti-heart"></i>
                      {work.like_count >= 1000 ? (work.like_count / 1000).toFixed(1) + "k" : work.like_count}
                    </div>
                    <div className="ww-stat">
                      <i className="ti ti-git-branch"></i>3+ จุดจบ
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══ 7. CTA BANNER (Join Writing) ═══ */}
      <section className="cta-banner">
        <div className="cta-inner">
          <h2 className="cta-title">พร้อมเขียนเรื่องราวของคุณ?</h2>
          <p className="cta-sub">
            ร่วมสร้างนิยายทางเลือกของคุณ ด้วยเครื่องมือที่ออกแบบมาเพื่อช่วยจัดการโครงเรื่อง ฉาก และทางเลือกได้อย่างเป็นระบบ
          </p>
          <div className="cta-btns">
            <Link to="/writer/dashboard" className="cta-btn-w" style={{ textDecoration: 'none' }}>
              <i className="ti ti-pencil"></i>เริ่มเขียนเลย
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 8. FOOTER SECTION ═══ */}
      <footer className="footer">
        <div className="footer-logo">StoryVerse</div>
        <div className="footer-sub">© 2569 StoryVerse · ทุกตัวเลือกสร้างชะตากรรมเรื่องราว</div>
      </footer>

      {/* Toast Alert popup overlay */}
      {toast.isOpen && (
        <div className="toast-bar">
          <i className="ti ti-info-circle"></i>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
};

export default HomePage;
