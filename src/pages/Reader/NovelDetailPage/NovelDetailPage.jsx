import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import "./NovelDetailPage.css";

import NovelCoverCard from "../../../components/NovelCoverCard/NovelCoverCard";
import GenreTag from "../../../components/GenreTag/GenreTag";
import ActionButtons from "../../../components/ActionButtons/ActionButtons";
import ProgressBar from "../../../components/ProgressBar/ProgressBar";

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

const formatMinioUrl = (url) => {
  if (!url) return null;
  return url.replace('http://minio:9000', 'http://localhost:9000');
};

const NovelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const [novel, setNovel] = useState(initialNovelState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  
  // 📝 เพิ่ม State เฉพาะฝั่งกล่องพิมพ์ข้อความ (ไม่ต้องใช้ Authen)
  const [commentText, setCommentText] = useState("");

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
        // ดึงข้อมูลรายละเอียดนิยายพ่วง user_id ล็อกหัวไว้ที่ 1 ก่อนทำ Authen
        const response = await fetch(`${API_BASE_URL}/novels/${id}?user_id=1`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload?.error || payload?.message || `${response.status} ${response.statusText}`
          );
        }

        const data = payload?.data || payload || {};
        const nData = data.novel || {}; 

        // ดึงจำนวนตอนทั้งหมดจาก API chapters เผื่อไว้เช็คสถิติฝั่งแกรนด์ทับ
        let chaptersCountFromApi = 0;
        try {
          const chaptersResponse = await fetch(`${API_BASE_URL}/novels/${id}/chapters`);
          if (chaptersResponse.ok) {
            const chaptersPayload = await chaptersResponse.json();
            const chaptersList = chaptersPayload?.data?.chapters || chaptersPayload?.chapters || [];
            chaptersCountFromApi = chaptersList.length;
          }
        } catch (err) {
          console.warn("Failed to fetch chapters:", err);
        }

        try {
          const commentsResponse = await fetch(`${API_BASE_URL}/novels/${id}/comments`);
          if (commentsResponse.ok) {
            const commentsPayload = await commentsResponse.json();
            const commentsData = commentsPayload?.data?.comments || commentsPayload?.comments || [];
            setComments(commentsData);
          }
        } catch (err) {
          console.warn("Failed to fetch comments:", err);
        }

        // 🔍 ดักจับชื่อตัวแปรจากหลังบ้าน รองรับทั้ง snake_case และ camelCase
        const totalScenes = data.total_scenes ?? data.totalScenes ?? chaptersCountFromApi ?? 0;
        const visitedScenes = data.visited_scenes ?? data.visitedScenes ?? 0;
        const totalChoices = data.total_choices ?? data.totalChoices ?? 0;
        const discoveredChoices = data.discovered_choices ?? data.discoveredChoices ?? 0;
        const totalEndings = data.total_endings ?? data.totalEndings ?? 0;

        // คำนวณเปอร์เซ็นต์จากข้อมูลหลังบ้านแท้ๆ
        const calculatedPercentage = totalScenes > 0 
          ? Math.round((visitedScenes / totalScenes) * 100) 
          : 0;

        setNovel({
          id: nData.novel_id || nData.id || id,
          title: nData.title || "ไม่พบชื่อเรื่อง",
          categories: nData.categories && nData.categories.length > 0
            ? nData.categories.map(cat => typeof cat === "object" ? cat.name : cat)
            : ["ทั่วไป"],
          coverImage: formatMinioUrl(nData.cover_image) || null,
          author: {
            displayName: nData.author_name || nData.pen_name || "ไม่ทราบผู้แต่ง",
            avatarUrl: formatMinioUrl(nData.author_avatar) || null,
          },
          synopsis: nData.captions || nData.introduction || "ไม่มีเรื่องย่อ",
          
          // 📊 ข้อมูลจริงจากสเตตัสหลังบ้าน
          stats: {
            views: nData.views || 0, 
            paths: totalScenes, 
            choicePoints: totalChoices,
            endings: totalEndings,
          },

          // 📈 ส่วนการ์ดความคืบหน้าผู้ใช้งาน
          userProgress: {
            percentage: calculatedPercentage, 
            currentChapter: visitedScenes,       
            totalChapters: totalScenes,          
            discoveredChoices: discoveredChoices, 
            totalChoices: totalChoices,          
          },
          synopsis_detail: nData.introduction || "ยังไม่มีรายละเอียดเพิ่มเติม",
          isLiked: false,
          isBookmarked: false,
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  // 📖 ปุ่มเริ่มอ่าน ดิ่งเข้าหน้าอ่านหลักประจำรหัสนิยาย
  const handleRead = () => {
    if (novel.id) {
      navigate(`/reading/${novel.id}`);
    }
  };

  const handleBookmark = (isBookmarked) => {
    console.log("bookmark:", isBookmarked);
  };

  const handleLike = (isLiked) => {
    console.log("like:", isLiked);
  };

  const handleStoryMap = () => {
    if (novel.id) {
      navigate(`/storytree/${novel.id}`);
    }
  };

  // 💬 ฟังก์ชันจำลองเมื่อกดปุ่มส่งความคิดเห็น (ผูก Log ไว้รอน้าทำ Authen / API ส่งจริง)
  const handleSendCommentMock = () => {
    if (!commentText.trim()) return;
    console.log("ส่งความคิดเห็นข้อความสำเร็จ:", commentText);
    alert(`ระบบบันทึกคอมเมนต์จำลอง: "${commentText}" (รอเชื่อมต่อหลังบ้านสมบูรณ์)`);
    setCommentText(""); // ล้างกล่องข้อความ
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
          onClick={() => navigate("/")} 
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
        </section>

        <section className="novel-detail__comments-section" aria-labelledby="comments-heading">
          <div className="novel-detail__comments-header">
            <h2 id="comments-heading" className="novel-detail__section-title">
              ความคิดเห็น
            </h2>
            <span className="novel-detail__comments-count">
              {comments.length} ความคิดเห็น
            </span>
          </div>

          <div className="novel-detail__comment-form">
            <textarea
              placeholder="เขียนความคิดเห็นของคุณ..."
              className="novel-detail__comment-input"
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)} // 👈 เพิ่มลอจิกผูกข้อความเข้า State
            />
            <button 
              className="novel-detail__comment-button" 
              onClick={handleSendCommentMock} // 👈 ลิงก์ปุ่มเข้าฟังก์ชันจัดการเบื้องต้น
            >
              ส่งความคิดเห็น
            </button>
          </div>

          <div className="novel-detail__comments-list">
            {comments.length === 0 ? (
              <div className="novel-detail__comments-empty">
                ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์เลย 💖
              </div>
            ) : (
              comments.map((comment) => (
                <article
                  key={comment.comment_id || comment.id}
                  className="novel-detail__comment-card"
                >
                  <div className="novel-detail__comment-avatar">💬</div>
                  <div className="novel-detail__comment-body">
                    <div className="novel-detail__comment-top">
                      <span className="novel-detail__comment-user">
                        {comment.username || "ผู้ใช้งานนิรนาม"}
                      </span>
                      <span className="novel-detail__comment-date">
                        {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : "ไม่ระบุวันที่"}
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
