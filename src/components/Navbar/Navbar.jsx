import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
// 🎯 🟢 นำเข้า Link, useNavigate และ useLocation เพื่อทำระบบสลับโหมดแบบไร้รอยต่อ
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    
    // States สำหรับ Pop-up ผลการค้นหาด่วน
    const [recentSearches, setRecentSearches] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("recent_searches") || "[]");
        } catch {
            return [];
        }
    });
    const [popularNovels, setPopularNovels] = useState([]);
    const [categories, setCategories] = useState([]);
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
                    setCategories(list.slice(0, 5));
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

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [userData, setUserData] = useState({
        username: "",
        email: "",
        pic_profile: "",
        role: ""
    });
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // 🎯 🟢 ตรวจสอบว่าปัจจุบัน URL อยู่ในฝั่งโหมดนักเขียนหรือไม่
    const isWriterMode = location.pathname.startsWith("/writer/dashboard") || 
                         location.pathname.startsWith("/writer") || 
                         location.pathname.startsWith("/writer/storytree") || 
                         location.pathname.startsWith("/writer/create");

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        
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

        if (token) {
            setIsLoggedIn(true);
            fetchUserData(token);
        }

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const fetchUserData = async (token) => {
        setIsLoadingUser(true);
        try {
            console.log("🛰️ Fetching user info from /api/users...");
            const res = await fetch('/api/users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`API Error: ${res.status} - ${errorText}`);
            }

            const data = await res.json();
            if (data.user) {
                setUserData({
                    username: data.user.username || "",
                    email: data.user.email || "",
                    pic_profile: data.user.pic_profile || "",
                    role: data.user.role || ""
                });
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("user_email", data.user.email);
            }
        } catch (err) {
            console.error("❌ Error fetching user data:", err);
            const savedEmail = localStorage.getItem("user_email");
            if (savedEmail) {
                setUserData(prev => ({ ...prev, email: savedEmail }));
            }
        } finally {
            setIsLoadingUser(false);
        }
    };

    const handleSearchSubmit = (query) => {
        if (!query.trim()) return;
        const q = query.trim();
        
        // บันทึกคำค้นหาล่าสุด (ไม่ซ้ำ และเก็บไม่เกิน 5 คำ)
        setRecentSearches(prev => {
            const filtered = prev.filter(item => item !== q);
            const next = [q, ...filtered].slice(0, 5);
            localStorage.setItem("recent_searches", JSON.stringify(next));
            return next;
        });

        window.dispatchEvent(new CustomEvent("search-change", { detail: q }));
        navigate(`/search?search=${encodeURIComponent(q)}`);
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

    const handleLogout = async (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        console.log("🚪 Logout clicked");

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
            localStorage.removeItem("user_email");
            localStorage.removeItem("selectedNovel");

            setIsLoggedIn(false);
            setIsDropdownOpen(false);
            setUserData({ username: "", email: "", pic_profile: "", role: "" });

            navigate("/", { replace: true });
            window.location.replace("/");
        }
    };

    return (
        <>
        <nav className={`nav-header ${isScrolled ? "nav-sticky" : ""} ${isWriterMode ? "nav-header--writer" : ""}`}>
            <div className="nav-container">
                {/* ── ส่วนโลโก้: อัปเดตสลับข้อความ Reader/Writer Mode ตามพิกัด URL ── */}
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

                {/* ── เมนูหลัก: ปรับเป็นสไตล์สลับร่าง ── */}
                <ul className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
                    {isWriterMode ? (
                        <>
                            {/* เมนูที่ปรากฏเมื่ออยู่ในโหมดนักเขียน */}
                            <li className={`nav-item ${location.pathname === "/writer/dashboard" ? "active" : ""}`}>
                                <Link to="/writer/dashboard">Dashboard นักเขียน</Link>
                            </li>
                            <li className={`nav-item ${location.pathname === "/writer/create" ? "active" : ""}`}>
                                <Link to="/writer/create">สร้างเรื่องใหม่</Link>
                            </li>
                        </>
                    ) : (
                        <>
                            {/* เมนูที่ปรากฏเมื่ออยู่ในโหมดนักอ่านตามปกติ */}
                            <li className={`nav-item ${location.pathname === "/" ? "active" : ""}`}>
                                <Link to="/">หน้าแรก</Link>
                            </li>
                            <li className={`nav-item ${location.pathname === "/categories" ? "active" : ""}`}>
                                <Link to="/categories">หมวดหมู่</Link>
                            </li>
                            <li className={`nav-item ${location.pathname === "/bookshelf" ? "active" : ""}`}>
                                <Link to="/bookshelf">ชั้นหนังสือ</Link>
                            </li>
                            <li className={`nav-item ${location.pathname === "/history" ? "active" : ""}`}>
                                <Link to="/history">ประวัติการอ่าน</Link>
                            </li>
                            <li className={`nav-item ${location.pathname === "/following-writers" ? "active" : ""}`}>
                                <Link to="/following-writers">นักเขียนที่ติดตาม</Link>
                            </li>
                            {isLoggedIn && (
                                <li className={`nav-item ${location.pathname === "/registerwriter" ? "active" : ""}`}>
                                    <Link to="/registerwriter">สมัครนักเขียน</Link>
                                </li>
                            )}
                        </>
                    )}
                </ul>

                {/* ── ส่วนขวา: ช่องค้นหา และ โซนควบคุมโหมด/สิทธิ์ผู้ใช้ ── */}
                <div className="navbar__right">
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

                    {/* 🎯 🟢 ปุ่มสลับโหมดเชื่อมมิติ (Switch Mode Button) */}
                    {isLoggedIn && (
                        <div className="navbar__mode-switch-zone">
                            {isWriterMode ? (
                                <button className="nav-switch-btn nav-switch-btn--reader" onClick={() => navigate("/") }>
                                    📖 สลับไปโหมดนักอ่าน
                                </button>
                            ) : (
                                // แสดงปุ่มสตูดิโอเฉพาะผู้ที่มี role = 'writer'
                                userData.role === 'writer' && (
                                    <button className="nav-switch-btn nav-switch-btn--writer" onClick={() => navigate("/writer/dashboard") }>
                                        ✍️ สตูดิโอนักเขียน
                                    </button>
                                )
                            )}
                        </div>
                    )}

                    {/* ส่วนจัดการตู้เซฟข้อมูลผู้ใช้งาน */}
                    <div className="navbar__auth-zone">
                        {isLoggedIn ? (
                            <div className="nav-profile-container">
                                <button 
                                    type="button"
                                    className="nav-profile-trigger"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    aria-label="เมนูผู้ใช้งาน"
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
                                        
                                        {/* 🎯 ทางลัดเพิ่มเติมภายใน Dropdown โปรไฟล์ */}
                                       
                                        
                                        <hr className="nav-dropdown__divider" />
                                        <button type="button" className="nav-dropdown__logout-btn" onClick={() => { setIsDropdownOpen(false); setShowLogoutModal(true); }}>
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

        {/* Modal ยืนยันการออกจากระบบสำหรับนักอ่าน */}
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
                        คุณต้องการออกจากระบบบัญชีผู้ใช้งานนี้ใช่หรือไม่?
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

export default Navbar;