// src/pages/Writer/SceneEditorPage/SceneEditorPage.jsx
// ══════════════════════════════════════════════════════════════
//  หน้าเขียน/แก้ไขฉากนิยาย (Scene Editor) — ฝั่งนักเขียน 
//  [ ปรับแต่งเชื่อมต่อ Go หลังบ้าน ผ่าน /scenes/:id และ /story-tree ]
// ══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import "./SceneEditorPage.css";
import Toggle from "../../../components/Toggle/Toggle";
import EndingSettings from "../../../components/EndingSettings/EndingSettings";
import Quill from "quill";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─────────────────────────────────────────────
// React Quill config
// ─────────────────────────────────────────────
const QUILL_TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  [{ size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link", "image"],
  ["clean"],
];
const quillFormats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'list',
  'bullet',
  'indent',
  'link',
  'image',
  'video',
  'align',
  'color',
  'background'
];
// ─────────────────────────────────────────────
// Choice Card Component (อัปเดตลอจิกแบบเดียวกับหน้า Chapter Manager)
// ─────────────────────────────────────────────
const ChoiceCard = ({
  choice,
  index,
  allTargetOptions,
  currentChapterId,
  currentSceneId, // 🆕 เพิ่ม Props นี้เข้ามาเพื่อคำนวณตำแหน่งฉากปัจจุบัน
  onUpdate,
  onSave,
  onDelete,
}) => {
  const allScenes = (Array.isArray(allTargetOptions) ? allTargetOptions : []).flatMap((ch) => {
    const scenes = Array.isArray(ch.scenes) ? ch.scenes : [];
    const chapterTitle = ch.title || ch.chapterTitle || "";
    const chapterId = ch.id || ch.chapter_id || ch.ChapterID || ch.chapter_id || "";
    return scenes.map((s) => ({
      value: `${chapterId}||${s.id ?? s.scene_id ?? s.SceneID}`,
      label: `${chapterTitle} › ${s.title || s.label || s.sceneTitle || "ฉากไม่มีชื่อ"}`,
      chapterTitle,
      chapterId,
      sceneId: s.id ?? s.scene_id ?? s.SceneID,
      sceneLabel: s.title || s.label || s.sceneTitle || "ฉากไม่มีชื่อ",
    }));
  });

  const findSceneByValue = (value) => allScenes.find((scene) => String(scene.value) === String(value));

  const normalizeChoiceTarget = (target) => {
    if (!target) return "";
    if (typeof target === "string" && target.includes("||")) return target;
    const targetId = String(target);
    const found = allScenes.find((scene) =>
      String(scene.value) === targetId || String(scene.value).endsWith(`||${targetId}`)
    );
    return found ? found.value : "";
  };

  const initialTargetSubScene = normalizeChoiceTarget(
    choice.targetSubScene ?? choice.to_scene_id ?? choice.toSceneID ?? choice.toSceneId ?? ""
  );
  const resolvedScene = findSceneByValue(initialTargetSubScene);
  const initialScope = resolvedScene
    ? String(resolvedScene.chapterId) === String(currentChapterId)
      ? "same"
      : "other"
    : "same";
  const initialChapterId = resolvedScene?.chapterId ?? currentChapterId;

  const [text, setText] = useState(choice.text ?? choice.label ?? choice.Label ?? "");
  const [targetType, setTargetType] = useState(choice.targetType || initialScope);
  const [targetLabel, setTargetLabel] = useState(
    choice.targetLabel ||
    resolvedScene?.label ||
    resolvedScene?.sceneLabel ||
    (resolvedScene ? `${resolvedScene.chapterTitle} › ${resolvedScene.sceneLabel}` : "เลือกฉากปลายทาง...")
  );
  const [subScene, setSubScene] = useState(initialTargetSubScene);
  const [selectedChapterId, setSelectedChapterId] = useState(initialChapterId);

  // State ควบคุมโหมดการแก้ไข
  const [isEditing, setIsEditing] = useState(!choice.text);

  useEffect(() => {
    setText(choice.text ?? choice.label ?? choice.Label ?? "");
  }, [choice.text, choice.label]);

  useEffect(() => {
    if (!subScene && initialTargetSubScene) {
      const scene = findSceneByValue(initialTargetSubScene);
      if (scene) {
        setSubScene(initialTargetSubScene);
        setTargetLabel(scene.label);
        setSelectedChapterId(scene.chapterId);
        setTargetType(String(scene.chapterId) === String(currentChapterId) ? "same" : "other");
      }
    }
  }, [allScenes.length, initialTargetSubScene, currentChapterId]);

  // 🔍 หาตำแหน่ง Index ของฉากต้นทางปัจจุบันในไทม์ไลน์ใหญ่
  const fromSceneIndex = allScenes.findIndex(s => String(s.sceneId) === String(currentSceneId));

  const sameChapterScenes = allScenes.filter((scene) => String(scene.chapterId) === String(currentChapterId));
  const otherChapterOptions = Array.from(
    new Map(
      allScenes
        .filter((scene) => String(scene.chapterId) !== String(currentChapterId))
        .map((scene) => [String(scene.chapterId), { chapterId: scene.chapterId, chapterTitle: scene.chapterTitle }])
    )
  ).map(([, value]) => value);

  const effectiveChapterId =
    targetType === "same"
      ? currentChapterId
      : selectedChapterId || otherChapterOptions[0]?.chapterId || currentChapterId;
  const targetScenes = allScenes.filter((scene) => String(scene.chapterId) === String(effectiveChapterId));
  const sceneOptions = targetType === "same" ? sameChapterScenes : targetScenes;

  // 🛡️ กรองฉากปลายทางใน Dropdown: แสดงเฉพาะฉากที่มีตำแหน่ง "มากกว่า" ฉากปัจจุบันเท่านั้น (Forward-Only)
  const forwardOnlySceneOptions = sceneOptions.filter(scene => {
    const sceneIndexInAll = allScenes.findIndex(s => String(s.sceneId) === String(scene.sceneId));
    return sceneIndexInAll > fromSceneIndex; // ต้องอยู่ข้างหน้าเท่านั้น
  });

  const handleScopeChange = (scopeValue) => {
    setTargetType(scopeValue);
    const nextChapterId = scopeValue === "same" ? currentChapterId : otherChapterOptions[0]?.chapterId || currentChapterId;
    setSelectedChapterId(nextChapterId);

    // อัปเดต Dropdown ให้เลือกฉากแรกที่เป็นไปได้ตามกฎ Forward-Only
    const validScenes = scopeValue === "same"
      ? sameChapterScenes.filter(s => allScenes.findIndex(all => String(all.sceneId) === String(s.sceneId)) > fromSceneIndex)
      : allScenes.filter(scene => String(scene.chapterId) === String(nextChapterId) && allScenes.findIndex(all => String(all.sceneId) === String(scene.sceneId)) > fromSceneIndex);

    if (validScenes.length > 0) {
      setSubScene(validScenes[0].value);
      setTargetLabel(validScenes[0].label);
      // ลบการเรียก onUpdate ออก เพื่อให้ยังไม่บันทึกจนกดยืนยัน
    } else {
      setSubScene("");
      setTargetLabel("เลือกฉากปลายทาง...");
    }
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapterId(chapterId);

    // กรองฉากสำหรับตอนที่เลือกตามกฎ Forward-Only
    const validScenes = allScenes.filter(scene =>
      String(scene.chapterId) === String(chapterId) &&
      allScenes.findIndex(all => String(all.sceneId) === String(scene.sceneId)) > fromSceneIndex
    );

    if (validScenes.length > 0) {
      setSubScene(validScenes[0].value);
      setTargetLabel(validScenes[0].label);
      // ลบการเรียก onUpdate ออก
    } else {
      setSubScene("");
      setTargetLabel("เลือกฉากปลายทาง...");
    }
  };

  const handleSubSceneChange = (val) => {
    setSubScene(val);
    const found = findSceneByValue(val);
    if (found) setTargetLabel(found.label || found.chapterTitle);
  };

  const handleSaveEdit = () => {
    // 🛑 ตรวจสอบการกรอกข้อความ
    if (!text || text.trim() === "") {
      alert("กรุณากรอกข้อความบนปุ่มทางเลือกก่อน");
      return;
    }

    // 🛑 ตรวจสอบการเลือกปลายทาง
    if (!subScene || subScene === "") {
      alert("กรุณาเลือกฉากปลายทางที่ต้องการเชื่อมโยง");
      return;
    }

    const targetScene = findSceneByValue(subScene);
    const targetSceneId = targetScene ? targetScene.sceneId : "";
    const targetSceneIndex = allScenes.findIndex(s => String(s.sceneId) === String(targetSceneId));

    if (fromSceneIndex === -1 || targetSceneIndex === -1) {
      alert("❌ ไม่พบข้อมูลตำแหน่งของฉากในระบบ กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    // 🛑 [✨ ตรรกะกฎเหล็ก Forward-Only]
    if (targetSceneIndex <= fromSceneIndex) {
      if (targetSceneIndex === fromSceneIndex) {
        alert("❌ ไม่สามารถบันทึกได้: ระบบไม่อนุญาตให้สร้างช้อยส์โยงเข้าหาฉากตัวเองเด็ดขาด");
      } else {
        alert("❌ ไม่สามารถบันทึกได้: ระบบทำงานด้วยกฎเดินหน้าอย่างเดียว (Forward-Only) ห้ามสร้างช้อยส์โยงย้อนกลับไปยังฉากก่อนหน้า");
      }
      return;
    }

    const updatedChoice = {
      ...choice,
      text,
      targetType,
      targetSubScene: subScene,
      targetLabel,
    };
    onUpdate?.(updatedChoice);
    onSave?.(updatedChoice);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (choice.id && String(choice.id).startsWith("choice-new-")) {
      onDelete(choice.id);
    } else {
      setText(choice.text ?? choice.label ?? choice.Label ?? "");
      setTargetType(initialScope);
      setSubScene(initialTargetSubScene);
      setTargetLabel(
        choice.targetLabel ||
        resolvedScene?.label ||
        resolvedScene?.sceneLabel ||
        (resolvedScene ? `${resolvedScene.chapterTitle} › ${resolvedScene.sceneLabel}` : "เลือกฉากปลายทาง...")
      );
      setSelectedChapterId(initialChapterId);
      setIsEditing(false);
    }
  };

  const COLORS = ["#db2777", "#f59e0b", "#14b8a6", "#8b5cf6", "#ec4899"];

  return (
    <div className="se-choice">
      <div
        className="se-choice__num"
        style={{
          background: COLORS[index % COLORS.length],
          color: "#ffffff",
        }}
      >
        {index + 1}
      </div>

      <div className="se-choice__body">
        {!isEditing ? (
          <div className="se-choice__view">
            <div className="se-choice__view-row">
              <span className="se-choice__view-label">ข้อความ :</span>
              <span className="se-choice__view-value">
                {text || <span className="se-choice__view-value--empty">ยังไม่ได้ระบุข้อความ...</span>}
              </span>
            </div>
            <div className="se-choice__view-row">
              <span className="se-choice__view-label">ปลายทาง :</span>
              <span className="se-choice__view-value">
                {subScene ? targetLabel : <span className="se-choice__view-value--empty">ยังไม่ได้เลือกฉากปลายทาง...</span>}
              </span>
            </div>
            <div className="se-choice__actions">
              <button
                type="button"
                className="se-choice__btn-action se-choice__btn-action--del"
                onClick={() => {
                  // แจ้งเตือนคอนเฟิร์มก่อนลบ แบบเดียวกับ ConfirmModal
                  if (window.confirm(`คุณต้องการลบตัวเลือก "${text || 'ไม่มีข้อความ'}" ใช่หรือไม่?`)) {
                    onDelete(choice.id);
                  }
                }}
              >
                ลบตัวเลือก
              </button>
              <button type="button" className="se-choice__btn-action se-choice__btn-action--edit" onClick={() => setIsEditing(true)}>✏️ แก้ไข</button>
            </div>
          </div>
        ) : (
          <div className="se-choice__config">
            <div className="se-choice__config-col">
              <div className="se-choice__config-label">ข้อความตัวเลือก</div>
              <input
                className="se-input"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                }}
                placeholder="ตัวอย่าง: สำรวจแบบไม่ย่อท้อ..."
              />
            </div>

            <div className="se-choice__config-col">
              <div className="se-choice__config-label">ลิงก์ปลายทาง</div>

              <div className="se-choice__radios">
                <label className="se-radio">
                  <input
                    type="radio"
                    name={`tt-${choice.id}`}
                    value="same"
                    checked={targetType === "same"}
                    onChange={() => handleScopeChange("same")}
                  />
                  <span className="se-radio__dot" />
                  ฉากในตอนเดียวกัน
                </label>

                <label className="se-radio">
                  <input
                    type="radio"
                    name={`tt-${choice.id}`}
                    value="other"
                    checked={targetType === "other"}
                    onChange={() => handleScopeChange("other")}
                  />
                  <span className="se-radio__dot" />
                  ฉากในตอนอื่น
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {targetType === "other" && (
                  <select
                    className="se-select"
                    value={effectiveChapterId || ""}
                    onChange={(e) => handleChapterChange(e.target.value)}
                  >
                    <option value="">เลือกตอนปลายทาง...</option>
                    {otherChapterOptions.map((ch) => (
                      <option key={`chapter-target-${ch.chapterId}`} value={ch.chapterId}>
                        {ch.chapterTitle || `ตอน ${ch.chapterId}`}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  className="se-select"
                  value={subScene}
                  onChange={(e) => handleSubSceneChange(e.target.value)}
                >
                  <option value="">
                    {forwardOnlySceneOptions.length > 0
                      ? "เลือกฉากปลายทาง..."
                      : "-- ไม่มีฉากถัดไปที่สามารถเลือกโยงได้ --"}
                  </option>
                  {forwardOnlySceneOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="se-choice__actions">
              <button type="button" className="se-choice__btn-action se-choice__btn-action--cancel" onClick={handleCancelEdit}>❌ ยกเลิก</button>
              <button type="button" className="se-choice__btn-action se-choice__btn-action--save" onClick={handleSaveEdit}>
                ✓ ยืนยันการแก้ไข
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Scene Tree Sidebar Component
// ─────────────────────────────────────────────
const SceneTreeSidebar = ({
  chapters,
  currentSceneId,
  currentChapterId,
  currentChapterTitle,
  currentSceneLabel,
  onSelectScene,
  onAddScene,
  onAddChapter,
  isPublished,
  isEnding,
  setIsEnding,
  onToggleEnding,
  onOpenEndingSettings,
}) => {
  const [expandedChapters, setExpandedChapters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sceneFilter, setSceneFilter] = useState("all");

  useEffect(() => {
    if (chapters && chapters.length > 0) {
      const activeChs = chapters
        .filter((c) => (c.scenes || []).some((s) => String(s.id ?? s.scene_id ?? s.SceneID) === String(currentSceneId)))
        .map((c) => c.id ?? c.chapter_id ?? c.ChapterID);
      if (activeChs.length > 0) {
        setExpandedChapters((prev) => Array.from(new Set([...prev, ...activeChs])));
      }
    }
  }, [chapters, currentSceneId]);

  const toggleChapter = (chId) => {
    setExpandedChapters((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  const getScenePublishState = (scene, chapter) => {
    const statusVal = scene.status || scene.Status;
    if (statusVal) {
      const lowerStatus = statusVal.toString().toLowerCase();
      if (lowerStatus === "published" || lowerStatus === "live") return "published";
      if (lowerStatus === "draft") return "draft";
    }

    if (scene.is_published === true || scene.isPublished === true ||
      scene.is_published === "true" || scene.isPublished === "true") {
      return "published";
    }

    if (chapter) {
      const chStatus = (chapter.status || chapter.Status || "draft").toString().toLowerCase();
      if (chStatus === "published" || chStatus === "active") {
        return "published";
      }
    }

    return "draft";
  };

  const getSceneStatus = (scene, allChapters) => {
    const sceneType = scene.type || scene.scene_type || "normal";
    if (sceneType === "ending") return "ending";
    if (sceneType === "start" || sceneType === "starting") return "start";

    const hasConnection = scene.has_connection !== false && scene.hasConnection !== false;
    if (!hasConnection) return "orphan";

    return "normal";
  };

  const safeChapters = Array.isArray(chapters) ? chapters : [];

  const filteredChapters = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return safeChapters
      .map((ch, chapterIndex) => {
        const chapterTitle = ch.title || ch.chapterTitle || "";
        const chapterMatches = query ? chapterTitle.toLowerCase().includes(query) : false;

        const scenes = (ch.scenes || []).filter((scene) => {
          const title = (scene.title || scene.scene_title || scene.sceneTitle || scene.label || "").toLowerCase();
          const contentMatch = query ? (title.includes(query) || chapterMatches) : true;

          const publishState = getScenePublishState(scene, ch);
          const filterMatch =
            sceneFilter === "all" ||
            (sceneFilter === "published" && publishState === "published") ||
            (sceneFilter === "draft" && publishState === "draft");

          return contentMatch && filterMatch;
        });

        if (scenes.length > 0) {
          return { ...ch, scenes };
        }

        if (chapterMatches && sceneFilter === "all") {
          return { ...ch, scenes: ch.scenes || [] };
        }

        return null;
      })
      .filter(Boolean);
  }, [safeChapters, searchQuery, sceneFilter]);

  useEffect(() => {
    if (searchQuery.trim() && filteredChapters.length > 0) {
      const keys = filteredChapters.map((ch) => ch.id ?? ch.chapter_id ?? ch.ChapterID);
      setExpandedChapters((prev) => {
        const nextKeys = keys.filter((k) => k !== undefined && k !== null);
        return Array.from(new Set([...prev, ...nextKeys]));
      });
    }
  }, [filteredChapters, searchQuery]);

  return (
    <div className="se-tree" style={{ padding: "20px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div className="se-tree__header" style={{ marginBottom: "12px" }}>สถานะและประเภท</div>
      <div className="se-tree__toggles" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* แสดงผลสถานะการเผยแพร่แบบ Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--gray-800)' }}>สถานะเผยแพร่</span>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: '700',
            padding: '4px 10px',
            borderRadius: '999px',
            color: isPublished ? '#166534' : '#475569',
            background: isPublished ? '#d1fae5' : '#f1f5f9',
            border: `1px solid ${isPublished ? '#a7f3d0' : '#cbd5e1'}`
          }}>
            {isPublished ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--gray-800)' }}>ตั้งค่าฉากจบ</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{isEnding ? "ใช่ (นี่คือฉากจบ)" : "ไม่ใช่"}</span>
          </div>
          <Toggle
            checked={isEnding}
            onChange={(value) => {
              onToggleEnding?.(value);
            }}
            id={`toggle-ending-sidebar`}
          />
        </div>
        {isEnding && (
          <button
            type="button"
            onClick={() => onOpenEndingSettings?.()}
            style={{
              marginTop: '4px',
              border: 'none',
              background: 'transparent',
              color: '#1d4ed8',
              cursor: 'pointer',
              fontSize: '0.82rem',
              textAlign: 'left',
              padding: 0,
            }}
          >
            ดูรายละเอียดฉากจบ
          </button>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '0 0 20px 0' }} />

      <div className="se-tree__header" style={{ marginBottom: "8px" }}>ภาพรวมของนิยาย</div>

      {/* ช่องค้นหาตอนและฉาก */}
      <div className="se-search-container" style={{ marginBottom: "16px", position: "relative" }}>
        <input
          type="text"
          className="se-input"
          placeholder="ค้นหาตอนหรือฉาก..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px 8px 30px",
            fontSize: "0.82rem",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            boxSizing: "border-box",
            backgroundColor: "#f8fafc"
          }}
        />
        <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "0.82rem", color: "#94a3b8" }}>🔍</span>
      </div>

      <div className="se-tree__filters">
        <button
          type="button"
          className={`se-tree__filter-btn ${sceneFilter === "all" ? "active" : ""}`}
          onClick={() => setSceneFilter("all")}
        >
          ทั้งหมด
        </button>
        <button
          type="button"
          className={`se-tree__filter-btn ${sceneFilter === "published" ? "active" : ""}`}
          onClick={() => setSceneFilter("published")}
        >
          เผยแพร่
        </button>
        <button
          type="button"
          className={`se-tree__filter-btn ${sceneFilter === "draft" ? "active" : ""}`}
          onClick={() => setSceneFilter("draft")}
        >
          ฉบับร่าง
        </button>
      </div>

      <div className="se-tree__list" style={{ flex: 1 }}>
        {filteredChapters.map((ch, chapterIndex) => {
          const chapterKey = ch.id ?? ch.chapter_id ?? ch.ChapterID ?? chapterIndex;
          const isExpanded = expandedChapters.includes(chapterKey);
          const chapterScenes = Array.isArray(ch.scenes) ? ch.scenes : [];

          const chDisplayNum =
            ch.chapterNumber ??
            ch.order_index ??
            (chapterIndex + 1);

          return (
            <div key={chapterKey} className="se-tree__chapter" >
              <button
                className="se-tree__ch-row"
                onClick={() => toggleChapter(chapterKey)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "none",
                    transition: "transform .18s",
                    flexShrink: 0,
                  }}
                >
                  <path d="M4 3l4 3-4 3V3z" fill="currentColor" />
                </svg>

                <span className="se-tree__ch-label">
                  ตอนที่ {chDisplayNum} — {ch.title}
                </span>

              </button>

              {isExpanded && (
                <div className="se-tree__scenes">
                  {chapterScenes.map((scene, sceneIndex) => {
                    const sceneKey = scene.id ?? scene.scene_id ?? scene.SceneID ?? sceneIndex;
                    const sceneIdValue = scene.id ?? scene.scene_id ?? scene.SceneID;
                    const chapterIdValue = ch.id ?? ch.chapter_id ?? ch.ChapterID;
                    const isCurrent = String(sceneIdValue) === String(currentSceneId);

                    const scDisplayNum = sceneIndex + 1;
                    const sceneStatus = getSceneStatus(scene, safeChapters);

                    let statusIcon = "●";
                    let statusColor = "#ffffff";
                    let tooltipMsg = "";

                    if (sceneStatus === "start") {
                      statusIcon = "●";
                      statusColor = "#16A34A";
                      tooltipMsg = "ฉากเริ่มต้น";
                    } else if (sceneStatus === "ending") {
                      statusIcon = "●";
                      statusColor = "#EF4444";
                      tooltipMsg = "ฉากจบเรื่อง";
                    } else if (sceneStatus === "orphan") {
                      statusIcon = "⚠";
                      statusColor = "#FBBF24";
                      tooltipMsg = "ยังไม่มีฉากมาเชื่อม หรือยังไม่มีฉากปลายทาง";
                    }

                    return (
                      <div key={sceneKey} className="se-tree__scene-wrapper">
                        <button
                          className={`se-tree__scene-row ${isCurrent ? "se-tree__scene-row--active" : ""}`}
                          onClick={() => onSelectScene(chapterIdValue, sceneIdValue)}
                        >
                          <span className="se-tree__scene-text">
                            ฉากที่ {chDisplayNum}.{scDisplayNum} — {scene.label || scene.title || scene.sceneTitle || "ฉากไม่มีชื่อ"}
                          </span>
                          <span
                            className="se-tree__scene-status"
                            style={{ color: statusColor }}
                            title={tooltipMsg}
                          >
                            {statusIcon}
                          </span>
                        </button>
                      </div>
                    );
                  })}

                  <button
                    className="se-tree__add-scene"
                    onClick={() => onAddScene(ch.id ?? ch.chapter_id ?? ch.ChapterID)}
                  >
                    + เพิ่มฉาก
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="se-tree__add-ch" onClick={onAddChapter} style={{ marginTop: "16px" }}>
        เพิ่มตอนใหม่
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const SceneEditorPage = ({
  novelId,
  chapterId,
  sceneId,
  onNavigate,
  initialSceneTitle,
  initialNovelTitle,
  initialChapterTitle,
  x,
  y,
}) => {
  const navigate = useNavigate();
  const [novelTitle, setNovelTitle] = useState(initialNovelTitle || "");
  const [chapterTitle, setChapterTitle] = useState(initialChapterTitle || "");
  const [sceneLabel, setSceneLabel] = useState("");

  const [sceneTitle, setSceneTitle] = useState("");
  const [content, setContent] = useState("");
  const [sceneType, setSceneType] = useState("normal");
  const [isPublished, setIsPublished] = useState(false);

  // สังเกตตอนปัจจุบันของฉาก (มีประโยชน์มากเมื่อสร้างฉากใหม่ชั่วคราวและยังไม่มีตอนผูกไว้)
  const [currentSelectedChapterId, setCurrentSelectedChapterId] = useState(chapterId);

  // States สำหรับเก็บค่าพิกัด เพื่อป้องกันตำแหน่งกราฟเคลื่อนหายเวลาบันทึก
  const [coordinateX, setCoordinateX] = useState(x ?? 0);
  const [coordinateY, setCoordinateY] = useState(y ?? 0);
  useEffect(() => {
    const editorEl = document.querySelector('.se-quill');
    if (!editorEl) return;

    const handleImageClick = (e) => {
      // ถ้าตัวที่คลิกเป็นรูปภาพ (IMG) และอยู่ในกลุ่มของ Quill Editor
      if (e.target.tagName === 'IMG' && e.target.closest('.ql-editor')) {
        const img = e.target;

        // สั่งให้ Browser ทำการลากคลุม (Select) รูปภาพนี้ให้ทันทีแบบอัตโนมัติ
        const range = document.createRange();
        range.selectNode(img);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    };
    document.addEventListener('click', handleImageClick);

    // คืนค่าทำความสะอาดเมื่อปิดหน้าจอ
    return () => {
      document.removeEventListener('click', handleImageClick);
    };
  }, []);
  const charCount = useMemo(() => {
    const textOnly = content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return textOnly.length;
  }, [content]);
  const [isEnding, setIsEnding] = useState(false);
  const [endingTitle, setEndingTitle] = useState("");
  const [endingType, setEndingType] = useState("true");
  const [endingDescription, setEndingDescription] = useState("");
  const [endingDescriptionEnabled, setEndingDescriptionEnabled] = useState(false);
  const [showEndingSettingsDialog, setShowEndingSettingsDialog] = useState(false);
  const [choices, setChoices] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUnsaved]);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // States สำหรับ dialog เพิ่มตอน/ฉากใหม่
  const [showAddChapterDialog, setShowAddChapterDialog] = useState(false);
  const [showAddSceneDialog, setShowAddSceneDialog] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [selectedChapterForNewScene, setSelectedChapterForNewScene] = useState(null);

  const token = localStorage.getItem("token");
  const quillRef = useRef(null);
  const saveDraftTimer = useRef(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [choiceToDelete, setChoiceToDelete] = useState(null);

  const isNewScene = String(sceneId) === "new";

  const sceneDraftKey = useMemo(
    () => `scene-editor-draft:${novelId}:${chapterId}:${sceneId}`,
    [novelId, chapterId, sceneId]
  );

  const restoreDraft = useCallback(() => {
    if (!sceneDraftKey) return;
    try {
      const rawDraft = localStorage.getItem(sceneDraftKey);
      if (!rawDraft) return;
      const savedDraft = JSON.parse(rawDraft);
      if (!savedDraft || typeof savedDraft !== "object") return;

      // เพิ่มการเช็กเผื่อเวลาที่ข้อมูลหลังบ้านเพิ่งโหลดเสร็จ จะได้ไม่โดนทับ
      if (savedDraft.sceneTitle !== undefined) setSceneTitle(savedDraft.sceneTitle);
      if (savedDraft.sceneLabel !== undefined) setSceneLabel(savedDraft.sceneLabel);
      if (savedDraft.content !== undefined) setContent(savedDraft.content);
      if (savedDraft.sceneType) setSceneType(savedDraft.sceneType);

      setEndingTitle(savedDraft.endingTitle || "");
      setEndingType(savedDraft.endingType || "true");
      setEndingDescription(savedDraft.endingDescription || "");
      setEndingDescriptionEnabled(
        savedDraft.endingDescriptionEnabled !== undefined
          ? savedDraft.endingDescriptionEnabled
          : Boolean(savedDraft.endingDescription || savedDraft.ending_description)
      );
      // 🛡️ ไม่เอา choices จาก draft มาทับ choices จริงจาก Backend เพื่อความเรียลไทม์เสมอ
      if (savedDraft.draftSavedAt) {
        const savedTime = new Date(savedDraft.draftSavedAt);
        if (!Number.isNaN(savedTime.getTime())) {
          setDraftSavedAt(savedTime);
        }
      }
    } catch (err) {
      console.warn("Unable to restore scene draft:", err);
    }
  }, [sceneDraftKey]);

  const clearDraft = useCallback(() => {
    if (!sceneDraftKey) return;
    localStorage.removeItem(sceneDraftKey);
    setDraftSavedAt(null);
  }, [sceneDraftKey]);

  const saveDraftToStorage = useCallback(() => {
    if (!sceneDraftKey) return;

    const draftPayload = {
      sceneTitle,
      sceneLabel,
      content,
      sceneType,
      endingTitle,
      endingType,
      endingDescription,
      endingDescriptionEnabled,
      choices,
      draftSavedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(sceneDraftKey, JSON.stringify(draftPayload));
      setDraftSavedAt(new Date());
    } catch (err) {
      console.warn("Unable to save scene draft:", err);
    }
  }, [sceneDraftKey, sceneTitle, sceneLabel, content, sceneType, endingTitle, endingType, endingDescription, endingDescriptionEnabled, choices]);

  const normalizeMinioUrl = useCallback((url) => {
    if (!url) return url;
    return url.replace("http://minio:9000", "http://localhost:9000");
  }, []);

  const handleQuillImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setImageUploadError("");
      setIsImageUploading(true);

      try {
        const formData = new FormData();
        formData.append("image", file);

        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
          method: "POST",
          body: formData,
          headers,
        });

        if (!uploadRes.ok) {
          const errJson = await uploadRes.json().catch(() => null);
          throw new Error(errJson?.error || errJson?.message || "ไม่สามารถอัปโหลดรูปภาพได้");
        }

        const uploadData = await uploadRes.json();
        const imageUrl = normalizeMinioUrl(uploadData?.data?.full_url || uploadData?.full_url);
        const editor = quillRef.current?.getEditor?.();
        const range = editor?.getSelection?.() || { index: (content?.length || 0) };

        if (editor) {
          editor.insertEmbed(range.index ?? 0, "image", imageUrl);
          editor.setSelection((range.index ?? 0) + 1);
          // immediately sync editor HTML into state so autosave captures image
          try {
            const newHtml = editor.root?.innerHTML;
            if (typeof newHtml === "string") setContent(newHtml);
          } catch (e) {
            // ignore
          }
          // try to persist draft immediately
          try { saveDraftToStorage(); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error("Scene editor image upload error:", err);
        setImageUploadError(err?.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
      } finally {
        setIsImageUploading(false);
      }
    };
  }, [content, normalizeMinioUrl, token, saveDraftToStorage]);

  const quillModules = useMemo(() => {
    return {
      toolbar: {
        container: [
          [{ header: '1' }, { header: '2' }, { font: [] }],
          [{ size: [] }],
          ['bold', 'italic', 'underline', 'strike', 'blockquote'],
          // แนะนำเพิ่ม [{ align: [] }] เข้ามาเพื่อให้คนเขียนจัดรูปให้อยู่กึ่งกลาง ชิดซ้าย หรือชิดขวาได้แบบ ReadAWrite
          [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }, { align: [] }],
          ['link', 'image', 'video'],
          ['clean'],
        ],
        handlers: {
          image: handleQuillImageUpload,
        },
      },
      // ✂️ ลบ imageResize: {} ตรงนี้ออกไปแล้ว
    };
  }, [handleQuillImageUpload]);

  const fetchSceneData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // ดึงข้อมูลรายชื่อตอนทั้งหมดก่อนเพื่อประมวลผล
      const chaptersRes = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters`, {
        headers,
      });
      let chaptersData = [];
      if (chaptersRes.ok) {
        const chaptersResult = await chaptersRes.json();
        chaptersData =
          chaptersResult?.data?.chapters ||
          chaptersResult?.chapters ||
          chaptersResult?.data ||
          chaptersResult ||
          [];
        setChapters(Array.isArray(chaptersData) ? chaptersData : []);
      }

      // ดึงข้อมูลนิยายเพื่อแสดงชื่อเรื่องที่ header เมื่อสร้างฉากใหม่
      try {
        const novelRes = await fetch(`${API_BASE_URL}/novels/${novelId}`, { headers });
        if (novelRes.ok) {
          const novelResult = await novelRes.json().catch(() => null);
          const novelData = novelResult?.novel || novelResult?.data || novelResult || {};
          setNovelTitle(
            novelData.title ||
            novelData.novel_title ||
            novelData.name ||
            novelData.novelTitle ||
            "ไม่ระบุชื่อนิยาย"
          );
        }
      } catch (e) {
        // ignore
      }

      if (!isNewScene) {
        const sceneRes = await fetch(`${API_BASE_URL}/scenes/${sceneId}`, {
          headers,
        });
        if (!sceneRes.ok) throw new Error("ไม่สามารถดึงข้อมูลรายละเอียดฉากได้");
        const sceneResult = await sceneRes.json();
        const sceneData = sceneResult?.data || sceneResult;

        // ─── ✨ 1. ตรวจสอบข้อมูลฉบับร่างใน localStorage ✨ ───
        let draftData = null;
        try {
          const rawDraft = localStorage.getItem(sceneDraftKey);
          if (rawDraft) {
            draftData = JSON.parse(rawDraft);
          }
        } catch (e) {
          console.warn("Error parsing draft during fetch:", e);
        }

        setNovelTitle(sceneData.novelTitle || sceneData.novel_title || "ไม่ระบุชื่อนิยาย");
        setChapterTitle(sceneData.chapterTitle || sceneData.chapter_title || "ไม่ระบุชื่อตอน");

        // ─── ✨ 2. ผสานค่าระหว่าง Draft กับ Backend ✨ ───
        const resolvedSceneTitle = draftData?.sceneTitle !== undefined ? draftData.sceneTitle : (sceneData.sceneTitle || sceneData.scene_title || sceneData.title || "");
        setSceneTitle(resolvedSceneTitle);

        setSceneLabel(
          draftData?.sceneLabel !== undefined
            ? draftData.sceneLabel
            : (sceneData.sceneLabel || sceneData.scene_label || sceneData.sceneTitle || sceneData.scene_title || sceneData.title || `ฉาก ${sceneData.scene_id || sceneData.id}`)
        );

        setContent(draftData?.content !== undefined ? draftData.content : (sceneData.content || ""));

        const resolvedSceneType = draftData?.sceneType !== undefined ? draftData.sceneType : (sceneData.type || sceneData.scene_type || "normal");
        setSceneType(resolvedSceneType);

        // ข้อมูลของส่วนฉากจบ (Ending Settings)
        setIsEnding(
          draftData?.sceneType === "ending" || draftData?.isEnding !== undefined
            ? !!draftData.isEnding
            : (sceneData.type === "ending" || sceneData.isEnding || sceneData.is_ending || false)
        );
        setEndingTitle(draftData?.endingTitle !== undefined ? draftData.endingTitle : (sceneData.endingTitle || sceneData.ending_title || ""));
        setEndingType(draftData?.endingType !== undefined ? draftData.endingType : (sceneData.endingType || sceneData.ending_type || "true"));
        setEndingDescription(draftData?.endingDescription !== undefined ? draftData.endingDescription : (sceneData.endingDescription || sceneData.ending_description || ""));
        setEndingDescriptionEnabled(
          draftData?.endingDescriptionEnabled !== undefined
            ? draftData.endingDescriptionEnabled
            : Boolean(sceneData.endingDescription || sceneData.ending_description)
        );

        // ค้นหาตอนที่แท้จริงจากโครงสร้างของตอนและฉากย่อย
        let foundChapterId = null;
        if (Array.isArray(chaptersData)) {
          for (const ch of chaptersData) {
            const scenesList = Array.isArray(ch.scenes) ? ch.scenes : [];
            const hasScene = scenesList.some(s =>
              String(s.scene_id ?? s.sceneId ?? s.id ?? s.ID) === String(sceneId)
            );
            if (hasScene) {
              foundChapterId = ch.chapter_id ?? ch.chapterId ?? ch.id ?? ch.ID;
              break;
            }
          }
        }

        const resolvedChId = foundChapterId ?? sceneData.ChapterID ?? sceneData.chapter_id ?? sceneData.chapterId ?? chapterId;
        const parentChapter = chaptersData.find(ch =>
          String(ch.id ?? ch.chapter_id ?? ch.ChapterID ?? ch.chapterId) === String(resolvedChId)
        );
        const parentStatus = parentChapter ? (parentChapter.status || parentChapter.Status || "draft").toString().toLowerCase() : "draft";

        const statusStr = (sceneData.status || sceneData.Status || parentStatus).toString().toLowerCase();
        const isPub = statusStr === "published" ||
          sceneData.isPublished === true ||
          sceneData.is_published === true ||
          sceneData.isPublished === "true" ||
          sceneData.is_published === "true";
        setIsPublished(isPub);

        // ดึงพิกัดเพื่อนำมาสืบทอด
        setCoordinateX(sceneData.x ?? sceneData.X ?? x ?? 0);
        setCoordinateY(sceneData.y ?? sceneData.Y ?? y ?? 0);

        if (resolvedChId) {
          setCurrentSelectedChapterId(String(resolvedChId));
        } else {
          setCurrentSelectedChapterId(chapterId);
        }

        // ข้อมูลของ Choices ตัวเลือกท้ายตอน (ใช้ข้อมูลล่าสุดจาก Backend เสมอเพื่อความเรียลไทม์)
        const backendChoices = (Array.isArray(sceneData.choices) ? sceneData.choices : []).map((choice) => ({
          ...choice,
          id: choice.id ?? choice.choice_id ?? choice.choiceId ?? `choice-${choice.choice_id || choice.id || Date.now()}`,
          text: choice.text ?? choice.label ?? choice.Label ?? "",
          targetSubScene: choice.targetSubScene ?? choice.to_scene_id ?? choice.toSceneID ?? choice.toSceneId ?? "",
        }));

        setChoices(backendChoices);

        if (draftData?.draftSavedAt) {
          setDraftSavedAt(new Date(draftData.draftSavedAt));
        }
      } else {
        // กรณีเป็นฉากใหม่ชั่วคราวที่คลิกวางจาก Canvas
        setSceneTitle(initialSceneTitle || "");
        setSceneLabel(initialSceneTitle || "ยังไม่ได้ตั้งฉาก");
        setContent("");
        setSceneType("normal");
        setIsPublished(false);
        setIsEnding(false);
        setEndingTitle("");
        setEndingType("true");
        setEndingDescription("");
        setEndingDescriptionEnabled(false);
        setChoices([]);

        // รับและตั้งค่าพิกัดชั่วคราว
        setCoordinateX(x ?? 0);
        setCoordinateY(y ?? 0);

        // เลือกตอนเป็น chapterId ที่ระบุมาจากบอร์ดโครงสร้างเนื้อเรื่องเป็นอันดับแรก
        const activeChId = chapterId && chapterId !== "new" ? chapterId : (chaptersData[0]?.id ?? chaptersData[0]?.chapter_id ?? chaptersData[0]?.ChapterID ?? chaptersData[0]?.chapterId);
        if (activeChId) {
          setCurrentSelectedChapterId(String(activeChId));
          const foundChapter = chaptersData.find((c) => String(c.id ?? c.chapter_id ?? c.ChapterID ?? c.chapterId) === String(activeChId));
          if (foundChapter) {
            setChapterTitle(foundChapter.title || foundChapter.Title || `ตอนที่ ${foundChapter.episode ?? "?"}`);
          }
        }
      }
    } catch (err) {
      console.error("Fetch Scene Data Error:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
      setIsUnsaved(false);
    }
  }, [novelId, sceneId, token, isNewScene, initialSceneTitle, x, y, chapterId, sceneDraftKey]);
  useEffect(() => {
    fetchSceneData();
  }, [fetchSceneData]);

  useEffect(() => {
    const handleDataUpdate = () => {
      fetchSceneData();
    };
    window.addEventListener("novel-data-updated", handleDataUpdate);
    return () => window.removeEventListener("novel-data-updated", handleDataUpdate);
  }, [fetchSceneData]);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        restoreDraft();
      }, 50); // ดีเลย์ 50ms รอให้ State ของ API นิ่งก่อนแล้วดึงตััวดราฟต์มาทับ
      return () => clearTimeout(timer);
    }
  }, [isLoading, restoreDraft]);

  // Autosave: debounce and trigger when any editable field changes
  useEffect(() => {
    if (!sceneDraftKey) return;
    const timer = setTimeout(() => {
      try {
        saveDraftToStorage();
      } catch (err) {
        console.warn("Autosave failed:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
    // include all editable fields so any change triggers autosave
  }, [
    sceneDraftKey,
    sceneTitle,
    sceneLabel,
    content,
    sceneType,
    endingTitle,
    endingType,
    endingDescription,
    endingDescriptionEnabled,
    JSON.stringify(choices || []),
  ]);

  // Persist draft on unload to avoid losing edits on refresh/close
  useEffect(() => {
    const handler = (e) => {
      try { saveDraftToStorage(); } catch (err) { /* ignore */ }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveDraftToStorage]);

  const handleSave = async (overridePublishStatus = null, returnToManager = false, overrideChoices = null, overrideIsEnding = null) => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const currentPublishState = overridePublishStatus !== null ? overridePublishStatus : isPublished;
      const currentIsEnding = overrideIsEnding !== null ? overrideIsEnding : isEnding;
      const currentChoices = Array.isArray(overrideChoices) ? overrideChoices : choices;

      let targetChapterId = (chapterId && chapterId !== "new") ? chapterId : currentSelectedChapterId;
      if ((!targetChapterId || targetChapterId === "new" || isNaN(parseInt(targetChapterId, 10))) && !isNewScene) {
        let foundChapterId = null;
        if (Array.isArray(chapters)) {
          for (const ch of chapters) {
            const scenesList = Array.isArray(ch.scenes) ? ch.scenes : [];
            const hasScene = scenesList.some(s =>
              String(s.scene_id ?? s.sceneId ?? s.id ?? s.ID) === String(sceneId)
            );
            if (hasScene) {
              foundChapterId = ch.chapter_id ?? ch.chapterId ?? ch.id ?? ch.ID;
              break;
            }
          }
        }
        if (foundChapterId) {
          targetChapterId = String(foundChapterId);
        }
      }

      if (!targetChapterId || targetChapterId === "new" || isNaN(parseInt(targetChapterId, 10))) {
        throw new Error("ไม่พบตอนสำหรับฉากนี้ กรุณากลับไปเพิ่มจากหน้าโครงสร้างเนื้อเรื่องใหม่");
      }

      // บันทึกข้อมูลตัวฉากหลัก พร้อมพิกัด X, Y
      const payload = {
        novel_id: parseInt(novelId, 10),
        chapter_id: parseInt(targetChapterId, 10),
        title: sceneTitle.trim() || "ฉากไม่มีชื่อ",
        content: content,
        x: Math.round(coordinateX),
        y: Math.round(coordinateY),
        type: currentIsEnding
          ? "ending"
          : sceneType === "ending"
            ? "normal"
            : sceneType || "normal",
        status: currentPublishState ? "published" : "draft",
        ending_title: currentIsEnding ? endingTitle : "",
        ending_type: currentIsEnding ? endingType : "",
        ending_description: currentIsEnding && endingDescriptionEnabled ? endingDescription : "",
        is_ending: currentIsEnding,
        choices: currentChoices.map((c) => {
          const targetStr = String(c.targetSubScene ?? c.to_scene_id ?? c.toSceneID ?? c.toSceneId ?? "");
          const targetParts = targetStr.includes("||") ? targetStr.split("||") : [targetStr];
          const toSceneIdCandidate = parseInt(targetParts[targetParts.length - 1], 10);

          return {
            ...(c.id && !String(c.id).startsWith("choice-new-") ? { choice_id: parseInt(String(c.id), 10) } : {}),
            label: c.text || c.label || c.Label || "เลือกเส้นทางนี้",
            text: c.text || c.label || c.Label || "เลือกเส้นทางนี้",
            targetSubScene: targetStr,
            to_scene_id: Number.isNaN(toSceneIdCandidate) ? 0 : toSceneIdCandidate,
          };
        }),
      };

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const requestUrl = isNewScene ? `${API_BASE_URL}/scenes` : `${API_BASE_URL}/scenes/${sceneId}`;
      const method = isNewScene ? "POST" : "PUT";

      const response = await fetch(requestUrl, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || "ไม่สามารถบันทึกข้อมูลฉากได้");
      }

      clearDraft();
      setLastSaved(new Date());
      setIsUnsaved(false);

      if (isNewScene) {
        const savedData = await response.json().catch(() => null);
        const savedSceneId = savedData?.data?.scene_id || savedData?.scene_id || savedData?.data?.id || savedData?.id;

        if (savedSceneId) {
          setIsSaving(false);
          // Replace the current history entry so that pressing Back
          // doesn't return to the temporary `scene=new` route.
          const chapterQuery = targetChapterId ? `?chapterId=${encodeURIComponent(targetChapterId)}` : "";
          try {
            navigate(`/writer/${novelId}/scene/${savedSceneId}${chapterQuery}`, { replace: true });
          } catch (e) {
            // fallback to onNavigate if navigate isn't available
            if (typeof onNavigate === "function") {
              onNavigate("scene-editor", { novelId, chapterId: targetChapterId, sceneId: savedSceneId });
            }
          }
          return;
        }
      }

      await fetchSceneData();
      window.dispatchEvent(new Event("novel-data-updated"));
    } catch (err) {
      console.error("Save scene error:", err);
      setErrorMsg(err.message || "ไม่สามารถบันทึกข้อมูลฉากได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const targetChapterId = (chapterId && chapterId !== "new") ? chapterId : currentSelectedChapterId;
      if (!targetChapterId || targetChapterId === "new" || isNaN(parseInt(targetChapterId, 10))) {
        throw new Error("ไม่พบตอนสำหรับฉากนี้");
      }

      // 1. เผยแพร่ตัวฉากหลัก
      await handleSave(true, false);

      // 2. เผยแพร่ตัวตอนเพื่อให้คนอ่านมองเห็นด้วย
      const authToken = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      };

      const chRes = await fetch(`${API_BASE_URL}/chapters/${targetChapterId}`, { headers });
      if (chRes.ok) {
        const chResult = await chRes.json();
        const chData = chResult?.data || chResult;

        const payload = {
          novel_id: parseInt(novelId, 10),
          episode: chData.episode || 1,
          title: chData.title || "ตอนไม่มีชื่อ",
          status: "published" // อัปเดตตอนเป็นสถานะเผยแพร่
        };

        const putRes = await fetch(`${API_BASE_URL}/chapters/${targetChapterId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload)
        });

        if (!putRes.ok) {
          console.warn("ไม่สามารถเปลี่ยนสถานะของตอนเป็นเผยแพร่ได้");
        }
      }

      alert("เผยแพร่ตอนและฉากย่อยเรียบร้อยแล้วค่ะ!");
      await fetchSceneData();
    } catch (err) {
      console.error("Publish error:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเผยแพร่");
      setIsPublished(false); // Rollback UI if failed
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnding = async (value) => {
    if (value) {
      if (choices.length > 0) {
        setErrorMsg(
          "ฉากจบไม่สามารถสร้างทางเลือกต่อได้ **กรุณาลบตัวเลือกในฉากนี้ออก หรือเปลี่ยนประเภทฉากเพื่อไปต่อ**"
        );
        setTimeout(() => setErrorMsg(null), 8000);
        return;
      }

      if (sceneType === "start") {
        setErrorMsg("ไม่สามารถตั้งค่าฉากเริ่มต้นให้เป็นฉากจบได้ กรุณาเลือกฉากอื่นเป็นฉากจบ");
        setTimeout(() => setErrorMsg(null), 5000);
        return;
      }

      setIsEnding(true);
      setShowEndingSettingsDialog(true);
      return;
    }

    await handleSave(null, false, null, false);
  };

  const handleOpenEndingSettings = () => {
    if (choices.length > 0) {
      setErrorMsg(
        "ฉากจบไม่สามารถสร้างทางเลือกต่อได้ **กรุณาลบตัวเลือกในฉากนี้ออก หรือเปลี่ยนประเภทฉากเพื่อไปต่อ**"
      );
      setTimeout(() => setErrorMsg(null), 8000);
      return;
    }

    if (sceneType === "start") {
      setErrorMsg("ไม่สามารถตั้งค่าฉากเริ่มต้นให้เป็นฉากจบได้ กรุณาเลือกฉากอื่นเป็นฉากจบ");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    setShowEndingSettingsDialog(true);
  };

  const saveEndingSettings = async () => {
    if (sceneType === "start") {
      setErrorMsg("ไม่สามารถตั้งค่าฉากเริ่มต้นให้เป็นฉากจบได้ กรุณาเลือกฉากอื่นเป็นฉากจบ");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    setIsEnding(true);
    await handleSave(null, false, null, true);
    setShowEndingSettingsDialog(false);
  };

  const addChoice = () => {
    const newChoice = {
      id: `choice-new-${Date.now()}`,
      text: "",
      targetType: "same",
      targetSubScene: "",
    };
    setChoices((prev) => [...prev, newChoice]);
  };

  const updateChoice = (updated) => {
    setChoices((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const saveChoiceImmediately = async (updated) => {
    const nextChoices = choices.map((c) => (c.id === updated.id ? updated : c));
    if (!nextChoices.some((c) => c.id === updated.id)) {
      nextChoices.push(updated);
    }
    await handleSave(null, false, nextChoices);
  };

  const deleteChoice = (choiceId) => {
    if (String(choiceId).startsWith("choice-new-")) {
      setChoices((prev) => prev.filter((c) => c.id !== choiceId));
    } else {
      setChoiceToDelete(choiceId);
    }
  };

  const confirmDeleteChoice = () => {
    if (choiceToDelete) {
      const nextChoices = choices.filter((c) => c.id !== choiceToDelete);
      setChoices(nextChoices);
      setChoiceToDelete(null);
      handleSave(null, false, nextChoices);
    }
  };

  const handleAddScene = async (chId) => {
    // Open the add-scene dialog so user can input scene title before creating
    if (!chId) return;
    setSelectedChapterForNewScene(chId);
    setNewSceneTitle("");
    setShowAddSceneDialog(true);
  };

  const handleConfirmAddScene = async () => {
    if (!novelId || !selectedChapterForNewScene || !newSceneTitle.trim()) {
      setErrorMsg("กรุณากรอกชื่อฉาก");
      return;
    }

    if (!token) {
      alert("กรุณาเข้าสู่ระบบก่อนเพิ่มฉาก");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        novel_id: parseInt(novelId, 10),
        chapter_id: parseInt(selectedChapterForNewScene, 10),
        title: newSceneTitle.trim(),
        content: "",
        x: 0,
        y: 0,
        type: "normal",
        status: "draft",
      };

      const res = await fetch(`${API_BASE_URL}/scenes`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        console.error("สร้างฉากใหม่ล้มเหลว:", res.status, txt);
        setErrorMsg("ไม่สามารถสร้างฉากใหม่ได้ กรุณาลองใหม่");
        return;
      }

      const data = await res.json().catch(() => null) || {};
      const createdSceneId = data.scene_id ?? data.id ?? data.data?.scene_id ?? data.data?.id;

      // Persist a toast to be shown after navigation
      sessionStorage.setItem("toastMessage", `สร้างฉาก \"${newSceneTitle.trim()}\" สำเร็จ`);
      // set focus flag for scene title in the editor
      sessionStorage.setItem("focusSceneTitle", "true");

      await fetchSceneData();
      window.dispatchEvent(new Event("novel-data-updated"));

      setShowAddSceneDialog(false);
      setSelectedChapterForNewScene(null);
      setNewSceneTitle("");

      if (createdSceneId) {
        if (typeof onNavigate === "function") {
          onNavigate("scene-editor", { novelId, chapterId: selectedChapterForNewScene, sceneId: createdSceneId });
        } else {
          window.location.href = `/scene-editor/${novelId}/${selectedChapterForNewScene}/${createdSceneId}`;
        }
      } else {
        if (typeof onNavigate === "function") {
          onNavigate("scene-editor", { novelId, chapterId: selectedChapterForNewScene, sceneId: "new" });
        }
      }
    } catch (err) {
      console.error("Add scene error:", err);
      setErrorMsg("เกิดข้อผิดพลาดขณะเพิ่มฉาก");
    }
  };

  const handleAddChapter = () => {
    setNewChapterTitle("");
    setShowAddChapterDialog(true);
  };

  const handleConfirmAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    setIsAddingChapter(true);

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // 1. ส่งคำขอสร้างตอนใหม่ไปยัง API
      const response = await fetch(`${API_BASE_URL}/chapters`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          novel_id: parseInt(novelId, 10),
          title: newChapterTitle.trim(),
          episode: nextEpisode,
          status: "draft",
        }),
      });

      if (!response.ok) throw new Error("ไม่สามารถสร้างตอนใหม่ได้");

      const payload = await response.json().catch(() => null) || {};
      const createdData = payload?.data || payload?.chapter || payload || {};
      const createdChapterId = createdData.id || createdData.chapter_id || createdData.ChapterID || payload.chapter_id || Date.now();

      // 2. อัปเดต state chapters ทันทีเพื่อให้ Sidebar แสดงตอนใหม่โดยไม่ต้องรอ re-fetch
      const newChapterObj = {
        id: createdChapterId,
        chapter_id: createdChapterId,
        ChapterID: createdChapterId,
        title: createdData.title || newChapterTitle.trim(),
        Title: createdData.title || newChapterTitle.trim(),
        episode: createdData.episode || nextEpisode,
        Episode: createdData.episode || nextEpisode,
        scenes: []
      };

      setChapters((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const exists = prevArr.some(c => String(c.id ?? c.chapter_id ?? c.ChapterID) === String(createdChapterId));
        if (exists) return prevArr;
        return [...prevArr, newChapterObj];
      });

      // 3. เก็บข้อความ Toast ไว้ใน sessionStorage
      const chapterToast = `สร้างตอน "${newChapterTitle.trim()}" สำเร็จ`;
      try { sessionStorage.setItem("toastMessage", chapterToast); } catch (e) { /* ignore */ }

      // 4. สร้างฉากแรกอัตโนมัติทันที
      try {
        const sceneRes = await fetch(`${API_BASE_URL}/scenes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            novel_id: parseInt(novelId, 10),
            chapter_id: parseInt(createdChapterId, 10),
            title: "ฉากแรก",
            content: "",
            x: 0, y: 0,
            type: "normal",
            status: "draft",
          }),
        });

        const scenePayload = await sceneRes.json().catch(() => null) || {};
        const createdSceneId = scenePayload.scene_id ?? scenePayload.id ?? scenePayload.data?.scene_id;
      } catch (sceneError) {
        console.error("ไม่สามารถสร้างฉากแรกอัตโนมัติได้:", sceneError);
      }

      // 5. ดึงข้อมูลฉากทั้งหมดใหม่ และยิง Event แจ้งระบบ
      await fetchSceneData();
      window.dispatchEvent(new Event("novel-data-updated"));

      // ปิด Modal และเคลียร์ค่า
      setIsAddChapterModalOpen(false);
      setNewChapterTitle("");

    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการสร้างตอน:", err);
      alert(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsAddingChapter(false);
    }
  }; // <--- เช็คดี ๆ ว่าหลังปีกกานี้ ไม่มีเศษปีกกา } หรือก้อน catch อันอื่นโผล่มาซ้ำนะครับ
  const savedText = lastSaved
    ? `บันทึกแล้ว ${lastSaved.getHours().toString().padStart(2, "0")}:${lastSaved.getMinutes().toString().padStart(2, "0")} น.`
    : draftSavedAt
      ? `บันทึกอัตโนมัติ ${draftSavedAt.getHours().toString().padStart(2, "0")}:${draftSavedAt.getMinutes().toString().padStart(2, "0")} น.`
      : null;

  const safeChapters = Array.isArray(chapters) ? chapters : [];

  let effectiveChapterId = isNewScene ? currentSelectedChapterId : chapterId;

  if (!effectiveChapterId && sceneId && safeChapters.length > 0) {
    const sceneIdStr = String(sceneId);
    for (const ch of safeChapters) {
      const foundScene = (ch.scenes || []).find(
        (s) => String(s.id ?? s.scene_id ?? s.SceneID) === sceneIdStr
      );
      if (foundScene) {
        effectiveChapterId = ch.id ?? ch.chapter_id ?? ch.ChapterID;
        break;
      }
    }
  }

  const currentChIndex = safeChapters.findIndex(
    (c) => String(c.id ?? c.chapter_id ?? c.ChapterID ?? "") === String(effectiveChapterId ?? "")
  );

  const currentChDisplayNumber =
    currentChIndex !== -1
      ? (
        safeChapters[currentChIndex].chapterNumber ??
        safeChapters[currentChIndex].order_index ??
        (currentChIndex + 1)
      )
      : null;

  const currentChapterScenes =
    currentChIndex !== -1 && safeChapters[currentChIndex]
      ? (
        Array.isArray(safeChapters[currentChIndex].scenes)
          ? safeChapters[currentChIndex].scenes
          : []
      )
      : [];

  const currentScIndex = currentChapterScenes.findIndex(
    (s) => String(s.id ?? s.scene_id ?? s.SceneID ?? "") === String(sceneId ?? "")
  );

  let currentScDisplayNumber =
    currentScIndex !== -1
      ? (currentScIndex + 1)
      : null;

  // If creating a new scene, show it as the next scene number in the chapter
  if (isNewScene) {
    currentScDisplayNumber = (currentChapterScenes?.length || 0) + 1;
  }

  const handleOpenPreview = (e) => {
    if (e) e.preventDefault();

    if (isUnsaved) {
      setPendingAction("preview");
      return;
    }

    if (!novelId || !sceneId) return;
    window.open(`/reading/${novelId}/${sceneId}?preview=true`, "_blank", "noopener,noreferrer");
  };

  const handleBack = () => {
    if (isUnsaved) {
      setPendingAction("back");
      return;
    }

    if (typeof onNavigate === "function") {
      onNavigate("chapters", { novelId });
    } else {
      navigate(`/writer/${novelId}/chapters`);
    }
  };
  const handleDiscardPendingAction = (action) => {
    if (action === "back") {
      if (saveDraftTimer.current) {
        clearTimeout(saveDraftTimer.current);
      }
      clearDraft();
      setIsUnsaved(false);
    }

    setPendingAction(null);

    if (action === "back") {
      if (typeof onNavigate === "function") {
        onNavigate("chapters", { novelId });
      } else {
        navigate(`/writer/${novelId}/chapters`);
      }
    }
  };
  const handleConfirmPendingAction = async (action) => {
    if (!action) return;

    await handleSave(null, false);
    setPendingAction(null);

    if (action === "preview") {
      if (!novelId || !sceneId) return;
      window.open(`/reading/${novelId}/${sceneId}?preview=true`, "_blank", "noopener,noreferrer");
      return;
    }

    if (action === "back") {
      if (typeof onNavigate === "function") {
        onNavigate("chapters", { novelId });
      } else {
        navigate(`/writer/${novelId}/chapters`);
      }
    }
  };
  const isEmptyNovel = !isLoading && (
    sceneId === "empty" ||
    (sceneId !== "new" && (
      chapters.length === 0 ||
      chapters.every(ch => !ch.scenes || ch.scenes.length === 0)
    ))
  );

  // focus scene title when requested (e.g., after creating new chapter+scene)
  useEffect(() => {
    // เช็กว่าโหลดเสร็จแล้วค่อยทำงาน (กันบัค DOM ยังไม่สร้าง)
    if (!isLoading) {
      try {
        if (sessionStorage.getItem("focusSceneTitle") === "true") {
          // หน่วงเวลา 100ms ให้ Input ปรากฏบนหน้าจอก่อน
          setTimeout(() => {
            const el = document.getElementById("scene-title");
            if (el) {
              el.focus();
              if (typeof el.select === "function") el.select();
            }
          }, 100);
          sessionStorage.removeItem("focusSceneTitle");
        }

        const pendingToast = sessionStorage.getItem("toastMessage");
        if (pendingToast) {
          setToastMessage(pendingToast);
          setTimeout(() => setToastMessage(null), 2000);
          sessionStorage.removeItem("toastMessage");
        }
      } catch (err) {
        // ignore
      }
    }
  }, [sceneId, isLoading]);
  if (isEmptyNovel) {
    const searchParams = new URLSearchParams(window.location.search);
    const reasonParam = searchParams.get("reason");
    const isNoChapters = reasonParam === "no-chapters" || chapters.length === 0;

    const titleText = isNoChapters ? "ยังไม่มีตอน" : "ยังไม่มีฉาก";
    const descText = isNoChapters
      ? "คุณจำเป็นต้องสร้างตอน (Chapter) ในหน้าจัดการตอนก่อน ถึงจะสามารถเพิ่มฉากและเขียนเนื้อหาได้ค่ะ"
      : "คุณจำเป็นต้องเพิ่มฉาก (Scene) ในหน้าจัดการตอนก่อน ถึงจะสามารถเริ่มเขียนเนื้อหาได้ค่ะ";
    const targetUrlParams = isNoChapters ? { novelId } : { novelId, highlightEmpty: "true" };

    return (
      <div className="se-page" style={{ background: "var(--gray-50)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header className="se-header">
          {toastMessage && (
            <div style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#16a34a',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '10px',
              zIndex: 9999,
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
              fontWeight: '600',
              fontSize: '15px'
            }}>
              ✓ {toastMessage}
            </div>
          )}
          <div className="se-header__left">
            <button
              className="se-header__back"
              onClick={handleBack}
              aria-label="ย้อนกลับ"
            >
              ย้อนกลับ
            </button>
            <nav className="se-header__breadcrumb" aria-label="breadcrumb">
              <span className="se-header__bc-novel">เรื่อง: {novelTitle || "นิยายของคุณ"}</span>
            </nav>
          </div>
        </header>

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "60px 20px", flex: 1, minHeight: "70vh", textAlign: "center"
        }}>
          <div style={{
            background: "var(--white)", padding: "40px", borderRadius: "24px",
            boxShadow: "var(--shadow-md)", maxWidth: "500px", width: "100%",
            border: "1px solid var(--pink-100)", display: "flex", flexDirection: "column",
            alignItems: "center", gap: "20px"
          }}>
            <span style={{ fontSize: "64px" }}>{isNoChapters ? "📑" : "🎬"}</span>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--ink)", margin: 0 }}>
              {titleText}
            </h2>
            <p style={{ fontSize: "14.5px", color: "var(--gray-600)", lineHeight: "1.6", margin: 0 }}>
              {descText}
            </p>

            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "10px" }}>
              <button
                onClick={() => onNavigate("dashboard")}
                style={{
                  flex: 1, background: "var(--gray-100)", color: "var(--gray-600)",
                  border: "none", padding: "12px", borderRadius: "12px",
                  fontWeight: "700", cursor: "pointer", fontSize: "14px"
                }}
              >
                🏠 กลับ Dashboard
              </button>
              <button
                onClick={() => onNavigate("chapters", targetUrlParams)}
                style={{
                  flex: 1, background: "var(--pink-500)", color: "var(--white)",
                  border: "none", padding: "12px", borderRadius: "12px",
                  fontWeight: "700", cursor: "pointer", fontSize: "14px",
                  boxShadow: "var(--shadow-sm)"
                }}
              >
                📑 ไปหน้าจัดการตอน
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="se-page">
      {/* Header */}
      <header className="se-header">
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#16a34a',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '10px',
            zIndex: 9999,
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            fontWeight: '600',
            fontSize: '15px'
          }}>
            ✓ {toastMessage}
          </div>
        )}
        <div className="se-header__left">
          <button
            className="se-header__back"
            onClick={handleBack}
            aria-label="ย้อนกลับ"
          >
            ย้อนกลับ
          </button>

          <nav className="se-header__breadcrumb" aria-label="breadcrumb">
            <span className="se-header__bc-novel">
              เรื่อง: {novelTitle}
            </span>

            <span className="se-header__bc-sep">›</span>

            <span className="se-header__bc-chapter">
              {currentChDisplayNumber !== null && currentChDisplayNumber !== ""
                ? `ตอนที่ ${currentChDisplayNumber}`
                : "ตอน: ?"}{" "}
              {chapterTitle}
            </span>

            <span className="se-header__bc-sep">›</span>

            <span className="se-header__bc-scene">
              {currentChDisplayNumber !== null && currentChDisplayNumber !== "" && currentScDisplayNumber !== null && currentScDisplayNumber !== ""
                ? `ฉากที่ ${currentChDisplayNumber}.${currentScDisplayNumber}`
                : "ฉาก: ?"}{" "}
              {sceneLabel}
            </span>
          </nav>
        </div>

        <div className="se-header__right">
          {isSaving && <span className="se-header__saving">กำลังบันทึก...</span>}
          {!isSaving && savedText && <span className="se-header__saved">✓ {savedText}</span>}

          <button className="se-header__btn se-header__btn--save" onClick={() => handleSave(null, false)}>
            บันทึก
          </button>

          <button className="se-header__btn se-header__btn--publish" onClick={handlePublish}>
            เผยแพร่เลย
          </button>
        </div>
      </header>

      {errorMsg && <div className="se-error-banner" style={{ background: "#FEE2E2", color: "#DC2626", padding: "12px", textAlign: "center" }}>{errorMsg}</div>}

      <div className="se-body">
        {/* Sidebar */}
        <SceneTreeSidebar
          chapters={chapters}
          currentSceneId={sceneId}
          currentChapterId={effectiveChapterId}
          currentChapterTitle={chapterTitle}
          currentSceneLabel={sceneLabel}
          onSelectScene={(chId, sId) => onNavigate("scene-editor", { novelId, chapterId: chId, sceneId: sId })}
          onAddScene={handleAddScene}
          onAddChapter={handleAddChapter}
          isPublished={isPublished}
          isEnding={isEnding}
          setIsEnding={setIsEnding}
          onToggleEnding={handleToggleEnding}
          onOpenEndingSettings={handleOpenEndingSettings}
        />
        <main className="se-editor">
          <div className="se-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <div className="se-section__heading" style={{ marginBottom: 0 }}>เนื้อหาฉาก</div>
              <button
                className="se-header__btn se-header__btn--preview se-header__btn--preview-inline"
                type="button"
                onClick={handleOpenPreview}
                style={{ padding: "8px 14px", borderRadius: "10px", fontSize: "12px", height: "auto", margin: 0 }}
              >
                ▶ ทดลองอ่าน
              </button>
            </div>

            {/* ช่องกรอกชื่อฉาก */}
            <div className="se-field">
              <label className="se-label" htmlFor="scene-title">ชื่อฉาก</label>
              <input
                id="scene-title"
                className="se-input se-input--title"
                value={sceneTitle}
                onChange={(e) => {
                  setSceneTitle(e.target.value);
                  setIsUnsaved(true);
                }}
                placeholder="ชื่อฉาก..."
              />
            </div>

            {/* พื้นที่เนื้อเรื่อง (React Quill) */}
            <div className="se-field">
              <label className="se-label">เนื้อเรื่อง</label>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={content}
                onChange={(value) => {
                  if (value !== content) {
                    setContent(value);
                    setIsUnsaved(true);
                  }
                }}
                modules={quillModules}
                placeholder="เริ่มเขียนเนื้อหาฉากของคุณ..."
                className="se-quill"
              />
              <div className="se-field__hint" style={{ marginTop: "8px", color: "var(--gray-600)" }}>
                จำนวนตัวอักษร: {charCount}
              </div>
              {isImageUploading && (
                <div className="se-field__hint" style={{ color: "#2563eb", marginTop: "8px" }}>
                  กำลังอัปโหลดรูปภาพไปยัง MinIO...
                </div>
              )}
              {imageUploadError && (
                <div className="se-field__error" style={{ color: "#dc2626", marginTop: "8px" }}>
                  {imageUploadError}
                </div>
              )}
            </div>
          </div>

          {/* โซน Choices */}
          <div className="se-section se-section--choices">
            <div className="se-section__heading-row">
              <div className="se-section__heading">ตัวเลือกท้ายตอน</div>
              <button className="se-btn se-btn--add-choice" onClick={addChoice}>
                ✚ เพิ่มตัวเลือกใหม่
              </button>
            </div>

            <div className="se-choices-list">
              {choices.map((choice, i) => (
                <ChoiceCard
                  key={choice.id || choice._tempId || i}
                  choice={choice}
                  index={i}
                  allTargetOptions={chapters}
                  currentChapterId={chapterId}
                  currentSceneId={sceneId}
                  onUpdate={updateChoice}
                  onSave={saveChoiceImmediately}
                  onDelete={deleteChoice}
                />
              ))}

              {choices.length === 0 && (
                <div className="se-choices-empty">
                  <p>ยังไม่มีตัวเลือก (เมื่ออ่านมาถึงฉากนี้จะจบตอนทันที)</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Dialog เพิ่มตอนใหม่ */}
      {showAddChapterDialog && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "white", padding: "24px", borderRadius: "12px", maxWidth: "400px", width: "90%"
          }}>
            <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>เพิ่มตอนใหม่</h3>
            <input
              type="text"
              placeholder="ชื่อตอน..."
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              style={{
                width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd", marginBottom: "16px"
              }}
              onKeyPress={(e) => e.key === "Enter" && handleConfirmAddChapter()}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAddChapterDialog(false)}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ddd", background: "white" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmAddChapter}
                style={{ padding: "8px 16px", borderRadius: "6px", background: "var(--pink-500)", color: "white", border: "none" }}
              >
                สร้าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog ตั้งค่าฉากจบ */}
      {showEndingSettingsDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: "20px",
        }}>
          <div style={{
            width: "100%",
            maxWidth: "640px",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 18px 60px rgba(15, 23, 42, 0.18)",
            background: "#fff",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>กำหนดรายละเอียดฉากจบของคุณ</div>
                <div style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: "4px" }}>ข้อมูลส่วนนี้จะแสดงให้ผู้อ่านเห็น หลังจากอ่านมาถึงและปลดล็อกฉากจบนี้แล้วเท่านั้น</div>
              </div>
              <button
                onClick={() => setShowEndingSettingsDialog(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280" }}
                aria-label="ปิด"
              >
                ×
              </button>
            </div>
            <EndingSettings
              sceneTitle={sceneTitle || sceneLabel}
              isEnding={isEnding}
              endingTitle={endingTitle}
              endingType={endingType}
              endingDescription={endingDescription}
              endingDescriptionEnabled={endingDescriptionEnabled}
              onToggleEnding={setIsEnding}
              onToggleEndingDescriptionEnabled={setEndingDescriptionEnabled}
              onChangeEndingTitle={setEndingTitle}
              onChangeEndingType={setEndingType}
              onChangeEndingDescription={setEndingDescription}
              onSave={saveEndingSettings}
              onClose={() => setShowEndingSettingsDialog(false)}
            />
          </div>
        </div>
      )}

      {/* Dialog เพิ่มฉากใหม่ */}
      {showAddSceneDialog && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "white", padding: "24px", borderRadius: "12px", maxWidth: "400px", width: "90%"
          }}>
            <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>เพิ่มฉากใหม่</h3>
            <input
              type="text"
              placeholder="ชื่อฉาก..."
              value={newSceneTitle}
              onChange={(e) => setNewSceneTitle(e.target.value)}
              style={{
                width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd", marginBottom: "16px"
              }}
              onKeyPress={(e) => e.key === "Enter" && handleConfirmAddScene()}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAddSceneDialog(false)}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ddd", background: "white" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmAddScene}
                style={{ padding: "8px 16px", borderRadius: "6px", background: "var(--pink-500)", color: "white", border: "none" }}
              >
                สร้าง
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dialog ยืนยันการลบตัวเลือก (Custom Delete Confirmation Modal) */}
      {choiceToDelete && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(26, 22, 36, 0.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300
        }}>
          <div style={{
            background: "white", padding: "32px", borderRadius: "20px", maxWidth: "420px", width: "90%",
            boxShadow: "0 20px 50px rgba(45, 27, 61, 0.15)", textAlign: "center",
            border: "1px solid var(--gray-100)", animation: "se-scale-up 0.2s ease"
          }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%", background: "#fee2e2",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
              color: "#dc2626", fontSize: "28px"
            }}>
              ⚠️
            </div>
            <h3 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: 700, color: "var(--black)" }}>
              ยืนยันการลบตัวเลือก?
            </h3>
            <p style={{ color: "var(--gray-600)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
              คุณแน่ใจหรือไม่ที่จะลบตัวเลือกนี้? การดำเนินการนี้จะลบเส้นทางการเชื่อมโยงของฉากปลายทางออกและไม่สามารถกู้คืนได้
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => setChoiceToDelete(null)}
                style={{
                  flex: 1, padding: "10px 18px", borderRadius: "10px", border: "1px solid var(--gray-300)",
                  background: "white", color: "var(--gray-600)", fontWeight: "600", fontSize: "14px", cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteChoice}
                style={{
                  flex: 1, padding: "10px 18px", borderRadius: "10px", border: "none",
                  background: "#dc2626", color: "white", fontWeight: "600", fontSize: "14px", cursor: "pointer",
                  transition: "all 0.15s ease", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)"
                }}
              >
                ลบตัวเลือก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 Dialog แจ้งเตือนเมื่อลืมบันทึก (Custom Popup) */}
      {pendingAction && (
        <div className="se-modal-overlay">
          <div className="se-modal-content">
            <div className="se-modal-icon">⚠️</div>
            <h3 className="se-modal-title">มีเนื้อหาที่ยังไม่ได้บันทึก</h3>
            <p className="se-modal-desc">
              กรุณาบันทึกข้อมูลก่อน
              {pendingAction === "preview" ? "เข้าสู่โหมดทดลองอ่าน" : "ออกจากหน้านี้"}
              เพื่อป้องกันการสูญหาย
            </p>
            <div className="se-modal-actions">
              <button
                className="se-modal-btn se-modal-btn--cancel"
                onClick={() => handleDiscardPendingAction(pendingAction)}
              >
                {pendingAction === "back" ? "ออกโดยไม่บันทึก" : "ยกเลิก"}
              </button>
              <button
                className="se-modal-btn se-modal-btn--save"
                onClick={() => handleConfirmPendingAction(pendingAction)}
              >
                ✓ บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  {/* 🛑 Dialog แจ้งเตือนเมื่อลืมบันทึก (Custom Popup) */ }
  {
    pendingAction && (
      <div className="se-modal-overlay">
        <div className="se-modal-content">
          <div className="se-modal-icon">⚠️</div>
          <h3 className="se-modal-title">มีเนื้อหาที่ยังไม่ได้บันทึก</h3>
          <p className="se-modal-desc">
            กรุณาบันทึกข้อมูลก่อน
            {pendingAction === "preview" ? "เข้าสู่โหมดทดลองอ่าน" : "ออกจากหน้านี้"}
            เพื่อป้องกันการสูญหาย
          </p>
          <div className="se-modal-actions">
            <button
              className="se-modal-btn se-modal-btn--cancel"
              onClick={() => handleDiscardPendingAction(pendingAction)}
            >
              {pendingAction === "back" ? "ออกโดยไม่บันทึก" : "ยกเลิก"}
            </button>
            <button
              className="se-modal-btn se-modal-btn--save"
              onClick={() => handleConfirmPendingAction(pendingAction)}
            >
              ✓ บันทึก
            </button>
          </div>
        </div>
      </div>
    )
  }
};

export default SceneEditorPage;
