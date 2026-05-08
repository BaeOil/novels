// src/data/mockNovel.js
// Mock data — replace with API call when database is ready

export const mockNovel = {
  id: "novel-001",
  title: "ผจญภัยกับสามหมี",
  categories: ["นิยาย", "ตลก"],
  coverImage: null, // TODO: replace with actual image URL from DB
  coverEmoji: "🐻", // fallback when no image
  author: {
    id: "author-001",
    displayName: "อาจารย์ยิฟู",
    avatarUrl: null, // TODO: replace with actual avatar URL
  },
  synopsis:
    "ไม่ว่าจะเป็นเรื่องกิน นอน นั่ง หรือเล่นสนุก พวกเขาอาศัยอยู่ด้วยกันในบ้านน้ำกลางป่าย่านเบย์แอเรีย ซานฟรานซิสโก คุณจะต้องหลงเสน่ห์ความน่ารัก ความป่วน และความมุ่มมีขอ งสามหมีพี่น้องจนแทบจะอดใจจิ้มปุ่มไหวเลยทีเดียว",
  stats: {
    views: 5900,
    paths: 12,
    choicePoints: 25,
    endings: 5,
  },
  userProgress: {
    currentChapter: 4,
    totalChapters: 12,
    discoveredChoices: 10,
    totalChoices: 25,
    percentage: 37,
  },
  characters: [
    { role: "แพนด้า", name: "แอ๊งโโ" },
    { role: "หมี", name: "โอก" },
    { role: "หมีขาว", name: "แจกแหดบดฝา" },
  ],
  synopsis_detail:
    "ลาๆๆโสดำฟรักไย่ผ่แรกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกก กอาหรอยี้ทำเราที่รอดนก็กอรดีพเทกนหอร์กเหกน่",
  isLiked: false,
  isBookmarked: false,
};

export const mockRelatedNovels = [
  {
    id: "novel-002",
    title: "ผจญภัยในป่าใหญ่",
    coverEmoji: "🌲",
    author: "นักเขียน_B",
    views: 3200,
  },
  {
    id: "novel-003",
    title: "หมีน้อยกับดอกไม้",
    coverEmoji: "🌸",
    author: "นักเขียน_C",
    views: 1800,
  },
];
