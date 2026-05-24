// archived copy of mockWriterTreeData.js

// original content preserved for reference

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
export const mockWriterNovelSummary = { /* ... */ };
export const mockWriterTreeNodes = [ /* ... */ ];
export const mockWriterTreeEdges = [ /* ... */ ];
