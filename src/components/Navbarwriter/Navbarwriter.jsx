import React, { useEffect, useMemo, useState } from "react";
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
                // ✨ แกับั๊ก: ดึงข้อมูลหา scene_id จริงๆ ของนิยายเรื่องนี้ ไม่ฮาร์ดโค้ดเป็น 1 แล้ว
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                // 1. ดึงตอน (Chapters) ทั้งหมดของนิยายเรื่องนี้มาเช็ค
                const chapterRes = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters`, { headers });
                const chapterData = await chapterRes.json();
                const chapters = chapterData?.data?.chapters || chapterData?.chapters || chapterData?.data || [];

                 if (!chapters.length) {
                     window.location.href = `/writer/${novelId}/scene/empty`;
                     return;
                 }

                const firstChapterId = chapters[0].id || chapters[0].chapter_id || chapters[0].ChapterID;

                // 2. ดึงฉาก (Scenes) ทั้งหมดที่อยู่ในตอนแรก
                const sceneRes = await fetch(`${API_BASE_URL}/chapters/${firstChapterId}/scenes`, { headers });
                const sceneData = await sceneRes.json();
                const scenes = sceneData?.data?.scenes || sceneData?.scenes || sceneData?.data || [];

                 if (!scenes.length) {
                     window.location.href = `/writer/${novelId}/scene/empty`;
                     return;
                 }

                // 3. เอา ID ของฉากแรกสุดมาใช้
                const firstSceneId = scenes[0].id || scenes[0].scene_id || scenes[0].SceneID;

                // 🚀 พาผู้ใช้งานไปที่ฉากแรกสุดของนิยายเรื่องที่เลือกจริงๆ
                window.location.href = `/writer/${novelId}/scene/${firstSceneId}`;
            } catch (err) {
                console.error("ดึงข้อมูลฉากแรกล้มเหลว:", err);
                window.location.href = `/writer/${novelId}/scene/empty`; // ถ้าพังให้กลับไปหน้าแจ้งเตือนไม่มีตอน
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
                        onClick={() =>
                            navigate(
                                isWriterMode
                                    ? "/writer/dashboard"
                                    : "/"
                            )
                        }
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
                            onClick={() =>
                                navigate("/writer/dashboard")
                            }
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
                                    <Link to="/writer/dashboard">
                                        Dashboard
                                    </Link>
                                </li>

                                <li className="nav-item">
                                    <button
                                        className="nav-menu-btn"
                                        onClick={() =>
                                            handleNovelMenu("chapters")
                                        }
                                    >
                                        จัดการตอน
                                    </button>
                                </li>

                                <li className="nav-item">
                                    <button
                                        className="nav-menu-btn"
                                        onClick={() =>
                                            handleNovelMenu("write")
                                        }
                                    >
                                        เขียนเนื้อหา
                                    </button>
                                </li>

                                <li className="nav-item">
                                    <button
                                        className="nav-menu-btn"
                                        onClick={() =>
                                            handleNovelMenu("tree")
                                        }
                                    >
                                        โครงสร้างเนื้อเรื่อง
                                    </button>
                                </li>

                                <li className="nav-item">
                                    <Link to="/writer/create">
                                        สร้างนิยาย
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>

                    {/* ───────────────────── */}
                    {/* Right */}
                    {/* ───────────────────── */}
                    <div className="navbar__right">

                        {/* ───────── Selected Novel ───────── */}
                        {isWriterMode && (
                            <button
                                className="selected-novel-btn"
                                onClick={() => openNovelPopup()}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    background: selectedNovel ? "var(--pink-50)" : "#fff3cd",
                                    border: selectedNovel ? "1.5px solid var(--pink-300)" : "1.5px solid #ffc107",
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <span style={{
                                    display: "inline-block",
                                    width: "8px",
                                    height: "8px",
                                    background: selectedNovel ? "var(--pink-500)" : "#ffc107",
                                    borderRadius: "50%"
                                }}></span>
                                
                                <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--ink)" }}>
                                    {selectedNovel 
                                        ? `กำลังแก้ไข: ${selectedNovel.title}` 
                                        : "เลือกนิยายที่ต้องการแก้ไข"}
                                </span>
                                
                                <span style={{
                                    fontSize: "12px",
                                    fontWeight: "800",
                                    background: selectedNovel ? "var(--pink-500)" : "#ffc107",
                                    color: selectedNovel ? "var(--white)" : "var(--black)",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    marginLeft: "6px"
                                }}>
                                    เปลี่ยนเรื่อง
                                </span>
                            </button>
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
                                        onClick={(e) => handleLogout(e)}
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
        </>
    );
};

export default Navbarwriter;