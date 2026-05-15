// src/pages/Writer/Dashboard/WriterDashboardPage.jsx
//
// ══════════════════════════════════════════════════════════════
//  หน้า Dashboard ฝั่งนักเขียน
//  แสดง: สถิติรวม + รายการนิยายของนักเขียน
//
//  TODO: GET /api/v1/writer/dashboard  → stats
//        GET /api/v1/writer/novels     → novels list
// ══════════════════════════════════════════════════════════════

import React, { useState } from "react";
import "./WriterDashboardPage.css";
import {
  mockDashboardStats,
  mockWriterNovels,
} from "../../../data/mockWriterData";

// ── format ตัวเลขใหญ่ ──
const fmt = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);

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
    icon: "🔖",
    colorClass: "scard--green",
  },
];

const WriterDashboardPage = ({ onNavigate, onSelectNovel }) => {
  const stats  = mockDashboardStats;
  const novels = mockWriterNovels;

  const handleEdit = (novelId) => {
    onSelectNovel?.(novelId);
    onNavigate("chapters", novelId);
  };

  const handleTree = (novelId) => {
    onSelectNovel?.(novelId);
    onNavigate("story-tree", novelId);
  };

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
        {novels.map((novel) => (
          <NovelCard
            key={novel.id}
            novel={novel}
            onEdit={() => handleEdit(novel.id)}
            onTree={() => handleTree(novel.id)}
          />
        ))}

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
const NovelCard = ({ novel, onEdit, onTree }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <article className="nvc">
      {/* Cover */}
      <div className="nvc__cover" style={{ background: novel.coverBg }}>
        <span className="nvc__cover-emoji">{novel.coverEmoji}</span>
        {/* Status badge */}
        <span className={`nvc__status ${novel.status === "published" ? "nvc__status--pub" : "nvc__status--draft"}`}>
          {novel.status === "published" ? "● เผยแพร่" : "● ฉบับร่าง"}
        </span>
      </div>

      {/* Body */}
      <div className="nvc__body">
        <h3 className="nvc__title">{novel.title}</h3>
        <p className="nvc__date">อัปเดต {novel.updatedAt} · {novel.sceneCount} ฉาก</p>

        {/* Stats row */}
        <div className="nvc__stats">
          <span>👁 {fmt(novel.stats.views)}</span>
          <span>💜 {fmt(novel.stats.likes)}</span>
          <span>🔖 {novel.stats.bookmarks}</span>
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
          <p className="nvc__confirm-text">ลบ "{novel.title}"?</p>
          <div className="nvc__confirm-btns">
            <button className="nvc__confirm-yes"
              onClick={() => { setShowConfirm(false); /* TODO: DELETE API */ }}>
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