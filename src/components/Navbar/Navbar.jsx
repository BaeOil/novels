import React, { useState, useEffect } from "react";
import "./Navbar.css";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className={`nav-header ${isScrolled ? "nav-sticky" : ""}`}>
            <div className="nav-container">
                {/* ส่วนโลโก้ตามแบบในรูป */}
                <div className="nav-logo">
                    <img src="/logo192.png" alt="Logo" className="logo-img" />
                    <div className="navbar__logo-text">
                        <span className="navbar__logo-story">Story</span>
                        <span className="navbar__logo-verse"> Verse</span>
                        <span className="navbar__logo-mode">Reader Mode</span>
                    </div>
                </div>

                {/* เมนูหลัก */}
                <ul className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
                    <li className="nav-item active"><a href="/">หน้าแรก</a></li>
                    <li className="nav-item"><a href="/category">หมวดหมู่</a></li>
                    <li className="nav-item"><a href="/bookshelf">ชั้นหนังสือ</a></li>
                    <li className="nav-item"><a href="/history">ประวัติการอ่าน</a></li>
                    <li className="nav-item"><a href="/create">สร้างนิยาย</a></li>
                </ul>

                {/* ส่วนขวา: ค้นหาและโปรไฟล์ */}
                <div className="navbar__right">
                    <div className={`navbar__search ${searchFocused ? "navbar__search--focused" : ""}`}>
                        <svg
                            className="navbar__search-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                        >
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
                            aria-label="ค้นหานิยาย"
                        />
                    </div>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;