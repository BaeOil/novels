// ══════════════════════════════════════════════════════════════
//  หน้า Dashboard ฝั่งนักเขียน — Redesign Layout ย้าย ตอน/ฉาก ขึ้นบนปก
//
//  Backend API connected (Updated to matching your Go Backend):
//    - GET    /api/me/novels            -> รายการนิยายทั้งหมดของผู้ใช้คนนี้ (Novels List)
//    - DELETE /api/v1/writer/novels/:id -> ลบนิยายเรื่องที่เลือก
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import "./WriterDashboardPage.css";
import { getNovelStatusInfo } from "../../../utils/novelStatus";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── format ตัวเลขใหญ่ ──
const fmt = (n) => {
  if (!n || isNaN(n)) return "0";
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
};

// ── Stat cards definition ──
const STAT_CARDS = [
  {
    key: "totalNovels",
    label: "นิยายทั้งหมด",
    icon: "📖",
    colorClass: "scard--pink",
  },
  {
    key: "totalLikes",
    label: "จำนวนการกดถูกใจ",
    icon: "💜",
    colorClass: "scard--purple",
  },
  {
    key: "totalViews",
    label: "ยอดเข้าชมทั้งหมด",
    icon: "👁",
    colorClass: "scard--blue",
  },
  {
    key: "totalBookmarks",
    label: "จำนวนเพิ่มเข้าชั้น",
    icon: "📓",
    colorClass: "scard--green",
  },
];

const WriterDashboardPage = ({ onNavigate, onSelectNovel }) => {
  const [stats, setStats] = useState({
    totalNovels: 0,
    totalLikes: 0,
    totalViews: 0,
    totalBookmarks: 0,
  });
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  // ── ฟังก์ชันดึงข้อมูลจากหลังบ้าน ──────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = buildAuthHeaders();
      if (!headers) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนดูแดชบอร์ดนักเขียน");
      }

      const response = await fetch(`${API_BASE_URL}/api/me/novels`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
        }
        throw new Error("ไม่สามารถดึงข้อมูลนิยายได้");
      }

      const result = await response.json();
      
      let fetchedNovels = result?.novels || result?.data?.novels || [];
      
      if (Array.isArray(fetchedNovels)) {
        fetchedNovels.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0);
          const dateB = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
      }

      let calculatedLikes = 0;
      let calculatedViews = 0;
      let calculatedBookmarks = 0;

      if (Array.isArray(fetchedNovels)) {
        fetchedNovels.forEach(novel => {
          calculatedViews += novel.total_views ?? novel.view_count ?? novel.stats?.views ?? novel.views ?? 0;
          calculatedLikes += novel.total_likes ?? novel.like_count ?? novel.stats?.likes ?? novel.likes ?? 0;
          calculatedBookmarks += novel.total_bookmarks ?? novel.bookmark_count ?? novel.bookshelf_count ?? novel.stats?.bookmarks ?? novel.bookmarks ?? 0;
        });
      }

      setStats({
        totalNovels: fetchedNovels.length,
        totalLikes: calculatedLikes,
        totalViews: calculatedViews,
        totalBookmarks: calculatedBookmarks,
      });
      
      setNovels(Array.isArray(fetchedNovels) ? fetchedNovels : []);
    } catch (err) {
      console.error("Fetch dashboard error:", err);
      setError(err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับระบบหลังบ้านได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeleteNovel = async (novelId) => {
    try {
      const headers = buildAuthHeaders();
      if (!headers) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนลบนิยาย");
      }

      const response = await fetch(`${API_BASE_URL}/novels/${novelId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errResult = await response.json().catch(() => null);
        throw new Error(errResult?.error || "Failed to delete novel");
      }

      fetchDashboardData();
    } catch (err) {
      console.error("Delete novel error:", err);
      alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบนิยาย");
    }
  };

  const handleEdit = (novelId) => {
    onSelectNovel?.(novelId);
    onNavigate("chapters", { novelId });
  };

  const handleTree = (novelId) => {
    onSelectNovel?.(novelId);
    onNavigate("story-tree", { novelId });
  };

  if (loading) {
    return (
      <div className="wdb" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--pink-500)", fontSize: "1.2rem" }}>กำลังดึงข้อมูลแดชบอร์ดนักเขียน...</p>
      </div>
    );
  }

  return (
    <div className="wdb">
      <div className="wdb__header">
        <div>
          <h1 className="wdb__title">Dashboard</h1>
          <p className="wdb__sub">ภาพรวมผลงานของคุณทั้งหมด</p>
        </div>
        <button
          className="wdb__create-btn"
          onClick={() => onNavigate("create-novel")}
          aria-label="สร้างนิยายเรื่องใหม่"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          สร้างนิยายใหม่
        </button>
      </div>

      {error && (
        <div className="wdb__error-banner" style={{ background: "#FEE2E2", color: "#DC2626", padding: "12px", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div className="wdb__stats">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`scard ${card.colorClass}`}>
            <span className="scard__icon">{card.icon}</span>
            <div className="scard__val">{fmt(stats[card.key])}</div>
            <div className="scard__label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="wdb__novels-header">
        <div>
          <h2 className="wdb__novels-title">นิยายของฉัน</h2>
          <p className="wdb__novels-count">{novels.length} เรื่องทั้งหมด (เรียงตามอัปเดตล่าสุด)</p>
        </div>
      </div>

      <div className="wdb__grid">
        {novels.map((novel) => {
          const id = novel.id || novel.novel_id;
          return (
            <NovelCard
              key={id}
              novel={novel}
              onEdit={() => handleEdit(id)}
              onTree={() => handleTree(id)}
              onDelete={() => handleDeleteNovel(id)}
            />
          );
        })}

        <button
          className="wdb__empty-card"
          onClick={() => onNavigate("create-novel")}
          aria-label="สร้างนิยายใหม่"
        >
          <span className="wdb__empty-icon">✦</span>
          <span className="wdb__empty-label">สร้างนิยายใหม่</span>
          <span className="wdb__empty-sub">เริ่มเรื่องราวใหม่ของคุณ</span>
        </button>
      </div>
    </div>
  );
};

const NovelCard = ({ novel, onEdit, onTree, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const title = novel.title || "";
  const coverImage = novel.cover_image || novel.coverImage;
  
  const statusInfo = getNovelStatusInfo(novel);
  const statusVariant = statusInfo.isCompleted ? "completed" : statusInfo.isPublished ? "published" : "draft";
  const status = statusVariant;
  
  const categoryList = novel.categories || novel.Categories || [];
  const parsedCategories = Array.isArray(categoryList)
    ? categoryList.map(c => c.name || c.Name).filter(Boolean)
    : [];

  const maxDisplay = 2;
  const visibleCategories = parsedCategories.slice(0, maxDisplay);
  const remainingCount = parsedCategories.length - maxDisplay;

  const sceneCount = novel.total_scenes ?? novel.scene_count ?? novel.sceneCount ?? 0;
  const chapterCount = novel.total_chapters ?? novel.chapter_count ?? novel.chapterCount ?? 0;
  
  const views = novel.total_views ?? novel.view_count ?? novel.stats?.views ?? novel.views ?? 0;
  const likes = novel.total_likes ?? novel.like_count ?? novel.stats?.likes ?? novel.likes ?? 0;
  const bookmarks = novel.total_bookmarks ?? novel.bookmark_count ?? novel.stats?.bookmarks ?? novel.bookmarks ?? 0;

  let updatedAtText = "ไม่มีการอัปเดต";
  const rawDate = novel.updated_at || novel.updatedAt || novel.created_at || novel.createdAt;
  if (rawDate) {
    try {
      const normalizedRawDate = String(rawDate).replace(" ", "T");
      const dateObj = new Date(normalizedRawDate);
      if (!Number.isNaN(dateObj.getTime())) {
        updatedAtText = dateObj.toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        });
      } else {
        updatedAtText = String(rawDate).split("T")[0];
      }
    } catch (e) {
      updatedAtText = String(rawDate).split("T")[0];
    }
  }

  return (
    <article className="nvc">
      {/* ── Cover Zone ── */}
      <div className="nvc__cover">
        {coverImage ? (
          <img 
            src={coverImage.replace("http://minio:9000", "http://localhost:9000")} 
            alt={`ปกนิยายเรื่อง ${title}`}
            className="nvc__cover-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) parent.innerHTML = '<div style="font-size:32px">📖</div>';
            }}
          />
        ) : (
          <div className="nvc__cover-emoji">📖</div>
        )}
        
        {/* ป้ายสถานะสีทึบชัดเจน อยู่มุมซ้าย */}
        <span className={`nvc__status ${status === "published" ? "nvc__status--pub" : status === "completed" ? "nvc__status--completed" : "nvc__status--draft"}`}>
          {statusInfo.mode === "completed-published" ? "จบแล้ว + เผยแพร่" : statusInfo.mode === "completed-draft" ? "จบแล้ว + ฉบับร่าง" : status === "published" ? "เผยแพร่" : "ฉบับร่าง"}
        </span>

        {/* ปุ่มลบกากบาทมุมขวา */}
        <button className="nvc__cover-del" onClick={() => setShowConfirm(true)} title="ลบนิยาย">
          ✕
        </button>

        {/* 🎯 แถบตอน/ฉาก ฝังล่างสุด พร้อม Gradient พื้นหลังดำเงา ทำให้อ่านง่ายชัวร์ */}
        <div className="nvc__overlay-info">
          <span>📄 {chapterCount} ตอน</span>
          <span>🎬 {sceneCount} ฉาก</span>
        </div>
      </div>

      {/* ── Body Zone ── */}
      <div className="nvc__body">
        <h3 className="nvc__title" title={title}>{title}</h3>
        
        <p className="nvc__date">อัปเดต {updatedAtText}</p>
        
        <div className="nvc__categories-row">
          {visibleCategories.length > 0 ? (
            visibleCategories.map((catName, idx) => (
              <span key={idx} className="nvc__tag">#{catName}</span>
            ))
          ) : (
            <span style={{ fontSize: "10px", color: "#9ca3af", fontStyle: "italic" }}>#ไม่มีหมวดหมู่</span>
          )}

          {remainingCount > 0 && (
            <span className="nvc__tag-more">+{remainingCount}</span>
          )}
        </div>

        <div className="nvc__stats">
          <span>👁 {fmt(views)}</span>
          <span>💜 {fmt(likes)}</span>
          <span>🔖 {fmt(bookmarks)}</span>
        </div>

        <div className="nvc__actions">
          <button className="nvc__btn nvc__btn--edit" onClick={onEdit}>✏️ แก้ไข</button>
          <button className="nvc__btn nvc__btn--tree" onClick={onTree}>🌳 Tree</button>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {showConfirm && (
        <div className="nvc__confirm">
          <p className="nvc__confirm-text">ต้องการลบนิยายเรื่องนี้?</p>
          <div className="nvc__confirm-btns">
            <button className="nvc__confirm-yes" onClick={() => { setShowConfirm(false); onDelete(); }}>ยืนยัน</button>
            <button className="nvc__confirm-no" onClick={() => setShowConfirm(false)}>ยกเลิก</button>
          </div>
        </div>
      )}
    </article>
  );
};

export default WriterDashboardPage;
