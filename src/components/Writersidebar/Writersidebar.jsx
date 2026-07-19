// src/components/WriterSidebar/WriterSidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./WriterSidebar.css";
import { mockWriterProfile } from "../../data/mockWriterData";

// เมนูหลัก (ไม่ขึ้นกับนิยายที่เลือก)
const MAIN_MENU = [
  {
    id: "dashboard",
    label: "Dashboard นักเขียน",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="7" height="7" rx="2" fill="currentColor" opacity=".85"/>
        <rect x="10" y="1" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/>
        <rect x="1" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".5"/>
        <rect x="10" y="10" width="7" height="7" rx="2" fill="currentColor" opacity=".3"/>
      </svg>
    ),
  },
];

// เมนูที่แสดงเมื่อเลือกนิยายแล้ว
const NOVEL_MENU = [
  {
    id: "chapters",
    label: "จัดการตอน",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 4h14M2 8h10M2 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "write",
    label: "เขียนเนื้อหา",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 13.5L5.5 11l7-7 2 2-7 7-2.5 2.5H3v-2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
        <path d="M11.5 5l1.5-1.5 1.5 1.5-1.5 1.5L11.5 5z" fill="currentColor" opacity=".6"/>
      </svg>
    ),
  },
  {
    id: "story-tree",
    label: "Story Tree",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="3" r="2" fill="currentColor" opacity=".8"/>
        <circle cx="4" cy="12" r="2" fill="currentColor" opacity=".6"/>
        <circle cx="14" cy="12" r="2" fill="currentColor" opacity=".6"/>
        <path d="M9 5v3M9 8l-4 3M9 8l4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// เมนูสร้างนิยาย
const CREATE_MENU = [
  {
    id: "create-novel",
    label: "สร้างนิยายเรื่องใหม่",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const WriterSidebar = ({ currentPage: currentPageProp, selectedNovelId: selectedNovelIdProp, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const selectedNovelId = selectedNovelIdProp || (() => {
    const saved = localStorage.getItem("selectedNovel");
    if (saved) {
      try {
        const novelObj = JSON.parse(saved);
        const resolvedId = novelObj?.id || novelObj?.novel_id;
        if (resolvedId) return String(resolvedId);
      } catch (e) {}
    }
    const writerMatch = pathname.match(/^\/writer\/(\d+)\/chapters/);
    const writerSceneMatch = pathname.match(/^\/writer\/(\d+)\/scene/);
    const storyMatch = pathname.match(/^\/writer\/(\d+)\/storytree/);
    return writerMatch ? writerMatch[1] : writerSceneMatch ? writerSceneMatch[1] : storyMatch ? storyMatch[1] : null;
  })();

  const currentPage = currentPageProp || (() => {
    if (pathname.startsWith("/writer/") && pathname.includes("/chapters")) return "chapters";
    if (pathname.startsWith("/writer/") && pathname.includes("/scene")) return "write";
    if (pathname.startsWith("/writer/") && pathname.includes("/storytree")) return "story-tree";
    if (pathname.startsWith("/writer/create")) return "create-novel";
    return pathname.startsWith("/writer/dashboard") ? "dashboard" : "dashboard";
  })();

  const handleRoute = (pageId) => {
    if (typeof onNavigate === "function") {
      onNavigate(pageId);
    }

    switch (pageId) {
      case "reader-mode":
        navigate("/");
        break;
      case "dashboard":
        navigate("/writer/dashboard");
        break;
      case "create-novel":
        navigate("/writer/create");
        break;
      case "chapters":
        if (selectedNovelId) {
          navigate(`/writer/${selectedNovelId}/chapters`);
        } else {
          navigate("/writer/dashboard");
        }
        break;
      case "write":
        if (selectedNovelId) {
          (async () => {
            try {
              const token = localStorage.getItem("token");
              const headers = { Authorization: `Bearer ${token}` };
              const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
              const chRes = await fetch(`${API_BASE}/novels/${selectedNovelId}/chapters`, { headers });
              const chData = await chRes.json();
              const chapters = chData?.data?.chapters || chData?.chapters || [];
              if (chapters.length > 0) {
                const chId = chapters[0].id || chapters[0].chapter_id;
                const scRes = await fetch(`${API_BASE}/chapters/${chId}/scenes`, { headers });
                const scData = await scRes.json();
                const scenes = scData?.data?.scenes || scData?.scenes || [];
                if (scenes.length > 0) {
                  const scId = scenes[0].id || scenes[0].scene_id;
                  navigate(`/writer/${selectedNovelId}/scene/${scId}`);
                  return;
                }
              }
            } catch (e) {
              console.error(e);
            }
            navigate(`/writer/${selectedNovelId}/scene/empty`);
          })();
        } else {
          navigate("/writer/dashboard");
        }
        break;
      case "story-tree":
        if (selectedNovelId) {
          navigate(`/writer/${selectedNovelId}/storytree`);
        } else {
          navigate("/writer/dashboard");
        }
        break;
      default:
        navigate("/writer/dashboard");
        break;
    }
  };

  return (
    <aside className="wsb">
      {/* ── Logo ── */}
      <div className="wsb__logo" onClick={() => handleRoute("dashboard")} style={{ cursor: "pointer" }}>
        <img src="/logo192.png" alt="Logo" className="logo-img" />
        <div className="wsb__logo-text">
          <span className="wsb__logo-story">Story</span>
          <span className="wsb__logo-verse"> Verse</span>
          <span className="wsb__logo-mode">Writer Mode</span>
        </div>
      </div>

      {/* ── เมนูหลัก ── */}
      <nav className="wsb__nav" aria-label="เมนูหลัก">
        {MAIN_MENU.map((item) => (
          <button
            key={item.id}
            className={`wsb__item ${currentPage === item.id ? "wsb__item--active" : ""}`}
            onClick={() => handleRoute(item.id)}
            aria-current={currentPage === item.id ? "page" : undefined}
          >
            <span className="wsb__item-icon">{item.icon}</span>
            <span className="wsb__item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── นิยายที่เลือก (แสดงเสมอ) ── */}
      <div className="wsb__novel-section">
        <div className="wsb__section-label">นิยายที่เลือก</div>
        <nav aria-label="เมนูนิยาย">
          {NOVEL_MENU.map((item) => (
            <button
              key={item.id}
              className={`wsb__item ${currentPage === item.id ? "wsb__item--active" : ""} ${!selectedNovelId ? "wsb__item--disabled" : ""}`}
              onClick={() => handleRoute(item.id)}
              disabled={!selectedNovelId}
              title={!selectedNovelId ? "เลือกนิยายจาก Dashboard ก่อน" : ""}
            >
              <span className="wsb__item-icon">{item.icon}</span>
              <span className="wsb__item-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── หัวข้อสร้างนิยาย ── */}
      <div className="wsb__create-section">
        <div className="wsb__section-label">สร้างนิยาย</div>
        <nav aria-label="เมนูสร้างนิยาย">
          {CREATE_MENU.map((item) => (
            <button
              key={item.id}
              className={`wsb__item ${currentPage === item.id ? "wsb__item--active" : ""}`}
              onClick={() => handleRoute(item.id)}
            >
              <span className="wsb__item-icon">{item.icon}</span>
              <span className="wsb__item-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── spacer ── */}
      <div className="wsb__spacer" />

      {/* ── ปุ่มกลับโหมดนักอ่าน ── */}
      <div className="wsb__bottom">
        <button
          className="wsb__reader-mode-btn"
          onClick={() => handleRoute("reader-mode")}
          aria-label="กลับไปโหมดนักอ่าน"
        >
          {/* เปลี่ยน SVG เป็นแบบ Clean ไม่พังแน่นอน */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          กลับไปโหมดนักอ่าน
        </button>

        {/* ── Profile ── */}
        <div className="wsb__profile">
          <div className="wsb__profile-av">{mockWriterProfile.avatarEmoji}</div>
          <div className="wsb__profile-info">
            <div className="wsb__profile-name">{mockWriterProfile.displayName}</div>
            <div className="wsb__profile-role">{mockWriterProfile.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default WriterSidebar;
