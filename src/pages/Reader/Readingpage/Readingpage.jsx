import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // 👈 นำเข้าเครื่องมือดึงค่าจาก URL และสลับหน้าจอ
import "./ReadingPage.css";
import ReadingBreadcrumb from "../../../components/ReadingBreadcrumb/ReadingBreadcrumb";
import ChoiceButtons from "../../../components/ChoiceButtons/ChoiceButtons";

const BASE_URL = "http://localhost:8080"; // 👈 พอร์ตเซิร์ฟเวอร์ Go หลังบ้าน (app-1) ใน Docker

const ReadingPage = ({
  userId = 1, // ชั่วคราวก่อนทำระบบล็อกอิน
  novelTitle = "กำลังโหลดชื่อเรื่อง...",
}) => {

  const { novelId, sceneId } = useParams();
  const navigate = useNavigate();

  // สลับมุมมองหน้าจออ่าน หรือ ดู Tree
  const [currentView, setCurrentView] = useState("reading");

  // เก็บ ID ของ ฉาก (Scene) ปัจจุบันตามระบบ Branching (ยึดตามที่ส่งมาจาก URL ก่อน)
  const [currentSceneId, setCurrentSceneId] = useState(sceneId || null);
  const [sceneData, setSceneData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const contentRef = useRef(null);

  // ดักจับกรณีที่ URL เปลี่ยนแปลง (เช่น ผู้ใช้อ่านกิ่งถัดไป หรือกดเปลี่ยนเส้นทาง)
  useEffect(() => {
    if (sceneId) {
      setCurrentSceneId(sceneId);
    }
  }, [sceneId]);

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
        if (!currentSceneId) {
          url = `${BASE_URL}/novels/${novelId}/start?user_id=${userId}`;
        } else {
          url = `${BASE_URL}/scenes/${currentSceneId}?user_id=${userId}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดเนื้อหาฉากจากระบบหลังบ้านได้");
        }

        const resData = await response.json();

        if (resData && resData.data) {
          setSceneData(resData.data);
          if (!currentSceneId) {
            setCurrentSceneId(resData.data.scene_id || resData.data.id);
          }
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
      await fetch(`${BASE_URL}/choice-history`, {
        box: "no-cors",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          choice_id: choice.choice_id
        })
      });
    } catch (err) {
      console.error("บันทึกประวัติการเลือกเลือกฟลอป:", err);
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

  // 🎯 แกะตัวแปรจาก Database
  const { content, choices, type, novel_title, chapter_title, scene_title, chapter_order, order } = sceneData;

  // 🎯 ดักจับตัวเลขลำดับตอน (มองหาเผื่อไว้ทั้งชื่อ chapter_order และ order เผื่อหลังบ้านส่งคีย์ไม่เหมือนกัน)
  const currentOrder = chapter_order || order || null;

  // 🏷️ ฟังก์ชันช่วยแปลงข้อมูล 'type' ให้เป็นข้อความ Tag สวยๆ บนหน้าจอ
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
    <div className="rp">
      <div className="rp__progress-bar" style={{ width: `${readProgress}%` }} role="progressbar" />

      <div className="rp__container">
        <ReadingBreadcrumb
          novelTitle={novel_title || novelTitle}
          chapterTitle={chapter_title || (type === "start" ? "บทนำ" : "ตอนอ่านต่อ")}
          onBack={() => handleLocalNavigate("novel-detail")}
          onStoryMap={() => handleLocalNavigate("story-tree")}
        />

        <article className={`rp__article ${isTransitioning ? "rp__article--out" : "rp__article--in"}`} ref={contentRef}>

          {/* ------------------------------------------------------------- */}
          {/* 🎯 โซนแสดงหัวข้อแบ่งจัดเต็มตามความต้องการ 3 แถวตรงตัวล็อก */}
          {/* ------------------------------------------------------------- */}
          <div className="rp__header-group" style={{ textAlign: "center", marginBottom: "25px" }}>

            {/* แถวที่ 1 บนสุด: แสดงชื่อเรื่องนิยายหลัก */}
            <div className="rp__novel-subtitle" style={{ fontSize: "1.1rem", color: "#666", marginBottom: "6px" }}>
              เรื่อง : {novel_title || novelTitle}
            </div>

            {/* แถวที่ 2 ตรงกลาง: แสดงชื่อฉาก/เนื้อเรื่องย่อย (ตัวใหญ่สะใจสายตาคนอ่าน) */}
            <h1 className="rp__title" style={{ fontSize: "2.2rem", fontWeight: "bold", margin: "10px 0", color: "#111" }}>
              {scene_title || (type === "start" ? "จุดเริ่มต้นการเดินทาง" : "ดำเนินเรื่องย่อย")}
            </h1>

            {/* แถวที่ 3 เล็กลงมา: แสดงคำว่า "ตอนที่ [เลข] : [ชื่อตอน]" และ ป้าย Tag ประเภทเนื้อเรื่อง */}
            <div className="rp__scene-meta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "1.05rem", color: "#555", marginTop: "15px", flexWrap: "wrap" }}>
              <span style={{ color: "#4a5568", fontWeight: "600" }}>
                📂 {currentOrder ? `ตอนที่ ${currentOrder} : ` : "ตอน : "} 
                {chapter_title || (type === "start" ? "บทนำ" : "บททั่วไป")}
              </span>
              
              <span style={{ color: "#ccc" }}>|</span>
              
              {/* 🎯 ป้าย Tag แสดงประเภทฉากย่อย */}
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
          {/* ------------------------------------------------------------- */}

          {/* เส้นคั่นลายประดับพุ่มไม้/ดาว */}
          <div className="rp__ornament" aria-hidden="true">
            <span className="rp__orn-line" />
            <span className="rp__orn-dot">✦</span>
            <span className="rp__orn-dot">✦</span>
            <span className="rp__orn-dot">✦</span>
            <span className="rp__orn-line" />
          </div>

          {/* แสดงเนื้อหาจริงจากระบบฐานข้อมูล */}
          <div
            className="rp__body"
            aria-label="เนื้อหา"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* ปุ่มตัวเลือกเส้นทางกิ่งก้าน (Choices) จากหลังบ้าน */}
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

          {/* กรณีจบสมบูรณ์แบบ แตกแขนงไปต่อไม่ได้แล้ว */}
          {(!choices || choices.length === 0) && (
            <div className="rp__ending">
              <div className="rp__ending-icon" aria-hidden="true">🏆</div>
              <h2 className="rp__ending-title">จบเส้นทางเนื้อเรื่องย่อยนี้แล้ว!</h2>
              <div className="rp__ending-actions">
                <button className="rp__ending-btn rp__ending-btn--primary" onClick={() => handleLocalNavigate("story-tree")}>
                  🌳 ดู Story Tree
                </button>
                <button className="rp__ending-btn rp__ending-btn--outline" onClick={() => handleLocalNavigate("novel-detail")}>
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
