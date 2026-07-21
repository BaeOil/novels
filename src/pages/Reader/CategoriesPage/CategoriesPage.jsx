import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NovelCard from "../../../components/NovelCard/NovelCard";
import CategoryCard from "../../../components/CategoryCard/CategoryCard";
import { getNovelStatusInfo } from "../../../utils/novelStatus";
import "./CategoriesPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// เปลี่ยนดีไซน์ให้ดูคลีน สบายตา และไม่มีอิโมจิ
const categoryPalettes = [
  { name: "แฟนตาซี",        bg: "#FDF2F8" }, 
  { name: "โรแมนซ์",         bg: "#FFF1F2" }, 
  { name: "แอคชัน",          bg: "#F0FDF4" }, 
  { name: "สยองขวัญ",        bg: "#F3F4F6" }, 
  { name: "ลึกลับ",           bg: "#F5F3FF" }, 
  { name: "ชีวิตประจำวัน",   bg: "#FFFBEB" }, 
  { name: "ดราม่า",           bg: "#FEF2F2" }, 
  { name: "Sci-Fi",           bg: "#F0F9FF" }, 
];

const normalizeCategoryName = (c) => {
  if (!c) return "";
  if (typeof c === "string") return c.trim();
  return String(c.name || c.Title || c.title || c.label || "").trim();
};

const normalizeNovel = (data) => {
  const rawCats = data.categories ?? data.Categories ?? data.category_ids ?? data.CategoryIDs ?? [];
  const statusInfo = getNovelStatusInfo(data);
  
  const isActuallyPublished = data.status?.toLowerCase() === "published" || 
                              data.is_published === true || 
                              statusInfo.isPublished || 
                              statusInfo.mode === "published";

  // 🎯 ดึงชื่อหมวดหมู่มาทำความสะอาด
  const cleanCategories = Array.isArray(rawCats) 
    ? rawCats.map(normalizeCategoryName).filter(Boolean) 
    : [];
    
  // 🎯 ใช้ Set ในการตัดหมวดหมู่ที่เบิ้ลซ้ำกันในเรื่องเดียวกันทิ้ง (เช่น ["แฟนตาซี", "แฟนตาซี"] จะเหลือแค่ 1)
  const uniqueCategories = [...new Set(cleanCategories)];

  return {
    id: data.id || data.novel_id,
    title: data.title || "ไม่มีชื่อเรื่อง",
    categories: uniqueCategories, // ส่งตัวที่ตัดตัวซ้ำออกแล้วไปใช้งาน
    coverImage: data.cover_image || data.coverImage || null,
    coverEmoji: !data.cover_image && !data.coverImage ? "📘" : "",
    synopsis: data.captions || data.introduction || data.description || "",
    author: {
      displayName: data.author_name || data.pen_name || "ไม่ทราบผู้แต่ง",
      avatarEmoji: "✍️",
    },
    stats: {
      views:   data.views || data.view_count || 0,
      likes:   data.like_count || 0,
      endings: data.endings || data.endings_count || 0,
    },
    isLiked:      data.is_liked || false,
    isBookmarked: data.is_bookmarked || false,
    isPublished:  isActuallyPublished,
  };
};
// ─── Skeleton components ────────────────────────────────────────────────────
const CategorySkeleton = () => (
  <div className="cat-page__category-skeleton">
    <div className="cat-page__sk cat-page__sk--icon" />
    <div className="cat-page__sk cat-page__sk--title" />
    <div className="cat-page__sk cat-page__sk--count" />
  </div>
);

const NovelSkeleton = () => (
  <div className="cat-page__novel-skeleton">
    <div className="cat-page__sk cat-page__sk--cover" />
    <div style={{ padding: "10px" }}>
      <div className="cat-page__sk cat-page__sk--line cat-page__sk--med" />
      <div className="cat-page__sk cat-page__sk--line cat-page__sk--short" />
    </div>
  </div>
);

// ─── Main ───────────────────────────────────────────────────────────────────
const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [novels, setNovels]         = useState([]);
  const [activeCategory, setActive] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    let active = true;
    try {
      const [catRes, novelRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/categories`),
        axios.get(`${API_BASE_URL}/novels`),
      ]);
      if (!active) return;

      const catData   = catRes.data?.data || catRes.data || [];
      const novelData = novelRes.data?.data?.novels
                     || novelRes.data?.novels
                     || novelRes.data?.data
                     || novelRes.data
                     || [];

      // 1. แปลงข้อมูลและคัดกรองเฉพาะตัวที่เผยแพร่ (Published) ให้จบในขั้นตอนนี้
      const allNovels = Array.isArray(novelData) ? novelData.map(normalizeNovel) : [];
      const publishedNovels = allNovels.filter(n => n.isPublished);

      // 2. จัดการข้อมูลรายชื่อหมวดหมู่หลัก พร้อม Trim ช่องว่างทิ้ง
      const dbCats = Array.isArray(catData)
        ? catData.map(c => ({ id: c.category_id || c.id, name: String(c.name || c.title || "").trim() }))
        : [];

      // 3. 🎯 นับจำนวนเรื่องโดยดึงจากวัตถุดิบชุดเดียวกัน (publishedNovels)
      const counts = {};
      publishedNovels.forEach(novel => {
        // ทำความสะอาดชื่อหมวดหมู่ที่ติดอยู่กับตัวนิยายด้วย เผื่อมีช่องว่างหลุดมา
        novel.categories = novel.categories.map(c => String(c).trim());
        
        // วนลูปนับจำนวน
        novel.categories.forEach(name => {
          counts[name] = (counts[name] || 0) + 1;
        });
      });

      // 4. ประกอบร่างข้อมูลหมวดหมู่เพื่อไปแสดงบนการ์ดด้านบน
      const merged = dbCats.map(dbCat => ({
        id:         dbCat.id,
        name:       dbCat.name,
        // ตัวเลขจะดึงจาก counts ตัวเดียวกับที่แปลงเป็นนิยายข้างล่างแล้ว เป๊ะแน่นอน 100%
        count:      counts[dbCat.name] || 0, 
      }));

      setNovels(publishedNovels); // ตัวแปรนี้จะนำไปแสดงในรายการด้านล่าง
      setCategories(merged);      // ตัวแปรนี้จะนำไปแสดงบนการ์ดด้านบน
    } catch (err) {
      console.error(err);
      if (active) setError("ไม่สามารถดึงข้อมูลได้ในขณะนี้");
    } finally {
      if (active) setLoading(false);
    }
    return () => { active = false; };
  };
  useEffect(() => { loadData(); }, []);

  // กรองนิยายตาม category ที่เลือก
  const filtered = useMemo(() => {
    if (!activeCategory) return novels;
    return novels.filter(n => n.categories.includes(activeCategory));
  }, [activeCategory, novels]);

  const handleCategoryClick = (name) => {
    setActive(prev => prev === name ? null : name); // toggle
  };

  return (
    <div className="cat-page">

      {/* ── Hero ── */}
      <section className="cat-page__hero">
        <div className="cat-page__hero-inner">
          <span className="cat-page__eyebrow">✨ สำรวจนิยายตามหมวดหมู่</span>
          <h1 className="cat-page__title">หมวดหมู่นิยาย</h1>
          <p className="cat-page__subtitle">
            เลือกหมวดที่ชื่นชอบ แล้วค้นพบนิยายทางเลือกที่รอให้คุณอ่าน
          </p>
          {/* summary chips */}
          {!loading && !error && (
            <div className="cat-page__hero-summary">
              <span className="cat-page__summary-chip">📚 {novels.length} นิยาย</span>
              <span className="cat-page__summary-chip">🗂️ {categories.length} หมวดหมู่</span>
            </div>
          )}
        </div>
      </section>

      <div className="cat-page__body">

        {/* ── Category grid ── */}
        <section className="cat-page__section">
          <div className="cat-page__category-grid">
            {loading
              ? Array.from({length:6}).map((_,i) => <CategorySkeleton key={i}/>)
              : error
                ? (
                  <div className="cat-page__error-box">
                    <div style={{fontSize:40,marginBottom:10}}>😵</div>
                    <p style={{fontWeight:700,color:"#EF4444",margin:"0 0 8px"}}>{error}</p>
                    <button className="cat-page__retry-btn" onClick={loadData}>ลองใหม่</button>
                  </div>
                )
                : categories.length === 0
                  ? <p className="cat-page__no-cat">ยังไม่มีหมวดหมู่ในระบบ</p>
                 : categories.map(cat => (
                    <div
                      key={cat.id}
                      className={`cat-page__minimal-card ${cat.name === activeCategory ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(cat.name)}
                    >
                      <span className="cat-page__minimal-name">{cat.name}</span>
                      <span className="cat-page__minimal-count">{cat.count} เรื่อง</span>
                    </div>
                  ))
            }
          </div>
        </section>

        {/* ── Novel list ── */}
        <section className="cat-page__section">
          {/* list header */}
          <div className="cat-page__list-header">
            <h2 className="cat-page__list-title">
              {activeCategory
                ? `🔮 นิยายหมวด "${activeCategory}"`
                : "📚 นิยายทั้งหมด"}
              {!loading && (
                <span className="cat-page__list-count">{filtered.length} เรื่อง</span>
              )}
            </h2>
            {activeCategory && (
              <button className="cat-page__clear-btn" onClick={() => setActive(null)}>
                ✕ ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* skeletons */}
          {loading && (
            <div className="cat-page__novel-grid">
              {Array.from({length:8}).map((_,i) => <NovelSkeleton key={i}/>)}
            </div>
          )}

          {/* empty */}
          {!loading && filtered.length === 0 && (
            <div className="cat-page__empty">
              <div className="cat-page__empty-icon">🔍</div>
              <p className="cat-page__empty-title">
                {activeCategory
                  ? `ยังไม่มีนิยายในหมวด "${activeCategory}"`
                  : "ยังไม่มีนิยายในระบบ"}
              </p>
              <p className="cat-page__empty-sub">เป็นคนแรกที่สร้างนิยายในหมวดนี้ได้เลย</p>
              {activeCategory && (
                <button className="cat-page__clear-btn" style={{marginTop:14}} onClick={()=>setActive(null)}>
                  ดูนิยายทั้งหมด
                </button>
              )}
            </div>
          )}

          {/* grid */}
          {!loading && filtered.length > 0 && (
            <div className="cat-page__novel-grid">
              {filtered.map(n => (
                <NovelCard
                  key={n.id}
                  novel={n}
                  onClick={() => navigate(`/novel/${n.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CategoriesPage;