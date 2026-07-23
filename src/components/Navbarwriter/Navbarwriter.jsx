import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbarwriter.css";
import { getNovelStatusInfo } from "../../utils/novelStatus";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const Navbarwriter = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ─────────────────────────────────────
    // States
    // ─────────────────────────────────────
    const [isScrolled, setIsScrolled] = useState(false);

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [userData, setUserData] = useState({
        username: "",
        email: "",
        pic_profile: "",
        role: "",
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // States สำหรับช่องค้นหาในโหมดนักอ่าน
    const [searchValue, setSearchValue] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);

    const [recentSearches, setRecentSearches] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("recent_searches") || "[]");
        } catch {
            return [];
        }
    });
    const [popularNovels, setPopularNovels] = useState([]);
    const [overlayCategories, setOverlayCategories] = useState([]);
    const [allNovels, setAllNovels] = useState([]);

    useEffect(() => {
        const fetchSearchOverlayData = async () => {
            try {
                const [novelRes, catRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/novels`),
                    fetch(`${API_BASE_URL}/categories`)
                ]);
                if (novelRes.ok) {
                    const novelData = await novelRes.json();
                    const list = novelData.novels || novelData.data?.novels || novelData.data || [];
                    const published = list.filter(n => n.status?.toLowerCase() === "published" || n.is_published === true);
                    setAllNovels(published);

                    const sorted = [...published].sort((a, b) => (b.views || b.view_count || 0) - (a.views || a.view_count || 0));
                    setPopularNovels(sorted.slice(0, 5));
                }
                if (catRes.ok) {
                    const catData = await catRes.json();
                    const list = catData.categories || catData.data || [];
                    setOverlayCategories(list.slice(0, 5));
                }
            } catch (e) {
                console.warn("Failed to fetch search overlay data:", e);
            }
        };
        fetchSearchOverlayData();
    }, []);

    // ค้นหานิยายที่ใกล้เคียงเรียลไทม์ขณะพิมพ์
    const matchingNovels = useMemo(() => {
        if (!searchValue.trim()) return [];
        const q = searchValue.toLowerCase().trim();
        return allNovels.filter(n => 
            (n.title && n.title.toLowerCase().includes(q)) ||
            (n.pen_name && n.pen_name.toLowerCase().includes(q)) ||
            (n.penName && n.penName.toLowerCase().includes(q))
        ).slice(0, 3);
    }, [searchValue, allNovels]);

    // ฟังก์ชันไฮไลต์ตัวอักษรค้นหา
    const highlightText = (text, highlight) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === highlight.toLowerCase() 
                        ? <span key={i} style={{ color: "#db2777", fontWeight: "800" }}>{part}</span> 
                        : part
                )}
            </span>
        );
    };

    // ─────────────────────────────────────
    // Writer mode
    // ─────────────────────────────────────
    const isWriterMode = location.pathname.startsWith("/writer");

    // ─────────────────────────────────────
    // Novels
    // ─────────────────────────────────────
    const [novels, setNovels] = useState([]);

    const [showNovelPopup, setShowNovelPopup] = useState(false);

    const [popupTarget, setPopupTarget] = useState(null);

    const [searchNovel, setSearchNovel] = useState("");

    const [selectedNovel, setSelectedNovel] = useState(() => {
        const saved = localStorage.getItem("selectedNovel");

        return saved ? JSON.parse(saved) : null;
    });

    // ─────────────────────────────────────
    // Filter novels
    // ─────────────────────────────────────
    const filteredNovels = useMemo(() => {
        return novels.filter((novel) =>
            novel.title
                ?.toLowerCase()
                .includes(searchNovel.toLowerCase())
        );
    }, [novels, searchNovel]);

    // ─────────────────────────────────────
    // Scroll
    // ─────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        const syncSelectedNovel = () => {
            const saved = localStorage.getItem("selectedNovel");
            setSelectedNovel(saved ? JSON.parse(saved) : null);
        };
        window.addEventListener("storage", syncSelectedNovel);
        window.addEventListener("novel-selected", syncSelectedNovel);
        syncSelectedNovel();
        return () => {
            window.removeEventListener("storage", syncSelectedNovel);
            window.removeEventListener("novel-selected", syncSelectedNovel);
        };
    }, []);

    // ─────────────────────────────────────
    // Auth
    // ─────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUserData(prev => ({
                    ...prev,
                    username: parsedUser.username || prev.username,
                    email: parsedUser.email || prev.email,
                    pic_profile: parsedUser.pic_profile || prev.pic_profile,
                    role: parsedUser.role || prev.role,
                }));
            } catch (err) {
                console.warn("ไม่สามารถอ่านข้อมูลผู้ใช้จาก localStorage ได้", err);
            }
        }

        if (!token) return;

        setIsLoggedIn(true);

        fetchUserData(token);
        fetchNovels(token);
    }, []);

    // ─────────────────────────────────────
    // Fetch User
    // ─────────────────────────────────────
    const fetchUserData = async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) return;

            const data = await response.json();

            if (data.user) {
                setUserData({
                    username: data.user.username || "",
                    email: data.user.email || "",
                    pic_profile: data.user.pic_profile || "",
                    role: data.user.role || "",
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ─────────────────────────────────────
    // Fetch Novels
    // ─────────────────────────────────────
    const fetchNovels = async (token) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/me/novels`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("โหลดนิยายไม่สำเร็จ");
            }

            const data = await response.json();

            const novelList =
                data?.novels ||
                data?.data?.novels ||
                [];

            setNovels(Array.isArray(novelList) ? novelList : []);
        } catch (err) {
            console.error("โหลดนิยายล้มเหลว:", err);
        }
    };

    // ─────────────────────────────────────
    // Navigate after select
    // ─────────────────────────────────────
    const navigateToNovelPage = async (novelId, target) => {
        if (target === "chapters") {
            window.location.href = `/writer/${novelId}/chapters`;
            return;
        }

        if (target === "tree") {
            window.location.href = `/writer/${novelId}/storytree`;
            return;
        }

        if (target === "write") {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                // 1. ดึงตอน (Chapters) ทั้งหมดของนิยายเรื่องนี้มาเช็ค
                const chapterRes = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters`, { headers });
                const chapterData = await chapterRes.json();
                const chapters = chapterData?.data?.chapters || chapterData?.chapters || chapterData?.data || [];

                // กรณีที่ 1: ผู้ใช้ยังไม่มีตอนเลย (Chapter = 0)
                if (!chapters.length) {
                    window.location.href = `/writer/${novelId}/scene/empty?reason=no-chapters`;
                    return;
                }

                // ดึงฉากในทุกตอนเพื่อหาฉากแรกสุดที่มีอยู่จริง
                let foundSceneId = null;
                for (const ch of chapters) {
                    const chId = ch.id || ch.chapter_id || ch.ChapterID;
                    if (!chId) continue;

                    const sceneRes = await fetch(`${API_BASE_URL}/chapters/${chId}/scenes`, { headers });
                    const sceneData = await sceneRes.json();
                    const scenes = sceneData?.data?.scenes || sceneData?.scenes || sceneData?.data || [];

                    if (scenes.length > 0) {
                        foundSceneId = scenes[0].id || scenes[0].scene_id || scenes[0].SceneID;
                        break;
                    }
                }

                // กรณีที่ 2: มีตอนแล้ว แต่ยังไม่มีฉากเลย (Scene = 0)
                if (!foundSceneId) {
                    window.location.href = `/writer/${novelId}/scene/empty?reason=no-scenes`;
                    return;
                }

                // กรณีที่ 3: มีตอนและมีฉากแล้ว -> เปิด Editor ฉากนั้นทันที
                window.location.href = `/writer/${novelId}/scene/${foundSceneId}`;
            } catch (err) {
                console.error("ดึงข้อมูลฉากแรกล้มเหลว:", err);
                window.location.href = `/writer/${novelId}/scene/empty?reason=no-chapters`;
            }
            return;
        }

        if (!target) {
            window.location.reload();
        }
    };

    // ─────────────────────────────────────
    // Handle select novel
    // ─────────────────────────────────────
    const handleSelectNovel = async (novel) => {

        setSelectedNovel(novel);

        localStorage.setItem(
            "selectedNovel",
            JSON.stringify(novel)
        );

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("novel-selected"));

        setShowNovelPopup(false);

        const novelId =
            novel.id || novel.novel_id;

        const token = localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        try {

            // ─────────────────────────
            // โหลด chapters ของนิยายใหม่
            // ─────────────────────────
            const chapterRes = await fetch(
                `${API_BASE_URL}/novels/${novelId}/chapters`,
                { headers }
            );

            const chapterData = await chapterRes.json();

            const chapters =
                chapterData?.data?.chapters ||
                chapterData?.chapters ||
                chapterData?.data ||
                [];

            // ไม่มี chapter
            if (!chapters.length) {

                window.location.href =
                    `/writer/${novelId}/chapters`;

                return;
            }

            const firstChapter = chapters[0];

            const firstChapterId =
                firstChapter.id ||
                firstChapter.chapter_id ||
                firstChapter.ChapterID;

            // ─────────────────────────
            // โหลด scenes ของ chapter แรก
            // ─────────────────────────
            const sceneRes = await fetch(
                `${API_BASE_URL}/chapters/${firstChapterId}/scenes`,
                { headers }
            );

            const sceneData = await sceneRes.json();

            const scenes =
                sceneData?.data?.scenes ||
                sceneData?.scenes ||
                sceneData?.data ||
                [];

            // ไม่มี scene
            if (!scenes.length) {

                window.location.href =
                    `/writer/${novelId}/chapters`;

                return;
            }

            const firstScene = scenes[0];

            const firstSceneId =
                firstScene.id ||
                firstScene.scene_id ||
                firstScene.SceneID;

            const currentPath = location.pathname;

            // ─────────────────────────
            // หน้า scene editor
            // ─────────────────────────
            if (currentPath.includes("/scene/")) {

                window.location.href =
                    `/writer/${novelId}/scene/${firstSceneId}`;

                return;
            }

            // ─────────────────────────
            // หน้า chapters
            // ─────────────────────────
            if (currentPath.includes("/chapters")) {

                window.location.href =
                    `/writer/${novelId}/chapters`;

                return;
            }

            // ─────────────────────────
            // หน้า storytree
            // ─────────────────────────
            if (currentPath.includes("/storytree")) {

                window.location.href =
                    `/writer/${novelId}/storytree`;

                return;
            }

            // ─────────────────────────
            // fallback
            // ─────────────────────────
            window.location.href =
                `/writer/${novelId}/scene/${firstSceneId}`;

        } catch (err) {

            console.error("เปลี่ยนนิยายล้มเหลว:", err);

            window.location.href =
                `/writer/${novelId}/chapters`;
        }
    };

    // ─────────────────────────────────────
    // Open popup
    // ─────────────────────────────────────
    const openNovelPopup = (target = null) => {
        setPopupTarget(target);

        setSearchNovel("");

        setShowNovelPopup(true);
    };

    // ─────────────────────────────────────
    // Navigate novel pages
    // ─────────────────────────────────────
    const handleNovelMenu = async (target) => {
        if (!selectedNovel) {
            openNovelPopup(target);
            return;
        }

        const novelId = selectedNovel.id || selectedNovel.novel_id;
        
        // ✨ เปลี่ยนให้มีการรอ (await) เพื่อให้มันหา scene_id ให้เสร็จก่อนเปลี่ยนหน้า
        await navigateToNovelPage(novelId, target);
    };

    const handleSearchSubmit = (query) => {
        if (!query.trim()) return;
        const q = query.trim();
        
        setRecentSearches(prev => {
            const filtered = prev.filter(item => item !== q);
            const next = [q, ...filtered].slice(0, 5);
            localStorage.setItem("recent_searches", JSON.stringify(next));
            return next;
        });

        window.dispatchEvent(new CustomEvent("search-change", { detail: q }));
        navigate(`/categories?search=${encodeURIComponent(q)}`);
        setSearchFocused(false);
    };

    const handleDeleteRecentSearch = (e, q) => {
        e.preventDefault();
        e.stopPropagation();
        setRecentSearches(prev => {
            const next = prev.filter(item => item !== q);
            localStorage.setItem("recent_searches", JSON.stringify(next));
            return next;
        });
    };

    // ─────────────────────────────────────
    // Logout
    // ─────────────────────────────────────
    const handleLogout = async (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        console.log("🚪 Writer logout clicked");

        try {
            const token = localStorage.getItem("token");
            if (token) {
                await fetch(`${API_BASE_URL}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(err => console.warn("Logout API warning:", err));
            }
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            localStorage.removeItem("selectedNovel");
            localStorage.removeItem("user_email");

            setSelectedNovel(null);
            setIsLoggedIn(false);
            setIsDropdownOpen(false);
            setUserData({
                username: "",
                email: "",
                pic_profile: "",
                role: "",
            });

            navigate("/", { replace: true });
            window.location.replace("/");
        }
    };

    return (
        <>
            <nav
                className={`nav-header ${isScrolled ? "nav-sticky" : ""
                    }`}
            >
                <div className="nav-container">

                    {/* ───────────────────── */}
                    {/* Logo */}
                    {/* ───────────────────── */}
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
                        <img
                            src="/logo192.png"
                            alt="logo"
                            className="logo-img"
                        />

                        <div className="navbar__logo-text">
                            <span className="navbar__logo-story">
                                Story
                            </span>

                            <span className="navbar__logo-verse">
                                Verse
                            </span>

                            <span className="navbar__logo-mode">
                                {isWriterMode
                                    ? "Writer Mode"
                                    : "Reader Mode"}
                            </span>
                        </div>
                    </div>

                    {/* ───────────────────── */}
                    {/* Toggle */}
                    {/* ───────────────────── */}
                    <div className="mode-toggle">

                        <button
                            className={`mode-toggle__btn ${!isWriterMode
                                ? "mode-toggle__btn--active"
                                : ""
                                }`}
                            onClick={() => navigate("/")}
                        >
                            นักอ่าน
                        </button>

                        <button
                            className={`mode-toggle__btn ${isWriterMode
                                ? "mode-toggle__btn--active"
                                : ""
                                }`}
                            onClick={() => {
                                localStorage.removeItem("selectedNovel");
                                setSelectedNovel(null);
                                navigate("/writer/dashboard");
                            }}
                        >
                            นักเขียน
                        </button>

                    </div>

                    {/* ───────────────────── */}
                    {/* Menu */}
                    {/* ───────────────────── */}
                    <ul className="nav-menu">

                        {/* ───────── Reader ───────── */}
                        {!isWriterMode && (
                            <>
                                <li className="nav-item">
                                    <Link to="/">หน้าแรก</Link>
                                </li>

                                <li className="nav-item">
                                    <Link to="/categories">
                                        หมวดหมู่
                                    </Link>
                                </li>

                                <li className="nav-item">
                                    <Link to="/bookshelf">
                                        ชั้นหนังสือ
                                    </Link>
                                </li>

                                <li className="nav-item">
                                    <Link to="/history">
                                        ประวัติการอ่าน
                                    </Link>
                                </li>

                                <li className="nav-item">
                                    <Link to="/following-writers">
                                        นักเขียนที่ติดตาม
                                    </Link>
                                </li>

                                {userData.role === "writer" && (
                                    <li className="nav-item">
                                        <Link to="/writer/dashboard">
                                            สตูดิโอนักเขียน
                                        </Link>
                                    </li>
                                )}
                            </>
                        )}

                        {/* ───────── Writer ───────── */}
                        {isWriterMode && (
                            <>
                                <li className="nav-item">
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
                                        {/* เส้นคั่นแนวตั้งสีชมพู (ตรงตามภาพตัวอย่าง) */}
                                        <li className="nav-item nav-item-divider-container">
                                            <span className="nav-menu-divider"></span>
                                        </li>

                                        {/* เมนูย่อยสีชมพูเรียงขยายออกทางขวา */}
                                        <li className="nav-item">
                                            <button
                                                className="nav-menu-btn--pink"
                                                onClick={() => handleNovelMenu("chapters")}
                                            >
                                                จัดการตอน
                                            </button>
                                        </li>

                                        <li className="nav-item">
                                            <button
                                                className="nav-menu-btn--pink"
                                                onClick={() => handleNovelMenu("write")}
                                            >
                                                เขียนเนื้อหา
                                            </button>
                                        </li>

                                        <li className="nav-item">
                                            <button
                                                className="nav-menu-btn--pink"
                                                onClick={() => handleNovelMenu("tree")}
                                            >
                                                โครงสร้างเนื้อเรื่อง
                                            </button>
                                        </li>
                                    </>
                                )}
                            </>
                        )}
                    </ul>

                    {/* ───────────────────── */}
                    {/* Right */}
                    {/* ───────────────────── */}
                    <div className="navbar__right">

                        {/* ช่องค้นหา แสดงเฉพาะเมื่อนักเขียนสลับไปโหมดนักอ่าน */}
                        {!isWriterMode && (
                            <div className={`navbar__search ${searchFocused ? "navbar__search--focused" : ""}`} style={{ position: "relative" }}>
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
                                    onBlur={() => setTimeout(() => setSearchFocused(false), 220)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSearchSubmit(searchValue);
                                        }
                                    }}
                                />

                                {/* หน้าต่างป๊อปอัปผลการค้นหาด่วน (Search Dropdown Popover) */}
                                {searchFocused && (
                                    <div className="search-overlay-dropdown" onMouseDown={(e) => e.preventDefault()}>
                                        
                                        {searchValue.trim() !== "" ? (
                                            /* ค้นหาคำแบบเรียลไทม์ */
                                            <div className="search-overlay-section">
                                                <h4 className="search-overlay-title">นิยายที่เกี่ยวข้อง</h4>
                                                <div className="search-overlay-matching-list">
                                                    {matchingNovels.length === 0 ? (
                                                        <div style={{ padding: "14px 0", color: "#94a3b8", fontSize: "0.88rem", textAlign: "center" }}>ไม่พบนิยายที่เกี่ยวข้อง</div>
                                                    ) : (
                                                        matchingNovels.map((novel, idx) => {
                                                            const rawCats = novel.categories || novel.Categories || [];
                                                            const cleanCats = rawCats.map(c => typeof c === "string" ? c : (c.name || c.title)).slice(0, 2).join(", ");
                                                            const chapterCount = novel.chapters_count || (novel.chapters ? novel.chapters.length : 0) || 0;
                                                            
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
                                                                            <img src={(novel.cover_image || novel.coverImage).replace("http://minio:9000", "http://localhost:9000")} alt="" />
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
                                                
                                                <div 
                                                    className="search-overlay-footer-btn"
                                                    onClick={() => handleSearchSubmit(searchValue)}
                                                >
                                                    ดูผลลัพธ์ทั้งหมดสำหรับ "{searchValue}"
                                                </div>
                                            </div>
                                        ) : (
                                            /* ช่องค้นหาว่างเปล่า -> แสดงประวัติและยอดนิยม */
                                            <>
                                                {/* 1. ค้นหาล่าสุด */}
                                                {recentSearches.length > 0 && (
                                                    <div className="search-overlay-section">
                                                        <h4 className="search-overlay-title">🕒 ค้นหาล่าสุด</h4>
                                                        <div className="search-overlay-recent-list">
                                                            {recentSearches.map((item, idx) => (
                                                                <div key={idx} className="search-overlay-recent-item">
                                                                    <span className="recent-text" onClick={() => { setSearchValue(item); handleSearchSubmit(item); }}>
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

                                                {/* 2. กำลังเป็นที่นิยม */}
                                                {popularNovels.length > 0 && (
                                                    <div className="search-overlay-section">
                                                        <h4 className="search-overlay-title">🔥 กำลังเป็นที่นิยม</h4>
                                                        <div className="search-overlay-popular-list">
                                                            {popularNovels.map((novel, idx) => {
                                                                const views = novel.views || novel.view_count || 0;
                                                                const formattedViews = views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views;
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
                                                                            <span className="popular-meta">✍️ {novel.pen_name || novel.penName || "ไม่ระบุ"} • 👁️ {formattedViews} ยอดอ่าน</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 3. สำรวจหมวดหมู่ */}
                                                {overlayCategories.length > 0 && (
                                                    <div className="search-overlay-section">
                                                        <h4 className="search-overlay-title">🗂️ สำรวจหมวดหมู่</h4>
                                                        <div className="search-overlay-category-list">
                                                            {overlayCategories.map((cat, idx) => (
                                                                <button 
                                                                    key={idx}
                                                                    type="button" 
                                                                    className="search-overlay-cat-chip"
                                                                    onClick={() => {
                                                                        setSearchFocused(false);
                                                                        navigate(`/categories`);
                                                                        window.dispatchEvent(new CustomEvent("search-change", { detail: "" }));
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

                        {/* ───────── Profile ───────── */}
                        <div className="nav-profile-container">

                            <button
                                className="nav-profile-trigger"
                                onClick={() =>
                                    setIsDropdownOpen(
                                        !isDropdownOpen
                                    )
                                }
                            >
                                <img
                                    src={
                                        userData.pic_profile ||
                                        "https://api.dicebear.com/7.x/bottts/svg?seed=storyverse"
                                    }
                                    alt="avatar"
                                    className="nav-avatar-img"
                                />
                            </button>

                            {isDropdownOpen && (
                                <div className="nav-dropdown">

                                    <div className="nav-dropdown__user-info">
                                        <p className="nav-dropdown__status">
                                            {userData.role || "ผู้ใช้"}
                                        </p>

                                        <p className="nav-dropdown__user-id">
                                            {userData.username ||
                                                userData.email}
                                        </p>
                                    </div>

                                    <hr className="nav-dropdown__divider" />

                                    <button
                                        className="nav-dropdown__logout-btn"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setShowLogoutModal(true);
                                        }}
                                    >
                                        🚪 ออกจากระบบ
                                    </button>

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* ───────────────────────── */}
            {/* Novel Popup */}
            {/* ───────────────────────── */}
            {showNovelPopup && (
                <div
                    className="novel-popup-overlay"
                    onClick={() =>
                        setShowNovelPopup(false)
                    }
                >
                    <div
                        className="novel-popup"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* Header */}
                        <div className="novel-popup__header">
                            <div>
                                <h3>เลือกนิยาย</h3>

                                <p>
                                    เลือกนิยายที่ต้องการแก้ไข
                                </p>
                            </div>

                            <button
                                className="novel-popup__close"
                                onClick={() =>
                                    setShowNovelPopup(false)
                                }
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search */}
                        <div className="novel-popup__search-wrap">

                            <span className="novel-popup__search-icon">
                                🔍
                            </span>

                            <input
                                type="text"
                                placeholder="ค้นหาชื่อนิยายที่ต้องการแก้ไข..."
                                value={searchNovel}
                                onChange={(e) =>
                                    setSearchNovel(e.target.value)
                                }
                                className="novel-popup__search"
                            />

                        </div>

                        {/* List */}
                        <div className="novel-popup__list">

                            {filteredNovels.length === 0 ? (
                                <div className="novel-popup__empty">

                                    <div className="novel-popup__empty-icon">
                                        📖
                                    </div>

                                    <div>
                                        ไม่พบนิยาย
                                    </div>

                                </div>
                            ) : (
                                filteredNovels.map((novel) => {
                                    const isActive =
                                        selectedNovel &&
                                        (
                                            selectedNovel.id ||
                                            selectedNovel.novel_id
                                        ) ===
                                        (
                                            novel.id ||
                                            novel.novel_id
                                        );

                                    return (
                                        <button
                                            key={
                                                novel.id ||
                                                novel.novel_id
                                            }
                                            className={`novel-popup__item ${isActive
                                                ? "novel-popup__item--active"
                                                : ""
                                                }`}
                                            onClick={() =>
                                                handleSelectNovel(novel)
                                            }
                                        >

                                            {/* Cover */}
                                            <div className="novel-popup__cover">

                                                {novel.cover_image ? (
                                                    <img
                                                        src={novel.cover_image.replace(
                                                            "http://minio:9000",
                                                            "http://localhost:9000"
                                                        )}
                                                        alt=""
                                                    />
                                                ) : (
                                                    "📖"
                                                )}

                                            </div>

                                            {/* Info */}
                                            <div className="novel-popup__info">

                                                <div className="novel-popup__title">
                                                    {novel.title}
                                                </div>

                                                <div className="novel-popup__meta">
                                                    {getNovelStatusInfo(novel).label}
                                                </div>

                                                {isActive && (
                                                    <div
                                                        style={{
                                                            marginTop: "8px",
                                                            background:
                                                                "#ffe4f1",
                                                            color: "#d63384",
                                                            padding:
                                                                "6px 10px",
                                                            borderRadius:
                                                                "999px",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            width: "fit-content",
                                                        }}
                                                    >
                                                        ✨ กำลังแก้ไขนิยายเรื่องนี้อยู่
                                                    </div>
                                                )}

                                            </div>

                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ยืนยันการออกจากระบบสำหรับนักเขียน */}
            {showLogoutModal && ReactDOM.createPortal(
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                    backgroundColor: "rgba(17, 24, 39, 0.45)",
                    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                    display: "flex", justifyContent: "center", alignItems: "center",
                    zIndex: 999999, padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff", width: "100%", maxWidth: "400px",
                        borderRadius: "24px",
                        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)",
                        padding: "28px 24px 24px", textAlign: "center",
                        border: "1px solid rgba(255, 255, 255, 0.8)",
                        display: "flex", flexDirection: "column", alignItems: "center"
                    }}>
                        <div style={{
                            width: "60px", height: "60px", borderRadius: "50%",
                            background: "#fff1f2", color: "#e11d48",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "28px", marginBottom: "16px",
                            boxShadow: "0 4px 12px rgba(225, 29, 72, 0.15)"
                        }}>
                            🚪
                        </div>
                        <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px 0" }}>
                            ยืนยันการออกจากระบบ
                        </h3>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px 0", lineHeight: "1.5" }}>
                            คุณต้องการออกจากระบบบัญชีนี้ใช่หรือไม่?
                        </p>
                        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                style={{
                                    flex: 1, padding: "11px", borderRadius: "12px",
                                    border: "1.5px solid #e2e8f0", background: "#ffffff",
                                    color: "#475569", fontSize: "14px", fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    setShowLogoutModal(false);
                                    handleLogout(e);
                                }}
                                style={{
                                    flex: 1, padding: "11px", borderRadius: "12px",
                                    border: "none", background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                                    color: "#ffffff", fontSize: "14px", fontWeight: "700",
                                    cursor: "pointer", boxShadow: "0 4px 14px rgba(225, 29, 72, 0.3)"
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

export default Navbarwriter;