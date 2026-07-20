import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const AdminNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
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

    const handleLogout = async (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        console.log("🚪 Admin logout clicked");

        try {
            const token = localStorage.getItem("token");
            if (token) {
                await fetch(`${API_BASE_URL}/api/logout`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }).catch((err) => console.warn("Logout API warning:", err));
            }
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            localStorage.removeItem("user_email");
            localStorage.removeItem("selectedNovel");
            setIsDropdownOpen(false);
            navigate("/", { replace: true });
            window.location.replace("/");
        }
    };

    return (
        <>
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
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setShowLogoutModal(true);
                                    }}
                                >
                                    <LogOut size={17} />
                                    <span>ออกจากระบบ</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal ยืนยันการออกจากระบบสำหรับแอดมิน */}
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
                            คุณต้องการออกจากระบบบัญชีผู้ดูแลระบบใช่หรือไม่?
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
        </nav>
        </>
    );
};

export default AdminNavbar;