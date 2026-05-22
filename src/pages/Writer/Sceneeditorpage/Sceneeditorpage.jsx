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
  currentChapterId,
  onUpdate,
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
  const [targetLabel, setTargetLabel] = useState(choice.targetLabel || resolvedScene?.label || resolvedScene?.chapterTitle || "");
  const [subScene, setSubScene] = useState(initialTargetSubScene);
  const [selectedChapterId, setSelectedChapterId] = useState(initialChapterId);

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
    const found = findSceneByValue(val);
    if (found) setTargetLabel(found.label || found.chapterTitle);

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
        }}
      >
        {index + 1}
      </div>

      <div className="se-choice__body">
        <button
          className="se-choice__del"
          onClick={() => onDelete(choice.id)}
          aria-label="ลบตัวเลือก"
          title="ลบตัวเลือกนี้"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>

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
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Scene Tree Sidebar Component (คำนวณลำดับตอนและฉากอัตโนมัติ)
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
  triggerAutoSave
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

  const safeChapters = Array.isArray(chapters) ? chapters : [];

  // ─────────────────────────────────────────────
  // คำนวณหาลำดับ "ตอนที่เท่าไหร่" และ "ฉากที่เท่าไหร่" ของฉากปัจจุบันที่แก้ไขอยู่
  // ─────────────────────────────────────────────
  const currentChIndex = safeChapters.findIndex((c) => String(c.id ?? c.chapter_id ?? c.ChapterID) === String(currentChapterId));
  const currentChDisplayNumber = currentChIndex !== -1 
    ? (safeChapters[currentChIndex].chapterNumber || safeChapters[currentChIndex].order_index || (currentChIndex + 1)) 
    : "";

  const currentChapterScenes = currentChIndex !== -1 ? (Array.isArray(safeChapters[currentChIndex].scenes) ? safeChapters[currentChIndex].scenes : []) : [];
  const currentScIndex = currentChapterScenes.findIndex((s) => String(s.id ?? s.scene_id ?? s.SceneID) === String(currentSceneId));
  const currentScDisplayNumber = currentScIndex !== -1 ? (currentScIndex + 1) : "";

  return (
    <div className="se-tree" style={{ padding: "20px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      
      {/* 1. เส้นทางของตอนนี้ (กล่องสีชมพู) */}
      <div className="se-tree__header" style={{ marginBottom: "12px" }}>เส้นทางของตอนนี้</div>
      <div 
        className="se-tree__current-path" 
        style={{ 
          backgroundColor: 'var(--pink-50)', 
          padding: '14px', 
          borderRadius: '10px', 
          border: '1px solid var(--pink-200)',
          marginBottom: '20px' 
        }}
      >
        <div style={{ color: 'var(--pink-600)', fontWeight: 'bold', marginBottom: '6px', fontSize: '0.95rem' }}>
          ตอนที่ {currentChDisplayNumber || "-"}: {currentChapterTitle || "ไม่ระบุชื่อตอน"}
        </div>
        <div style={{ color: 'var(--gray-700)', fontSize: '0.9rem', lineHeight: '1.4', fontWeight: '500' }}>
          ฉากที่ {currentChDisplayNumber || "-"}.{currentScDisplayNumber || "-"}: {currentSceneLabel || "ฉากไม่มีชื่อ"}
        </div>
      </div>

      {/* 2. ตั้งค่าสถานะ (Toggles) */}
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
              triggerAutoSave();
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
              triggerAutoSave();
            }}
            id={`toggle-ending-sidebar`}
          />
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '0 0 20px 0' }} />

      {/* 3. ภาพรวมของนิยาย */}
      <div className="se-tree__header" style={{ marginBottom: "16px" }}>ภาพรวมของนิยาย</div>
      <div className="se-tree__list" style={{ flex: 1 }}>
        {safeChapters.map((ch, chapterIndex) => {
          const chapterKey = ch.id ?? ch.chapter_id ?? ch.ChapterID ?? chapterIndex;
          const isExpanded = expandedChapters.includes(chapterKey);
          const chapterScenes = Array.isArray(ch.scenes) ? ch.scenes : [];
          const hasActiveScene = chapterScenes.some((s) => String(s.id ?? s.scene_id ?? s.SceneID) === String(currentSceneId));
          
          const chDisplayNum = ch.chapterNumber || ch.order_index || (chapterIndex + 1);

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

                <span
                  className="se-tree__ch-dot"
                  style={{
                    background: hasActiveScene ? "var(--pink-500)" : "#4CAF82",
                  }}
                />
              </button>

              {isExpanded && (
                <div className="se-tree__scenes">
                  {chapterScenes.map((scene, sceneIndex) => {
                    const sceneKey = scene.id ?? scene.scene_id ?? scene.SceneID ?? sceneIndex;
                    const sceneIdValue = scene.id ?? scene.scene_id ?? scene.SceneID;
                    const chapterIdValue = ch.id ?? ch.chapter_id ?? ch.ChapterID;
                    const isCurrent = String(sceneIdValue) === String(currentSceneId);
                    
                    const scDisplayNum = sceneIndex + 1;

                    return (
                      <button
                        key={sceneKey}
                        className={`se-tree__scene-row ${isCurrent ? "se-tree__scene-row--active" : ""}`}
                        onClick={() => onSelectScene(chapterIdValue, sceneIdValue)}
                      >
                        ฉากที่ {chDisplayNum}.{scDisplayNum} — {scene.label || scene.title || scene.sceneTitle || "ฉากไม่มีชื่อ"}
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
      setIsPublished(sceneData.status === "published" || sceneData.isPublished || false);
      setIsEnding(sceneData.isEnding || sceneData.is_ending || false);

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

      const response = await fetch(`${API_BASE_URL}/scenes/${sceneId}`, {
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

  const triggerAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 2000);
  }, [sceneTitle, content, isPublished, isEnding, choices]);

  useEffect(() => {
    return () => clearTimeout(autoSaveTimer.current);
  }, [triggerAutoSave]);

  const handlePublish = () => {
    setIsPublished(true);
    handleSave(true);
  };

  const addChoice = () => {
    const newChoice = {
      id: `choice-new-${Date.now()}`,
      _tempId: `choice-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

  const handleAddScene = async (chId) => {
    if (!novelId || !chId) return;
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const response = await fetch(`${API_BASE_URL}/scenes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          novel_id: parseInt(novelId, 10),
          chapter_id: parseInt(chId, 10),
          title: "ฉากใหม่ยังไม่มีชื่อ",
          content: "",
          type: "normal",
        }),
      });

      if (response.ok) {
        fetchSceneData();
      }
    } catch (err) {
      console.error("Add scene error:", err);
    }
  };

  const handleAddChapter = async () => {
    if (!novelId) return;
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
          title: "ตอนใหม่ยังไม่มีชื่อ",
        }),
      });

      if (response.ok) {
        fetchSceneData();
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
          currentChapterId={chapterId}
          currentChapterTitle={chapterTitle}
          currentSceneLabel={sceneLabel}
          onSelectScene={(chId, sId) => onNavigate("scene-editor", { novelId, chapterId: chId, sceneId: sId })}
          onAddScene={handleAddScene}
          onAddChapter={handleAddChapter}
          isPublished={isPublished}
          setIsPublished={setIsPublished}
          isEnding={isEnding}
          setIsEnding={setIsEnding}
          triggerAutoSave={triggerAutoSave}
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
                  triggerAutoSave();
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
                  triggerAutoSave();
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