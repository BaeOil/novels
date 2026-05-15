// src/pages/Reading/ReadingPage.jsx

import React, { useState, useEffect, useRef } from "react";

import "./ReadingPage.css";

import ReadingBreadcrumb from "../../../components/ReadingBreadcrumb/ReadingBreadcrumb";

import ChoiceButtons from "../../../components/ChoiceButtons/ChoiceButtons";

import { getChapterById } from "../../../data/mockData";

const ReadingPage = ({
  novelId,
  chapterId: initialChapterId,
  novelTitle = "ผจญภัยกับสามหมี",
  onNavigate,
}) => {

  // scene/chapter ปัจจุบัน
  const [currentChapterId, setCurrentChapterId] = useState(
    initialChapterId || "ch-001"
  );

  // ข้อมูล chapter
  const [chapter, setChapter] = useState(null);

  // animation
  const [isTransitioning, setIsTransitioning] = useState(false);

  // progress bar
  const [readProgress, setReadProgress] = useState(0);

  // choice selected
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);

  const contentRef = useRef(null);

  // ==========================================
  // โหลด chapter จาก mockData
  // ==========================================

  useEffect(() => {

    const foundChapter = getChapterById(currentChapterId);

    setChapter(foundChapter);

    // scroll top
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  }, [currentChapterId]);

  // ==========================================
  // progress bar
  // ==========================================

  useEffect(() => {

    const handleScroll = () => {

      const el = document.documentElement;

      const scrolled = el.scrollTop;

      const total = el.scrollHeight - el.clientHeight;

      if (total > 0) {

        setReadProgress(
          Math.round((scrolled / total) * 100)
        );

      }

    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    return () => {

      window.removeEventListener(
        "scroll",
        handleScroll
      );

    };

  }, []);

  // ==========================================
  // เลือกตัวเลือก
  // ==========================================

  const handleChoose = (choice) => {

    console.log("เลือก:", choice);

    setSelectedChoiceId(choice.id);

    setIsTransitioning(true);

    setTimeout(() => {

      // เปลี่ยน chapter
      setCurrentChapterId(choice.nextChapterId);

      // reset animation
      setIsTransitioning(false);

      // reset selected
      setSelectedChoiceId(null);

    }, 350);

  };

  // ==========================================
  // loading
  // ==========================================

  if (!chapter) {

    return (

      <div
        className="rp__loading"
        aria-live="polite"
      >

        <div
          className="rp__loading-spinner"
          aria-label="กำลังโหลด"
        />

        <p>กำลังโหลดตอน...</p>

      </div>

    );

  }

  // ==========================================
  // render
  // ==========================================

  return (

    <div className="rp">

      {/* progress bar */}

      <div
        className="rp__progress-bar"
        style={{
          width: `${readProgress}%`,
        }}
        role="progressbar"
        aria-valuenow={readProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      <div className="rp__container">

        {/* breadcrumb */}

        <ReadingBreadcrumb
          novelTitle={novelTitle}
          chapterTitle={chapter.title}
          onBack={() =>
            onNavigate("novel-detail", {
              novelId,
            })
          }
          onStoryMap={() =>
            onNavigate("story-tree", {
              novelId,
            })
          }
        />

        {/* article */}

        <article
          className={`rp__article ${
            isTransitioning
              ? "rp__article--out"
              : "rp__article--in"
          }`}
          ref={contentRef}
        >

          {/* path */}

          {chapter.path && (

            <div
              className="rp__path-badge"
              aria-label={`เส้นทาง: ${chapter.path}`}
            >

              {chapter.path}

            </div>

          )}

          {/* from choice */}

          {chapter.fromChoice && (

            <div
              className="rp__from-choice"
              aria-label="ตัวเลือกก่อนหน้า"
            >

              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >

                <path
                  d="M4 6h4M7 4l2 2-2 2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

              </svg>

              เลือก: {chapter.fromChoice}

            </div>

          )}

          {/* title */}

          <h1 className="rp__title">

            {chapter.title}

          </h1>

          {/* ornament */}

          <div
            className="rp__ornament"
            aria-hidden="true"
          >

            <span className="rp__orn-line" />

            <span className="rp__orn-dot">✦</span>

            <span className="rp__orn-dot">✦</span>

            <span className="rp__orn-dot">✦</span>

            <span className="rp__orn-line" />

          </div>

          {/* meta */}

          <div className="rp__meta">

            <span>
              ⏱ {chapter.readingTime} นาที
            </span>

            <span className="rp__meta-sep">
              ·
            </span>

            <span>
              ตอนที่ {chapter.chapterNumber}
            </span>

          </div>

          {/* body */}

          <div
            className="rp__body"
            aria-label="เนื้อหา"
          >

            {chapter.content.map(
              (paragraph, i) => (

                <p
                  key={i}
                  className="rp__paragraph"
                >

                  {paragraph}

                </p>

              )
            )}

          </div>

          {/* choices */}

          {chapter.choices &&
            chapter.choices.length > 0 && (

              <ChoiceButtons
                prompt={chapter.choicePrompt}
                choices={chapter.choices}
                onChoose={handleChoose}
                selectedChoiceId={selectedChoiceId}
              />

            )}

          {/* ending */}

          {(!chapter.choices ||
            chapter.choices.length === 0) && (

            <div className="rp__ending">

              <div
                className="rp__ending-icon"
                aria-hidden="true"
              >

                🏆

              </div>

              <h2 className="rp__ending-title">

                จบเส้นทางนี้แล้ว!

              </h2>

              <p className="rp__ending-desc">

                คุณได้ค้นพบหนึ่งในตอนจบของนิยายเรื่องนี้

              </p>

              <div className="rp__ending-actions">

                <button
                  className="rp__ending-btn rp__ending-btn--primary"
                  onClick={() =>
                    onNavigate(
                      "story-tree",
                      { novelId }
                    )
                  }
                >

                  🌳 ดู Story Tree

                </button>

                <button
                  className="rp__ending-btn rp__ending-btn--outline"
                  onClick={() =>
                    onNavigate(
                      "novel-detail",
                      { novelId }
                    )
                  }
                >

                  กลับหน้ารายละเอียด

                </button>

              </div>

            </div>

          )}

        </article>

      </div>

    </div>

  );

};

export default ReadingPage;