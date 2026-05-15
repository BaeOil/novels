// src/data/mockSceneData.js
//
// ══════════════════════════════════════════════════════════════
//  โครงสร้างข้อมูลจริงตาม PROJECT CONTEXT
//
//  Novel → Chapters → Scenes → Choices
//
//  Scene  = หน่วยเนื้อหาหลัก (ไม่ใช่ Chapter)
//  Choice = ตัวเลือกที่เชื่อม Scene → Scene
//  ผู้อ่านอ่านทีละ Scene แล้วเลือก Choice เพื่อไป Scene ถัดไป
//
// ══════════════════════════════════════════════════════════════
//
// TODO: แทนที่ด้วย API calls เมื่อ Backend พร้อม:
//   GET /api/v1/scenes/:id          → ดึงข้อมูล scene
//   GET /api/v1/scenes/:id/choices  → ดึง choices ของ scene
//   GET /api/v1/novels/:id/chapters → ดึง chapters ของนิยาย
// ══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// SCENE TYPES (ตาม PROJECT CONTEXT)
// ─────────────────────────────────────────────
export const SCENE_TYPES = {
  START:   "start",    // ฉากเริ่มต้น (มีได้แค่ 1 ใน novel)
  NORMAL:  "normal",   // ฉากปกติทั่วไป
  ENDING:  "ending",   // ฉากจบ (ไม่มี choices)
};

// ─────────────────────────────────────────────
// ENDING TYPES (ตาม PROJECT CONTEXT)
// ─────────────────────────────────────────────
export const ENDING_TYPES = {
  GOOD:   "good_ending",   // จบดี
  BAD:    "bad_ending",    // จบไม่ดี
  TRUE:   "true_ending",   // จบแท้จริง (unlock ด้วยเส้นทางพิเศษ)
  SECRET: "secret_ending", // จบลับ (hidden route)
};

// ─────────────────────────────────────────────
// MOCK: Novel + Chapter structure
// ─────────────────────────────────────────────
export const mockNovelWithChapters = {
  novelId: "novel-001",
  novelTitle: "ผจญภัยกับสามหมี",
  chapters: [
    {
      id: "ch-001",
      chapterNumber: 1,
      title: "บทที่ 1 — วันธรรมดาของสามหมี",
      sceneCount: 4,
    },
    {
      id: "ch-002",
      chapterNumber: 2,
      title: "บทที่ 2 — การผจญภัยเริ่มต้น",
      sceneCount: 6,
    },
  ],
};

// ─────────────────────────────────────────────
// MOCK: Scenes (หน่วยอ่านหลัก)
//
// โครงสร้าง Scene ตาม DB Schema:
//   id, chapter_id, title, content,
//   scene_type (start/normal/ending),
//   ending_type (good/bad/true/secret | null),
//   order_index
// ─────────────────────────────────────────────
export const mockScenes = {
  // ── Chapter 1 Scenes ──────────────────────────

  "scene-001": {
    id: "scene-001",
    chapterId: "ch-001",
    chapterTitle: "บทที่ 1 — วันธรรมดาของสามหมี",
    chapterNumber: 1,
    sceneType: SCENE_TYPES.START,
    endingType: null,
    title: "ตื่นนอนในเช้าวันใหม่",
    content: [
      "เช้าวันหนึ่งในบ้านน้ำกลางป่าย่านเบย์แอเรีย เสียงนาฬิกาปลุกดังขึ้นพร้อมกับแสงแดดที่ส่องผ่านหน้าต่างไม้เก่า แพนด้าตื่นขึ้นมาพร้อมกับยิ้มกว้างราวกับว่าวันนี้จะเป็นวันที่ดีที่สุดในชีวิต",
      "\"วันนี้จะทำอะไรดีนะ\" แพนด้าพึมพำกับตัวเอง มองออกไปนอกหน้าต่างที่มีนกร้องขับขานอยู่บนกิ่งไม้ใหญ่ ก่อนที่จะได้กลิ่นหอมของอาหารเช้าลอยมาจากชั้นล่าง",
      "หมีน้ำตาลกำลังยุ่งอยู่กับการทำแพนเค้กสูงเต็มจาน ขณะที่หมีขาวนอนกลิ้งอยู่บนโซฟา ถือมือถือแล้วหัวเราะคิกคักกับวิดีโอบน TikTok",
      "\"พี่ๆ! วันนี้เราจะทำอะไรกันดี?\" แพนด้าวิ่งลงบันไดสองขั้นต่อครั้ง เสียงดังโครมๆ จนหมีขาวสะดุ้งตกโซฟา",
    ],
    // Choices: เชื่อม scene-001 → scene ถัดไป
    choices: [
      {
        id: "choice-001",
        sceneId: "scene-001",          // scene ที่ choice นี้อยู่
        nextSceneId: "scene-002",      // scene ที่จะไปเมื่อเลือก
        text: "เตรียมตัวทัศนศึกษากัน",
        hint: "เส้นทางนักผจญภัย",
        orderIndex: 1,
      },
      {
        id: "choice-002",
        sceneId: "scene-001",
        nextSceneId: "scene-003",
        text: "ไม่ต้องเตรียมอะไร สบายๆ !",
        hint: "เส้นทางชิลล์",
        orderIndex: 2,
      },
      {
        id: "choice-003",
        sceneId: "scene-001",
        nextSceneId: "scene-004",
        text: "เปลี่ยนใจนอนอยู่บ้าน",
        hint: null,
        orderIndex: 3,
      },
    ],
    orderIndex: 1,
    readingTimeMinutes: 3,
    // tracking: ตอน user เคยอ่าน scene นี้แล้ว
    isVisited: true,
    fromChoiceText: null,       // scene แรก ไม่มี from choice
    fromSceneTitle: null,
  },

  "scene-002": {
    id: "scene-002",
    chapterId: "ch-001",
    chapterTitle: "บทที่ 1 — วันธรรมดาของสามหมี",
    chapterNumber: 1,
    sceneType: SCENE_TYPES.NORMAL,
    endingType: null,
    title: "เตรียมตัวออกเดินทาง",
    content: [
      "แพนด้าวิ่งขึ้นไปบนห้องอย่างรวดเร็ว เปิดตู้เสื้อผ้าออกแล้วลองชุดต่างๆ นับสิบชุด ก่อนตัดสินใจว่าชุดที่ใส่อยู่นั่นแหละดีที่สุด",
      "หมีน้ำตาลเตรียมกระเป๋าเป้ใบใหญ่ บรรจุอาหารว่างไว้เต็มไปหมด ทั้งแซนวิช พิซซ่าเย็น และขนมอีกหลายถุง \"เผื่อหิวระหว่างทาง\" เขาบอกอย่างจริงจัง",
      "หมีขาวถือแผนที่ที่พิมพ์จากอินเทอร์เน็ต พลิกไปมาอยู่หลายครั้ง ก่อนกลับหัวมันแล้วบอกว่า \"โอเค พร้อมแล้ว!\"",
    ],
    choices: [
      {
        id: "choice-004",
        sceneId: "scene-002",
        nextSceneId: "scene-005",
        text: "ออกเดินทางทันที!",
        hint: null,
        orderIndex: 1,
      },
      {
        id: "choice-005",
        sceneId: "scene-002",
        nextSceneId: "scene-006",
        text: "รอให้เตรียมตัวให้พร้อมกว่านี้",
        hint: "อาจเจอบางอย่างพิเศษ",
        orderIndex: 2,
      },
    ],
    orderIndex: 2,
    readingTimeMinutes: 2,
    isVisited: true,
    fromChoiceText: "เตรียมตัวทัศนศึกษากัน",
    fromSceneTitle: "ตื่นนอนในเช้าวันใหม่",
  },

  "scene-003": {
    id: "scene-003",
    chapterId: "ch-001",
    chapterTitle: "บทที่ 1 — วันธรรมดาของสามหมี",
    chapterNumber: 1,
    sceneType: SCENE_TYPES.NORMAL,
    endingType: null,
    title: "วันชิลล์ที่บ้าน",
    content: [
      "พวกเขาตัดสินใจอยู่บ้านอย่างสบายๆ เปิดทีวีดูหนัง สั่งพิซซ่า และแข่งเกมกัน",
      "\"บางทีวันไม่ทำอะไรก็ดีที่สุด\" หมีขาวกล่าวอย่างพึงพอใจ ขณะหยิบพิซซ่าชิ้นที่สิบ",
    ],
    choices: [
      {
        id: "choice-006",
        sceneId: "scene-003",
        nextSceneId: "scene-007",
        text: "เล่นเกมต่อสักพัก",
        hint: null,
        orderIndex: 1,
      },
    ],
    orderIndex: 3,
    readingTimeMinutes: 2,
    isVisited: false,
    fromChoiceText: "ไม่ต้องเตรียมอะไร สบายๆ !",
    fromSceneTitle: "ตื่นนอนในเช้าวันใหม่",
  },

  "scene-004": {
    id: "scene-004",
    chapterId: "ch-001",
    chapterTitle: "บทที่ 1 — วันธรรมดาของสามหมี",
    chapterNumber: 1,
    sceneType: SCENE_TYPES.NORMAL,
    endingType: null,
    title: "นอนดูซีรีส์",
    content: [
      "แพนด้าดึงผ้าห่มมาคลุม เปิดซีรีส์เรื่องโปรดบนโน้ตบุ๊ค ท่ามกลางเสียงบ่นของพี่ๆ ว่าขอดูด้วย",
    ],
    choices: [
      {
        id: "choice-007",
        sceneId: "scene-004",
        nextSceneId: "scene-008",
        text: "ให้พี่ๆ ดูด้วยกัน",
        hint: null,
        orderIndex: 1,
      },
    ],
    orderIndex: 4,
    readingTimeMinutes: 1,
    isVisited: false,
    fromChoiceText: "เปลี่ยนใจนอนอยู่บ้าน",
    fromSceneTitle: "ตื่นนอนในเช้าวันใหม่",
  },

  // ── Chapter 2 Scenes ──────────────────────────

  "scene-005": {
    id: "scene-005",
    chapterId: "ch-002",
    chapterTitle: "บทที่ 2 — การผจญภัยเริ่มต้น",
    chapterNumber: 2,
    sceneType: SCENE_TYPES.NORMAL,
    endingType: null,
    title: "พบกับหมีป่า",
    content: [
      "ระหว่างเดินทางในป่า สามหมีพบกับหมีป่าตัวใหญ่ที่นั่งหน้าถ้ำ มันมองมาด้วยสายตาที่ยากจะอ่าน",
      "หมีน้ำตาลเดินหน้าอย่างกล้าหาญ ยืดอกพูดว่า \"สวัสดีครับ! เราแค่ผ่านมา\"",
    ],
    choices: [
      {
        id: "choice-008",
        sceneId: "scene-005",
        nextSceneId: "scene-009",
        text: "พยายามเป็นมิตรกับหมีป่า",
        hint: "เส้นทางมิตรภาพ",
        orderIndex: 1,
      },
      {
        id: "choice-009",
        sceneId: "scene-005",
        nextSceneId: "scene-010",
        text: "วิ่งหนีอย่างรวดเร็ว!",
        hint: null,
        orderIndex: 2,
      },
    ],
    orderIndex: 1,
    readingTimeMinutes: 3,
    isVisited: false,
    fromChoiceText: "ออกเดินทางทันที!",
    fromSceneTitle: "เตรียมตัวออกเดินทาง",
  },

  // Ending Scenes ────────────────────────────────

  "scene-end-001": {
    id: "scene-end-001",
    chapterId: "ch-002",
    chapterTitle: "บทที่ 2 — การผจญภัยเริ่มต้น",
    chapterNumber: 2,
    sceneType: SCENE_TYPES.ENDING,
    endingType: ENDING_TYPES.GOOD,
    title: "มิตรภาพแห่งป่า",
    content: [
      "หมีป่าค่อยๆ ยิ้มออกมา มันบอกว่าไม่มีใครกล้าเข้ามาทักทายมันตั้งนานแล้ว ก่อนที่จะพาสามหมีไปรู้จักกับสัตว์ต่างๆ ในป่าที่ซ่อนอยู่",
      "คืนนั้น พวกเขานั่งล้อมไฟและเล่าเรื่องราวของกันและกัน มิตรภาพใหม่ที่ไม่คาดคิดได้เริ่มต้นขึ้น",
      "\"บางครั้งการผจญภัยที่ดีที่สุดก็คือการได้เจอเพื่อนใหม่\" แพนด้าคิดในใจ",
    ],
    choices: [],  // ending scene ไม่มี choices
    orderIndex: 99,
    readingTimeMinutes: 3,
    isVisited: false,
    fromChoiceText: "พยายามเป็นมิตรกับหมีป่า",
    fromSceneTitle: "พบกับหมีป่า",
  },

  "scene-end-002": {
    id: "scene-end-002",
    chapterId: "ch-002",
    chapterTitle: "บทที่ 2 — การผจญภัยเริ่มต้น",
    chapterNumber: 2,
    sceneType: SCENE_TYPES.ENDING,
    endingType: ENDING_TYPES.BAD,
    title: "วันที่ไม่ได้ดั่งใจ",
    content: [
      "สามหมีวิ่งหนีกลับบ้านโดยไม่ได้อะไรติดมือ ยกเว้นความเหนื่อยและรองเท้าที่พัง",
      "\"ครั้งหน้าอย่าวิ่งหนีนะ\" หมีน้ำตาลพูดระหว่างหอบ",
    ],
    choices: [],
    orderIndex: 99,
    readingTimeMinutes: 2,
    isVisited: false,
    fromChoiceText: "วิ่งหนีอย่างรวดเร็ว!",
    fromSceneTitle: "พบกับหมีป่า",
  },

  "scene-end-003": {
    id: "scene-end-003",
    chapterId: "ch-002",
    sceneType: SCENE_TYPES.ENDING,
    endingType: ENDING_TYPES.SECRET,
    title: "🔒 ตอนจบลับ",
    content: [],
    choices: [],
    orderIndex: 99,
    readingTimeMinutes: 0,
    isVisited: false,
    isHidden: true,   // hidden route
  },
};

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

/** ดึง scene จาก id */
export const getSceneById = (id) =>
  mockScenes[id] || mockScenes["scene-001"];

/** ดึง choices ของ scene */
export const getChoicesBySceneId = (sceneId) => {
  const scene = mockScenes[sceneId];
  return scene ? scene.choices : [];
};

/** ดึง scene ถัดไปจาก choice */
export const getNextScene = (choiceId, currentSceneId) => {
  const scene = mockScenes[currentSceneId];
  const choice = scene?.choices.find((c) => c.id === choiceId);
  return choice ? getSceneById(choice.nextSceneId) : null;
};