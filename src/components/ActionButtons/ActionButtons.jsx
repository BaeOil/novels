// src/components/ActionButtons/ActionButtons.jsx
import React, { useState } from "react";
import "./ActionButtons.css";

/**
 * ActionButtons — ปุ่มหลัก 3 ปุ่ม: อ่านเลย, เพิ่มเข้าชั้นหนังสือ, ถูกใจ
 * @param {boolean} isBookmarked - สถานะชั้นหนังสือ
 * @param {boolean} isLiked - สถานะถูกใจ
 * @param {function} onRead - callback เมื่อกดอ่านเลย
 * @param {function} onBookmark - callback เมื่อกดชั้นหนังสือ
 * @param {function} onLike - callback เมื่อกดถูกใจ
 */
const ActionButtons = ({
  isBookmarked = false,
  isLiked = false,
  onRead,
  onBookmark,
  onLike,
}) => {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [liked, setLiked] = useState(isLiked);

  const handleBookmark = () => {
    setBookmarked((prev) => !prev);
    onBookmark?.(!bookmarked);
  };

  const handleLike = () => {
    setLiked((prev) => !prev);
    onLike?.(!liked);
  };

  return (
    <div className="action-buttons" role="group" aria-label="การกระทำสำหรับนิยาย">
      {/* Primary: Read */}
      <button
        className="action-buttons__read"
        onClick={onRead}
        aria-label="อ่านเลย"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M4 2.5L11.5 7L4 11.5V2.5Z" fill="white" />
        </svg>
        อ่านเลย
      </button>

      {/* Secondary: Bookmark */}
      <button
        className={`action-buttons__bookmark ${bookmarked ? "action-buttons__bookmark--active" : ""}`}
        onClick={handleBookmark}
        aria-label={bookmarked ? "ลบออกจากชั้นหนังสือ" : "เพิ่มเข้าชั้นหนังสือ"}
        aria-pressed={bookmarked}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 2h8a1 1 0 011 1v9l-4-2-4 2V3a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill={bookmarked ? "currentColor" : "none"}
          />
        </svg>
        เพิ่มเข้าชั้นหนังสือ
      </button>

      {/* Secondary: Like */}
      <button
        className={`action-buttons__like ${liked ? "action-buttons__like--active" : ""}`}
        onClick={handleLike}
        aria-label={liked ? "ยกเลิกถูกใจ" : "กดถูกใจ"}
        aria-pressed={liked}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 12S2 8.5 2 5.5A2.5 2.5 0 017 4a2.5 2.5 0 015 1.5C12 8.5 7 12 7 12z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill={liked ? "currentColor" : "none"}
          />
        </svg>
        ถูกใจ
      </button>
    </div>
  );
};

export default ActionButtons;
