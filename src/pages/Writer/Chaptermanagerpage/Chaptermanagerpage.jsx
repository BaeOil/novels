// src/pages/Writer/ChapterManager/ChapterManagerPage.jsx

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import "./ChapterManagerPage.css";
import { getNovelStatusInfo } from "../../../utils/novelStatus";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:9000";
const getToken = () => localStorage.getItem("token");

// 🕒 ฟังก์ชันแปลงเวลาแบบ Global ตัวเดียวใช้ทั้งไฟล์
const formatThaiDate = (dateString, includeTime = false) => {
  if (!dateString) return "ไม่ระบุ";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString.split("T")[0] || dateString;

    if (includeTime) {
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' น.';
    }

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
  if (!cover || typeof cover !== "string") return null;
  return cover.replace("http://minio:9000", IMAGE_BASE_URL);
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

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "ยืนยัน" }) => {
  if (!isOpen) return null;
  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal-box">
        <h3 className="cm-modal-box__title">{title}</h3>
        <p className="cm-modal-box__desc">{message}</p>
        <div className="cm-modal-box__actions">
          <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={onCancel}>ยกเลิก</button>
          <button className="cm-btn cm-btn--sm cm-btn--danger-solid" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ข้อความ default ของแบนเนอร์แจ้งเตือนแบน — ส่งผ่าน props มา override ได้ ไม่ hardcode ในตัว UI
const BAN_NOTICE_DEFAULTS = {
  reason: "ตรวจพบเนื้อหาที่ละเมิดข้อตกลงและเงื่อนไขการใช้งานของแพลตฟอร์ม",
  solution: "โปรดตรวจสอบและแก้ไขเนื้อหาให้ถูกต้องตามกฎระเบียบชุมชน จากนั้นกดปุ่มส่งเรื่องขอปลดแบนเพื่อแจ้งแอดมิน",
};

// 🔒 ข้อความแจ้งเตือนเดียว ใช้ร่วมกันทุกจุดที่บล็อกการกระทำเมื่อนิยายถูกแบน (กันเขียนซ้ำหลายที่)
const BAN_ACTION_BLOCKED_MSG = "นิยายเรื่องนี้ถูกระงับการเผยแพร่ กรุณาตรวจสอบข้อหา แก้ไขเนื้อหา และส่งเรื่องขอปลดแบนให้แอดมินตรวจสอบก่อน";

// เรียกก่อนทำ action ใดๆที่มีผลต่อการเผยแพร่ (สร้าง/ลบ/เผยแพร่ตอน-ฉาก ฯลฯ) — คืนค่า true ถ้าโดนบล็อก (และ alert แจ้งให้แล้ว)
const blockIfBanned = (novelOrStatusInfo) => {
  const isBanned = novelOrStatusInfo?.isBanned ?? getNovelStatusInfo(novelOrStatusInfo)?.isBanned;
  if (isBanned) {
    alert(BAN_ACTION_BLOCKED_MSG);
    return true;
  }
  return false;
};

const BanWarningBanner = ({
  reason = BAN_NOTICE_DEFAULTS.reason,
  solution = BAN_NOTICE_DEFAULTS.solution,
  onRequestAppeal,
}) => {
  return (
    <div className="cm-ban-banner" role="alert">
      <div className="cm-ban-banner__icon">🚫</div>
      <div className="cm-ban-banner__body">
        <h3 className="cm-ban-banner__title">นิยายเรื่องนี้ถูกระงับการเผยแพร่ (Banned)</h3>
        <p className="cm-ban-banner__text"><strong>สาเหตุ:</strong> {reason}</p>
        <p className="cm-ban-banner__text"><strong>วิธีแก้ไข:</strong> {solution}</p>
      </div>
      <div className="cm-ban-banner__action">
        <button type="button" className="cm-btn cm-btn--sm cm-btn--danger" onClick={onRequestAppeal}>
          📨 ส่งเรื่องขอปลดแบน
        </button>
      </div>
    </div>
  );
};

const AppealModal = ({ isOpen, onSubmit, onCancel, isSubmitting = false }) => {
  const [reasonText, setReasonText] = useState("");

  useEffect(() => {
    if (isOpen) setReasonText("");
  }, [isOpen]);

  if (!isOpen) return null;
  const trimmedReason = reasonText.trim();

  return (
    <div className="cm-modal-overlay">
      <div className="cm-modal-box">
        <h3 className="cm-modal-box__title">ส่งเรื่องขอปลดแบน</h3>
        <p className="cm-modal-box__desc">
          กรุณาชี้แจงรายละเอียดการแก้ไขหรือเหตุผลที่ต้องการขอปลดแบนนิยายเรื่องนี้ ทีมงานจะตรวจสอบและติดต่อกลับ
        </p>
        <textarea
          className="cm-input cm-modal-box__textarea"
          rows={5}
          placeholder="พิมพ์ข้อความชี้แจงของคุณที่นี่..."
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="cm-modal-box__actions">
          <button type="button" className="cm-btn cm-btn--outline cm-btn--sm" onClick={onCancel} disabled={isSubmitting}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="cm-btn cm-btn--sm cm-btn--primary"
            onClick={() => onSubmit(trimmedReason)}
            disabled={isSubmitting || !trimmedReason}
          >
            {isSubmitting ? "กำลังส่ง..." : "ยืนยันส่งเรื่อง"}
          </button>
        </div>
      </div>
    </div>
  );
};

const NovelBanner = ({ novel, chapters, onEdit, onToggleStatus, isUpdatingNovelStatus = false }) => {
  if (!novel) return <div className="cm-banner-loading">กำลังโหลดรายละเอียดนิยาย...</div>;

  const title = novel.title || "นิยายเรื่องนี้ยังไม่ได้ตั้งชื่อ";
  const captions = novel.captions || novel.caption || novel.introduction || "ยังไม่มีเรื่องย่อ...";
  const coverImage = formatNovelCoverImage(novel.cover_image || novel.coverImage || novel.coverUrl || novel.cover_url);
  const coverBg = novel.cover_bg || "var(--pink-100)";
  const coverEmoji = novel.cover_emoji || "📖";

  const updatedAt = novel?.updated_at || novel?.UpdatedAt || novel?.created_at || novel?.CreatedAt;

  const chapterCount = chapters?.length ?? 0;
  const categoryNames = getNovelCategoryNames(novel);
  const statusInfo = getNovelStatusInfo(novel);
  const isCompletedNovel = statusInfo.isCompleted;
  const isPublishedNovel = statusInfo.isPublished;

  const sceneCount = novel?.scene_count ?? novel?.sceneCount ?? novel?.total_scenes ?? novel?.totalScenes ?? chapters?.reduce((total, ch) => {
    const chScenes = ch.scenes || ch.Scenes || [];
    return total + chScenes.length;
  }, 0) ?? 0;

  return (
    <div className="cm-banner flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="flex justify-between items-start w-full gap-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '24px' }}>
        <div className="cm-banner__left flex-1" style={{ flex: 1, minWidth: 0 }}>
          <div className="cm-banner__cover shrink-0" style={{ background: coverBg }}>
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

          <div className="cm-banner__info flex flex-col justify-center" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="cm-banner__title" style={{ marginTop: 0, marginBottom: '8px' }}>{title}</h2>
            <p className="cm-banner__synopsis" style={{ marginBottom: '12px' }}>{captions}</p>

            {categoryNames.length > 0 && (
              <div className="cm-banner__categories" style={{ margin: '0 0 12px 0' }}>
                {categoryNames.map((name, idx) => (
                  <span key={`novel-category-${idx}`} className="cm-banner__category-tag" style={{ color: '#4c1d95', backgroundColor: '#ede9fe', borderColor: '#ddd6fe' }}>
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div className="cm-banner__stats flex items-center flex-wrap gap-2" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>{chapterCount} ตอน</span>
              <span className="cm-banner__dot">·</span>
              <span style={{ fontWeight: 600, color: '#475569' }}>{sceneCount} ฉาก</span>
              <span className="cm-banner__dot">·</span>
              <span className="text-gray-500" style={{ color: '#64748b' }}>อัปเดตล่าสุด: {formatThaiDate(updatedAt, true)}</span>
            </div>
          </div>
        </div>

        <div 
          className="cm-banner__right shrink-0 flex items-center gap-2" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            flexShrink: 0,
            opacity: statusInfo.isBanned ? 0.7 : 1
          }}
        >
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
          <button 
            className="cm-btn cm-btn--outline cm-btn--sm" 
            onClick={(e) => {
              if (statusInfo.isBanned) {
                e.preventDefault();
                alert(BAN_ACTION_BLOCKED_MSG);
                return;
              }
              onEdit();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            แก้ไข
          </button>
          <button
            className={`cm-btn cm-btn--sm ${!isPublishedNovel ? 'cm-btn--primary bg-pink-500 border-pink-500 text-white' : 'cm-btn--outline'}`}
            style={{ ...(!isPublishedNovel ? { backgroundColor: '#fe9ad3', borderColor: '#fe9ad3', color: '#ffffff' } : {}) }}
            onClick={(e) => {
              if (statusInfo.isBanned) {
                e.preventDefault();
                alert(BAN_ACTION_BLOCKED_MSG);
                return;
              }
              onToggleStatus();
            }}
            disabled={isUpdatingNovelStatus}
          >
            {isUpdatingNovelStatus ? 'กำลังอัปเดต...' : (isPublishedNovel ? "เปลี่ยนเป็นฉบับร่าง" : "เผยแพร่เรื่องนี้")}
          </button>
        </div>
      </div>

      {!isPublishedNovel && !isCompletedNovel && (
        <div className="cm-banner__draft-note w-full mt-0" style={{ width: '100%', maxWidth: '100%', margin: '0', display: 'flex', alignItems: 'center' }}>
          ✨ นิยายยังเป็นฉบับร่าง — ผู้เขียนและผู้ดูแลเท่านั้นที่เห็นเรื่องนี้ และทุกตอนจะยังไม่แสดงให้ผู้อ่านเห็น
        </div>
      )}
    </div>
  );
};

const ChoiceRow = ({ choice, sceneOptions = [], currentChapterId, onUpdate, onCreate, onDelete, openConfirmDialog }) => {
  const choiceId = choice?.id ?? choice?.ID ?? choice?.choice_id ?? choice?.ChoiceID;
  const choiceText = choice?.label ?? choice?.Label ?? choice?.text ?? choice?.Text ?? "";
  const choiceTargetSceneId = choice?.to_scene_id ?? choice?.ToSceneID ?? choice?.target_scene_id ?? choice?.TargetSceneID ?? "";
  const fromSceneId = choice?.from_scene_id ?? choice?.fromSceneID;
  const isNew = choice?.temp === true || String(choiceId).startsWith("temp-");

  const [text, setText] = useState(choiceText);
  const [subScene, setSubScene] = useState(choiceTargetSceneId);

  // 📝 อาเรย์รวมฉากทั้งหมด
  const allScenes = (sceneOptions || []).flatMap((ch, index) => {
    const chTitle = ch.episode ?? ch.Episode ?? ch.title ?? ch.Title ?? `ตอนที่ ${index + 1}`;
    const chId = ch.id ?? ch.ID ?? ch.chapter_id ?? ch.ChapterID;
    const chScenes = (ch.scenes ?? ch.Scenes) || [];
    return chScenes.map((s) => ({
      value: s.id ?? s.ID ?? s.scene_id ?? s.SceneID,
      label: (s.title ?? s.Title) || "(ฉากไม่มีชื่อ)",
      chapterLabel: chTitle,
      chapterId: chId,
      type: s.type ?? s.Type,
    }));
  });

  const targetScene = allScenes.find((scene) => String(scene.value) === String(choiceTargetSceneId));

  // Initialize States
  const [scope, setScope] = useState(() => (targetScene ? (String(targetScene.chapterId) === String(currentChapterId) ? "same" : "other") : "same"));
  const [selectedChapterId, setSelectedChapterId] = useState(() => targetScene?.chapterId || currentChapterId);

  const [isEditing, setIsEditing] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const chapterOptions = (sceneOptions || []).map((ch) => ({
    value: ch.id ?? ch.ID ?? ch.chapter_id ?? ch.ChapterID,
    label: ch.title ?? ch.Title ?? "(ยังไม่มีชื่อบท)",
  }));

  // 🔍 กรองฉากปลายทางตาม Scope และ Chapter ที่เลือก
  const activeChapterId = scope === "same" ? currentChapterId : selectedChapterId;
  
  const availableTargetScenes = allScenes.filter((scene) => {
    // ต้องตรงกับ Chapter ที่เลือก
    if (String(scene.chapterId) !== String(activeChapterId)) return false;
    // ห้ามเลือกฉากตัวเอง
    if (String(scene.value) === String(fromSceneId)) return false;
    return true;
  });

  const selectedTargetScene = allScenes.find((scene) => String(scene.value) === String(subScene));

  const handleSaveChoice = async () => {
    if (!text || text.trim() === "") {
      alert("กรุณากรอกข้อความบนปุ่มทางเลือกก่อน");
      return;
    }

    if (!subScene || subScene === "") {
      alert("กรุณาเลือกฉากปลายทางที่ต้องการเชื่อมโยง");
      return;
    }

    // 🛑 ตรวจสอบห้ามเชื่อมโยงเข้าหาตัวเอง
    if (String(subScene) === String(fromSceneId)) {
      alert("❌ ไม่สามารถบันทึกได้: ระบบไม่อนุญาตให้สร้างช้อยส์โยงเข้าหาฉากตัวเอง");
      return;
    }

    const payload = {
      from_scene_id: parseInt(fromSceneId || currentChapterId, 10),
      to_scene_id: parseInt(subScene, 10) || 0,
      label: text.trim(),
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
        timeoutRef.current = setTimeout(() => {
          setShowSuccess(false);
          setIsEditing(false);
        }, 1200);
      } else {
        alert("❌ บันทึกไม่สำเร็จ: ตัวเลือกไม่สามารถเชื่อมโยงระบบได้");
      }
    } catch (err) {
      console.error("บันทึกตัวเลือกล้มเหลว:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isCancelled) return null;

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
          <button
            className="cm-btn cm-btn--ghost cm-btn--sm"
            style={{ color: '#ef4444', padding: '4px 8px' }}
            onClick={() => openConfirmDialog?.({
              title: "ยืนยันการลบตัวเลือก",
              message: `คุณต้องการลบตัวเลือก "${text || 'ไม่มีข้อความ'}" ใช่หรือไม่?`,
              confirmLabel: "ลบเลย",
              action: async () => {
                if (choiceId) {
                  await onDelete?.(choiceId, isNew);
                }
              }
            })}
            title="ลบทางเลือก"
          >
            🗑️
          </button>
        </div>
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
              <select 
                className="cm-select" 
                value={scope} 
                onChange={(e) => {
                  const nextScope = e.target.value;
                  setScope(nextScope);
                  setSubScene(""); // ล้างค่าฉากเมื่อสลับโหมด
                  if (nextScope === "same") {
                    setSelectedChapterId(currentChapterId);
                  } else {
                    const firstOtherCh = chapterOptions.find((ch) => String(ch.value) !== String(currentChapterId));
                    if (firstOtherCh) setSelectedChapterId(firstOtherCh.value);
                  }
                }}
              >
                <option value="same">ไปฉากในตอนเดียวกัน</option>
                <option value="other">ไปฉากในตอนอื่น</option>
              </select>
            </div>

            {scope === "other" && (
              <div className="cm-choice__field" style={{ flex: 1 }}>
                <label className="cm-choice__label" style={{ fontSize: '12.5px', fontWeight: 'bold' }}>เลือกตอนปลายทาง</label>
                <select 
                  className="cm-select" 
                  value={selectedChapterId || ""} 
                  onChange={(e) => {
                    setSelectedChapterId(e.target.value);
                    setSubScene(""); // ล้างค่าฉากเมื่อเปลี่ยนตอนปลายทาง
                  }}
                >
                  <option value="">-- เลือกตอน --</option>
                  {chapterOptions.filter((ch) => String(ch.value) !== String(currentChapterId)).map((ch) => (
                    <option key={`target-chapter-opt-${ch.value}`} value={ch.value}>{ch.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="cm-choice__field" style={{ flex: 1 }}>
              <label className="cm-choice__label" style={{ fontSize: '12.5px', fontWeight: 'bold' }}>เลือกฉากปลายทาง</label>
              <select 
                className="cm-select" 
                value={subScene || ""} 
                onChange={(e) => setSubScene(e.target.value)}
              >
                <option value="">{availableTargetScenes.length > 0 ? "-- กรุณาเลือกฉากปลายทาง --" : "-- ไม่มีฉากที่เลือกได้ --"}</option>
                {availableTargetScenes.map((s) => (
                  <option key={`target-scene-opt-${s.value}`} value={s.value}>{s.chapterLabel} › {s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            className="cm-btn cm-btn--outline cm-btn--sm"
            type="button"
            onClick={() => {
              if (isNew) {
                setIsCancelled(true);
                if (choiceId) onDelete?.(choiceId, true);
              } else {
                setIsEditing(false);
              }
            }}
          >
            ยกเลิก
          </button>
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
  );
};

const SceneCard = ({
  scene,
  chapterId,
  chapterNumber,
  sceneIndex,
  onWrite,
  fetchScenes,
  allChapters,
  openConfirmDialog,
  isNovelBanned = false
}) => {
  const sceneId = scene?.scene_id ?? scene?.id ?? scene?.ID ?? scene?.SceneID;
  const sceneTitle = scene?.title ?? scene?.Title ?? `ฉากย่อยที่ ${sceneIndex}`;
  const sceneContent = scene?.content ?? scene?.Content ?? "";
  const sceneChoices = (scene?.choices ?? scene?.Choices) || [];

  const sceneType = (scene?.type || scene?.Type || "").toString().toLowerCase();
  const isStartScene = sceneType === "start" || scene?.is_start_scene || scene?.isStart;
  const sceneStatus = (scene?.status || scene?.Status || (scene?.isPublished || scene?.is_published ? "published" : "draft") || "draft").toString().toLowerCase();
  const isPublishedScene = sceneStatus === "published";
  const isEnding = sceneType === "ending" || Boolean(scene?.ending_title || scene?.EndingTitle || scene?.endingTitle);
  const endingTitle = (scene?.ending_title ?? scene?.EndingTitle ?? scene?.endingTitle ?? "").trim();
  const endingType = (scene?.ending_type ?? scene?.EndingType ?? scene?.endingType ?? "").trim();
  const isChapterOneScene = Number(chapterNumber) === 1;

  const stripHtmlTags = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const cleanTextPreview = stripHtmlTags(sceneContent);
  const [isBodyOpen, setIsBodyOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newChoices, setNewChoices] = useState([]);
  const [isUpdatingSceneStatus, setIsUpdatingSceneStatus] = useState(false);

  useEffect(() => {
    setNewChoices([]);
  }, [sceneId]);

  const allSceneChoices = [...sceneChoices, ...newChoices];
  const choiceCount = allSceneChoices.length;

  const formatEndingText = () => {
    const typeSuffix = endingType ? `(${endingType})` : "";
    if (!endingTitle) {
      return `ฉากจบ ${typeSuffix}`.trim();
    } else {
      return `ฉากจบ : ${endingTitle} ${typeSuffix}`.trim();
    }
  };

  const handleAddChoice = () => {
    if (!sceneId) return;
    const availableTargets = (allChapters || []).flatMap((ch) => {
      const chScenes = (ch.scenes ?? ch.Scenes) || [];
      return chScenes.map((s) => ({
        id: s.scene_id ?? s.id ?? s.ID ?? s.SceneID,
        type: s.type ?? s.Type,
      }));
    }).filter((s) => String(s.id) !== String(sceneId));

    const targetScene = availableTargets.find((s) => s.type !== "start") || availableTargets[0];
    if (!targetScene) {
      alert("ไม่พบฉากปลายทางที่ใช้สร้างทางเลือกได้ กรุณาสร้างฉากเพิ่มก่อน");
      return;
    }

    const uniqueTempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNewChoices((prev) => [...prev, { id: uniqueTempId, temp: true, from_scene_id: sceneId, label: "", to_scene_id: "" }]);
    setIsBodyOpen(true);
  };

  const handleApplyChoice = async (choiceId, updatedData) => {
    if (!choiceId) return false;
    try {
      const authToken = getToken();
      const res = await fetch(`${API_BASE}/choices/${choiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) { await fetchScenes(); return true; }
      return false;
    } catch (err) { console.error(err); return false; }
  };

  const handleDeleteChoice = async (choiceId, isNew) => {
    if (isNew || String(choiceId).startsWith("temp-")) {
      setNewChoices((prev) => prev.filter((c) => String(c.id) !== String(choiceId)));
      return;
    }

    try {
      const authToken = getToken();
      const res = await fetch(`${API_BASE}/choices/${choiceId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) fetchScenes();
    } catch (err) { console.error(err); }
  };

  const handleDeleteScene = async (targetId) => {
    if (!targetId) return;
    try {
      const authToken = getToken();
      const res = await fetch(`${API_BASE}/scenes/${targetId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (res.ok) {
        await fetchScenes();
        return;
      }

      const errorText = await res.text().catch(() => "");
      let displayMessage = "ไม่สามารถลบฉากนี้ได้ กรุณาลองซ้ำอีกครั้ง";

      if (res.status === 404 || errorText.toLowerCase().includes("404 page not found")) {
        displayMessage = "ไม่พบข้อมูลฉากนี้ในระบบ (อาจถูกลบไปแล้ว)";
      } else {
        try {
          const errorJson = JSON.parse(errorText);

          if (errorJson.message === "Cannot delete scene with incoming choices") {
            displayMessage = "ไม่สามารถลบฉากนี้ได้ เนื่องจากมีตัวเลือกเชื่อมโยงอยู่ กรุณาลบหรือแก้ไขตัวเลือกดังกล่าวเพื่อดำเนินการต่อ";
          } else if (errorJson.message === "Start scene cannot be deleted") {
            displayMessage = "ไม่อนุญาตให้ลบ 'ฉากเริ่มต้น' ได้ (กรุณาตั้งฉากอื่นเป็นจุดเริ่มต้นก่อนทำการลบฉากนี้)";
          } else if (errorJson.message) {
            displayMessage = `เกิดข้อผิดพลาด: ${errorJson.message}`;
          }
        } catch (e) {
          if (errorText.includes("Cannot delete scene with incoming choices")) {
            displayMessage = "ไม่สามารถลบฉากนี้ได้ เนื่องจากมีตัวเลือกเชื่อมโยงอยู่ กรุณาลบหรือแก้ไขตัวเลือกดังกล่าวเพื่อดำเนินการต่อ";
          } else if (errorText) {
            displayMessage = errorText;
          }
        }
      }
      alert(displayMessage);
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการลบฉาก:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  const handleToggleSceneStatus = async () => {
    if (!sceneId) return;
    if (isNovelBanned) { alert(BAN_ACTION_BLOCKED_MSG); return; } // ⛔ ห้ามเผยแพร่ฉาก ถ้านิยายถูกแบน
    const nextStatus = isPublishedScene ? "draft" : "published";
    setIsUpdatingSceneStatus(true);

    try {
      const payload = {
        title: sceneTitle,
        content: sceneContent,
        type: isEnding ? "ending" : (sceneType || "normal"),
        status: nextStatus,
        is_ending: isEnding,
        ending_title: endingTitle,
        ending_type: endingType,
        ending_description: scene?.ending_description ?? scene?.endingDescription ?? scene?.EndingDescription ?? "",
      };

      const authToken = getToken();
      const res = await fetch(`${API_BASE}/scenes/${sceneId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "เปลี่ยนสถานะฉากไม่สำเร็จ");
      }
      await fetchScenes();
    } catch (err) {
      console.error(err);
      alert("เปลี่ยนสถานะฉากไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsUpdatingSceneStatus(false);
    }
  };

  return (
    <div className="cm-scene" id={`scene-card-${sceneId}`} style={{
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
        flexWrap: 'wrap',
        padding: '20px 24px',
        borderBottom: isBodyOpen ? '1px solid #f1f5f9' : 'none',
        boxSizing: 'border-box',
        gap: '16px 20px'
      }}>

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

              {isStartScene && (
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                  🚀 ฉากเริ่มต้น
                </span>
              )}

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

              <span style={{
                backgroundColor: isPublishedScene ? '#ecfdf5' : '#f8fafc',
                color: isPublishedScene ? '#166534' : '#334155',
                border: `1px solid ${isPublishedScene ? '#a7f3d0' : '#cbd5e1'}`,
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {isPublishedScene ? '🟢 เผยแพร่' : '🔴 ฉบับร่าง'}
              </span>
            </div>

            <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
              {cleanTextPreview ? cleanTextPreview.substring(0, 140) + "..." : "✍️ ฉากนี้ยังไม่มีรายละเอียดเนื้อเรื่อง กดเขียนเนื้อหาเพื่อเริ่มต้น"}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0, position: 'relative' }}>
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
            onClick={handleToggleSceneStatus}
            disabled={isUpdatingSceneStatus || isNovelBanned}
            title={isNovelBanned ? BAN_ACTION_BLOCKED_MSG : undefined}
            style={{
              fontSize: '13.5px',
              backgroundColor: isPublishedScene ? '#f8fafc' : '#ecfdf5',
              color: isPublishedScene ? '#334155' : '#166534',
              border: `1px solid ${isPublishedScene ? '#e2e8f0' : '#a7f3d0'}`,
              borderRadius: '20px',
              fontWeight: '700',
              padding: '7px 14px',
              cursor: isNovelBanned ? 'not-allowed' : 'pointer',
              opacity: isNovelBanned ? 0.55 : 1
            }}
          >
            {isUpdatingSceneStatus ? 'กำลังอัปเดต...' : isNovelBanned ? '🔒 ถูกระงับ' : isPublishedScene ? '🔴 เปลี่ยนเป็นฉบับร่าง' : '🟢 เผยแพร่ฉากนี้'}
          </button>

          <span
            style={{
              fontSize: '12.5px',
              backgroundColor: choiceCount > 0 ? '#fdf2f8' : '#f8fafc',
              color: choiceCount > 0 ? '#db2777' : '#94a3b8',
              border: `1px solid ${choiceCount > 0 ? '#fbcfe8' : '#e2e8f0'}`,
              borderRadius: '20px',
              fontWeight: 'bold',
              padding: '6px 14px',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            {choiceCount} ทางเลือก
          </span>

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

                {isChapterOneScene && !isStartScene && (
                  <>
                    <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                    <button
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 18px', fontSize: '14px', color: '#2563eb', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#eff6ff'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={async () => {
                        setIsMenuOpen(false);
                        try {
                          const authToken = getToken();
                          const res = await fetch(`${API_BASE}/scenes/${sceneId}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${authToken}`
                            },
                            body: JSON.stringify({
                              title: sceneTitle,
                              content: sceneContent,
                              type: 'start',
                              status: sceneStatus,
                              is_ending: false,
                              ending_title: endingTitle,
                              ending_type: endingType,
                              ending_description: scene?.ending_description ?? scene?.endingDescription ?? ''
                            })
                          });
                          if (!res.ok) {
                            const errorText = await res.text().catch(() => 'ไม่สามารถตั้งฉากเริ่มต้นได้');
                            alert(errorText || 'ไม่สามารถตั้งฉากเริ่มต้นได้');
                            return;
                          }
                          await fetchScenes();
                        } catch (err) {
                          console.error(err);
                          alert('ไม่สามารถตั้งฉากเริ่มต้นได้ กรุณาลองใหม่');
                        }
                      }}
                    >
                      ⭐ ตั้งเป็นฉากเริ่มต้น
                    </button>
                  </>
                )}

                <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                <button
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 18px', fontSize: '14px', color: '#ef4444', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#fef2f2'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    setIsMenuOpen(false);
                    openConfirmDialog?.({
                      title: "ยืนยันการลบฉาก",
                      message: `คุณแน่ใจหรือไม่ที่จะลบฉาก "${sceneTitle}"? เนื้อหาและตัวเลือกทั้งหมดที่เชื่อมมายังฉากนี้จะถูกลบออกถาวร`,
                      confirmLabel: "ลบเลย",
                      action: async () => {
                        await handleDeleteScene(sceneId);
                      }
                    });
                  }}
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
                  const choiceToken = getToken();
                  const res = await fetch(`${API_BASE}/choices`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${choiceToken}` },
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
              openConfirmDialog={openConfirmDialog}
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
    </div>
  );
};

const ChapterPanel = ({
  chapter,
  novel,
  onWrite,
  fetchScenes,
  allChapters,
  onAddScene,
  onDeleteChapter,
  openConfirmDialog
}) => {
  // 🔒 ล็อคเครื่องมือเผยแพร่ทั้งหมดของตอนนี้ ถ้านิยายเรื่องนี้โดนแบนอยู่
  const isNovelBanned = getNovelStatusInfo(novel).isBanned;
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [inputTitle, setInputTitle] = useState(chapter?.title ?? "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const chapterId = chapter?.id ?? chapter?.chapter_id ?? chapter?.ChapterID;
  const chapterTitle = chapter?.title ?? "บทที่ไม่มีชื่อ";
  const chapterNumber = chapter?.episode ?? "?";

  useEffect(() => {
    setInputTitle(chapter?.title ?? "");
    setIsEditingTitle(false);
  }, [chapterId, chapter?.title]);
  useEffect(() => {
    const target = sessionStorage.getItem("focusSceneTarget");
    if (!target || !isOpen) return;

    // หน่วงเวลาเล็กน้อย รอให้ API ดึงข้อมูลฉากใหม่มาวาดบนจอให้เสร็จก่อน
    const timer = setTimeout(() => {
      let element = null;

      // กรณีที่ 1: เพิ่งกดสร้างฉากใหม่ -> ให้เลื่อนไปหาฉากอันล่างสุดของตอนนี้
      if (target.startsWith("new_in_")) {
        const targetChId = target.replace("new_in_", "");
        if (String(targetChId) === String(chapterId)) {
          const scenes = chapter?.scenes || [];
          if (scenes.length > 0) {
            const lastScene = scenes[scenes.length - 1];
            const lastSceneId = lastScene?.scene_id ?? lastScene?.id ?? lastScene?.ID ?? lastScene?.SceneID;
            element = document.getElementById(`scene-card-${lastSceneId}`);
          }
        }
      }
      // กรณีที่ 2: เพิ่งกลับมาจากการแก้ไขฉาก -> เลื่อนไปหาฉากนั้นเลย
      else {
        element = document.getElementById(`scene-card-${target}`);
      }

      // ถ้าเจอเป้าหมาย ให้เลื่อนจอ + ทำไฮไลต์กรอบกระพริบให้ผู้ใช้สังเกตง่ายๆ
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // ไฮไลต์เรืองแสงสีชมพูแป๊บนึง
        const originalBoxShadow = element.style.boxShadow;
        element.style.transition = 'box-shadow 0.4s ease-out';
        element.style.boxShadow = '0 0 0 3px #db2777, 0 0 15px rgba(219, 39, 119, 0.4)';

        setTimeout(() => {
          element.style.boxShadow = originalBoxShadow || '0 8px 20px rgba(0, 0, 0, 0.04)';
        }, 2000);

        // เลื่อนเสร็จแล้วล้างความจำทิ้ง จะได้ไม่เลื่อนซ้ำเวลา Refresh หน้าเว็บ
        sessionStorage.removeItem("focusSceneTarget");
      }
    }, 600); // 600ms ให้จังหวะ UI โหลดนิ่งสนิท

    return () => clearTimeout(timer);
  }, [chapter?.scenes, chapterId, isOpen]);

  const handleSaveTitle = async () => {
    if (!inputTitle.trim()) return alert("กรุณากรอกชื่อตอน");
    setIsSavingTitle(true);
    try {
      const authToken = getToken();
      const res = await fetch(`${API_BASE}/chapters/${chapterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          episode: Number(chapterNumber),
          title: inputTitle.trim(),
          status: chapter?.status || "draft"
        })
      });
      if (res.ok) {
        setIsEditingTitle(false);
        await fetchScenes();
      } else {
        alert("แก้ไขชื่อตอนไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleToggleStatus = async () => {
    if (blockIfBanned(novel)) return; // ⛔ ห้ามเปลี่ยนสถานะเผยแพร่ของตอน ถ้านิยายถูกแบน
    const currentStatus = (chapter?.status || chapter?.Status || "draft").toString().toLowerCase();
    const isPublishedChapter = currentStatus === "published" || currentStatus === "active";
    const nextStatus = isPublishedChapter ? "draft" : "published";

    setIsUpdatingStatus(true);
    try {
      const authToken = getToken();
      const chapterRes = await fetch(`${API_BASE}/chapters/${chapterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          episode: Number(chapterNumber),
          title: chapterTitle,
          status: nextStatus
        })
      });

      if (!chapterRes.ok) {
        throw new Error("เปลี่ยนสถานะตอนไม่สำเร็จ");
      }

      const sceneUpdates = (chapter?.scenes || []).map(async (scene) => {
        const sceneId = scene?.scene_id ?? scene?.id ?? scene?.ID ?? scene?.SceneID;
        if (!sceneId) return null;

        const sceneType = (scene?.type || scene?.Type || "normal").toString().toLowerCase();
        const nextSceneStatus = nextStatus;
        const isEnding = sceneType === "ending" || Boolean(scene?.ending_title || scene?.EndingTitle || scene?.endingTitle);

        const payload = {
          title: scene?.title ?? scene?.Title ?? "",
          content: scene?.content ?? scene?.Content ?? "",
          type: isEnding ? "ending" : (sceneType || "normal"),
          status: nextSceneStatus,
          is_ending: isEnding,
          ending_title: scene?.ending_title ?? scene?.EndingTitle ?? scene?.endingTitle ?? "",
          ending_type: scene?.ending_type ?? scene?.EndingType ?? scene?.endingType ?? "",
          ending_description: scene?.ending_description ?? scene?.endingDescription ?? scene?.EndingDescription ?? "",
        };

        const sceneRes = await fetch(`${API_BASE}/scenes/${sceneId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });

        if (!sceneRes.ok) {
          const errText = await sceneRes.text().catch(() => "");
          throw new Error(errText || `อัปเดตฉาก ${sceneId} ไม่สำเร็จ`);
        }

        return sceneId;
      });

      await Promise.all(sceneUpdates);
      await fetchScenes();
    } catch (err) {
      console.error(err);
      alert(err.message || "เปลี่ยนสถานะตอนไม่สำเร็จ");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getChapterLastUpdatedAt = (chapterData) => {
    const chapterTime = chapterData?.updated_at || chapterData?.UpdatedAt || chapterData?.updatedAt || chapterData?.created_at || chapterData?.CreatedAt;
    const sceneTimes = (chapterData?.scenes || chapterData?.Scenes || [])
      .map((scene) => scene?.updated_at || scene?.UpdatedAt || scene?.updatedAt)
      .map((time) => {
        const date = new Date(time);
        return isNaN(date.getTime()) ? null : date.getTime();
      })
      .filter((timestamp) => timestamp !== null);

    const chapterTimestamp = (() => {
      const date = new Date(chapterTime);
      return isNaN(date.getTime()) ? null : date.getTime();
    })();

    const latestTimestamp = [chapterTimestamp, ...sceneTimes].filter((ts) => ts !== null);
    if (!latestTimestamp.length) return chapterTime || "-";
    return new Date(Math.max(...latestTimestamp)).toISOString();
  };

  // 🔍 ตรวจสอบความผิดพลาดของสถานะ (UX Check)
  const isChapterDraft = (chapter?.status || "draft").toString().toLowerCase() === "draft";
  const hasPublishedScenes = (chapter?.scenes || []).some(s => (s.status || "draft").toString().toLowerCase() === "published");
  const isStatusConflict = isChapterDraft && hasPublishedScenes;

  return (
    <div className="cm-chapter-panel" style={{
      backgroundColor: '#ffffff', borderRadius: '20px', border: isStatusConflict ? '2px solid #ef4444' : '1.5px solid #fbcfe8',
      padding: '24px', marginBottom: '28px', boxShadow: isStatusConflict ? '0 4px 20px rgba(239, 68, 68, 0.15)' : '0 4px 15px rgba(219, 39, 119, 0.03)',
      position: 'relative', fontFamily: '"Sarabun", sans-serif', transition: 'all 0.3s ease'
    }}>

      {/* ⚠️ ป้ายเตือนกรณีลืมกดเผยแพร่ตอนหลัก */}
      {isStatusConflict && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px',
          padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: '700', lineHeight: 1.5 }}>
              นักอ่านจะไม่เห็นเนื้อหา! เนื่องจาก <span style={{ textDecoration: 'underline' }}>ตอนหลักยังเป็นฉบับร่าง</span> แต่คุณมีบางฉากย่อยเปิดเผยแพร่ไว้ด้านล่างแล้ว
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={isUpdatingStatus || isNovelBanned}
            title={isNovelBanned ? BAN_ACTION_BLOCKED_MSG : undefined}
            style={{
              backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '8px 16px',
              borderRadius: '20px', fontSize: '13px', fontWeight: '800', cursor: isNovelBanned ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.25)', transition: 'all 0.2s',
              opacity: isNovelBanned ? 0.55 : 1
            }}
          >
            {isUpdatingStatus ? "⏳ กำลังเปลี่ยน..." : isNovelBanned ? "🔒 ถูกระงับการเผยแพร่" : "🚀 เผยแพร่ตอนนี้เลย"}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '300px' }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'none', border: 'none', fontSize: '14px', color: '#64748b', cursor: 'pointer',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(90deg)', transition: 'transform 0.2s', padding: 0
            }}
          >
            ◀
          </button>

          <div style={{
            width: '64px', height: '64px', backgroundColor: '#fdf2f8', color: '#db2777',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', flexShrink: 0
          }}>
            {chapterNumber !== "?" ? String(chapterNumber).padStart(2, '0') : "?"}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            {isEditingTitle ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', flex: 1, maxWidth: '300px' }}
                />
                <button onClick={handleSaveTitle} disabled={isSavingTitle} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isSavingTitle ? "บันทึก..." : "✔"}
                </button>
                <button onClick={() => { setIsEditingTitle(false); setInputTitle(chapterTitle); }} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                  ✘
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  ตอนที่ {chapterNumber} : {chapterTitle}
                </h3>
                {/* 🟢🔴 ป้ายสถานะตอนหลักขนาดใหญ่เห็นชัด */}
                <span style={{
                  backgroundColor: isChapterDraft ? '#fee2e2' : '#dcfce7',
                  color: isChapterDraft ? '#991b1b' : '#15803d',
                  border: `1px solid ${isChapterDraft ? '#fca5a5' : '#86efac'}`,
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800'
                }}>
                  {isChapterDraft ? "📌 ฉบับร่าง" : "🌐 เผยแพร่แล้ว"}
                </span>
              </div>
            )}

            {!isEditingTitle && (
              <button
                onClick={() => setIsEditingTitle(true)}
                style={{
                  alignSelf: 'flex-start', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '4px 12px', fontSize: '13px', color: '#475569',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600'
                }}
              >
                ✏️ แก้ไขชื่อตอน
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span style={{
            backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a',
            padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            🎬 {chapter?.scenes?.length || 0} ฉาก
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
            อัปเดตล่าสุด {formatThaiDate(getChapterLastUpdatedAt(chapter), true)}
          </span>

          <button
            onClick={() => onAddScene && onAddScene(chapterId)}
            disabled={isNovelBanned}
            title={isNovelBanned ? BAN_ACTION_BLOCKED_MSG : undefined}
            style={{
              background: 'linear-gradient(135deg, #ff9dc9 0%, #f85096 100%)', color: '#ffffff', border: 'none',
              padding: '8px 18px', borderRadius: '20px', fontSize: '13.5px', fontWeight: '600',
              cursor: isNovelBanned ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 10px rgba(247, 82, 156, 0.25)', marginTop: '4px',
              opacity: isNovelBanned ? 0.55 : 1
            }}
          >
            ➕ เพิ่มฉาก
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '16px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: chapter?.status === 'published' ? '#16a34a' : '#991b1b' }}>
          การแสดงผลบนหน้านิยาย: {chapter?.status === 'published' ? '🟢 ผู้อ่านมองเห็นเนื้อหาแล้ว' : '🔴 ซ่อนอยู่ (ฉบับร่าง)'}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleToggleStatus}
            disabled={isUpdatingStatus || isNovelBanned}
            title={isNovelBanned ? BAN_ACTION_BLOCKED_MSG : undefined}
            style={{
              backgroundColor: chapter?.status === 'published' ? '#f1f5f9' : '#ffffff',
              border: chapter?.status === 'published' ? '1px solid #cbd5e1' : '1.5px solid #16a34a',
              color: chapter?.status === 'published' ? '#334155' : '#16a34a', padding: '6px 16px',
              borderRadius: '8px', fontSize: '13.5px', fontWeight: '700',
              cursor: isNovelBanned ? 'not-allowed' : 'pointer',
              opacity: isNovelBanned ? 0.55 : 1
            }}
          >
            {isUpdatingStatus ? "⏳ กำลังเปลี่ยน..." : isNovelBanned ? "🔒 ถูกระงับการเผยแพร่" : chapter?.status === 'published' ? "เปลี่ยนเป็นฉบับร่าง" : "🚀 เผยแพร่ตอนนี้"}
          </button>

          <button
            onClick={() => onDeleteChapter && onDeleteChapter(chapterId)}
            style={{
              backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444',
              padding: '6px 16px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            🗑️ ลบตอนนี้
          </button>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #e2e8f0' }}>
          {(chapter?.scenes || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', fontWeight: '500' }}>
                ยังไม่มีฉากย่อยในบทนี้ กดปุ่ม "เพิ่มฉากย่อย" ด้านบนเพื่อเริ่มร้อยเรียงพล็อตย่อยของคุณเลย 📖
              </p>
            </div>
          ) : (
            (chapter?.scenes || []).map((scene, index) => (
              <SceneCard
                key={scene?.scene_id || scene?.id || index}
                scene={scene}
                chapterId={chapterId}
                chapterNumber={chapterNumber}
                sceneIndex={index + 1}
                onWrite={onWrite}
                fetchScenes={fetchScenes}
                allChapters={allChapters}
                openConfirmDialog={openConfirmDialog}
                isNovelBanned={isNovelBanned}
              />
            ))
          )}
        </div>
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
  const [isUpdatingNovelStatus, setIsUpdatingNovelStatus] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(() => {
    return sessionStorage.getItem(`activeChapter_${currentNovelId}`) || null;
  });

  // บันทึกค่า activeChapterId ทันทีที่มีการสลับตอน
  useEffect(() => {
    if (activeChapterId && currentNovelId) {
      sessionStorage.setItem(`activeChapter_${currentNovelId}`, activeChapterId);
    }
  }, [activeChapterId, currentNovelId]);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [draftChapterTitle, setDraftChapterTitle] = useState("");
  const [draftChapterStatus, setDraftChapterStatus] = useState("draft");
  const [lockedChapterIds, setLockedChapterIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const fetchNovelAndChapters = async (isSilent = false) => {
    if (!currentNovelId) {
      if (!isSilent) setLoading(false);
      return;
    }

    // ถ้าเป็นการโหลดแบบเงียบ (Silent) จะไม่รัน setLoading(true) ทำให้หน้าเว็บไม่กระตุกหรือพับกล่องลง
    if (!isSilent) setLoading(true);
    const authToken = getToken();

    try {
      const resNovel = await fetch(`${API_BASE}/novels/${currentNovelId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        }
      });
      if (resNovel.ok) {
        const result = await resNovel.json();
        const actualNovelData = result.novel || result.data?.novel || result.data || result;
        const normalized = actualNovelData || {};
        normalized.status = (normalized.status || normalized.Status || "").toString().toLowerCase();
        normalized.is_published = normalized.is_published ?? normalized.isPublished ?? false;
        normalized.is_completed = normalized.is_completed ?? normalized.isCompleted ?? false;
        setNovel(normalized);
      }
    } catch (err) {
      console.error("โหลดข้อมูลนิยายล้มเหลว:", err);
    }

    try {
      const resChapters = await fetch(`${API_BASE}/novels/${currentNovelId}/chapters`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
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
              // 1. ดึงค่าตอนล่าสุดที่เคยเลือกไว้จาก Session Storage มาเช็กด้วย
              const savedId = sessionStorage.getItem(`activeChapter_${currentNovelId}`);
              const targetId = prev || savedId;

              const firstId = actualChapters[0].id ?? actualChapters[0].ID ?? actualChapters[0].chapter_id ?? actualChapters[0].ChapterID;

              // 2. ถ้าไม่มีค่า prev หรือค่าใน session เลย ให้แสดงตอนที่ 1
              if (!targetId) return firstId;

              // 3. ตรวจสอบว่าตอนที่เลือกล่าสุด ยังมีอยู่ในฐานข้อมูลไหม (กันกรณีลบตอนไปแล้ว)
              const isValueExist = actualChapters.some(c => String(c.id ?? c.ID ?? c.chapter_id ?? c.ChapterID) === String(targetId));
              return isValueExist ? targetId : firstId;
            });
          }
        }
      }
    } catch (err) {
      console.error("โหลดรายชื่อตอนล้มเหลว:", err);
    } finally {
      // ถ้าเป็นการโหลดแบบเงียบ ก็ไม่ต้องไปสั่งปิด loading เพื่อไม่ให้มันเด้งกวนใจ
      if (!isSilent) setLoading(false);
    }
  };

  const computeLockedChapters = (allChapters) => {
    const lockSet = new Set();
    const sceneToChapter = new Map();
    const targetSceneIds = new Set();

    allChapters.forEach((chapter) => {
      const scenes = Array.isArray(chapter.scenes) ? chapter.scenes : [];
      scenes.forEach((scene) => {
        const sceneId = scene?.scene_id ?? scene?.id ?? scene?.ID ?? scene?.SceneID;
        if (sceneId) {
          const chapterKey = String(chapter.id ?? chapter.ID ?? chapter.chapter_id ?? chapter.ChapterID ?? "");
          sceneToChapter.set(String(sceneId), chapterKey);
        }
      });
    });

    allChapters.forEach((chapter) => {
      const chapterKey = String(chapter.id ?? chapter.ID ?? chapter.chapter_id ?? chapter.ChapterID ?? "");
      const scenes = Array.isArray(chapter.scenes) ? chapter.scenes : [];
      scenes.forEach((scene) => {
        const choices = Array.isArray(scene.choices) ? scene.choices : Array.isArray(scene.Choices) ? scene.Choices : [];
        if (choices.length > 0 && chapterKey) {
          lockSet.add(chapterKey);
        }
        choices.forEach((choice) => {
          const toSceneId = choice?.to_scene_id ?? choice?.ToSceneID ?? choice?.toSceneId ?? choice?.toSceneID ?? choice?.targetSubScene ?? "";
          if (toSceneId !== undefined && toSceneId !== null && String(toSceneId).trim() !== "") {
            targetSceneIds.add(String(toSceneId));
          }
        });
      });
    });

    targetSceneIds.forEach((sceneId) => {
      const chapterKey = sceneToChapter.get(sceneId);
      if (chapterKey) {
        lockSet.add(chapterKey);
      }
    });

    return lockSet;
  };

  useEffect(() => {
    if (Array.isArray(chapters)) {
      setLockedChapterIds(computeLockedChapters(chapters));
    }
  }, [chapters]);

  useEffect(() => {
    if (currentNovelId) {
      fetchNovelAndChapters();
    }
  }, [currentNovelId]);

  const openCreateChapterForm = () => {
    setDraftChapterTitle("");
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
    const statusInfo = getNovelStatusInfo(novel);
    if (statusInfo.isBanned) {
      alert('นิยายถูกระงับ ไม่สามารถเพิ่มตอนได้');
      return;
    }
    try {
      const episodeNumber = (chapters?.length || 0) + 1;
      const title = draftChapterTitle?.trim() || `ตอนที่ ${episodeNumber}`;
      const payload = {
        novel_id: Number(currentNovelId),
        episode: episodeNumber,
        title,
        status: draftChapterStatus || "draft"
      };

      const authToken = getToken();
      if (!authToken) {
        alert("กรุณาเข้าสู่ระบบก่อนสร้างตอน");
        return;
      }
      const res = await fetch(`${API_BASE}/chapters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsCreatingChapter(false);
        setDraftChapterTitle("");
        setDraftChapterStatus("draft");
        const data = await res.json();
        const createdChapterId = data.chapter_id ?? data.chapter?.id ?? data.chapter?.ID ?? data.chapter?.chapter_id ?? data.data?.chapter_id;
        await fetchNovelAndChapters(true);
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

  const reorderChaptersOnServer = async (orderedIds = []) => {
    if (!currentNovelId || !Array.isArray(orderedIds)) return;
    const authToken = getToken();
    if (!authToken) return;
    try {
      await fetch(`${API_BASE}/novels/${currentNovelId}/chapters/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ order: orderedIds }),
      });
    } catch (err) {
      console.error('Reorder chapters error', err);
    }
  };

  const handleAddScene = async (chapterId) => {
    if (!chapterId) return;
    if (getNovelStatusInfo(novel).isBanned) {
      alert('นิยายถูกระงับ ไม่สามารถเพิ่มฉากได้');
      return;
    }
    sessionStorage.setItem("focusSceneTarget", `new_in_${chapterId}`);
    if (typeof onNavigate === "function") {
      const novelTitleVal = novel?.title || novel?.novelTitle || novel?.name || "";
      const chapterObj = (chapters || []).find(c => String(c.id ?? c.chapter_id ?? c.ChapterID ?? c.chapterId) === String(chapterId));
      const chapterTitleVal = chapterObj?.title || chapterObj?.Title || chapterObj?.chapterTitle || "";
      onNavigate("scene-editor", { novelId: currentNovelId, chapterId, sceneId: "new", novelTitle: novelTitleVal, chapterTitle: chapterTitleVal });
    }
  };

  const closeConfirmDialog = () => setConfirmDialog(null);

  const executeConfirmAction = async () => {
    if (!confirmDialog?.action) {
      closeConfirmDialog();
      return;
    }
    try {
      await confirmDialog.action();
    } catch (err) {
      console.error("Confirm action failed:", err);
    } finally {
      closeConfirmDialog();
    }
  };

  const openConfirmDialog = ({ title, message, action, confirmLabel = "ยืนยัน" }) => {
    setConfirmDialog({ title, message, action, confirmLabel });
  };

  const handleToggleNovelStatus = async () => {
    if (!currentNovelId || !novel) return;
    const currentStatusInfo = getNovelStatusInfo(novel);
    if (currentStatusInfo.isBanned) {
      alert(BAN_ACTION_BLOCKED_MSG);
      return;
    }
    const nextStatus = currentStatusInfo.isPublished ? "draft" : "published";
    const title = nextStatus === "published" ? "เผยแพร่นิยาย" : "เปลี่ยนนิยายเป็นฉบับร่าง";
    const message = nextStatus === "published"
      ? "คุณต้องการเผยแพร่นิยายเรื่องนี้หรือไม่?\n\nเมื่อเผยแพร่แล้ว นิยายและตอนทั้งหมดที่เผยแพร่จะเห็นได้สำหรับผู้อ่าน"
      : "คุณต้องการเปลี่ยนนิยายเรื่องนี้กลับเป็นฉบับร่างหรือไม่?\n\nนิยายจะถูกซ่อนจากผู้อ่าน และตอนทั้งหมดจะไม่แสดง";

    openConfirmDialog({
      title,
      message,
      confirmLabel: "ตกลง",
      action: async () => {
        if (currentStatusInfo.isBanned) {
          alert("นิยายเรื่องนี้ถูกระงับการเผยแพร่ กรุณาตรวจสอบและส่งเรื่องขอปลดแบนให้แอดมินตรวจสอบก่อน");
          return;
        }
        setIsUpdatingNovelStatus(true);
        try {
          const payload = {
            status: nextStatus,
            is_published: nextStatus === "published",
            is_completed: currentStatusInfo.isCompleted,
          };

          const authToken = getToken();
          if (!authToken) return;
          const res = await fetch(`${API_BASE}/novels/${currentNovelId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error("อัปเดตสถานะนิยายไม่สำเร็จ");
          await fetchNovelAndChapters(true);
        } finally {
          setIsUpdatingNovelStatus(false);
        }
      }
    });
  };

  const handleOpenAppealModal = () => setIsAppealModalOpen(true);

  const handleCloseAppealModal = () => {
    if (isSubmittingAppeal) return; // กันปิด modal ระหว่างกำลังส่งอยู่
    setIsAppealModalOpen(false);
  };

  const handleSubmitAppeal = async (reasonText) => {
    if (!currentNovelId || !reasonText.trim()) return;
    setIsSubmittingAppeal(true);
    const authToken = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/writer/novels/appeal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ novel_id: currentNovelId, reason: reasonText.trim() })
      });

      if (!res.ok) throw new Error(`ส่งคำขอไม่สำเร็จ (status ${res.status})`);

      setIsAppealModalOpen(false);
      alert("ส่งเรื่องขอปลดแบนเรียบร้อยแล้ว");
    } catch (err) {
      console.error("ส่งเรื่องขอปลดแบนล้มเหลว:", err);
      alert("เกิดข้อผิดพลาด ไม่สามารถส่งเรื่องขอปลดแบนได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const handleOpenPreview = () => {
    const idToOpen = currentNovelId || (novel && (novel.id || novel.novel_id || novel.novelId));
    if (!idToOpen) {
      alert("ไม่พบรหัสนิยายสำหรับพรีวิว");
      return;
    }
    const previewUrl = `/novel/${idToOpen}?preview=true`;
    try {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      window.location.href = previewUrl;
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!chapterId) return;
    if (getNovelStatusInfo(novel).isBanned) {
      alert('นิยายถูกระงับ ไม่สามารถลบตอนได้');
      return;
    }
    openConfirmDialog({
      title: "ยืนยันการลบตอน",
      message: "การกระทำนี้จะลบฉากทั้งหมดในตอนนี้ด้วย",
      confirmLabel: "ลบเลย",
      action: async () => {
        try {
          const authToken = getToken();
          if (!authToken) return;
          const res = await fetch(`${API_BASE}/chapters/${chapterId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${authToken}`
            }
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            if (res.status === 404 || errText.toLowerCase().includes("404 page not found")) {
              alert("ไม่พบข้อมูลตอนนี้ในระบบ (อาจถูกลบไปแล้ว)");
            } else {
              alert("ไม่สามารถลบตอนได้ กรุณาลองใหม่");
            }
            return;
          }
          if (String(activeChapterId) === String(chapterId)) {
            setActiveChapterId(null);
          }
          await fetchNovelAndChapters(true);
        } catch (err) {
          console.error("เกิดข้อผิดพลาดในการลบตอน:", err);
        }
      }
    });
  };

  const activeChapter = chapters.find((c) => {
    const id = c.id ?? c.ID ?? c.chapter_id ?? c.ChapterID;
    return String(id) === String(activeChapterId);
  });
  const filteredChapters = chapters.filter((ch) => {
    const title = (ch.title ?? ch.Title ?? "").toLowerCase();
    const episode = String(ch.episode ?? ch.Episode ?? "");
    const search = searchTerm.toLowerCase().trim();

    return title.includes(search) || episode.includes(search);
  });
  if (loading) {
    return <LoadingScreen message="กำลังโหลดข้อมูลหน้าจัดการตอน..." />;
  }

  return (
    <div className="cm-layout">
      <div className="cm-main">
        <div className="cm-topbar">
          <div>
            <h1 className="cm-topbar__title">จัดการตอนนิยาย</h1>
            <p className="cm-topbar__sub">จัดการรายการตอนและรายละเอียดฉากของคุณ</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="se-header__btn se-header__btn--preview se-header__btn--preview-inline"
              type="button"
              onClick={handleOpenPreview}
              style={{ padding: "8px 14px", borderRadius: "10px", fontSize: "12px", height: "auto", margin: 0 }}
            >
              ▶ ทดลองอ่าน
            </button>
            <button
              className="cm-btn cm-btn--outline"
              onClick={() => onNavigate("story-tree", { novelId: currentNovelId })}
            >
              📊 โครงสร้างเนื้อเรื่อง
            </button>
          </div>
        </div>

        {(novel?.status === "banned" ||
          novel?.status === "ban" ||
          novel?.status === "suspended" ||
          novel?.is_banned === true ||
          novel?.isBanned === true) && (
            <BanWarningBanner
              reason={novel?.ban_reason || novel?.banReason}
              onRequestAppeal={handleOpenAppealModal}
            />
          )}

        <NovelBanner
          novel={novel}
          chapters={chapters}
          onEdit={() => onNavigate("create-novel", { novelId: currentNovelId })}
          onToggleStatus={handleToggleNovelStatus}
          isUpdatingNovelStatus={isUpdatingNovelStatus}
        />

        {/* 🌟 เช็กกรณีนิยายเรื่องนี้ยังไม่มีตอนแรก (`chapters.length === 0`) */}
        {chapters.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            marginTop: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '2.5px dashed #fbcfe8',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(219, 39, 119, 0.02)'
          }}>
            <div style={{
              fontSize: '54px',
              marginBottom: '16px',
              animation: 'bounce 2s infinite',
              display: 'inline-block'
            }}>✍️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              เริ่มรังสรรค์โลกจินตนาการของคุณกัน!
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', maxWidth: '380px', lineHeight: '1.6' }}>
              นิยายใหม่เรื่องนี้ยังไม่มีตอนแรกอยู่เลย มาร่วมเขียนก้าวแรกของเนื้อเรื่องโดยการเพิ่มตอนใหม่ตรงนี้กันเถอะ
            </p>
            <button
              onClick={openCreateChapterForm}
              disabled={getNovelStatusInfo(novel).isBanned}
              style={{
                background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '24px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(219, 39, 119, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              ✨ สร้างตอนแรกที่นี่เลย
            </button>
          </div>
        ) : activeChapter ? (
          <ChapterPanel
            chapter={activeChapter}
            novel={novel}
            allChapters={chapters}
            fetchScenes={() => fetchNovelAndChapters(true)}
            onAddScene={handleAddScene}
            onDeleteChapter={handleDeleteChapter}
            openConfirmDialog={openConfirmDialog}
            onWrite={(chId, scId) => {
              sessionStorage.setItem("focusSceneTarget", scId);
              onNavigate("scene-editor", { novelId: currentNovelId, chapterId: chId, sceneId: scId });
            }} />
        ) : (
          <div className="cm-empty-state">
            📭 ยังไม่มีการเลือกตอนเพื่อดูฉากย่อย กรุณาเลือกดูรายชื่อตอนจากเมนูด้านขวามือค่ะ
          </div>
        )}
      </div>

      <aside className="cm-sidebar">
        <div className="cm-sidebar__header">
          ☰ รายชื่อตอนทั้งหมด ({searchTerm ? `${filteredChapters.length}/${chapters.length}` : chapters.length})
        </div>

        <button className="cm-sidebar__add" onClick={openCreateChapterForm} disabled={getNovelStatusInfo(novel).isBanned}>
          ✨ สร้างตอนใหม่
        </button>

        <div style={{ padding: "0 16px 12px 16px" }}>
          <input
            type="text"
            placeholder="🔍 ค้นหาเลขตอน หรือชื่อตอน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #fbcfe8",
              fontSize: "13.5px",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
        {isCreatingChapter && (
          <div className="cm-sidebar__new-form">
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#b91c1c" }}>กรอกข้อมูลตอนก่อนกดบันทึก</div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12.5px", fontWeight: 600, color: "#4b5563" }}>ชื่อตอน</label>
                <input
                  className="cm-input"
                  value={draftChapterTitle}
                  onChange={(e) => setDraftChapterTitle(e.target.value)}
                  placeholder="เช่น จุดเริ่มต้น"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12.5px", fontWeight: 600, color: "#4b5563" }}>สถานะตอน</label>
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
          <DragDropContext onDragEnd={async (result) => {
            if (!result.destination) return;
            const src = result.source.index;
            const dst = result.destination.index;
            if (src === dst) return;
            const next = Array.from(chapters || []);
            const [moved] = next.splice(src, 1);
            next.splice(dst, 0, moved);
            setChapters(next);
            const orderedIds = next.map(c => c.id ?? c.ID ?? c.chapter_id ?? c.ChapterID).filter(Boolean);
            await reorderChaptersOnServer(orderedIds);
            await fetchNovelAndChapters(true);
          }}>
            <Droppable droppableId="chapters-droppable">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {filteredChapters.map((ch, index) => {
                    const chId = ch.id ?? ch.ID ?? ch.chapter_id ?? ch.ChapterID ?? index;
                    const chKey = String(chId);
                    const chTitle = ch.title ?? ch.Title ?? `ตอนที่ ${index + 1}`;
                    const chStatus = (ch.status || ch.Status || "draft").toString().toLowerCase();
                    const isChapterPublished = chStatus === "published" || chStatus === "active";
                    const isLocked = lockedChapterIds.has(chKey);

                    return (
                      <Draggable
                        key={`chapter-sidebar-item-${chKey}-${index}`}
                        draggableId={chKey}
                        index={index}
                        isDragDisabled={isLocked}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              userSelect: 'none',
                              touchAction: 'manipulation'
                            }}
                          >
                            <div
                              className={`cm-sidebar__item ${String(activeChapterId) === chKey ? "cm-sidebar__item--active" : ""} ${isLocked ? "cm-sidebar__item--locked" : ""}`}
                              onClick={() => setActiveChapterId(chId)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveChapterId(chId); } }}
                            >
                              <div className="cm-sidebar__item-top">
                                <span
                                  className="cm-sidebar__drag-handle"
                                  {...(!isLocked ? dragProvided.dragHandleProps : {})}
                                  style={{ cursor: isLocked ? 'not-allowed' : 'grab', marginRight: 8 }}
                                >
                                  {isLocked ? '🔒' : '⋮⋮⋮'}
                                </span>
                                <span className="cm-sidebar__item-icon">⭐</span>
                                <div className="cm-sidebar__item-body">
                                  <span className="cm-sidebar__item-num">ตอนที่ {index + 1}</span>
                                  <div className="cm-sidebar__item-title">{chTitle}</div>
                                  <span className="cm-sidebar__item-status" style={{ fontSize: 11, color: isChapterPublished ? "#16a34a" : "#b91c1c", marginTop: 4 }}>
                                    {isChapterPublished ? "เผยแพร่" : "ฉบับร่าง"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </aside>

      {confirmDialog && (
        <ConfirmModal
          isOpen={Boolean(confirmDialog)}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel || "ตกลง"}
          onConfirm={executeConfirmAction}
          onCancel={closeConfirmDialog}
        />
      )}

      <AppealModal
        isOpen={isAppealModalOpen}
        isSubmitting={isSubmittingAppeal}
        onSubmit={handleSubmitAppeal}
        onCancel={handleCloseAppealModal}
      />
    </div>
  );
};

export default ChapterManagerPage;