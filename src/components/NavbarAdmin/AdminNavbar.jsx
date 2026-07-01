import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./AdminNavbar.css";
import {
    LayoutDashboard,
    Users,
    BadgeCheck,
    Flag,
    Shield,
    LogOut
} from "lucide-react";

const AdminNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [userData, setUserData] = useState({
        username: "Admin",
        email: "",
        pic_profile: "",
    });

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUserData((prev) => ({
                    ...prev,
                    username: parsedUser.username || prev.username,
                    email: parsedUser.email || prev.email,
                    pic_profile: parsedUser.pic_profile || prev.pic_profile,
                }));
            } catch (err) {
                console.warn("ไม่สามารถอ่านข้อมูลผู้ใช้จาก localStorage ได้", err);
            }
        }
    }, []);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedNovel");
        navigate("/");
        window.location.href = "/";
    };

    return (
        <nav className={`admin-nav-header ${isScrolled ? "admin-nav-sticky" : ""}`}>
            <div className="admin-nav-container">
                <div
                    className="admin-nav-logo"
                    onClick={() => navigate("/admin/dashboard")}
                >
                    <img src="/logo192.png" alt="Logo" className="logo-img" />
                    <div className="admin-nav-logo-text">
                        <span className="admin-nav-logo-story">Story</span>
                        <span className="admin-nav-logo-verse">Verse</span>
                        <span className="admin-nav-logo-admin">Admin</span>
                    </div>
                </div>



                <ul className="admin-nav-menu">

                    <li className={`admin-nav-item ${isActive("/admin/dashboard") ? "admin-nav-item--active" : ""}`}>
                        <Link to="/admin/dashboard">
                            <LayoutDashboard size={18} strokeWidth={2} />
                            <span>Dashboard</span>
                        </Link>
                    </li>

                    <li className={`admin-nav-item ${isActive("/admin/users") ? "admin-nav-item--active" : ""}`}>
                        <Link to="/admin/users">
                            <Users size={18} strokeWidth={2} />
                            <span>จัดการผู้ใช้งาน</span>
                        </Link>
                    </li>

                    <li className={`admin-nav-item ${isActive("/admin/manage-users") ? "admin-nav-item--active" : ""}`}>
                        <Link to="/admin/manage-users">
                            <BadgeCheck size={18} strokeWidth={2} />
                            <span>อนุมัตินักเขียน</span>
                        </Link>
                    </li>

                    <li className={`admin-nav-item ${isActive("/admin/reports") ? "admin-nav-item--active" : ""}`}>
                        <Link to="/admin/reports">
                            <Flag size={18} strokeWidth={2} />
                            <span>รายงาน/แจ้งลบ</span>
                        </Link>
                    </li>

                </ul>

                <div className="admin-nav-right">
                    <div className="admin-role-pill">
                        <Shield size={16} />
                        <span>Admin</span>
                    </div>

                    <div className="admin-profile-container">
                        <button
                            type="button"
                            className="admin-profile-trigger"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-label="เมนูผู้ใช้งาน"
                        >
                            <img
                                src={
                                    userData.pic_profile ||
                                    "https://api.dicebear.com/7.x/bottts/svg?seed=storyverse-admin"
                                }
                                alt="avatar"
                            />
                        </button>

                        {isDropdownOpen && (
                            <div className="admin-dropdown">
                                <p className="admin-dropdown__name">{userData.username}</p>
                                <p className="admin-dropdown__email">
                                    {userData.email || "admin@storyverse.local"}
                                </p>
                                <button
                                    type="button"
                                    className="admin-dropdown__logout-btn"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={17} />
                                    <span>ออกจากระบบ</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default AdminNavbar;