import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./NovelDetailPage.css";

import NovelCoverCard from "../../../components/NovelCoverCard/NovelCoverCard";
import GenreTag from "../../../components/GenreTag/GenreTag";
import ActionButtons from "../../../components/ActionButtons/ActionButtons";
import ProgressBar from "../../../components/ProgressBar/ProgressBar";
import { mockNovel } from "../../../data/mockNovel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const initialNovelState = {
  id: null,
  title: "",
  categories: [],
  coverImage: null,
  coverEmoji: "📘",
  author: {
    displayName: "ไม่ทราบผู้แต่ง",
    avatarUrl: null,
  },
  synopsis: "",
  stats: {
    views: 0,
    paths: 0,
    choicePoints: 0,
    endings: 0,
  },
  userProgress: {
    percentage: 0,
    currentChapter: 0,
    totalChapters: 0,
    discoveredChoices: 0,
    totalChoices: 0,
  },
  characters: [],
  synopsis_detail: "",
  isLiked: false,
  isBookmarked: false,
};

const NovelDetailPage = () => {
  const { id } = useParams();
  const [novel, setNovel] = useState(initialNovelState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNovel = async () => {
      if (!id) {
        setError("ไม่พบรหัสนิยาย");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/novels/${id}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload?.error || payload?.message || `${response.status} ${response.statusText}`
          );
        }

        const data = payload?.data || payload || {};
        
        // ดึงข้อมูลบท (chapters) ตามเส้นทางใหม่: GET /novels/{id}/chapters
        let chaptersData = [];
        try {
          const chaptersResponse = await fetch(`${API_BASE_URL}/novels/${id}/chapters`);
          if (chaptersResponse.ok) {
            const chaptersPayload = await chaptersResponse.json();
            chaptersData = chaptersPayload?.data?.chapters || chaptersPayload?.chapters || [];
          }
        } catch (err) {
          console.warn("Failed to fetch chapters:", err);
        }

        // ดึงข้อมูลความคิดเห็น (comments) ตามเส้นทางใหม่: GET /novels/{id}/comments
        let commentsData = [];
        try {
          const commentsResponse = await fetch(`${API_BASE_URL}/novels/${id}/comments`);
          if (commentsResponse.ok) {
            const commentsPayload = await commentsResponse.json();
            commentsData = commentsPayload?.data?.comments || commentsPayload?.comments || [];
          }
        } catch (err) {
          console.warn("Failed to fetch comments:", err);
        }

        // คำนวณสถิติจาก chapters ที่ได้
        const totalChapters = chaptersData.length || 0;
        const totalChoices = commentsData.length || 0;

        setNovel({
          id: data.novel_id || data.id || id,
          title: data.title || "ไม่พบชื่อเรื่อง",
          
          // 🟢 แก้บรรทัดนี้บรรทัดเดียว
          categories: data.categories && data.categories.length > 0
            ? data.categories.map(cat => typeof cat === "object" ? cat.name : cat)
            : mockNovel.categories || [],

          coverImage: data.cover_image || null,
          coverEmoji: data.cover_image ? "" : "📘",
          author: {
            displayName: data.author_name || data.pen_name || "ไม่ทราบผู้แต่ง",
            avatarUrl: data.author_avatar || null,
          },
          synopsis: data.captions || data.introduction || "",
          stats: {
            views: data.views || 0,
            paths: data.paths || mockNovel.stats?.paths || 0,
            choicePoints: data.choice_points || 0,
            endings: data.endings || mockNovel.stats?.endings || 1,
          },
          userProgress: {
            percentage: mockNovel.userProgress?.percentage || 0,
            currentChapter: mockNovel.userProgress?.currentChapter || 0,
            totalChapters: totalChapters || mockNovel.userProgress?.totalChapters || 0,
            discoveredChoices: mockNovel.userProgress?.discoveredChoices || 0,
            totalChoices: totalChoices || mockNovel.userProgress?.totalChoices || 0,
          },
          characters: data.characters || mockNovel.characters || [],
          synopsis_detail: data.introduction || data.captions || mockNovel.synopsis_detail || "ยังไม่มีรายละเอียดเพิ่มเติม",
          isLiked: false,
          isBookmarked: false,
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        // Fallback ใช้ mock data ถ้า API พัง
        setNovel(mockNovel);
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  const handleRead = () => {
    alert(`เริ่มอ่าน "${novel.title}"`);
  };

  const handleBookmark = (isBookmarked) => {
    console.log("bookmark:", isBookmarked);
  };

  const handleLike = (isLiked) => {
    console.log("like:", isLiked);
  };

  const handleStoryMap = () => {
    alert("ดู Story Map");
  };

  if (loading) {
    return (
      <div className="novel-detail">
        <div className="novel-detail__container">
          <p>กำลังโหลดข้อมูลนิยาย...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="novel-detail">
        <div className="novel-detail__container">
          <p className="text-red-600">เกิดข้อผิดพลาด: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="novel-detail">
      <div className="novel-detail__container">
        <button
          className="novel-detail__back"
          onClick={() => window.history.back()}
          aria-label="กลับหน้าหลัก"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          กลับหน้าหลัก
        </button>

        <div className="novel-detail__main">
          <aside className="novel-detail__aside" aria-label="ภาพปกและสถิติ">
            <NovelCoverCard novel={novel} />
          </aside>

          <main className="novel-detail__info" aria-label="ข้อมูลนิยาย">
            {novel.categories.length > 0 && (
              <div className="novel-detail__tags" role="list" aria-label="หมวดหมู่">
                {novel.categories.map((cat) => (
                  <div role="listitem" key={cat}>
                    <GenreTag label={cat} variant="primary" />
                  </div>
                ))}
              </div>
            )}

            <h1 className="novel-detail__title">{novel.title}</h1>

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

            <p className="novel-detail__synopsis">{novel.synopsis}</p>

            <ActionButtons
              isBookmarked={novel.isBookmarked}
              isLiked={novel.isLiked}
              onRead={handleRead}
              onBookmark={handleBookmark}
              onLike={handleLike}
            />

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

        <section className="novel-detail__synopsis-section" aria-labelledby="synopsis-heading">
          <h2 id="synopsis-heading" className="novel-detail__section-title">
            แนะนำเรื่อง
          </h2>
          <div
            className="novel-detail__synopsis-detail"
            dangerouslySetInnerHTML={{ __html: novel.synopsis_detail }}
          />

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
