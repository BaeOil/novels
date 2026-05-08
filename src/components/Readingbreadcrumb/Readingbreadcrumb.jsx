// src/components/ReadingBreadcrumb/ReadingBreadcrumb.jsx
import React from "react";
import "./ReadingBreadcrumb.css";

/**
 * ReadingBreadcrumb — แถบ breadcrumb + Story Map button บนหน้าอ่านนิยาย
 */
const ReadingBreadcrumb = ({ novelTitle, chapterTitle, onBack, onStoryMap }) => (
  <div className="rbreadcrumb">
    <button className="rbreadcrumb__back" onClick={onBack} aria-label="กลับ">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      กลับ
    </button>
    <div className="rbreadcrumb__path" aria-label="เส้นทาง">
      <span className="rbreadcrumb__novel">{novelTitle}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span className="rbreadcrumb__chapter">{chapterTitle}</span>
    </div>
    <button className="rbreadcrumb__map" onClick={onStoryMap} aria-label="ดู Story Map">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="3" cy="7" r="1.8" fill="currentColor" opacity="0.7"/>
        <circle cx="11" cy="3" r="1.8" fill="currentColor" opacity="0.7"/>
        <circle cx="11" cy="11" r="1.8" fill="currentColor" opacity="0.7"/>
        <path d="M4.8 6.4L9.2 3.8M4.8 7.6L9.2 10.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      Story Map
    </button>
  </div>
);

export default ReadingBreadcrumb;