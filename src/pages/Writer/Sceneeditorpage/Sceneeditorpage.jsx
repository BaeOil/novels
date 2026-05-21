// ══════════════════════════════════════════════════════════════
//  หน้าเขียน/แก้ไขฉากนิยาย (Scene Editor) — ฝั่งนักเขียน 
//  [ เชื่อมต่อระบบหลังบ้านสมบูรณ์แบบ รองรับ JWT Token ]
// ══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import "./SceneEditorPage.css";
import Toggle from "../../../components/Toggle/Toggle";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─────────────────────────────────────────────
// React Quill config
// ─────────────────────────────────────────────
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "bullet",
  "align",
  "link",
  "image",
];

// ─────────────────────────────────────────────
// Choice Card Component
// ─────────────────────────────────────────────
const ChoiceCard = ({
  choice,
  index,
  allTargetOptions,
  onUpdate,
  onDelete,
}) => {
  const [text, setText] = useState(choice.text || "");
  const [targetType, setTargetType] = useState(choice.targetType || "same");
  const [targetLabel, setTargetLabel] = useState(choice.targetLabel || "");
  const [subScene, setSubScene] = useState(choice.targetSubScene || "");

  // ทำการ Map รายการบทและฉากทั้งหมดที่มี เพื่อเป็น Dropdown ปลายทาง
  const flatOptions = (allTargetOptions || []).flatMap((ch) =>
    (ch.scenes || []).map((s) => ({
      value: `${ch.id || ch.chapterId}||${s.id}`,
      label: `${ch.title || ch.chapterTitle} › ${s.label || s.title || s.sceneTitle}`,
      chapterTitle: ch.title || ch.chapterTitle,
    }))
  );

  const handleSubSceneChange = (val) => {
    setSubScene(val);
    const found = flatOptions.find((o) => o.value === val);
    if (found) setTargetLabel(found.chapterTitle);

    onUpdate?.({
      ...choice,
      text,
      targetType,
      targetSubScene: val,
    });
  };

  const COLORS = ["var(--pink-500)", "#F59E0B", "#6366F1"];

  return (
    <div className="se-choice">
      <div
        className="se-choice__num"
        style={{
          background: COLORS[index % COLORS.length] + "18",
          color: COLORS[index % COLORS.length],
          border: `1.5px solid ${COLORS[index % COLORS.length]}30`,
        }}
      >
        {index + 1}
      </div>

      <div className="se-choice__body">
        <div className="se-choice__titlerow">
          <input
            className="se-choice__text-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onUpdate?.({
                ...choice,
                text: e.target.value,
              });
            }}
            placeholder="ข้อความตัวเลือก..."
          />

          <div className="se-choice__target-badge">
            − {targetLabel || "เลือกตอน..."}
          </div>

          <button
            className="se-choice__del"
            onClick={() => onDelete(choice.id)}
            aria-label="ลบ"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 2l8 8M10 2l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="se-choice__config">
          <div className="se-choice__config-col">
            <div className="se-choice__config-label">ข้อความตัวเลือก</div>
            <input
              className="se-input"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onUpdate?.({ ...choice, text: e.target.value });
              }}
              placeholder="สำรวจแบบไม่ย่อท้อ..."
            />
          </div>

          <div className="se-choice__config-col">
            <div className="se-choice__config-label">ไปตอนใด</div>
            <div className="se-choice__radios">
              <label className="se-radio">
                <input
                  type="radio"
                  name={`tt-${choice.id}`}
                  value="same"
                  checked={targetType === "same"}
                  onChange={() => {
                    setTargetType("same");
                    onUpdate?.({ ...choice, targetType: "same" });
                  }}
                />
                <span className="se-radio__dot" />
                ไปฉากในตอนเดียวกัน
              </label>

              <label className="se-radio">
                <input
                  type="radio"
                  name={`tt-${choice.id}`}
                  value="other"
                  checked={targetType === "other"}
                  onChange={() => {
                    setTargetType("other");
                    onUpdate?.({ ...choice, targetType: "other" });
                  }}
                />
                <span className="se-radio__dot" />
                ไปฉากในตอนอื่น
              </label>
            </div>

            <select
              className="se-select"
              value={subScene}
              onChange={(e) => handleSubSceneChange(e.target.value)}
            >
              <option value="">เลือกฉากปลายทาง...</option>
              {flatOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
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
  onSelectScene,
  onAddScene,
  onAddChapter,
}) => {
  const [expandedChapters, setExpandedChapters] = useState([]);

  // ขยายเมนูกิ่งตอนอัตโนมัติหากมีฉากปัจจุบันอยู่ข้างใน
  useEffect(() => {
    if (chapters && chapters.length > 0) {
      const activeChs = chapters
        .filter((c) => (c.scenes || []).some((s) => String(s.id) === String(currentSceneId)))
        .map((c) => c.id);
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

  return (
    <div className="se-tree">
      <div className="se-tree__header">เส้นทางของตอนนี้</div>
      <div className="se-tree__list">
        {(chapters || []).map((ch) => {
          const isExpanded = expandedChapters.includes(ch.id);
          const hasActiveScene = (ch.scenes || []).some((s) => String(s.id) === String(currentSceneId));

          return (
            <div key={ch.id} className="se-tree__chapter" >
              <button
                className="se-tree__ch-row"
                onClick={() => toggleChapter(ch.id)}
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
                  ตอน {ch.chapterNumber || ch.order_index || ""} — {ch.title}
                </span>

                <span
                  className="se-tree__ch-dot"
                  style={{
                    background: hasActiveScene ? "var(--pink-500)" : "#4CAF82",
                  }}
                />
              </button>

              {isExpanded && (
                <div className="se-tree__scenes">
                  {(ch.scenes || []).map((scene) => {
                    const isCurrent = String(scene.id) === String(currentSceneId);
                    return (
                      <button
                        key={scene.id}
                        className={`se-tree__scene-row ${isCurrent ? "se-tree__scene-row--active" : ""}`}
                        onClick={() => onSelectScene(ch.id, scene.id)}
                      >
                        {scene.label || scene.title || scene.sceneTitle || "ฉากไม่มีชื่อ"}
                      </button>
                    );
                  })}

                  <button
                    className="se-tree__add-scene"
                    onClick={() => onAddScene(ch.id)}
                  >
                    + เพิ่มฉาก
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="se-tree__add-ch" onClick={onAddChapter}>
        เพิ่มตอนใหม่
      </button>
    </div>
  );
};

// ═════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════
const SceneEditorPage = ({
  novelId,
  chapterId,
  sceneId,
  onNavigate,
}) => {
  // ─────────────────────────────────────────
  // State 
  // ─────────────────────────────────────────
  const [novelTitle, setNovelTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [sceneLabel, setSceneLabel] = useState("");
  
  const [sceneTitle, setSceneTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [choices, setChoices] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const autoSaveTimer = useRef(null);
  const token = localStorage.getItem("token");

  // ─────────────────────────────────────────
  // Fetch Data จากหลังบ้านจริง
  // ─────────────────────────────────────────
  const fetchSceneData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. ดึงรายละเอียดฉากปัจจุบัน
      const sceneRes = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters/${chapterId}/scenes/${sceneId}`, {
        headers,
      });
      if (!sceneRes.ok) throw new Error("ไม่สามารถดึงข้อมูลรายละเอียดฉากได้");
      const sceneResult = await sceneRes.json();
      const sceneData = sceneResult?.data || sceneResult;

      // เซ็ตข้อมูลเข้าสเตตฟอร์ม
      setNovelTitle(sceneData.novelTitle || sceneData.novel_title || "ไม่ระบุชื่อนิยาย");
      setChapterTitle(sceneData.chapterTitle || sceneData.chapter_title || "ไม่ระบุชื่อตอน");
      setSceneLabel(sceneData.sceneLabel || sceneData.title || `ฉาก ${sceneData.id}`);
      setSceneTitle(sceneData.sceneTitle || sceneData.title || "");
      setContent(sceneData.content || "");
      setIsPublished(sceneData.status === "published" || sceneData.isPublished || false);
      setIsEnding(sceneData.isEnding || sceneData.is_ending || false);
      setChoices(sceneData.choices || []);

      // 2. ดึงโครงสร้างตอนทั้งหมดของนิยายเรื่องนี้มาทำ Sidebar และ Dropdown ปลายทาง
      const chaptersRes = await fetch(`${API_BASE_URL}/novels/${novelId}/structure`, {
        headers,
      });
      if (chaptersRes.ok) {
        const chaptersResult = await chaptersRes.json();
        setChapters(chaptersResult?.data || chaptersResult || []);
      }
    } catch (err) {
      console.error("Fetch Scene Data Error:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [novelId, chapterId, sceneId, token]);

  useEffect(() => {
    fetchSceneData();
  }, [fetchSceneData]);

  // ─────────────────────────────────────────
  // Save Function (ส่งไปหลังบ้านจริง)
  // ─────────────────────────────────────────
  const handleSave = async (overridePublishStatus = null) => {
    setIsSaving(true);
    try {
      const currentPublishState = overridePublishStatus !== null ? overridePublishStatus : isPublished;
      
      const payload = {
        title: sceneTitle.trim(),
        content: content,
        status: currentPublishState ? "published" : "draft",
        is_ending: isEnding,
        choices: choices, 
      };

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters/${chapterId}/scenes/${sceneId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "ไม่สามารถบันทึกข้อมูลฉากได้");
      }

      setLastSaved(new Date());
    } catch (err) {
      console.error("Save scene error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────
  // Auto Save Timer
  // ─────────────────────────────────────────
  const triggerAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 2000); // ดีเลย์บันทึกอัตโนมัติเมื่อหยุดพิมพ์ 2 วินาที
  }, [sceneTitle, content, isPublished, isEnding, choices]);

  useEffect(() => {
    return () => clearTimeout(autoSaveTimer.current);
  }, [triggerAutoSave]);

  // ─────────────────────────────────────────
  // Publish และจัดการ Action ต่างๆ
  // ─────────────────────────────────────────
  const handlePublish = () => {
    setIsPublished(true);
    handleSave(true);
  };

  const addChoice = () => {
    const newChoice = {
      id: `choice-new-${Date.now()}`,
      text: "",
      targetType: "same",
      targetSubScene: "",
      targetLabel: "เลือกตอน...",
    };
    setChoices((prev) => [...prev, newChoice]);
    triggerAutoSave();
  };

  const updateChoice = (updated) => {
    setChoices((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    triggerAutoSave();
  };

  const deleteChoice = (choiceId) => {
    setChoices((prev) => prev.filter((c) => c.id !== choiceId));
    triggerAutoSave();
  };

  // ── เพิ่มฉากใหม่เข้า API หลังบ้าน ──
  const handleAddScene = async (chId) => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const response = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters/${chId}/scenes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: "ฉากใหม่ยังไม่มีชื่อ" }),
      });

      if (response.ok) {
        fetchSceneData(); // โหลดโครงสร้างเมนูใหม่
      }
    } catch (err) {
      console.error("Add scene error:", err);
    }
  };

  // ── เพิ่มตอนใหม่เข้า API หลังบ้าน ──
  const handleAddChapter = async () => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: "ตอนใหม่ยังไม่มีชื่อ" }),
      });

      if (response.ok) {
        fetchSceneData(); // โหลดโครงสร้างเมนูใหม่
      }
    } catch (err) {
      console.error("Add chapter error:", err);
    }
  };

  const savedText = lastSaved
    ? `บันทึกแล้ว ${lastSaved.getHours().toString().padStart(2, "0")}:${lastSaved.getMinutes().toString().padStart(2, "0")} น.`
    : null;

  if (isLoading) {
    return (
      <div className="se-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "var(--pink-500)", fontSize: "1.2rem" }}>กำลังดึงข้อมูลเนื้อหาจากระบบหลังบ้าน...</p>
      </div>
    );
  }

  return (
    <div className="se-page">
      {/* Header */}
      <header className="se-header">
        <div className="se-header__left">
          <button
            className="se-header__back"
            onClick={() => onNavigate("chapters")}
            aria-label="กลับ"
          >
            กลับ
          </button>

          <nav className="se-header__breadcrumb" aria-label="breadcrumb">
            <span className="se-header__bc-novel">{novelTitle}</span>
            <span className="se-header__bc-sep">›</span>
            <span className="se-header__bc-chapter">{chapterTitle}</span>
            <span className="se-header__bc-sep">›</span>
            <span className="se-header__bc-scene">{sceneLabel}</span>
          </nav>
        </div>

        <div className="se-header__right">
          {isSaving && <span className="se-header__saving">กำลังบันทึก...</span>}
          {!isSaving && savedText && <span className="se-header__saved">✓ {savedText}</span>}

          <button className="se-header__btn se-header__btn--save" onClick={() => handleSave()}>
            บันทึก
          </button>

          <button className="se-header__btn se-header__btn--publish" onClick={handlePublish}>
            เผยแพร่ตอน
          </button>
        </div>
      </header>

      {errorMsg && <div className="se-error-banner" style={{ background: "#FEE2E2", color: "#DC2626", padding: "12px", textAlign: "center" }}>{errorMsg}</div>}

      <div className="se-body">
        {/* Sidebar */}
        <SceneTreeSidebar
          chapters={chapters}
          currentSceneId={sceneId}
          onSelectScene={(chId, sId) => onNavigate("scene-editor", { novelId, chapterId: chId, sceneId: sId })}
          onAddScene={handleAddScene}
          onAddChapter={handleAddChapter}
        />

        {/* Editor */}
        <main className="se-editor">
          <div className="se-section">
            <div className="se-section__heading">เนื้อหาฉาก</div>

            <div className="se-field">
              <label className="se-label" htmlFor="scene-title">ชื่อฉาก</label>
              <input
                id="scene-title"
                className="se-input se-input--title"
                value={sceneTitle}
                onChange={(e) => {
                  setSceneTitle(e.target.value);
                  triggerAutoSave();
                }}
                placeholder="ชื่อฉาก..."
              />
            </div>

            <div className="se-field">
              <label className="se-label">เนื้อเรื่อง</label>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={(value) => {
                  setContent(value);
                  triggerAutoSave();
                }}
                modules={quillModules}
                formats={quillFormats}
                placeholder="เริ่มเขียนเนื้อหาฉากของคุณ..."
                className="se-quill"
              />
            </div>
          </div>

          {/* Choices */}
          <div className="se-section se-section--choices">
            <div className="se-section__heading-row">
              <div className="se-section__heading">ตัวเลือกท้ายตอน</div>
              <button className="se-btn se-btn--add-choice" onClick={addChoice}>
                เพิ่มตัวเลือก
              </button>
            </div>

            <div className="se-choices-list">
              {choices.map((choice, i) => (
                <ChoiceCard
                  key={choice.id}
                  choice={choice}
                  index={i}
                  allTargetOptions={chapters}
                  onUpdate={updateChoice}
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
    </div>
  );
};

export default SceneEditorPage;
