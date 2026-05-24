// archived copy of mockstorytreedata.js

// original content preserved for reference

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
// ═════════════════════════════════════════════════════════════=
//
// TODO: GET /api/v1/novels/:id/story-tree
//       Response ควรมี nodes[] และ edges[]
//       พร้อม status ของแต่ละ scene สำหรับ user คนนี้
// ═════════════════════════════════════════════════════════════=

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
  nodes: [ /* ... */ ],

  // ── Edges (Choice = Edge) ─────────────────
  edges: [ /* ... */ ],
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
