import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  Feather,
  RotateCw,
  UserPlus,
  Flag,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Inbox,
  Lock,
  Calendar,
  CheckCircle2,
  Zap,
  BarChart2,
  TrendingUp
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import "./AdminDashboardPage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// =========================================================================
// Thai Date Formatting Helpers
// =========================================================================
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_DAYS = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
];

/**
 * Format RFC3339 string to Thai Short Date (e.g. "10 ก.ย. 2569")
 */
function formatThaiDate(dateString) {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const month = THAI_MONTHS_SHORT[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Format YYYY-MM string to Thai Month (e.g. "2026-04" -> "เม.ย.")
 */
function formatMonthToThai(monthStr) {
  if (!monthStr || typeof monthStr !== "string") return monthStr;
  const parts = monthStr.split("-");
  if (parts.length >= 2) {
    const mIndex = parseInt(parts[1], 10) - 1;
    if (mIndex >= 0 && mIndex < 12) {
      return THAI_MONTHS_SHORT[mIndex];
    }
  }
  return monthStr;
}

/**
 * Format today's date for page header
 */
function getTodayThaiHeaderDate() {
  const now = new Date();
  const dayName = THAI_DAYS[now.getDay()];
  const date = now.getDate();
  const month = THAI_MONTHS_FULL[now.getMonth()];
  const year = now.getFullYear() + 543;
  return `${dayName}ที่ ${date} ${month} ${year}`;
}

// =========================================================================
// Custom Chart Tooltip Component
// =========================================================================
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const originalMonth = payload[0]?.payload?.month || label;
    const [year, month] = (originalMonth || "").split("-");
    const thaiMonthFull = month ? THAI_MONTHS_FULL[parseInt(month, 10) - 1] : label;
    const thaiYear = year ? parseInt(year, 10) + 543 : "";

    return (
      <div className="admin-chart-tooltip">
        <div className="admin-chart-tooltip__title">
          {thaiMonthFull} {thaiYear}
        </div>
        <div className="admin-chart-tooltip__list">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="admin-chart-tooltip__item">
              <span
                className="admin-chart-tooltip__dot"
                style={{ backgroundColor: entry.color }}
              />
              <span className="admin-chart-tooltip__name">{entry.name}:</span>
              <span className="admin-chart-tooltip__value">
                {entry.value?.toLocaleString()} {entry.dataKey === "new_users" ? "คน" : "เรื่อง"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// =========================================================================
// Main Admin Dashboard Page Component
// =========================================================================
export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  // Trend State
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState("");

  // Global Access Denied State (403)
  const [accessDenied, setAccessDenied] = useState(false);

  // -----------------------------------------------------------------------
  // Handle Auth Error (401 / 403)
  // -----------------------------------------------------------------------
  const handleAuthError = useCallback(
    (status) => {
      if (status === 401) {
        localStorage.removeItem("token");
        navigate("/login-register");
      } else if (status === 403) {
        setAccessDenied(true);
      }
    },
    [navigate]
  );

  // -----------------------------------------------------------------------
  // Fetch Summary API
  // -----------------------------------------------------------------------
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError("");

    const token = localStorage.getItem("token");
    if (!token) {
      handleAuthError(401);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleAuthError(401);
        return;
      }
      if (res.status === 403) {
        handleAuthError(403);
        setSummaryLoading(false);
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "ไม่สามารถโหลดข้อมูลภาพรวมของระบบได้");
      }

      const json = await res.json();
      setSummaryData(json.data || null);
    } catch (err) {
      console.error("Fetch summary error:", err);
      setSummaryError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSummaryLoading(false);
    }
  }, [handleAuthError]);

  // -----------------------------------------------------------------------
  // Fetch Trend API
  // -----------------------------------------------------------------------
  const fetchTrend = useCallback(async () => {
    setTrendLoading(true);
    setTrendError("");

    const token = localStorage.getItem("token");
    if (!token) {
      handleAuthError(401);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/dashboard/trend?months=6&timezone=Asia%2FBangkok`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 401) {
        handleAuthError(401);
        return;
      }
      if (res.status === 403) {
        handleAuthError(403);
        setTrendLoading(false);
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "ไม่สามารถโหลดข้อมูลแนวโน้มรายเดือนได้");
      }

      const json = await res.json();
      const rawMonths = json.data?.months || [];
      const formatted = rawMonths.map((item) => ({
        ...item,
        monthLabel: formatMonthToThai(item.month),
      }));
      setTrendData(formatted);
    } catch (err) {
      console.error("Fetch trend error:", err);
      setTrendError(err.message || "เกิดข้อผิดพลาดในการโหลดกราฟแนวโน้ม กรุณาลองใหม่อีกครั้ง");
    } finally {
      setTrendLoading(false);
    }
  }, [handleAuthError]);

  // -----------------------------------------------------------------------
  // Initial Load
  // -----------------------------------------------------------------------
  useEffect(() => {
    fetchSummary();
    fetchTrend();
  }, [fetchSummary, fetchTrend]);

  // -----------------------------------------------------------------------
  // Render Access Denied UI (403)
  // -----------------------------------------------------------------------
  if (accessDenied) {
    return (
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-content">
          <div className="admin-dashboard-access-denied">
            <div className="admin-dashboard-access-denied__icon">
              <Lock size={36} />
            </div>
            <h2>ไม่มีสิทธิ์เข้าถึง Dashboard</h2>
            <p>บัญชีของคุณไม่มีสิทธิ์ผู้ดูแลระบบ (Admin) ในการเข้าถึงหน้านี้</p>
            <button
              type="button"
              className="admin-dashboard-btn-secondary"
              onClick={() => navigate("/")}
            >
              กลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Writer Requests Data
  const writerRequestsCount = summaryData?.pending_writer_requests?.count ?? 0;
  const writerRequestsRecent = summaryData?.pending_writer_requests?.recent ?? [];

  // Reports Data
  const reportsCount = summaryData?.pending_reports?.count ?? 0;
  const reportsRecent = summaryData?.pending_reports?.recent ?? [];
  const appealCount = summaryData?.appeal_pending?.count ?? 0;

  return (
    <div className="admin-dashboard-container">
      <div className="admin-dashboard-content">
        {/* ================================================================= */}
        {/* Header Area */}
        {/* ================================================================= */}
        <header className="admin-dashboard-header">
          <div className="admin-dashboard-header__left">
            <h1 className="admin-title">แดชบอร์ด</h1>
            <p className="admin-subtitle">
              ภาพรวมระบบ StoryVerse — ข้อมูลสถิติและงานที่ต้องดำเนินการ
            </p>
            {/* SVG Branch Accent (Exact Match with other Admin pages) */}
            <svg
              className="header-branch-accent"
              viewBox="0 0 200 16"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 8 H70 M70 8 C 78 8, 78 2, 86 2 H130 M70 8 C 78 8, 78 14, 86 14 H130 M130 2 H200 M130 14 H160" />
            </svg>
          </div>

          <div className="admin-dashboard-header__right">
            {/* Date Badge */}
            <div className="admin-dashboard-date-badge">
              <Calendar size={14} />
              <span>{getTodayThaiHeaderDate()}</span>
            </div>
          </div>
        </header>

        {/* ================================================================= */}
        {/* SECTION 1: งานที่ต้องดำเนินการวันนี้ */}
        {/* ================================================================= */}
        <section className="admin-dashboard-section">
          <div className="admin-section-label">
            <div className="admin-section-label__badge">
              <Zap size={14} />
            </div>
            <h2 className="admin-section-label__title">งานที่ต้องดำเนินการวันนี้</h2>
          </div>

          {summaryError && (
            <div className="admin-dashboard-error-card">
              <div className="admin-dashboard-error-card__content">
                <AlertCircle size={20} className="admin-dashboard-error-card__icon" />
                <div className="admin-dashboard-error-card__text">
                  <strong>ไม่สามารถโหลดข้อมูลสรุปและงานที่ต้องดำเนินการได้</strong>
                  <p>{summaryError}</p>
                </div>
              </div>
              <button
                type="button"
                className="admin-dashboard-btn-retry"
                onClick={fetchSummary}
              >
                <RotateCw size={14} />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            </div>
          )}

          <div className="admin-action-grid">
            {/* ------------------------------------------------------------- */}
            {/* Action Card 1: คำขอสมัครนักเขียน (Red / Rose Theme) */}
            {/* ------------------------------------------------------------- */}
            <div className="admin-action-card admin-action-card--red">
              {summaryLoading ? (
                <div className="admin-action-card__skeleton">
                  <div className="skeleton-box skeleton-title" />
                  <div className="skeleton-box skeleton-item" />
                  <div className="skeleton-box skeleton-item" />
                  <div className="skeleton-box skeleton-footer" />
                </div>
              ) : (
                <>
                  <div className="admin-action-card__top">
                    <div className="admin-action-card__header-info">
                      <div className="admin-action-card__icon-badge admin-action-card__icon-badge--red">
                        <UserPlus size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="admin-action-card__title">คำขอสมัครนักเขียน</h3>
                        <div className="admin-action-card__status-hint">
                          {writerRequestsCount > 0 ? (
                            <span>รอดำเนินการ — ตรวจสอบและอนุมัติสิทธิ์</span>
                          ) : (
                            <span>ไม่มีคำขอค้างในระบบ</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="admin-action-card__count-box">
                      <span className="admin-action-card__count text-urgent">
                        {writerRequestsCount}
                      </span>
                      <span className="admin-action-card__count-unit">รายการ</span>
                    </div>
                  </div>

                  <div className="admin-action-card__divider admin-action-card__divider--red" />

                  {/* Recent List (max 3) */}
                  <div className="admin-action-card__body">
                    {writerRequestsCount === 0 ? (
                      <div className="admin-action-card__empty">
                        <Inbox size={14} className="empty-icon" />
                        <span>ไม่มีคำขอสมัครนักเขียนที่รอดำเนินการในขณะนี้</span>
                      </div>
                    ) : (
                      <div className="admin-action-list">
                        {writerRequestsRecent.map((item) => (
                          <div key={item.user_id} className="admin-action-item">
                            <div className="admin-action-item__dot admin-action-item__dot--red" />
                            <div className="admin-action-item__main">
                              <div className="admin-action-item__name" title={item.username}>
                                {item.username}
                              </div>
                              <div className="admin-action-item__sub">
                                นามปากกา: <span className="font-medium">{item.pen_name || "-"}</span>
                              </div>
                            </div>
                            <div className="admin-action-item__date">
                              {formatThaiDate(item.applied_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="admin-action-card__footer">
                    <Link to="/admin/manage-users" className="admin-action-card__link text-urgent">
                      <span>ดูทั้งหมด</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Action Card 2: รายงาน / แจ้งลบ (Orange / Amber Theme) */}
            {/* ------------------------------------------------------------- */}
            <div className="admin-action-card admin-action-card--orange">
              {summaryLoading ? (
                <div className="admin-action-card__skeleton">
                  <div className="skeleton-box skeleton-title" />
                  <div className="skeleton-box skeleton-item" />
                  <div className="skeleton-box skeleton-item" />
                  <div className="skeleton-box skeleton-footer" />
                </div>
              ) : (
                <>
                  <div className="admin-action-card__top">
                    <div className="admin-action-card__header-info">
                      <div className="admin-action-card__icon-badge admin-action-card__icon-badge--orange">
                        <Flag size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="admin-action-card__title">รายงาน / แจ้งลบ</h3>
                        <div className="admin-action-card__status-hint text-warn">
                          {reportsCount > 0 || appealCount > 0 ? (
                            <span>รอตรวจสอบเนื้อหาที่ถูกรายงาน</span>
                          ) : (
                            <span>ไม่มีรายงานค้างในระบบ</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="admin-action-card__count-box">
                      <span className="admin-action-card__count text-warn">
                        {reportsCount}
                      </span>
                      <span className="admin-action-card__count-unit">รายงาน</span>
                    </div>
                  </div>

                  <div className="admin-action-card__divider admin-action-card__divider--orange" />

                  {/* Recent List (max 3) */}
                  <div className="admin-action-card__body">
                    {reportsCount === 0 && appealCount === 0 ? (
                      <div className="admin-action-card__empty">
                        <Inbox size={14} className="empty-icon" />
                        <span>ไม่มีรายงานหรือคำขออุทธรณ์ที่รอการตรวจสอบ</span>
                      </div>
                    ) : (
                      <div className="admin-action-list">
                        {reportsRecent.map((item) => (
                          <div key={`report-${item.report_id}`} className="admin-action-item">
                            <div className="admin-action-item__dot admin-action-item__dot--orange" />
                            <div className="admin-action-item__main">
                              <div className="admin-action-item__name" title={item.novel_title}>
                                {item.novel_title || `นิยาย #${item.novel_id}`}
                              </div>
                              <div className="admin-action-item__sub">
                                รหัสรายงาน: #{item.report_id}
                              </div>
                            </div>
                            <div className="admin-action-item__date">
                              {formatThaiDate(item.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Appeal Banner Badge */}
                    {appealCount > 0 && (
                      <div className="admin-action-appeal-banner">
                        <div className="admin-action-appeal-banner__left">
                          <ShieldAlert size={14} />
                          <span>รอการตรวจสอบ</span>
                        </div>
                        <div className="admin-action-appeal-banner__badge">
                          {appealCount} รายการ
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="admin-action-card__footer">
                    <Link to="/admin/reports?tab=reports" className="admin-action-card__link text-warn">
                      <span>ดูทั้งหมด</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 2: สถิติรวมของระบบ (Statistics) */}
        {/* ================================================================= */}
        <section className="admin-dashboard-section">
          <div className="admin-section-label">
            <div className="admin-section-label__badge">
              <BarChart2 size={14} />
            </div>
            <h2 className="admin-section-label__title">สถิติรวมของระบบ</h2>
          </div>

          <div className="admin-kpi-grid">
            {/* KPI 1: ผู้ใช้ทั้งหมด -> ลิงก์ไปหน้าจัดการผู้ใช้งาน (Blue Icon) */}
            <Link to="/admin/users" className="admin-kpi-card admin-kpi-card--clickable">
              {summaryLoading ? (
                <div className="admin-kpi-card__skeleton">
                  <div className="skeleton-box skeleton-kpi-icon" />
                  <div className="skeleton-box skeleton-kpi-val" />
                  <div className="skeleton-box skeleton-kpi-label" />
                </div>
              ) : (
                <>
                  <div className="admin-kpi-card__top">
                    <div className="admin-kpi-card__icon admin-kpi-card__icon--blue">
                      <Users size={18} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="admin-kpi-card__val">
                    {(summaryData?.total_users ?? 0).toLocaleString()}
                  </div>
                  <div className="admin-kpi-card__label">ผู้ใช้ทั้งหมด</div>
                  <div className="admin-kpi-card__sub">ทุกบทบาทในระบบ</div>
                </>
              )}
            </Link>

            {/* KPI 2: นิยายที่เผยแพร่แล้ว -> ลิงก์ไปหน้าจัดการเนื้อหาและการรายงาน ส่วนจัดการเรื่อง (Pink Icon) */}
            <Link to="/admin/reports?tab=stories" className="admin-kpi-card admin-kpi-card--clickable">
              {summaryLoading ? (
                <div className="admin-kpi-card__skeleton">
                  <div className="skeleton-box skeleton-kpi-icon" />
                  <div className="skeleton-box skeleton-kpi-val" />
                  <div className="skeleton-box skeleton-kpi-label" />
                </div>
              ) : (
                <>
                  <div className="admin-kpi-card__top">
                    <div className="admin-kpi-card__icon admin-kpi-card__icon--pink">
                      <BookOpen size={18} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="admin-kpi-card__val">
                    {(summaryData?.total_novels_published ?? 0).toLocaleString()}
                  </div>
                  <div className="admin-kpi-card__label">นิยายที่เผยแพร่แล้ว</div>
                  <div className="admin-kpi-card__sub">เปิดให้อ่านสาธารณะ</div>
                </>
              )}
            </Link>

            {/* KPI 3: นักเขียน (Green Icon) -> ลิงก์ไปหน้าจัดการผู้ใช้งานพร้อมตัวกรองนักเขียน */}
            <Link to="/admin/users?role=writer" className="admin-kpi-card admin-kpi-card--clickable">
              {summaryLoading ? (
                <div className="admin-kpi-card__skeleton">
                  <div className="skeleton-box skeleton-kpi-icon" />
                  <div className="skeleton-box skeleton-kpi-val" />
                  <div className="skeleton-box skeleton-kpi-label" />
                </div>
              ) : (
                <>
                  <div className="admin-kpi-card__top">
                    <div className="admin-kpi-card__icon admin-kpi-card__icon--green">
                      <Feather size={18} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="admin-kpi-card__val">
                    {(summaryData?.total_writers ?? 0).toLocaleString()}
                  </div>
                  <div className="admin-kpi-card__label">นักเขียนทั้งหมด</div>
                  <div className="admin-kpi-data-pill admin-kpi-data-pill--green">
                    <span className="admin-kpi-data-pill__dot" />
                    <span className="admin-kpi-data-pill__text">
                      ใช้งานล่าสุดใน 30 วัน ({summaryData?.active_writers_30d ?? 0} คน)
                    </span>
                  </div>
                </>
              )}
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 3: แนวโน้มรายเดือน (Monthly Trend) */}
        {/* ================================================================= */}
        <section className="admin-dashboard-section">
          <div className="admin-section-label">
            <div className="admin-section-label__badge">
              <TrendingUp size={14} />
            </div>
            <h2 className="admin-section-label__title">แนวโน้มรายเดือน</h2>
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-card__header">
              <div className="admin-chart-card__header-left">
                <h3 className="admin-chart-card__title">จำนวนที่เพิ่มขึ้นในแต่ละเดือน</h3>
                <p className="admin-chart-card__subtitle">
                  ผู้ใช้ใหม่ และนิยายใหม่ เปรียบเทียบย้อนหลัง 6 เดือน
                </p>
              </div>

              {/* Custom Legend */}
              <div className="admin-chart-card__legend">
                <div className="admin-chart-legend-item">
                  <span className="admin-chart-legend-dot admin-chart-legend-dot--user" />
                  <span>ผู้ใช้ใหม่</span>
                </div>
                <div className="admin-chart-legend-item">
                  <span className="admin-chart-legend-dot admin-chart-legend-dot--novel" />
                  <span>นิยายใหม่</span>
                </div>
              </div>
            </div>

            {/* Chart Body / State Handling */}
            <div className="admin-chart-card__body">
              {trendLoading ? (
                <div className="admin-chart-card__loading">
                  <RotateCw size={26} className="spin-animation text-pink" />
                  <span>กำลังโหลดข้อมูลแนวโน้มรายเดือน...</span>
                </div>
              ) : trendError ? (
                <div className="admin-dashboard-error-card">
                  <div className="admin-dashboard-error-card__content">
                    <AlertCircle size={20} className="admin-dashboard-error-card__icon" />
                    <div className="admin-dashboard-error-card__text">
                      <strong>ไม่สามารถโหลดกราฟแนวโน้มได้</strong>
                      <p>{trendError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-dashboard-btn-retry"
                    onClick={fetchTrend}
                  >
                    <RotateCw size={14} />
                    <span>ลองใหม่อีกครั้ง</span>
                  </button>
                </div>
              ) : trendData.length === 0 ? (
                <div className="admin-chart-card__empty">
                  <Inbox size={32} />
                  <span>ไม่มีข้อมูลแนวโน้มรายเดือนในช่วงเวลานี้</span>
                </div>
              ) : (
                <div className="admin-chart-wrapper">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={trendData}
                      margin={{ top: 16, right: 16, left: -10, bottom: 0 }}
                      barGap={6}
                      style={{ outline: "none", userSelect: "none" }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffe4e6" />
                      <XAxis
                        dataKey="monthLabel"
                        tickLine={false}
                        axisLine={{ stroke: "#fbcfe8" }}
                        tick={{ fill: "#64748b", fontSize: 12, fontFamily: "Sarabun, Prompt, sans-serif" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Sarabun, Prompt, sans-serif" }}
                      />
                      {/* isAnimationActive={false} eliminates the tooltip flying from left edge */}
                      <Tooltip
                        isAnimationActive={false}
                        cursor={{ fill: "rgba(233, 30, 140, 0.04)" }}
                        content={<CustomChartTooltip />}
                      />
                      <Bar
                        dataKey="new_users"
                        name="ผู้ใช้ใหม่"
                        fill="#e91e8c"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        cursor="default"
                      />
                      <Bar
                        dataKey="new_novels"
                        name="นิยายใหม่"
                        fill="#fbcfe8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        cursor="default"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
