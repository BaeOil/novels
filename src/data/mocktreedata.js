// src/data/mockTreeData.js
// Mock data สำหรับ Story Tree (Reader View)
// TODO: fetch จาก GET /api/novels/:id/story-tree

export const mockTreeData = {
  novelId: "novel-001",
  novelTitle: "ผจญภัยกับสามหมี",
  stats: {
    totalPaths: 13,
    visitedPaths: 4,
    totalChoicePoints: 5,
    visitedChoicePoints: 2,
    totalEndings: 4,
    unlockedEndings: 2,
  },
  currentChapterId: "ch-002a",

  // nodes: id, label, type, status, x, y
  // type: "chapter" | "ending"
  // status: "current" | "visited" | "ending" | "locked"
  nodes: [
    { id: "ch-001",   label: "แพนด้าออกจากบ้านครั้งแรก",  type: "chapter", status: "visited", col: 2, row: 0 },
    { id: "ch-002a",  label: "เริ่มผจญภัย",                type: "chapter", status: "visited", col: 1, row: 1 },
    { id: "ch-002b",  label: "ลุยแบบชิวๆ",                type: "chapter", status: "visited", col: 3, row: 1 },
    { id: "ch-002c",  label: "เปลี่ยนใจ อยู่บ้านดีกว่า",  type: "chapter", status: "locked",  col: 5, row: 1 },
    { id: "ch-003a",  label: "แพนด้าโดนหมีหาเรื่อง",      type: "chapter", status: "visited", col: 1, row: 2 },
    { id: "ch-003b",  label: "🔒 ยังไม่ถึง",              type: "chapter", status: "locked",  col: 3, row: 2 },
    { id: "ch-003c",  label: "🔒 ยังไม่ถึง",              type: "chapter", status: "locked",  col: 5, row: 2 },
    { id: "ch-004a",  label: "สู้กลับ",                    type: "chapter", status: "current", col: 1, row: 3 },
    { id: "ch-004b",  label: "🔒 ยังไม่ถึง",              type: "chapter", status: "locked",  col: 3, row: 3 },
    { id: "ch-005a",  label: "หมียอมรับเข้ากลุ่ม",        type: "chapter", status: "visited", col: 0, row: 4 },
    { id: "ch-005b",  label: "🔒 ยังไม่ถึง",              type: "chapter", status: "locked",  col: 2, row: 4 },
    { id: "ch-005c",  label: "🔒 ยังไม่ถึง",              type: "chapter", status: "locked",  col: 4, row: 4 },
    { id: "end-001",  label: "หมียอมรับเข้ากลุ่ม",        type: "ending",  status: "ending",  col: 0, row: 5 },
  ],

  // edges: from → to
  edges: [
    { from: "ch-001",  to: "ch-002a" },
    { from: "ch-001",  to: "ch-002b" },
    { from: "ch-001",  to: "ch-002c" },
    { from: "ch-002a", to: "ch-003a" },
    { from: "ch-002b", to: "ch-003b" },
    { from: "ch-002b", to: "ch-003c" },
    { from: "ch-003a", to: "ch-004a" },
    { from: "ch-003a", to: "ch-004b" },
    { from: "ch-004a", to: "ch-005a" },
    { from: "ch-004a", to: "ch-005b" },
    { from: "ch-004a", to: "ch-005c" },
    { from: "ch-005a", to: "end-001" },
  ],
};