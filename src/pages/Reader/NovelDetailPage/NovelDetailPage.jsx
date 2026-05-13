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
  synopsis_detail: "",
  isLiked: false,
  isBookmarked: false,
};
// ฟังก์ชันช่วยแก้ URL จาก minio:9000 เป็น localhost:9000 หรือ IP จริง
const formatMinioUrl = (url) => {
  if (!url) return null;
  // ถ้าเจอคำว่า minio ให้เปลี่ยนเป็น localhost (หรือเปลี่ยนเป็น IP เครื่อง)
  return url.replace('http://minio:9000', 'http://localhost:9000');
};

const NovelDetailPage = () => {
  const { id } = useParams();
  const [novel, setNovel] = useState(initialNovelState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);

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

            commentsData =
              commentsPayload?.data?.comments ||
              commentsPayload?.comments ||
              [];

            setComments(commentsData);
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
          categories: data.categories && data.categories.length > 0
            ? data.categories.map(cat => typeof cat === "object" ? cat.name : cat)
            : ["ทั่วไป"],
          coverImage: formatMinioUrl(data.cover_image) || null,
          author: {
            displayName: data.author_name || data.pen_name || "ไม่ทราบผู้แต่ง",
            avatarUrl: formatMinioUrl(data.author_avatar) || null,
          },
          synopsis: data.captions || data.introduction || "",
          stats: {
            views: data.views || 0,
            paths: 0,
            choicePoints: 0,
            endings: 1,
          },
          userProgress: {
            percentage: 0, // ถ้ายังไม่มีระบบเก็บ Logic การอ่าน ให้เริ่มที่ 0
            currentChapter: 0,
            totalChapters: chaptersData.length,
            discoveredChoices: 0,
            totalChoices: 0,
          },
          synopsis_detail: data.introduction || "ยังไม่มีรายละเอียดเพิ่มเติม",
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

        {/* ── Section แนะนำเรื่อง ── */}
        <section className="novel-detail__synopsis-section" aria-labelledby="synopsis-heading">
          <h2 id="synopsis-heading" className="novel-detail__section-title">
            แนะนำเรื่อง
          </h2>
          <div
            className="novel-detail__synopsis-detail"
            dangerouslySetInnerHTML={{ __html: novel.synopsis_detail }}
          />
        </section>
        {/* ── Section คอมเมนต์ ── */}
        <section
          className="novel-detail__comments-section"
          aria-labelledby="comments-heading"
        >
          <div className="novel-detail__comments-header">
            <h2
              id="comments-heading"
              className="novel-detail__section-title"
            >
              ความคิดเห็น
            </h2>

            <span className="novel-detail__comments-count">
              {comments.length} ความคิดเห็น
            </span>
          </div>

          {/* Input */}
          <div className="novel-detail__comment-form">
            <textarea
              placeholder="เขียนความคิดเห็นของคุณ..."
              className="novel-detail__comment-input"
              rows={4}
            />

            <button className="novel-detail__comment-button">
              ส่งความคิดเห็น
            </button>
          </div>

          {/* List */}
          <div className="novel-detail__comments-list">
            {comments.length === 0 ? (
              <div className="novel-detail__comments-empty">
                ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์เลย 💖
              </div>
            ) : (
              comments.map((comment) => (
                <article
                  key={comment.comment_id}
                  className="novel-detail__comment-card"
                >
                  <div className="novel-detail__comment-avatar">
                    💬
                  </div>

                  <div className="novel-detail__comment-body">
                    <div className="novel-detail__comment-top">
                      <span className="novel-detail__comment-user">
                        {comment.username || "Unknown"}
                      </span>

                      <span className="novel-detail__comment-date">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="novel-detail__comment-content">
                      {comment.content}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};


export default NovelDetailPage;
