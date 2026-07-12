import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./HistoryPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const STATUS_MAP = {
  reading: { label: "กำลังอ่าน", color: "#E91E8C", bg: "#FEF0F6", dot: "#E91E8C" },
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

const extractNumber = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const m = val.match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
};

const extractChapterAndSceneFromTitle = (title) => {
  if (!title || typeof title !== "string") return { chapter: null, scene: null };
  const chapterMatch = title.match(/ตอนที่\s*(\d+)/i) || title.match(/ตอน\s*(\d+)/i) || title.match(/chapter\s*(\d+)/i);
  const sceneMatch = title.match(/ฉากที่\s*(\d+)/i) || title.match(/scene\s*(\d+)/i) || title.match(/ตอนที่\s*\d+\s*[·\-:]\s*ฉากที่\s*(\d+)/i);
  return {
    chapter: chapterMatch ? parseInt(chapterMatch[1], 10) : null,
    scene: sceneMatch ? parseInt(sceneMatch[1], 10) : null,
  };
};

const normalizeBook = (item) => ({
  id: item.id || item.novel_id || item._id || item.novel?.id,
  title: item.title || item.novel?.title || "ไม่ระบุชื่อเรื่อง",
  author: item.author_name || item.author?.name || item.novel?.author_name || "ไม่ทราบผู้แต่ง",
  categories: Array.isArray(item.categories) ? item.categories.map(normalizeCategoryName) : ["ทั่วไป"],
  coverImage:
    item.cover_image ||
    item.coverImage ||
    item.novel?.cover_image ||
    "https://via.placeholder.com/320x420",
  synopsis: stripHtml(item.synopsis || item.description || item.introduction || ""),
  reading_status: item.reading_status || item.status || "reading",
  routeFound: item.routeFound || item.visited_count || item.route_found || 0,
  totalRoutes: item.totalRoutes || item.total_paths || item.total_scenes || item.scene_count || 0,
  endingCount: item.ending_count || item.endings?.discovered || 0,
  totalEndings: item.total_endings || item.endings?.total || 0,
  lastReadAt: item.last_read_at || item.updated_at || item.created_at || new Date().toISOString(),
  lastReadSceneTitle:
    item.last_read_scene_title || item.lastReadSceneTitle || item.latestChapter || "ยังไม่ระบุ",
  // prefer numeric fields when available
  lastReadChapterNumber: item.last_read_chapter_number || item.chapterNumber || item.chapter_number || item.order_index || null,
  lastReadSceneNumber: item.last_read_scene_number || item.sceneNumber || item.scene_number || item.scene_index || null,
  // fallback: try to parse numbers from title text
  lastReadParsed: (() => {
    const t = item.last_read_scene_title || item.lastReadSceneTitle || item.latestChapter || "";
    return extractChapterAndSceneFromTitle(t || "");
  })(),
  // textual chapter/scene names
  lastReadChapterTitle: item.last_read_chapter_title || item.chapterTitle || item.chapter_title || item.chapter_name || null,
  lastReadSceneName: item.last_read_scene_name || item.scene_name || item.sceneTitle || item.scene_title || item.scene_label || item.label || null,
  lastChoiceText: item.last_choice_text || item.prev_choice_text || item.previous_choice || item.choice_text || item.choiceLabel || item.via_choice || item.viaChoice || null,
  currentSceneId: item.current_scene_id || item.currentSceneId || item.novel?.current_scene_id || 0,
});

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
        const historyPayload =
          historyRes.data?.data?.history ||
          historyRes.data?.history ||
          historyRes.data?.novels ||
          historyRes.data ||
          [];
        const bookList = Array.isArray(historyPayload) ? historyPayload : [];

        if (active) {
          setBooks(bookList.map(normalizeBook));
        }
      } catch (err) {
        console.error("History API error:", err);
        if (active) setBooks([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
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
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Sarabun, sans-serif" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "#EF4444", fontWeight: 700, marginBottom: 6 }}>
              ประวัติการอ่านของฉัน
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
              นิยายที่คุณเคยอ่าน
            </div>
          </div>
          <div style={{ color: "#6B7280", fontSize: 13 }}>ทั้งหมด {books.length} เรื่อง</div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {statusOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              style={{
                borderRadius: 9999,
                border: filter === option.key ? "1px solid #111827" : "1px solid #E5E7EB",
                background: filter === option.key ? "#111827" : "#fff",
                color: filter === option.key ? "#fff" : "#374151",
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                minWidth: 108,
                textAlign: "center",
                flex: option.key === "all" ? "1 1 120px" : "0 1 auto",
              }}
            >
              {option.label}
              {option.key !== "all" && ` · ${statusCounts[option.key]}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 40,
              textAlign: "center",
              color: "#6B7280",
              fontSize: 14,
              boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
            }}
          >
            กำลังโหลดประวัติการอ่าน...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 48,
              textAlign: "center",
              color: "#6B7280",
              fontSize: 14,
              boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 8 }}>
              ยังไม่มีประวัติการอ่าน
            </div>
            <div>เริ่มอ่านนิยายเรื่องแรก แล้วมันจะปรากฏที่นี่</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filteredBooks.map((book) => {
              const status = STATUS_MAP[book.reading_status] || STATUS_MAP.reading;
              const percent = book.totalRoutes ? Math.round((book.routeFound / book.totalRoutes) * 100) : 0;
              return (
                <div
                  key={book.id}
                  style={{
                    display: "flex",
                    gap: 16,
                    background: "#fff",
                    borderRadius: 24,
                    padding: 20,
                    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      minWidth: 120,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#F3F4F6",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "linear-gradient(180deg,#FDE68A,#FBBF24)", color: "#fff", fontWeight: 800 }}>
                        {String(book.title || "-").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</div>
                            <div style={{ fontSize: 12, color: "#6B7280" }}>{book.categories.slice(0, 2).join(" · ")}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: status.bg, color: status.color, borderRadius: 9999, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: status.dot, display: "inline-block" }} />
                          {status.label}
                        </span>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                            {(() => {
                              // กวาดหา "ลำดับตอน" จากทุกชื่อตัวแปรที่เป็นไปได้
                              const chNum = book.lastReadChapterNumber || book.chapterNumber || book.chapter_number || book.order_index || book.lastReadParsed?.chapter || book.lastReadParsed?.chapterNumber || book.last_read_chapter_number;
                              
                              // กวาดหา "ชื่อตอน" จากทุกชื่อตัวแปรที่เป็นไปได้
                              const chTitle = book.lastReadChapterTitle || book.chapterTitle || book.chapter_title || book.last_read_chapter_title || book.lastReadParsed?.chapterTitle || book.lastReadParsed?.chapter_title;
                              
                              if (chNum && chTitle) return `ตอนที่ ${chNum} : ${chTitle}`;
                              if (chNum) return `ตอนที่ ${chNum}`;
                              if (chTitle) return chTitle;
                              
                              return "ยังไม่ระบุตอน";
                            })()}
                          </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                        gap: 12,
                        color: "#6B7280",
                        fontSize: 13,
                      }}
                    >
                      {/* --- ส่วนที่ 1: ฉากล่าสุด --- */}
                      <div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>ฉากล่าสุด</div>
                        <div style={{ fontWeight: 700, color: "#111827" }}>
                          {(() => {
                            // กวาดหา "ลำดับฉาก" จากทุกชื่อตัวแปรที่เป็นไปได้
                            const scNum = book.lastReadSceneNumber || book.sceneNumber || book.scene_number || book.scene_index || book.lastReadParsed?.scene || book.lastReadParsed?.sceneNumber || book.last_read_scene_number;
                            
                            // กวาดหา "ชื่อฉาก" จากทุกชื่อตัวแปรที่เป็นไปได้
                            const scTitle = book.lastReadSceneName || book.lastReadSceneTitle || book.sceneTitle || book.scene_title || book.last_read_scene_name || book.scene_name || book.lastReadParsed?.sceneTitle || book.lastReadParsed?.scene_title || book.label || book.lastReadParsed?.label || book.sceneLabel || book.scene_label;

                            // เช็กป้องกันไม่ให้ชื่อฉากไปซ้ำกับชื่อเรื่องหลัก
                            const isNovelTitle = scTitle === book.title || scTitle === book.novelTitle || scTitle === book.novel_title;

                            if (scTitle && scTitle !== "ยังไม่ระบุ" && !isNovelTitle) {
                              return scNum ? `ฉากที่ ${scNum} : ${scTitle}` : scTitle;
                            }

                            if (scNum) {
                              return `ฉากที่ ${scNum}`;
                            }
                            
                            return "ยังไม่ระบุฉาก";
                          })()}
                        </div>
                      </div>
                      {/* ทางเลือกก่อนหน้า */}
                      {book.lastChoiceText ? (
                        <div style={{ marginTop: 8, fontSize: 13, color: "#6B7280", gridColumn: "1 / -1" }}>
                          <strong style={{ color: "#374151", fontWeight: 700 }}>ทางเลือกก่อนหน้า:</strong> {book.lastChoiceText}
                        </div>
                      ) : null}

                      {/* --- ส่วนที่ 2: ตอนจบที่ค้นพบ --- */}
                      <div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>ตอนจบที่ค้นพบ</div>
                        <div style={{ fontWeight: 700, color: "#111827" }}>
                          {book.totalEndings > 0 && book.endingCount >= book.totalEndings
                            ? `${book.endingCount}/${book.totalEndings}`
                            : `${book.endingCount}/?`}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 0, color: "#6B7280", fontSize: 13 }}>
                        ล่าสุดอ่าน {formatRelative(book.lastReadAt)}
                      </div>
                      <button
                        onClick={() => {
                          // Prefer the centralized navigation handler if provided
                          const sceneId = book.currentSceneId || book.current_scene_id || 0;
                          if (typeof onNavigate === "function") {
                            onNavigate("reading", { novelId: book.id, sceneId: sceneId || undefined });
                          } else {
                            navigate(`/reading/${book.id}${sceneId ? `/${sceneId}` : ""}`);
                          }
                        }}
                        style={{
                          border: "none",
                          borderRadius: 9999,
                          background: "linear-gradient(90deg,#E91E8C,#FF6EB4)",
                          color: "#fff",
                          padding: "10px 16px",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        อ่านต่อ
                      </button>
                    </div>

                    <div style={{ marginTop: 16, gap: 8, display: "grid" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                        <span>ความคืบหน้า</span>
                        <span style={{ color: book.reading_status === 'finished' ? '#059669' : undefined }}>{percent}%</span>
                      </div>
                      <div style={{ background: "#F3F4F6", borderRadius: 9999, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${percent}%`, height: "100%", borderRadius: 9999, background: book.reading_status === 'finished' ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#E91E8C,#FF6EB4)' }} />
                      </div>
                    </div>
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
