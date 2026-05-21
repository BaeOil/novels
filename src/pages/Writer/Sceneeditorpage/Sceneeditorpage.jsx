// src/pages/Writer/SceneEditor/SceneEditorPage.jsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";

import "./SceneEditorPage.css";
import Toggle from "../../../components/Toggle/Toggle";
import {
  mockSceneDetail,
  mockSceneTargetOptions,
} from "../../../data/mockChapterData";

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
// Choice Card
// ─────────────────────────────────────────────
const ChoiceCard = ({
  choice,
  index,
  allTargetOptions,
  onUpdate,
  onDelete,
}) => {
  const [text, setText] = useState(choice.text);
  const [targetType, setTargetType] = useState(
    choice.targetType || "same"
  );
  const [targetLabel, setTargetLabel] = useState(
    choice.targetLabel || ""
  );
  const [subScene, setSubScene] = useState(
    choice.targetSubScene || ""
  );

  const flatOptions = allTargetOptions.flatMap((ch) =>
    ch.scenes.map((s) => ({
      value: `${ch.chapterId}||${s.id}`,
      label: `${ch.chapterTitle} › ${s.label}`,
      chapterTitle: ch.chapterTitle,
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
          background:
            COLORS[index % COLORS.length] + "18",
          color: COLORS[index % COLORS.length],
          border: `1.5px solid ${
            COLORS[index % COLORS.length]
          }30`,
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
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
            <div className="se-choice__config-label">
              ข้อความตัวเลือก
            </div>

            <input
              className="se-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="สำรวจแบบไม่ย่อท้อ..."
            />
          </div>

          <div className="se-choice__config-col">
            <div className="se-choice__config-label">
              ไปตอนใด
            </div>

            <div className="se-choice__radios">
              <label className="se-radio">
                <input
                  type="radio"
                  name={`tt-${choice.id}`}
                  value="same"
                  checked={targetType === "same"}
                  onChange={() => setTargetType("same")}
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
                  onChange={() => setTargetType("other")}
                />

                <span className="se-radio__dot" />

                ไปฉากในตอนอื่น
              </label>
            </div>

            <select
              className="se-select"
              value={subScene}
              onChange={(e) =>
                handleSubSceneChange(e.target.value)
              }
            >
              <option value="">
                เลือกฉากปลายทาง...
              </option>

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
// Scene Tree Sidebar
// ─────────────────────────────────────────────
const SceneTreeSidebar = ({
  chapters,
  currentSceneId,
  onSelectScene,
  onAddScene,
  onAddChapter,
}) => {
  const [expandedChapters, setExpandedChapters] =
    useState(
      chapters
        .filter((c) => c.isExpanded)
        .map((c) => c.id)
    );

  const toggleChapter = (chId) => {
    setExpandedChapters((prev) =>
      prev.includes(chId)
        ? prev.filter((id) => id !== chId)
        : [...prev, chId]
    );
  };

  return (
    <div className="se-tree">
      <div className="se-tree__header">
        เส้นทางของตอนนี้
      </div>

      <div className="se-tree__list">
        {chapters.map((ch) => {
          const isExpanded =
            expandedChapters.includes(ch.id);

          return (
            <div
              key={ch.id}
              className="se-tree__chapter"
            >
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
                    transform: isExpanded
                      ? "rotate(90deg)"
                      : "none",
                    transition: "transform .18s",
                    flexShrink: 0,
                  }}
                >
                  <path
                    d="M4 3l4 3-4 3V3z"
                    fill="currentColor"
                  />
                </svg>

                <span className="se-tree__ch-label">
                  ตอน {ch.chapterNumber} — {ch.title}
                </span>

                <span
                  className="se-tree__ch-dot"
                  style={{
                    background: ch.scenes.some(
                      (s) => s.isCurrent
                    )
                      ? "var(--pink-500)"
                      : "#4CAF82",
                  }}
                />
              </button>

              {isExpanded && (
                <div className="se-tree__scenes">
                  {ch.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      className={`se-tree__scene-row ${
                        scene.isCurrent
                          ? "se-tree__scene-row--active"
                          : ""
                      }`}
                      onClick={() =>
                        onSelectScene(ch.id, scene.id)
                      }
                    >
                      {scene.label}
                    </button>
                  ))}

                  <button
                    className="se-tree__add-scene"
                    onClick={() => onAddScene(ch.id)}
                  >
                    เพิ่มฉาก
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="se-tree__add-ch"
        onClick={onAddChapter}
      >
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
  const scene = mockSceneDetail;

  // ─────────────────────────────────────────
  // State
  // ─────────────────────────────────────────
  const [sceneTitle, setSceneTitle] = useState(
    scene.sceneTitle
  );

  const [content, setContent] = useState(
    scene.content || ""
  );

  const [isPublished, setIsPublished] =
    useState(scene.isPublished);

  const [isEnding, setIsEnding] =
    useState(scene.isEnding);

  const [choices, setChoices] = useState(
    scene.choices
  );

  const [isSaving, setIsSaving] =
    useState(false);

  const [lastSaved, setLastSaved] =
    useState(null);

  const [chapters, setChapters] = useState(
    scene.allChapters
  );

  // ─────────────────────────────────────────
  // Auto Save
  // ─────────────────────────────────────────
  const autoSaveTimer = useRef(null);

  const triggerAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      setIsSaving(true);

      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date());
      }, 600);
    }, 1500);
  }, []);

  useEffect(() => {
    return () =>
      clearTimeout(autoSaveTimer.current);
  }, []);

  // ─────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────
  const handleSave = () => {
    const payload = {
      sceneTitle,
      content,
      isPublished,
      isEnding,
      choices,
    };

    console.log(payload);

    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 600);
  };

  // ─────────────────────────────────────────
  // Publish
  // ─────────────────────────────────────────
  const handlePublish = () => {
    setIsPublished(true);
    handleSave();
  };

  // ─────────────────────────────────────────
  // Choices
  // ─────────────────────────────────────────
  const addChoice = () => {
    const newChoice = {
      id: `choice-new-${Date.now()}`,
      orderIndex: choices.length + 1,
      text: "",
      targetChapterId: "",
      targetSceneId: "",
      targetLabel: "เลือกตอน...",
      targetType: "same",
      targetSubScene: "",
    };

    setChoices((prev) => [...prev, newChoice]);
  };

  const updateChoice = (updated) => {
    setChoices((prev) =>
      prev.map((c) =>
        c.id === updated.id ? updated : c
      )
    );

    triggerAutoSave();
  };

  const deleteChoice = (choiceId) => {
    setChoices((prev) =>
      prev.filter((c) => c.id !== choiceId)
    );

    triggerAutoSave();
  };

  // ─────────────────────────────────────────
  // Last Saved Text
  // ─────────────────────────────────────────
  const savedText = lastSaved
    ? `บันทึกแล้ว ${lastSaved
        .getHours()
        .toString()
        .padStart(2, "0")}:${lastSaved
        .getMinutes()
        .toString()
        .padStart(2, "0")} น.`
    : null;

  return (
    <div className="se-page">
      {/* Header */}
      <header className="se-header">
        <div className="se-header__left">
          <button
            className="se-header__back"
            onClick={() =>
              onNavigate("chapters")
            }
            aria-label="กลับ"
          >
            กลับ
          </button>

          <nav
            className="se-header__breadcrumb"
            aria-label="breadcrumb"
          >
            <span className="se-header__bc-novel">
              {scene.novelTitle}
            </span>

            <span className="se-header__bc-sep">
              ›
            </span>

            <span className="se-header__bc-chapter">
              {scene.chapterTitle}
            </span>

            <span className="se-header__bc-sep">
              ›
            </span>

            <span className="se-header__bc-scene">
              {scene.sceneLabel}
            </span>
          </nav>
        </div>

        <div className="se-header__right">
          {isSaving && (
            <span className="se-header__saving">
              กำลังบันทึก...
            </span>
          )}

          {!isSaving && savedText && (
            <span className="se-header__saved">
              ✓ {savedText}
            </span>
          )}

          <button
            className="se-header__btn se-header__btn--save"
            onClick={handleSave}
          >
            บันทึก
          </button>

          <button
            className="se-header__btn se-header__btn--publish"
            onClick={handlePublish}
          >
            เผยแพร่ตอน
          </button>
        </div>
      </header>

      <div className="se-body">
        {/* Sidebar */}
        <SceneTreeSidebar
          chapters={chapters}
          currentSceneId={sceneId}
          onSelectScene={(chId, sId) => {}}
          onAddScene={(chId) => {
            setChapters((prev) =>
              prev.map((ch) =>
                ch.id === chId
                  ? {
                      ...ch,
                      scenes: [
                        ...ch.scenes,
                        {
                          id: `new-${Date.now()}`,
                          label: `${
                            ch.chapterNumber
                          }.${
                            ch.scenes.length + 1
                          } ฉากใหม่`,
                          isCurrent: false,
                        },
                      ],
                    }
                  : ch
              )
            );
          }}
          onAddChapter={() => {
            const newCh = {
              id: `ch-new-${Date.now()}`,
              chapterNumber:
                chapters.length + 1,
              title: "ตอนใหม่",
              isExpanded: false,
              scenes: [],
            };

            setChapters((prev) => [
              ...prev,
              newCh,
            ]);
          }}
        />

        {/* Editor */}
        <main className="se-editor">
          <div className="se-section">
            <div className="se-section__heading">
              เนื้อหาฉาก
            </div>

            <div className="se-field">
              <label
                className="se-label"
                htmlFor="scene-title"
              >
                ชื่อฉาก
              </label>

              <input
                id="scene-title"
                className="se-input se-input--title"
                value={sceneTitle}
                onChange={(e) => {
                  setSceneTitle(
                    e.target.value
                  );

                  triggerAutoSave();
                }}
                placeholder="ชื่อฉาก..."
              />
            </div>

            <div className="se-field">
              <label className="se-label">
                เนื้อเรื่อง
              </label>

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
              <div className="se-section__heading">
                ตัวเลือกท้ายตอน
              </div>

              <button
                className="se-btn se-btn--add-choice"
                onClick={addChoice}
              >
                เพิ่มตัวเลือก
              </button>
            </div>

            <div className="se-choices-list">
              {choices.map((choice, i) => (
                <ChoiceCard
                  key={choice.id}
                  choice={choice}
                  index={i}
                  allTargetOptions={
                    mockSceneTargetOptions
                  }
                  onUpdate={updateChoice}
                  onDelete={deleteChoice}
                />
              ))}

              {choices.length === 0 && (
                <div className="se-choices-empty">
                  <p>
                    ยังไม่มีตัวเลือก
                  </p>
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