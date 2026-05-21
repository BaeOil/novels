// src/pages/Writer/ChapterManager/ChapterManagerPage.jsx
//
// ══════════════════════════════════════════════════════════
//  หน้าจัดการตอน (Chapter Manager) - เชื่อมต่อ Go Backend สมบูรณ์
// ══════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
// 🎯 🟢 นำเข้า useParams เพื่อดึงเลข ID นิยายจาก URL ของ React Router โดยตรง
import { useParams } from "react-router-dom";
import "./ChapterManagerPage.css";

// 🌐 ตั้งค่าจุดเชื่อมต่อหลังบ้าน Go
const API_BASE = "http://localhost:8080";

// ════════════════════════════════════════════════════════
//  Sub: Novel header banner (ดึงจาก API จริง)
// ════════════════════════════════════════════════════════
const NovelBanner = ({ novel, onEdit }) => {
  if (!novel) return <div className="cm-banner-loading">กำลังโหลดรายละเอียดนิยาย...</div>;

  return (
    <div className="cm-banner">
      <div className="cm-banner__left">
        <div className="cm-banner__cover" style={{ background: novel.cover_bg || "var(--pink-100)" }}>
          <span>{novel.cover_emoji || "📖"}</span>
        </div>
        <div className="cm-banner__info">
          <div className="cm-banner__created">
            วันที่สร้าง: {novel.created_at ? new Date(novel.created_at).toLocaleDateString('th-TH') : "ไม่ระบุ"}
          </div>
          <h2 className="cm-banner__title">{novel.title || "ไม่ระบุนามนิยาย"}</h2>
          <p className="cm-banner__synopsis">{novel.synopsis || "ยังไม่มีเรื่องย่อ..."}</p>
          <div className="cm-banner__stats">
            <span>{novel.chapter_count || 0} ตอน</span>
            <span className="cm-banner__dot">·</span>
            <span>{novel.scene_count || 0} ฉาก</span>
          </div>
        </div>
      </div>
      <div className="cm-banner__right">
        <span className="cm-banner__status">● {novel.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</span>
        <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={onEdit}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M2 10.5L4.5 8l6-6 1.5 1.5-6 6-2.5 2.5H2v-2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
          </svg>
          แก้ไขรายละเอียดเรื่อง
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Sub: Choice row inside a scene (ผูกโยงสวิตช์ทางเลือก)
// ════════════════════════════════════════════════════════
const ChoiceRow = ({ choice, sceneOptions = [], onUpdate, onDelete }) => {
  const [text, setText] = useState(choice.text || "");
  const [targetType, setTargetType] = useState(choice.target_type || "same");
  const [subScene, setSubScene] = useState(choice.target_scene_id || "");
  const [isOpen, setIsOpen] = useState(false);

  const allScenes = sceneOptions.flatMap((ch) =>
    (ch.scenes || []).map((s) => ({
      value: s.id,
      label: s.title,
      chapterLabel: ch.title,
    }))
  );

  const handleSaveChoice = () => {
    onUpdate(choice.id, {
      text,
      target_type: targetType,
      target_scene_id: parseInt(subScene, 10) || 0
    });
    setIsOpen(false);
  };

  return (
    <div className="cm-choice">
      <div className="cm-choice__header">
        <div className="cm-choice__num">🔹</div>
        <div className="cm-choice__text-wrap">
          <span className="cm-choice__title">{text || "(ยังไม่ได้พิมพ์ข้อความบนปุ่มทางเลือก)"}</span>
        </div>
        <div className="cm-choice__target-badge">
          ➔ ปลายทางฉาก ID: {choice.target_scene_id || "ยังไม่ได้ผูกจุดเชื่อม"}
        </div>
        <button className="cm-choice__toggle" onClick={() => setIsOpen(!isOpen)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button className="cm-choice__del" onClick={() => onDelete(choice.id)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="cm-choice__body">
          <div className="cm-choice__row">
            <div className="cm-choice__field">
              <label className="cm-choice__label">คำสั่งที่จะปรากฏบนปุ่มให้ผู้อ่านเลือก</label>
              <input
                className="cm-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="เช่น 'ยอมเปิดกล่องปริศนา'..."
              />
            </div>

            <div className="cm-choice__field">
              <label className="cm-choice__label">หากเลือกข้อนี้ จะกระโดดไปที่ฉากใด?</label>
              <select
                className="cm-select"
                value={subScene}
                onChange={(e) => setSubScene(e.target.value)}
              >
                <option value="">-- เลือกฉากปลายทาง --</option>
                {allScenes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.chapterLabel} › {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="cm-btn cm-btn--sm cm-btn--outline" style={{ marginTop: "8px" }} onClick={handleSaveChoice}>
            💾 บันทึกความเชื่อมโยงเส้นพล็อต
          </button>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Sub: Scene card inside a chapter
// ════════════════════════════════════════════════════════
const SceneCard = ({ scene, chapterId, chapterNumber, onWrite, fetchScenes, allChapters }) => {
  const token = localStorage.getItem("token");

  // ยิงคำขอสร้าง Choice แตกกิ่ง: POST /choices
  const handleAddChoice = async () => {
    try {
      const res = await fetch(`${API_BASE}/choices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          scene_id: scene.id,
          text: "ตัวเลือกเส้นทางใหม่",
          target_scene_id: 0
        })
      });
      if (res.ok) {
        fetchScenes();
      }
    } catch (err) {
      console.error("สร้างกิ่งล้มเหลว:", err);
    }
  };

  const handleUpdateChoice = async (choiceId, updatedData) => {
    console.log("⚠️ [MOCK ACTION]: อัปเดตข้อมูล Choice ไปยัง ID", choiceId, updatedData);
    alert(`กำลังจำลองการเซฟเส้นทาง! (หลังบ้านสร้าง API PUT /choices เสร็จแล้วจึงยิงจริง)`);
  };

  const handleDeleteChoice = async (choiceId) => {
    console.log("⚠️ [MOCK ACTION]: ลบ Choice ID", choiceId);
    fetchScenes();
  };

  const handleDeleteScene = async () => {
    if (!window.confirm("ยืนยันที่จะลบฉากนี้ออกจากระบบหรือไม่?")) return;

    try {
      const res = await fetch(`${API_BASE}/scenes/${scene.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchScenes();
      } else {
        fetchScenes();
      }
    } catch (err) {
      fetchScenes();
    }
  };

  return (
    <div className="cm-scene">
      <div className="cm-scene__header">
        <div className="cm-scene__num">{String(chapterNumber).padStart(2, "0")}</div>
        <div className="cm-scene__info">
          <div className="cm-scene__title-row">
            <h4 className="cm-scene__title">{scene.title || "ฉากที่ไม่มีชื่อ"}</h4>
          </div>
          <p className="cm-scene__excerpt">
            {scene.content ? scene.content.substring(0, 110) + "..." : "ยังว่างเปล่า ไม่มีเนื้อเรื่องคำบรรยายด้านในฉากนี้"}
          </p>
          <div className="cm-scene__meta">
            <span className="cm-scene__tag cm-scene__tag--scene">รหัสฉาก (ID): {scene.id}</span>
            <span className="cm-scene__updated">
              อัปเดต: {scene.updated_at ? new Date(scene.updated_at).toLocaleDateString('th-TH') : "วันนี้"}
            </span>
          </div>
        </div>
        <div className="cm-scene__actions">
          <button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={() => onWrite(chapterId, scene.id)}>
            ✍️ พิมพ์เนื้อหาบทบรรยาย
          </button>
          <button className="cm-btn cm-btn--ghost cm-btn--sm cm-btn--danger" onClick={handleDeleteScene}>
            ลบฉาก
          </button>
        </div>
      </div>

      <div className="cm-scene__choices">
        <div className="cm-scene__choices-header">
          <div className="cm-scene__choices-title">🎋 ทางเลือกตัดสินใจแยกย่อย (Choices ของฉากนี้)</div>
        </div>

        {(scene.choices || []).map((choice) => (
          <ChoiceRow
            key={choice.id}
            choice={choice}
            sceneOptions={allChapters}
            onUpdate={handleUpdateChoice}
            onDelete={handleDeleteChoice}
          />
        ))}

        <button className="cm-btn cm-btn--add-choice" onClick={handleAddChoice}>
          ➕ เพิ่มปุ่มตัวเลือกทางแยกใหม่
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Sub: Chapter panel (พิกัดควบคุมฉากภายในตอน)
// ════════════════════════════════════════════════════════
const ChapterPanel = ({ chapter, onWrite, allChapters, fetchChapters }) => {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  // ยิงดึงข้อมูลฉากตามตอนที่โฟกัสอยู่จริง: GET /chapters/:id/scenes
  const fetchScenes = async () => {
    if (!chapter?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chapters/${chapter.id}/scenes`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        
        // 🎯 🟢 จุดแก้ไข: แกะกล่อง .data เพื่อรองรับสไตล์ครอบ Response ของ Go Backend สำหรับข้อมูลฉาก
        const actualScenes = result.data || result;
        setScenes(Array.isArray(actualScenes) ? actualScenes : []);
      }
    } catch (err) {
      console.error("ดึงรายการฉากขัดข้อง:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenes();
  }, [chapter?.id]);

  const handleAddScene = async () => {
    try {
      const res = await fetch(`${API_BASE}/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          chapter_id: chapter.id,
          title: `ฉากพล็อตเรื่องย่อยที่ ${scenes.length + 1}`,
          content: ""
        })
      });
      if (res.ok) {
        fetchScenes();
        fetchChapters();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cm-chapter">
      {loading ? (
        <div className="cm-loading-box">🔄 ระบบกำลังติดต่อกับ Go API เพื่อดึงข้อมูลโครงฉาก...</div>
      ) : scenes.length === 0 ? (
        <div className="cm-empty-scenes">
          <p>ยังไม่มีฉากในตอนนี้เลย คุณต้องมีอย่างน้อย 1 ฉาก ผู้อ่านจึงจะอ่านเนื้อเรื่องได้นะคะ</p>
        </div>
      ) : (
        scenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            chapterId={chapter.id}
            chapterNumber={chapter.chapter_number || 1}
            onWrite={onWrite}
            fetchScenes={fetchScenes}
            allChapters={allChapters}
          />
        ))
      )}

      <button className="cm-btn cm-btn--add-scene" onClick={handleAddScene}>
        🎬 สร้างฉากใหม่เพิ่มเข้าตระกร้าตอน
      </button>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Main: ChapterManagerPage
// ════════════════════════════════════════════════════════
const ChapterManagerPage = ({ onNavigate }) => {
  // 🎯 🟢 แกะตัวเลข novelId ออกมาจากเส้น URL จริงของเว็บโดยอัตโนมัติ (เช่น /writer/3/chapters -> ได้เลข 3)
  const { id } = useParams();
  const currentNovelId = id || "1";

  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const token = localStorage.getItem("token");

  // ยิงเก็บตกรวบรวมข้อมูลนิยายและรายการตอนทั้งหมด
  const fetchNovelAndChapters = async () => {
    try {
      // 1. ดึงข้อมูลแบนเนอร์หลักนิยาย (ใช้ไอดีจริงจาก URL)
      const resNovel = await fetch(`${API_BASE}/novels/${currentNovelId}`);
      if (resNovel.ok) {
        const result = await resNovel.json();
        const actualNovelData = result.data || result;
        setNovel(actualNovelData);
      }

      // 2. ดึงผังตอนทั้งหมดของนิยาย (ใช้ไอดีจริงจาก URL)
      const resChapters = await fetch(`${API_BASE}/novels/${currentNovelId}/chapters`);
      if (resChapters.ok) {
        const result = await resChapters.json();

        let actualChapters = [];

        if (result && result.data !== undefined) {
          if (Array.isArray(result.data)) {
            actualChapters = result.data;
          } else if (result.data && Array.isArray(result.data.chapters)) {
            actualChapters = result.data.chapters;
          } else if (result.data && typeof result.data === 'object') {
            const firstArrayKey = Object.keys(result.data).find(key => Array.isArray(result.data[key]));
            if (firstArrayKey) actualChapters = result.data[firstArrayKey];
          }
        } else if (Array.isArray(result)) {
          actualChapters = result;
        } else if (result && Array.isArray(result.chapters)) {
          actualChapters = result.chapters;
        }

        if (Array.isArray(actualChapters)) {
          setChapters(actualChapters);

          if (actualChapters.length > 0 && !activeChapterId) {
            setActiveChapterId(actualChapters[0].id);
          }
        } else {
          console.warn("⚠️ คลี่ข้อมูลออกมาหมดแล้วแต่ยังไม่เจอรูปแบบ Array ที่ใช้ได้:", result);
          setChapters([]);
        }
      }
    } catch (err) {
      console.error("ขัดข้องในการเชื่อมต่อโครงข่ายหลังบ้าน:", err);
      setChapters([]);
    }
  };

  useEffect(() => {
    if (currentNovelId) {
      fetchNovelAndChapters();
    }
  }, [currentNovelId]);

  // สั่งเพิ่มบท/ตอนใหม่ผ่าน API ตัวจริง: POST /chapters
  const handleAddChapter = async () => {
    try {
      const res = await fetch(`${API_BASE}/chapters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          novel_id: parseInt(currentNovelId, 10),
          title: `ตอนที่ ${chapters.length + 1}`
        })
      });
      if (res.ok) {
        fetchNovelAndChapters();
      }
    } catch (err) {
      console.error("สร้างบทไม่สำเร็จ:", err);
    }
  };

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  return (
    <div className="cm-layout">
      <div className="cm-main">
        <div className="cm-topbar">
          <div>
            <h1 className="cm-topbar__title">จัดการตอนนิยาย (Console)</h1>
            <p className="cm-topbar__sub">สร้างเนื้อหา ควบคุมฉากทางเลือก และจัดสาขากล่องพล็อตเรื่อง</p>
          </div>
          <button
            className="cm-btn cm-btn--outline cm-btn--tree"
            onClick={() => onNavigate("story-tree", { novelId: currentNovelId })}
          >
            📊 เปิดดูแผนผังความสัมพันธ์ (Story Tree)
          </button>
        </div>

        <NovelBanner novel={novel} onEdit={() => onNavigate("create-novel", { novelId: currentNovelId })} />

        {activeChapter ? (
          <ChapterPanel
            chapter={activeChapter}
            allChapters={chapters}
            fetchChapters={fetchNovelAndChapters}
            onWrite={(chId, scId) => onNavigate("write", { novelId: currentNovelId, chapterId: chId, sceneId: scId })}
          />
        ) : (
          <div className="cm-empty-state">
            📭 ยังไม่มีข้อมูลตอนใด ๆ ในระบบหลังบ้าน กดปุ่มสีชมพูด้านขวาเพื่อสร้างตอนแรกได้เลยค่ะ!
          </div>
        )}
      </div>

      <aside className="cm-sidebar">
        <div className="cm-sidebar__header">📁 รายชื่อตอนทั้งหมด</div>

        <button className="cm-sidebar__add" onClick={handleAddChapter}>
          ✨ สร้างตอนใหม่
        </button>

        <div className="cm-sidebar__list">
          {chapters.map((ch, index) => (
            <button
              key={`chapter-item-${ch.id || index}-${index}`} 
              className={`cm-sidebar__item ${activeChapterId === ch.id ? "cm-sidebar__item--active" : ""}`}
              onClick={() => setActiveChapterId(ch.id)}
            >
              <div className="cm-sidebar__item-top">
                <span className="cm-sidebar__item-icon">⭐</span>
                <div className="cm-sidebar__item-body">
                  <span className="cm-sidebar__item-num">ลำดับบทที่ {index + 1}</span>
                  <div className="cm-sidebar__item-title">{ch.title || `ตอนที่ ${index + 1}`}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default ChapterManagerPage;
