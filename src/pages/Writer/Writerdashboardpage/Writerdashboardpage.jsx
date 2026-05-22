// ══════════════════════════════════════════════════════════════
//  หน้า Dashboard ฝั่งนักเขียน — ดึงสถิติรวม + รายการนิยายจริงจากหลังบ้าน
//
//  Backend API connected (Updated to matching your Go Backend):
//    - GET    /api/me/novels             -> รายการนิยายทั้งหมดของผู้ใช้คนนี้ (Novels List)
//    - DELETE /api/v1/writer/novels/:id -> ลบนิยายเรื่องที่เลือก (คงไว้ตามเดิมเพื่อใช้ในอนาคต)
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import "./WriterDashboardPage.css";

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
      
      // ดึงอาร์เรย์ของนิยายออกมาจากโครงสร้าง Map {"author_id": X, "novels": [...]} ที่ Go ส่งมา
      // และดักตรวจสอบกรณีก่อนหน้าถ้าข้อมูลหลังบ้านเป็น empty array
      const fetchedNovels = result?.novels || result?.data?.novels || [];
      
      // คำนวณสถิติรวม (สแตท) จากอาร์เรย์นิยายที่ดึงมาได้โดยตรง (ไม่ต้องพึ่ง API สถิติแยก)
      let calculatedLikes = 0;
      let calculatedViews = 0;
      let calculatedBookmarks = 0;

      if (Array.isArray(fetchedNovels)) {
        fetchedNovels.forEach(novel => {
          calculatedViews += novel.stats?.views ?? novel.views ?? 0;
          calculatedLikes += novel.stats?.likes ?? novel.likes ?? 0;
          calculatedBookmarks += novel.stats?.bookmarks ?? novel.bookmarks ?? 0;
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

  // ── ฟังก์ชันลบนิยาย ─────────────────────────────────────────
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
      {/* ── Page header ── */}
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

      {/* ── Stat cards 4 ใบ ── */}
      <div className="wdb__stats">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`scard ${card.colorClass}`}>
            <span className="scard__icon">{card.icon}</span>
            <div className="scard__val">{fmt(stats[card.key])}</div>
            <div className="scard__label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Novel list header ── */}
      <div className="wdb__novels-header">
        <div>
          <h2 className="wdb__novels-title">นิยายของฉัน</h2>
          <p className="wdb__novels-count">{novels.length} เรื่องทั้งหมด</p>
        </div>
      </div>

      {/* ── Novel cards grid ── */}
      <div className="wdb__grid">
        {novels.map((novel) => {
          // รองรับ fallback id ทั้ง id และ novel_id จากฝั่งฐานข้อมูล
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

        {/* Empty state card — ชวนสร้างเรื่องใหม่ */}
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

// ── Sub-component: Novel card ────────────────────────────────
const NovelCard = ({ novel, onEdit, onTree, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const title = novel.title || "";
  const coverImage = novel.cover_image || novel.coverImage;
  const status = novel.status || "draft";
  const sceneCount = novel.scene_count ?? novel.sceneCount ?? 0;
  
  const views = novel.stats?.views ?? novel.views ?? 0;
  const likes = novel.stats?.likes ?? novel.likes ?? 0;
  const bookmarks = novel.stats?.bookmarks ?? novel.bookmarks ?? 0;

  let updatedAtText = "ไม่มีการอัปเดต";
  const rawDate = novel.updated_at || novel.updatedAt;
  if (rawDate) {
    try {
      const dateObj = new Date(rawDate);
      updatedAtText = dateObj.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      });
    } catch (e) {
      updatedAtText = String(rawDate).split("T")[0];
    }
  }

  return (
    <article className="nvc">
      {/* Cover */}
      <div className="nvc__cover" style={{ background: !coverImage ? "#f3f4f6" : undefined }}>
        {coverImage ? (
          <img 
            src={coverImage.replace("http://minio:9000", "http://localhost:9000")} 
            alt={`ปกนิยายเรื่อง ${title}`}
            className="nvc__cover-img"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) parent.style.background = "#e5e7eb";
            }}
          />
        ) : (
          <span className="nvc__cover-emoji">📖</span>
        )}
        <span className={`nvc__status ${status === "published" ? "nvc__status--pub" : "nvc__status--draft"}`}>
          {status === "published" ? "● เผยแพร่" : "● ฉบับร่าง"}
        </span>
      </div>

      {/* Body */}
      <div className="nvc__body">
        <h3 className="nvc__title">{title}</h3>
        <p className="nvc__date">อัปเดต {updatedAtText} · {sceneCount} ฉาก</p>

        {/* Stats row */}
        <div className="nvc__stats">
          <span>👁 {fmt(views)}</span>
          <span>💜 {fmt(likes)}</span>
          <span>🔖 {bookmarks}</span>
        </div>

        {/* Action buttons */}
        <div className="nvc__actions">
          <button className="nvc__btn nvc__btn--edit" onClick={onEdit}>
            ✏️ แก้ไข
          </button>
          <button className="nvc__btn nvc__btn--tree" onClick={onTree}>
            🌳 Tree
          </button>
          <button
            className="nvc__btn nvc__btn--del"
            onClick={() => setShowConfirm(true)}
            aria-label="ลบนิยาย"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {showConfirm && (
        <div className="nvc__confirm">
          <p className="nvc__confirm-text">ลบ "{title}"?</p>
          <div className="nvc__confirm-btns">
            <button 
              className="nvc__confirm-yes"
              onClick={() => { 
                setShowConfirm(false); 
                onDelete();
              }}
            >
              ยืนยัน
            </button>
            <button className="nvc__confirm-no" onClick={() => setShowConfirm(false)}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default WriterDashboardPage;
