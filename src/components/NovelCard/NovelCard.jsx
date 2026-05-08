// src/components/NovelCard/NovelCard.jsx
import React, { useState } from "react";
import "./NovelCard.css";

/**
 * NovelCard — การ์ดนิยายแสดงในหน้าหลัก (grid layout)
 */
const NovelCard = ({ novel, onClick }) => {
  const [liked, setLiked] = useState(novel.isLiked);
  const fmt = (v) => v >= 1000 ? `${(v/1000).toFixed(1)} K` : v;

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(!liked);
    // TODO: call API POST /api/novels/:id/like
  };

  return (
    <article className="novel-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()} aria-label={`อ่านนิยาย ${novel.title}`}>

      {/* Cover */}
      <div className="novel-card__cover" style={{ background: novel.coverBg || "var(--pink-50)" }}>
        {novel.coverImage
          ? <img src={novel.coverImage} alt={novel.title} className="novel-card__cover-img"/>
          : <span className="novel-card__cover-emoji">{novel.coverEmoji}</span>}
      </div>

      {/* Body */}
      <div className="novel-card__body">
        <h3 className="novel-card__title">{novel.title}</h3>
        <p className="novel-card__synopsis">{novel.synopsis}</p>

        {/* Footer: author + likes */}
        <div className="novel-card__footer">
          <div className="novel-card__author">
            <span className="novel-card__author-avatar">{novel.author.avatarEmoji}</span>
            <span className="novel-card__author-name">โดย {novel.author.displayName}</span>
          </div>
          <button
            className={`novel-card__like-btn ${liked ? "novel-card__like-btn--on" : ""}`}
            onClick={handleLike}
            aria-label={liked ? "ยกเลิกถูกใจ" : "กดถูกใจ"}
            aria-pressed={liked}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 12S2 8.5 2 5.5A2.5 2.5 0 017 4a2.5 2.5 0 015 1.5C12 8.5 7 12 7 12z"
                stroke="currentColor" strokeWidth="1.5" fill={liked ? "currentColor" : "none"}/>
            </svg>
            <span>{fmt(novel.stats.views)}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export default NovelCard;