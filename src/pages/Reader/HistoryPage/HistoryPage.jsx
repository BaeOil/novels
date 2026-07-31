import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import "./HistoryPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const STATUS_MAP = {
  reading: { label: "กำลังอ่าน" },
  finished: { label: "อ่านจบแล้ว" },
};

const normalizeCategoryName = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return String(value.name || value.title || value.label || value.label_th || "").trim();
};

const formatRelative = (iso) => {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return "ไม่ทราบเวลา";

  const diff = (Date.now() - timestamp) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.max(1, Math.floor(diff / 3600))} ชั่วโมงที่แล้ว`;
  if (diff < 604800) return `${Math.max(1, Math.floor(diff / 86400))} วันที่แล้ว`;
  return new Date(timestamp).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

// สร้าง label "ตอนล่าสุด" / "ฉากล่าสุด" ที่พร้อมแสดงผล จากข้อมูลดิบของ book
const getProgressLabels = (book) => {
  const chapterLabel = book.lastReadChapterTitle
    ? `ตอนที่ ${book.lastReadChapterNumber || "?"} : ${book.lastReadChapterTitle}`
    : book.lastReadChapterNumber
    ? `ตอนที่ ${book.lastReadChapterNumber}`
    : "ยังไม่มีตอน";

  const sceneNumber = book.lastReadSceneNumber && book.lastReadSceneNumber !== 0 ? book.lastReadSceneNumber : null;
  // กันเคสข้อมูลชื่อฉากหลุดมาเป็นชื่อตอน (มีคำว่า "ตอนที่" ปน) ไม่ให้เอามาโชว์ซ้ำ
  const sceneTitle = book.lastReadSceneName && !book.lastReadSceneName.includes("ตอนที่") ? book.lastReadSceneName : null;

  let sceneLabel = "ยังไม่มีฉาก";
  if (sceneNumber) {
    sceneLabel = sceneTitle ? `ฉากที่ ${sceneNumber} : ${sceneTitle}` : `ฉากที่ ${sceneNumber}`;
  } else if (sceneTitle) {
    sceneLabel = sceneTitle;
  }

  return { chapterLabel, sceneLabel };
};

// นิยายจะถือว่า "จบ" ก็ต่อเมื่อตัวนิยายเองถูกทำเครื่องหมายว่าจบแล้วเท่านั้น
// การอ่านไปถึงฉากล่าสุดที่มีอยู่ตอนนี้ไม่ได้แปลว่านิยายจบ (นิยายอาจยังเขียนไม่จบ)
const NOVEL_COMPLETED_VALUES = new Set(["completed", "complete", "finished", "end", "จบแล้ว"]);

const isNovelCompleted = (novelStatus) =>
  NOVEL_COMPLETED_VALUES.has(String(novelStatus || "").trim().toLowerCase());

/**
 * "จบแล้ว" ต้องเป็นจริงทั้ง 2 อย่าง: นิยายเรื่องนี้ถูกมาร์คว่าจบแล้วจริง (novelStatus)
 * และผู้ใช้อ่านไปถึงฉากจบจริงๆ (reachedEnding) — ไม่ใช่แค่ "อ่านมาถึงฉากล่าสุดที่มีอยู่"
 * จึงไม่เชื่อค่า "finished" ที่ backend ส่งมาตรงๆ แบบไม่มีเงื่อนไข ต้อง cross-check เสมอ
 */
const resolveReadingStatus = ({ explicitStatus, novelStatus, reachedEnding }) => {
  const raw = String(explicitStatus || "").trim().toLowerCase();
  if (raw === "reading") return "reading";

  if (isNovelCompleted(novelStatus) && reachedEnding) return "finished";
  return "reading";
};

const normalizeBook = (item) => {
  const currentSceneId = item.current_scene_id || item.scene_id || item.last_read_scene_id || 0;
  const lastReadSceneId = item.last_read_scene_id || 0;
  const isTimeTraveling =
    lastReadSceneId !== 0 && currentSceneId !== 0 && String(lastReadSceneId) !== String(currentSceneId);

  const currChapNum = item.current_chapter_number || item.chapter_number || item.chapter_order;
  const currChapTitle = item.current_chapter_title || item.chapter_title;
  const currScNum = item.current_scene_number || item.scene_number || item.order;
  const currScTitle = item.current_scene_name || item.current_scene_title || item.scene_name;

  const maxChapNum = item.last_read_chapter_number;
  const maxChapTitle = item.last_read_chapter_title;
  const maxScNum = item.last_read_scene_number;
  const maxScTitle = item.last_read_scene_name || item.last_read_scene_title;

  // สถานะของ "ตัวนิยาย" เอง (จบแล้ว/ยังเขียนอยู่) แยกจากความคืบหน้าการอ่านของผู้ใช้
  const novelStatus = item.novel_status || item.novel?.status || item.novel_completion_status;

  // ผู้ใช้อ่านไปถึงฉากจบจริงๆ หรือไม่ ต้องเป็นสัญญาณเฉพาะจุด ไม่ใช่แค่ "มีฉากล่าสุดอยู่"
  const reachedEnding = Boolean(
    item.reached_ending ??
    item.is_ending ??
    item.ending_reached ??
    item.current_scene?.is_ending ??
    item.currentScene?.isEnding ??
    false
  );

  return {
    id: item.novel_id || item.id,
    title: item.title || "ไม่ระบุชื่อเรื่อง",
    author:
      item.pen_name ||
      item.penName ||
      item.author_pen_name ||
      item.author_penName ||
      item.author_name ||
      item.authorName ||
      item.name_lastname ||
      item.name ||
      item.username ||
      "ไม่ทราบผู้แต่ง",
    categories: Array.isArray(item.categories) && item.categories.length > 0
      ? item.categories.map(normalizeCategoryName).filter(Boolean)
      : ["ทั่วไป"],
    // ไม่มี fallback รูปจากเว็บนอก — ถ้า backend ไม่ส่ง cover มาก็ให้การ์ดไปโชว์ placeholder ของตัวเอง
    coverImage: item.cover_image || null,
    reading_status: resolveReadingStatus({
      explicitStatus: item.reading_status,
      novelStatus,
      reachedEnding,
    }),
    routeFound: item.visited_count || 0,
    totalRoutes: item.total_scenes || item.scene_count || 0,
    endingCount: item.ending_count || 0,
    totalEndings: item.total_endings || 0,
    lastReadAt: item.last_read_at && !item.last_read_at.startsWith("0001") ? item.last_read_at : null,

    // ดึงค่าปัจจุบันมาก่อน ถ้าไม่มีจะไป fetch เพิ่มใน loadHistory (กรณีย้อนไทม์ไลน์)
    lastReadChapterNumber: isTimeTraveling ? currChapNum : currChapNum || maxChapNum,
    lastReadChapterTitle: isTimeTraveling ? currChapTitle : currChapTitle || maxChapTitle,
    lastReadSceneNumber: isTimeTraveling ? currScNum : currScNum || maxScNum,
    lastReadSceneName: isTimeTraveling ? currScTitle : currScTitle || maxScTitle,

    lastChoiceText: isTimeTraveling ? "กำลังย้อนกลับมาอ่านฉากนี้" : item.last_choice_text || null,
    currentSceneId,
    isTimeTraveling,
  };
};

const HistoryCard = ({ book, onContinue }) => {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_MAP[book.reading_status] || STATUS_MAP.reading;
  const percent = book.totalRoutes ? Math.round((book.routeFound / book.totalRoutes) * 100) : 0;
  const { chapterLabel, sceneLabel } = getProgressLabels(book);

  const endingsLabel =
    book.totalEndings > 0
      ? `${book.endingCount}/${book.totalEndings}`
      : book.reading_status === "finished"
      ? `${book.endingCount}/${book.endingCount}`
      : `${book.endingCount}/?`;

  return (
    <div className="history-card">
      <div className="history-card__cover">
        {book.coverImage ? (
          <img src={book.coverImage} alt={book.title} />
        ) : (
          <div className="history-card__cover-placeholder">
            {String(book.title || "-").slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className={`history-card__status history-card__status--${book.reading_status}`}>
          {status.label}
        </span>
      </div>

      <div className="history-card__main">
        <div className="history-card__heading">
          <div className="history-card__title">{book.title}</div>
          <div className="history-card__author">{book.author}</div>
        </div>

        <div className="history-card__categories">
          {book.categories.slice(0, 2).map((category, index) => (
            <span key={`${category}-${index}`} className="history-card__tag">
              {category}
            </span>
          ))}
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

        <div className="history-card__footer-row">
          <span className="history-card__last-read">
            อ่านล่าสุด {book.lastReadAt ? formatRelative(book.lastReadAt) : "ยังไม่เคยอ่าน"}
          </span>
          <button
            type="button"
            className="history-card__toggle"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียดเพิ่มเติม"}
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {expanded && (
          <div className="history-card__info">
            <div className="history-card__info-item">
              <div className="history-card__info-label">ตอนล่าสุด</div>
              <div>{chapterLabel}</div>
            </div>
            <div className="history-card__info-item">
              <div className="history-card__info-label">ฉากล่าสุด</div>
              <div>{sceneLabel}</div>
            </div>

            {book.lastChoiceText && (
              <div className="history-card__info-item history-card__info-item--full">
                <div className="history-card__info-label">
                  {book.isTimeTraveling ? "สถานะการอ่าน" : "ทางเลือกก่อนหน้า"}
                </div>
                <div
                  className={`history-card__choice-text${book.isTimeTraveling ? " history-card__choice-text--time-travel" : ""}`}
                >
                  {book.lastChoiceText}
                </div>
              </div>
            )}

            <div className="history-card__info-item">
              <div className="history-card__info-label">ตอนจบที่ค้นพบ</div>
              <div>{endingsLabel}</div>
            </div>
          </div>
        )}

        <button type="button" className="history-card__continue-btn" onClick={() => onContinue(book)}>
          อ่านต่อ
        </button>
      </div>
    </div>
  );
};

const HistoryPage = () => {
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

        const historyRes = await axios.get(`${API_BASE_URL}/history`, { headers });
        const historyPayload =
          historyRes.data?.data?.history || historyRes.data?.history || historyRes.data?.novels || historyRes.data || [];
        let bookList = Array.isArray(historyPayload) ? historyPayload : [];

        // นิยายที่ไม่มีฉากเลย หรือไม่เคยถูกอ่านจริงๆ ไม่ควรโผล่ในหน้าประวัติ
        bookList = bookList.filter((item) => {
          const totalScenes = item.total_scenes || item.scene_count || 0;
          const hasSceneId = item.current_scene_id || item.scene_id || item.last_read_scene_id;
          return !(totalScenes === 0 && !hasSceneId);
        });

        const initialBooks = bookList.map(normalizeBook);

        // ถ้าเป็นเคสย้อนไทม์ไลน์ (currentScene ต่างจาก lastReadScene) ต้อง fetch ฉากปัจจุบันเพิ่ม
        // เพื่อเอาเลขตอน/ฉากที่ถูกต้องของจุดที่ผู้ใช้กำลังยืนอยู่จริงๆ มาแสดง
        const populatedBooks = await Promise.all(
          initialBooks.map(async (book) => {
            if (!book.isTimeTraveling || book.currentSceneId === 0) return book;

            try {
              const sceneRes = await axios.get(`${API_BASE_URL}/scenes/${book.currentSceneId}`);
              const sceneData = sceneRes.data?.data || sceneRes.data;
              if (!sceneData) return book;

              return {
                ...book,
                lastReadChapterNumber: sceneData.chapter_order || sceneData.chapter_episode || sceneData.chapter_number || book.lastReadChapterNumber,
                lastReadChapterTitle: sceneData.chapter_title || sceneData.ChapterTitle || sceneData.chapter_name || book.lastReadChapterTitle,
                lastReadSceneNumber: sceneData.order || sceneData.scene_number || sceneData.scene_order || book.lastReadSceneNumber,
                lastReadSceneName: sceneData.scene_title || sceneData.scene_name || sceneData.title || sceneData.name || book.lastReadSceneName,
              };
            } catch (err) {
              console.warn("ไม่สามารถดึงข้อมูลฉากย้อนหลังได้:", err);
              return book;
            }
          })
        );

        if (active) setBooks(populatedBooks);
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

  const statusCounts = useMemo(
    () => ({
      reading: books.filter((book) => book.reading_status === "reading").length,
      finished: books.filter((book) => book.reading_status === "finished").length,
    }),
    [books]
  );

  const statusOptions = [
    { key: "all", label: "ทั้งหมด" },
    { key: "reading", label: "กำลังอ่าน" },
    { key: "finished", label: "อ่านจบ" },
  ];

  const handleContinue = (book) => {
    const targetScene = book.currentSceneId;
    if (targetScene && targetScene !== 0) {
      navigate(`/reading/${book.id}/${targetScene}`);
    } else {
      navigate(`/reading/${book.id}`);
    }
  };

  return (
    <div className="history-page">
      <div className="history-page__sticky-header">
        <div className="history-page__top">
          <div className="history-page__heading">
            <button className="history-page__back-btn" onClick={() => navigate(-1)} aria-label="ย้อนกลับ">
              <ArrowLeft size={18} />
            </button>
            <div className="history-page__labels">
              <div className="history-page__eyebrow">ประวัติการอ่านของฉัน</div>
              <div className="history-page__title">นิยายที่คุณเคยอ่าน</div>
            </div>
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
            {filteredBooks.map((book) => (
              <HistoryCard key={book.id || `${book.title}-${book.author}`} book={book} onContinue={handleContinue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;