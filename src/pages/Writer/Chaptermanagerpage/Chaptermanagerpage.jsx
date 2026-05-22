// src/pages/Writer/ChapterManager/ChapterManagerPage.jsx
//
// ══════════════════════════════════════════════════════════
//  หน้าจัดการตอน (Chapter Manager) - แก้ไขปัญหาตัวแปรพิมพ์เล็ก/ใหญ่จาก Go
// ══════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./ChapterManagerPage.css";

const API_BASE = "http://localhost:8080";

// ════════════════════════════════════════════════════════
//  Sub: Novel header banner (ดึงจาก API จริง รองรับทั้งตัวเล็ก/ใหญ่)
// ════════════════════════════════════════════════════════
const NovelBanner = ({ novel, onEdit }) => {
  if (!novel) return <div className="cm-banner-loading">กำลังโหลดรายละเอียดนิยาย...</div>;

  // ป้องกันปัญหา Casing ตัวเล็ก-ใหญ่จาก Go Backend
  const title = novel.title ?? novel.Title ?? "ไม่ระบุนามนิยาย";
  const synopsis = novel.synopsis ?? novel.Synopsis ?? "ยังไม่มีเรื่องย่อ...";
  const coverBg = novel.cover_bg ?? novel.CoverBg ?? "var(--pink-100)";
  const coverEmoji = novel.cover_emoji ?? novel.CoverEmoji ?? "📖";
  const createdAt = novel.created_at ?? novel.CreatedAt;
  const chapterCount = novel.chapter_count ?? novel.ChapterCount ?? 0;
  const sceneCount = novel.scene_count ?? novel.SceneCount ?? 0;
  const status = novel.status ?? novel.Status;

  return (
    <div className="cm-banner">
      <div className="cm-banner__left">
        <div className="cm-banner__cover" style={{ background: coverBg }}>
          <span>{coverEmoji}</span>
        </div>
        <div className="cm-banner__info">
          <div className="cm-banner__created">
            วันที่สร้าง: {createdAt ? new Date(createdAt).toLocaleDateString('th-TH') : "ไม่ระบุ"}
          </div>
          <h2 className="cm-banner__title">{title}</h2>
          <p className="cm-banner__synopsis">{synopsis}</p>
          <div className="cm-banner__stats">
            <span>{chapterCount} ตอน</span>
            <span className="cm-banner__dot">·</span>
            <span>{sceneCount} ฉาก</span>
          </div>
        </div>
      </div>
      <div className="cm-banner__right">
        <span className="cm-banner__status">● {status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</span>
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
//  Sub: Choice row inside a scene
// ════════════════════════════════════════════════════════
const ChoiceRow = ({ choice, sceneOptions = [], onUpdate, onDelete }) => {
  const choiceId = choice?.id ?? choice?.ID;
  const choiceText = choice?.text ?? choice?.Text ?? "";
  const choiceTargetType = choice?.target_type ?? choice?.TargetType ?? "same";
  const choiceTargetSceneId = choice?.target_scene_id ?? choice?.TargetSceneID ?? 0;

  const [text, setText] = useState(choiceText);
  const [targetType, setTargetType] = useState(choiceTargetType);
  const [subScene, setSubScene] = useState(choiceTargetSceneId);
  const [isOpen, setIsOpen] = useState(false);

  const allScenes = sceneOptions.flatMap((ch) => {
    const chTitle = ch.title ?? ch.Title;
    const chScenes = ch.scenes ?? ch.Scenes ?? [];
    return chScenes.map((s) => ({
      value: s.id ?? s.ID,
      label: s.title ?? s.Title,
      chapterLabel: chTitle,
    }));
  });

  const handleSaveChoice = () => {
    onUpdate(choiceId, {
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
          ➔ ปลายทางฉาก ID: {subScene || "ยังไม่ได้ผูกจุดเชื่อม"}
        </div>
        <button className="cm-choice__toggle" onClick={() => setIsOpen(!isOpen)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button className="cm-choice__del" onClick={() => onDelete(choiceId)}>
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
                  <option key={`target-scene-opt-${s.value}`} value={s.value}>
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
  const sceneId = scene?.id ?? scene?.ID;
  const sceneTitle = scene?.title ?? scene?.Title ?? "ฉากที่ไม่มีชื่อ";
  const sceneContent = scene?.content ?? scene?.Content ?? "";
  const sceneUpdatedAt = scene?.updated_at ?? scene?.UpdatedAt;
  const sceneChoices = scene?.choices ?? scene?.Choices ?? [];

  const handleAddChoice = async () => {
    try {
      const res = await fetch(`${API_BASE}/choices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          scene_id: sceneId,
          text: "ตัวเลือกเส้นทางใหม่",
          target_scene_id: 0
        })
      });
      if (res.ok) fetchScenes();
    } catch (err) {
      console.error("สร้างกิ่งล้มเหลว:", err);
    }
  };

  const handleUpdateChoice = async (choiceId, updatedData) => {
    try {
      const res = await fetch(`${API_BASE}/choices/${choiceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) fetchScenes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChoice = async (choiceId) => {
    if (!window.confirm("คุณต้องการลบทางเลือกพล็อตเรื่องนี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`${API_BASE}/choices/${choiceId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchScenes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScene = async () => {
    if (!window.confirm("ยืนยันที่จะลบฉากนี้ออกจากระบบหรือไม่?")) return;
    try {
      const res = await fetch(`${API_BASE}/scenes/${sceneId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchScenes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cm-scene">
      <div className="cm-scene__header">
        <div className="cm-scene__num">{String(chapterNumber).padStart(2, "0")}</div>
        <div className="cm-scene__info">
          <div className="cm-scene__title-row">
            <h4 className="cm-scene__title">{sceneTitle}</h4>
          </div>
          <p className="cm-scene__excerpt">
            {sceneContent ? sceneContent.substring(0, 110) + "..." : "ยังว่างเปล่า ไม่มีเนื้อเรื่องคำบรรยายด้านในฉากนี้"}
          </p>
          <div className="cm-scene__meta">
            <span className="cm-scene__tag cm-scene__tag--scene">รหัสฉาก (ID): {sceneId}</span>
            <span className="cm-scene__updated">
              อัปเดต: {sceneUpdatedAt ? new Date(sceneUpdatedAt).toLocaleDateString('th-TH') : "วันนี้"}
            </span>
          </div>
        </div>
        <div className="cm-scene__actions">
          <button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={() => onWrite(chapterId, sceneId)}>
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

        {sceneChoices.map((choice) => (
          <ChoiceRow
            key={`choice-row-${choice.id ?? choice.ID}`}
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
//  Sub: Chapter panel
// ════════════════════════════════════════════════════════
const ChapterPanel = ({ chapter, onWrite, allChapters, fetchChapters }) => {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const chId = chapter?.id ?? chapter?.ID;
  const chNumber = chapter?.chapter_number ?? chapter?.ChapterNumber ?? 1;

  const fetchScenes = async () => {
    if (!chId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chapters/${chId}/scenes`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
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
  }, [chId]);

  const handleAddScene = async () => {
    try {
      const res = await fetch(`${API_BASE}/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          chapter_id: chId,
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
          <button className="cm-btn cm-btn--add-scene" onClick={handleAddScene}>
            🎬 สร้างฉากแรกให้กับตอนระบุนี้
          </button>
        </div>
      ) : (
        <>
          {scenes.map((scene) => (
            <SceneCard
              key={`scene-card-${scene.id ?? scene.ID}`}
              scene={scene}
              chapterId={chId}
              chapterNumber={chNumber}
              onWrite={onWrite}
              fetchScenes={fetchScenes}
              allChapters={allChapters}
            />
          ))}
          <button className="cm-btn cm-btn--add-scene" onClick={handleAddScene}>
            🎬 สร้างฉากใหม่เพิ่มเข้าตะกร้าตอน
          </button>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Main: ChapterManagerPage
// ════════════════════════════════════════════════════════
const ChapterManagerPage = ({ onNavigate, novelId }) => {
  const { novelId: routeNovelId } = useParams();
  const currentNovelId = routeNovelId || novelId;

  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const fetchNovelAndChapters = async () => {
    if (!currentNovelId || currentNovelId === "undefined") {
      console.error("❌ ไม่พบโครงสร้าง ID นิยายที่ถูกต้อง");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. ดึงข้อมูลแบนเนอร์หลักนิยาย
      const resNovel = await fetch(`${API_BASE}/novels/${currentNovelId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resNovel.ok) {
        const result = await resNovel.json();
        const actualNovelData = result.data || result.novel || result;
        setNovel(actualNovelData);
      }

      // 2. ดึงผังตอนทั้งหมดของนิยาย
      const resChapters = await fetch(`${API_BASE}/novels/${currentNovelId}/chapters`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (resChapters.ok) {
        const result = await resChapters.json();
        let actualChapters = [];

        if (result && result.data !== undefined) {
          if (Array.isArray(result.data)) {
            actualChapters = result.data;
          } else if (result.data && Array.isArray(result.data.chapters)) {
            actualChapters = result.data.chapters;
          }
        } else if (Array.isArray(result)) {
          actualChapters = result;
        } else if (result && Array.isArray(result.chapters)) {
          actualChapters = result.chapters;
        }

        if (Array.isArray(actualChapters)) {
          setChapters(actualChapters);
          
          if (actualChapters.length > 0) {
            setActiveChapterId((prev) => {
              // เช็คทั้ง .id และ .ID ป้องกันพัง
              if (prev && actualChapters.some(c => (c.id ?? c.ID) === prev)) return prev;
              return actualChapters[0].id ?? actualChapters[0].ID;
            });
          }
        } else {
          setChapters([]);
        }
      }
    } catch (err) {
      console.error("ขัดข้องในการเชื่อมต่อโครงข่ายหลังบ้าน:", err);
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentNovelId) {
      fetchNovelAndChapters();
    }
  }, [currentNovelId, token]);

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

  const activeChapter = chapters.find((c) => (c.id ?? c.ID) === activeChapterId);

  if (loading) {
    return <div className="cm-loading-fullscreen">🔄 กำลังเรียกคืนผังโครงสร้างข้อมูลจาก Go API...</div>;
  }

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
        <div className="cm-sidebar__header">📁 รายชื่อตอนทั้งหมด ({chapters.length})</div>

        <button className="cm-sidebar__add" onClick={handleAddChapter}>
          ✨ สร้างตอนใหม่
        </button>

        <div className="cm-sidebar__list">
          {chapters.map((ch, index) => {
            const chId = ch.id ?? ch.ID ?? index;
            const chTitle = ch.title ?? ch.Title ?? `ตอนที่ ${index + 1}`;
            
            return (
              <button
                key={`chapter-sidebar-item-${chId}-${index}`}
                className={`cm-sidebar__item ${activeChapterId === chId ? "cm-sidebar__item--active" : ""}`}
                onClick={() => setActiveChapterId(chId)}
              >
                <div className="cm-sidebar__item-top">
                  <span className="cm-sidebar__item-icon">⭐</span>
                  <div className="cm-sidebar__item-body">
                    <span className="cm-sidebar__item-num">ลำดับบทที่ {index + 1}</span>
                    <div className="cm-sidebar__item-title">{chTitle}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default ChapterManagerPage;
