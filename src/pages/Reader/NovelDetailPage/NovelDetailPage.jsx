import React from "react";
import "./NovelDetailPage.css";

import NovelCoverCard from "../../../components/NovelCoverCard/NovelCoverCard";
import GenreTag from "../../../components/GenreTag/GenreTag";
import ActionButtons from "../../../components/ActionButtons/ActionButtons";
import ProgressBar from "../../../components/ProgressBar/ProgressBar";
import { mockNovel } from "../../../data/mockNovel";

const NovelDetailPage = () => {
  // Using mock data until DB is ready
  const novel = mockNovel;

  const handleRead = () => {
    // TODO: navigate to reading page
    alert(`เริ่มอ่าน "${novel.title}"`);
  };

  const handleBookmark = (isBookmarked) => {
    // TODO: call POST /api/novels/:id/bookmark
    console.log("bookmark:", isBookmarked);
  };

  const handleLike = (isLiked) => {
    // TODO: call POST /api/novels/:id/like
    console.log("like:", isLiked);
  };

  const handleStoryMap = () => {
    // TODO: navigate to story tree page
    alert("ดู Story Map");
  };

  return (
    <div className="novel-detail">
      <div className="novel-detail__container">
        {/* ── Back button ── */}
        <button
          className="novel-detail__back"
          onClick={() => window.history.back()}
          aria-label="กลับหน้าหลัก"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          กลับหน้าหลัก
        </button>

        {/* ── Main content ── */}
        <div className="novel-detail__main">
          {/* Left: cover + stats */}
          <aside className="novel-detail__aside" aria-label="ภาพปกและสถิติ">
            <NovelCoverCard novel={novel} />
          </aside>

          {/* Right: info */}
          <main className="novel-detail__info" aria-label="ข้อมูลนิยาย">
            {/* Genre tags */}
            <div className="novel-detail__tags" role="list" aria-label="หมวดหมู่">
              {novel.categories.map((cat) => (
                <div role="listitem" key={cat}>
                  <GenreTag label={cat} variant="primary" />
                </div>
              ))}
            </div>

            {/* Title */}
            <h1 className="novel-detail__title">{novel.title}</h1>

            {/* Author */}
            <div className="novel-detail__author" aria-label={`ผู้แต่ง: ${novel.author.displayName}`}>
              <div className="novel-detail__author-avatar" aria-hidden="true">
                {novel.author.avatarUrl ? (
                  <img src={novel.author.avatarUrl} alt={novel.author.displayName} />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <span className="novel-detail__author-name">{novel.author.displayName}</span>
            </div>

            {/* Synopsis */}
            <p className="novel-detail__synopsis">{novel.synopsis}</p>

            {/* Action buttons */}
            <ActionButtons
              isBookmarked={novel.isBookmarked}
              isLiked={novel.isLiked}
              onRead={handleRead}
              onBookmark={handleBookmark}
              onLike={handleLike}
            />

            {/* Progress card */}
            <div className="novel-detail__progress">
              <ProgressBar
                percentage={novel.userProgress.percentage}
                currentChapter={novel.userProgress.currentChapter}
                totalChapters={novel.userProgress.totalChapters}
                discoveredChoices={novel.userProgress.discoveredChoices}
                totalChoices={novel.userProgress.totalChoices}
                onStoryMapClick={handleStoryMap}
              />
            </div>
          </main>
        </div>

        {/* ── Synopsis detail section ── */}
        <section className="novel-detail__synopsis-section" aria-labelledby="synopsis-heading">
          <h2 id="synopsis-heading" className="novel-detail__section-title">
            แนะนำเรื่อง
          </h2>
          <p className="novel-detail__synopsis-detail">{novel.synopsis_detail}</p>

          {/* Characters */}
          {novel.characters && novel.characters.length > 0 && (
            <div className="novel-detail__characters" aria-label="ตัวละคร">
              {novel.characters.map((char) => (
                <div key={char.role} className="novel-detail__character-row">
                  <span className="novel-detail__character-role">{char.role}</span>
                  <span className="novel-detail__character-sep">:</span>
                  <span className="novel-detail__character-name">{char.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default NovelDetailPage;
