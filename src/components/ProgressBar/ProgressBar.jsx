// src/components/ProgressBar/ProgressBar.jsx
import React from "react";
import "./ProgressBar.css";

/**
 * ProgressBar — แสดงความคืบหน้าการอ่าน
 * @param {number} percentage - เปอร์เซ็นต์ 0–100
 * @param {number} currentChapter - ตอนปัจจุบัน
 * @param {number} totalChapters - ตอนทั้งหมด
 * @param {number} discoveredChoices - จุดเลือกที่ค้นพบ
 * @param {number} totalChoices - จุดเลือกทั้งหมด
 * @param {function} onStoryMapClick - callback เมื่อกด Story Map
 */
const ProgressBar = ({
  percentage = 0,
  currentChapter = 1,
  totalChapters = 1,
  discoveredChoices = 0,
  totalChoices = 0,
  onStoryMapClick,
}) => {
  return (
    <div className="progress-bar-card" role="region" aria-label="ความคืบหน้าการอ่าน">
      <h3 className="progress-bar-card__title">ความคืบหน้าของคุณ</h3>
      <p className="progress-bar-card__desc">
        คุณอ่านถึงตอนที่ {currentChapter} · ค้นพบ {discoveredChoices} จาก {totalChoices} จุดเลือก
      </p>

      {/* Progress track */}
      <div className="progress-bar-card__track-row">
        <span className="progress-bar-card__chapter-label">
          ตอนที่ {currentChapter}/{totalChapters}
        </span>
        <span className="progress-bar-card__percent">{percentage}%</span>
      </div>
      <div
        className="progress-bar-card__track"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`อ่านแล้ว ${percentage}%`}
      >
        <div
          className="progress-bar-card__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Story Map button */}
      <div className="progress-bar-card__footer">
        <button
          className="progress-bar-card__map-btn"
          onClick={onStoryMapClick}
          aria-label="ดู Story Map"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="3" cy="7" r="1.8" fill="currentColor" opacity="0.7"/>
            <circle cx="11" cy="3" r="1.8" fill="currentColor" opacity="0.7"/>
            <circle cx="11" cy="11" r="1.8" fill="currentColor" opacity="0.7"/>
            <path d="M4.8 6.4L9.2 3.8M4.8 7.6L9.2 10.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Story Map
        </button>
      </div>
    </div>
  );
};

export default ProgressBar;
