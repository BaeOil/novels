import React, { useState, useEffect } from "react";
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
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [userData, setUserData] = useState({
        username: "",
        email: "",
        pic_profile: "",
        role: ""
    });
    const [isLoadingUser, setIsLoadingUser] = useState(false);

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
                            <li className={`nav-item ${location.pathname === "/registerwriter" ? "active" : ""}`}>
                                <Link to="/registerwriter">สมัครนักเขียน</Link>
                            </li>
                        </>
                    )}
                </ul>

                {/* ── ส่วนขวา: ช่องค้นหา และ โซนควบคุมโหมด/สิทธิ์ผู้ใช้ ── */}
                <div className="navbar__right">
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
                            onBlur={() => setSearchFocused(false)}
                        />
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
                                        <button type="button" className="nav-dropdown__logout-btn" onClick={(e) => handleLogout(e)}>
                                            🚪 ออกจากระบบ
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login-register" className="nav-login-btn">เข้าสู่ระบบ / สมัครสมาชิก</Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;