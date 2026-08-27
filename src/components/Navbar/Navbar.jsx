import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import "./Navbar.css";
import { useAuthUser, useNotifications, useNavSearch } from "../../hooks/useNavbar.jsx";
import NotificationDropdown from "../NotificationDropdown/NotificationDropdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// หน้าโปรไฟล์นักเขียนแบบสาธารณะ (ใครก็ดูได้ ไม่ใช่ workspace ของนักเขียน)
// ขึ้นต้นด้วย /writer เหมือนกัน แต่ไม่ควรนับเป็น "โหมดนักเขียน"
const isWriterPublicProfilePath = (pathname) =>
    /^\/writer\/profile\/[^/]+\/?$/.test(pathname) || // /writer/profile/:id
    /^\/writer\/[^/]+\/profile\/?$/.test(pathname); // /writer/:id/profile

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const searchRef = useRef(null);
    const dropdownRef = useRef(null);

    // ── auth (แหล่งเดียว ใช้ร่วมกับ App.jsx ได้ด้วย) ──────────────
    const { isLoggedIn, userData, isLoadingUser, handleLogout: doLogout } = useAuthUser();

    // ── คำนวณโหมดจุดเดียว ไม่มีที่สองมาคำนวณแข่งกัน ────────────────
    const isWriterMode =
        location.pathname.startsWith("/writer") &&
        !isWriterPublicProfilePath(location.pathname) &&
        isLoggedIn &&
        userData.role === "writer";

    const { unreadCount } = useNotifications(isLoggedIn);

    const {
        searchValue, setSearchValue,
        searchFocused, setSearchFocused,
        recentSearches, popularNovels, categories,
        matchingNovels, highlightText,
        handleSearchSubmit, handleDeleteRecentSearch,
    } = useNavSearch();

    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // ── novel selector (เฉพาะโหมดนักเขียน) ─────────────────────────
    const [novels, setNovels] = useState([]);
    const [showNovelPopup, setShowNovelPopup] = useState(false);
    const [popupTarget, setPopupTarget] = useState(null);
    const [searchNovel, setSearchNovel] = useState("");
    const [selectedNovel, setSelectedNovel] = useState(() => {
        try {
            const saved = localStorage.getItem("selectedNovel");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
    }, [location.pathname]);

    const fetchNovels = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/me/novels`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("โหลดนิยายไม่สำเร็จ");
            const data = await res.json();
            const list = data?.novels || data?.data?.novels || [];
            setNovels(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("โหลดนิยายล้มเหลว:", err);
        }
    };

    useEffect(() => {
        if (isWriterMode) fetchNovels();
    }, [isWriterMode]);

    useEffect(() => {
        const syncSelectedNovel = () => {
            try {
                const saved = localStorage.getItem("selectedNovel");
                setSelectedNovel(saved ? JSON.parse(saved) : null);
            } catch {
                setSelectedNovel(null);
            }
        };
        window.addEventListener("storage", syncSelectedNovel);
        window.addEventListener("novel-selected", syncSelectedNovel);
        return () => {
            window.removeEventListener("storage", syncSelectedNovel);
            window.removeEventListener("novel-selected", syncSelectedNovel);
        };
    }, []);

    // ── click-outside ──────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [setSearchFocused]);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filteredNovels = novels.filter((n) =>
        (n.title || "").toLowerCase().includes(searchNovel.toLowerCase())
    );

    const openNovelPopup = (target = null) => {
        setPopupTarget(target);
        setSearchNovel("");
        setShowNovelPopup(true);
    };

    const navigateToNovelPage = async (novelId, target) => {
        if (target === "chapters") {
            navigate(`/writer/${novelId}/chapters`);
            return;
        }
        if (target === "tree") {
            navigate(`/writer/${novelId}/storytree`);
            return;
        }
        if (target === "analytics") {
            navigate(`/writer/${novelId}/analytics`);
            return;
        }
        if (target === "write") {
            // เดิมพยายามเดา sceneId แรกแล้วพาไปตรงๆ แต่ถ้า API คืนข้อมูลไม่ตรง
            // สมมุติฐาน หรือฉากนั้นถูกลบไปแล้ว จะพาไปเจอหน้า error ดิบๆ ทันที
            // เปลี่ยนมาเช็คแค่ "มีฉากอยู่จริงไหม" (ด้วย res.ok) ถ้าไม่ชัวร์ 100%
            // ให้พาไปหน้าจัดการตอนแทน ปลอดภัยกว่าการเดา URL ตรงๆ
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                const chapterRes = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters`, { headers });
                if (!chapterRes.ok) {
                    navigate(`/writer/${novelId}/chapters`);
                    return;
                }
                const chapterData = await chapterRes.json();
                const chapters = chapterData?.data?.chapters || chapterData?.chapters || chapterData?.data || [];

                if (!chapters.length) {
                    navigate(`/writer/${novelId}/scene/empty?reason=no-chapters`);
                    return;
                }

                let foundSceneId = null;
                for (const ch of chapters) {
                    const chId = ch.id || ch.chapter_id || ch.ChapterID;
                    if (!chId) continue;

                    const sceneRes = await fetch(`${API_BASE_URL}/chapters/${chId}/scenes`, { headers });
                    if (!sceneRes.ok) continue; // เช็คไม่ผ่านก็ข้ามไปตอนถัดไป ไม่ด่วนสรุปว่าไม่มี

                    const sceneData = await sceneRes.json();
                    const scenes = sceneData?.data?.scenes || sceneData?.scenes || sceneData?.data || [];

                    if (scenes.length > 0) {
                        foundSceneId = scenes[0].id || scenes[0].scene_id || scenes[0].SceneID;
                        break;
                    }
                }

                if (!foundSceneId) {
                    // ไม่เจอฉากที่ยืนยันได้ว่ามีอยู่จริง -> พาไปหน้าจัดการตอนให้เลือกเอง
                    // ปลอดภัยกว่าเดา URL ที่อาจจะ 404
                    navigate(`/writer/${novelId}/chapters`);
                    return;
                }

                navigate(`/writer/${novelId}/scene/${foundSceneId}`);
            } catch (err) {
                console.error("ดึงข้อมูลฉากแรกล้มเหลว:", err);
                // เชื่อมต่อ API ไม่สำเร็จเลย -> พาไปหน้าจัดการตอนแทนหน้า error ดิบ
                navigate(`/writer/${novelId}/chapters`);
            }
        }
    };

    const handleNovelMenu = async (target) => {
        if (!selectedNovel) {
            openNovelPopup(target);
            return;
        }
        navigateToNovelPage(selectedNovel.id || selectedNovel.novel_id, target);
    };

    // บั๊กเดิม: ปุ่มชื่อเรื่องที่กำลังแก้ไข (selected-novel-btn) เปิด popup ด้วย
    // openNovelPopup(null) เสมอ พอเลือกนิยายใหม่ handleSelectNovel เห็น popupTarget
    // เป็น null เลยไม่ navigate ไปไหน -> selectedNovel/title บน navbar เปลี่ยนถูก
    // แต่ URL ยังค้างอยู่หน้าของนิยายเก่า เนื้อหาในหน้าเลยไม่ตามไปด้วย
    // แก้โดยเดา "section" ปัจจุบันจาก URL ก่อนเปิด popup เพื่อให้พอเลือกนิยายใหม่
    // แล้ว navigate ไปหน้า section เดียวกันของนิยายใหม่ให้อัตโนมัติ
    const getCurrentNovelSection = () => {
        if (/^\/writer\/[^/]+\/chapters/.test(location.pathname)) return "chapters";
        if (/^\/writer\/[^/]+\/storytree/.test(location.pathname)) return "tree";
        if (/^\/writer\/[^/]+\/analytics/.test(location.pathname)) return "analytics";
        if (/^\/writer\/[^/]+\/scene\//.test(location.pathname)) return "write";
        return null;
    };

    const handleSelectNovel = (novel) => {
        setSelectedNovel(novel);
        localStorage.setItem("selectedNovel", JSON.stringify(novel));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("novel-selected"));
        setShowNovelPopup(false);
        if (popupTarget) navigateToNovelPage(novel.id || novel.novel_id, popupTarget);
    };

    const handleLogout = async (event) => {
        await doLogout(event);
        navigate("/", { replace: true });
    };

    // ─────────────────────────────────────────────────────────────
    return (
        <>
            <nav className={`nav-header ${isScrolled ? "nav-sticky" : ""}`}>
                <div className="nav-container">

                    {/* โลโก้ */}
                    <div
                        className="nav-logo"
                        onClick={() => {
                            if (isWriterMode) {
                                localStorage.removeItem("selectedNovel");
                                setSelectedNovel(null);
                                navigate("/writer/dashboard");
                            } else {
                                navigate("/");
                            }
                        }}
                    >
                        <img src="/logo192.png" alt="logo" className="logo-img" />
                        <div className="navbar__logo-text">
                            <span className="navbar__logo-story">Story</span>
                            <span className="navbar__logo-verse">Verse</span>
                            <span className="navbar__logo-mode">
                                {isWriterMode ? "Writer Mode" : "Reader Mode"}
                            </span>
                        </div>
                    </div>

                    {/* ปุ่มสลับโหมด นักอ่าน/นักเขียน — โผล่เฉพาะบัญชีที่เป็นนักเขียนแล้วเท่านั้น */}
                    {isLoggedIn && userData.role === "writer" && (
                        <div className="mode-toggle">
                            <button
                                className={`mode-toggle__btn ${!isWriterMode ? "mode-toggle__btn--active" : ""}`}
                                onClick={() => navigate("/")}
                            >
                                นักอ่าน
                            </button>
                            <button
                                className={`mode-toggle__btn ${isWriterMode ? "mode-toggle__btn--active" : ""}`}
                                onClick={() => {
                                    localStorage.removeItem("selectedNovel");
                                    setSelectedNovel(null);
                                    navigate("/writer/dashboard");
                                }}
                            >
                                นักเขียน
                            </button>
                        </div>
                    )}

                    {/* ปุ่มเมนูมือถือ — โผล่เฉพาะจอเล็ก (ควบคุมด้วย CSS) */}
                    <button
                        type="button"
                        className="nav-hamburger"
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        aria-label={isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>

                    {/* เมนูกลาง */}
                    <ul className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
                        {isWriterMode ? (
                            <>
                                <li className={`nav-item ${location.pathname === "/writer/dashboard" ? "active-menu" : ""}`}>
                                    <Link
                                        to="/writer/dashboard"
                                        onClick={() => {
                                            localStorage.removeItem("selectedNovel");
                                            setSelectedNovel(null);
                                        }}
                                    >
                                        Dashboard
                                    </Link>
                                </li>

                                {selectedNovel && (
                                    <>
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className="selected-novel-btn"
                                                onClick={() => openNovelPopup(getCurrentNovelSection())}
                                                title="คลิกเพื่อเปลี่ยนนิยายที่กำลังแก้ไข"
                                            >
                                                <span className="selected-dot"></span>
                                                <span className="selected-title">
                                                    {selectedNovel.title || "ไม่ระบุชื่อนิยาย"}
                                                </span>
                                            </button>
                                        </li>
                                        <li className="nav-item-divider-container">
                                            <span className="nav-menu-divider"></span>
                                        </li>
                                        <li className="nav-item">
                                            <button 
                                                 className={`nav-menu-btn--pink ${location.pathname.includes("/chapters") ? "active" : ""}`} 
                                                 onClick={() => handleNovelMenu("chapters")}
                                             >
                                                 จัดการตอน
                                             </button>
                                        </li>
                                         <li className="nav-item">
                                             <button 
                                                 className={`nav-menu-btn--pink ${location.pathname.includes("/scene/") ? "active" : ""}`} 
                                                 onClick={() => handleNovelMenu("write")}
                                             >
                                                 เขียนเนื้อหา
                                             </button>
                                         </li>
                                        <li className="nav-item">
                                            <button 
                                                className={`nav-menu-btn--pink ${location.pathname.includes("/storytree") ? "active" : ""}`} 
                                                onClick={() => handleNovelMenu("tree")}
                                            >
                                                โครงสร้างเนื้อเรื่อง
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button 
                                                className={`nav-menu-btn--pink ${location.pathname.includes("/analytics") ? "active" : ""}`} 
                                                onClick={() => handleNovelMenu("analytics")}
                                            >
                                                สถิติทางเลือก
                                            </button>
                                        </li>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <li className={`nav-item ${location.pathname === "/" ? "active-menu" : ""}`}>
                                    <Link to="/">หน้าแรก</Link>
                                </li>
                                <li className={`nav-item ${location.pathname.startsWith("/categories") ? "active-menu" : ""}`}>
                                    <Link to="/categories">หมวดหมู่</Link>
                                </li>
                                <li className={`nav-item ${location.pathname.startsWith("/bookshelf") ? "active-menu" : ""}`}>
                                    <Link to="/bookshelf">ชั้นหนังสือ</Link>
                                </li>
                                <li className={`nav-item ${location.pathname.startsWith("/history") ? "active-menu" : ""}`}>
                                    <Link to="/history">ประวัติการอ่าน</Link>
                                </li>
                                <li className={`nav-item ${location.pathname.startsWith("/following-writers") ? "active-menu" : ""}`}>
                                    <Link to="/following-writers">นักเขียนที่ติดตาม</Link>
                                </li>
                                {isLoggedIn && userData.role !== "writer" && (
                                    <li className={`nav-item ${location.pathname.startsWith("/registerwriter") ? "active-menu" : ""}`}>
                                        <Link to="/registerwriter">สมัครนักเขียน</Link>
                                    </li>
                                )}
                            </>
                        )}
                    </ul>

                    {/* ฝั่งขวา */}
                    <div className="navbar__right">

                        {/* กล่องค้นหา — โชว์เฉพาะโหมดนักอ่าน */}
                        {!isWriterMode && (
                            <div className="navbar__search-zone" ref={searchRef}>
                                <div className={`navbar__search ${searchFocused ? "navbar__search--focused" : ""}`}>
                                    <svg className="navbar__search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                                        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    <input
                                        className="navbar__search-input"
                                        type="search"
                                        placeholder="ค้นหานิยาย"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        onFocus={() => setSearchFocused(true)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(searchValue); }}
                                    />
                                </div>

                                {searchFocused && (
                                    <div className="search-overlay-dropdown">
                                        {searchValue.trim() !== "" ? (
                                            <div className="search-overlay-section">
                                                <h4 className="search-overlay-title">นิยายที่เกี่ยวข้อง</h4>
                                                <div className="search-overlay-matching-list">
                                                    {matchingNovels.length === 0 ? (
                                                        <div style={{ padding: "14px 0", color: "#94a3b8", fontSize: "0.88rem", textAlign: "center" }}>
                                                            ไม่พบนิยายที่เกี่ยวข้อง
                                                        </div>
                                                    ) : (
                                                        matchingNovels.map((novel, idx) => {
                                                            const rawCats = novel.categories || novel.Categories || [];
                                                            const cleanCats = rawCats
                                                                .map((c) => (typeof c === "string" ? c : c.name || c.title))
                                                                .slice(0, 2)
                                                                .join(", ");
                                                            const chapterCount =
                                                                novel.chapters_count || (novel.chapters ? novel.chapters.length : 0) || 0;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="search-overlay-match-card"
                                                                    onClick={() => {
                                                                        setSearchFocused(false);
                                                                        setSearchValue("");
                                                                        navigate(`/novel/${novel.id || novel.novel_id}`);
                                                                    }}
                                                                >
                                                                    <div className="match-card-cover">
                                                                        {novel.cover_image || novel.coverImage ? (
                                                                            <img
                                                                                src={(novel.cover_image || novel.coverImage).replace(
                                                                                    "http://minio:9000",
                                                                                    "http://localhost:9000"
                                                                                )}
                                                                                alt=""
                                                                            />
                                                                        ) : (
                                                                            <div className="match-card-placeholder">📘</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="match-card-info">
                                                                        <div className="match-card-title">
                                                                            {highlightText(novel.title || "", searchValue)}
                                                                        </div>
                                                                        <div className="match-card-meta">
                                                                            {novel.pen_name || novel.penName || "ไม่ระบุ"} • {cleanCats || "ทั่วไป"} • {chapterCount} ตอน
                                                                        </div>
                                                                    </div>
                                                                    <span className="match-card-arrow">➔</span>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                <div className="search-overlay-footer-btn" onClick={() => handleSearchSubmit(searchValue)}>
                                                    ดูผลลัพธ์ทั้งหมดสำหรับ "{searchValue}"
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {recentSearches.length > 0 && (
                                                    <div className="search-overlay-section">
                                                        <h4 className="search-overlay-title">🕒 ค้นหาล่าสุด</h4>
                                                        <div className="search-overlay-recent-list">
                                                            {recentSearches.map((item, idx) => (
                                                                <div key={idx} className="search-overlay-recent-item">
                                                                    <span className="recent-text" onClick={() => handleSearchSubmit(item)}>
                                                                        {item}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="recent-delete-btn"
                                                                        onClick={(e) => handleDeleteRecentSearch(e, item)}
                                                                        title="ลบประวัติ"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {popularNovels.length > 0 && (
                                                    <div className="search-overlay-section">
                                                        <h4 className="search-overlay-title">🔥 กำลังเป็นที่นิยม</h4>
                                                        <div className="search-overlay-popular-list">
                                                            {popularNovels.map((novel, idx) => {
                                                                const views = novel.views || novel.view_count || 0;
                                                                const fv = views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views;
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="search-overlay-popular-item"
                                                                        onClick={() => {
                                                                            setSearchFocused(false);
                                                                            navigate(`/novel/${novel.id || novel.novel_id}`);
                                                                        }}
                                                                    >
                                                                        <span className="popular-badge">{idx + 1}</span>
                                                                        <div className="popular-info">
                                                                            <span className="popular-title">{novel.title}</span>
                                                                            <span className="popular-meta">
                                                                                ✍️ {novel.pen_name || novel.penName || "ไม่ระบุ"} • 👁️ {fv} ยอดอ่าน
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {categories.length > 0 && (
                                                    <div className="search-overlay-section">
                                                        <h4 className="search-overlay-title">🗂️ สำรวจหมวดหมู่</h4>
                                                        <div className="search-overlay-category-list">
                                                            {categories.map((cat, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    className="search-overlay-cat-chip"
                                                                    onClick={() => {
                                                                        setSearchFocused(false);
                                                                        navigate("/categories");
                                                                    }}
                                                                >
                                                                    {cat.name || cat.title}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* กระดิ่งแจ้งเตือน — เปิดรายการล่าสุดใน dropdown */}
                        {isLoggedIn && (
                            <NotificationDropdown unreadCount={unreadCount} />
                        )}

                        {/* ปุ่ม "สตูดิโอนักเขียน" — โชว์เฉพาะบัญชีนักเขียนที่กำลังอยู่โหมดนักอ่าน */}
                        {!isWriterMode && isLoggedIn && userData.role === "writer" && (
                            <button
                                type="button"
                                className="nav-switch-btn nav-switch-btn--writer"
                                onClick={() => navigate("/writer/dashboard")}
                            >
                                ✍️ สตูดิโอนักเขียน
                            </button>
                        )}

                        {/* โซน auth / profile */}
                        <div className="navbar__auth-zone" ref={dropdownRef}>
                            {isLoggedIn ? (
                                <div className="nav-profile-container">
                                    <button
                                        type="button"
                                        className="nav-profile-trigger"
                                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                                        aria-label="เมนูผู้ใช้งาน"
                                        aria-expanded={isDropdownOpen}
                                    >
                                        <img
                                            src={userData.pic_profile || "https://api.dicebear.com/7.x/bottts/svg?seed=Lucky"}
                                            alt="User Avatar"
                                            className="nav-avatar-img"
                                        />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="nav-dropdown">
                                            <div className="nav-dropdown__user-info">
                                                <p className="nav-dropdown__status">
                                                    {isLoadingUser ? "⏳ กำลังโหลด..." : `สิทธิ์: ${userData.role || "ผู้ใช้"}`}
                                                </p>
                                                <p className="nav-dropdown__user-id" title={userData.email}>
                                                    {userData.username || userData.email || "ผู้ใช้งาน"}
                                                </p>
                                            </div>
                                            <hr className="nav-dropdown__divider" />

                                            {userData.role === "writer" && (
                                                <button
                                                    type="button"
                                                    className="nav-dropdown__link-btn"
                                                    onClick={() => {
                                                        setIsDropdownOpen(false);
                                                        navigate("/writer/profile");
                                                    }}
                                                >
                                                    👤 โปรไฟล์ของฉัน
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="nav-dropdown__link-btn"
                                                onClick={() => {
                                                    setIsDropdownOpen(false);
                                                    navigate("/settings");
                                                }}
                                            >
                                                ⚙️ ตั้งค่า
                                            </button>

                                            <hr className="nav-dropdown__divider" />
                                            <button
                                                type="button"
                                                className="nav-dropdown__logout-btn"
                                                onClick={() => { setIsDropdownOpen(false); setShowLogoutModal(true); }}
                                            >
                                                🚪 ออกจากระบบ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link to="/login-register" className="nav-login-btn">
                                    เข้าสู่ระบบ / สมัครสมาชิก
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Popup เลือกนิยาย (เฉพาะโหมดนักเขียน) */}
            {showNovelPopup && (
                <div className="novel-popup-overlay" onClick={() => setShowNovelPopup(false)}>
                    <div className="novel-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="novel-popup__header">
                            <div>
                                <h3>เลือกนิยาย</h3>
                                <p>เลือกนิยายที่ต้องการแก้ไข</p>
                            </div>
                            <button className="novel-popup__close" onClick={() => setShowNovelPopup(false)}>✕</button>
                        </div>

                        <div className="novel-popup__search-wrap">
                            <span className="novel-popup__search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อนิยายที่ต้องการแก้ไข..."
                                value={searchNovel}
                                onChange={(e) => setSearchNovel(e.target.value)}
                                className="novel-popup__search"
                            />
                        </div>

                        <div className="novel-popup__list">
                            {filteredNovels.length === 0 ? (
                                <div className="novel-popup__empty">
                                    <div className="novel-popup__empty-icon">📖</div>
                                    <div>ไม่พบนิยาย</div>
                                </div>
                            ) : (
                                filteredNovels.map((novel) => (
                                    <button
                                        key={novel.id || novel.novel_id}
                                        className="novel-popup__item"
                                        onClick={() => handleSelectNovel(novel)}
                                    >
                                        <div className="novel-popup__cover">
                                            {novel.cover_image ? (
                                                <img src={novel.cover_image.replace("http://minio:9000", "http://localhost:9000")} alt="" />
                                            ) : "📖"}
                                        </div>
                                        <div className="novel-popup__info">
                                            <div className="novel-popup__title">{novel.title}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ยืนยัน logout */}
            {showLogoutModal && ReactDOM.createPortal(
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                    backgroundColor: "rgba(17, 24, 39, 0.45)",
                    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                    display: "flex", justifyContent: "center", alignItems: "center",
                    zIndex: 999999, padding: "20px",
                }}>
                    <div style={{
                        background: "#ffffff", width: "100%", maxWidth: "400px",
                        borderRadius: "24px",
                        boxShadow: "0 20px 50px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)",
                        padding: "28px 24px 24px", textAlign: "center",
                        display: "flex", flexDirection: "column", alignItems: "center",
                    }}>
                        <div style={{
                            width: "60px", height: "60px", borderRadius: "50%",
                            background: "#fff1f2", color: "#e11d48",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "28px", marginBottom: "16px",
                            boxShadow: "0 4px 12px rgba(225,29,72,0.15)",
                        }}>🚪</div>
                        <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
                            ยืนยันการออกจากระบบ
                        </h3>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
                            คุณต้องการออกจากระบบบัญชีผู้ใช้งานนี้ใช่หรือไม่?
                        </p>
                        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                style={{
                                    flex: 1, padding: "11px", borderRadius: "12px",
                                    border: "1.5px solid #e2e8f0", background: "#ffffff",
                                    color: "#475569", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                                }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { setShowLogoutModal(false); handleLogout(e); }}
                                style={{
                                    flex: 1, padding: "11px", borderRadius: "12px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                                    color: "#ffffff", fontSize: "14px", fontWeight: 700,
                                    cursor: "pointer", boxShadow: "0 4px 14px rgba(225,29,72,0.3)",
                                }}
                            >
                                ยืนยันออกจากระบบ
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default Navbar;