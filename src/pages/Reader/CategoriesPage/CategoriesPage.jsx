import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NovelCard from "../../../components/NovelCard/NovelCard";
import CategoryCard from "../../../components/CategoryCard/CategoryCard";
import "./CategoriesPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const categoryPalettes = [
  { name: "แฟนตาซี", icon: "🪄", background: "linear-gradient(135deg,#ffe4f0,#ffd6eb)" },
  { name: "โรแมนซ์", icon: "💘", background: "linear-gradient(135deg,#fed7e2,#fbcfe8)" },
  { name: "แอคชัน", icon: "⚔️", background: "linear-gradient(135deg,#fdf2f8,#fce7f3)" },
  { name: "สยองขวัญ", icon: "👻", background: "linear-gradient(135deg,#f8fafc,#f5f3ff)" },
  { name: "ลึกลับ", icon: "🕵️", background: "linear-gradient(135deg,#fdf2f8,#fce7f3)" },
  { name: "ชีวิตประจำวัน", icon: "☕", background: "linear-gradient(135deg,#fff1f2,#ffe4e6)" },
];

const normalizeCategoryName = (category) => {
  if (!category) return "";
  if (typeof category === "string") return category.trim();
  if (typeof category === "number") return String(category);
  return String(category.name || category.Title || category.title || category.label || category.name_th || "").trim();
};

const normalizeNovel = (data) => {
  const rawCategories = data.categories ?? data.Categories ?? data.category_ids ?? data.CategoryIDs ?? [];
  const categories = Array.isArray(rawCategories)
    ? rawCategories
        .map(normalizeCategoryName)
        .filter(Boolean)
    : [];

  const authorName = data.author_name || data.pen_name || data.author?.name || data.author?.displayName || "ไม่ทราบผู้แต่ง";
  const authorAvatar = data.author_avatar || data.author?.avatar || data.author?.avatarUrl || "";

  return {
    id: data.id || data.novel_id || data._id,
    title: data.title || data.name || "ไม่มีชื่อเรื่อง",
    status: String(data.status || data.Status || "").trim() || "draft",
    categories,
    coverImage: data.cover_image || data.coverImage || null,
    coverEmoji: !data.cover_image && !data.coverImage ? "📘" : "",
    synopsis: data.captions || data.introduction || data.description || data.synopsis || "ไม่มีคำโปรย",
    author: {
      displayName: authorName,
      avatarEmoji: data.author?.avatarEmoji || "✍️",
      avatarUrl: authorAvatar,
    },
    stats: {
      views: data.views || data.view_count || 0,
      paths: data.paths || data.paths_count || 0,
      endings: data.endings || data.endings_count || 0,
    },
    isLiked: data.is_liked || data.isLiked || false,
    isBookmarked: data.is_bookmarked || data.isBookmarked || false,
  };
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [novels, setNovels] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catRes, novelRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/categories`),
          axios.get(`${API_BASE_URL}/novels`),
        ]);
        if (!active) return;

        const catData = catRes.data?.data || catRes.data || [];
        const novelData = novelRes.data?.data || novelRes.data?.novels || novelRes.data || [];
        
        const normalizedNovels = Array.isArray(novelData) ? novelData.map(normalizeNovel) : [];
        const counts = {};
        normalizedNovels.forEach((n) => {
          n.categories.forEach((name) => {
            counts[name] = (counts[name] || 0) + 1;
          });
        });

        setNovels(normalizedNovels);

        const categoriesFromDb = Array.isArray(catData)
          ? catData.map((category) => ({
              id: category.category_id || category.id,
              name: category.name || category.title || category.label || "",
            }))
          : [];

        const merged = categoriesFromDb.map((dbCategory) => ({
          id: dbCategory.id,
          name: dbCategory.name,
          icon: categoryPalettes.find((p) => p.name === dbCategory.name)?.icon || "📚",
          background: categoryPalettes.find((p) => p.name === dbCategory.name)?.background || "linear-gradient(135deg, #fff1f2, #ffe4e6)",
          count: counts[dbCategory.name] || 0,
        }));
        setCategories(merged);
      } catch (err) {
        console.error(err);
        if (active) setError("ไม่สามารถดึงข้อมูลได้ในขณะนี้");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const filteredNovels = useMemo(() => {
    if (!activeCategory) return novels;
    return novels.filter((n) => {
      const cList = n.categories || n.Categories || n.category_ids || [];
      return cList.some((c) => (typeof c === "string" ? c : c.name || c.title) === activeCategory);
    });
  }, [activeCategory, novels]);

  return (
    <div className="categories-page">
      <section className="categories-page__hero">
        <div className="categories-page__hero-copy">
          <span className="categories-page__eyebrow">✨ สำรวจหมวดหมู่ที่คุณสนใจ</span>
          <h1 className="categories-page__title">หมวดหมู่นิยายทั้งหมด</h1>
        </div>
      </section>

      <section className="categories-page__content">
        <div className="categories-page__grid">
          {loading ? (
            <div className="categories-page__loading">กำลังโหลดข้อมูลหมวดหมู่...</div>
          ) : error ? (
            <div className="categories-page__error">{error}</div>
          ) : (
            categories.map((category) => (
              <CategoryCard
                key={category.name}
                category={category}
                active={category.name === activeCategory}
                onClick={setActiveCategory}
              />
            ))
          )}
        </div>
      </section>

      <section className="categories-page__list">
        <div className="categories-page__list-header">
          <h2>{activeCategory ? `🔮 นิยายในหมวด "${activeCategory}"` : "📚 นิยายอัปเดตทั้งหมด"}</h2>
          {activeCategory && (
            <button className="categories-page__clear" onClick={() => setActiveCategory(null)}>
              แสดงทั้งหมด
            </button>
          )}
        </div>

        {!loading && filteredNovels.length === 0 ? (
          <div className="categories-page__empty">ยังไม่มีผลงานนิยายในหมวดหมู่นี้</div>
        ) : (
          <div className="categories-page__novels">
            {filteredNovels.map((novel) => (
              <NovelCard
                key={novel.id || novel.novel_id}
                novel={novel}
                onClick={() => navigate(`/novel/${novel.id || novel.novel_id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CategoriesPage;