// ══════════════════════════════════════════════════════════════
//  หน้าเขียน/แก้ไขฉากนิยาย (Scene Editor) — ฝั่งนักเขียน 
//  [ ปรับแต่งเชื่อมต่อ Go หลังบ้าน ผ่าน /scenes/:id และ /story-tree ]
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
  currentChapterId,
  onUpdate,
  onSave,
  onDelete,
}) => {
  const allScenes = (Array.isArray(allTargetOptions) ? allTargetOptions : []).flatMap((ch) => {
    const scenes = Array.isArray(ch.scenes) ? ch.scenes : [];
    const chapterTitle = ch.title || ch.chapterTitle || "";
    const chapterId = ch.id || ch.chapterId || ch.ChapterID || ch.chapter_id || "";
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
  const [errorMessage, setErrorMessage] = useState("");

  // State ควบคุมโหมดการแก้ไข (ถ้าเป็นตัวเลือกใหม่ให้เป็นโหมดแก้ไขทันที)
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
  }, [allScenes.length]);

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

  const handleScopeChange = (scopeValue) => {
    setTargetType(scopeValue);
    const nextChapterId = scopeValue === "same" ? currentChapterId : otherChapterOptions[0]?.chapterId || currentChapterId;
    setSelectedChapterId(nextChapterId);
    const nextScene = allScenes.find((scene) => String(scene.chapterId) === String(nextChapterId));
    if (nextScene) {
      setSubScene(nextScene.value);
      setTargetLabel(nextScene.label);
      onUpdate?.({
        ...choice,
        text,
        targetType: scopeValue,
        targetSubScene: nextScene.value,
      });
    }
  };

  const handleChapterChange = (chapterId) => {
    setSelectedChapterId(chapterId);
    const firstScene = allScenes.find((scene) => String(scene.chapterId) === String(chapterId));
    if (firstScene) {
      setSubScene(firstScene.value);
      setTargetLabel(firstScene.label);
      onUpdate?.({
        ...choice,
        text,
        targetType,
        targetSubScene: firstScene.value,
      });
    }
  };

  const handleSubSceneChange = (val) => {
    setSubScene(val);
    setErrorMessage("");
    const found = findSceneByValue(val);
    if (found) setTargetLabel(found.label || found.chapterTitle);

    onUpdate?.({
      ...choice,
      text,
      targetType,
      targetSubScene: val,
    });
  };

  const handleSaveEdit = () => {
    if (!text.trim()) {
      setErrorMessage("กรุณากรอกข้อความตัวเลือก");
      return;
    }

    if (!subScene) {
      setErrorMessage("กรุณาเลือกฉากปลายทาง");
      return;
    }

    setErrorMessage("");
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

  const COLORS = ["#f50bc6", "#F59E0B", "#6366F1"];

  return (
    <div className="se-choice">
      <div
        className="se-choice__num"
        style={{
          background: COLORS[index % COLORS.length] + "18",
          color: COLORS[index % COLORS.length],
        }}
      >
        {index + 1}
      </div>

      <div className="se-choice__body">
        {/* === โหมดแสดงผล (อ่านอย่างเดียว) === */}
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
              <button className="se-choice__btn-action se-choice__btn-action--del" onClick={() => onDelete(choice.id)}>ลบตัวเลือก</button>
              <button className="se-choice__btn-action se-choice__btn-action--edit" onClick={() => setIsEditing(true)}>✏️ แก้ไข</button>
            </div>
          </div>
        ) : (
          /* === โหมดแก้ไขข้อมูล === */
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
                  <option value="">เลือกฉากปลายทาง...</option>
                  {sceneOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="se-choice__actions">
              <button className="se-choice__btn-action se-choice__btn-action--del" onClick={() => onDelete(choice.id)}>ลบทิ้ง</button>
              <button className="se-choice__btn-action se-choice__btn-action--save" onClick={handleSaveEdit}>
                ✓ ตกลง
              </button>
            </div>
            {errorMessage && (
              <div className="se-choice__error" style={{ color: "#d32f2f", marginTop: "10px", fontSize: "0.88rem" }}>
                {errorMessage}
              </div>
            )}
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
  setIsPublished,
  isEnding,
  setIsEnding,
}) => {
  const [expandedChapters, setExpandedChapters] = useState([]);

  useEffect(() => {
    if (chapters && chapters.length > 0) {
      const activeChs = chapters
        .filter((c) => (c.scenes || []).some((s) => String(s.id ?? s.scene_id ?? s.SceneID) === String(currentSceneId)))
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

  // ฟังก์ชันคำนวณสถานะฉาก
  const getSceneStatus = (scene, allChapters) => {
    const sceneType = scene.type || scene.scene_type || "normal";
    if (sceneType === "ending") return "ending";
    if (sceneType === "start") return "start";
    
    // ตรวจสอบว่ามีการเชื่อมต่อ (incoming/outgoing edges) หรือไม่
    // หากไม่มี = orphan
    const hasConnection = scene.has_connection !== false && scene.hasConnection !== false;
    if (!hasConnection) return "orphan";
    
    return "normal";
  };

  const safeChapters = Array.isArray(chapters) ? chapters : [];

  const currentChIndex = safeChapters.findIndex((c) => String(c.id ?? c.chapter_id ?? c.ChapterID) === String(currentChapterId));
  const currentChDisplayNumber = currentChIndex !== -1
    ? (
      safeChapters[currentChIndex].chapterNumber ??
      safeChapters[currentChIndex].order_index ??
      (currentChIndex + 1)
    )
    : "";

  return (
    <div className="se-tree" style={{ padding: "20px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div className="se-tree__header" style={{ marginBottom: "12px" }}>ตั้งค่าสถานะ</div>
      <div className="se-tree__toggles" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--gray-800)' }}>สถานะการเผยแพร่</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{isPublished ? "เผยแพร่แล้ว" : "ซ่อน (ฉบับร่าง)"}</span>
          </div>
          <Toggle
            checked={isPublished}
            onChange={(value) => {
              setIsPublished(value);
              handleSave(value, false, null); // 🔧 บันทึกอัตโนมัติเมื่อเปลี่ยนสถานะเผยแพร่
            }}
            id={`toggle-publish-sidebar`}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--gray-800)' }}>จุดจบของเรื่อง</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{isEnding ? "ใช่ (นี่คือตอนจบ)" : "ไม่ใช่"}</span>
          </div>
          <Toggle
            checked={isEnding}
            onChange={(value) => {
              setIsEnding(value);
              handleSave(null, false, null, value); // 🔧 บันทึกอัตโนมัติเมื่อเปลี่ยนสถานะจุดจบ
            }}
            id={`toggle-ending-sidebar`}
          />
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '0 0 20px 0' }} />

      <div className="se-tree__header" style={{ marginBottom: "16px" }}>ภาพรวมของนิยาย</div>
      <div className="se-tree__list" style={{ flex: 1 }}>
        {safeChapters.map((ch, chapterIndex) => {
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
                    
                    // สถานะและข้อความเตือน
                    let statusIcon = "●";
                    let statusColor = "#ffffff"; // สีเทาเป็นค่าเริ่มต้น
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
}) => {
  const [novelTitle, setNovelTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [sceneLabel, setSceneLabel] = useState("");

  const [sceneTitle, setSceneTitle] = useState("");
  const [content, setContent] = useState("");
  const [sceneType, setSceneType] = useState("normal");
  const [isPublished, setIsPublished] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [choices, setChoices] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 🎯 State สำหรับ dialog เพิ่มตอน/ฉากใหม่
  const [showAddChapterDialog, setShowAddChapterDialog] = useState(false);
  const [showAddSceneDialog, setShowAddSceneDialog] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [selectedChapterForNewScene, setSelectedChapterForNewScene] = useState(null);

  const token = localStorage.getItem("token");

  const fetchSceneData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const sceneRes = await fetch(`${API_BASE_URL}/scenes/${sceneId}`, {
        headers,
      });
      if (!sceneRes.ok) throw new Error("ไม่สามารถดึงข้อมูลรายละเอียดฉากได้");
      const sceneResult = await sceneRes.json();
      const sceneData = sceneResult?.data || sceneResult;

      setNovelTitle(sceneData.novelTitle || sceneData.novel_title || "ไม่ระบุชื่อนิยาย");
      setChapterTitle(sceneData.chapterTitle || sceneData.chapter_title || "ไม่ระบุชื่อตอน");
      setSceneLabel(
        sceneData.sceneLabel || sceneData.scene_label || sceneData.sceneTitle || sceneData.scene_title || sceneData.title || `ฉาก ${sceneData.scene_id || sceneData.id}`
      );
      setSceneTitle(sceneData.sceneTitle || sceneData.scene_title || sceneData.title || "");
      setContent(sceneData.content || "");
      setSceneType(sceneData.type || sceneData.scene_type || "normal");
      setIsPublished(sceneData.status === "published" || sceneData.isPublished || false);
      setIsEnding(sceneData.type === "ending" || sceneData.isEnding || sceneData.is_ending || false);

      const normalizedChoices = (Array.isArray(sceneData.choices) ? sceneData.choices : []).map((choice) => ({
        ...choice,
        id: choice.id ?? choice.choice_id ?? choice.choiceId ?? `choice-${choice.choice_id || choice.id || Date.now()}`,
        text: choice.text ?? choice.label ?? choice.Label ?? "",
        targetSubScene: choice.targetSubScene ?? choice.to_scene_id ?? choice.toSceneID ?? choice.toSceneId ?? "",
      }));
      setChoices(normalizedChoices);

      const chaptersRes = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters`, {
        headers,
      });
      if (chaptersRes.ok) {
        const chaptersResult = await chaptersRes.json();
        const chaptersData =
          chaptersResult?.data?.chapters ||
          chaptersResult?.chapters ||
          chaptersResult?.data ||
          chaptersResult ||
          [];
        setChapters(Array.isArray(chaptersData) ? chaptersData : []);
      }
    } catch (err) {
      console.error("Fetch Scene Data Error:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [novelId, sceneId, token]);

  useEffect(() => {
    fetchSceneData();
  }, [fetchSceneData]);

  const handleSave = async (overridePublishStatus = null, returnToManager = false, overrideChoices = null, overrideIsEnding = null) => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const currentPublishState = overridePublishStatus !== null ? overridePublishStatus : isPublished;
      const currentIsEnding = overrideIsEnding !== null ? overrideIsEnding : isEnding;
      const currentChoices = Array.isArray(overrideChoices) ? overrideChoices : choices;

      // 1. บันทึกข้อมูลตัวฉากหลัก พร้อมส่งตัวเลือกปัจจุบันไปให้ backend sync ด้วย
      const payload = {
        title: sceneTitle.trim() || "ฉากไม่มีชื่อ",
        content: content,
        type: currentIsEnding
          ? "ending"
          : sceneType === "ending"
            ? "normal"
            : sceneType || "normal",
        status: currentPublishState ? "published" : "draft",
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

      const response = await fetch(`${API_BASE_URL}/scenes/${sceneId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || "ไม่สามารถบันทึกข้อมูลฉากได้");
      }

      // 3. บันทึกทุกอย่างเสร็จ ทำการอัปเดตเวลาและดึงข้อมูลใหม่มาแสดงผล
      setLastSaved(new Date());
      await fetchSceneData();

      if (returnToManager && typeof onNavigate === "function") {
        onNavigate("chapters", { novelId });
      }
    } catch (err) {
      console.error("Save scene error:", err);
      setErrorMsg(err.message || "ไม่สามารถบันทึกข้อมูลฉากได้");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePublish = () => {
    // 🔧 บันทึกฉากโดยตั้ง status เป็น "published"
    // fetchSceneData() จะอัปเดต isPublished state โดยอัตโนมัติหลังจากบันทึก
    handleSave(true, false);
  };

  const addChoice = () => {
    const newChoice = {
      id: `choice-new-${Date.now()}`,
      text: "",
      targetType: "same",
      targetSubScene: "",
    };
    // ดันกล่องตัวเลือกลงหน้าจอ โดยยังไม่เซฟลงฐานข้อมูลจนกว่าจะกดปุ่มบันทึก
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
    setChoices((prev) => prev.filter((c) => c.id !== choiceId));
  };

  const handleAddScene = async (chId) => {
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

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/scenes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          novel_id: parseInt(novelId, 10),
          chapter_id: parseInt(selectedChapterForNewScene, 10),
          title: newSceneTitle.trim(),
          content: "",
          type: "normal",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const newSceneId = result?.data?.scene_id || result?.scene_id;
        if (newSceneId && typeof onNavigate === "function") {
          onNavigate("scene-editor", { novelId, chapterId: selectedChapterForNewScene, sceneId: newSceneId });
        }
        setShowAddSceneDialog(false);
        setNewSceneTitle("");
      } else {
        setErrorMsg("ไม่สามารถสร้างฉากใหม่ได้");
      }
    } catch (err) {
      console.error("Add scene error:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleAddChapter = async () => {
    setNewChapterTitle("");
    setShowAddChapterDialog(true);
  };

  const handleConfirmAddChapter = async () => {
    if (!novelId || !newChapterTitle.trim()) {
      setErrorMsg("กรุณากรอกชื่อตอน");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const nextEpisode = (chapters?.length || 0) + 1;
      const response = await fetch(`${API_BASE_URL}/chapters`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          novel_id: parseInt(novelId, 10),
          episode: nextEpisode,
          title: newChapterTitle.trim(),
        }),
      });

      if (response.ok) {
        fetchSceneData();
        setShowAddChapterDialog(false);
        setNewChapterTitle("");
      } else {
        setErrorMsg("ไม่สามารถสร้างตอนใหม่ได้");
      }
    } catch (err) {
      console.error("Add chapter error:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const savedText = lastSaved
    ? `บันทึกแล้ว ${lastSaved.getHours().toString().padStart(2, "0")}:${lastSaved.getMinutes().toString().padStart(2, "0")} น.`
    : null;
  // ─────────────────────────────────────────────
  // คำนวณลำดับเพื่อแสดงใน Breadcrumb ด้านบน
  // ─────────────────────────────────────────────

  const safeChapters = Array.isArray(chapters) ? chapters : [];

  // ✅ ใช้ chapterId จาก props แต่ถ้า empty ให้หาจาก chapters ตัวแรก
  let effectiveChapterId = chapterId;
  
  if (!effectiveChapterId && sceneId && safeChapters.length > 0) {
    // หากไม่มี chapterId ให้ดึงมาจาก chapters ที่มี scene นี้
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

  console.log("DEBUG - effectiveChapterId:", effectiveChapterId, "sceneId:", sceneId);
  console.log("DEBUG - chapters:", safeChapters);

  // หา chapter ปัจจุบัน
  const currentChIndex = safeChapters.findIndex(
    (c) => {
      const cId = String(c.id ?? c.chapter_id ?? c.ChapterID ?? "");
      const checkId = String(effectiveChapterId ?? "");
      console.log("DEBUG - comparing cId:", cId, "checkId:", checkId, "match:", cId === checkId);
      return cId === checkId;
    }
  );

  // เลขตอน
  const currentChDisplayNumber =
    currentChIndex !== -1
      ? (
        safeChapters[currentChIndex].chapterNumber ??
        safeChapters[currentChIndex].order_index ??
        (currentChIndex + 1)
      )
      : null;

  // scenes ของ chapter ปัจจุบัน
  const currentChapterScenes =
    currentChIndex !== -1 && safeChapters[currentChIndex]
      ? (
        Array.isArray(safeChapters[currentChIndex].scenes)
          ? safeChapters[currentChIndex].scenes
          : []
      )
      : [];

  // หา scene ปัจจุบัน
  const currentScIndex = currentChapterScenes.findIndex(
    (s) => {
      const sId = String(s.id ?? s.scene_id ?? s.SceneID ?? "");
      const checkId = String(sceneId ?? "");
      return sId === checkId;
    }
  );

  // เลขฉาก
  const currentScDisplayNumber =
    currentScIndex !== -1
      ? (currentScIndex + 1)
      : null;

  console.log("FINAL: currentChDisplayNumber:", currentChDisplayNumber, "currentScDisplayNumber:", currentScDisplayNumber);

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

          <button className="se-header__btn se-header__btn--save" onClick={() => handleSave(null, true)}>
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
          currentChapterId={effectiveChapterId}
          currentChapterTitle={chapterTitle}
          currentSceneLabel={sceneLabel}
          onSelectScene={(chId, sId) => onNavigate("scene-editor", { novelId, chapterId: chId, sceneId: sId })}
          onAddScene={handleAddScene}
          onAddChapter={handleAddChapter}
          isPublished={isPublished}
          setIsPublished={setIsPublished}
          isEnding={isEnding}
          setIsEnding={setIsEnding}
        />

        {/* Editor (ฝั่งขวา) */}
        <main className="se-editor">
          <div className="se-section">
            <div className="se-section__heading">เนื้อหาฉาก</div>

            {/* ช่องกรอกชื่อฉาก */}
            <div className="se-field">
              <label className="se-label" htmlFor="scene-title">ชื่อฉาก</label>
              <input
                id="scene-title"
                className="se-input se-input--title"
                value={sceneTitle}
                onChange={(e) => {
                  setSceneTitle(e.target.value);
                }}
                placeholder="ชื่อฉาก..."
              />
            </div>

            {/* พื้นที่เนื้อเรื่อง (React Quill) */}
            <div className="se-field">
              <label className="se-label">เนื้อเรื่อง</label>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={(value) => {
                  setContent(value);
                }}
                modules={quillModules}
                formats={quillFormats}
                placeholder="เริ่มเขียนเนื้อหาฉากของคุณ..."
                className="se-quill"
              />
            </div>
          </div>

          {/* โซน Choices */}
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
                  key={choice.id || choice._tempId || i}
                  choice={choice}
                  index={i}
                  allTargetOptions={chapters}
                  currentChapterId={chapterId}
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
    </div>
  );
};

export default SceneEditorPage;
