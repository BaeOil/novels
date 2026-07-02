import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import "./ReadingPage.css";
import ReadingBreadcrumb from "../../../components/ReadingBreadcrumb/ReadingBreadcrumb";
import ChoiceButtons from "../../../components/ChoiceButtons/ChoiceButtons";
import RestartReadingButton from "../../../components/RestartReadingButton/RestartReadingButton";
import ReadingSettings from "../../../components/ReadingSettings/ReadingSettings";

const BASE_URL = "http://localhost:8080"; 

const ReadingPage = ({
  userId = 0,
  novelTitle = "กำลังโหลดชื่อเรื่อง...",
}) => {

  const { novelId, sceneId } = useParams();
  const navigate = useNavigate();

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
  const [currentSceneId, setCurrentSceneId] = useState(sceneId || null);
  const [sceneData, setSceneData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);

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

  useEffect(() => {
    if (sceneId) {
      setCurrentSceneId(sceneId);
    }
  }, [sceneId]);

  // ==========================================
  // 🌟 ฟังก์ชันใหม่: อัปเดต Progress และปลดล็อกฉาก
  // ==========================================
  const updateReadingProgress = async (nId, sId, sceneType) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      if (!effectiveUserId) {
        console.warn("No logged-in user found, skipping progress save.");
      } else {
        // 1. บันทึกพิกัดปัจจุบันและปลดล็อกเส้นทางในตาราง history
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

        // 2. ถ้าฉากนี้เป็นจุดจบ (Ending) ให้ยิงไปบันทึกลง user_endings ด้วย
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
        }
      }
    } catch (err) {
      console.error("❌ ไม่สามารถอัปเดตความคืบหน้าการอ่านได้:", err);
    }
  };

  // ==========================================
  // 🔄 FETCH ข้อมูลจาก GO API
  // ==========================================
  useEffect(() => {
    if (!novelId || novelId === "undefined") {
      console.error("❌ บั๊กหน้าจอ: ReadingPage ไม่ได้รับรหัสนิยาย (novelId เป็น undefined)");
      setError("ไม่พบรหัสนิยาย (Novel ID เป็น undefined) กรุณาตรวจสอบการส่งค่ามาจากหน้าก่อนหน้า");
      setLoading(false);
      return;
    }

    const fetchScene = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = "";
        const query = effectiveUserId > 0 ? `?user_id=${effectiveUserId}` : "";
        if (!currentSceneId) {
          url = `${BASE_URL}/novels/${novelId}/start${query}`;
        } else {
          url = `${BASE_URL}/scenes/${currentSceneId}${query}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดเนื้อหาฉากจากระบบหลังบ้านได้");
        }

        const resData = await response.json();

        if (resData && resData.data) {
          setSceneData(resData.data);
          const loadedSceneId = resData.data.scene_id || resData.data.id;
          
          if (!currentSceneId) {
            setCurrentSceneId(loadedSceneId);
          }

          // 🎯 เรียกใช้ฟังก์ชันอัปเดตทันทีที่โหลดฉากใหม่เสร็จ!
          updateReadingProgress(novelId, loadedSceneId, resData.data.type);

        } else {
          throw new Error("รูปแบบข้อมูลที่หลังบ้านส่งมาไม่ถูกต้อง");
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
  }, [currentSceneId, novelId, userId]);

  // ==========================================
  // 📊 PROGRESS BAR LOGIC
  // ==========================================
  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      if (total > 0) {
        setReadProgress(Math.round((scrolled / total) * 100));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ==========================================
  // 🖱️ HANDLE CHOICE CLICK & POST HISTORY
  // ==========================================
  const handleChoose = async (choice) => {
    setSelectedChoiceId(choice.choice_id);
    setIsTransitioning(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // บันทึกทางเลือกลง user_choice_history
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
      navigate(`/reading/${novelId}/${choice.to_scene_id}`);
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
    navigate(`/reading/${novelId}`);
  };

  // ⏳ LOADING & ERROR STATES
  if (loading) {
    return (
      <div className="rp__loading" aria-live="polite">
        <div className="rp__loading-spinner" aria-label="กำลังโหลด" />
        <p>กำลังดึงเนื้อหาฉากจริงจากระบบฐานข้อมูล...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "50px", textAlign: "center", color: "red", background: "#fff5f5", minHeight: "100vh" }}>
        <h3 style={{ fontSize: "1.5rem", marginBottom: "10px" }}>เกิดข้อผิดพลาดในการโหลดเนื้อหา</h3>
        <p style={{ color: "#555", marginBottom: "20px" }}>{error}</p>
        <button
          onClick={() => navigate("/")}
          style={{ padding: "8px 20px", cursor: "pointer", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px" }}
        >
          กลับไปหน้ารายชื่อนิยายหลัก
        </button>
      </div>
    );
  }

  const { content, choices, type, novel_title, chapter_title, scene_title, chapter_order, order } = sceneData;
  const currentOrder = chapter_order || order || null;

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

  // ==========================================
  // 📖 RENDER DISPLAY 
  // ==========================================
  return (
    <div className={`rp rp--theme-${theme}`}>
      <div className="rp__progress-bar" style={{ width: `${readProgress}%` }} role="progressbar" />

      <div className="rp__container">
        <ReadingBreadcrumb
          novelTitle={novel_title || novelTitle}
          chapterTitle={chapter_title || (type === "start" ? "บทนำ" : "ตอนอ่านต่อ")}
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
              เรื่อง : {novel_title || novelTitle}
            </div>

            <h1 className="rp__title" style={{ fontSize: "2.2rem", fontWeight: "bold", margin: "10px 0", color: "#111" }}>
              {scene_title || (type === "start" ? "จุดเริ่มต้นการเดินทาง" : "ดำเนินเรื่องย่อย")}
            </h1>

            <div className="rp__scene-meta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "1.05rem", color: "#555", marginTop: "15px", flexWrap: "wrap" }}>
              <span style={{ color: "#4a5568", fontWeight: "600" }}>
                📂 {currentOrder ? `ตอนที่ ${currentOrder} : ` : "ตอน : "} 
                {chapter_title || (type === "start" ? "บทนำ" : "บททั่วไป")}
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

          <div
            className={`rp__body rp__body--${theme}`}
            aria-label="เนื้อหา"
            style={{ fontFamily: getFontFamilyString(fontFamily), fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: content }}
          />

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
            <div className="rp__ending">
              <div className="rp__ending-icon" aria-hidden="true">🏆</div>
              <h2 className="rp__ending-title">จบเส้นทางเนื้อเรื่องย่อยนี้แล้ว!</h2>
              <div className="rp__ending-actions">
                <button className="rp__ending-btn rp__ending-btn--primary" onClick={() => handleLocalNavigate("story-tree") }>
                  🌳 ดู โครงสร้างเนื้อเรื่อง
                </button>
                <RestartReadingButton onRestart={handleRestartReading} />
                <button className="rp__ending-btn rp__ending-btn--outline" onClick={() => handleLocalNavigate("novel-detail") }>
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
