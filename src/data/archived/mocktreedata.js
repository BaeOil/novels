// archived copy of mocktreedata.js

// original content preserved for reference

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
  nodes: [ /* ... */ ],

  // edges: from → to
  edges: [ /* ... */ ],
};
