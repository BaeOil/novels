import React, { useState, useEffect } from "react";
import {
    Search,
    X,
    User,
    Calendar,
    ExternalLink,
    Loader2,
    AlertTriangle,
} from "lucide-react";
import "./AdminReportsDashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function AdminReportsDashboard() {
    const [filterTab, setFilterTab] = useState('Pending'); // All, Pending, Resolved, Rejected
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

    return (
        <div className="admin-reports-container"> 
            <div className="admin-reports-header">
                <h1 className="admin-title">ศูนย์จัดการการรายงานและขอปลดแบน</h1>
            </div>

            {error && <div style={{ color: "#e53e3e", marginBottom: "16px" }}>⚠️ {error}</div>} 

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                {(() => {
                    const pendingCount = reports.filter(r => r.status === 'pending' || r.status === 'appeal_pending').length;
                    const resolvedCount = reports.filter(r => r.status === 'resolved').length;
                    const rejectedCount = reports.filter(r => r.status === 'rejected').length;

                    return (
                        <>
                            <div style={{ backgroundColor: '#fff0f6', border: '1px solid #ffadd2', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ backgroundColor: '#ff7875', color: '#fff', borderRadius: '50%', padding: '10px', display: 'flex' }}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>รอตรวจสอบ</div>
                                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#cf1322' }}>{pendingCount}</div>
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ backgroundColor: '#52c41a', color: '#fff', borderRadius: '50%', padding: '10px', display: 'flex' }}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>อนุมัติ/แก้ไขแล้ว</div>
                                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#389e0d' }}>{resolvedCount}</div>
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ backgroundColor: '#faad14', color: '#fff', borderRadius: '50%', padding: '10px', display: 'flex' }}>
                                    <X size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>ปฏิเสธแล้ว</div>
                                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#d48806' }}>{rejectedCount}</div>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                {['All', 'Pending', 'Resolved', 'Rejected'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: filterTab === tab ? '#fe9ad3' : '#f0f4f8',
                            color: filterTab === tab ? '#fff' : '#333',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="admin-table-card">
                {loading ? ( 
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}> 
                        กำลังโหลดข้อมูล... 
                    </div>
                ) : (
                    <table className="admin-table"> 
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>ประเภท</th>
                                <th>ชื่อนิยาย</th>
                                <th>ผู้ส่งเรื่อง</th>
                                <th>รายละเอียด/สาเหตุ</th>
                                <th>วันที่แจ้ง</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const filtered = filterTab === 'All' ? reports : (
                                    filterTab === 'Pending' ? reports.filter(r => r.status === 'pending' || r.status === 'appeal_pending') :
                                    filterTab === 'Resolved' ? reports.filter(r => r.status === 'resolved') :
                                    filterTab === 'Rejected' ? reports.filter(r => r.status === 'rejected') : []
                                );
                                if (filtered.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: "center", color: "#888", padding: "24px" }}>
                                                ไม่มีรายการ {filterTab.toLowerCase()} 🎉
                                            </td>
                                        </tr>
                                    );
                                }
                                return filtered.map((item) => {
                                    const isAppeal = item.status === "appeal_pending";
                                    return (
                                        <tr key={item.report_id}> 
                                            <td>#{item.report_id}</td>
                                            <td>
                                                <span style={{
                                                    padding: "4px 8px",
                                                    borderRadius: "4px",
                                                    fontSize: "12px",
                                                    fontWeight: "bold",
                                                    backgroundColor: isAppeal ? "#fef3c7" : "#fee2e2",
                                                    color: isAppeal ? "#b45309" : "#b91c1c"
                                                }}>
                                                    {isAppeal ? "🟡 ขอปลดแบน" : "🔴 รีพอร์ต"}
                                                </span>
                                            </td>
                                            <td>
                                                <strong>{item.novel_title || `นิยาย ID: ${item.novel_id}`}</strong> 
                                            </td>
                                            <td>{item.username || `User ID: ${item.user_id}`}</td> 
                                            <td>{item.reason}</td>
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
                                });
                            })()}
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
                                        <div className="admin-modal__reason-text">{selectedReport.reason}</div> 
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

                                {/* 🟢 ปุ่ม Action ปรับข้อความตามประเภท (Appeal vs Report) */}
                                <div className="admin-modal__actions">
                                    <button
                                        className="btn-action-reject admin-modal__action-btn"
                                        onClick={() => handleUpdateStatus(selectedReport, "rejected")}
                                        disabled={actionBusy} 
                                    >
                                        {actionBusy ? <Loader2 size={14} className="spin" /> : "🔴"}{" "}
                                        {isAppeal ? "ปฏิเสธ (ไม่อนุมัติให้ปลดแบน)" : "ปฏิเสธ (เนื้อหาปกติ)"} 
                                    </button>
                                    <button
                                        className="btn-action-approve admin-modal__action-btn"
                                        onClick={() => handleUpdateStatus(selectedReport, "resolved")}
                                        disabled={actionBusy} 
                                    >
                                        {actionBusy ? <Loader2 size={14} className="spin" /> : "🟢"}{" "}
                                        {isAppeal ? "อนุมัติ (ปลดแบนนิยาย)" : "อนุมัติ (สั่งระงับนิยาย)"} 
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}