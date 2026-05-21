// src/pages/Writer/SceneEditor/SceneEditorPage.jsx
//
// ══════════════════════════════════════════════════════════
//  หน้าเขียนเนื้อหา (Scene Editor)
//  Layout: Left sidebar (chapter/scene tree) │ Center (editor) │ none
//
//  Structure ตาม PROJECT CONTEXT:
//    Novel → Chapter → Scene → Choice (→ next Scene)
//
//  TODO: GET  /api/v1/scenes/:id
//        PUT  /api/v1/scenes/:id
//        POST /api/v1/choices
//        PUT  /api/v1/choices/:id
//        DELETE /api/v1/choices/:id
// ══════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from "react";
import "./SceneEditorPage.css";
import Toggle from "../../../components/Toggle/Toggle";
import { mockSceneDetail, mockSceneTargetOptions } from "../../../data/mockChapterData";

// ─────────────────────────────────────────────
//  Rich Text Toolbar config
// ─────────────────────────────────────────────
const TOOLBAR_GROUPS = [
  [
    { id: "bold",   label: "B",   title: "ตัวหนา (Ctrl+B)",   cmd: "bold" },
    { id: "italic", label: "i",   title: "ตัวเอียง (Ctrl+I)",  cmd: "italic" },
    { id: "under",  label: "U",   title: "ขีดเส้นใต้",         cmd: "underline" },
    { id: "size",   label: "A↕",  title: "ขนาดตัวอักษร",       cmd: null },
  ],
  [
    { id: "left",   label: "≡←", title: "ชิดซ้าย",   cmd: "justifyLeft" },
    { id: "center", label: "≡",  title: "กึ่งกลาง",  cmd: "justifyCenter" },
    { id: "ul",     label: "≔",  title: "รายการ",     cmd: "insertUnorderedList" },
    { id: "para",   label: "¶",  title: "ย่อหน้า",   cmd: null },
  ],
  [
    { id: "link",   label: "🔗", title: "ใส่ลิงก์",   cmd: "createLink" },
    { id: "image",  label: "🖼", title: "ใส่รูปภาพ",  cmd: null },
    { id: "emoji",  label: "😊", title: "Emoji",       cmd: null },
    { id: "more",   label: "+",  title: "เพิ่มเติม",  cmd: null },
  ],
  [
    { id: "undo",   label: "↩",  title: "ย้อนกลับ (Ctrl+Z)",  cmd: "undo" },
    { id: "redo",   label: "↪",  title: "ทำซ้ำ (Ctrl+Y)",     cmd: "redo" },
    { id: "more2",  label: "⋯",  title: "ตัวเลือกเพิ่มเติม",  cmd: null },
  ],
];

// ─────────────────────────────────────────────
//  Sub: Toolbar button
// ─────────────────────────────────────────────
const ToolbarBtn = ({ item, onCmd }) => (
  <button
    type="button"
    className="se-toolbar__btn"
    title={item.title}
    onMouseDown={(e) => {
      e.preventDefault(); // ป้องกัน focus ออกจาก editor
      if (item.cmd) onCmd(item.cmd);
    }}
    aria-label={item.title}
  >
    {item.label}
  </button>
);

// ─────────────────────────────────────────────
//  Sub: Choice card (ตัวเลือกท้ายฉาก)
// ─────────────────────────────────────────────
const ChoiceCard = ({ choice, index, allTargetOptions, onUpdate, onDelete }) => {
  const [text, setText]             = useState(choice.text);
  const [targetType, setTargetType] = useState(choice.targetType || "same");
  const [targetLabel, setTargetLabel] = useState(choice.targetLabel || "");
  const [subScene, setSubScene]     = useState(choice.targetSubScene || "");

  // flatten options
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
    onUpdate?.({ ...choice, text, targetType, targetSubScene: val });
  };

  const COLORS = ["var(--pink-500)", "#F59E0B", "#6366F1"];

  return (
    <div className="se-choice">
      {/* Number badge */}
      <div
        className="se-choice__num"
        style={{ background: COLORS[(index) % COLORS.length] + "18",
                 color: COLORS[(index) % COLORS.length],
                 border: `1.5px solid ${COLORS[(index) % COLORS.length]}30` }}
      >
        {index + 1}
      </div>

      <div className="se-choice__body">
        {/* Title row */}
        <div className="se-choice__titlerow">
          <input
            className="se-choice__text-input"
            value={text}
            onChange={(e) => { setText(e.target.value); onUpdate?.({ ...choice, text: e.target.value }); }}
            placeholder="ข้อความตัวเลือก..."
          />
          <div className="se-choice__target-badge">
            − {targetLabel || "เลือกตอน..."}
          </div>
          <button className="se-choice__del" onClick={() => onDelete(choice.id)} aria-label="ลบ">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Config row */}
        <div className="se-choice__config">
          {/* ข้อความตัวเลือก */}
          <div className="se-choice__config-col">
            <div className="se-choice__config-label">ข้อความตัวเลือก</div>
            <input
              className="se-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="สำรวจแบบไม่ย่อท้อ..."
            />
          </div>

          {/* ไปตอนใด */}
          <div className="se-choice__config-col">
            <div className="se-choice__config-label">ไปตอนใด</div>
            <div className="se-choice__radios">
              <label className="se-radio">
                <input type="radio" name={`tt-${choice.id}`} value="same"
                  checked={targetType === "same"}
                  onChange={() => setTargetType("same")} />
                <span className="se-radio__dot" />
                ไปฉากในตอนเดียวกัน
              </label>
              <label className="se-radio">
                <input type="radio" name={`tt-${choice.id}`} value="other"
                  checked={targetType === "other"}
                  onChange={() => setTargetType("other")} />
                <span className="se-radio__dot" />
                ไปฉากในตอนอื่น
              </label>
            </div>
            {/* Sub-scene dropdown */}
            <select
              className="se-select"
              value={subScene}
              onChange={(e) => handleSubSceneChange(e.target.value)}
            >
              <option value="">เลือกฉากปลายทาง...</option>
              {flatOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Sub: Left sidebar — chapter/scene tree
// ─────────────────────────────────────────────
const SceneTreeSidebar = ({ chapters, currentSceneId, onSelectScene, onAddScene, onAddChapter }) => {
  const [expandedChapters, setExpandedChapters] = useState(
    chapters.filter((c) => c.isExpanded).map((c) => c.id)
  );

  const toggleChapter = (chId) => {
    setExpandedChapters((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  return (
    <div className="se-tree">
      <div className="se-tree__header">เส้นทางของตอนนี้</div>

      {/* Chapter list */}
      <div className="se-tree__list">
        {chapters.map((ch) => {
          const isExpanded = expandedChapters.includes(ch.id);
          return (
            <div key={ch.id} className="se-tree__chapter">
              {/* Chapter row */}
              <button
                className="se-tree__ch-row"
                onClick={() => toggleChapter(ch.id)}
              >
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .18s", flexShrink: 0 }}
                >
                  <path d="M4 3l4 3-4 3V3z" fill="currentColor"/>
                </svg>
                <span className="se-tree__ch-label">
                  ตอน {ch.chapterNumber} — {ch.title}
                </span>
                {/* status dot */}
                <span
                  className="se-tree__ch-dot"
                  style={{ background: ch.scenes.some((s) => s.isCurrent) ? "var(--pink-500)" : "#4CAF82" }}
                />
              </button>

              {/* Scene list */}
              {isExpanded && (
                <div className="se-tree__scenes">
                  {ch.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      className={`se-tree__scene-row ${scene.isCurrent ? "se-tree__scene-row--active" : ""}`}
                      onClick={() => onSelectScene(ch.id, scene.id)}
                    >
                      {scene.label}
                    </button>
                  ))}

                  {/* Add scene btn */}
                  <button
                    className="se-tree__add-scene"
                    onClick={() => onAddScene(ch.id)}
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    เพิ่มฉาก
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="se-tree__divider" />

      {/* Status settings */}
      <div className="se-tree__settings">
        <div className="se-tree__settings-label">ตั้งค่าสถานะ</div>
        <div className="se-tree__settings-row">
          <span>เผยแพร่</span>
          <div className="se-tree__toggle-wrap">
            <Toggle
              id="tree-pub"
              checked={true}
              onChange={() => {}}
            />
          </div>
        </div>
        <div className="se-tree__settings-row se-tree__settings-row--ending">
          <span>ตอนนี้เป็นจุดจบของเรื่อง<br/><small>(Ending)</small></span>
          <div className="se-tree__toggle-wrap">
            <Toggle
              id="tree-end"
              checked={false}
              onChange={() => {}}
            />
          </div>
        </div>
      </div>

      {/* ตอนทั้งหมด panel */}
      <div className="se-tree__divider" />
      <div className="se-tree__all-label">ตอนทั้งหมด</div>
      <div className="se-tree__all-list">
        {chapters.map((ch) => (
          <div key={ch.id} className="se-tree__all-ch">
            <button className="se-tree__all-ch-btn">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2l3.5 3L9 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              ตอนที่ {ch.chapterNumber} : {ch.title}
            </button>
            {ch.scenes.map((s) => (
              <button
                key={s.id}
                className={`se-tree__all-scene ${s.isCurrent ? "se-tree__all-scene--active" : ""}`}
                onClick={() => onSelectScene(ch.id, s.id)}
              >
                {s.label}
              </button>
            ))}
            <button className="se-tree__add-scene" onClick={() => onAddScene(ch.id)}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              เพิ่มฉาก
            </button>
          </div>
        ))}
      </div>

      {/* Add chapter */}
      <button className="se-tree__add-ch" onClick={onAddChapter}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        เพิ่มตอนใหม่
      </button>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Main Component
// ════════════════════════════════════════════════════════
const SceneEditorPage = ({ novelId, chapterId, sceneId, onNavigate }) => {
  // ── Load scene data ──────────────────────────────────
  // TODO: fetch(`/api/v1/scenes/${sceneId}`) เมื่อ API พร้อม
  const scene = mockSceneDetail;

  // ── State ─────────────────────────────────────────────
  const [sceneTitle, setSceneTitle]     = useState(scene.sceneTitle);
  const [isPublished, setIsPublished]   = useState(scene.isPublished);
  const [isEnding, setIsEnding]         = useState(scene.isEnding);
  const [choices, setChoices]           = useState(scene.choices);
  const [isSaving, setIsSaving]         = useState(false);
  const [lastSaved, setLastSaved]       = useState(null);
  const [chapters, setChapters]         = useState(scene.allChapters);
  const editorRef = useRef(null);

  // ── Auto-save ─────────────────────────────────────────
  const autoSaveTimer = useRef(null);
  const triggerAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setIsSaving(true);
      // TODO: PUT /api/v1/scenes/:id
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date());
      }, 600);
    }, 1500);
  }, []);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  // ── Toolbar exec command ─────────────────────────────
  const execCmd = (cmd) => {
    if (!cmd) return;
    document.execCommand(cmd, false, null);
    editorRef.current?.focus();
  };

  // ── Keyboard shortcut ─────────────────────────────────
  const handleEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  // ── Save ──────────────────────────────────────────────
  const handleSave = () => {
    setIsSaving(true);
    // TODO: API call
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 600);
  };

  // ── Publish ───────────────────────────────────────────
  const handlePublish = () => {
    setIsPublished(true);
    handleSave();
  };

  // ── Choices ───────────────────────────────────────────
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
    setChoices((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    triggerAutoSave();
  };

  const deleteChoice = (choiceId) => {
    setChoices((prev) => prev.filter((c) => c.id !== choiceId));
    triggerAutoSave();
  };

  // ── Format lastSaved time ─────────────────────────────
  const savedText = lastSaved
    ? `บันทึกแล้ว ${lastSaved.getHours().toString().padStart(2,"0")}:${lastSaved.getMinutes().toString().padStart(2,"0")} น.`
    : null;

  // ════════════════════════════════════════════════════
  return (
    <div className="se-page">

      {/* ══ Top header bar ══════════════════════════════ */}
      <header className="se-header">
        <div className="se-header__left">
          <button
            className="se-header__back"
            onClick={() => onNavigate("chapters")}
            aria-label="กลับ"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            กลับ
          </button>

          {/* Breadcrumb */}
          <nav className="se-header__breadcrumb" aria-label="breadcrumb">
            <span className="se-header__bc-novel">{scene.novelTitle}</span>
            <span className="se-header__bc-sep">›</span>
            <span className="se-header__bc-chapter">{scene.chapterTitle}</span>
            <span className="se-header__bc-sep">›</span>
            <span className="se-header__bc-scene">{scene.sceneLabel}</span>
          </nav>
        </div>

        <div className="se-header__right">
          {/* Auto-save status */}
          {isSaving && (
            <span className="se-header__saving">
              <span className="se-header__saving-dot" />
              กำลังบันทึก...
            </span>
          )}
          {!isSaving && savedText && (
            <span className="se-header__saved">✓ {savedText}</span>
          )}

          <button className="se-header__btn se-header__btn--preview"
            onClick={() => alert("ดูตัวอย่าง")}>
            ดูตัวอย่าง
          </button>

          <button
            className="se-header__btn se-header__btn--save"
            onClick={handleSave}
            aria-label="บันทึก"
            title="บันทึก (Ctrl+S)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 12V4.5L4.5 2H12v10H2z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
              <path d="M4 2v3h6V2M4.5 8.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
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

        {/* ══ Left: chapter/scene tree ══════════════════ */}
        <SceneTreeSidebar
          chapters={chapters}
          currentSceneId={sceneId}
          onSelectScene={(chId, sId) => {
            // TODO: navigate to scene
          }}
          onAddScene={(chId) => {
            setChapters((prev) =>
              prev.map((ch) =>
                ch.id === chId
                  ? { ...ch, scenes: [...ch.scenes, { id: `new-${Date.now()}`, label: `${ch.chapterNumber}.${ch.scenes.length + 1} ฉากใหม่`, isCurrent: false }] }
                  : ch
              )
            );
          }}
          onAddChapter={() => {
            const newCh = { id: `ch-new-${Date.now()}`, chapterNumber: chapters.length + 1, title: "ตอนใหม่", isExpanded: false, scenes: [] };
            setChapters((prev) => [...prev, newCh]);
          }}
        />

        {/* ══ Center: editor ════════════════════════════ */}
        <main className="se-editor">

          {/* ── เนื้อหาฉาก section ── */}
          <div className="se-section">
            <div className="se-section__heading">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 3h12v1.5H2zM2 6.5h8v1.5H2zM2 10h12v1.5H2zM2 13.5h6v1.5H2z" fill="var(--pink-500)"/>
              </svg>
              เนื้อหาฉาก
            </div>

            {/* Scene title */}
            <div className="se-field">
              <label className="se-label" htmlFor="scene-title">ชื่อฉาก</label>
              <input
                id="scene-title"
                className="se-input se-input--title"
                value={sceneTitle}
                onChange={(e) => { setSceneTitle(e.target.value); triggerAutoSave(); }}
                placeholder="ชื่อฉาก..."
              />
            </div>

            {/* เนื้อเรื่อง label */}
            <div className="se-field">
              <label className="se-label">เนื้อเรื่อง</label>

              {/* Toolbar */}
              <div className="se-toolbar">
                {TOOLBAR_GROUPS.map((group, gi) => (
                  <React.Fragment key={gi}>
                    {gi > 0 && <div className="se-toolbar__sep" />}
                    {group.map((item) => (
                      <ToolbarBtn key={item.id} item={item} onCmd={execCmd} />
                    ))}
                  </React.Fragment>
                ))}
              </div>

              {/* Editable content area */}
              <div
                ref={editorRef}
                className="se-editor-area"
                contentEditable
                suppressContentEditableWarning
                onInput={triggerAutoSave}
                onKeyDown={handleEditorKeyDown}
                data-placeholder="เริ่มเขียนเนื้อหาฉากของคุณ..."
                aria-label="เนื้อหาฉาก"
                dangerouslySetInnerHTML={{ __html: scene.content.split("\n\n").map((p) => `<p>${p}</p>`).join("") }}
              />
            </div>
          </div>

          {/* ── ตัวเลือกท้ายตอน section ── */}
          <div className="se-section se-section--choices">
            <div className="se-section__heading-row">
              <div className="se-section__heading">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v6M8 8l-4 4M8 8l4 4" stroke="var(--pink-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ตัวเลือกท้ายตอน
              </div>
              <p className="se-section__desc">
                ผู้อ่านจะเลือกเส้นทางจากตัวเลือกด้านล่าง — แต่ละตัวเลือกพาไปตอนต่างกัน
              </p>
              <button className="se-btn se-btn--add-choice" onClick={addChoice}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                เพิ่มตัวเลือก
              </button>
            </div>

            {/* Choice cards */}
            <div className="se-choices-list">
              {choices.map((choice, i) => (
                <ChoiceCard
                  key={choice.id}
                  choice={choice}
                  index={i}
                  allTargetOptions={mockSceneTargetOptions}
                  onUpdate={updateChoice}
                  onDelete={deleteChoice}
                />
              ))}

              {choices.length === 0 && (
                <div className="se-choices-empty">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--gray-300)" strokeWidth="1.5"/>
                    <path d="M12 8v4M12 16h.01" stroke="var(--gray-300)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p>ยังไม่มีตัวเลือก — กด <strong>เพิ่มตัวเลือก</strong> เพื่อเริ่มสร้างเส้นทาง</p>
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