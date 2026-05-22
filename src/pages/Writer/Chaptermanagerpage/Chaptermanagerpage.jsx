// src/pages/Writer/ChapterManager/ChapterManagerPage.jsx

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./ChapterManagerPage.css";

const API_BASE = "http://localhost:8080";

// ════════════════════════════════════════════════════════
//  Sub: Novel header banner (ดึงตรงตามโครงสร้าง NovelDetailDTO ของ Go)
// ════════════════════════════════════════════════════════
const NovelBanner = ({ novel, chapters, onEdit }) => {
  if (!novel) return <div className="cm-banner-loading">กำลังโหลดรายละเอียดนิยาย...</div>;

  // 🎯 แมปคีย์ตรงตามสเปก NovelDetailDTO หลังบ้าน
  const title = novel.title || "นิยายเรื่องนี้ยังไม่ได้ตั้งชื่อ";
  const captions = novel.captions || "ยังไม่มีเรื่องย่อ...";
  const coverBg = novel.cover_bg || "var(--pink-100)";
  const coverEmoji = novel.cover_emoji || "📖";
  
  // 🎯 ดึงสถานะและวันที่อัปเดตจาก DTO จริง
  const status = novel.status || "draft"; 
  const updatedAt = novel.updated_at || novel.created_at; 
  
  const chapterCount = chapters?.length ?? 0;

  // 🎯 คำนวณจำนวนฉากจริงจากก้อนข้อมูลบทเรียนย่อยสะสมที่โหลดมาได้จริงใน Client หน้าบ้าน
  const sceneCount = novel?.scene_count ?? novel?.sceneCount ?? novel?.total_scenes ?? novel?.totalScenes ?? chapters?.reduce((total, ch) => {
    const chScenes = ch.scenes || ch.Scenes || [];
    return total + chScenes.length;
  }, 0) ?? 0;

  // ฟังก์ชันแปลงรูปแบบวันที่ให้เป็นภาษาไทยอ่านง่าย (วัน เดือน ปี)
  const formatThaiDate = (dateString) => {
    if (!dateString) return "ไม่ระบุ";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString.split("T")[0] || dateString;
      
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return "ไม่ระบุ";
    }
  };

  return (
    <div className="cm-banner">
      <div className="cm-banner__left">
        <div className="cm-banner__cover" style={{ background: coverBg }}>
          <span>{coverEmoji}</span>
        </div>
        <div className="cm-banner__info">
          {/* 🎯 แสดงผลวันที่อัปเดตล่าสุดจริงจาก DTO */}
          <div className="cm-banner__created">อัปเดตล่าสุดเมื่อ: {formatThaiDate(updatedAt)}</div>
          <h2 className="cm-banner__title">{title}</h2>
          <p className="cm-banner__synopsis">{captions}</p>
          <div className="cm-banner__stats">
            <span>{chapterCount} ตอน</span>
            <span className="cm-banner__dot">·</span>
            {/* 🎯 ยอดรวมฉากตามจริงทั้งหมดแกะจากโมเดล */}
            <span>{sceneCount} ฉากพล็อตเรื่อง</span>
          </div>
        </div>
      </div>
      <div className="cm-banner__right">
        {/* 🎯 ตัวคอนโทรลสีและข้อความตามสถานะจริงจากฐานข้อมูลหลังบ้าน */}
        <span 
          className="cm-banner__status" 
          style={{ 
            backgroundColor: status === "published" || status === "active" ? "#e6fffa" : "#fff5f5", 
            color: status === "published" || status === "active" ? "#319795" : "#e53e3e",
            border: status === "published" || status === "active" ? "1px solid #b2f5ea" : "1px solid #fed7d7"
          }}
        >
          ● {status === "published" || status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
        </span>
        <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={onEdit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
const ChoiceRow = ({ choice, sceneOptions = [], currentChapterId, onUpdate, onDelete }) => {
  const choiceId = choice?.id ?? choice?.ID ?? choice?.choice_id ?? choice?.ChoiceID;
  const choiceText = choice?.label ?? choice?.Label ?? choice?.text ?? choice?.Text ?? "";
  const choiceTargetSceneId = choice?.to_scene_id ?? choice?.ToSceneID ?? choice?.target_scene_id ?? choice?.TargetSceneID ?? 0;

  const [text, setText] = useState(choiceText);
  const [subScene, setSubScene] = useState(choiceTargetSceneId);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  const allScenes = (sceneOptions || []).flatMap((ch) => {
    const chTitle = ch.title ?? ch.Title;
    const chId = ch.id ?? ch.ID ?? ch.chapter_id ?? ch.ChapterID;
    const chScenes = ch.scenes ?? ch.Scenes ?? [];
    return chScenes.map((s) => ({
      value: s.id ?? s.ID ?? s.scene_id ?? s.SceneID,
      label: (s.title ?? s.Title) || "(ฉากไม่มีชื่อ)",
      chapterLabel: chTitle,
      chapterId: chId,
      type: s.type ?? s.Type,
    }));
  });

  const chapterOptions = (sceneOptions || []).map((ch) => ({
    value: ch.id ?? ch.ID ?? ch.chapter_id ?? ch.ChapterID,
    label: ch.title ?? ch.Title ?? "(ยังไม่มีชื่อบท)",
  }));

  const targetScene = allScenes.find((scene) => String(scene.value) === String(choiceTargetSceneId));
  const [scope, setScope] = useState(() => (targetScene ? (targetScene.chapterId === currentChapterId ? "same" : "other") : "same"));
  const initialScope = targetScene ? (targetScene.chapterId === currentChapterId ? "same" : "other") : "same";
  const effectiveScope = scope || initialScope || "same";
  const firstOtherChapterId = chapterOptions.find((ch) => String(ch.value) !== String(currentChapterId))?.value ?? chapterOptions[0]?.value ?? null;
  const defaultChapterId = targetScene?.chapterId ?? chapterOptions[0]?.value ?? null;
  const effectiveChapterId = effectiveScope === "same"
    ? currentChapterId
    : selectedChapterId ?? (String(defaultChapterId) !== String(currentChapterId) ? defaultChapterId : firstOtherChapterId);
  const currentChapterScenes = allScenes.filter((scene) => String(scene.chapterId) === String(effectiveChapterId));
  const effectiveSubScene = subScene || choiceTargetSceneId || currentChapterScenes[0]?.value || "";
  const selectedTargetScene = allScenes.find((scene) => String(scene.value) === String(effectiveSubScene));

  const handleSaveChoice = () => {
    if (!choiceId) return;
    onUpdate(choiceId, {
      label: text,
      to_scene_id: parseInt(effectiveSubScene, 10) || 0
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
        <div className="cm-choice__target-badge" style={{ background: "#ffe6f4", color: "#97266d", border: "1px solid #f9d4e0" }}>
          {selectedTargetScene ? `⭢ ตอน ${selectedTargetScene.chapterLabel} : ${selectedTargetScene.label}` : "ยังไม่ได้เลือกปลายทาง"}
        </div>
        <button className="cm-choice__toggle" onClick={() => setIsOpen(!isOpen)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button className="cm-choice__del" onClick={() => choiceId && onDelete(choiceId)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
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
              <label className="cm-choice__label">เลือกว่าเป็น</label>
              <select
                className="cm-select"
                value={effectiveScope}
                onChange={(e) => {
                  const nextScope = e.target.value;
                  setScope(nextScope);
                  if (nextScope === "same") {
                    setSelectedChapterId(currentChapterId);
                    const firstScene = allScenes.find((scene) => String(scene.chapterId) === String(currentChapterId));
                    setSubScene(firstScene?.value ?? "");
                  } else {
                    const nextChapterId = selectedChapterId || firstOtherChapterId;
                    setSelectedChapterId(nextChapterId);
                    const firstScene = allScenes.find((scene) => String(scene.chapterId) === String(nextChapterId));
                    setSubScene(firstScene?.value ?? "");
                  }
                }}
              >
                <option value="same">ในตอนเดียวกัน</option>
                <option value="other">ข้ามตอน</option>
              </select>
            </div>

            {effectiveScope === "other" && (
              <div className="cm-choice__field">
                <label className="cm-choice__label">เลือกตอนปลายทาง</label>
                <select
                  className="cm-select"
                  value={effectiveChapterId || ""}
                  onChange={(e) => {
                    const chapterId = e.target.value;
                    setSelectedChapterId(chapterId);
                    const firstScene = allScenes.find((scene) => String(scene.chapterId) === String(chapterId));
                    setSubScene(firstScene?.value ?? "");
                  }}
                >
                  <option value="">-- เลือกตอน --</option>
                  {chapterOptions
                    .filter((ch) => String(ch.value) !== String(currentChapterId))
                    .map((ch) => (
                      <option key={`target-chapter-opt-${ch.value}`} value={ch.value}>
                        {ch.label}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="cm-choice__field">
              <label className="cm-choice__label">เลือกฉากปลายทาง</label>
              <select
                className="cm-select"
                value={effectiveSubScene || ""}
                onChange={(e) => setSubScene(e.target.value)}
              >
                <option value="">-- เลือกฉากปลายทาง --</option>
                {currentChapterScenes.map((s) => (
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
//  Sub: Scene card inside a chapter (ล้างแท็ก HTML + ซ่อน ID ระบบ)
// ════════════════════════════════════════════════════════
const SceneCard = ({ scene, chapterId, sceneIndex, onWrite, fetchScenes, allChapters }) => {
  const token = localStorage.getItem("token");
  const sceneId = scene?.id ?? scene?.ID ?? scene?.scene_id ?? scene?.SceneID;
  const sceneTitle = scene?.title ?? scene?.Title ?? `ฉากย่อยที่ ${sceneIndex}`;
  const sceneContent = scene?.content ?? scene?.Content ?? "";
  
  // 🎯 แก้ไขบั๊กบรรทัดที่ 197: ครอบวงเล็บป้องกัน Oxc Parse Error จากการผสม ?? และ ||
  const sceneChoices = (scene?.choices ?? scene?.Choices) || [];

  const stripHtmlTags = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const cleanTextPreview = stripHtmlTags(sceneContent);

  const handleAddChoice = async () => {
    if (!sceneId) return;

    const availableTargets = (allChapters || []).flatMap((ch) => {
      const chScenes = ch.scenes ?? ch.Scenes ?? [];
      return chScenes.map((s) => ({
        id: s.id ?? s.ID ?? s.scene_id ?? s.SceneID,
        type: s.type ?? s.Type,
      }));
    }).filter((s) => String(s.id) !== String(sceneId));

    const targetScene = availableTargets.find((s) => s.type !== "start") || availableTargets[0];
    if (!targetScene) {
      alert("ไม่พบฉากปลายทางที่ใช้สร้างทางเลือกได้ กรุณาสร้างฉากเพิ่มก่อน");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/choices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          from_scene_id: parseInt(sceneId, 10),
          to_scene_id: parseInt(targetScene.id, 10),
          label: "ทางเลือกใหม่"
        })
      });
      if (res.ok) fetchScenes();
    } catch (err) {
      console.error("สร้างตัวเลือกพล็อตล้มเหลว:", err);
    }
  };

  const handleApplyChoice = async (choiceId, updatedData) => {
    if (!choiceId) return;
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
    if (!choiceId || !window.confirm("คุณต้องการลบทางเลือกพล็อตเรื่องนี้ใช่หรือไม่?")) return;
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
    if (!sceneId || !window.confirm("ยืนยันที่จะลบฉากนี้ออกจากระบบหรือไม่?")) return;
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
        <div className="cm-scene__num">{String(sceneIndex).padStart(2, "0")}</div>
        <div className="cm-scene__info">
          <div className="cm-scene__title-row">
            <h4 className="cm-scene__title">{sceneTitle}</h4>
          </div>
          <p className="cm-scene__excerpt">
            {cleanTextPreview ? cleanTextPreview.substring(0, 140) + "..." : "ยังว่างเปล่า ไม่มีเนื้อเรื่องคำบรรยายด้านในฉากนี้"}
          </p>
          <div className="cm-scene__meta">
            <span className="cm-scene__updated">บันทึกโครงสร้างสำเร็จ</span>
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
          <div className="cm-scene__choices-title">🎋 ทางเลือกตัดสินใจแยกย่อย (Choices)</div>
        </div>

        {sceneChoices.map((choice, i) => (
          <ChoiceRow
            key={`choice-row-${choice.id ?? choice.ID ?? choice.choice_id ?? choice.ChoiceID ?? i}`}
            choice={choice}
            sceneOptions={allChapters}
            currentChapterId={chapterId}
            onUpdate={handleApplyChoice}
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
const ChapterPanel = ({ novelId, chapter, onWrite, allChapters, fetchChapters }) => {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const chId = chapter?.id ?? chapter?.ID ?? chapter?.chapter_id ?? chapter?.ChapterID;

  const fetchScenes = async () => {
    if (!chId || chId === "undefined") return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chapters/${chId}/scenes`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        
        let actualScenes = [];
        if (result && result.data !== undefined) {
          if (Array.isArray(result.data)) {
            actualScenes = result.data;
          } else if (result.data && Array.isArray(result.data.scenes)) {
            actualScenes = result.data.scenes;
          } else if (result.data && Array.isArray(result.data.Scenes)) {
            actualScenes = result.data.Scenes;
          }
        } else if (Array.isArray(result)) {
          actualScenes = result;
        } else if (result && Array.isArray(result.scenes)) {
          actualScenes = result.scenes;
        } else if (result && Array.isArray(result.Scenes)) {
          actualScenes = result.Scenes;
        }

        setScenes(actualScenes);
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
    if (!chId || !novelId) return;
    try {
      const res = await fetch(`${API_BASE}/scenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          novel_id: parseInt(novelId, 10),
          chapter_id: parseInt(chId, 10),
          title: `ฉากพล็อตเรื่องย่อยที่ ${scenes.length + 1}`,
          content: "",
          type: "normal"
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
        <div className="cm-loading-box">🔄 โหลดโครงสร้างฉาก...</div>
      ) : scenes.length === 0 ? (
        <div className="cm-empty-scenes">
          <p>ยังไม่มีฉากในตอนนี้เลย คุณต้องมีอย่างน้อย 1 ฉาก ผู้อ่านจึงจะสามารถเลือกอ่านได้</p>
          <button className="cm-btn cm-btn--add-scene" onClick={handleAddScene}>
            🎬 สร้างฉากแรกให้กับตอนนี้
          </button>
        </div>
      ) : (
        <>
          {scenes.map((scene, i) => (
            <SceneCard
              key={`scene-card-${scene.id ?? scene.ID ?? scene.scene_id ?? scene.SceneID ?? i}`}
              scene={scene}
              chapterId={chId}
              currentChapterId={chId}
              sceneIndex={i + 1}
              onWrite={onWrite}
              fetchScenes={fetchScenes}
              allChapters={allChapters}
            />
          ))}
          <button className="cm-btn cm-btn--add-scene" onClick={handleAddScene}>
            🎬 สร้างฉากใหม่เพิ่มเข้าตอนนี้
          </button>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Main: ChapterManagerPage (ดึงข้อมูลแยกคู่ขนาน เสถียรสูง)
// ════════════════════════════════════════════════════════
const ChapterManagerPage = ({ onNavigate, novelId }) => {
  const { novelId: routeNovelId } = useParams();
  const rawId = routeNovelId || novelId;
  
  const cleanIntId = parseInt(rawId, 10);
  const currentNovelId = (!isNaN(cleanIntId) && cleanIntId > 0) ? cleanIntId : null;

  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const fetchNovelAndChapters = async () => {
    if (!currentNovelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    // ✦ ท่อที่ 1: ดึงรายละเอียดวัตถุนิยายเดี่ยว (ตามโครงสร้าง NovelDetailDTO)
    try {
      const resNovel = await fetch(`${API_BASE}/novels/${currentNovelId}`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (resNovel.ok) {
        const result = await resNovel.json();
        const actualNovelData = result.novel || result.data?.novel || result.data || result;
        setNovel(actualNovelData);
      }
    } catch (err) {
      console.error("โหลดข้อมูลนิยายล้มเหลว:", err);
    }

    // ✦ ท่อที่ 2: ดึงอาเรย์รายชื่อตอนย่อยมาประกอบเมนูด้านขวา
    try {
      const resChapters = await fetch(`${API_BASE}/novels/${currentNovelId}/chapters`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
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
              const firstId = actualChapters[0].id ?? actualChapters[0].ID ?? actualChapters[0].chapter_id ?? actualChapters[0].ChapterID;
              if (!prev) return firstId;
              const isValueExist = actualChapters.some(c => String(c.id ?? c.ID ?? c.chapter_id ?? c.ChapterID) === String(prev));
              return isValueExist ? prev : firstId;
            });
          }
        }
      }
    } catch (err) {
      console.error("โหลดรายชื่อตอนล้มเหลว:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentNovelId) {
      fetchNovelAndChapters();
    }
  }, [currentNovelId]);

  const handleAddChapter = async () => {
    if (!currentNovelId) return;
    try {
      const res = await fetch(`${API_BASE}/chapters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          novel_id: currentNovelId,
          title: `ตอนที่ ${chapters.length + 1}`
        })
      });
      if (res.ok) {
        fetchNovelAndChapters();
      }
    } catch (err) {
      console.error("สร้างตอนล้มเหลว:", err);
    }
  };

  const activeChapter = chapters.find((c) => {
    const id = c.id ?? c.ID ?? c.chapter_id ?? c.ChapterID;
    return String(id) === String(activeChapterId);
  });

  if (loading) {
    return <div className="cm-loading-fullscreen">🔄 โหลดข้อมูลพล็อตสตอรี่ทรี...</div>;
  }

  if (!currentNovelId) {
    return (
      <div className="cm-layout" style={{ padding: "40px" }}>
        <div className="cm-empty-state">
          ⚠️ ตรวจพบข้อผิดพลาด: ไม่พบรหัสไอดีนิยายในระบบการจัดการ
        </div>
      </div>
    );
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

        {/* 🎯 ส่งค่า chapters ไปให้ NovelBanner ประมวลผลจำนวนฉากสะสม */}
        <NovelBanner novel={novel} chapters={chapters} onEdit={() => onNavigate("create-novel", { novelId: currentNovelId })} />

        {activeChapter ? (
          <ChapterPanel
            novelId={currentNovelId}
            chapter={activeChapter}
            allChapters={chapters}
            fetchChapters={fetchNovelAndChapters}
            onWrite={(chId, scId) => onNavigate("write", { novelId: currentNovelId, chapterId: chId, sceneId: scId })}
          />
        ) : (
          <div className="cm-empty-state">
            📭 ยังไม่มีการเลือกตอนเพื่อดูฉากย่อย กรุณาเลือกดูรายชื่อตอนจากเมนูด้านขวามือค่ะ
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
            const chId = ch.id ?? ch.ID ?? ch.chapter_id ?? ch.ChapterID ?? index;
            const chTitle = ch.title ?? ch.Title ?? `ตอนที่ ${index + 1}`;
            
            return (
              <button
                key={`chapter-sidebar-item-${chId}-${index}`}
                className={`cm-sidebar__item ${String(activeChapterId) === String(chId) ? "cm-sidebar__item--active" : ""}`}
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
