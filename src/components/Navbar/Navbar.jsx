import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import "./Navbar.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── helper: active check รองรับ trailing slash และ query string ──
const isActive = (pathname, target) => {
    if (target === "/") return pathname === "/";
    return pathname === target || pathname.startsWith(target + "/") || pathname.startsWith(target + "?");
};

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ── refs ──────────────────────────────────────────────────────
    const searchRef = useRef(null);   // wrapper ของ search zone (input + dropdown)
    const dropdownRef = useRef(null);  // wrapper ของ profile dropdown

    // ── ui states ─────────────────────────────────────────────────
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);

    // ── search data ───────────────────────────────────────────────
    const [recentSearches, setRecentSearches] = useState(() => {
        try { return JSON.parse(localStorage.getItem("recent_searches") || "[]"); }
        catch { return []; }
    });
    const [popularNovels, setPopularNovels] = useState([]);
    const [categories, setCategories] = useState([]);
    const [allNovels, setAllNovels] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // ── auth states ───────────────────────────────────────────────
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [userData, setUserData] = useState({ username: "", email: "", pic_profile: "", role: "" });
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // ── derived ───────────────────────────────────────────────────
    const isWriterMode = location.pathname.startsWith("/writer");

    // ── fetch search overlay data (public — no token needed) ──────
    useEffect(() => {
        const run = async () => {
            try {
                const [novelRes, catRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/novels`),
                    fetch(`${API_BASE_URL}/categories`),
                ]);
                if (novelRes.ok) {
                    const d = await novelRes.json();
                    const list = d.novels || d.data?.novels || d.data || [];
                    const published = list.filter(
                        n => n.status?.toLowerCase() === "published" || n.is_published === true
                    );
                    setAllNovels(published);
                    const sorted = [...published].sort(
                        (a, b) => (b.views || b.view_count || 0) - (a.views || a.view_count || 0)
                    );
                    setPopularNovels(sorted.slice(0, 5));
                }
                if (catRes.ok) {
                    const d = await catRes.json();
                    setCategories((d.categories || d.data || []).slice(0, 5));
                }
            } catch (e) {
                console.warn("Failed to fetch search overlay data:", e);
            }
        };
        run();
    }, []);

    // ── init auth + scroll + notifications ────────────────────────
    useEffect(() => {
        // scroll
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);

        // restore user from cache
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            try {
                const p = JSON.parse(savedUser);
                setUserData(prev => ({
                    ...prev,
                    username: p.username || prev.username,
                    email: p.email || prev.email,
                    pic_profile: p.pic_profile || prev.pic_profile,
                    role: p.role || prev.role,
                }));
            } catch { /* ignore */ }
        }

        const token = localStorage.getItem("token");
        if (token) {
            setIsLoggedIn(true);
            fetchUserData(token);
            fetchUnreadCount(token);
        } else {
            setUnreadCount(0);
        }

        // notification refresh via custom event
        const refreshNotifications = () => {
            const t = localStorage.getItem("token");
            if (t) fetchUnreadCount(t);
        };
        window.addEventListener("notifications-updated", refreshNotifications);

        // SSE stream — only when logged in
        let eventSource = null;
        if (token) {
            eventSource = new EventSource(
                `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`
            );
            eventSource.onmessage = refreshNotifications;
        }

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("notifications-updated", refreshNotifications);
            eventSource?.close();
        };
    }, []);
    useEffect(() => {
        const handleAuthChange = () => {
            const token = localStorage.getItem("token");

            if (token) {
                setIsLoggedIn(true);
                fetchUserData(token);
                fetchUnreadCount(token);
            } else {
                setIsLoggedIn(false);
                setUnreadCount(0);
            }
        };

        window.addEventListener("auth-change", handleAuthChange);

        return () => {
            window.removeEventListener("auth-change", handleAuthChange);
        };
    }, []);
    // ── click-outside: ปิด search dropdown ────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── click-outside: ปิด profile dropdown ───────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── close mobile menu on route change ─────────────────────────
    useEffect(() => {
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
    }, [location.pathname]);

    // ── fetch helpers ─────────────────────────────────────────────
    const fetchUnreadCount = async (token) => {
        if (!token) { setUnreadCount(0); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: "include",
            });
            if (res.ok) {
                const d = await res.json();
                setUnreadCount(Number(d?.unread_count || 0));
            }
        } catch (err) {
            console.warn("Failed to fetch notification count:", err);
        }
    };

    const fetchUserData = async (token) => {
        setIsLoadingUser(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error(`${response.status}`);
            const d = await response.json();
            if (d.user) {
                setUserData({
                    username: d.user.username || "",
                    email: d.user.email || "",
                    pic_profile: d.user.pic_profile || "",
                    role: d.user.role || "",
                });
                localStorage.setItem("user", JSON.stringify(d.user));
                localStorage.setItem("user_email", d.user.email);
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
            const savedEmail = localStorage.getItem("user_email");
            if (savedEmail) setUserData(prev => ({ ...prev, email: savedEmail }));
        } finally {
            setIsLoadingUser(false);
        }
    };

    // ── search ────────────────────────────────────────────────────
    const matchingNovels = useMemo(() => {
        if (!searchValue.trim()) return [];
        const q = searchValue.toLowerCase().trim();
        return allNovels.filter(n =>
            (n.title && n.title.toLowerCase().includes(q)) ||
            (n.pen_name && n.pen_name.toLowerCase().includes(q)) ||
            (n.penName && n.penName.toLowerCase().includes(q))
        ).slice(0, 3);
    }, [searchValue, allNovels]);

    const highlightText = (text, highlight) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, "gi"));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase()
                        ? <span key={i} style={{ color: "#db2777", fontWeight: 800 }}>{part}</span>
                        : part
                )}
            </span>
        );
    };

    const handleSearchSubmit = (query) => {
        if (!query.trim()) return;
        const q = query.trim();
        setRecentSearches(prev => {
            const next = [q, ...prev.filter(x => x !== q)].slice(0, 5);
            localStorage.setItem("recent_searches", JSON.stringify(next));
            return next;
        });
        window.dispatchEvent(new CustomEvent("search-change", { detail: q }));
        navigate(`/search?search=${encodeURIComponent(q)}`);
        setSearchFocused(false);
        setSearchValue("");
    };

    const handleDeleteRecentSearch = (e, q) => {
        e.preventDefault();
        e.stopPropagation();
        setRecentSearches(prev => {
            const next = prev.filter(x => x !== q);
            localStorage.setItem("recent_searches", JSON.stringify(next));
            return next;
        });
    };

    // ── logout ────────────────────────────────────────────────────
    const handleLogout = async (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        try {
            const token = localStorage.getItem("token");
            if (token) {
                await fetch(`${API_BASE_URL}/api/logout`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }).catch(() => { });
            }
        } finally {
            ["token", "refresh_token", "user", "user_email", "selectedNovel"].forEach(k =>
                localStorage.removeItem(k)
            );
            setIsLoggedIn(false);
            setIsDropdownOpen(false);
            setUserData({ username: "", email: "", pic_profile: "", role: "" });
            setUnreadCount(0);
            window.dispatchEvent(new Event("auth-change"));
            navigate("/", { replace: true });
            window.location.replace("/");
        }
    };

    // ─────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────
    return (
        <>
            <nav className={`nav-header ${isScrolled ? "nav-sticky" : ""} ${isWriterMode ? "nav-header--writer" : ""}`}>
                <div className="nav-container">

                    {/* ── โลโก้ ── */}
                    <div className="nav-logo" onClick={() => navigate(isWriterMode ? "/writer/dashboard" : "/")}>
                        <img src="/logo192.png" alt="Logo" className="logo-img" />
                        <div className="navbar__logo-text">
                            <span className="navbar__logo-story">Story</span>
                            <span className="navbar__logo-verse">Verse</span>
                            <span className="navbar__logo-mode">
                                {isWriterMode ? "Writer Mode" : "Reader Mode"}
                            </span>
                        </div>
                    </div>

                    {/* ── เมนูกลาง ── */}
                    <ul className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
                        {isWriterMode ? (
                            <>
                                <li className={`nav-item ${isActive(location.pathname, "/writer/dashboard") ? "active" : ""}`}>
                                    <Link to="/writer/dashboard">Dashboard นักเขียน</Link>
                                </li>
                                <li className={`nav-item ${isActive(location.pathname, "/writer/create") ? "active" : ""}`}>
                                    <Link to="/writer/create">สร้างเรื่องใหม่</Link>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className={`nav-item ${isActive(location.pathname, "/") ? "active" : ""}`}>
                                    <Link to="/">หน้าแรก</Link>
                                </li>
                                <li className={`nav-item ${isActive(location.pathname, "/categories") ? "active" : ""}`}>
                                    <Link to="/categories">หมวดหมู่</Link>
                                </li>
                                <li className={`nav-item ${isActive(location.pathname, "/bookshelf") ? "active" : ""}`}>
                                    <Link to="/bookshelf">ชั้นหนังสือ</Link>
                                </li>
                                <li className={`nav-item ${isActive(location.pathname, "/history") ? "active" : ""}`}>
                                    <Link to="/history">ประวัติการอ่าน</Link>
                                </li>
                                <li className={`nav-item ${isActive(location.pathname, "/following-writers") ? "active" : ""}`}>
                                    <Link to="/following-writers">นักเขียนที่ติดตาม</Link>
                                </li>
                                {/* แสดงเฉพาะ: ล็อกอินแล้ว + ยังไม่ได้เป็นนักเขียน */}
                                {isLoggedIn && userData.role !== "writer" && (
                                    <li className={`nav-item ${isActive(location.pathname, "/registerwriter") ? "active" : ""}`}>
                                        <Link to="/registerwriter">สมัครนักเขียน</Link>
                                    </li>
                                )}
                            </>
                        )}
                    </ul>

                    {/* ── ฝั่งขวา ── */}
                    <div className="navbar__right">

                        {/* ── กระดิ่ง: เฉพาะผู้ล็อกอิน ── */}
                        {isLoggedIn && (
                            <button
                                type="button"
                                className="navbar__notification-btn"
                                onClick={() => navigate("/notifications")}
                                aria-label="การแจ้งเตือน"
                            >
                                <Bell size={18} strokeWidth={2.2} />
                                {unreadCount > 0 && (
                                    <span className="navbar__notification-badge">{unreadCount}</span>
                                )}
                            </button>
                        )}

                        {/* ── ช่องค้นหา (search zone มี ref ครอบ) ── */}
                        <div
                            ref={searchRef}
                            className="navbar__search-zone"
                        >
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

                            {/* dropdown อยู่ภายใน search-zone ที่มี position:relative */}
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
                                                            .map(c => typeof c === "string" ? c : (c.name || c.title))
                                                            .slice(0, 2).join(", ");
                                                        const chapterCount =
                                                            novel.chapters_count ||
                                                            (novel.chapters ? novel.chapters.length : 0) || 0;
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
                                                                            src={(novel.cover_image || novel.coverImage)
                                                                                .replace("http://minio:9000", "http://localhost:9000")}
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
                                            <div
                                                className="search-overlay-footer-btn"
                                                onClick={() => handleSearchSubmit(searchValue)}
                                            >
                                                ดูผลลัพธ์ทั้งหมดสำหรับ "{searchValue}"
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* ค้นหาล่าสุด — แสดงทุก role */}
                                            {recentSearches.length > 0 && (
                                                <div className="search-overlay-section">
                                                    <h4 className="search-overlay-title">🕒 ค้นหาล่าสุด</h4>
                                                    <div className="search-overlay-recent-list">
                                                        {recentSearches.map((item, idx) => (
                                                            <div key={idx} className="search-overlay-recent-item">
                                                                <span
                                                                    className="recent-text"
                                                                    onClick={() => handleSearchSubmit(item)}
                                                                >
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

                                            {/* กำลังเป็นที่นิยม — แสดงทุก role */}
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

                                            {/* สำรวจหมวดหมู่ — แสดงทุก role */}
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
                        {/* ── END search zone ── */}

                        {/* ── ปุ่มสลับโหมด: เฉพาะผู้ล็อกอิน ── */}
                        {isLoggedIn && (
                            <div className="navbar__mode-switch-zone">
                                {isWriterMode ? (
                                    <button
                                        className="nav-switch-btn nav-switch-btn--reader"
                                        onClick={() => navigate("/")}
                                    >
                                        📖 สลับไปโหมดนักอ่าน
                                    </button>
                                ) : (
                                    userData.role === "writer" && (
                                        <button
                                            className="nav-switch-btn nav-switch-btn--writer"
                                            onClick={() => navigate("/writer/dashboard")}
                                        >
                                            ✍️ สตูดิโอนักเขียน
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        {/* ── โซน auth / profile ── */}
                        <div className="navbar__auth-zone" ref={dropdownRef}>
                            {isLoggedIn ? (
                                <div className="nav-profile-container">
                                    <button
                                        type="button"
                                        className="nav-profile-trigger"
                                        onClick={() => setIsDropdownOpen(prev => !prev)}
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

                                            {/* ทางลัดใน dropdown */}
                                            <button
                                                type="button"
                                                className="nav-dropdown__link-btn"
                                                onClick={() => { setIsDropdownOpen(false); navigate("/profile"); }}
                                            >
                                                👤 โปรไฟล์ของฉัน
                                            </button>
                                            <button
                                                type="button"
                                                className="nav-dropdown__link-btn"
                                                onClick={() => { setIsDropdownOpen(false); navigate("/settings"); }}
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
                    {/* ── END navbar__right ── */}

                </div>
            </nav>

            {/* ── Modal ยืนยัน logout ── */}
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