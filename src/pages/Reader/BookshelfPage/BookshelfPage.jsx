import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import GenreTag from "../../../components/GenreTag/GenreTag";
import "./BookshelfPage.css";
import {
    Eye,
    Heart,
    GitBranch,
    Trash2,
    Clock
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

const normalizeReadingStatus = (statusValue, endingCount, currentSceneId) => {
    const rawStatus = String(statusValue || "").trim().toLowerCase();
    if (rawStatus === "want_to_read" || rawStatus === "reading" || rawStatus === "finished") {
        return rawStatus;
    }
    if (rawStatus === "unread" || rawStatus === "wanttoread") {
        return "want_to_read";
    }
    if (rawStatus === "in_progress" || rawStatus === "inprogress" || rawStatus === "reading") {
        return "reading";
    }
    if (rawStatus === "complete" || rawStatus === "completed" || rawStatus === "finished") {
        return "finished";
    }
    if (endingCount > 0) return "finished";
    if (currentSceneId > 0) return "reading";
    return "want_to_read";
};
const formatRelative = (iso) => {
    if (!iso) return "ยังไม่เคยอ่าน";
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.max(1, Math.floor(diff / 3600))} ชั่วโมงที่แล้ว`;
    if (diff < 604800) return `${Math.max(1, Math.floor(diff / 86400))} วันที่แล้ว`;
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

const normalizeBook = (item) => ({
    id:
        item.novel_id ||
        item.id ||
        item._id ||
        item.novel?.id,

    title:
        item.title ||
        item.novel?.title ||
        "ไม่มีชื่อเรื่อง",

    author:
        item.author_name ||
        item.pen_name ||
        item.author?.name ||
        item.novel?.author_name ||
        "ไม่ทราบผู้แต่ง",

    categories: (() => {
        const cats =
            item.categories ??
            item.Categories ??
            item.CategoryIDs ??
            item.category_ids ??
            [];

        if (!Array.isArray(cats) || cats.length === 0)
            return ["ทั่วไป"];

        return cats
            .map((cat) => {
                if (!cat) return null;
                if (typeof cat === "string") return cat;
                if (typeof cat === "number") return String(cat);
                return (
                    cat.name ||
                    cat.Name ||
                    cat.title ||
                    cat.label ||
                    cat.label_th
                );
            })
            .filter(Boolean);
    })(),

    coverImage: formatMinioUrl(
        item.cover_image ||
        item.coverImage ||
        item.novel?.cover_image
    ),

    reading_status: normalizeReadingStatus(
        item.reading_status || item.status || item.novel?.status,
        item.ending_count ?? item.endingCount ?? 0,
        item.current_scene_id ?? item.currentSceneId ?? item.novel?.current_scene_id ?? item.novel?.CurrentSceneID ?? 0
    ),

    latestChapter:
        item.latest_chapter ||
        item.latestChapter ||
        item.last_chapter ||
        item.chapter_title ||
        "ยังไม่มีตอน",

    lastReadSceneTitle:
        item.last_read_scene_title ||
        item.lastReadSceneTitle ||
        item.last_read_at ||
        "ยังไม่มีประวัติการอ่าน",

    lastReadAt:
        item.last_read_at ||
        item.lastReadAt ||
        item.updated_at ||
        item.updatedAt ||
        null,

    // ---------- Statistics ----------

    totalRoutes:
        item.paths_count ||
        item.total_paths ||
        item.totalRoutes ||
        item.route_count ||
        0,

    currentSceneId:
        item.current_scene_id ||
        item.currentSceneId ||
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
});

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

                const shelfRes = await axios.get(getBookshelfApiUrl(userId), { headers });
                const shelfPayload =
                    shelfRes.data?.data?.bookshelf ||
                    shelfRes.data?.bookshelf ||
                    shelfRes.data?.novels ||
                    shelfRes.data ||
                    [];
                const bookList = Array.isArray(shelfPayload) ? shelfPayload : [];

                if (bookList.length === 0) {
                    if (active) {
                        setBooks([]);
                    }
                    return;
                }

                if (active) {
                    setBooks(bookList.map(normalizeBook));
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

    const handleRemoveBook = async (bookId, title) => {
        if (window.confirm(`คุณต้องการนำ "${title}" ออกจากชั้นหนังสือใช่หรือไม่?`)) {
            try {
                const token = localStorage.getItem("token");
                const headers = { "Content-Type": "application/json" };
                if (token) headers.Authorization = `Bearer ${token}`;

                // ยิง API Method DELETE ไปที่ /bookshelves พร้อมส่ง novel_id ไปใน body หรือ params
                // (ปกติส่งผ่าน URL query หรือ body ขึ้นอยู่กับ handlers ของคุณ แต่ส่วนใหญ่ส่งเป็น params/body)
                await axios.delete(`${API_BASE_URL}/bookshelves`, {
                    headers,
                    data: { novel_id: bookId } // ส่ง novel_id ไปบอกหลังบ้านว่าจะลบเล่มไหน
                });

                // ลบเสร็จแล้ว ให้อัปเดต State หน้าจอทันทีเพื่อตัดรายชื่อการ์ดเล่มนั้นออก
                setBooks(prev => prev.filter(b => b.id !== bookId));
                
            } catch (err) {
                console.error("Remove from bookshelf error:", err);
                alert("ไม่สามารถลบนิยายออกจากชั้นหนังสือได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
            }
        }
    };

    return (
        <div className="bookshelf-page">
            <div className="bookshelf-page__container">
                <header className="bookshelf-page__header">
                    <div>
                        <p className="bookshelf-page__eyebrow">ชั้นหนังสือของฉัน</p>
                        <h1 className="bookshelf-page__title">นิยายที่บันทึกไว้</h1>
                    </div>

                    <div className="bookshelf-page__filter">
                        <label htmlFor="bookshelf-filter">กรองสถานะ</label>
                        <select
                            id="bookshelf-filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            {FILTER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {loading ? (
                    <div className="bookshelf-page__loading">กำลังโหลดชั้นหนังสือ...</div>
                ) : (
                    <>
                        <div className="bookshelf-page__summary">
                            <span>{filteredBooks.length} เรื่อง</span>
                            {filter !== "all" && (
                                <span className="bookshelf-page__summary-tag">
                                    {statusLabels[filter]}
                                </span>
                            )}
                        </div>

                        {filteredBooks.length === 0 ? (
                            <div className="bookshelf-page__empty">
                                ไม่มีนิยายในสถานะนี้ ขยับไปลองสถานะอื่นได้
                            </div>
                        ) : (
                            <div className="bookshelf-page__grid">
                                {filteredBooks.map((book) => {
                                    const percent = book.totalRoutes ? Math.round((book.visitedCount / book.totalRoutes) * 100) : 0;
                                    const isFinished = book.reading_status === 'finished';
                                    const displayPercent = isFinished ? 100 : percent;

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
                                                <div className="bookshelf-card__tags--small">
                                                    {book.categories.slice(0, 2).map((category) => (
                                                        <GenreTag
                                                            key={`${book.id}-${category}`}
                                                            label={category}
                                                            variant="primary"
                                                        />
                                                    ))}
                                                </div>

                                                <h2 className="bookshelf-card__title">{book.title}</h2>
                                                <p className="bookshelf-card__author">{book.author}</p>
                                                
                                                <div className="bookshelf-card__latest-read">
                                                    <Clock size={14} color="#64748b" />
                                                    <span>อ่านล่าสุด {formatRelative(book.lastReadAt)}</span>
                                                </div>

                                                <div className="bookshelf-card__stats">
                                                    <div className="bookshelf-card__stat">
                                                        <GitBranch size={17} color="#F526A2" />
                                                        <span>{book.totalRoutes}</span>
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

                                                <span className={`bookshelf-card__status bookshelf-card__status--${filter !== "all" ? filter : book.reading_status}`}>
                                                    {filter !== "all" ? statusLabels[filter] : statusLabels[book.reading_status] || "ไม่ระบุสถานะ"}
                                                </span>

                                                <div className="bookshelf-card__progress">
                                                    <div className="bookshelf-card__progress-text">
                                                        <span>ความคืบหน้า</span>
                                                        <span style={{ color: isFinished ? '#16a34a' : 'inherit' }}>{displayPercent}%</span>
                                                    </div>
                                                    <div className="bookshelf-card__progress-bar">
                                                        <div 
                                                            className="bookshelf-card__progress-fill" 
                                                            style={{ 
                                                                width: `${displayPercent}%`,
                                                                background: isFinished ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f526a2, #ff7bc8)'
                                                            }} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                                </div>
                            )}
                            
            </>
                )}
            </div>
        </div >
    );
};

export default BookshelfPage;