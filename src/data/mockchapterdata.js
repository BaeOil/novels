// src/data/mockChapterData.js
// ══════════════════════════════════════════════════════════
//  Mock data: Chapter + Scene structure
//  Novel → Chapters → Scenes → Choices
//
//  TODO: แทนด้วย API:
//   GET /api/v1/novels/:id/chapters
//   GET /api/v1/chapters/:id/scenes
//   GET /api/v1/scenes/:id/choices
// ══════════════════════════════════════════════════════════

// ── Novel header ──────────────────────────────────────────
export const mockNovelHeader = {
  id: "novel-001",
  title: "ห้องสมุดปริศนา",
  coverEmoji: "🌸",
  coverBg: "linear-gradient(150deg,#FFF0F5,#FFD6E7)",
  synopsis: "เมื่อนักสืบสาวค้นพบห้องสมุดลับที่ซ่อนความลับนับพันปี เธอต้องเลือก...",
  status: "draft",
  chapterCount: 12,
  sceneCount: 25,
  endingCount: 5,
  createdAt: "9 เม.ย. 2569",
};

// ── Chapter list ──────────────────────────────────────────
// แต่ละ chapter มี scenes[]
export const mockChapters = [
  {
    id: "ch-001",
    chapterNumber: 1,
    title: "จุดเริ่มต้น",
    isStartChapter: true,
    sceneCount: 3,
    choiceCount: 1,
    status: "draft",
    updatedAt: "15 เม.ย. 2569",
    scenes: [
      {
        id: "scene-001",
        sceneNumber: "1",
        title: "เจอสถานการณ์",
        excerpt: "ศัตรูทำให้เขาต้องเลือกกระหวางหนีกลับต่อสู้...",
        choiceCount: 1,
        hasChoices: true,
        status: "draft",
        choices: [
          {
            id: "choice-001",
            text: "สำรวจแบบไม่ย่อท้อ",
            targetChapterId: "ch-002",
            targetSceneId: "scene-002-2",
            targetLabel: "ตอนที่ 2 : ฉากที่ 2.2",
            targetType: "same",  // same chapter หรือ other
          },
        ],
      },
      {
        id: "scene-002",
        sceneNumber: "2",
        title: "ค้นพบอะไรบางอย่าง",
        excerpt: "สิ่งตรงหน้าเริ่มทำให้รู้สึกสนมากขึ้น...",
        choiceCount: 0,
        hasChoices: false,
        status: "draft",
        choices: [],
        hasNoChoiceWarning: true,
      },
    ],
  },
  {
    id: "ch-002",
    chapterNumber: 2,
    title: "หนีเสือ",
    isStartChapter: false,
    sceneCount: 3,
    choiceCount: 1,
    status: "draft",
    updatedAt: "14 เม.ย. 2569",
    scenes: [
      {
        id: "scene-003",
        sceneNumber: "1",
        title: "หาทางหนี",
        excerpt: "ทางออกมีอยู่ แต่ต้องเลือกทางที่ถูก...",
        choiceCount: 3,
        hasChoices: true,
        status: "draft",
        choices: [
          {
            id: "choice-002",
            text: "สำรวจแบบไม่ย่อท้อจนกว่าจะพบทางออก",
            targetChapterId: "ch-002",
            targetSceneId: "scene-004",
            targetLabel: "ตอนที่ 2 : ฉากที่ 2.2",
            targetType: "same",
          },
          {
            id: "choice-003",
            text: "ค้นหาทางใหม่",
            targetChapterId: "ch-003",
            targetSceneId: "scene-007",
            targetLabel: "ตอนที่ 3 : ฉากที่ 3.1",
            targetType: "other",
          },
          {
            id: "choice-004",
            text: "กลับไปตรงจุดเริ่มต้น",
            targetChapterId: "ch-003",
            targetSceneId: "scene-008",
            targetLabel: "ตอนที่ 3 : ฉากที่ 3.2",
            targetType: "other",
          },
        ],
      },
    ],
  },
  {
    id: "ch-003",
    chapterNumber: 3,
    title: "ทางตัน",
    isStartChapter: false,
    sceneCount: 3,
    choiceCount: 1,
    status: "draft",
    updatedAt: "13 เม.ย. 2569",
    scenes: [],
  },
  {
    id: "ch-004",
    chapterNumber: 4,
    title: "ดีแตก",
    isStartChapter: false,
    sceneCount: 3,
    choiceCount: 1,
    status: "draft",
    updatedAt: "12 เม.ย. 2569",
    scenes: [],
  },
  {
    id: "ch-005",
    chapterNumber: 5,
    title: "กลับใจ",
    isStartChapter: false,
    sceneCount: 3,
    choiceCount: 1,
    status: "draft",
    updatedAt: "11 เม.ย. 2569",
    scenes: [],
  },
  {
    id: "ch-006",
    chapterNumber: 6,
    title: "จุดจบ",
    isStartChapter: false,
    isEndingChapter: true,
    sceneCount: 3,
    choiceCount: 1,
    status: "draft",
    updatedAt: "10 เม.ย. 2569",
    scenes: [],
  },
];

// ── Scene options สำหรับ dropdown เลือกตอนที่เชื่อม ─────────
export const mockSceneTargetOptions = [
  {
    chapterId: "ch-001",
    chapterTitle: "ตอนที่ 1 : จุดเริ่มต้น",
    scenes: [
      { id: "scene-001", label: "ฉากที่ 1.1 : บกนำ" },
      { id: "scene-002", label: "ฉากที่ 1.2 : ค้นพบอะไรบางอย่าง" },
      { id: "scene-003", label: "ฉากที่ 1.3 : ทำอะไรไปดูก" },
    ],
  },
  {
    chapterId: "ch-002",
    chapterTitle: "ตอนที่ 2 : หาทางหนี",
    scenes: [
      { id: "scene-004", label: "ฉากที่ 2.1 : สอดส่อง" },
      { id: "scene-005", label: "ฉากที่ 2.2 : หลงทางในความมืด" },
      { id: "scene-006", label: "ฉากที่ 2.3 : ลองดู" },
    ],
  },
  {
    chapterId: "ch-003",
    chapterTitle: "ตอนที่ 3 : ค้นพบ",
    scenes: [
      { id: "scene-007", label: "ฉากที่ 3.1 : สำรวจประตู" },
      { id: "scene-008", label: "ฉากที่ 3.2 : สำรวจจุดเริ่มต้น" },
    ],
  },
];

// ── Full scene detail (สำหรับหน้าเขียนเนื้อหา) ────────────
export const mockSceneDetail = {
  id: "scene-001",
  novelId: "novel-001",
  novelTitle: "ห้องสมุดปริศนา",
  chapterId: "ch-002",
  chapterTitle: "ตอนที่ 2 : หาทางหนี",
  sceneId: "scene-001-2-1",
  sceneLabel: "ฉากที่ 2.1",
  sceneTitle: "สำรวจประตู",
  isPublished: true,
  isEnding: false,
  content: `เงามืดในมุมทางเดินกลืนร่างของมายาไว้แน่น เธอได้ยินเสียงหัวใจตัวเองดังลั่นราวกับจะฉีกทะลุออกมา แต่เท้าของเธอไม่ยอมขยับ

คุณแจในมือเล็กน้อยระริกเมื่อเสียงฝีเท้าของยามเข้ามาใกล้ขึ้นทุกที แสงไฟฉายกวาดไปมาตามพื้น ทอดเงาพริ้วไหวบนผนังหินนับพันปีที่ปกคลุมด้วยตัวอักษรโบราณ

"ห้องอ่านหมายเลข XIII ถูกปิดผนึกมาตั้งแต่ปี 2347..." เธอพึมพำกับตัวเอง นิ้วมือลูบไล้ตัวอักษรแกะสลักบนประตูที่เย็นเยียบราวกับน้ำแข็ง แต่แปลกที่มันยังอุ่นอยู่`,
  choices: [
    {
      id: "choice-001",
      orderIndex: 1,
      text: "สำรวจแบบไม่ย่อท้อจนกว่าจะพบทางออก",
      targetChapterId: "ch-002",
      targetSceneId: "scene-005",
      targetLabel: "ตอนที่ 2 : ฉากที่ 2.2",
      targetType: "same",
      targetSubScene: "ฉากที่ 2.2 : หลงทางในความมืด",
    },
    {
      id: "choice-002",
      orderIndex: 2,
      text: "ค้นหาทางใหม่",
      targetChapterId: "ch-003",
      targetSceneId: "scene-007",
      targetLabel: "ตอนที่ 3 : ฉากที่ 3.1",
      targetType: "other",
      targetSubScene: "ฉากที่ 3.1 : สำรวจประตู",
    },
    {
      id: "choice-003",
      orderIndex: 3,
      text: "กลับไปตรงจุดเริ่มต้น",
      targetChapterId: "ch-003",
      targetSceneId: "scene-008",
      targetLabel: "ตอนที่ 3 : ฉากที่ 3.2",
      targetType: "other",
      targetSubScene: "ฉากที่ 3.2 : สำรวจจุดเริ่มต้น",
    },
  ],

  // เส้นทางของตอนนี้ (sidebar left ในหน้า writer)
  allChapters: [
    {
      id: "ch-001",
      chapterNumber: 1,
      title: "จุดเริ่มต้น",
      isExpanded: false,
      scenes: [
        { id: "s1", label: "1.1 บกนำ", isCurrent: false },
        { id: "s2", label: "1.2 ค้นพบอะไรบางอย่าง", isCurrent: false },
      ],
    },
    {
      id: "ch-002",
      chapterNumber: 2,
      title: "หาทางหนี",
      isExpanded: true,
      scenes: [
        { id: "scene-001-2-1", label: "2.1 สอดส่องประตู", isCurrent: true },
        { id: "scene-002-2-2", label: "2.2 ค้นหาทางใหม่", isCurrent: false },
      ],
    },
    {
      id: "ch-003",
      chapterNumber: 3,
      title: "ค้นพบ",
      isExpanded: false,
      scenes: [],
    },
  ],
};