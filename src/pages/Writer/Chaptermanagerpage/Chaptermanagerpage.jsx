// src/pages/Writer/ChapterManager/ChapterManagerPage.jsx

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import "./ChapterManagerPage.css";
import { getNovelStatusInfo } from "../../../utils/novelStatus";

const API_BASE = "http://localhost:8080";

const formatThaiDate = (dateString) => {
  if (!dateString) return "ไม่ระบุ";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString.split("T")[0] || dateString;
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch (e) {
    return "ไม่ระบุ";
  }
};

const formatNovelCoverImage = (cover) => {
  if (!cover) return null;
  if (typeof cover !== "string") return null;
  return cover.replace("http://minio:9000", "http://localhost:9000");
};

const getNovelCategoryNames = (novel) => {
  const categories = novel?.categories || novel?.Categories || [];
  if (!Array.isArray(categories)) return [];
  return Array.from(new Set(
    categories
      .map((cat) => {
        if (!cat) return null;
        if (typeof cat === "string") return cat;
        return cat.name || cat.Name || cat.title || cat.label || null;
      })
      .filter(Boolean)
  ));
};
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0, color: '#111827', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{title}</h3>
        <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={onCancel}>ยกเลิก</button>
          <button className="cm-btn cm-btn--sm" style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold' }} onClick={onConfirm}>ยืนยันลบ</button>
        </div>
      </div>
    </div>
  );
};
const NovelBanner = ({ novel, chapters, onEdit, onToggleStatus }) => {
  if (!novel) return <div className="cm-banner-loading">กำลังโหลดรายละเอียดนิยาย...</div>;

  const title = novel.title || novel.title || "นิยายเรื่องนี้ยังไม่ได้ตั้งชื่อ";
  const captions = novel.captions || novel.caption || novel.introduction || "ยังไม่มีเรื่องย่อ...";
  const coverImage = formatNovelCoverImage(novel.cover_image || novel.coverImage || novel.coverUrl || novel.cover_url);
  const coverBg = novel.cover_bg || "var(--pink-100)";
  const coverEmoji = novel.cover_emoji || "📖";

 // 🕒 ปรับให้ดึงตัวแปรเวลาครอบคลุมขึ้น
  const updatedAt = novel?.updated_at || novel?.UpdatedAt || novel?.created_at || novel?.CreatedAt;

  const chapterCount = chapters?.length ?? 0;
  const categoryNames = getNovelCategoryNames(novel);
  const statusInfo = getNovelStatusInfo(novel);
  const statusKey = statusInfo.mode;
  const isCompletedNovel = statusInfo.isCompleted;
  const isPublishedNovel = statusInfo.isPublished;

  const sceneCount = novel?.scene_count ?? novel?.sceneCount ?? novel?.total_scenes ?? novel?.totalScenes ?? chapters?.reduce((total, ch) => {
    const chScenes = ch.scenes || ch.Scenes || [];
    return total + chScenes.length;
  }, 0) ?? 0;

  // 🕒 ปรับฟังก์ชันจัดรูปแบบเวลาให้แสดง ชั่วโมง และ นาที ด้วย
  const formatThaiDate = (dateString) => {
    if (!dateString) return "ไม่ระบุ";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString.split("T")[0] || dateString;

      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',   // เพิ่มชั่วโมง
        minute: '2-digit'  // เพิ่มนาที
      }) + ' น.';
    } catch (e) {
      return "ไม่ระบุ";
    }
  };

  return (
    <div className="cm-banner">
      <div className="cm-banner__left">
        <div className="cm-banner__cover" style={{ background: coverBg }}>
          {coverImage ? (
            <img
              src={coverImage}
              alt={`ปกนิยาย ${title}`}
              className="cm-banner__cover-img"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <span>{coverEmoji}</span>
          )}
        </div>
        <div className="cm-banner__info">
          <div className="cm-banner__created">อัปเดตล่าสุดเมื่อ: {formatThaiDate(updatedAt)}</div>
          <h2 className="cm-banner__title">{title}</h2>
          <p className="cm-banner__synopsis">{captions}</p>
          {categoryNames.length > 0 && (
            <div className="cm-banner__categories">
              {categoryNames.map((name, idx) => (
                <span key={`novel-category-${idx}`} className="cm-banner__category-tag">{name}</span>
              ))}
            </div>
          )}
          <div className="cm-banner__stats">
            <span>{chapterCount} ตอน</span>
            <span className="cm-banner__dot">·</span>
            <span>{sceneCount} ฉาก</span>
          </div>
          {!isPublishedNovel && !isCompletedNovel && (
            <div className="cm-banner__draft-note">
              ✨ นิยายยังเป็นฉบับร่าง — ผู้เขียนและผู้ดูแลเท่านั้นที่เห็นเรื่องนี้ และทุกตอนจะยังไม่แสดงให้ผู้อ่านเห็น
            </div>
          )}
        </div>
      </div>
      <div className="cm-banner__right">
        <span
          className="cm-banner__status"
          style={{
            backgroundColor: isCompletedNovel ? "#fff7ed" : statusInfo.mode === "published" || statusInfo.mode === "completed-published" ? "#e6fffa" : "#fff5f5",
            color: isCompletedNovel ? "#b45309" : statusInfo.mode === "published" || statusInfo.mode === "completed-published" ? "#319795" : "#e53e3e",
            border: isCompletedNovel ? "1px solid #fdba74" : statusInfo.mode === "published" || statusInfo.mode === "completed-published" ? "1px solid #b2f5ea" : "1px solid #fed7d7"
          }}
        >
          ● {statusInfo.label}
        </span>
        <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={onEdit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          แก้ไข
        </button>
        <button className="cm-btn cm-btn--outline cm-btn--sm" style={{ marginLeft: 10 }} onClick={onToggleStatus}>
          {isPublishedNovel ? "เปลี่ยนเป็นฉบับร่าง" : "เผยแพร่เรื่องนี้"}
        </button>
      </div>
    </div>
  );
};

const ChoiceRow = ({ choice, sceneOptions = [], currentChapterId, onUpdate, onCreate, onDelete }) => {
  const choiceId = choice?.id ?? choice?.ID ?? choice?.choice_id ?? choice?.ChoiceID;
  const choiceText = choice?.label ?? choice?.Label ?? choice?.text ?? choice?.Text ?? "";
  const choiceTargetSceneId = choice?.to_scene_id ?? choice?.ToSceneID ?? choice?.target_scene_id ?? choice?.TargetSceneID ?? "";
  const isNew = choice?.temp === true || String(choiceId).startsWith("temp-");

  const [text, setText] = useState(choiceText);
  const [subScene, setSubScene] = useState(choiceTargetSceneId);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  
  const [isEditing, setIsEditing] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const allScenes = (sceneOptions || []).flatMap((ch, index) => {
    const chTitle = ch.episode ?? ch.Episode ?? ch.title ?? ch.Title ?? `ตอนที่ ${index + 1}`;
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

  const handleSaveChoice = async () => {
    const payload = {
      from_scene_id: parseInt(choice.from_scene_id ?? choice.fromSceneID ?? currentChapterId, 10),
      to_scene_id: parseInt(effectiveSubScene, 10) || 0,
      label: text,
    };

    setIsSaving(true);
    try {
      let saved = false;
      if (isNew) {
        saved = await onCreate?.(payload);
      } else {
        saved = await onUpdate(choiceId, payload);
      }

      if (saved) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setIsEditing(false);
        }, 1200);
      } else {
        alert("❌ บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error("บันทึกตัวเลือกล้มเหลว:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '14px' }}>
          <span style={{ color: '#db2777', fontWeight: 'bold' }}>▶ {text || "(ไม่มีข้อความปุ่ม)"}</span>
          <span style={{ color: '#9ca3af' }}>➔</span>
          <span style={{ fontSize: '12.5px', color: '#4b5563', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
            {selectedTargetScene ? `${selectedTargetScene.chapterLabel} : ${selectedTargetScene.label}` : "⚠️ ยังไม่มีปลายทาง"}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="cm-btn cm-btn--ghost cm-btn--sm" style={{ color: '#2563eb', padding: '4px 8px' }} onClick={() => setIsEditing(true)} title="แก้ไขทางเลือก">✏️</button>
          <button className="cm-btn cm-btn--ghost cm-btn--sm" style={{ color: '#ef4444', padding: '4px 8px' }} onClick={() => setShowDeleteModal(true)} title="ลบทางเลือก">🗑️</button>
        </div>
        <ConfirmModal isOpen={showDeleteModal} title="ลบทางเลือกพล็อตเรื่อง" message={`คุณต้องการลบตัวเลือก "${text || 'ไม่มีข้อความ'}" ใช่หรือไม่?`} onConfirm={() => { setShowDeleteModal(false); choiceId && onDelete(choiceId, isNew); }} onCancel={() => setShowDeleteModal(false)} />
      </div>
    );
  }

  return (
    <div className="cm-choice" style={{ border: '1px solid #e5e7eb', padding: '14px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '10px' }}>
      <div className="cm-choice__body" style={{ display: 'block', padding: 0 }}>
        <div className="cm-choice__row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
          <div className="cm-choice__field">
            <label className="cm-choice__label" style={{ fontSize: '12.5px', fontWeight: 'bold' }}>ข้อความบนปุ่มทางเลือก</label>
            <input className="cm-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="เช่น 'ยอมเปิดกล่องปริศนา'..." />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="cm-choice__field" style={{ flex: 1 }}>
              <label className="cm-choice__label" style={{ fontSize: '12.5px', fontWeight: 'bold' }}>เชื่อมไปตอนใด</label>
              <select className="cm-select" value={effectiveScope} onChange={(e) => {
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
              }}>
                <option value="same">ไปฉากในตอนเดียวกัน</option>
                <option value="other">ไปฉากในตอนอื่น</option>
              </select>
            </div>

            {effectiveScope === "other" && (
              <div className="cm-choice__field" style={{ flex: 1 }}>
                <label className="cm-choice__label" style={{ fontSize: '12.5px', fontWeight: 'bold' }}>เลือกตอนปลายทาง</label>
                <select className="cm-select" value={effectiveChapterId || ""} onChange={(e) => {
                  const chapterId = e.target.value;
                  setSelectedChapterId(chapterId);
                  const firstScene = allScenes.find((scene) => String(scene.chapterId) === String(chapterId));
                  setSubScene(firstScene?.value ?? "");
                }}>
                  <option value="">-- เลือกตอน --</option>
                  {chapterOptions.filter((ch) => String(ch.value) !== String(currentChapterId)).map((ch) => (
                    <option key={`target-chapter-opt-${ch.value}`} value={ch.value}>{ch.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="cm-choice__field" style={{ flex: 1 }}>
              <label className="cm-choice__label" style={{ fontSize: '12.5px', fontWeight: 'bold' }}>เลือกฉากปลายทาง</label>
              <select className="cm-select" value={effectiveSubScene || ""} onChange={(e) => setSubScene(e.target.value)}>
                <option value="">-- เลือกฉากปลายทาง --</option>
                {currentChapterScenes.map((s) => (
                  <option key={`target-scene-opt-${s.value}`} value={s.value}>{s.chapterLabel} › {s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {!isNew && <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={() => setIsEditing(false)}>ยกเลิก</button>}
          <button
            className="cm-btn cm-btn--sm"
            onClick={handleSaveChoice}
            disabled={isSaving || showSuccess}
            style={{ backgroundColor: showSuccess ? "#10b981" : "#ec4899", color: '#fff', border: 'none', transition: "all 0.3s ease" }}
          >
            {isSaving ? "⏳ กำลังบันทึก..." : showSuccess ? "✅ บันทึกสำเร็จ!" : "💾 บันทึกทางเลือก"}
          </button>
        </div>
      </div>
    </div>
  );};

// ==========================================
// SceneCard - อัปเดตการแสดงผลฉากจบตามเงื่อนไขที่ถูกต้อง
// ==========================================
const SceneCard = ({
  scene,
  chapterId,
  chapterNumber,
  chapterTitle,
  sceneIndex,
  onWrite,
  fetchScenes,
  allChapters
}) => {
  const token = localStorage.getItem("token");
  const sceneId = scene?.id ?? scene?.ID ?? scene?.scene_id ?? scene?.SceneID;
  const sceneTitle = scene?.title ?? scene?.Title ?? `ฉากย่อยที่ ${sceneIndex}`;
  const sceneContent = scene?.content ?? scene?.Content ?? "";
  const sceneChoices = (scene?.choices ?? scene?.Choices) || [];
  
  const sceneType = (scene?.type || scene?.Type || "").toString().toLowerCase();
  const isEnding = sceneType === "ending" || Boolean(scene?.ending_title || scene?.EndingTitle || scene?.endingTitle);
  const endingTitle = (scene?.ending_title ?? scene?.EndingTitle ?? scene?.endingTitle ?? "").trim();
  const endingType = (scene?.ending_type ?? scene?.EndingType ?? scene?.endingType ?? "").trim();

  const stripHtmlTags = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const cleanTextPreview = stripHtmlTags(sceneContent);
  
  const [isBodyOpen, setIsBodyOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newChoices, setNewChoices] = useState([]);
  
  useEffect(() => {
    setNewChoices([]);
  }, [sceneId]);

  const allSceneChoices = [...sceneChoices, ...newChoices];
  const choiceCount = allSceneChoices.length;

  // 🏁 ฟังก์ชันช่วยสร้างข้อความฉากจบให้สวยงามตามเงื่อนไข
  const formatEndingText = () => {
    const typeSuffix = endingType ? `(${endingType})` : "";
    if (!endingTitle) {
      // ไม่มีชื่อฉากจบ -> "ฉากจบ (True)" หรือ "ฉากจบ"
      return `ฉากจบ ${typeSuffix}`.trim();
    } else {
      // มีชื่อฉากจบ -> "ฉากจบ : ชื่อฉากจบ (True)" หรือ "ฉากจบ : ชื่อฉากจบ"
      return `ฉากจบ : ${endingTitle} ${typeSuffix}`.trim();
    }
  };

  const handleAddChoice = () => {
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

    const uniqueTempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNewChoices((prev) => [...prev, { id: uniqueTempId, temp: true, from_scene_id: sceneId, label: "", to_scene_id: targetScene.id }]);
    setIsBodyOpen(true);
  };

  const handleApplyChoice = async (choiceId, updatedData) => {
    if (!choiceId) return false;
    try {
      const res = await fetch(`${API_BASE}/choices/${choiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) { await fetchScenes(); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const handleDeleteChoice = async (choiceId) => {
    try {
      const res = await fetch(`${API_BASE}/choices/${choiceId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchScenes();
    } catch (err) { console.error(err); }
  };

  const handleDeleteScene = async () => {
    try {
      const res = await fetch(`${API_BASE}/scenes/${sceneId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchScenes();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="cm-scene" style={{ 
      marginBottom: '20px', 
      border: '1px solid #f3f4f6', 
      borderRadius: '16px', 
      backgroundColor: isEnding ? '#fffdf5' : '#ffffff',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.04)', 
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'visible',
      zIndex: isMenuOpen ? 50 : 1
    }}>
      <div className="cm-scene__header" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '20px 24px', 
        borderBottom: isBodyOpen ? '1px solid #f1f5f9' : 'none',
        boxSizing: 'border-box',
        gap: '20px'
      }}>
        
        {/* ฝั่งซ้าย: ข้อมูลฉาก */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
          <button 
            onClick={() => setIsBodyOpen(!isBodyOpen)} 
            style={{ 
              background: isBodyOpen ? '#fdf2f8' : '#f8fafc', 
              border: 'none', 
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer', 
              fontSize: '12px', 
              color: isBodyOpen ? '#db2777' : '#94a3b8', 
              transition: 'all 0.3s ease', 
              transform: isBodyOpen ? 'rotate(90deg)' : 'none' 
            }}
          >
            ▶
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#db2777', backgroundColor: '#fdf2f8', padding: '4px 10px', borderRadius: '12px' }}>
                {chapterNumber}.{sceneIndex}
              </span>
              <h4 className="cm-scene__title" style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                {sceneTitle}
              </h4>
              
              {(sceneType === "start" || scene?.is_start_scene || scene?.isStart) && (
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                  🚀 ฉากเริ่มต้น
                </span>
              )}

              {/* 🏁 ตัวปรับปรุงใหม่: แสดงผลฉากจบตามข้อกำหนดที่อยากได้ */}
              {isEnding && (
                <span style={{ 
                  backgroundColor: '#fffbeb', 
                  color: '#b45309', 
                  border: '1px solid #fde68a',
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '11.5px', 
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  🏁 {formatEndingText()}
                </span>
              )}
            </div>

            <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
              {cleanTextPreview ? cleanTextPreview.substring(0, 140) + "..." : "✍️ ฉากนี้ยังไม่มีรายละเอียดเนื้อเรื่อง กดเขียนเนื้อหาเพื่อเริ่มต้น"}
            </p>
          </div>
        </div>

        {/* ฝั่งขวา: ปุ่มควบคุม */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, position: 'relative' }}>
          
          <button 
            className="cm-btn" 
            style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 18px', 
              borderRadius: '20px', 
              fontWeight: '600',
              fontSize: '13.5px',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)',
              cursor: 'pointer'
            }} 
            onClick={() => onWrite(chapterId, sceneId)}
          >
            🖊 เขียนเนื้อหา
          </button>

          <button 
            style={{ 
              fontSize: '13.5px', 
              backgroundColor: choiceCount > 0 ? '#fdf2f8' : '#f8fafc', 
              color: choiceCount > 0 ? '#db2777' : '#94a3b8', 
              border: `1px solid ${choiceCount > 0 ? '#fbcfe8' : '#e2e8f0'}`, 
              borderRadius: '20px', 
              fontWeight: 'bold',
              padding: '7px 16px',
              minWidth: '95px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            {choiceCount} ทางเลือก
          </button>

          <button 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              fontSize: '18px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              backgroundColor: isMenuOpen ? '#f1f5f9' : '#fff',
              transition: 'background 0.2s'
            }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ⋮
          </button>

          {/* ป๊อปอัพเมนูสามจุด */}
          {isMenuOpen && (
            <>
              <div 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998, backgroundColor: 'transparent' }} 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div style={{
                position: 'absolute',
                top: '46px',
                right: '0px',
                width: '150px',
                backgroundColor: '#fff',
                border: '1px solid #fbcfe8',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(219, 39, 119, 0.18)',
                zIndex: 999,
                padding: '6px 0',
                overflow: 'hidden'
              }}>
                <button 
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 18px', fontSize: '14px', color: '#db2777', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }} 
                  onMouseOver={(e) => e.target.style.backgroundColor = '#fdf2f8'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  onClick={() => { setIsMenuOpen(false); handleAddChoice(); }}
                >
                  🩷 เพิ่มทางเลือก
                </button>
                <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                <button 
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 18px', fontSize: '14px', color: '#ef4444', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }} 
                  onMouseOver={(e) => e.target.style.backgroundColor = '#fef2f2'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  onClick={() => { setIsMenuOpen(false); setShowDeleteModal(true); }}
                >
                  🗑️ ลบฉากนี้
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isBodyOpen && (
        <div className="cm-scene__choices" style={{ padding: '24px', backgroundColor: isEnding ? '#fffdf5' : '#fafaf9', borderTop: '1px solid #f1f5f9', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '8px' }}>🌿 ตัวเลือกตัดสินใจของฉากนี้</span>
          </div>

          {allSceneChoices.map((choice, i) => (
            <ChoiceRow
              key={`choice-row-${choice.id ?? choice.ID ?? choice.choice_id ?? choice.ChoiceID ?? i}`}
              choice={choice}
              sceneOptions={allChapters}
              currentChapterId={chapterId}
              onUpdate={handleApplyChoice}
              onCreate={async (choiceData) => {
                try {
                  const res = await fetch(`${API_BASE}/choices`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(choiceData)
                  });

                  if (res.ok) {
                    setNewChoices((prev) => prev.filter((c) => c.id !== choice.id));
                    await fetchScenes();
                    return true;
                  }
                  return false;
                } catch (err) { console.error(err); return false; }
              }}
              onDelete={handleDeleteChoice}
            />
          ))}

          <button
            style={{ 
              marginTop: "12px", 
              border: '1px dashed #f472b6', 
              color: '#db2777', 
              backgroundColor: '#fdf2f8', 
              padding: '10px 20px', 
              borderRadius: '12px', 
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#fbcfe8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#fdf2f8'}
            onClick={handleAddChoice}
          >
            ➕ เพิ่มทางเลือกใหม่
          </button>
        </div>
      )}

      <ConfirmModal 
        isOpen={showDeleteModal} 
        title="🗑️ ยืนยันการลบฉากสำคัญ" 
        message={`คุณแน่ใจหรือไม่ที่จะลบฉาก "${sceneTitle}"? พล็อตย่อยและปุ่มทางเลือกทั้งหมดที่เชื่อมมายังฉากนี้จะถูกลบออกถาวร`} 
        onConfirm={() => { setShowDeleteModal(false); handleDeleteScene(); }} 
        onCancel={() => setShowDeleteModal(false)} 
      />
    </div>
  );
};
const ChapterPanel = ({ novelId, chapter, chapterIndex, onWrite, allChapters, fetchChapters, onDeleteChapter }) => {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const chTitle = chapter?.title ?? chapter?.Title ?? `ตอนที่ ${chapterIndex}`;
  const chStatus = (chapter?.status || chapter?.Status || "draft").toString().toLowerCase();
  const isChapterPublished = chStatus === "published" || chStatus === "active";

  const [chapterTitle, setChapterTitle] = useState(chTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const chId = chapter?.id ?? chapter?.ID ?? chapter?.chapter_id ?? chapter?.ChapterID;
  const chapterNumber = chapter?.episode ?? chapter?.Episode ?? chapterIndex;

  useEffect(() => {
    setChapterTitle(chTitle);
  }, [chTitle]);

  const handleSaveChapterTitle = async () => {
    try {
      const res = await fetch(`${API_BASE}/chapters/${chId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: chapterTitle
        })
      });

      if (res.ok) {
        setEditingTitle(false);
        fetchChapters();
      }
    } catch (err) {
      console.error("แก้ชื่อบทล้มเหลว:", err);
    }
  };

  const handleToggleChapterStatus = async () => {
    if (!chId) return;
    const nextStatus = isChapterPublished ? "draft" : "published";

    try {
      const res = await fetch(`${API_BASE}/chapters/${chId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await fetchChapters();
      } else {
        const errorText = await res.text();
        console.error("อัปเดตสถานะตอนล้มเหลว:", res.status, errorText);
      }
    } catch (err) {
      console.error("อัปเดตสถานะตอนผิดพลาด:", err);
    }
  };

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
        const result = await res.json();
        const sceneId = result.scene_id || result.data?.scene_id || result.data?.id || result.id;
        if (sceneId) {
          onWrite(chId, sceneId);
          return;
        }
        fetchScenes();
        fetchChapters();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cm-chapter">
      <div className="cm-chapter__header-panel">
        <div className="cm-chapter__header-left">
          <div className="cm-chapter__header-episode">O{chapterNumber}</div>
          <div className="cm-chapter__header-info">
            {editingTitle ? (
              <div className="cm-chapter__header-edit-row">
                <input
                  className="cm-input cm-chapter__header-edit-input"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="ชื่อตอน..."
                  autoFocus
                />
                <button
                  className="cm-btn cm-btn--sm"
                  onClick={handleSaveChapterTitle}
                  style={{ marginLeft: "8px" }}
                >
                  บันทึก
                </button>
                <button
                  className="cm-btn cm-btn--outline cm-btn--sm"
                  onClick={() => {
                    setEditingTitle(false);
                    setChapterTitle(chTitle);
                  }}
                  style={{ marginLeft: "4px" }}
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div>
                <h2 className="cm-chapter__header-title">ตอนที่ {chapterNumber} : {chapterTitle}</h2>
                <button
                  className="cm-btn cm-btn--outline cm-btn--sm"
                  onClick={() => setEditingTitle(true)}
                  style={{ marginTop: "8px" }}
                >
                  ✏️ แก้ไขชื่อตอน
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="cm-chapter__header-right">
          <span className="cm-chapter__header-badge">
            🎬 {scenes.length} ฉาก
          </span>
          <span className="cm-chapter__header-date">
            อัปเดตล่าสุด {new Date().toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div style={{ marginTop: "16px", marginBottom: "24px", display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isChapterPublished ? '#16a34a' : '#b91c1c', flex: '1 1 auto' }}>
          สถานะตอน: {isChapterPublished ? 'เผยแพร่' : 'ฉบับร่าง'}
        </span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={handleToggleChapterStatus}>
            {isChapterPublished ? 'เปลี่ยนเป็นฉบับร่าง' : 'เผยแพร่ตอนนี้'}
          </button>
          <button className="cm-btn cm-btn--danger cm-btn--sm" onClick={() => onDeleteChapter?.(chId)}>
            🗑 ลบตอนนี้
          </button>
        </div>
      </div>

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
              chapterNumber={chapterNumber}
              chapterTitle={chapterTitle}
              sceneIndex={i + 1}
              onWrite={onWrite}
              fetchScenes={fetchScenes}
              allChapters={allChapters}
            />
          ))}
          <button className="cm-btn cm-btn--add-scene" onClick={handleAddScene}>
            🎬 สร้างฉากใหม่
          </button>
        </>
      )}
    </div>
  );
};

const ChapterManagerPage = ({ onNavigate, novelId }) => {
  const { novelId: routeNovelId } = useParams();
  const rawId = routeNovelId || novelId;

  const cleanIntId = parseInt(rawId, 10);
  const currentNovelId = (!isNaN(cleanIntId) && cleanIntId > 0) ? cleanIntId : null;

  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [draftChapterEpisode, setDraftChapterEpisode] = useState(1);
  const [draftChapterTitle, setDraftChapterTitle] = useState("");
  const [draftChapterStatus, setDraftChapterStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const fetchNovelAndChapters = async () => {
    if (!currentNovelId) {
      setLoading(false);
      return;
    }
    setLoading(true);

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

  useEffect(() => {
    if (!isCreatingChapter) {
      setDraftChapterEpisode((chapters?.length || 0) + 1);
    }
  }, [chapters, isCreatingChapter]);

  const openCreateChapterForm = () => {
    setDraftChapterTitle("");
    setDraftChapterEpisode((chapters?.length || 0) + 1);
    setDraftChapterStatus("draft");
    setIsCreatingChapter(true);
  };

  const cancelCreateChapter = () => {
    setIsCreatingChapter(false);
    setDraftChapterTitle("");
    setDraftChapterStatus("draft");
  };

  const handleAddChapter = async () => {
    if (!currentNovelId) return;
    try {
      const nextChapterNumber = chapters.length + 1;
      const episodeNumber = Number(draftChapterEpisode) || nextChapterNumber;
      const title = draftChapterTitle?.trim() || `ตอนที่ ${episodeNumber}`;
      const payload = {
        novel_id: Number(currentNovelId),
        episode: episodeNumber,
        title,
        status: draftChapterStatus || "draft"
      };

      const res = await fetch(`${API_BASE}/chapters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsCreatingChapter(false);
        setDraftChapterTitle("");
        setDraftChapterStatus("draft");
        const data = await res.json();
        const createdChapterId = data.chapter_id ?? data.chapter?.id ?? data.chapter?.ID ?? data.chapter?.chapter_id ?? data.data?.chapter_id;
        await fetchNovelAndChapters();
        if (createdChapterId) {
          setActiveChapterId(createdChapterId);
        }
      } else {
        const errorText = await res.text();
        console.error("สร้างตอนใหม่ล้มเหลว:", res.status, errorText);
        alert("สร้างตอนใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error(err);
      alert("เชื่อมต่อ Backend ไม่สำเร็จ");
    }
  };

  const handleToggleNovelStatus = async () => {
    if (!currentNovelId || !novel) return;
    const currentStatus = (novel.status || novel.Status || "draft").toString().toLowerCase();
    const nextStatus = currentStatus === "published" || currentStatus === "active" ? "draft" : "published";
    const confirmMessage = nextStatus === "published"
      ? "คุณต้องการเผยแพร่นิยายเรื่องนี้หรือไม่?\n\nเมื่อเผยแพร่แล้ว นิยายและตอนทั้งหมดที่เผยแพร่จะเห็นได้สำหรับผู้อ่าน"
      : "คุณต้องการเปลี่ยนนิยายเรื่องนี้กลับเป็นฉบับร่างหรือไม่?\n\nนิยายจะถูกซ่อนจากผู้อ่าน และตอนทั้งหมดจะไม่แสดง";
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`${API_BASE}/novels/${currentNovelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        console.error("อัปเดตสถานะนิยายล้มเหลว", res.status);
        return;
      }
      await fetchNovelAndChapters();
    } catch (err) {
      console.error("อัปเดตสถานะนิยายล้มเหลว", err);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!chapterId || !window.confirm("คุณต้องการลบตอนนี้ใช่หรือไม่? การกระทำนี้จะลบฉากทั้งหมดในตอนนี้ด้วย")) return;
    try {
      const res = await fetch(`${API_BASE}/chapters/${chapterId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("ลบตอนล้มเหลว:", res.status, errText);
        alert("ไม่สามารถลบตอนได้ กรุณาลองใหม่");
        return;
      }
      if (String(activeChapterId) === String(chapterId)) {
        setActiveChapterId(null);
      }
      await fetchNovelAndChapters();
    } catch (err) {
      console.error("Delete chapter error:", err);
      alert("เกิดข้อผิดพลาดในการลบตอน");
    }
  };

  const activeChapter = chapters.find((c) => {
    const id = c.id ?? c.ID ?? c.chapter_id ?? c.ChapterID;
    return String(id) === String(activeChapterId);
  });

  const activeChapterIndex = Math.max(
    1,
    chapters.findIndex((c) => String(c.id ?? c.ID ?? c.chapter_id ?? c.ChapterID) === String(activeChapterId)) + 1
  );

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
            <h1 className="cm-topbar__title">จัดการตอนนิยาย</h1>
            <p className="cm-topbar__sub">จัดการรายการตอนและรายละเอียดฉากของคุณ</p>
          </div>
          <button
            className="cm-btn cm-btn--outline"
            onClick={() => onNavigate("story-tree", { novelId: currentNovelId })}
          >
            📊 โครงสร้างเนื้อเรื่อง
          </button>
        </div>

        <NovelBanner
          novel={novel}
          chapters={chapters}
          onEdit={() => onNavigate("create-novel", { novelId: currentNovelId })}
          onToggleStatus={handleToggleNovelStatus}
        />

        {activeChapter ? (
          <ChapterPanel
            novelId={currentNovelId}
            chapter={activeChapter}
            chapterIndex={activeChapterIndex}
            allChapters={chapters}
            fetchChapters={fetchNovelAndChapters}
            onDeleteChapter={handleDeleteChapter}
            onWrite={(chId, scId) => onNavigate("scene-editor", { novelId: currentNovelId, chapterId: chId, sceneId: scId })}
          />
        ) : (
          <div className="cm-empty-state">
            📭 ยังไม่มีการเลือกตอนเพื่อดูฉากย่อย กรุณาเลือกดูรายชื่อตอนจากเมนูด้านขวามือค่ะ
          </div>
        )}
      </div>

      <aside className="cm-sidebar">
        <div className="cm-sidebar__header">
          ☰ รายชื่อตอนทั้งหมด ({chapters.length})
        </div>

        <button className="cm-sidebar__add" onClick={openCreateChapterForm}>
          ✨ สร้างตอนใหม่
        </button>

        {isCreatingChapter && (
          <div className="cm-sidebar__new-form">
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#b91c1c" }}>กรอกข้อมูลตอนก่อนกดบันทึก</div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12.5px", fontWeight: 600, color: "#4b5563" }}>ลำดับตอน</label>
                <input
                  className="cm-input"
                  type="number"
                  min="1"
                  value={draftChapterEpisode}
                  onChange={(e) => setDraftChapterEpisode(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12.5px", fontWeight: 600, color: "#4b5563" }}>ชื่อบท</label>
                <input
                  className="cm-input"
                  value={draftChapterTitle}
                  onChange={(e) => setDraftChapterTitle(e.target.value)}
                  placeholder="เช่น ตอนที่ 1: จุดเริ่มต้น"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12.5px", fontWeight: 600, color: "#4b5563" }}>สถานะบท</label>
                <select
                  className="cm-select"
                  value={draftChapterStatus}
                  onChange={(e) => setDraftChapterStatus(e.target.value)}
                >
                  <option value="draft">ฉบับร่าง</option>
                  <option value="published">เผยแพร่</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={cancelCreateChapter} type="button">
                  ยกเลิก
                </button>
                <button className="cm-btn cm-btn--sm" onClick={handleAddChapter} type="button">
                  บันทึกตอน
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="cm-sidebar__list">
          {chapters.map((ch, index) => {
            const chId = ch.id ?? ch.ID ?? ch.chapter_id ?? ch.ChapterID ?? index;
            const chTitle = ch.title ?? ch.Title ?? `ตอนที่ ${index + 1}`;
            const chStatus = (ch.status || ch.Status || "draft").toString().toLowerCase();
            const isChapterPublished = chStatus === "published" || chStatus === "active";

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
                    <span className="cm-sidebar__item-status" style={{ fontSize: 11, color: isChapterPublished ? "#16a34a" : "#b91c1c", marginTop: 4 }}>
                      {isChapterPublished ? "เผยแพร่" : "ฉบับร่าง"}
                    </span>
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
