import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./HistoryPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const STATUS_MAP = {
  reading: { label: "กำลังอ่าน", color: "#D02676", bg: "#FDF2F8", dot: "#D02676" },
  finished: { label: "อ่านจบแล้ว", color: "#059669", bg: "#ECFDF5", dot: "#10B981" },
};

const normalizeCategoryName = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return String(value.name || value.title || value.label || value.label_th || "").trim();
};

const stripHtml = (html = "") => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
};

const extractChapterAndSceneFromTitle = (title) => {
  if (!title || typeof title !== "string") return { chapter: null, scene: null };
  const chapterMatch = title.match(/ตอนที่\s*(\d+)/i) || title.match(/ตอน\s*(\d+)/i) || title.match(/chapter\s*(\d+)/i);
  const sceneMatch =
    title.match(/ฉากที่\s*(\d+)/i) ||
    title.match(/scene\s*(\d+)/i) ||
    title.match(/ตอนที่\s*\d+\s*[·\-:]\s*ฉากที่\s*(\d+)/i);
  return {
    chapter: chapterMatch ? parseInt(chapterMatch[1], 10) : null,
    scene: sceneMatch ? parseInt(sceneMatch[1], 10) : null,
  };
};

const normalizeBook = (item) => {
  const currentSceneId = item.current_scene_id || item.scene_id || item.last_read_scene_id || 0;
  const lastReadSceneId = item.last_read_scene_id || 0;
  const isTimeTraveling = lastReadSceneId !== 0 && currentSceneId !== 0 && String(lastReadSceneId) !== String(currentSceneId);

  // 🛑 ตัด item.title ทิ้ง จะได้ไม่ดึงชื่อนิยายมาแสดงมั่ว
  const currChapNum = item.current_chapter_number || item.chapter_number || item.chapter_order;
  const currChapTitle = item.current_chapter_title || item.chapter_title;
  const currScNum = item.current_scene_number || item.scene_number || item.order;
  const currScTitle = item.current_scene_name || item.current_scene_title || item.scene_name; 

  const maxChapNum = item.last_read_chapter_number;
  const maxChapTitle = item.last_read_chapter_title;
  const maxScNum = item.last_read_scene_number;
  const maxScTitle = item.last_read_scene_name || item.last_read_scene_title;

  return {
    id: item.novel_id || item.id, 
    title: item.title || "ไม่ระบุชื่อเรื่อง",
    author: item.author_name || item.pen_name || "ไม่ทราบผู้แต่ง",
    categories: Array.isArray(item.categories) ? item.categories.map(c => typeof c === 'object' ? c.name : c) : ["ทั่วไป"],
    coverImage: item.cover_image || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=320&q=80",
    reading_status: item.reading_status || "reading",
    routeFound: item.visited_count || 0,
    totalRoutes: item.total_scenes || item.scene_count || 0,
    endingCount: item.ending_count || 0,
    totalEndings: item.total_endings || 0,
    lastReadAt: (item.last_read_at && !item.last_read_at.startsWith("0001")) ? item.last_read_at : new Date().toISOString(),

    // ดึงค่าปัจจุบันมา ถ้าไม่มีเดี๋ยวเราไป Fetch เพิ่มใน loadHistory
    lastReadChapterNumber: isTimeTraveling ? currChapNum : (currChapNum || maxChapNum),
    lastReadChapterTitle: isTimeTraveling ? currChapTitle : (currChapTitle || maxChapTitle),
    lastReadSceneNumber: isTimeTraveling ? currScNum : (currScNum || maxScNum),
    lastReadSceneName: isTimeTraveling ? currScTitle : (currScTitle || maxScTitle),
    
    lastChoiceText: isTimeTraveling ? "กำลังย้อนกลับมาอ่านฉากนี้" : (item.last_choice_text || null),
    currentSceneId: currentSceneId,
    isTimeTraveling: isTimeTraveling,
  };
};

const HistoryPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

const loadHistory = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const historyUrl = `${API_BASE_URL}/history`;
    const historyRes = await axios.get(historyUrl, { headers });
    const historyPayload = historyRes.data?.data?.history || historyRes.data?.history || historyRes.data?.novels || historyRes.data || [];
    let bookList = Array.isArray(historyPayload) ? historyPayload : [];

    // 🎯 ชั้นที่ 1: กรองเอานิยายที่ไม่มีฉาก หรือยังไม่เคยถูกอ่านจริงๆ ออกไปจากหน้าประวัติ
    bookList = bookList.filter(item => {
      // ถ้าระบบส่งมาว่าจำนวนฉากทั้งหมดเป็น 0 หรือไม่มี id ฉากเลย ให้ตัดทิ้ง
      const totalScenes = item.total_scenes || item.scene_count || 0;
      const hasSceneId = item.current_scene_id || item.scene_id || item.last_read_scene_id;
      
      // ถ้านิยายไม่มีฉากเลย ไม่ควรมาโผล่ในหน้าประวัติการอ่าน
      if (totalScenes === 0 && !hasSceneId) {
        return false;
      }
      return true;
    });

    // แปลงข้อมูลรอบแรก
    const initialBooks = bookList.map(normalizeBook);

    // โหลดข้อมูลฉากย้อนหลังถ้าย้อนไทม์ไลน์
    const populatedBooks = await Promise.all(initialBooks.map(async (book) => {
      if (book.isTimeTraveling && book.currentSceneId !== 0) {
        try {
          const sceneRes = await axios.get(`${API_BASE_URL}/scenes/${book.currentSceneId}`);
          const sceneData = sceneRes.data?.data || sceneRes.data;
          
          if (sceneData) {
            book.lastReadChapterNumber = sceneData.chapter_order || sceneData.chapter_episode || sceneData.chapter_number || book.lastReadChapterNumber;
            book.lastReadChapterTitle = sceneData.chapter_title || sceneData.ChapterTitle || sceneData.chapter_name || book.lastReadChapterTitle;
            book.lastReadSceneNumber = sceneData.order || sceneData.scene_number || sceneData.scene_order || book.lastReadSceneNumber;
            book.lastReadSceneName = sceneData.scene_title || sceneData.scene_name || sceneData.title || sceneData.name || book.lastReadSceneName; 
          }
        } catch (err) {
          console.warn("ไม่สามารถดึงข้อมูลฉากย้อนหลังได้:", err);
        }
      }
      return book;
    }));

    if (active) {
      setBooks(populatedBooks);
    }
  } catch (err) {
    console.error("History API error:", err);
    if (active) setBooks([]);
  } finally {
    if (active) setLoading(false);
  }
};
    loadHistory();

    window.addEventListener("focus", loadHistory);

    return () => {
      active = false;
      window.removeEventListener("focus", loadHistory);
    };
  }, []);

  const filteredBooks = useMemo(() => {
    if (filter === "all") return books;
    return books.filter((book) => book.reading_status === filter);
  }, [books, filter]);

  const statusCounts = {
    reading: books.filter((book) => book.reading_status === "reading").length,
    finished: books.filter((book) => book.reading_status === "finished").length,
  };

  const statusOptions = [
    { key: "all", label: "ทั้งหมด" },
    { key: "reading", label: "กำลังอ่าน" },
    { key: "finished", label: "อ่านจบ" },
  ];

  const formatRelative = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.max(1, Math.floor(diff / 3600))} ชั่วโมงที่แล้ว`;
    if (diff < 604800) return `${Math.max(1, Math.floor(diff / 86400))} วันที่แล้ว`;
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="history-page">
      <div className="history-page__sticky-header">
        <div className="history-page__top">
          <div className="history-page__labels">
            <div className="history-page__eyebrow">ประวัติการอ่านของฉัน</div>
            <div className="history-page__title">นิยายที่คุณเคยอ่าน</div>
          </div>
          <div className="history-page__count">ทั้งหมด {books.length} เรื่อง</div>
        </div>
      </div>

      <div className="history-page__container">
        <div className="history-page__filters">
          {statusOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`history-page__filter-button ${filter === option.key ? "active" : ""}`}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
              {option.key !== "all" && ` · ${statusCounts[option.key]}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="history-page__loading">กำลังโหลดประวัติการอ่าน...</div>
        ) : filteredBooks.length === 0 ? (
          <div className="history-page__empty">
            <div className="history-page__empty-emoji">📚</div>
            <div className="history-page__empty-title">ยังไม่มีประวัติการอ่าน</div>
            <div>นิยายที่คุณอ่านจะถูกบันทึกไว้ที่นี่</div>
          </div>
        ) : (
          <div className="history-page__grid">
            {filteredBooks.map((book) => {
              const status = STATUS_MAP[book.reading_status] || STATUS_MAP.reading;
              const percent = book.totalRoutes ? Math.round((book.routeFound / book.totalRoutes) * 100) : 0;
             const chapterLabel = book.lastReadChapterTitle
  ? `ตอนที่ ${book.lastReadChapterNumber || "?"} : ${book.lastReadChapterTitle}`
  : book.lastReadChapterNumber
  ? `ตอนที่ ${book.lastReadChapterNumber}`
  : "ยังไม่มีตอน"; // เปลี่ยนจากคำว่า "เนื้อเรื่องหลัก" เผื่อเป็นเคสไม่มีข้อมูลจริง ๆ
  
// 🎯 ปรับให้เช็กชัดเจนว่าถ้าไม่มีเลขฉากจริง ๆ (หรือเป็น 0) ให้ขึ้นเครื่องหมาย ? หรือบอกว่าไม่มีฉาก
const scNum = (book.lastReadSceneNumber && book.lastReadSceneNumber !== 0) ? book.lastReadSceneNumber : null;

const sceneTitle = book.lastReadSceneName || book.lastReadSceneTitle;
const finalSceneTitle = (sceneTitle && !sceneTitle.includes("ตอนที่")) ? sceneTitle : null;

let sceneLabel = "ยังไม่มีฉาก";
if (scNum) {
  sceneLabel = finalSceneTitle ? `ฉากที่ ${scNum} : ${finalSceneTitle}` : `ฉากที่ ${scNum}`;
} else if (finalSceneTitle) {
  sceneLabel = finalSceneTitle;
}
              return (
                <div key={book.id || `${book.title}-${book.author}`} className="history-card">
                  <div className="history-card__cover">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} />
                    ) : (
                      <div className="history-card__cover-placeholder">
                        {String(book.title || "-").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="history-card__main">
                    <div className="history-card__header">
                      <div className="history-card__heading">
                        <div className="history-card__title">{book.title}</div>
                        <div className="history-card__author">{book.author}</div>
                      </div>
                      <span className={`history-card__status history-card__status--${book.reading_status}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="history-card__categories">
                      {book.categories.slice(0, 2).map((category, index) => (
                        <span key={`${category}-${index}`} className="history-card__tag">
                          {category}
                        </span>
                      ))}
                    </div>

                    <div className="history-card__info">
                      <div className="history-card__info-item">
                        <div className="history-card__info-label">ตอนล่าสุด</div>
                        <div>{chapterLabel}</div>
                      </div>
                      <div className="history-card__info-item">
                        <div className="history-card__info-label">ฉากล่าสุด</div>
                        <div>{sceneLabel}</div>
                      </div>

                      {book.lastChoiceText ? (
                        <div className="history-card__info-item history-card__info-item--full">
                          <div className="history-card__info-label">
                            {book.isTimeTraveling ? "สถานะการอ่าน" : "ทางเลือกก่อนหน้า"}
                          </div>
                          <div
                            className="history-card__choice-text"
                            style={book.isTimeTraveling ? { color: "#E91E8C", fontStyle: "italic", fontWeight: 500, background: "#FFF0F5", padding: "6px 10px", borderRadius: "6px", display: "inline-block" } : {}}
                          >
                            {book.lastChoiceText}
                          </div>
                        </div>
                      ) : null}

                      <div className="history-card__info-item">
                        <div className="history-card__info-label">ตอนจบที่ค้นพบ</div>
                        <div>
                          {book.totalEndings > 0
                            ? `${book.endingCount}/${book.totalEndings}`
                            : book.reading_status === "finished"
                              ? `${book.endingCount}/${book.endingCount}`
                              : `${book.endingCount}/?`}
                        </div>
                      </div>
                      <div className="history-card__info-item">
                        <div className="history-card__info-label">อ่านล่าสุด</div>
                        <div>{formatRelative(book.lastReadAt)}</div>
                      </div>
                    </div>

                    <div className="history-card__progress">
                      <div className="history-card__progress-meta">
                        <span>ความคืบหน้า</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="history-card__progress-bar">
                        <div className="history-card__progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="history-card__continue-btn"
                      onClick={() => {
                        const targetScene = book.currentSceneId;

                        // 🎯 ปรับปรุงความปลอดภัย: บังคับเปลี่ยนผ่าน URL ของระบบ Router ของเว็บโดยตรงคู่ขนานไปด้วย
                        // เพื่อให้ React Router ประมวลผลดึง useParams() ส่งไปให้ ReadingPage ทันที 
                        if (targetScene && targetScene !== 0) {
                          navigate(`/reading/${book.id}/${targetScene}`);
                        } else {
                          navigate(`/reading/${book.id}`);
                        }
                      }}
                    >
                      อ่านต่อ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
