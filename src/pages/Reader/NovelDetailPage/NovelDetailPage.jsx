import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./NovelDetailPage.css";

import NovelCoverCard from "../../../components/NovelCoverCard/NovelCoverCard";
import GenreTag from "../../../components/GenreTag/GenreTag";
import ActionButtons from "../../../components/ActionButtons/ActionButtons";
import FollowButton from "../../../components/FollowButton/FollowButton";
import ProgressBar from "../../../components/ProgressBar/ProgressBar";
import EndingCollection from "../../../components/EndingCollection/EndingCollection";
import Comments from "../../../components/Comments/Comments";

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
    likes: 0,
    bookshelfCount: 0,
    comments: 0,
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
  const [commentText, setCommentText] = useState("");
  const [endings, setEndings] = useState([]);
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [nextSceneId, setNextSceneId] = useState(null);
  const [showNoContentDialog, setShowNoContentDialog] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartError, setRestartError] = useState(null);
  const [bookmarkProcessing, setBookmarkProcessing] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

  const getCurrentUserId = () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return 0;
    try {
      const user = JSON.parse(userJson);
      return user?.id || user?.user_id || 0;
    } catch (err) {
      console.warn("Failed to parse user from localStorage:", err);
      return 0;
    }
  };

  const fetchBookmarkedStatus = async (currentNovelId, userId, headers) => {
    if (!currentNovelId || !userId) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/bookshelves?user_id=${userId}`, { headers });
      if (!response.ok) return false;

      const payload = await response.json().catch(() => null);
      const bookshelfItems = payload?.data?.bookshelf || payload?.bookshelf || payload?.novels || payload?.data || [];
      const items = Array.isArray(bookshelfItems) ? bookshelfItems : [];

      return items.some((item) => String(item.novel_id ?? item.id ?? item.novel?.id ?? "") === String(currentNovelId));
    } catch (err) {
      console.warn("Failed to fetch bookshelf status:", err);
      return false;
    }
  };

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
        const token = localStorage.getItem("token");
        const userId = getCurrentUserId();
        const headers = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const query = userId > 0 ? `?user_id=${userId}` : "";
        const response = await fetch(`${API_BASE_URL}/novels/${id}${query}`, { headers });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.error || payload?.message || `${response.status} ${response.statusText}`
          );
        }

        const data = payload?.data || payload || {};
        const nData = data.novel || {};

        const resolveSceneId = (source) => {
          if (!source) return null;
          return source.current_scene_id ?? source.CurrentSceneID ?? source.currentSceneId ?? null;
        };

        const progressSceneId = resolveSceneId(data);
        if (progressSceneId) {
          setNextSceneId(String(progressSceneId));
        }

        if (userId > 0 && !progressSceneId) {
          try {
            const treeResponse = await fetch(`${API_BASE_URL}/novels/${id}/story-tree?user_id=${userId}`, { headers });
            const treePayload = await treeResponse.json().catch(() => null);
            if (treeResponse.ok) {
              const treeData = treePayload?.data || treePayload || {};
              const treeSceneId = resolveSceneId(treeData);
              if (treeSceneId) {
                setNextSceneId(String(treeSceneId));
              }
            }
          } catch (err) {
            console.warn("Failed to fetch current scene from story-tree:", err);
          }
        }

        let chaptersCountFromApi = 0;
        try {
          const chaptersResponse = await fetch(`${API_BASE_URL}/novels/${id}/chapters`);
          if (chaptersResponse.ok) {
            const chaptersPayload = await chaptersResponse.json();
            const chaptersList = chaptersPayload?.data?.chapters || chaptersPayload?.chapters || [];
            
            const publishedChapters = chaptersList.filter((chapter) => {
              if (typeof chapter.is_published === "boolean") {
                return chapter.is_published === true;
              }
              const status = chapter.status ?? chapter.Status ?? "";
              return String(status).toLowerCase() === "published";
            });
            
            // นับเฉพาะตอนที่เปิดให้อ่านแล้ว
            chaptersCountFromApi = publishedChapters.length; 
          }
        } catch (err) {
          console.warn("Failed to fetch chapters:", err);
        }

        let commentsCount = 0;

        try {
          const countResponse = await fetch(`${API_BASE_URL}/novels/${id}/comments/count`);
          if (countResponse.ok) {
            const countPayload = await countResponse.json().catch(() => null);
            commentsCount = Number(countPayload?.data?.count ?? countPayload?.count ?? 0) || 0;
          }
        } catch (err) {
          console.warn("Failed to fetch comment count:", err);
          commentsCount = 0;
        }

        const progressSource = data.progress || data.user_progress || data.userProgress || data || {};
        const isBookmarked = userId > 0 ? await fetchBookmarkedStatus(id, userId, headers) : false;

        let currentChapterProgress = progressSource.current_chapter ?? progressSource.currentChapter ?? 0;
        const totalChaptersProgress = progressSource.total_chapters ?? progressSource.totalChapters ?? chaptersCountFromApi ?? 0;
        const totalChoices = progressSource.total_choices ?? progressSource.totalChoices ?? 0;
        const discoveredChoices = progressSource.discovered_choices ?? progressSource.discoveredChoices ?? 0;
        const totalEndings = progressSource.total_endings ?? progressSource.totalEndings ?? 0;

        if (currentChapterProgress === 0 && progressSceneId) {
          try {
            const sceneResp = await fetch(`${API_BASE_URL}/scenes/${progressSceneId}`);
            if (sceneResp.ok) {
              const scenePayload = await sceneResp.json().catch(() => null);
              const sceneData = scenePayload?.data || scenePayload || {};
              const sceneEpisode = sceneData.chapter_episode ?? sceneData.chapterEpisode ?? sceneData.episode ?? sceneData.chapter_order ?? sceneData.order ?? 0;
              if (sceneEpisode > 0) {
                currentChapterProgress = sceneEpisode;
              }
            }
          } catch (err) {
            console.warn("Failed to fetch current scene chapter for progress:", err);
          }
        }

        // 🌟 แก้ไข: คำนวณเปอร์เซ็นต์สัมพันธ์กับจำนวนตอนจริง ไม่ใช่ระดับฉากย่อย
        const calculatedPercentage = totalChaptersProgress > 0
          ? Math.round((currentChapterProgress / totalChaptersProgress) * 100)
          : 0;

        setNovel({
          id: nData.novel_id || nData.id || id,
          title: nData.title || "ไม่พบชื่อเรื่อง",
          categories: Array.isArray(nData.categories)
            ? Array.from(new Set(
              nData.categories
                .map(cat => typeof cat === "object" ? cat.name : cat)
                .filter(Boolean)
            ))
            : ["ทั่วไป"],
          coverImage: formatMinioUrl(nData.cover_image) || null,
          author: {
            displayName: nData.author_name || nData.pen_name || "ไม่ทราบผู้แต่ง",
            avatarUrl: formatMinioUrl(nData.author_avatar) || null,
            writer_id: nData.author_writer_id || nData.author_writerId || nData.author_id || nData.user_id || null,
            user_id: nData.user_id || nData.author_id || null,
            id: nData.author_id || nData.user_id || null,
          },
          synopsis: nData.captions || nData.introduction || "ไม่มีเรื่องย่อ",

          stats: {
            views: nData.views || 0,
            likes: nData.like_count || nData.likeCount || 0,
            bookshelfCount:
              nData.bookshelf_count || nData.bookmark_count || nData.total_bookmarks || 0,
            comments: commentsCount,
            choicePoints: totalChoices,
            endings: totalEndings,
          },

          userProgress: {
            percentage: calculatedPercentage,
            currentChapter: currentChapterProgress,
            totalChapters: totalChaptersProgress,
            discoveredChoices: discoveredChoices,
            totalChoices: totalChoices,
          },
          synopsis_detail: nData.introduction || "ยังไม่มีรายละเอียดเพิ่มเติม",
          isLiked: nData.is_liked || nData.isLiked || false,
          isBookmarked: isBookmarked,
        });

        try {
          const isFollowing = Boolean(data.is_following || data.isFollowing || nData.is_following || nData.isFollowing);
          setIsFollowingAuthor(isFollowing);
        } catch (e) {
          setIsFollowingAuthor(false);
        }
        setEndings(data.endings || []);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  const handleRead = () => {
    const hasNoContent = novel.userProgress?.totalChapters === 0;
    const hasSavedScene = !!nextSceneId;

    if (hasNoContent) {
      setShowNoContentDialog(true);
      return;
    }

    if (novel.id) {
      if (hasSavedScene) {
        navigate(`/reading/${novel.id}/${nextSceneId}`);
      } else {
        navigate(`/reading/${novel.id}`);
      }
    }
  };

  const handleBookmark = async (isBookmarked) => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login-register");
      return;
    }

    if (bookmarkProcessing) return;
    setBookmarkProcessing(true);

    try {
      const method = isBookmarked ? "POST" : "DELETE";
      const url = `${API_BASE_URL}/bookshelves${isBookmarked ? "" : `?novel_id=${id}`}`;
      const body = isBookmarked ? JSON.stringify({ novel_id: parseInt(id, 10) }) : undefined;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
      }

      setNovel((prev) => ({
        ...prev,
        isBookmarked: isBookmarked,
      }));
    } catch (err) {
      console.error("Failed to update bookshelf status:", err);
      setNovel((prev) => ({ ...prev, isBookmarked: !isBookmarked }));
    } finally {
      setBookmarkProcessing(false);
    }
  };

  const [likeProcessing, setLikeProcessing] = useState(false);

  const handleLike = async (isLiked) => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login-register");
      return;
    }

    if (likeProcessing) return;
    setLikeProcessing(true);

    try {
      const method = isLiked ? "POST" : "DELETE";
      const url = isLiked ? `${API_BASE_URL}/likes` : `${API_BASE_URL}/likes?novel_id=${id}`;
      const body = isLiked ? JSON.stringify({ novel_id: parseInt(id, 10) }) : undefined;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
      }

      setNovel((prev) => ({
        ...prev,
        isLiked: isLiked,
        stats: {
          ...prev.stats,
          likes: Math.max(0, prev.stats.likes + (isLiked ? 1 : -1)),
        },
      }));
    } catch (err) {
      console.error("Failed to update like status:", err);
      setNovel((prev) => ({ ...prev, isLiked: !isLiked }));
    } finally {
      setLikeProcessing(false);
    }
  };

  const handleRestartConfirmOpen = () => {
    setRestartError(null);
    setShowRestartConfirm(true);
  };

  const handleRestartConfirmClose = () => {
    setShowRestartConfirm(false);
    setRestartLoading(false);
    setRestartError(null);
  };

  const handleRestart = async () => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setRestartError("กรุณาเข้าสู่ระบบก่อนเริ่มอ่านใหม่");
      return;
    }

    setRestartLoading(true);
    setRestartError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/novels/${id}/restart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
      }

      const startSceneId = payload?.data?.start_scene_id || payload?.data?.StartSceneID || payload?.start_scene_id || payload?.startSceneId;
      if (startSceneId) {
        navigate(`/reading/${id}/${startSceneId}`);
      } else {
        navigate(`/reading/${id}`);
      }
    } catch (err) {
      setRestartError(err.message || "ไม่สามารถเริ่มอ่านใหม่ได้ในขณะนี้");
    } finally {
      setRestartLoading(false);
    }
  };

  const handleStoryMap = (sceneId) => {
    if (novel.id) {
      const query = sceneId ? `?highlight_scene=${sceneId}` : "";
      navigate(`/storytree/${novel.id}${query}`);
    }
  };

  const handleEndingCollection = () => {
    setShowEndingModal(true);
  };

  const fetchNovelComments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/novels/${id}/comments`);
      if (!response.ok) throw new Error(`failed to load comments: ${response.status}`);

      const payload = await response.json().catch(() => null);
      const commentsData = payload?.comments || payload?.data?.comments || [];
      setComments(Array.isArray(commentsData) ? commentsData : []);
    } catch (err) {
      console.warn("Failed to load novel comments:", err);
      setComments([]);
    }
  };

  const handleSendComment = async (text) => {
    const value = typeof text === "string" ? text : commentText;
    if (!value.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login-register");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          novel_id: parseInt(id, 10),
          content: value,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
      }

      setCommentText("");
      await fetchNovelComments();
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert(`ไม่สามารถส่งความคิดเห็นได้: ${err.message || "ระบบขัดข้อง"}`);
    }
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

              {novel.author?.writer_id || novel.author?.id ? (
                <FollowButton
                  writerId={novel.author.writer_id || novel.author.id || novel.author.user_id}
                  writerName={novel.author.displayName}
                  isFollowing={isFollowingAuthor}
                  onFollowChange={setIsFollowingAuthor}
                  size="small"
                />
              ) : null}
            </div>

            <p className="novel-detail__synopsis">{novel.synopsis}</p>

            <div className="novel-detail__action-group">
              <ActionButtons
                isBookmarked={novel.isBookmarked}
                isLiked={novel.isLiked}
                readLabel={novel.userProgress.currentChapter > 0 ? "อ่านต่อ" : "อ่านเลย"}
                readAriaLabel={novel.userProgress.currentChapter > 0 ? "อ่านต่อ" : "อ่านเลย"}
                onRead={handleRead}
                onBookmark={handleBookmark}
                onLike={handleLike}
              />
              <div className="novel-detail__restart-row">
                <button
                  className="novel-detail__restart-button"
                  type="button"
                  onClick={handleRestartConfirmOpen}
                >
                  🔄 เริ่มอ่านใหม่
                </button>
              </div>
            </div>

            {/* 🌟 ปรับปรุง UX ส่วนความคืบหน้า: ควบรวมฟังก์ชันจัดการความคืบหน้ามาไว้ด้วยกันอย่างเป็นระเบียบ */}
            <div className="novel-detail__progress">
              <ProgressBar
                percentage={novel.userProgress.percentage}
                currentChapter={novel.userProgress.currentChapter}
                totalChapters={novel.userProgress.totalChapters}
                discoveredChoices={novel.userProgress.discoveredChoices}
                totalChoices={novel.userProgress.totalChoices}
                onStoryMapClick={handleStoryMap}
                onEndingCollectionClick={handleEndingCollection}
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

        <EndingCollection
          isOpen={showEndingModal}
          endings={endings}
          onClose={() => setShowEndingModal(false)}
          onViewStoryMap={(sceneId) => handleStoryMap(sceneId)}
        />

        <Comments
          comments={comments}
          currentUserId={getCurrentUserId()}
          commentText={commentText}
          onCommentTextChange={(e) => setCommentText(e.target.value)}
          onSubmit={(text) => handleSendComment(text)}
          onDeleteComment={async (commentId) => {
            const token = localStorage.getItem("token");
            if (!token) {
              navigate("/login-register");
              return;
            }

            try {
              const response = await fetch(`${API_BASE_URL}/comments?comment_id=${commentId}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
              }

              await fetchNovelComments();
            } catch (err) {
              console.error("Failed to delete comment:", err);
              alert(`ไม่สามารถลบความคิดเห็นได้: ${err.message || "ระบบขัดข้อง"}`);
            }
          }}
        />

        {showNoContentDialog && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0, 0, 0, 0.45)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 9999, backdropFilter: "blur(5px)",
            transition: "all 0.3s ease"
          }}>
            <div style={{
              background: "#ffffff", padding: "36px 32px", borderRadius: "20px",
              maxWidth: "400px", width: "90%", textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}>
              <div style={{ fontSize: "54px", marginBottom: "16px", animation: "bounce 2s infinite" }}>✍️✨</div>
              <h3 style={{ fontSize: "19px", fontWeight: "700", color: "#1a202c", marginBottom: "12px", fontFamily: "inherit" }}>
                นักเขียนกำลังรังสรรค์เนื้อหา
              </h3>
              <p style={{ fontSize: "14px", color: "#4a5568", lineHeight: "1.6", marginBottom: "26px" }}>
                นิยายเรื่องนี้ยังไม่มีเนื้อหาให้อ่าน <br />
                รอนักเขียนปล่อยตอนใหม่เร็วๆ นี้นะ
              </p>
              <button
                onClick={() => setShowNoContentDialog(false)}
                style={{
                  width: "100%", padding: "13px", borderRadius: "12px",
                  background: "#E91E8C", color: "#ffffff",
                  border: "none", fontWeight: "600", cursor: "pointer",
                  fontSize: "15px", boxShadow: "0 4px 6px -1px rgba(233, 30, 99, 0.3)"
                }}
              >
                รับทราบ ยินดีรอคอย
              </button>
            </div>
          </div>
        )}

        {showRestartConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div style={{
              background: "#ffffff",
              padding: "32px",
              borderRadius: "18px",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              textAlign: "center"
            }}>
              <h3 style={{ marginBottom: "12px", fontSize: "1.25rem" }}>เริ่มอ่านใหม่</h3>
              <p style={{ marginBottom: "20px", color: "#4a5568", lineHeight: 1.6 }}>
                การเริ่มอ่านใหม่นี้จะคืนสถานะความคืบหน้าและผังเรื่องกลับไปยังจุดเริ่มต้น แต่จะยังเก็บตอนจบที่คุณค้นพบไว้
              </p>
              {restartError && (
                <div style={{ marginBottom: "14px", color: "#b91c1c" }}>{restartError}</div>
              )}
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleRestartConfirmClose}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    cursor: "pointer"
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  disabled={restartLoading}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#E91E8C",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: restartLoading ? "not-allowed" : "pointer"
                  }}
                >
                  {restartLoading ? "กำลังเริ่มใหม่..." : "ยืนยันเริ่มอ่านใหม่"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NovelDetailPage;
