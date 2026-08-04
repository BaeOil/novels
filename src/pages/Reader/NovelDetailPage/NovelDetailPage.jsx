import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./NovelDetailPage.css";

import NovelCoverCard from "../../../components/NovelCoverCard/NovelCoverCard";
import GenreTag from "../../../components/GenreTag/GenreTag";
import ActionButtons from "../../../components/ActionButtons/ActionButtons";
import FollowButton from "../../../components/FollowButton/FollowButton";
import NovelProgressBar from "../../../components/NovelProgressBar/NovelProgressBar";
import EndingCollection from "../../../components/EndingCollection/EndingCollection";
import Comments from "../../../components/Comments/Comments";
import ReaderReportButton from "../../../components/ReaderReportButton/ReaderReportButton";
import AdminModeBanner from "../../../components/AdminModeBanner/AdminModeBanner";
// Removed authUtils import per user request

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const initialNovelState = {
  id: null,
  title: "",
  categories: [],
  coverImage: null,
  coverEmoji: "📘",
  status: "draft",
  isCompleted: false,
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

const stripHtml = (html = "") => {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim();
};

// ใช้ร่วมกันระหว่าง showNoContentDialog กับ showRestartConfirm แทนที่จะก็อปปี้
// โครง overlay/กล่องเดิมซ้ำสองรอบด้วย inline style คนละชุด (คนละสีกับธีมหลักของเว็บ)
const SimpleModal = ({ onClose, maxWidth = 400, children }) => (
  <div
    className="novel-detail__modal-overlay"
    onClick={(e) => {
      if (e.target === e.currentTarget && onClose) onClose();
    }}
  >
    <div className="novel-detail__modal-box" style={{ maxWidth }}>
      {children}
    </div>
  </div>
);

const NovelDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isPreview = new URLSearchParams(location.search).get("preview") === "true";
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
  const [likeProcessing, setLikeProcessing] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

  const getCurrentUser = () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch (err) {
      console.warn("Failed to parse user from localStorage:", err);
      return null;
    }
  };

  const isCurrentUserAdmin = () => {
    try {
      const user = getCurrentUser();
      const r = (user?.role || user?.user_role || user?.role_name || "").toString().toLowerCase();
      if (r === "admin" || user?.is_admin === true || user?.isAdmin === true) return true;
    } catch (e) {}

    try {
      const token = localStorage.getItem("token");
      if (token) {
        const parts = token.split(".");
        if (parts.length === 3) {
          let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          while (payload.length % 4) payload += "=";
          const decoded = atob(payload);
          const json = decodeURIComponent(decoded.split("").map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`).join(""));
          const parsed = JSON.parse(json);
          const r = (parsed?.role || parsed?.user_role || "").toString().toLowerCase();
          if (r === "admin" || parsed?.is_admin === true || parsed?.isAdmin === true) return true;
        }
      }
    } catch (e) {}

    return false;
  };


  const getCurrentUserId = () => {
    const user = getCurrentUser();
    return user?.id || user?.user_id || 0;
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

  useEffect(() => {
    const fetchNovel = async () => {
      if (!id) {
        setError("ไม่พบรหัสนิยาย");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setNextSceneId(null);

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

        const progressSource = data.progress || data.user_progress || data.userProgress || data || {};

        const resolveSceneId = (source) => {
          if (!source) return null;
          return source.current_scene_id ?? source.CurrentSceneID ?? source.currentSceneId ?? null;
        };

        const progressSceneId = resolveSceneId(progressSource);
        if (progressSceneId) {
          setNextSceneId(String(progressSceneId));
        }

        let chaptersCountFromApi = 0;
        try {
          const chaptersResponse = await fetch(`${API_BASE_URL}/novels/${id}/chapters`);
          if (chaptersResponse.ok) {
            const chaptersPayload = await chaptersResponse.json();
            const chaptersList = chaptersPayload?.data?.chapters || chaptersPayload?.chapters || [];

            if (isPreview) {
              chaptersCountFromApi = Array.isArray(chaptersList) ? chaptersList.length : 0;
            } else {
              const publishedChapters = chaptersList.filter((chapter) => {
                if (typeof chapter.is_published === "boolean") {
                  return chapter.is_published === true;
                }
                const status = chapter.status ?? chapter.Status ?? "";
                return String(status).toLowerCase() === "published";
              });
              chaptersCountFromApi = publishedChapters.length;
            }
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
        const isBookmarked = userId > 0 ? await fetchBookmarkedStatus(id, userId, headers) : false;

        let currentChapterProgress = progressSource.current_chapter ?? progressSource.currentChapter ?? 0;
        const totalChaptersProgress = chaptersCountFromApi > 0
          ? chaptersCountFromApi
          : (progressSource.total_chapters ?? progressSource.totalChapters ?? 0);
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

        const calculatedPercentage = totalChaptersProgress > 0
          ? Math.round((currentChapterProgress / totalChaptersProgress) * 100)
          : 0;

        const authorDisplayName = nData.pen_name || nData.penName || nData.author_pen_name || nData.author_penName || nData.author_name || nData.authorName || nData.name_lastname || nData.name || "ไม่ทราบผู้แต่ง";

        // "synopsis" เป็นข้อความสั้นที่ render เป็น plain text ตรงๆ (ไม่ผ่าน dangerouslySetInnerHTML)
        // ถ้าไม่มี captions จะ fallback ไปที่ introduction ซึ่งเป็น HTML (ดู synopsis_detail ด้านล่าง
        // ที่ต้องใช้ dangerouslySetInnerHTML) — ถ้าไม่ strip ก่อน จะเห็น tag <p> โผล่มาเป็นตัวหนังสือจริงๆ
        // และถ้าใช้ introduction เต็มๆ ก็จะซ้ำกับเนื้อหาที่โชว์เต็มอยู่แล้วในส่วน "แนะนำเรื่อง" ด้านล่าง
        // จึงตัดให้สั้นลงเมื่อต้อง fallback
        const shortSynopsis = nData.captions
          ? stripHtml(nData.captions)
          : (() => {
            const plain = stripHtml(nData.introduction || "");
            return plain.length > 150 ? `${plain.slice(0, 150)}…` : plain;
          })();

        setNovel({
          id: nData.novel_id || nData.id || id,
          title: nData.title || "ไม่พบชื่อเรื่อง",
          status: nData.status || "draft",
          // เรื่องจบแล้วหรือยัง — ใช้เกณฑ์เดียวกับหน้าโปรไฟล์นักเขียน (status "completed" หรือ is_completed)
          isCompleted: nData.status === "completed" || nData.is_completed === true,
          categories: Array.isArray(nData.categories)
            ? Array.from(new Set(
              nData.categories
                .map(cat => typeof cat === "object" ? cat.name : cat)
                .filter(Boolean)
            ))
            : ["ทั่วไป"],
          coverImage: formatMinioUrl(nData.cover_image) || null,
          author: {
            displayName: authorDisplayName,
            penName: nData.pen_name || nData.penName || nData.author_pen_name || nData.author_penName || null,
            avatarUrl: formatMinioUrl(nData.author_avatar) || null,
            writer_id: nData.author_writer_id || nData.author_writerId || nData.author_id || null,
            user_id: nData.user_id || null,
            id: nData.author_writer_id || nData.author_writerId || nData.author_id || null,
          },
          synopsis: shortSynopsis || "ไม่มีเรื่องย่อ",

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
        fetchNovelComments();
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchNovel();
  }, [id]);

  // ใช้ร่วมกันระหว่างเคส admin กับเคส non-admin ที่ไม่มี nextSceneId บันทึกไว้
  // (เดิมสองเคสนี้ fetch story-tree แล้วดึง first_scene_id ด้วยโค้ดชุดเดียวกันซ้ำสองรอบ)
  const fetchFirstSceneAndNavigate = async (previewSuffix) => {
    try {
      const userId = getCurrentUserId();
      const headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const previewQuery = isPreview ? "&preview=true" : "";
      const treeResponse = await fetch(`${API_BASE_URL}/novels/${id}/story-tree?user_id=${userId}${previewQuery}`, { headers });

      const treePayload = await treeResponse.json().catch(() => null);
      const treeData = treePayload?.data || treePayload || {};

      const firstScene = treeData.first_scene_id ?? treeData.current_scene_id ?? treeData.CurrentSceneID ?? treeData.currentSceneId ?? null;

      if (firstScene) {
        navigate(`/reading/${novel.id}/${firstScene}${previewSuffix}`);
      } else {
        navigate(`/reading/${novel.id}${previewSuffix}`);
      }
    } catch (err) {
      console.warn("Failed to fetch initial scene", err);
      navigate(`/reading/${novel.id}${previewSuffix}`);
    }
  };

  const handleRead = async () => {
    const hasNoContent = novel.userProgress?.totalChapters === 0;

    if (hasNoContent) {
      setShowNoContentDialog(true);
      return;
    }

    if (!novel.id) return;
    const previewSuffix = isPreview ? "?preview=true" : "";

    // For admins, always start from the first scene and ignore any saved progress
    if (isAdmin) {
      await fetchFirstSceneAndNavigate(previewSuffix);
      return;
    }

    // Non-admin behavior: use saved nextSceneId if available
    if (nextSceneId) {
      navigate(`/reading/${novel.id}/${nextSceneId}${previewSuffix}`);
      return;
    }

    await fetchFirstSceneAndNavigate(previewSuffix);
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
        stats: {
          ...prev.stats,
          bookshelfCount: Math.max(0, prev.stats.bookshelfCount + (isBookmarked ? 1 : -1)),
        },
      }));
    } catch (err) {
      console.error("Failed to update bookshelf status:", err);
      setNovel((prev) => ({ ...prev, isBookmarked: !isBookmarked }));
    } finally {
      setBookmarkProcessing(false);
    }
  };

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

  const currentUserId = getCurrentUserId();
  const isLoggedIn = currentUserId > 0;
  const isAdmin = isLoggedIn && isCurrentUserAdmin();

  // นักเขียนเจ้าของนิยายไม่ควรเห็นปุ่ม "ติดตาม" สำหรับตัวเอง
  // เทียบกับทุก id ที่เป็นไปได้ของผู้แต่ง เผื่อ backend ส่งมาคนละ field กัน
  const isOwnNovel =
    isLoggedIn &&
    [novel.author?.user_id, novel.author?.writer_id, novel.author?.id]
      .filter(Boolean)
      .some((authorId) => String(authorId) === String(currentUserId));

  // id ของผู้แต่งไว้ใช้ลิงก์ไปหน้าโปรไฟล์นักเขียน + ส่งให้ FollowButton
  // (เดิมคำนวณ fallback chain เดียวกันนี้ซ้ำ 4 รอบในหลายจุด)
  const authorId = novel.author?.writer_id || novel.author?.id || novel.author?.user_id || null;
  const handleAuthorClick = () => {
    if (authorId) navigate(`/writer/profile/${authorId}`);
  };

  if (loading) {
    return (
      <div className="novel-detail">
        <div className="novel-detail__container">
          <div className="novel-detail__state-card">
            <div className="novel-detail__state-spinner" aria-hidden="true" />
            <p className="novel-detail__state-text">กำลังโหลดข้อมูลนิยาย...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="novel-detail">
        <div className="novel-detail__container">
          <div className="novel-detail__state-card novel-detail__state-card--error">
            <div className="novel-detail__state-icon" aria-hidden="true">⚠️</div>
            <p className="novel-detail__state-text">เกิดข้อผิดพลาด: {error}</p>
            <button className="novel-detail__banned-btn" onClick={() => navigate("/")}>
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🟢 หากนิยายถูกระงับ (banned) ให้แสดงหน้าแจ้งเตือนและซ่อนเนื้อหา
  // ยกเว้นแอดมิน ซึ่งต้องเห็นเนื้อหาเต็มเพื่อตรวจสอบ/จัดการรายงานที่เกี่ยวข้อง
  if (novel.status === "banned" && !isAdmin) {
    return (
      <div className="novel-detail">
        <div className="novel-detail__container novel-detail__banned-screen">
          <div className="novel-detail__banned-icon" aria-hidden="true">⚠️</div>
          <h2 className="novel-detail__banned-title">
            นิยายเรื่องนี้ถูกระงับการเผยแพร่ชั่วคราว
          </h2>
          <p className="novel-detail__banned-text">
            เนื้อหานี้อยู่ระหว่างการตรวจสอบโดยผู้ดูแลระบบ เนื่องจากได้รับการรายงานว่าอาจขัดต่อเงื่อนไขการใช้งาน
          </p>
          <button className="novel-detail__banned-btn" onClick={() => navigate("/")}>
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="novel-detail">
      {isPreview && (
        <div className="novel-detail__preview-banner">
          <span className="novel-detail__preview-banner-label">
            👁️ คุณกำลังอยู่ในโหมดทดลองอ่าน
          </span>
          <button
            type="button"
            className="novel-detail__preview-banner-btn"
            onClick={() => window.close()}
          >
            ออกจากโหมดทดลองอ่าน
          </button>
        </div>
      )}

      {isAdmin && novel.status === "banned" && (
        <div className="novel-detail__admin-banned-banner">
          <span>
            ⚠️ นิยายเรื่องนี้ถูกระงับการเผยแพร่อยู่ ผู้อ่านทั่วไปจะมองไม่เห็นหน้านี้ — คุณเห็นเพราะเข้าสู่ระบบในฐานะแอดมิน
          </span>
        </div>
      )}

      {isAdmin && <AdminModeBanner page="หน้ารายละเอียดนิยาย" />}

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
            <div className="novel-detail__header-card">
            {novel.categories.length > 0 && (
              <div className="novel-detail__tags" role="list" aria-label="หมวดหมู่">
                {novel.categories.map((cat) => (
                  <div role="listitem" key={cat}>
                    <GenreTag label={cat} colorByCategory />
                  </div>
                ))}
              </div>
            )}

            <h1 className="novel-detail__title">{novel.title}</h1>

            <div className="novel-detail__author" aria-label={`ผู้แต่ง: ${novel.author.displayName}`}>
              <div
                className="novel-detail__author-avatar"
                aria-hidden="true"
                style={{ cursor: authorId ? "pointer" : "default" }}
                onClick={handleAuthorClick}
              >
                {novel.author.avatarUrl ? (
                  <img src={novel.author.avatarUrl} alt={novel.author.displayName} />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <span
                className="novel-detail__author-name"
                style={{ cursor: authorId ? "pointer" : "default" }}
                onClick={handleAuthorClick}
              >
                {novel.author.displayName}
              </span>

              {!isPreview && !isAdmin && !isOwnNovel && authorId ? (
                <FollowButton
                  writerId={authorId}
                  writerName={novel.author.displayName}
                  isFollowing={isFollowingAuthor}
                  onFollowChange={setIsFollowingAuthor}
                  size="small"
                />
              ) : null}
            </div>

            <p className="novel-detail__synopsis">{novel.synopsis}</p>
            </div>

            <div className="novel-detail__action-group">
              <ActionButtons
                isBookmarked={novel.isBookmarked}
                isLiked={novel.isLiked}
                readLabel={(nextSceneId || novel.userProgress.discoveredChoices > 0) ? "อ่านต่อ" : "อ่านเลย"}
                readAriaLabel={(nextSceneId || novel.userProgress.discoveredChoices > 0) ? "อ่านต่อ" : "อ่านเลย"}
                onRead={handleRead}
                onBookmark={isPreview || isAdmin ? undefined : handleBookmark}
                onLike={isPreview || isAdmin ? undefined : handleLike}
                showBookmark={!isPreview && !isAdmin}
                showLike={!isPreview && !isAdmin}
              />
              {!isPreview && isLoggedIn && !isAdmin && (
                <button
                  className="novel-detail__restart-button"
                  type="button"
                  onClick={handleRestartConfirmOpen}
                  title="รีเซ็ตเส้นทางและความคืบหน้าการอ่านเพื่อเริ่มอ่านใหม่"
                >
                  ⭮ เริ่มอ่านใหม่
                </button>
              )}
            </div>

            {/* 🟢 แอดมินไม่มี "ความคืบหน้าการอ่าน" ส่วนตัว จึงสลับไปแสดงแผงจัดการแทน
                ผู้อ่านที่ล็อกอินแล้วเห็นแถบความคืบหน้าตามเดิม
                ผู้เยี่ยมชมที่ยังไม่ล็อกอินเห็นการ์ดชวนเข้าสู่ระบบ แทนที่จะเป็นพื้นที่ว่างเปล่า */}
            {isAdmin ? (
              <div className="novel-detail__progress">
                <NovelProgressBar
                  novelId={novel.id}
                  autoFetch={true}
                  isPreview={false}
                  isAdmin={true}
                  onStoryMapClick={handleStoryMap}
                  onEndingCollectionClick={handleEndingCollection}
                  onContinueRead={handleRead}
                  onSceneClick={(sceneId) => navigate(`/reading/${novel.id}/${sceneId}`)}
                />
              </div>
            ) : !isPreview && isLoggedIn ? (
              <div className="novel-detail__progress">
                <NovelProgressBar
                  novelId={novel.id}
                  autoFetch={true}
                  isPreview={isPreview}
                  onStoryMapClick={handleStoryMap}
                  onEndingCollectionClick={handleEndingCollection}
                  onContinueRead={handleRead}
                  onSceneClick={(sceneId) => navigate(`/reading/${novel.id}/${sceneId}`)}
                />
              </div>
            ) : (
              !isPreview && (
                <div className="novel-detail__guest-cta">
                  <div className="novel-detail__guest-cta-icon" aria-hidden="true">🔖</div>
                  <div className="novel-detail__guest-cta-body">
                    <p className="novel-detail__guest-cta-title">เข้าสู่ระบบเพื่อไม่พลาดทุกความคืบหน้า</p>
                    <p className="novel-detail__guest-cta-text">
                      บันทึกจุดที่อ่านถึง กดถูกใจ และบุ๊กมาร์กนิยายเรื่องนี้ไว้อ่านต่อภายหลัง
                    </p>
                  </div>
                  <button
                    type="button"
                    className="novel-detail__guest-cta-btn"
                    onClick={() => navigate("/login-register")}
                  >
                    เข้าสู่ระบบ
                  </button>
                </div>
              )
            )}

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

        {!isPreview && (
          <Comments
            comments={comments}
            currentUserId={getCurrentUserId()}
            commentText={commentText}
            onCommentTextChange={(e) => setCommentText(e.target.value)}
            onSubmit={(text) => handleSendComment(text)}
            readOnly={isAdmin}
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
        )}

        <EndingCollection
          isOpen={showEndingModal && isLoggedIn}
          endings={endings}
          onClose={() => setShowEndingModal(false)}
          onViewStoryMap={(sceneId) => handleStoryMap(sceneId)}
        />

        {showNoContentDialog && (
          <SimpleModal onClose={() => setShowNoContentDialog(false)} maxWidth={400}>
            <div className="novel-detail__modal-emoji">✍️✨</div>
            <h3 className="novel-detail__modal-title">นักเขียนกำลังรังสรรค์เนื้อหา</h3>
            <p className="novel-detail__modal-text">
              นิยายเรื่องนี้ยังไม่มีเนื้อหาให้อ่าน <br />
              รอนักเขียนปล่อยฉากใหม่เร็วๆ นี้นะ
            </p>
            <button
              className="novel-detail__modal-primary-btn"
              onClick={() => setShowNoContentDialog(false)}
            >
              รับทราบ ยินดีรอคอย
            </button>
          </SimpleModal>
        )}

        {showRestartConfirm && isLoggedIn && (
          <SimpleModal onClose={handleRestartConfirmClose} maxWidth={420}>
            <h3 className="novel-detail__modal-title novel-detail__modal-title--left">เริ่มอ่านใหม่</h3>
            <p className="novel-detail__modal-text novel-detail__modal-text--left">
              การเริ่มอ่านใหม่นี้จะคืนสถานะความคืบหน้าและผังเรื่องกลับไปยังจุดเริ่มต้น แต่จะยังเก็บตอนจบที่คุณค้นพบไว้
            </p>
            {restartError && (
              <div className="novel-detail__modal-error">{restartError}</div>
            )}
            <div className="novel-detail__modal-actions">
              <button
                type="button"
                className="novel-detail__modal-secondary-btn"
                onClick={handleRestartConfirmClose}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="novel-detail__modal-primary-btn"
                onClick={handleRestart}
                disabled={restartLoading}
              >
                {restartLoading ? "กำลังเริ่มใหม่..." : "ยืนยันเริ่มอ่านใหม่"}
              </button>
            </div>
          </SimpleModal>
        )}

      </div>

      {!isPreview && isLoggedIn && !isAdmin && (
        <ReaderReportButton
          novelId={novel.id}
          novelTitle={novel.title}
          userId={currentUserId}
        />
      )}
    </div>
  );
};

export default NovelDetailPage;