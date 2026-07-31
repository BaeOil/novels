import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import GenreTag from "../../../components/GenreTag/GenreTag";
import ActionButtons from "../../../components/ActionButtons/ActionButtons";
import "./BookshelfPage.css";
import {
    ArrowLeft,
    Eye,
    Heart,
    BookmarkPlus,
    Trash2,
    BookOpen,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const FILTER_OPTIONS = [
    { value: "all", label: "ทั้งหมด" },
    { value: "want_to_read", label: "ยังไม่อ่าน" },
    { value: "reading", label: "กำลังอ่าน" },
    { value: "finished", label: "อ่านจบแล้ว" },
];

const formatMinioUrl = (url) => {
    if (!url) return "https://via.placeholder.com/320x420";
    return url.replace("http://minio:9000", "http://localhost:9000");
};

const getBookshelfApiUrl = (userId) => {
    const base = `${API_BASE_URL}/bookshelves`;
    return userId ? `${base}?user_id=${userId}` : base;
};

const normalizeCategoryName = (cat) => {
    if (!cat) return "";
    if (typeof cat === "string") return cat.trim();
    if (typeof cat === "number") return String(cat);
    return String(cat.name || cat.Name || cat.title || cat.label || cat.label_th || "").trim();
};

const stripHtml = (html = "") => {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").trim();
};

const getBookId = (item = {}) => {
    return item.novel_id || item.id || item._id || item.novel?.id || 0;
};

const formatRelative = (iso) => {
    if (!iso) return "ยังไม่เคยอ่าน";

    const timestamp = Date.parse(iso);
    if (Number.isNaN(timestamp)) return "ยังไม่เคยอ่าน";

    const diff = (Date.now() - timestamp) / 1000;
    if (diff < 60) return "เมื่อสักครู่";
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.max(1, Math.floor(diff / 3600))} ชั่วโมงที่แล้ว`;
    if (diff < 604800) return `${Math.max(1, Math.floor(diff / 86400))} วันที่แล้ว`;

    return new Date(timestamp).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

// นิยายจะถือว่า "จบ" ก็ต่อเมื่อตัวนิยายเองถูกทำเครื่องหมายว่าจบแล้วโดยผู้เขียน/ระบบ
// เช่น "completed" / "finished" / "จบแล้ว" เท่านั้น การอ่านถึงฉากล่าสุดที่มีอยู่
// ไม่ได้แปลว่านิยายจบ (นิยายอาจจะยังเขียนไม่จบ หรือฉากล่าสุดไม่ใช่ฉากจบเรื่องจริงๆ)
const NOVEL_COMPLETED_VALUES = new Set(["completed", "complete", "finished", "end", "จบแล้ว"]);

const isNovelCompleted = (novelStatus) =>
    NOVEL_COMPLETED_VALUES.has(String(novelStatus || "").trim().toLowerCase());

/**
 * สถานะการอ่านของ "ผู้ใช้" ต้องแยกออกจากสถานะของ "นิยาย" ให้ชัดเจน:
 *  - explicitStatus: สถานะการอ่านของผู้ใช้ที่ backend ส่งมาตรงๆ (ถ้ามี ให้เชื่อค่านี้เป็นหลัก)
 *  - novelStatus: สถานะของตัวนิยายเอง (จบแล้ว/ยังเขียนอยู่) — ใช้ตัดสินร่วมกับ reachedEnding เท่านั้น
 *  - reachedEnding: ผู้ใช้อ่านไปถึง "ฉากจบ" ของเส้นทางใดเส้นทางหนึ่งจริงๆ หรือไม่
 *    (ไม่ใช่แค่ "มีฉากล่าสุดที่ยังไม่ได้อ่านต่อ" หรือ "นิยายมี ending อยู่บ้าง")
 *
 * ถ้า backend ยังไม่มี field บอก reachedEnding ตรงๆ ให้ทีม backend เพิ่ม field นี้มาด้วย
 * (เช่น is_ending บน scene ปัจจุบัน) ไม่ควรเดาจาก ending_count ของทั้งเรื่อง เพราะนั่นคือ
 * จำนวน ending ทั้งหมดที่นิยายมี ไม่ใช่ว่าผู้ใช้คนนี้อ่านถึงหรือยัง
 */
const normalizeReadingStatus = ({ explicitStatus, novelStatus, reachedEnding, currentSceneId }) => {
    const raw = String(explicitStatus || "").trim().toLowerCase();
    if (raw === "want_to_read" || raw === "reading" || raw === "finished") {
        return raw;
    }

    if (isNovelCompleted(novelStatus) && reachedEnding) {
        return "finished";
    }

    if (currentSceneId > 0) return "reading";
    return "want_to_read";
};

const normalizeBook = (item) => {
    // สถานะของ "ตัวนิยาย" เอง (จบแล้ว/ยังเขียนอยู่) แยกจากสถานะการอ่านของผู้ใช้
    const novelStatus = item.novel_status || item.novel?.status || item.novel_completion_status;

    // ผู้ใช้อ่านไปถึงฉากจบจริงๆ หรือไม่ (ต้องเป็นสัญญาณเฉพาะผู้ใช้ ไม่ใช่สถิติรวมของนิยาย)
    const reachedEnding = Boolean(
        item.reached_ending ??
        item.is_ending ??
        item.ending_reached ??
        item.current_scene?.is_ending ??
        item.currentScene?.isEnding ??
        false
    );

    const currentSceneId =
        item.current_scene_id ??
        item.currentSceneId ??
        item.novel?.current_scene_id ??
        item.novel?.CurrentSceneID ??
        0;

    return {
        id: getBookId(item),

        title:
            item.title ||
            item.novel?.title ||
            "ไม่มีชื่อเรื่อง",

        author:
            item.pen_name ||
            item.penName ||
            item.author_pen_name ||
            item.author_penName ||
            item.author_name ||
            item.authorName ||
            item.author?.name ||
            item.novel?.pen_name ||
            item.novel?.author_name ||
            "ไม่ทราบผู้แต่ง",

        // คำโปรยของนิยาย — backend ส่งมาเป็น "captions" (เผื่อ endpoint อื่นใช้ชื่ออื่น จึงเก็บ fallback เดิมไว้ด้วย)
        description: stripHtml(
            item.captions ||
            item.novel?.captions ||
            item.description ||
            item.synopsis ||
            item.blurb ||
            item.novel?.description ||
            item.novel?.synopsis ||
            ""
        ),

        categories: (() => {
            const cats =
                item.categories ??
                item.Categories ??
                item.CategoryIDs ??
                item.category_ids ??
                [];

            if (!Array.isArray(cats) || cats.length === 0) return ["ทั่วไป"];

            return cats.map(normalizeCategoryName).filter(Boolean);
        })(),

        coverImage: formatMinioUrl(
            item.cover_image ||
            item.coverImage ||
            item.novel?.cover_image
        ),

        reading_status: normalizeReadingStatus({
            explicitStatus: item.reading_status || item.status,
            novelStatus,
            reachedEnding,
            currentSceneId,
        }),

        latestChapter:
            item.latest_chapter ||
            item.latestChapter ||
            item.last_chapter ||
            item.chapter_title ||
            "ยังไม่มีตอน",

        lastReadAt:
            item.last_read_at ||
            item.lastReadAt ||
            item.updated_at ||
            item.updatedAt ||
            item.created_at ||
            item.createdAt ||
            null,

        lastReadSceneTitle:
            item.last_read_scene_title ||
            item.lastReadSceneTitle ||
            "ยังไม่มีประวัติการอ่าน",

        startSceneId:
            item.start_scene_id ||
            item.startSceneId ||
            item.first_scene_id ||
            item.firstSceneId ||
            0,

        currentSceneId,

        // ---------- Statistics ----------

        // จำนวนครั้งที่นิยายเรื่องนี้ถูกเพิ่มเข้าชั้นหนังสือ (ของนิยาย ไม่ใช่ของผู้ใช้คนเดียว)
        bookshelfCount:
            item.bookshelf_count ||
            item.bookshelfCount ||
            item.shelf_count ||
            item.saved_count ||
            item.added_count ||
            0,

        visitedCount:
            item.visited_count ||
            item.VisitedCount ||
            0,

        endingCount:
            item.ending_count ||
            item.endingCount ||
            0,

        totalScenes:
            item.total_scenes ||
            item.totalScenes ||
            item.scene_count ||
            0,

        views:
            item.views ||
            item.view_count ||
            0,

        likes:
            item.like_count ||
            item.likeCount ||
            item.likes ||
            0,
    };
};

const statusLabels = {
    all: "ทั้งหมด",
    want_to_read: "ยังไม่อ่าน",
    reading: "กำลังอ่าน",
    finished: "อ่านจบแล้ว",
};

const BookshelfPage = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState("all");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    const getCurrentUserId = () => {
        const userJson = localStorage.getItem("user");
        if (!userJson) return 0;
        try {
            const user = JSON.parse(userJson);
            return user?.id || user?.user_id || 0;
        } catch {
            return 0;
        }
    };

    useEffect(() => {
        let active = true;

        const loadBookshelf = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const userId = getCurrentUserId();
                const headers = { "Content-Type": "application/json" };
                if (token) headers.Authorization = `Bearer ${token}`;

                const [shelfResult, historyResult] = await Promise.allSettled([
                    axios.get(getBookshelfApiUrl(userId), { headers }),
                    axios.get(`${API_BASE_URL}/history`, { headers }),
                ]);

                const shelfPayload = shelfResult.status === "fulfilled"
                    ? (
                        shelfResult.value?.data?.data?.bookshelf ||
                        shelfResult.value?.data?.bookshelf ||
                        shelfResult.value?.data?.novels ||
                        shelfResult.value?.data ||
                        []
                    )
                    : [];

                const historyPayload = historyResult.status === "fulfilled"
                    ? (
                        historyResult.value?.data?.data?.history ||
                        historyResult.value?.data?.history ||
                        historyResult.value?.data?.novels ||
                        historyResult.value?.data ||
                        []
                    )
                    : [];

                const bookList = Array.isArray(shelfPayload) ? shelfPayload : [];
                const historyList = Array.isArray(historyPayload) ? historyPayload : [];
                const normalizedHistory = historyList.map(normalizeBook);
                const historyIndex = new Map(normalizedHistory.map((book) => [String(book.id), book]));

                const mergedBooks = bookList.map((item) => {
                    const baseBook = normalizeBook(item);
                    const historyBook = historyIndex.get(String(baseBook.id));

                    if (!historyBook) return baseBook;

                    // history endpoint สะท้อนความคืบหน้าการอ่านล่าสุดได้แม่นกว่า bookshelf endpoint
                    // จึงให้ค่าจาก historyBook ชนะสำหรับ field ที่เกี่ยวกับ "ความคืบหน้า"
                    // ส่วน field ที่เป็นข้อมูลของตัวนิยาย/สถิติ ให้ยึดจาก baseBook เป็นหลัก
                    // แล้วค่อย fallback ไป historyBook ถ้า baseBook ไม่มีค่า
                    return {
                        ...baseBook,
                        title: baseBook.title || historyBook.title,
                        author: baseBook.author || historyBook.author,
                        description: baseBook.description || historyBook.description || "",
                        coverImage: baseBook.coverImage || historyBook.coverImage,
                        reading_status: historyBook.reading_status || baseBook.reading_status,
                        currentSceneId: historyBook.currentSceneId || baseBook.currentSceneId || 0,
                        lastReadAt: historyBook.lastReadAt || baseBook.lastReadAt || null,
                        lastReadSceneTitle: historyBook.lastReadSceneTitle || baseBook.lastReadSceneTitle || "ยังไม่มีประวัติการอ่าน",
                        bookshelfCount: baseBook.bookshelfCount || historyBook.bookshelfCount || 0,
                        endingCount: baseBook.endingCount || historyBook.endingCount || 0,
                        totalScenes: baseBook.totalScenes || historyBook.totalScenes || 0,
                        views: baseBook.views || historyBook.views || 0,
                        likes: baseBook.likes || historyBook.likes || 0,
                    };
                });

                if (active) {
                    setBooks(mergedBooks);
                }
            } catch (err) {
                console.error("Bookshelf API error:", err);
                if (active) {
                    setBooks([]);
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadBookshelf();
        return () => {
            active = false;
        };
    }, []);

    const filteredBooks = useMemo(() => {
        if (filter === "all") return books;
        return books.filter((book) => book.reading_status === filter);
    }, [books, filter]);

    const statusCounts = useMemo(() => {
        const counts = { all: books.length, want_to_read: 0, reading: 0, finished: 0 };
        books.forEach((book) => {
            counts[book.reading_status] = (counts[book.reading_status] ?? 0) + 1;
        });
        return counts;
    }, [books]);

    const handleRemoveBook = async (bookId, title) => {
        if (window.confirm(`คุณต้องการนำ "${title}" ออกจากชั้นหนังสือใช่หรือไม่?`)) {
            try {
                const token = localStorage.getItem("token");
                const headers = { "Content-Type": "application/json" };
                if (token) headers.Authorization = `Bearer ${token}`;

                await axios.delete(`${API_BASE_URL}/bookshelves`, {
                    headers,
                    data: { novel_id: bookId },
                });

                setBooks((prev) => prev.filter((b) => b.id !== bookId));
            } catch (err) {
                console.error("Remove from bookshelf error:", err);
                alert("ไม่สามารถลบนิยายออกจากชั้นหนังสือได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
            }
        }
    };

    return (
        <div className="bookshelf-page">
            <div className="bookshelf-page__sticky-header">
                <div className="bookshelf-page__top">
                    <div className="bookshelf-page__heading">
                        <button className="bookshelf-page__back-btn" onClick={() => navigate(-1)} aria-label="ย้อนกลับ">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="bookshelf-page__labels">
                            <p className="bookshelf-page__eyebrow">ชั้นหนังสือของฉัน</p>
                            <h1 className="bookshelf-page__title">นิยายที่บันทึกไว้</h1>
                        </div>
                    </div>

                    <div className="bookshelf-page__count">ทั้งหมด {books.length} เรื่อง</div>
                </div>
            </div>

            <div className="bookshelf-page__container">
                <div className="bookshelf-page__filters" role="tablist" aria-label="กรองสถานะการอ่าน">
                    {FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="tab"
                            aria-selected={filter === option.value}
                            className={`bookshelf-page__filter-button${filter === option.value ? " active" : ""}`}
                            onClick={() => setFilter(option.value)}
                        >
                            {option.label}
                            {option.value !== "all" && ` · ${statusCounts[option.value] ?? 0}`}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="bookshelf-page__grid" aria-hidden="true">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div key={index} className="bookshelf-skeleton-card">
                                <div className="bookshelf-skeleton-card__cover" />
                                <div className="bookshelf-skeleton-card__body">
                                    <div className="bookshelf-skeleton-card__line bookshelf-skeleton-card__line--title" />
                                    <div className="bookshelf-skeleton-card__line bookshelf-skeleton-card__line--author" />
                                    <div className="bookshelf-skeleton-card__line bookshelf-skeleton-card__line--stats" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {filteredBooks.length === 0 ? (
                            <div className="bookshelf-page__empty">
                                <BookOpen size={28} strokeWidth={1.5} />
                                <p>ยังไม่มีนิยายในสถานะนี้ ลองเลือกสถานะอื่น หรือเพิ่มนิยายเข้าชั้นหนังสือของคุณ</p>
                            </div>
                        ) : (
                            <div className="bookshelf-page__grid">
                                {filteredBooks.map((book) => {
                                    const isFinished = book.reading_status === 'finished';
                                    const isReading = book.reading_status === 'reading';
                                    const isWantToRead = book.reading_status === 'want_to_read';

                                    const handleRead = () => {
                                        if (isWantToRead) {
                                            if (book.startSceneId) {
                                                navigate(`/reading/${book.id}/${book.startSceneId}`);
                                                return;
                                            }

                                            window.alert("นิยายเรื่องนี้ยังไม่มีฉากเริ่มต้นให้เปิดอ่านได้ในตอนนี้");
                                            navigate(`/novel/${book.id}`);
                                            return;
                                        }

                                        if (isReading) {
                                            if (book.currentSceneId) {
                                                navigate(`/reading/${book.id}/${book.currentSceneId}`);
                                                return;
                                            }
                                            navigate(`/reading/${book.id}`);
                                            return;
                                        }

                                        if (isFinished) {
                                            if (book.startSceneId) {
                                                navigate(`/reading/${book.id}/${book.startSceneId}`);
                                                return;
                                            }
                                            navigate(`/novel/${book.id}`);
                                        }
                                    };

                                    return (
                                        <article
                                            key={book.id}
                                            className="bookshelf-card"
                                            onClick={() => navigate(`/novel/${book.id}`)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") navigate(`/novel/${book.id}`);
                                            }}
                                            tabIndex={0}
                                            role="button"
                                        >
                                            <div className="bookshelf-card__cover">
                                                <img src={book.coverImage} alt={`${book.title} ปกนิยาย`} />
                                                <span className={`bookshelf-card__status bookshelf-card__status--${filter !== "all" ? filter : book.reading_status}`}>
                                                    {filter !== "all" ? statusLabels[filter] : statusLabels[book.reading_status] || "ไม่ระบุสถานะ"}
                                                </span>
                                                <button
                                                    className="bookshelf-card__remove-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveBook(book.id, book.title);
                                                    }}
                                                    title="นำออกจากชั้นหนังสือ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="bookshelf-card__body">
                                                <h2 className="bookshelf-card__title">{book.title}</h2>

                                                {book.description && (
                                                    <p className="bookshelf-card__description">{book.description}</p>
                                                )}

                                                <p className="bookshelf-card__author">✍️ {book.author}</p>

                                                {!isWantToRead && (
                                                    <div className="bookshelf-card__latest-read">
                                                        <span>อ่านล่าสุด</span>
                                                        <span>{book.lastReadAt ? formatRelative(book.lastReadAt) : "ยังไม่มีประวัติการอ่าน"}</span>
                                                    </div>
                                                )}

                                                <div className="bookshelf-card__categories">
                                                    {book.categories.slice(0, 2).map((category) => (
                                                        <GenreTag
                                                            key={`${book.id}-${category}`}
                                                            label={category}
                                                            variant="primary"
                                                        />
                                                    ))}
                                                    {book.categories.length > 2 && (
                                                        <span className="bookshelf-card__extra-categories">
                                                            +{book.categories.length - 2}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="bookshelf-card__stats">
                                                    <div className="bookshelf-card__stat">
                                                        <BookmarkPlus size={17} color="#F526A2" />
                                                        <span>{book.bookshelfCount}</span>
                                                    </div>
                                                    <div className="bookshelf-card__stat">
                                                        <Eye size={17} color="#F526A2" />
                                                        <span>{book.views}</span>
                                                    </div>
                                                    <div className="bookshelf-card__stat">
                                                        <Heart size={17} color="#F526A2" />
                                                        <span>{book.likes}</span>
                                                    </div>
                                                </div>

                                                {(isWantToRead || isReading || isFinished) && (
                                                    <button
                                                        type="button"
                                                        className={`bookshelf-card__read-btn bookshelf-card__read-btn--${isReading ? 'continue' : isFinished ? 'reread' : 'start'}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRead();
                                                        }}
                                                    >
                                                        {isReading ? "📖 อ่านต่อ" : isFinished ? "↺ อ่านอีกครั้ง" : "▶ อ่านเลย"}
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                    </>
                )}
            </div>
        </div>
    );
};

export default BookshelfPage;