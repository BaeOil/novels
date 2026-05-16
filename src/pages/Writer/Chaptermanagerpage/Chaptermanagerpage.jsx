// src/pages/Writer/ChapterManager/ChapterManagerPage.jsx
//
// ══════════════════════════════════════════════════════════
//  หน้าจัดการตอน (Chapter Manager)
//  แสดง: novel header + รายการตอนทั้งหมด + scenes ในแต่ละตอน
//        + choices ของแต่ละ scene
//
//  TODO:
//   GET  /api/v1/novels/:id/chapters
//   POST /api/v1/chapters
//   PUT  /api/v1/chapters/:id
//   DELETE /api/v1/chapters/:id
//   POST /api/v1/scenes
//   POST /api/v1/choices
// ══════════════════════════════════════════════════════════

import React, { useState } from "react";
import "./ChapterManagerPage.css";
import { mockNovelHeader, mockChapters, mockSceneTargetOptions } from "../../../data/mockChapterData";

// ════════════════════════════════════════════════════════
//  Sub: Novel header banner
// ════════════════════════════════════════════════════════
const NovelBanner = ({ novel, onEdit }) => (
  <div className="cm-banner">
    <div className="cm-banner__left">
      <div className="cm-banner__cover" style={{ background: novel.coverBg }}>
        <span>{novel.coverEmoji}</span>
      </div>
      <div className="cm-banner__info">
        <div className="cm-banner__created">วันที่สร้าง {novel.createdAt}</div>
        <h2 className="cm-banner__title">{novel.title}</h2>
        <p className="cm-banner__synopsis">{novel.synopsis}</p>
        <div className="cm-banner__stats">
          <span>{novel.chapterCount} ตอน</span>
          <span className="cm-banner__dot">·</span>
          <span>{novel.sceneCount} ฉาก</span>
          <span className="cm-banner__dot">·</span>
          <span>{novel.endingCount} ตอนจบ</span>
        </div>
      </div>
    </div>
    <div className="cm-banner__right">
      <span className="cm-banner__status">● ฉบับร่าง</span>
      <button className="cm-btn cm-btn--outline cm-btn--sm" onClick={onEdit}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 10.5L4.5 8l6-6 1.5 1.5-6 6-2.5 2.5H2v-2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
        </svg>
        แก้ไข
      </button>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════
//  Sub: Choice row inside a scene
// ════════════════════════════════════════════════════════
const ChoiceRow = ({ choice, sceneOptions, onUpdate, onDelete }) => {
  const [text, setText]           = useState(choice.text);
  const [targetType, setTargetType] = useState(choice.targetType);
  const [targetLabel, setTargetLabel] = useState(choice.targetLabel);
  const [subScene, setSubScene]   = useState(choice.targetSubScene || "");
  const [isOpen, setIsOpen]       = useState(false);

  // flatten scenes for dropdown
  const allScenes = sceneOptions.flatMap((ch) =>
    ch.scenes.map((s) => ({
      value: `${ch.chapterId}__${s.id}`,
      label: s.label,
      chapterLabel: ch.chapterTitle,
    }))
  );

  return (
    <div className="cm-choice">
      {/* Header row */}
      <div className="cm-choice__header">
        <div className="cm-choice__num">{choice.orderIndex}.{choice.orderIndex}</div>
        <div className="cm-choice__text-wrap">
          <span className="cm-choice__title">{text || "(ยังไม่ได้ตั้งชื่อ)"}</span>
        </div>
        <div className="cm-choice__target-badge">
          − {targetLabel}
        </div>
        <button
          className="cm-choice__toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "ย่อ" : "ขยาย"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="cm-choice__del" onClick={() => onDelete(choice.id)} aria-label="ลบตัวเลือก">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div className="cm-choice__body">
          <div className="cm-choice__row">
            {/* ข้อความตัวเลือก */}
            <div className="cm-choice__field">
              <label className="cm-choice__label">ข้อความตัวเลือก</label>
              <input
                className="cm-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ข้อความที่ผู้อ่านเห็น..."
              />
            </div>

            {/* ไปตอนใด */}
            <div className="cm-choice__field">
              <label className="cm-choice__label">ไปตอนใด</label>
              <div className="cm-choice__radio-group">
                <label className="cm-radio">
                  <input
                    type="radio"
                    name={`target-type-${choice.id}`}
                    value="same"
                    checked={targetType === "same"}
                    onChange={() => setTargetType("same")}
                  />
                  <span className="cm-radio__dot" />
                  ไปฉากในตอนเดียวกัน
                </label>
                <label className="cm-radio">
                  <input
                    type="radio"
                    name={`target-type-${choice.id}`}
                    value="other"
                    checked={targetType === "other"}
                    onChange={() => setTargetType("other")}
                  />
                  <span className="cm-radio__dot" />
                  ไปฉากในตอนอื่น
                </label>
              </div>

              {/* ฉาก dropdown */}
              <select
                className="cm-select"
                value={subScene}
                onChange={(e) => setSubScene(e.target.value)}
              >
                <option value="">เลือกฉากปลายทาง...</option>
                {allScenes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.chapterLabel} › {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Sub: Scene card inside a chapter
// ════════════════════════════════════════════════════════
const SceneCard = ({ scene, chapterNumber, onWrite, onAddChoice }) => {
  const [choices, setChoices] = useState(scene.choices || []);

  const handleDeleteChoice = (choiceId) => {
    setChoices((prev) => prev.filter((c) => c.id !== choiceId));
  };

  const handleAddChoice = () => {
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

  return (
    <div className="cm-scene">
      {/* Scene header */}
      <div className="cm-scene__header">
        <div className="cm-scene__num">{String(chapterNumber).padStart(2, "0")}</div>
        <div className="cm-scene__info">
          <div className="cm-scene__title-row">
            <h4 className="cm-scene__title">{scene.title}</h4>
            {scene.hasChoices && (
              <span className="cm-scene__status">● ฉบับร่าง</span>
            )}
          </div>
          <p className="cm-scene__excerpt">{scene.excerpt}</p>
          <div className="cm-scene__meta">
            <span className="cm-scene__tag cm-scene__tag--scene">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M3 4h6M3 6h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {scene.choiceCount} ฉาก
            </span>
            {scene.hasChoices && (
              <span className="cm-scene__tag cm-scene__tag--choice">
                {choices.length} ทางเลือก
              </span>
            )}
            <span className="cm-scene__updated">อัปเดตล่าสุด 15 เม.ย. 2569</span>
          </div>
        </div>
        <div className="cm-scene__actions">
          <button className="cm-btn cm-btn--ghost cm-btn--sm" onClick={onWrite}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 10.5L4.5 8l6-6 1.5 1.5-6 6-2.5 2.5H2v-2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
            </svg>
            แก้ไขเนื้อหา
          </button>
          <button className="cm-btn cm-btn--ghost cm-btn--sm cm-btn--danger">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V2.5h4V4M6 6.5v4M8 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            ลบฉาก
          </button>
        </div>
      </div>

      {/* Choices section */}
      <div className="cm-scene__choices">
        <div className="cm-scene__choices-header">
          <div className="cm-scene__choices-title">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h5" stroke="var(--pink-500)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            รายการฉากทั้งหมด
          </div>
        </div>

        {/* Warning: no choices */}
        {scene.hasNoChoiceWarning && choices.length === 0 && (
          <div className="cm-scene__warn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 12H1L7 1z" stroke="#F59E0B" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
              <path d="M7 5v3M7 9.5v.5" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            ไม่มีตัวเลือกเชื่อมมายัง
          </div>
        )}

        {/* Choice list */}
        {choices.map((choice) => (
          <ChoiceRow
            key={choice.id}
            choice={choice}
            sceneOptions={mockSceneTargetOptions}
            onUpdate={() => {}}
            onDelete={handleDeleteChoice}
          />
        ))}

        {/* Add choice btn */}
        <button className="cm-btn cm-btn--add-choice" onClick={handleAddChoice}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          เพิ่มตัวเลือก
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Sub: Chapter panel
// ════════════════════════════════════════════════════════
const ChapterPanel = ({ chapter, onWrite, onAddScene }) => {
  const [scenes, setScenes] = useState(chapter.scenes || []);

  const handleAddScene = () => {
    const newScene = {
      id: `scene-new-${Date.now()}`,
      sceneNumber: String(scenes.length + 1),
      title: `ฉากที่ ${scenes.length + 1}`,
      excerpt: "",
      choiceCount: 0,
      hasChoices: false,
      status: "draft",
      choices: [],
    };
    setScenes((prev) => [...prev, newScene]);
  };

  return (
    <div className="cm-chapter">
      {/* Scene cards */}
      {scenes.map((scene) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          chapterNumber={chapter.chapterNumber}
          onWrite={() => onWrite(chapter.id, scene.id)}
        />
      ))}

      {/* Add scene */}
      <button className="cm-btn cm-btn--add-scene" onClick={handleAddScene}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        เพิ่มฉากใหม่
      </button>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Main: ChapterManagerPage
// ════════════════════════════════════════════════════════
const ChapterManagerPage = ({ novelId, onNavigate }) => {
  const novel    = mockNovelHeader;
  const [chapters, setChapters] = useState(mockChapters);
  const [activeChapterId, setActiveChapterId] = useState(chapters[0]?.id || null);

  const handleAddChapter = () => {
    const newCh = {
      id: `ch-new-${Date.now()}`,
      chapterNumber: chapters.length + 1,
      title: `ตอนที่ ${chapters.length + 1}`,
      isStartChapter: false,
      sceneCount: 0,
      choiceCount: 0,
      status: "draft",
      updatedAt: "วันนี้",
      scenes: [],
    };
    setChapters((prev) => [...prev, newCh]);
    setActiveChapterId(newCh.id);
  };

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  return (
    <div className="cm-layout">

      {/* ════ Center: main content ════ */}
      <div className="cm-main">

        {/* Page top bar */}
        <div className="cm-topbar">
          <div>
            <h1 className="cm-topbar__title">จัดการตอน</h1>
            <p className="cm-topbar__sub">จัดการรายการตอนและรายละเอียดฉากของคุณ</p>
          </div>
          <button
            className="cm-btn cm-btn--outline cm-btn--tree"
            onClick={() => onNavigate("story-tree")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="3" cy="8" r="2" fill="currentColor" opacity=".7"/>
              <circle cx="13" cy="3" r="2" fill="currentColor" opacity=".7"/>
              <circle cx="13" cy="13" r="2" fill="currentColor" opacity=".7"/>
              <path d="M5 7.3L11 4M5 8.7L11 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            ดูโครงสร้าง (Story Tree)
          </button>
        </div>

        {/* Novel banner */}
        <NovelBanner
          novel={novel}
          onEdit={() => onNavigate("create-novel")}
        />

        {/* Active chapter content */}
        {activeChapter && (
          <ChapterPanel
            chapter={activeChapter}
            onWrite={(chId, scId) =>
              onNavigate("write", { chapterId: chId, sceneId: scId })
            }
          />
        )}
      </div>

      {/* ════ Right sidebar: chapter list ════ */}
      <aside className="cm-sidebar">
        <div className="cm-sidebar__header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h8M2 12h5" stroke="var(--pink-500)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          รายการตอนทั้งหมด
        </div>

        {/* Add chapter */}
        <button className="cm-sidebar__add" onClick={handleAddChapter}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
          สร้างตอนใหม่
        </button>

        {/* Chapter list */}
        <div className="cm-sidebar__list">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              className={`cm-sidebar__item ${activeChapterId === ch.id ? "cm-sidebar__item--active" : ""}`}
              onClick={() => setActiveChapterId(ch.id)}
            >
              <div className="cm-sidebar__item-top">
                <span className="cm-sidebar__item-icon">
                  {ch.isEndingChapter ? "🏁" : "⭐"}
                </span>
                <div className="cm-sidebar__item-body">
                  <div className="cm-sidebar__item-name-row">
                    <span className="cm-sidebar__item-num">ตอนที่ {ch.chapterNumber}</span>
                    {ch.isStartChapter && (
                      <span className="cm-sidebar__item-badge cm-sidebar__item-badge--start">start</span>
                    )}
                  </div>
                  <div className="cm-sidebar__item-title">{ch.title}</div>
                </div>
              </div>
              <div className="cm-sidebar__item-meta">
                <span>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  {ch.sceneCount} ฉาก
                </span>
                <span>{ch.choiceCount} ตัวเลือก</span>
              </div>
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="cm-sidebar__summary">
          <div className="cm-sidebar__summary-text">
            ทั้งหมด {chapters.length} ตอน
          </div>
          <div className="cm-sidebar__progress">
            <div
              className="cm-sidebar__progress-fill"
              style={{ width: `${(chapters.filter((c) => c.status === "published").length / chapters.length) * 100}%` }}
            />
          </div>
        </div>
      </aside>

    </div>
  );
};

export default ChapterManagerPage;