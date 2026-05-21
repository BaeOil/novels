// src/data/mockWriterTreeData.js
// ══════════════════════════════════════════════════════════
//  Writer Story Tree Data
//  Scene = Node, Choice = Edge (labeled)
//
//  Node status (writer view):
//    published   = เผยแพร่แล้ว (เขียว)
//    draft       = ฉบับร่าง (เทา)
//    ending      = ตอนจบ (ทอง/เหลือง)
//    no_link     = ฉากที่ไม่มีการเชื่อมต่อ (ส้ม)
//
//  TODO: GET /api/v1/novels/:id/story-tree (writer version)
// ══════════════════════════════════════════════════════════

export const WRITER_NODE_STATUS = {
  PUBLISHED: "published",
  DRAFT:     "draft",
  ENDING:    "ending",
  NO_LINK:   "no_link",
};

// ─────────────────────────────────────────────
//  Novel summary (right sidebar)
// ─────────────────────────────────────────────
export const mockWriterNovelSummary = {
  id: "novel-001",
  title: "ห้องสมุดปริศนา",
  updatedAt: "18 เม.ย. 2568",
  totalChapters: 12,
  publishedChapters: 6,
  totalChoicePoints: 25,
  totalEndings: 5,

  // Chapter accordion data
  chapters: [
    {
      id: "ch-001", chapterNumber: 1, title: "จุดเริ่มต้น",
      scenes: [
        { id: "s-1-1", label: "ฉากที่ 1.1 : บกนำ",                 status: "published" },
        { id: "s-1-2", label: "ฉากที่ 1.2 : ค้นพบอะไรบางอย่าง",   status: "published" },
        { id: "s-1-3", label: "ฉากที่ 1.3 : ทำอะไรไปดูก",          status: "published" },
      ],
    },
    {
      id: "ch-002", chapterNumber: 2, title: "หาทางหนี",
      scenes: [
        { id: "s-2-1", label: "ฉากที่ 2.1 : สำรวจประตู",   status: "draft" },
        { id: "s-2-2", label: "ฉากที่ 2.2 : ค้นหาทางใหม่", status: "draft" },
      ],
    },
    {
      id: "ch-003", chapterNumber: 3, title: "ค้นพบ",
      scenes: [
        { id: "s-3-1", label: "ฉากที่ 3.1 : สำรวจประตู",      status: "draft" },
        { id: "s-3-2", label: "ฉากที่ 3.2 : สำรวจจุดเริ่มต้น", status: "draft" },
      ],
    },
  ],
};

// ─────────────────────────────────────────────
//  Nodes — ตรงกับภาพ
// ─────────────────────────────────────────────
// col / row ใช้ตำแหน่ง grid
// x / y = pixel position สัมบูรณ์ใน canvas (คำนวณจาก col/row)
export const mockWriterTreeNodes = [
  // Row 0 — root
  { id: "n1-1",  label: "1.1แพนด้าออกจากบ้านครั้งแรก", col: 4,  row: 0, status: WRITER_NODE_STATUS.PUBLISHED },

  // Row 1 — 3 branches
  { id: "n2-1",  label: "2.1 เริ่มผจญภัย",         col: 2,  row: 1, status: WRITER_NODE_STATUS.PUBLISHED },
  { id: "n1-3",  label: "1.3 ลุยแบบชิวๆ",           col: 4,  row: 1, status: WRITER_NODE_STATUS.PUBLISHED },
  { id: "n1-2",  label: "1.2 เปลี่ยนใจ อยู่บ้านดีกว่า", col: 6, row: 1, status: WRITER_NODE_STATUS.NO_LINK },

  // Row 2
  { id: "n3-1",  label: "3.1 แพนด้าโดนหมีหาเรื่อง",  col: 2,  row: 2, status: WRITER_NODE_STATUS.PUBLISHED },
  { id: "n3-2",  label: "3.2 ลอง",                   col: 4,  row: 2, status: WRITER_NODE_STATUS.DRAFT },
  { id: "n3-3",  label: "3.3 นอน",                   col: 5,  row: 2, status: WRITER_NODE_STATUS.DRAFT },

  // Row 3
  { id: "n4-3",  label: "4.3 สู้กลับ",              col: 1,  row: 3, status: WRITER_NODE_STATUS.DRAFT },
  { id: "n4-2",  label: "4.2 วิ้งหนี",              col: 3,  row: 3, status: WRITER_NODE_STATUS.DRAFT },
  { id: "n4-1",  label: "4.1 หมีอืม",               col: 5,  row: 3, status: WRITER_NODE_STATUS.DRAFT },

  // Row 4
  { id: "n4-4",  label: "4.4 หมียอมรับเข้ากลุ่ม",  col: 1,  row: 4, status: WRITER_NODE_STATUS.DRAFT },
  { id: "n5-1",  label: "5.1 หมีไม่ยอม",            col: 3,  row: 4, status: WRITER_NODE_STATUS.DRAFT },
  { id: "n5-2",  label: "5.2 หมีกลัว",              col: 4,  row: 4, status: WRITER_NODE_STATUS.DRAFT },

  // Row 5 — ending & isolated
  { id: "n6-1",  label: "6.1 หมียอมรับเข้ากลุ่ม",  col: 1,  row: 5, status: WRITER_NODE_STATUS.ENDING },
  { id: "n3-5",  label: "3.5 หมีไม่เคยพอใจ",        col: 6,  row: 5, status: WRITER_NODE_STATUS.ENDING },
];

// ─────────────────────────────────────────────
//  Edges — ตรงกับภาพ (from, to, label?)
// ─────────────────────────────────────────────
export const mockWriterTreeEdges = [
  // n1-1 → 3 branches
  { id: "e1", from: "n1-1", to: "n2-1",  label: "ออกเดิน" },
  { id: "e2", from: "n1-1", to: "n1-3",  label: "เตรียมของ" },
  { id: "e3", from: "n1-1", to: "n1-2",  label: "นอนดีกว่า" },

  // n2-1 → n3-1
  { id: "e4", from: "n2-1", to: "n3-1",  label: null },

  // n1-3 → n3-2, n3-3
  { id: "e5", from: "n1-3", to: "n3-2",  label: null },
  { id: "e6", from: "n1-3", to: "n3-3",  label: null },

  // n3-1 → n4-3, n4-2
  { id: "e7", from: "n3-1", to: "n4-3",  label: null },
  { id: "e8", from: "n3-1", to: "n4-2",  label: null },

  // n3-2 → n4-1
  { id: "e9", from: "n3-2", to: "n4-1",  label: null },

  // n4-3 → n4-4, n5-1
  { id: "e10", from: "n4-3", to: "n4-4", label: "ใช้กระบวนท่า" },
  { id: "e11", from: "n4-3", to: "n5-1", label: null },

  // n4-2 → n5-2
  { id: "e12", from: "n4-2", to: "n5-2", label: null },

  // n4-4 → n6-1 (ending)
  { id: "e13", from: "n4-4", to: "n6-1", label: null },
];

// ─────────────────────────────────────────────
//  Legend config
// ─────────────────────────────────────────────
export const WRITER_LEGEND = [
  { status: WRITER_NODE_STATUS.PUBLISHED, label: "เผยแพร่",              color: "#4CAF82" },
  { status: WRITER_NODE_STATUS.DRAFT,     label: "ฉบับร่าง",              color: "#C8C3D4" },
  { status: WRITER_NODE_STATUS.ENDING,    label: "ตอนจบ",                color: "#F59E0B" },
  { status: WRITER_NODE_STATUS.NO_LINK,   label: "ฉากที่ไม่มีการเชื่อมต่อ", color: "#FB923C" },
];

// ─────────────────────────────────────────────
//  Status → visual style
// ─────────────────────────────────────────────
export const WRITER_NODE_STYLE = {
  [WRITER_NODE_STATUS.PUBLISHED]: { stroke: "#4CAF82", fill: "#F0FBF5", text: "#1F5C3E", strokeW: 1.5 },
  [WRITER_NODE_STATUS.DRAFT]:     { stroke: "#C8C3D4", fill: "#F9F9FB", text: "#6B6578", strokeW: 1.5 },
  [WRITER_NODE_STATUS.ENDING]:    { stroke: "#F59E0B", fill: "#FFFBEB", text: "#92400E", strokeW: 2   },
  [WRITER_NODE_STATUS.NO_LINK]:   { stroke: "#FB923C", fill: "#FFF7ED", text: "#9A3412", strokeW: 1.5 },
};