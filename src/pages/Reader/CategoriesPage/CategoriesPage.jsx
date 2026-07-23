import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { getNovelStatusInfo } from "../../../utils/novelStatus";
import "./CategoriesPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const normalizeNovel = (data) => {
  const rawCats = data.categories ?? data.Categories ?? data.category_ids ?? data.CategoryIDs ?? [];
  const statusInfo = getNovelStatusInfo(data);
  
  const isActuallyPublished = data.status?.toLowerCase() === "published" || 
                              data.is_published === true || 
                              statusInfo.isPublished || 
                              statusInfo.mode === "published";

  const cleanCategories = Array.isArray(rawCats) 
    ? rawCats.map(c => {
        if (!c) return "";
        if (typeof c === "string") return c.trim();
        return String(c.name || c.Title || c.title || c.label || "").trim();
      }).filter(Boolean) 
    : [];
    
  const uniqueCategories = [...new Set(cleanCategories)];

  return {
    id: data.id || data.novel_id,
    title: data.title || "ไม่มีชื่อเรื่อง",
    categories: uniqueCategories,
    coverImage: data.cover_image || data.coverImage || null,
    synopsis: data.captions || data.introduction || data.description || "",
    author: data.pen_name || data.penName || data.author_pen_name || data.author_penName || data.author_name || data.authorName || "ไม่ทราบผู้แต่ง",
    stats: {
      views: data.views || data.view_count || 0,
      likes: data.like_count || data.likes || 0,
      chaptersCount: data.chapters_count ?? data.chaptersCount ?? (data.chapters ? data.chapters.length : 0),
    },
    status: data.status || "draft",
    isPublished: isActuallyPublished,
  };
};

const CategoriesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ดึงคำค้นหาเริ่มต้นจาก URL Query (?search=...)
  const getSearchFromUrl = useCallback(() => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  }, [location.search]);

  const [categories, setCategories] = useState([]);
  const [novels, setNovels] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState(getSearchFromUrl());
  const [sortBy, setSortBy] = useState("relevant"); // relevant | most_read | latest
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ฟังการสลับ Search Query จาก URL ตลอดเวลา
  useEffect(() => {
    setSearchQuery(getSearchFromUrl());
  }, [location.search, getSearchFromUrl]);

  // รับ Event จาก Navbar เมื่อพิมพ์ค้นหา
  useEffect(() => {
    const handleSearchChange = (e) => {
      if (e.detail !== undefined) {
        setSearchQuery(e.detail);
      }
    };
    window.addEventListener("search-change", handleSearchChange);
    return () => window.removeEventListener("search-change", handleSearchChange);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, novelRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/categories`),
        axios.get(`${API_BASE_URL}/novels`),
      ]);

      const catData = catRes.data?.data || catRes.data || [];
      const novelData = novelRes.data?.data?.novels
                     || novelRes.data?.novels
                     || novelRes.data?.data
                     || novelRes.data
                     || [];

      const allNovels = Array.isArray(novelData) ? novelData.map(normalizeNovel) : [];
      const publishedNovels = allNovels.filter(n => n.isPublished);

      const dbCats = Array.isArray(catData)
        ? catData.map(c => ({ id: c.category_id || c.id, name: String(c.name || c.title || "").trim() }))
        : [];

      setNovels(publishedNovels);
      setCategories(dbCats);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดข้อมูลนิยายได้ในขณะนี้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🎯 กรองและเรียงลำดับนิยาย (Search + Category Filter + Sort Dropdown)
  const filteredAndSortedNovels = useMemo(() => {
    let result = [...novels];

    // 1. กรองด้วยหมวดหมู่
    if (activeCategory) {
      result = result.filter(n => n.categories.includes(activeCategory));
    }

    // 2. กรองด้วยคำค้นหา (ค้นชื่อเรื่อง นามปากกา หรือคำโปรย)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        n.synopsis.toLowerCase().includes(q)
      );
    }

    // 3. เรียงลำดับนิยาย
    if (sortBy === "most_read") {
      result.sort((a, b) => b.stats.views - a.stats.views);
    } else if (sortBy === "latest") {
      result.sort((a, b) => (b.id || 0) - (a.id || 0)); // สมมติไอดีใหม่กว่าคืออัปเดตล่าสุด
    }

    return result;
  }, [novels, activeCategory, searchQuery, sortBy]);

  // ดึงรายการนิยายยอดนิยม 5 อันดับแรกเรียงตามยอดเข้าชมเพื่อแสดงใน Sidebar
  const popularNovels = useMemo(() => {
    return [...novels]
      .sort((a, b) => (b.stats.views || 0) - (a.stats.views || 0))
      .slice(0, 5);
  }, [novels]);

  // ฟังก์ชันสลับหมวดหมู่
  const handleCategoryToggle = (name) => {
    setActiveCategory(prev => prev === name ? null : name);
  };

  // แถบรายการหมวดหมู่แบบปุ่ม (Horizontal Genre Buttons)
  const filterTabs = [
    { name: "ทั้งหมด", value: null },
    ...categories.map(c => ({ name: c.name, value: c.name }))
  ];

  return (
    <div className="search-page">
      <div className="search-page-container">
        
        {/* Header ส่วนหัวผลการค้นหา */}
        <header className="search-header">
          <h1 className="search-title">
            {searchQuery.trim() ? (
              <>ผลการค้นหา: <span className="highlight-text">"{searchQuery}"</span></>
            ) : activeCategory ? (
              <>หมวดหมู่: <span className="highlight-text">"{activeCategory}"</span></>
            ) : (
              "นิยายทั้งหมด"
            )}
          </h1>
          <p className="search-count">พบ {filteredAndSortedNovels.length} เรื่อง</p>
        </header>

        {/* แถบตัวกรอง Filters Bar */}
        <div className="filter-bar">
          <div className="filter-tabs">
            {filterTabs.map((tab, idx) => {
              const isActive = activeCategory === tab.value;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`filter-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => setActiveCategory(tab.value)}
                >
                  {tab.name === "ทั้งหมด" && <span className="tab-dot">📌</span>}
                  {tab.name}
                </button>
              );
            })}
          </div>

          <div className="sort-dropdown-wrap">
            <select 
              className="sort-select" 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="relevant">เกี่ยวข้องมากสุด</option>
              <option value="most_read">ยอดอ่านสูงสุด</option>
              <option value="latest">อัปเดตล่าสุด</option>
            </select>
          </div>
        </div>

        {/* Layout แบ่ง 2 ฝั่ง (Split Layout) */}
        <div className="search-body-layout">
          
          {/* ฝั่งซ้าย: รายการการ์ดนิยายแนวนอน */}
          <main className="search-results-area">
            {loading ? (
              <div className="search-loading">กำลังค้นหานิยาย...</div>
            ) : error ? (
              <div className="search-error">{error}</div>
            ) : filteredAndSortedNovels.length === 0 ? (
              <div className="search-empty-state">
                <div className="empty-icon">🔍</div>
                <h3>ไม่พบผลการค้นหา</h3>
                <p>ลองใช้คำค้นหาอื่น หรือสำรวจหมวดหมู่อื่นดูสิ</p>
              </div>
            ) : (
              <div className="novel-list-vertical">
                {filteredAndSortedNovels.map((novel) => {
                  const statusInfo = getNovelStatusInfo(novel);
                  const isFinished = statusInfo.mode === "published" || novel.status?.toLowerCase() === "published" || statusInfo.isPublished;

                  return (
                    <article 
                      key={novel.id} 
                      className="novel-horiz-card"
                      onClick={() => navigate(`/novel/${novel.id}`)}
                    >
                      {/* หน้าปก */}
                      <div className="novel-horiz-cover">
                        {novel.coverImage ? (
                          <img 
                            src={novel.coverImage.replace("http://minio:9000", "http://localhost:9000")} 
                            alt={novel.title} 
                            loading="lazy"
                          />
                        ) : (
                          <div className="novel-cover-placeholder">📘</div>
                        )}
                      </div>

                      {/* รายละเอียด */}
                      <div className="novel-horiz-details">
                        <div className="novel-horiz-header">
                          <h3 className="novel-horiz-title">{novel.title}</h3>
                          <span className="novel-horiz-author">✍️ {novel.author}</span>
                        </div>

                        <p className="novel-horiz-synopsis">{novel.synopsis}</p>

                        <div className="novel-horiz-footer">
                          {/* Tags หมวดหมู่ */}
                          <div className="novel-tags">
                            {novel.categories.map((cat, cIdx) => (
                              <span key={cIdx} className="novel-tag-item">{cat}</span>
                            ))}
                          </div>

                          {/* สถิติ & สถานะ */}
                          <div className="novel-meta-info">
                            <span className="meta-stat">📖 {novel.stats.chaptersCount} ตอน</span>
                            <span className="meta-stat">👁️ {novel.stats.views.toLocaleString()} ยอดอ่าน</span>
                            <span className="meta-stat">❤️ {novel.stats.likes.toLocaleString()} ถูกใจ</span>
                            <span className={`status-badge ${isFinished ? "finished" : "writing"}`}>
                              {isFinished ? "จบแล้ว" : "กำลังเขียน"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>

          {/* ฝั่งขวา: กล่องแสดงกำลังเป็นที่นิยม และ หมวดหมู่ทั้งหมด */}
          <aside className="search-sidebar-area">
            
            {/* 1. กล่องกำลังเป็นที่นิยม */}
            {popularNovels.length > 0 && (
              <div className="sidebar-box popular-box" style={{ marginBottom: "20px" }}>
                <h3 className="sidebar-box-title">🏆 กำลังเป็นที่นิยม</h3>
                <div className="sidebar-popular-list">
                  {popularNovels.map((novel, idx) => {
                    const views = novel.stats?.views || 0;
                    const formattedViews = views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views;
                    const isTop3 = idx < 3;
                    
                    return (
                      <div 
                        key={novel.id} 
                        className="sidebar-popular-item"
                        onClick={() => navigate(`/novel/${novel.id}`)}
                      >
                        <span className={`popular-num ${isTop3 ? "top-three" : ""}`}>
                          {idx + 1}
                        </span>
                        <div className="popular-text-info">
                          <div className="popular-item-title">{novel.title}</div>
                          <div className="popular-item-views">{formattedViews} ยอดอ่าน</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. กล่องหมวดหมู่ */}
            <div className="sidebar-box">
              <h3 className="sidebar-box-title">🗂️ หมวดหมู่</h3>
              <div className="sidebar-tags-grid">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`sidebar-tag-btn ${isActive ? "active" : ""}`}
                      onClick={() => handleCategoryToggle(cat.name)}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;