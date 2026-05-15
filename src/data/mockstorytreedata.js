// src/data/mockStoryTreeData.js
//
// ══════════════════════════════════════════════════════════════
//  Story Tree Data — ถูกต้องตาม PROJECT CONTEXT
//
//  Scene  = Node  (ไม่ใช่ Chapter)
//  Choice = Edge  (เส้นเชื่อมระหว่าง Scene)
//
//  ผู้อ่านสามารถดู:
//    - scene ที่เคยอ่าน (visited)
//    - scene ที่กำลังอ่านอยู่ (current)
//    - scene ที่ยังไม่ถึง (locked)
//    - ตอนจบที่ปลดล็อก (ending unlocked)
//    - ตอนจบที่ยังไม่ได้ (ending locked)
// ══════════════════════════════════════════════════════════════
//
// TODO: GET /api/v1/novels/:id/story-tree
//       Response ควรมี nodes[] และ edges[]
//       พร้อม status ของแต่ละ scene สำหรับ user คนนี้
// ══════════════════════════════════════════════════════════════

import { SCENE_TYPES, ENDING_TYPES } from "./mockSceneData";

// ─────────────────────────────────────────────
// Node Status (สำหรับ reader view)
// ─────────────────────────────────────────────
export const NODE_STATUS = {
  CURRENT:          "current",           // scene ที่กำลังอ่านอยู่
  VISITED:          "visited",           // scene ที่เคยอ่านแล้ว
  LOCKED:           "locked",            // scene ที่ยังไม่ถึง
  ENDING_UNLOCKED:  "ending_unlocked",   // ตอนจบที่ปลดล็อกแล้ว
  ENDING_LOCKED:    "ending_locked",     // ตอนจบที่ยังไม่ได้รับ
};

// ─────────────────────────────────────────────
// Layout config — ตำแหน่ง node ใน grid
// col = คอลัมน์ (แนวนอน)
// row = แถว (แนวตั้ง — บนสุด = 0)
// ─────────────────────────────────────────────
export const mockStoryTreeData = {
  novelId: "novel-001",
  novelTitle: "ผจญภัยกับสามหมี",
  currentSceneId: "scene-002", // scene ที่ผู้อ่านอยู่ตอนนี้

  // สถิติสำหรับ sidebar
  stats: {
    totalScenes:        10,
    visitedScenes:       3,
    totalChoicePoints:   6,  // จำนวน scene ที่มี choices
    discoveredChoices:   2,  // จำนวน choices ที่เคยเลือก
    totalEndings:        4,
    unlockedEndings:     0,
  },

  // ── Nodes (Scene = Node) ──────────────────
  // แต่ละ node คือ 1 scene
  nodes: [
    // Chapter 1 ─────────────────────────────
    {
      id: "scene-001",
      label: "ตื่นนอนในเช้าวันใหม่",
      sceneType: SCENE_TYPES.START,
      endingType: null,
      chapterNumber: 1,
      status: NODE_STATUS.VISITED,
      col: 3, row: 0,
    },
    {
      id: "scene-002",
      label: "เตรียมตัวออกเดินทาง",
      sceneType: SCENE_TYPES.NORMAL,
      endingType: null,
      chapterNumber: 1,
      status: NODE_STATUS.CURRENT,  // กำลังอ่านอยู่
      col: 1, row: 1,
    },
    {
      id: "scene-003",
      label: "วันชิลล์ที่บ้าน",
      sceneType: SCENE_TYPES.NORMAL,
      endingType: null,
      chapterNumber: 1,
      status: NODE_STATUS.LOCKED,
      col: 3, row: 1,
    },
    {
      id: "scene-004",
      label: "นอนดูซีรีส์",
      sceneType: SCENE_TYPES.NORMAL,
      endingType: null,
      chapterNumber: 1,
      status: NODE_STATUS.LOCKED,
      col: 5, row: 1,
    },

    // Chapter 2 ─────────────────────────────
    {
      id: "scene-005",
      label: "พบกับหมีป่า",
      sceneType: SCENE_TYPES.NORMAL,
      endingType: null,
      chapterNumber: 2,
      status: NODE_STATUS.LOCKED,
      col: 0, row: 2,
    },
    {
      id: "scene-006",
      label: "เตรียมตัวละเอียด",
      sceneType: SCENE_TYPES.NORMAL,
      endingType: null,
      chapterNumber: 2,
      status: NODE_STATUS.LOCKED,
      col: 2, row: 2,
    },
    {
      id: "scene-007",
      label: "วันเล่นเกม",
      sceneType: SCENE_TYPES.NORMAL,
      endingType: null,
      chapterNumber: 2,
      status: NODE_STATUS.LOCKED,
      col: 3, row: 2,
    },
    {
      id: "scene-008",
      label: "ซีรีส์กับพี่ๆ",
      sceneType: SCENE_TYPES.NORMAL,
      endingType: null,
      chapterNumber: 2,
      status: NODE_STATUS.LOCKED,
      col: 5, row: 2,
    },

    // Endings ───────────────────────────────
    {
      id: "scene-end-001",
      label: "มิตรภาพแห่งป่า",
      sceneType: SCENE_TYPES.ENDING,
      endingType: ENDING_TYPES.GOOD,
      chapterNumber: 2,
      status: NODE_STATUS.ENDING_LOCKED,
      col: 0, row: 3,
    },
    {
      id: "scene-end-002",
      label: "วันที่ไม่ดั่งใจ",
      sceneType: SCENE_TYPES.ENDING,
      endingType: ENDING_TYPES.BAD,
      chapterNumber: 2,
      status: NODE_STATUS.ENDING_LOCKED,
      col: 1, row: 3,
    },
    {
      id: "scene-end-003",
      label: "???",   // hidden route — ไม่แสดงชื่อจริง
      sceneType: SCENE_TYPES.ENDING,
      endingType: ENDING_TYPES.SECRET,
      chapterNumber: 2,
      status: NODE_STATUS.ENDING_LOCKED,
      isHidden: true,
      col: 3, row: 3,
    },
    {
      id: "scene-end-004",
      label: "???",
      sceneType: SCENE_TYPES.ENDING,
      endingType: ENDING_TYPES.TRUE,
      chapterNumber: 2,
      status: NODE_STATUS.ENDING_LOCKED,
      isHidden: true,
      col: 5, row: 3,
    },
  ],

  // ── Edges (Choice = Edge) ─────────────────
  // แต่ละ edge คือ 1 choice ที่เชื่อม scene → scene
  edges: [
    // scene-001 → 3 choices
    { id: "choice-001", from: "scene-001", to: "scene-002", label: "เตรียมตัวทัศนศึกษากัน" },
    { id: "choice-002", from: "scene-001", to: "scene-003", label: "ไม่ต้องเตรียมอะไร สบายๆ" },
    { id: "choice-003", from: "scene-001", to: "scene-004", label: "เปลี่ยนใจนอนอยู่บ้าน" },

    // scene-002 → 2 choices
    { id: "choice-004", from: "scene-002", to: "scene-005", label: "ออกเดินทางทันที!" },
    { id: "choice-005", from: "scene-002", to: "scene-006", label: "รอเตรียมให้พร้อมกว่านี้" },

    // scene-003 → 1 choice
    { id: "choice-006", from: "scene-003", to: "scene-007", label: "เล่นเกมต่อ" },

    // scene-004 → 1 choice
    { id: "choice-007", from: "scene-004", to: "scene-008", label: "ให้พี่ๆ ดูด้วย" },

    // scene-005 → endings
    { id: "choice-008", from: "scene-005", to: "scene-end-001", label: "เป็นมิตรกับหมีป่า" },
    { id: "choice-009", from: "scene-005", to: "scene-end-002", label: "วิ่งหนี!" },

    // scene-006 → secret
    { id: "choice-010", from: "scene-006", to: "scene-end-003", label: "???" },

    // scene-007 & 008 → true ending
    { id: "choice-011", from: "scene-007", to: "scene-end-004", label: "???" },
    { id: "choice-012", from: "scene-008", to: "scene-end-004", label: "???" },
  ],
};

// ─────────────────────────────────────────────
// Ending Type metadata (label + color)
// ─────────────────────────────────────────────
export const ENDING_META = {
  [ENDING_TYPES.GOOD]:   { label: "Good Ending",   color: "#4CAF82", icon: "⭐" },
  [ENDING_TYPES.BAD]:    { label: "Bad Ending",    color: "#EF5350", icon: "💔" },
  [ENDING_TYPES.TRUE]:   { label: "True Ending",   color: "#F7C940", icon: "👑" },
  [ENDING_TYPES.SECRET]: { label: "Secret Ending", color: "#9B8EC4", icon: "🔮" },
};