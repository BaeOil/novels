import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbarwriter.css";

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

    // ─────────────────────────────────────
    // Auth
    // ─────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");

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
    const navigateToNovelPage = (novelId, target) => {
        if (target === "chapters") {
            window.location.href = `/writer/${novelId}/chapters`;
        }

        if (target === "write") {
            window.location.href = `/writer/${novelId}/scene/1`;
        }

        if (target === "tree") {
            window.location.href = `/writer/${novelId}/storytree`;
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
    const handleNovelMenu = (target) => {
        if (!selectedNovel) {
            openNovelPopup(target);
            return;
        }

        const novelId =
            selectedNovel.id || selectedNovel.novel_id;

        navigateToNovelPage(novelId, target);
    };

    // ─────────────────────────────────────
    // Logout
    // ─────────────────────────────────────
    const handleLogout = () => {
        localStorage.removeItem("token");

        localStorage.removeItem("selectedNovel");

        setSelectedNovel(null);

        setIsLoggedIn(false);

        navigate("/");
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
                                    <Link to="/category">
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
                                        Story Tree
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
                            >
                                <span className="selected-dot"></span>

                                <span className="selected-title">
                                    {selectedNovel?.title ||
                                        "เลือกนิยายที่กำลังแก้ไข"}
                                </span>

                                <span className="selected-arrow">
                                    ▾
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
                                        onClick={handleLogout}
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
                                                    {novel.status ===
                                                        "published"
                                                        ? "เผยแพร่"
                                                        : "ฉบับร่าง"}
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