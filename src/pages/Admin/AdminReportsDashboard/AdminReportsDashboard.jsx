import React, { useState, useEffect } from "react";
import "./AdminReportsDashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function AdminReportsDashboard() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchReports();
    }, []);

    // 🟢 1. ดึงข้อมูลรายงานค้างจาก GET /api/admin/reports
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

    // 🟢 2. แอดมินกดเปลี่ยนสถานะยิง PATCH /api/admin/reports/:id/status
    const handleUpdateStatus = async (reportId, newStatus) => {
        const token = localStorage.getItem("token");

        // อัปเดต UI ชั่วคราวล่วงหน้า (Optimistic UI Update)
        setReports((prev) =>
            prev.map((r) => (r.report_id === reportId ? { ...r, status: newStatus } : r))
        );

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                throw new Error("อัปเดตสถานะไม่สำเร็จ");
            }
        } catch (err) {
            console.error("Update status failed:", err);
            alert(err.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ");
            fetchReports(); // โหลดข้อมูลจริงกลับมาหากยิง API ล้มเหลว
        }
    };

    // Helper เช็กว่าเป็นสถานะรอตรวจสอบหรือไม่
    const isPending = (status) => {
        if (!status) return false;
        return status.toLowerCase() === "pending";
    };

    return (
        <div className="admin-reports-container">
            <div className="admin-reports-header">
                <h1 className="admin-title">ศูนย์จัดการการรายงานเนื้อหา</h1>
            </div>

            {error && <div style={{ color: "#e53e3e", marginBottom: "16px" }}>⚠️ {error}</div>}

            {/* Stat Cards */}
            <div className="admin-stats-grid">
                <div className="stat-card">
                    <div className="stat-label">รายงานทั้งหมด</div>
                    <div className="stat-value">{reports.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">รอตรวจสอบ</div>
                    <div className="stat-value" style={{ color: "#ff69b4" }}>
                        {reports.filter((r) => isPending(r.status)).length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">ดำเนินการแล้ว</div>
                    <div className="stat-value" style={{ color: "#0ca678" }}>
                        {reports.filter((r) => !isPending(r.status)).length}
                    </div>
                </div>
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
                                <th>ชื่อนิยาย</th>
                                <th>สาเหตุ</th>
                                <th>สถานะ</th>
                                <th>วันที่แจ้ง</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", color: "#888", padding: "24px" }}>
                                        ไม่มีรายการรายงานในระบบ
                                    </td>
                                </tr>
                            ) : (
                                reports.map((item) => (
                                    <tr key={item.report_id}>
                                        <td>#{item.report_id}</td>
                                        <td>
                                            <strong>{item.novel_title || `นิยาย ID: ${item.novel_id}`}</strong>
                                        </td>
                                        <td>{item.reason}</td>
                                        <td>
                                            <span className={`status-badge badge-${(item.status || "pending").toLowerCase()}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            {item.created_at
                                                ? new Date(item.created_at).toLocaleDateString("th-TH")
                                                : "-"}
                                        </td>
                                        <td>
                                            {isPending(item.status) ? (
                                                <div className="admin-btn-group">
                                                    <button
                                                        className="btn-action-approve"
                                                        onClick={() => handleUpdateStatus(item.report_id, "resolved")}
                                                    >
                                                        อนุมัติ
                                                    </button>
                                                    <button
                                                        className="btn-action-reject"
                                                        onClick={() => handleUpdateStatus(item.report_id, "rejected")}
                                                    >
                                                        ปฏิเสธ
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: "#aaa", fontSize: "13px" }}>เรียบร้อยแล้ว</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}