import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; 
import "./ReadingPage.css";
import "react-quill-new/dist/quill.snow.css"; // 🟢 จุดที่ 1: นำเข้าดีไซน์การจัดหน้าของ Quill
import ReadingBreadcrumb from "../../../components/ReadingBreadcrumb/ReadingBreadcrumb";
import ChoiceButtons from "../../../components/ChoiceButtons/ChoiceButtons";
import RestartReadingButton from "../../../components/RestartReadingButton/RestartReadingButton";
import ReadingSettings from "../../../components/ReadingSettings/ReadingSettings";
import ActionButtons from "../../../components/ActionButtons/ActionButtons";
import Comments from "../../../components/Comments/Comments";
import EndingUnlockedModal from "../../../components/EndingUnlockedModal/EndingUnlockedModal";

const BASE_URL = "http://localhost:8080"; 

const ReadingPage = ({
  userId = 0,
  novelTitle = "กำลังโหลดชื่อเรื่อง...",
  initialSceneId = null, 
}) => {

  const { novelId, sceneId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isPreviewMode = searchParams.get("preview") === "true";
  const previewQueryString = isPreviewMode ? `?${searchParams.toString()}` : "";

  const getCurrentUserId = () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return 0;
    try {
      const user = JSON.parse(userJson);
      return user?.id || user?.user_id || 0;
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
      return 0;
    }
  };

  const effectiveUserId = getCurrentUserId() || userId;

  const [currentView, setCurrentView] = useState("reading");
  const [currentSceneId, setCurrentSceneId] = useState(initialSceneId || sceneId || null);
  const [sceneData, setSceneData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkProcessing, setBookmarkProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [commentText, setCommentText] = useState("");
  const [sceneComments, setSceneComments] = useState({});
  const comments = sceneComments[currentSceneId] || [];

  // State สำหรับ Pop-up ยินดีด้วย ค้นพบฉากจบใหม่
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [allNovelEndings, setAllNovelEndings] = useState([]);

  const fetchSceneComments = async (sceneId) => {
    if (!sceneId) return;

    try {
      const response = await fetch(`${BASE_URL}/scenes/${sceneId}/comments`);
      if (!response.ok) {
        throw new Error(`failed to load comments (${response.status})`);
      }
      const payload = await response.json().catch(() => null);
      const fetchedComments =
        Array.isArray(payload?.data?.comments) ? payload.data.comments :
        Array.isArray(payload?.comments) ? payload.comments :
        [];
      setSceneComments((prev) => ({
        ...prev,
        [sceneId]: fetchedComments,
      }));
    } catch (err) {
      console.warn("Failed to load scene comments:", err);
    }
  };

  const getSavedReadingSettings = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("readingSettings"));
      return {
        fontFamily: stored?.fontFamily || "Sarabun",
        fontSize: stored?.fontSize || 18,
        theme: stored?.theme || "light",
      };
    } catch (err) {
      return {
        fontFamily: "Sarabun",
        fontSize: 18,
        theme: "light",
      };
    }
  };

  const savedReadingSettings = getSavedReadingSettings();
  const [fontFamily, setFontFamily] = useState(savedReadingSettings.fontFamily);
  const [fontSize, setFontSize] = useState(savedReadingSettings.fontSize);
  const [theme, setTheme] = useState(savedReadingSettings.theme);
  const contentRef = useRef(null);

  const getFontFamilyString = (value) => {
    switch (value) {
      case "Sarabun":
        return "'Sarabun', sans-serif";
      case "Open Sans":
        return "'Open Sans', sans-serif";
      case "Prompt":
        return "'Prompt', sans-serif";
      case "Kanit":
        return "'Kanit', sans-serif";
      default:
        return "'Sarabun', sans-serif";
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
  };

  const fetchBookmarkedStatus = async (currentNovelId, userId, headers) => {
    if (!currentNovelId || !userId) return false;

    try {
      const response = await fetch(`${BASE_URL}/bookshelves?user_id=${userId}`, { headers });
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
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const loadBookmarkStatus = async () => {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      if (!novelId || !effectiveUserId) {
        setIsBookmarked(false);
        return;
      }

      const bookmarked = await fetchBookmarkedStatus(novelId, effectiveUserId, headers);
      setIsBookmarked(bookmarked);
    };

    loadBookmarkStatus();
  }, [novelId, effectiveUserId]);

  const updateReadingProgress = async (nId, sId, sceneType) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      if (!effectiveUserId) {
        console.warn("No logged-in user found, skipping progress save.");
      } else {
        const progressRes = await fetch(`${BASE_URL}/progress`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_id: parseInt(effectiveUserId),
            novel_id: parseInt(nId),
            current_scene_id: parseInt(sId)
          })
        });

        if (!progressRes.ok) {
          const errText = await progressRes.text();
          console.error("Progress save failed:", progressRes.status, errText);
        }

        if ((sceneType === "ending" || sceneType === "Ending") && effectiveUserId) {
          const endingRes = await fetch(`${BASE_URL}/user-endings`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              user_id: parseInt(effectiveUserId),
              novel_id: parseInt(nId),
              scene_id: parseInt(sId)
            })
          });

          if (!endingRes.ok) {
            const errText = await endingRes.text();
            console.error("Ending record failed:", endingRes.status, errText);
          }

          // ดึงรายการฉากจบทั้งหมดของนิยายเรื่องนี้เพื่อนำมาแสดงใน Pop-up Modal
          try {
            const allEndingsRes = await fetch(`${BASE_URL}/novels/${nId}/endings?user_id=${effectiveUserId}`, { headers });
            if (allEndingsRes.ok) {
              const endingsPayload = await allEndingsRes.json();
              const fetchedEndings =
                Array.isArray(endingsPayload?.data?.endings) ? endingsPayload.data.endings :
                Array.isArray(endingsPayload?.endings) ? endingsPayload.endings :
                Array.isArray(endingsPayload?.data) ? endingsPayload.data : [];
              setAllNovelEndings(fetchedEndings);
            }
          } catch (e) {
            console.warn("Failed to fetch all novel endings:", e);
          }
        }
      }
    } catch (err) {
      console.error("❌ ไม่สามารถอัปเดตความคืบหน้าการอ่านได้:", err);
    }
  };

useEffect(() => {
    if (!novelId || novelId === "undefined") {
      console.error("❌ บั๊กหน้าจอ: ReadingPage ไม่ได้รับรหัสนิยาย");
      setError("ไม่พบรหัสนิยาย กรุณาตรวจสอบการส่งค่ามาจากหน้าก่อนหน้า");
      setLoading(false);
      return;
    }

    // 🎯 ดึงไอดีที่ส่งมาจาก URL หรือประวัติโดยตรง ณ วินาทีนั้น ไม่พึ่งพา State ภายในเพื่อป้องกันการหน่วง
    const activeSceneId = sceneId || initialSceneId || currentSceneId;

    const fetchScene = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = "";
        const query = effectiveUserId > 0 ? `?user_id=${effectiveUserId}` : "";
        
        if (!activeSceneId || activeSceneId === "undefined" || activeSceneId === "0") {
          url = `${BASE_URL}/novels/${novelId}/start${query}`;
        } else {
          url = `${BASE_URL}/scenes/${activeSceneId}${query}`;
        }

        const response = await fetch(url);
        
        if (response.status === 404) {
          setError("EMPTY_SCENE"); 
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดเนื้อหาฉากจากระบบหลังบ้านได้");
        }

        const resData = await response.json();

        if (resData && resData.data) {
          const loadedNovelId = resData.data.novel_id || resData.data.novelId;
          
          if (loadedNovelId && String(loadedNovelId) !== String(novelId)) {
            console.error("Safety Net Triggered: ฉากที่โหลดมาไม่ตรงกับนิยายที่กำลังอ่าน");
            setError("EMPTY_SCENE"); 
            setLoading(false);
            return;
          }

          // 1. ตั้งค่าข้อมูลฉาก
          setSceneData(resData.data);
          const loadedSceneId = resData.data.scene_id || resData.data.id;
          
          // 2. ซิงค์อัปเดต State ภายในให้ตรงกันครั้งเดียว
          setCurrentSceneId(loadedSceneId);
          
          // 3. เรียกดึงคอมเมนต์ของฉากนั้นทันทีหลังจากได้ข้อมูลมา
          fetchSceneComments(loadedSceneId);
          
          // 4. บันทึกความคืบหน้าการอ่านลงดาต้าเบส (จะเกิดขึ้นครั้งเดียวเมื่อฉากเปลี่ยนจริงเท่านั้น)
          updateReadingProgress(novelId, loadedSceneId, resData.data.type);

        } else {
          setError("EMPTY_SCENE");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScene();
    window.scrollTo({ top: 0, behavior: "smooth" });
    
  // 🎯 เฝ้าดูเฉพาะ novelId และ sceneId ที่มาจาก URL เท่านั้น เมื่อเปลี่ยนปุ๊บเคลียร์ฉากใหม่ปั๊บ
  }, [novelId, sceneId, initialSceneId]);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      if (total > 0) {
        const pct = Math.round((scrolled / total) * 100);
        setReadProgress(pct);

        // 🎯 หากอยู่ในฉากจบ และสกรอลล์อ่านลงมาถึงก้นหน้า (92% ขึ้นไป) -> เด้ง Pop-up ค้นพบฉากจบใหม่
        if (sceneData && (sceneData.type === "ending" || sceneData.type === "Ending") && pct >= 90) {
          setShowEndingModal(true);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sceneData]);

  const handleChoose = async (choice) => {
    setSelectedChoiceId(choice.choice_id);
    setIsTransitioning(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      if (!effectiveUserId) {
        console.warn("No logged-in user found, skipping choice history save.");
      } else {
        await fetch(`${BASE_URL}/choice-history`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_id: parseInt(effectiveUserId),
            choice_id: parseInt(choice.choice_id)
          })
        });
      }
    } catch (err) {
      console.error("บันทึกประวัติการเลือกทางเลือกผิดพลาด:", err);
    }

    setTimeout(() => {
      const nextSearchParams = new URLSearchParams(location.search);
      if (isPreviewMode) {
        nextSearchParams.set("preview", "true");
      } else {
        nextSearchParams.delete("preview");
      }
      const nextQuery = nextSearchParams.toString();
      navigate(`/reading/${novelId}/${choice.to_scene_id}${nextQuery ? `?${nextQuery}` : ""}`);
      setCurrentSceneId(choice.to_scene_id);
      setIsTransitioning(false);
      setSelectedChoiceId(null);
    }, 350);
  };

  const handleLocalNavigate = (targetView) => {
    if (targetView === "story-tree") {
      navigate(`/storytree/${novelId}`); 
    } else if (targetView === "novel-detail") {
      navigate(`/novel/${novelId}`);
    }
  };

  const saveReadingSettings = (newSettings) => {
    const payload = {
      fontFamily,
      fontSize,
      theme,
      ...newSettings,
    };
    localStorage.setItem("readingSettings", JSON.stringify(payload));
  };

  const handleFontFamilyChange = (value) => {
    setFontFamily(value);
    saveReadingSettings({ fontFamily: value });
  };

  const handleDecreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.max(14, prev - 2);
      saveReadingSettings({ fontSize: next });
      return next;
    });
  };

  const handleIncreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.min(26, prev + 2);
      saveReadingSettings({ fontSize: next });
      return next;
    });
  };

  const handleThemeChange = (value) => {
    setTheme(value);
    saveReadingSettings({ theme: value });
  };

  const handleRestartReading = async () => {
    if (effectiveUserId) {
      try {
        const token = localStorage.getItem("token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${BASE_URL}/progress?user_id=${effectiveUserId}&novel_id=${novelId}`, {
          method: "DELETE",
          headers,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Reset progress failed:", response.status, errText);
          return;
        }
      } catch (err) {
        console.error("Error resetting progress:", err);
        return;
      }
    }

    setCurrentSceneId(null);
    navigate(`/reading/${novelId}${previewQueryString}`);
  };

  const parsePositiveInt = (value) => {
    const numeric = Number(value);
    return Number.isNaN(numeric) || numeric <= 0 ? null : numeric;
  };

  const getCommentSceneId = () => {
    const maybeSceneId = currentSceneId || sceneData?.scene_id || sceneData?.id;
    if (maybeSceneId == null) return null;

    return parsePositiveInt(maybeSceneId);
  };

  const handleCommentSubmit = async (text) => {
    const trimmed = (text || "").trim();
    const numericNovelId = parsePositiveInt(novelId);
    if (!trimmed || !numericNovelId) {
      if (!trimmed) return;
      showToast("ไม่สามารถโพสต์คอมเมนต์ได้ เนื่องจากรหัสนิยายไม่ถูกต้อง");
      return;
    }

    const sceneIdNumber = getCommentSceneId();
    if (!sceneIdNumber) {
      showToast("ไม่สามารถโพสต์คอมเมนต์ได้ เนื่องจากไม่พบฉากที่กำลังอ่าน");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login-register");
      return;
    }

    try {
      const bodyPayload = {
        novel_id: parseInt(novelId, 10),
        scene_id: sceneIdNumber,
        content: trimmed,
      };

      const response = await fetch(`${BASE_URL}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
      }

      await fetchSceneComments(sceneIdNumber);
      setCommentText("");
      showToast("ส่งความคิดเห็นแล้ว");
    } catch (err) {
      console.error("Failed to post comment:", err);
      showToast("ไม่สามารถส่งความคิดเห็นได้ในขณะนี้");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login-register");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/comments?comment_id=${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
      }

      await fetchSceneComments(currentSceneId);
      showToast("ลบความคิดเห็นเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Failed to delete comment:", err);
      showToast("ไม่สามารถลบความคิดเห็นได้");
    }
  };

  if (loading) {
    return (
      <div className="rp__loading" aria-live="polite">
        <div className="rp__loading-spinner" aria-label="กำลังโหลด" />
        <p>กำลังดึงเนื้อหาฉากจริงจากระบบฐานข้อมูล...</p>
      </div>
    );
  }

  if (error) {
    if (error === "EMPTY_SCENE") {
      return (
        <div style={{ padding: "50px 20px", textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚧</div>
          <h2 style={{ fontSize: "26px", color: "#334155", marginBottom: "12px", fontFamily: "'Sarabun', sans-serif", fontWeight: "bold" }}>
            ยังไม่มีเนื้อหาในนิยายเรื่องนี้
          </h2>
          <p style={{ color: "#64748b", marginBottom: "32px", fontSize: "16px", maxWidth: "400px", lineHeight: "1.6" }}>
            นักเขียนกำลังเรียบเรียงและยังไม่ได้เผยแพร่ฉากแรก โปรดรอติดตามและกลับมาดูใหม่ในภายหลัง
          </p>
          <button
            onClick={() => handleLocalNavigate("novel-detail")}
            style={{ 
              padding: "12px 28px", 
              background: "var(--pink-500)", 
              color: "#fff", 
              border: "none", 
              borderRadius: "8px", 
              fontSize: "16px", 
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(233, 30, 140, 0.2)" 
            }}
          >
            กลับหน้ารายละเอียดนิยาย
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: "50px", textAlign: "center", color: "red", background: "#fff5f5", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <h3 style={{ fontSize: "1.5rem", marginBottom: "10px" }}>เกิดข้อผิดพลาดในการโหลดเนื้อหา</h3>
        <p style={{ color: "#555", marginBottom: "20px" }}>{error}</p>
        <button
          onClick={() => handleLocalNavigate("novel-detail")}
          style={{ padding: "8px 20px", cursor: "pointer", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px" }}
        >
          กลับไปหน้ารายละเอียดนิยาย
        </button>
      </div>
    );
  }

  const {
    content,
    choices,
    type,
    novel_title,
    chapter_title,
    scene_title,
    title,
    chapter_order,
    order,
    chapter_episode,
    chapterEpisode,
    novelTitle: sceneNovelTitle,
    chapterTitle: sceneChapterTitle,
  } = sceneData || {};

  const sceneTitle = scene_title || sceneData?.sceneTitle || title || sceneData?.Title || "";
  const chapterTitleUsed = chapter_title || sceneChapterTitle || sceneData?.chapter_title || sceneData?.ChapterTitle || "";
  const novelTitleUsed = novel_title || sceneNovelTitle || sceneData?.novelTitle || sceneData?.NovelTitle || novelTitle;
  const currentOrder = chapter_order || order || chapter_episode || chapterEpisode || sceneData?.chapterOrder || sceneData?.chapter_order || null;

  const getSceneTagDetails = (sceneType) => {
    switch (sceneType) {
      case "start":
        return { text: "🎬 จุดเริ่มต้นเนื้อเรื่อง", bg: "#e3f2fd", color: "#0d47a1" };
      case "normal":
        return { text: "📖 เนื้อเรื่องหลัก", bg: "#f1f8e9", color: "#33691e" };
      case "ending":
        return { text: "🏆 ฉากจบ", bg: "#fff8e1", color: "#ff6f00" };
      default:
        return { text: "🌿 เส้นทางดำเนินเรื่อง", bg: "#f5f5f5", color: "#616161" };
    }
  };

  const tag = getSceneTagDetails(type);

  return (
    <div className={`rp rp--theme-${theme}`}>
      <div className="rp__progress-bar" style={{ width: `${readProgress}%` }} role="progressbar" />

      {isPreviewMode && (
        <div style={{
          width: "100%",
          background: "#eff6ff",
          borderBottom: "1px solid #bfdbfe",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          color: "#1e40af"
        }}>
          <span style={{ fontWeight: 700 }}>คุณกำลังอยู่ในโหมดทดลองอ่าน</span>
          <button
            type="button"
            onClick={() => window.close()}
            style={{
              background: "#1d4ed8",
              color: "#ffffff",
              border: "none",
              borderRadius: "999px",
              padding: "8px 14px",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            Exit Preview
          </button>
        </div>
      )}

      <div className="rp__container">
        <ReadingBreadcrumb
            novelTitle={novelTitleUsed}
            chapterTitle={chapterTitleUsed || (type === "start" ? "บทนำ" : "ตอนอ่านต่อ")}
            onBack={() => handleLocalNavigate("novel-detail")}
            onStoryMap={() => handleLocalNavigate("story-tree")}
          />

          <article className={`rp__article ${isTransitioning ? "rp__article--out" : "rp__article--in"}`} ref={contentRef}>

            <ReadingSettings
              fontFamily={fontFamily}
              onFontFamilyChange={handleFontFamilyChange}
              fontSize={fontSize}
              onDecreaseFont={handleDecreaseFont}
              onIncreaseFont={handleIncreaseFont}
              theme={theme}
              onThemeChange={handleThemeChange}
            />

            <div className="rp__header-group" style={{ textAlign: "center", marginBottom: "25px" }}>
              <div className="rp__novel-subtitle" style={{ fontSize: "1.1rem", color: "#666", marginBottom: "6px" }}>
                เรื่อง : {novelTitleUsed}
              </div>

              <h1 className="rp__title" style={{ fontSize: "2.2rem", fontWeight: "bold", margin: "10px 0", color: "#111" }}>
                {sceneTitle || (type === "start" ? "จุดเริ่มต้นการเดินทาง" : "ดำเนินเรื่องย่อย")}
              </h1>

              <div className="rp__scene-meta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "1.05rem", color: "#555", marginTop: "15px", flexWrap: "wrap" }}>
                <span style={{ color: "#4a5568", fontWeight: "600" }}>
                  📂 {currentOrder ? `ตอนที่ ${currentOrder} : ` : "ตอน : "}
                  {chapterTitleUsed || (type === "start" ? "บทนำ" : "บททั่วไป")}
                </span>
                <span style={{ color: "#ccc" }}>|</span>
                <span style={{ 
                  backgroundColor: tag.bg, 
                  color: tag.color, 
                  padding: "3px 12px", 
                  borderRadius: "12px", 
                  fontSize: "0.85rem", 
                  fontWeight: "bold",
                  letterSpacing: "0.5px"
                }}>
                  {tag.text}
                </span>
              </div>
            </div>
          <div className="rp__ornament" aria-hidden="true">
            <span className="rp__orn-line" />
            <span className="rp__orn-dot">✦</span>
            <span className="rp__orn-dot">✦</span>
            <span className="rp__orn-dot">✦</span>
            <span className="rp__orn-line" />
          </div>

          <div className="ql-snow">
            <div
              className={`rp__body rp__body--${theme} ql-editor`}
              aria-label="เนื้อหา"
              style={{ fontFamily: getFontFamilyString(fontFamily), fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>

          {choices && choices.length > 0 && (
            <ChoiceButtons
              prompt="คุณจะเลือกเส้นทางดำเนินเรื่องอย่างไรต่อไป?"
              choices={choices.map(c => ({
                id: c.choice_id,
                text: c.label || c.text,
                choice_id: c.choice_id,
                to_scene_id: c.to_scene_id
              }))}
              onChoose={handleChoose}
              selectedChoiceId={selectedChoiceId}
            />
          )}

          {(!choices || choices.length === 0) && (
            <div className="rp__ending-card">
              <div className="rp__ending-trophy-wrapper">
                <span className="rp__ending-sparkle rp__ending-sparkle--left">✨</span>
                <div className="rp__ending-trophy-icon">🏆</div>
                <span className="rp__ending-sparkle rp__ending-sparkle--right">🎉</span>
              </div>

              <h2 className="rp__ending-title">🎉 ยินดีด้วย! คุณอ่านมาถึงฉากจบแล้ว!</h2>
              <p className="rp__ending-subtitle">
                คุณร่วมเดินทางผ่านตัวเลือกมาจนถึงจุดสิ้นสุดของเส้นทางนี้แล้ว <br />
                มาร่วมสำรวจเส้นทางอื่นในผังเรื่อง หรือเริ่มอ่านใหม่เพื่อปลดล็อกฉากจบแบบอื่นๆ กัน!
              </p>

              <div className="rp__ending-actions">
                <button className="rp__ending-btn rp__ending-btn--primary" onClick={() => setShowEndingModal(true)}>
                  ✨ คลังฉากจบของคุณ
                </button>
                <button className="rp__ending-btn rp__ending-btn--secondary" onClick={() => handleLocalNavigate("story-tree") }>
                  ดูแผนผังการอ่าน
                </button>
                <RestartReadingButton onRestart={handleRestartReading} />
                <button className="rp__ending-btn rp__ending-btn--ghost" onClick={() => handleLocalNavigate("novel-detail") }>
                  ⭠ กลับหน้ารายละเอียด
                </button>
              </div>
            </div>
          )}

          <div className="mt-8">
            <Comments
              comments={comments}
              currentUserId={effectiveUserId}
              commentText={commentText}
              onCommentTextChange={(e) => setCommentText(e.target.value)}
              onSubmit={handleCommentSubmit}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        </article>
      </div>

      {/* Pop-up ยินดีด้วย ค้นพบฉากจบใหม่ */}
      <EndingUnlockedModal
        isOpen={showEndingModal}
        currentScene={sceneData}
        allNovelEndings={allNovelEndings}
        novelId={novelId}
        onClose={() => setShowEndingModal(false)}
        onViewStoryTree={() => handleLocalNavigate("story-tree")}
        onRestartReading={handleRestartReading}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-slate-900/20">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ReadingPage;