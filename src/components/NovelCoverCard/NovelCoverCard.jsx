// src/components/NovelCoverCard/NovelCoverCard.jsx
import React from "react";
import "./NovelCoverCard.css";
import StatBadge from "../StatBadge/StatBadge";

/**
 * NovelCoverCard — แสดงภาพปกนิยายและสถิติ 4 ตัว
 * @param {object} novel - ข้อมูลนิยาย
 */
const NovelCoverCard = ({ novel }) => {
  const { title, coverImage, coverEmoji, stats } = novel;

  return (
    <div className="novel-cover-card">
      {/* Cover image */}
      <div className="novel-cover-card__cover" aria-label={`ภาพปก: ${title}`}>
        {coverImage ? (
          <img
            src={coverImage}
            alt={`ภาพปกนิยาย ${title}`}
            className="novel-cover-card__img"
          />
        ) : (
          /* Fallback when no image from DB yet */
          <div className="novel-cover-card__placeholder" aria-hidden="true">
            <span className="novel-cover-card__emoji">{coverEmoji}</span>
          </div>
        )}
      </div>

      {/* Stats grid 2x2 */}
      <div className="novel-cover-card__stats" role="list" aria-label="สถิตินิยาย">
        <div role="listitem">
          <StatBadge value={stats.views} label="ยอดอ่าน" />
        </div>
        <div role="listitem">
          <StatBadge value={stats.paths} label="เส้นทาง" />
        </div>
        <div role="listitem">
          <StatBadge value={stats.choicePoints} label="จุดเลือก" />
        </div>
        <div role="listitem">
          <StatBadge value={stats.endings} label="ตอนจบ" />
        </div>
      </div>
    </div>
  );
};

export default NovelCoverCard;
