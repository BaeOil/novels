import React, { useState, useEffect } from "react";
import {
    Search,
    X,
    User,
    Calendar,
    ExternalLink,
    Loader2,
    AlertTriangle,
    Inbox,
} from "lucide-react";
import "./AdminReportsDashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ป้ายกำกับแท็บกรอง (ค่า key ไว้กรองข้อมูล, label ไว้แสดงผลเป็นภาษาไทย)
const FILTER_TABS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "pending", label: "รอตรวจสอบ" },
    { key: "resolved", label: "อนุมัติแล้ว" },
    { key: "rejected", label: "ปฏิเสธแล้ว" },
];

// ข้อความสถานะ + คลาส badge ที่ตรงกับ CSS ที่มีอยู่แล้ว (badge-pending/approved/rejected)
const STATUS_INFO = {
    pending: { label: "รอตรวจสอบ", className: "badge-pending" },
    appeal_pending: { label: "รอตรวจสอบ", className: "badge-pending" },
    resolved: { label: "อนุมัติแล้ว", className: "badge-approved" },
    rejected: { label: "ปฏิเสธแล้ว", className: "badge-rejected" },
};

// ข้อความตอนไม่มีรายการ แยกตามแท็บที่กำลังดู
const EMPTY_MESSAGE = {
    all: "ยังไม่มีรายการรายงานหรือคำขอปลดแบนในระบบ",
    pending: "ไม่มีรายการที่รอตรวจสอบในตอนนี้",
    resolved: "ไม่มีรายการที่อนุมัติแล้ว",
    rejected: "ไม่มีรายการที่ถูกปฏิเสธ",
};

// ⚠️ Safety-net: บาง reason ที่บันทึกไว้เก่าอาจมี HTML tag ติดมาจากฟอร์ม rich-text
// ต้นตอที่แท้จริงควรแก้ที่ฟอร์มกรอกไม่ให้เซฟ HTML ลง DB ตั้งแต่แรก
// ฟังก์ชันนี้แค่ตัด tag ออกตอนแสดงผล ป้องกันข้อมูลเก่าที่หลุดมาแล้วดูเพี้ยน
const stripHtml = (text) => {
    if (!text) return text;
    return text.replace(/<[^>]*>/g, "").trim();
};

export default function AdminReportsDashboard() {
    const [filterTab, setFilterTab] = useState("pending"); // all, pending, resolved, rejected
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ---------- Review modal state ----------
    const [selectedReport, setSelectedReport] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        fetchReports();
    }, []);

    // 🟢 1. ดึงข้อมูลรายงานและคำขอปลดแบนจาก API
    const fetchReports = async () => {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/reports`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลรายการรายงานได้");

            const data = await res.json();
            const list = Array.isArray(data) ? data : (data?.reports ?? []);
            setReports(list);
        } catch (err) {
            console.error("Fetch reports error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 🟢 2. ฟังก์ชันหลักสำหรับยิง API อัปเดตสถานะ
    const handleUpdateStatus = async (report, newStatus) => {
        setActionBusy(true);
        setActionError("");
        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/reports/${report.report_id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || "อัปเดตสถานะไม่สำเร็จ");
            }

            // อัปเดตสถานะของรายการในตารางและดึงข้อมูลสดใหม่จาก Backend ถาวร
            setSelectedReport(null);
            await fetchReports();
        } catch (err) {
            console.error("Update failed:", err);
            setActionError(err.message || "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setActionBusy(false);
        }
    };

    // ---------- Modal handlers ----------
    const openReview = (report) => {
        setSelectedReport(report);
        setActionError("");
    };

    const closeModal = () => {
        if (actionBusy) return;
        setSelectedReport(null);
    };

    const pendingCount = reports.filter(r => r.status === "pending" || r.status === "appeal_pending").length;
    const resolvedCount = reports.filter(r => r.status === "resolved").length;
    const rejectedCount = reports.filter(r => r.status === "rejected").length;

    const filteredReports = filterTab === "all" ? reports : (
        filterTab === "pending" ? reports.filter(r => r.status === "pending" || r.status === "appeal_pending") :
        filterTab === "resolved" ? reports.filter(r => r.status === "resolved") :
        filterTab === "rejected" ? reports.filter(r => r.status === "rejected") : []
    );

    return (
        <div className="admin-reports-container">
          <div className="admin-reports-content">
            <div className="admin-reports-header">
                <h1 className="admin-title">ศูนย์จัดการการรายงานและขอปลดแบน</h1>
                <p className="admin-subtitle">รายการรายงานเนื้อหาและคำขอปลดแบนนิยายทั้งหมดในระบบ</p>
                <svg className="header-branch-accent" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 8 H70 M70 8 C 78 8, 78 2, 86 2 H130 M70 8 C 78 8, 78 14, 86 14 H130 M130 2 H200 M130 14 H160" />
                </svg>
            </div>

            {error && (
                <div className="admin-page-error">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* การ์ดสรุปสถิติ */}
            <div className="admin-stats-grid">
                <div className="stat-card stat-card--pending">
                    <div className="stat-card-icon"><AlertTriangle size={20} /></div>
                    <div>
                        <div className="stat-label">รอตรวจสอบ</div>
                        <div className="stat-value">{pendingCount.toLocaleString()}</div>
                    </div>
                </div>
                <div className="stat-card stat-card--resolved">
                    <div className="stat-card-icon"><User size={20} /></div>
                    <div>
                        <div className="stat-label">อนุมัติ/แก้ไขแล้ว</div>
                        <div className="stat-value">{resolvedCount.toLocaleString()}</div>
                    </div>
                </div>
                <div className="stat-card stat-card--rejected">
                    <div className="stat-card-icon"><X size={20} /></div>
                    <div>
                        <div className="stat-label">ปฏิเสธแล้ว</div>
                        <div className="stat-value">{rejectedCount.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* แท็บกรองรายการ */}
            <div className="filter-tabs" role="tablist" aria-label="กรองรายการตามสถานะ">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={filterTab === tab.key}
                        className={`filter-tab-btn ${filterTab === tab.key ? "active" : ""}`}
                        onClick={() => setFilterTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ตารางรายการ */}
            <div className="admin-table-card">
                {loading ? (
                    <div className="admin-table-loading">
                        <Loader2 size={20} className="spin" />
                        <span>กำลังโหลดข้อมูล...</span>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="admin-table-empty">
                        <Inbox size={26} />
                        <span>{EMPTY_MESSAGE[filterTab]}</span>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>ประเภท</th>
                                <th>สถานะ</th>
                                <th>ชื่อนิยาย</th>
                                <th>ผู้ส่งเรื่อง</th>
                                <th>รายละเอียด/สาเหตุ</th>
                                <th>วันที่แจ้ง</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((item) => {
                                const isAppeal = item.status === "appeal_pending";
                                const statusInfo = STATUS_INFO[item.status] || STATUS_INFO.pending;
                                return (
                                    <tr key={item.report_id}>
                                        <td>#{item.report_id}</td>
                                        <td>
                                            <span className={`type-badge ${isAppeal ? "type-appeal" : "type-report"}`}>
                                                {isAppeal ? "ขอปลดแบน" : "รายงาน"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusInfo.className}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{item.novel_title || `นิยาย ID: ${item.novel_id}`}</strong>
                                        </td>
                                        <td>{item.username || `User ID: ${item.user_id}`}</td>
                                        <td className="reason-col" title={stripHtml(item.reason)}>{stripHtml(item.reason)}</td>
                                        <td>
                                            {item.created_at
                                                ? new Date(item.created_at).toLocaleDateString("th-TH")
                                                : "-"}
                                        </td>
                                        <td>
                                            <button className="btn-action-review" onClick={() => openReview(item)}>
                                                <Search size={13} /> ตรวจสอบ
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Review modal */}
            {selectedReport && (() => {
                const isAppeal = selectedReport.status === "appeal_pending";
                return (
                    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
                        <div className="admin-modal">
                            <div className="admin-modal__header">
                                <div>
                                    <div className="admin-modal__eyebrow">
                                        รายการ #{selectedReport.report_id} ({isAppeal ? "คำขอปลดแบน" : "การรายงานเนื้อหา"})
                                    </div>
                                    <div className="admin-modal__heading">
                                        {isAppeal ? "ตรวจสอบคำขอปลดแบน" : "ตรวจสอบเนื้อหาที่ถูกรายงาน"}
                                    </div>
                                </div>
                                <button className="admin-modal__close" onClick={closeModal} disabled={actionBusy} aria-label="ปิดหน้าต่าง">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="admin-modal__body">
                                <div className="admin-modal__section">
                                    <div className="admin-modal__section-title">ข้อมูลผู้แจ้ง</div>
                                    <div className="admin-modal__meta-row">
                                        <span>
                                            <User size={13} /> {selectedReport.username ? `ผู้ส่งเรื่อง: ${selectedReport.username}` : `User ID: ${selectedReport.user_id}`}
                                        </span>
                                        {selectedReport.created_at && (
                                            <span>
                                                <Calendar size={13} />{" "}
                                                {new Date(selectedReport.created_at).toLocaleDateString("th-TH")}
                                            </span>
                                        )}
                                    </div>
                                    <div className="admin-modal__reason-box">
                                        <div className="admin-modal__reason-label">
                                            {isAppeal ? "ข้อความชี้แจงจากนักเขียน" : "เหตุผลการรายงาน"}
                                        </div>
                                        <div className="admin-modal__reason-text">{stripHtml(selectedReport.reason)}</div>
                                    </div>
                                </div>

                                <div className="admin-modal__section">
                                    <div className="admin-modal__section-title">ข้อมูลนิยาย</div>

                                    <div className="admin-modal__novel-card">
                                        <div className="admin-modal__novel-cover">
                                            {selectedReport.novel_cover ? (
                                                <img src={selectedReport.novel_cover} alt="หน้าปกนิยาย" />
                                            ) : (
                                                <div className="cover-placeholder">ไม่มีรูปปก</div>
                                            )}
                                        </div>

                                        <div className="admin-modal__novel-details">
                                            <div className="admin-modal__novel-title">
                                                {selectedReport.novel_title || `นิยาย ID: ${selectedReport.novel_id}`}
                                            </div>

                                            <div className="admin-modal__novel-author">
                                                ผู้เขียน: {selectedReport.author_pen_name || "ไม่ทราบนามปากกา"}
                                            </div>

                                            <div className="admin-modal__novel-synopsis">
                                                {selectedReport.novel_synopsis || "ไม่มีคำโปรย..."}
                                            </div>

                                            <a
                                                className="admin-modal__novel-link"
                                                href={`/novel/${selectedReport.novel_id || selectedReport.target_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                ดูเนื้อหานิยาย <ExternalLink size={13} />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {actionError && (
                                    <div className="admin-modal__error"><AlertTriangle size={14} /> {actionError}</div>
                                )}

                                {/* 🟢 ปุ่ม Action เฉพาะรายการที่ยังไม่ตัดสินใจเท่านั้น
                                    ถ้าอนุมัติ/ปฏิเสธไปแล้ว โชว์ผลตัดสินใจแทน ไม่ให้กดซ้ำ */}
                                {selectedReport.status === "pending" || selectedReport.status === "appeal_pending" ? (
                                    <div className="admin-modal__actions">
                                        <button
                                            className="btn-action-reject admin-modal__action-btn"
                                            onClick={() => handleUpdateStatus(selectedReport, "rejected")}
                                            disabled={actionBusy}
                                        >
                                            {actionBusy ? <Loader2 size={14} className="spin" /> : <X size={14} />}{" "}
                                            {isAppeal ? "ปฏิเสธ (ไม่อนุมัติให้ปลดแบน)" : "ปฏิเสธ (เนื้อหาปกติ)"}
                                        </button>
                                        <button
                                            className="btn-action-approve admin-modal__action-btn"
                                            onClick={() => handleUpdateStatus(selectedReport, "resolved")}
                                            disabled={actionBusy}
                                        >
                                            {actionBusy ? <Loader2 size={14} className="spin" /> : <User size={14} />}{" "}
                                            {isAppeal ? "อนุมัติ (ปลดแบนนิยาย)" : "อนุมัติ (สั่งระงับนิยาย)"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="admin-modal__decided-box">
                                        <span className={`status-badge ${STATUS_INFO[selectedReport.status]?.className || ""}`}>
                                            {STATUS_INFO[selectedReport.status]?.label || selectedReport.status}
                                        </span>
                                        <span>รายการนี้ถูกตรวจสอบและตัดสินใจไปแล้ว</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
          </div>
        </div>
    );
}