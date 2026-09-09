import React, { useState, useEffect, useCallback } from "react";
import {
  RotateCw,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Inbox,
  Shield,
  Download,
  Home
} from "lucide-react";
import "./Adminauditlog.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// =========================================================================
// 1. Mapping Dictionaries
// =========================================================================

// ตารางแปล Action ดิบจาก backend เป็นภาษาไทย + กลุ่มสี badge
export const ACTION_MAP = {
  REGISTER: { label: "สมัครสมาชิก", group: "gray", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
  LOGIN: { label: "เข้าสู่ระบบ", group: "gray", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
  LOGIN_FAILED: { label: "เข้าสู่ระบบไม่สำเร็จ", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  LOGOUT: { label: "ออกจากระบบ", group: "gray", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
  UPDATE_PROFILE: { label: "แก้ไขข้อมูลส่วนตัว", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  DELETE_ACCOUNT: { label: "ลบบัญชีตัวเอง", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  SUSPEND_USER: { label: "ระงับการใช้งานผู้ใช้", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  UNSUSPEND_USER: { label: "ยกเลิกการระงับผู้ใช้", group: "green", color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  CHANGE_ROLE: { label: "เปลี่ยนสิทธิ์ผู้ใช้", group: "orange", color: "#ea580c", bg: "#ffedd5", border: "#fed7aa" },
  DELETE_USER: { label: "ลบผู้ใช้", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  APPROVE_WRITER: { label: "อนุมัติคำขอเป็นนักเขียน", group: "green", color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  REJECT_WRITER: { label: "ปฏิเสธคำขอเป็นนักเขียน", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  CREATE_NOVEL: { label: "สร้างนิยาย", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  UPDATE_NOVEL: { label: "แก้ไขนิยาย", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  PUBLISH_NOVEL: { label: "เผยแพร่นิยาย", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  UNPUBLISH_NOVEL: { label: "ยกเลิกการเผยแพร่นิยาย", group: "orange", color: "#ea580c", bg: "#ffedd5", border: "#fed7aa" },
  DELETE_NOVEL: { label: "ลบนิยาย", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  CREATE_CHAPTER: { label: "สร้างตอน", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  UPDATE_CHAPTER: { label: "แก้ไขตอน", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  DELETE_CHAPTER: { label: "ลบตอน", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  CREATE_SCENE: { label: "สร้างฉาก", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  UPDATE_SCENE: { label: "แก้ไขฉาก", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  DELETE_SCENE: { label: "ลบฉาก", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  CREATE_CHOICE: { label: "สร้างตัวเลือก", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  UPDATE_CHOICE: { label: "แก้ไขตัวเลือก", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  DELETE_CHOICE: { label: "ลบตัวเลือก", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  CREATE_CATEGORY: { label: "สร้างหมวดหมู่", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  UPDATE_CATEGORY: { label: "แก้ไขหมวดหมู่", group: "blue", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
  DELETE_CATEGORY: { label: "ลบหมวดหมู่", group: "red", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" },
  UPDATE_REPORT_STATUS: { label: "อัปเดตสถานะรายงาน", group: "orange", color: "#ea580c", bg: "#ffedd5", border: "#fed7aa" },
};

// ตารางแปล Metadata key เป็นภาษาไทย
export const METADATA_KEY_MAP = {
  email: "อีเมล",
  username: "ชื่อผู้ใช้",
  field: "ฟิลด์ที่แก้ไข",
  deleted_user_id: "รหัสผู้ใช้ที่ถูกลบ",
  new_status: "สถานะใหม่",
  previous_status: "สถานะก่อนหน้า",
  old_status: "สถานะเดิม",
  reason: "เหตุผล",
  new_role: "สิทธิ์ใหม่",
  previous_role: "สิทธิ์ก่อนหน้า",
  role: "สิทธิ์",
  status: "สถานะ",
  rejection_reason: "เหตุผลที่ปฏิเสธ",
  title: "ชื่อเรื่อง",
  old_title: "ชื่อเรื่องเดิม",
  new_title: "ชื่อเรื่องใหม่",
  old_is_completed: "จบเรื่องแล้ว (ก่อนหน้า)",
  new_is_completed: "จบเรื่องแล้ว (ปัจจุบัน)",
  author_id: "รหัสผู้เขียน",
  novel_id: "รหัสนิยาย",
  novel_title: "ชื่อนิยาย",
  chapter_id: "รหัสตอน",
  chapter_title: "ชื่อตอน",
  scene_title: "ชื่อฉาก",
  from_scene_id: "ฉากต้นทาง",
  to_scene_id: "ฉากปลายทาง",
  name: "ชื่อ",
  old_name: "ชื่อเดิม",
  new_name: "ชื่อใหม่",
  profile_picture: "รูปโปรไฟล์",
};

// ตารางแปล Target Type ดิบเป็นภาษาไทย
export const TARGET_TYPE_MAP = {
  user: "ผู้ใช้",
  novel: "นิยาย",
  chapter: "ตอน",
  scene: "ฉาก",
  choice: "ตัวเลือก",
  category: "หมวดหมู่",
  writer: "นักเขียน",
  report: "รายงาน",
};

// ตารางแปล Role
export const ROLE_MAP = {
  admin: "แอดมิน",
  writer: "นักเขียน",
  reader: "นักอ่าน",
};

// ตารางแปลค่าที่ตายตัวในระบบ
export const VALUE_MAP = {
  active: "ใช้งานปกติ",
  suspended: "ระงับการใช้งาน",
  draft: "แบบร่าง",
  published: "เผยแพร่แล้ว",
  pending: "รอตรวจสอบ",
  appeal_pending: "รอตรวจสอบ",
  resolved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธแล้ว",
  admin: "แอดมิน",
  writer: "นักเขียน",
  reader: "นักอ่าน",
  true: "ใช่",
  false: "ไม่ใช่",
};

// ตารางแปลข้อความ Error จาก backend (400)
export const ERROR_MESSAGE_MAP = {
  "invalid audit log id": "รหัสรายการไม่ถูกต้อง",
  "invalid actor_user_id": "รหัสผู้กระทำไม่ถูกต้อง",
  "invalid target_id": "รหัสเป้าหมายไม่ถูกต้อง",
  "invalid page": "หมายเลขหน้าไม่ถูกต้อง",
  "limit must be between 1 and 100": "จำนวนรายการต่อหน้าต้องอยู่ระหว่าง 1-100",
  "invalid date_from": "วันที่เริ่มต้นไม่ถูกต้อง",
  "invalid date_to": "วันที่สิ้นสุดไม่ถูกต้อง",
  "date_from must be before date_to": "วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด",
  "audit log not found": "ไม่พบรายการนี้",
  "failed to list audit logs": "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
  "failed to get audit log": "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
};

// =========================================================================
// 2. Format Helper Functions
// =========================================================================

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

// แปลงเป็นวันที่แบบย่อไทย เช่น 22 ส.ค. 2569 15:30 น.
const formatShortThaiDateTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const month = THAI_MONTHS_SHORT[d.getMonth()];
    const year = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes} น.`;
  } catch {
    return dateString;
  }
};

// แปลงเป็นวันที่แบบเต็มไทย เช่น 22 สิงหาคม 2569 15:30:00 น.
const formatFullThaiDateTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const month = THAI_MONTHS_FULL[d.getMonth()];
    const year = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds} น.`;
  } catch {
    return dateString;
  }
};

// แปลงค่า Value ให้อ่านง่ายเป็นภาษาไทย
const formatMetadataValue = (key, val, allMetadata = {}) => {
  if (val === null || val === undefined) return "-";
  if (typeof val === "boolean") return val ? "ใช่" : "ไม่ใช่";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  // ถ้าเป็น novel_id และมี novel_title ให้แสดงคู่กัน
  if (key === "novel_id" && allMetadata.novel_title) {
    return `${allMetadata.novel_title} (รหัส: ${val})`;
  }
  // ถ้าเป็น chapter_id และมี chapter_title ให้แสดงคู่กัน
  if (key === "chapter_id" && allMetadata.chapter_title) {
    return `${allMetadata.chapter_title} (รหัส: ${val})`;
  }

  const strVal = String(val).trim();
  const lowerVal = strVal.toLowerCase();

  if (VALUE_MAP[lowerVal]) {
    return VALUE_MAP[lowerVal];
  }

  return strVal;
};

// แสดงชื่อผู้กระทำ เช่น แอดมิน (admin_user) หรือ แอดมิน #5 หรือ ระบบ
const renderActorName = (actorUserId, actorRole, actorUsername) => {
  if (!actorUserId) return "ระบบ";
  const roleName = ROLE_MAP[actorRole?.toLowerCase()] || actorRole || "ผู้ใช้";
  if (actorUsername && actorUsername.trim() !== "") {
    return `${roleName} (${actorUsername})`;
  }
  return `${roleName} #${actorUserId}`;
};

// แสดงเป้าหมาย เช่น นิยาย (ชื่อเรื่อง) หรือ นิยาย #88
const renderTargetName = (targetType, targetId, targetName) => {
  if (!targetType && !targetId) return "-";
  const typeLabel = TARGET_TYPE_MAP[targetType?.toLowerCase()] || targetType || "เป้าหมาย";
  if (targetName && targetName.trim() !== "") {
    return `${typeLabel} (${targetName})`;
  }
  if (targetId !== null && targetId !== undefined && targetId !== "") {
    return `${typeLabel} #${targetId}`;
  }
  return typeLabel;
};

// แสดง Badge สถานะ (SUCCESS = เขียว, FAILURE = แดง, อื่นๆ = ส้ม/เทา)
const renderStatusBadge = (status) => {
  const upper = (status || "").toUpperCase();
  if (upper === "SUCCESS") {
    return (
      <span className="admin-audit-status-badge admin-audit-status-badge--success">
        <CheckCircle2 size={13} />
        <span>สำเร็จ</span>
      </span>
    );
  }
  if (upper === "FAILURE" || upper === "FAILED" || upper === "ERROR") {
    return (
      <span className="admin-audit-status-badge admin-audit-status-badge--failure">
        <AlertCircle size={13} />
        <span>ไม่สำเร็จ</span>
      </span>
    );
  }
  return (
    <span className="admin-audit-status-badge admin-audit-status-badge--other">
      {status || "-"}
    </span>
  );
};

// =========================================================================
// 3. Main Adminauditlog Component
// =========================================================================

export default function Adminauditlog() {
  // Main Data States
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [metadata, setMetadata] = useState({ actions: [], target_types: [], statuses: [] });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Filter States
  const [actionFilter, setActionFilter] = useState("");
  const [actorUserIdInput, setActorUserIdInput] = useState("");
  const [actorUserIdFilter, setActorUserIdFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [filterValidationMsg, setFilterValidationMsg] = useState("");

  // Debounce Actor User ID Input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setActorUserIdFilter(actorUserIdInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [actorUserIdInput]);

  // Mobile Filter Drawer State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Detail Modal States
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // คำนวณจำนวนหน้าทั้งหมด
  const totalPages = Math.ceil(total / limit) || 1;

  // ตรวจสอบว่ามี Filter ที่กำลังใช้งานอยู่หรือไม่
  const hasActiveFilters = Boolean(
    actionFilter ||
    actorUserIdInput ||
    targetTypeFilter ||
    statusFilter ||
    dateFromFilter ||
    dateToFilter
  );

  // 🟢 Fetch List Audit Logs
  const fetchAuditLogs = useCallback(async (isSilent = false) => {
    // Validate filters before calling API
    setFilterValidationMsg("");
    setError("");

    if (dateFromFilter && dateToFilter) {
      const fromD = new Date(dateFromFilter);
      const toD = new Date(dateToFilter);
      if (fromD >= toD) {
        setFilterValidationMsg("วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด");
        return;
      }
    }

    // จุดที่ 4: ตรวจสอบ Token ว่างก่อนยิง API
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login-register";
      return;
    }

    if (!isSilent) setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (actionFilter) params.set("action", actionFilter);
      if (actorUserIdFilter) {
        params.set("actor", actorUserIdFilter);
      }
      if (targetTypeFilter) params.set("target_type", targetTypeFilter);
      if (statusFilter) params.set("status", statusFilter);

      if (dateFromFilter) {
        const isoFrom = new Date(dateFromFilter).toISOString();
        params.set("date_from", isoFrom);
      }
      if (dateToFilter) {
        const isoTo = new Date(dateToFilter).toISOString();
        params.set("date_to", isoTo);
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle 401 Unauthorized
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login-register";
        return;
      }

      // Handle 403 Forbidden
      if (res.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const text = await res.text();
      let resJson;
      try {
        resJson = JSON.parse(text);
      } catch {
        throw new Error(text || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }

      if (!res.ok) {
        const rawMsg = resJson.message || resJson.error || "";
        const thaiMsg = ERROR_MESSAGE_MAP[rawMsg] || rawMsg || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
        throw new Error(thaiMsg);
      }

      const data = resJson.data || {};
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Fetch audit logs error:", err);
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, actorUserIdFilter, targetTypeFilter, statusFilter, dateFromFilter, dateToFilter]);

  // จุดที่ 6: Auto-refresh / Polling ทุก 30 วินาที
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAuditLogs(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAuditLogs]);

  // 🟢 Fetch Filter Metadata
  const fetchMetadata = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setMetadata(json.data);
        }
      }
    } catch (err) {
      console.error("Fetch audit metadata error:", err);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // จุดที่ 7: Export CSV (พร้อม BOM UTF-8 สำหรับภาษาไทย)
  const handleExportCSV = async () => {
    setIsExporting(true);
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login-register";
      return;
    }

    try {
      // ดึงข้อมูล 100 รายการตาม filter ปัจจุบันเพื่อ export
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "100");
      if (actionFilter) params.set("action", actionFilter);
      if (actorUserIdFilter) {
        params.set("actor", actorUserIdFilter);
      }
      if (targetTypeFilter) params.set("target_type", targetTypeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFromFilter) params.set("date_from", new Date(dateFromFilter).toISOString());
      if (dateToFilter) params.set("date_to", new Date(dateToFilter).toISOString());

      const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลเพื่อส่งออกได้");

      const json = await res.json();
      const items = json.data?.items || logs;

      const headers = ["รหัสรายการ", "เวลา", "ผู้กระทำ", "การกระทำ", "เป้าหมาย", "สถานะ", "ไอพี"];
      const csvRows = [headers.join(",")];

      items.forEach((item) => {
        const timeStr = `"${formatFullThaiDateTime(item.created_at)}"`;
        const actorStr = `"${renderActorName(item.actor_user_id, item.actor_role, item.actor_username)}"`;
        const actionStr = `"${ACTION_MAP[item.action]?.label || item.action}"`;
        const targetStr = `"${renderTargetName(item.target_type, item.target_id, item.target_name)}"`;
        const statusStr = `"${item.status === "SUCCESS" ? "สำเร็จ" : "ไม่สำเร็จ"}"`;
        const ipStr = `"${item.ip_address || "-"}"`;

        csvRows.push([item.log_id, timeStr, actorStr, actionStr, targetStr, statusStr, ipStr].join(","));
      });

      // ใส่ \uFEFF (UTF-8 BOM) เพื่อให้ Microsoft Excel รองรับภาษาไทยได้สมบูรณ์
      const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export CSV error:", err);
      alert(err.message || "เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV");
    } finally {
      setIsExporting(false);
    }
  };

  // 🟢 Fetch Single Audit Log Detail
  const fetchLogDetail = async (id) => {
    setSelectedLogId(id);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailData(null);

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login-register";
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login-register";
        return;
      }

      if (res.status === 403) {
        setDetailError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        return;
      }

      if (res.status === 404) {
        setDetailError("ไม่พบรายการนี้");
        return;
      }

      const text = await res.text();
      let resJson;
      try {
        resJson = JSON.parse(text);
      } catch {
        throw new Error("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }

      if (!res.ok) {
        const rawMsg = resJson.message || resJson.error || "";
        const thaiMsg = ERROR_MESSAGE_MAP[rawMsg] || (res.status === 404 ? "ไม่พบรายการนี้" : "เกิดข้อผิดพลาด กรุณาลองใหม่");
        throw new Error(thaiMsg);
      }

      setDetailData(resJson.data);
    } catch (err) {
      console.error("Fetch log detail error:", err);
      setDetailError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter change handlers (always resets page to 1)
  const handleActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const handleActorUserIdChange = (e) => {
    setActorUserIdInput(e.target.value);
  };

  const handleTargetTypeChange = (e) => {
    setTargetTypeFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleDateFromChange = (e) => {
    setDateFromFilter(e.target.value);
    setPage(1);
  };

  const handleDateToChange = (e) => {
    setDateToFilter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setActionFilter("");
    setActorUserIdInput("");
    setActorUserIdFilter("");
    setTargetTypeFilter("");
    setStatusFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setFilterValidationMsg("");
    setPage(1);
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  // 🟢 จุดที่ 5: Handle 403 Forbidden Screen พร้อมปุ่มกลับหน้าแรก
  if (accessDenied) {
    return (
      <div className="admin-audit-container">
        <div className="admin-audit-access-denied">
          <Shield size={56} className="access-denied-icon" />
          <h2>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p>หน้านี้สงวนไว้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น</p>
          <a href="/" className="btn-back-home" style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", backgroundColor: "#0284c7", color: "#ffffff", textDecoration: "none", fontWeight: "600" }}>
            <Home size={18} />
            <span>กลับสู่หน้าหลัก</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-audit-container">
      <div className="admin-audit-content">
        
        {/* =======================================================
            1. Header
           ======================================================= */}
        <header className="admin-audit-header">
          <div className="admin-audit-header__left">
            <div className="admin-audit-title-wrap">
              <h2 className="admin-audit-title">ประวัติการใช้งานระบบ</h2>
              <span className="admin-audit-badge-total">
                ทั้งหมด {total.toLocaleString()} รายการ
              </span>
            </div>
          </div>
          <div className="admin-audit-header__right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* จุดที่ 7: Export CSV Button */}
            <button
              type="button"
              className="admin-audit-btn-refresh"
              onClick={handleExportCSV}
              disabled={isExporting || loading}
              title="ดาวน์โหลดรายการ Log เป็นไฟล์ CSV"
            >
              <Download size={16} className={isExporting ? "spin" : ""} />
              <span>{isExporting ? "กำลังส่งออก..." : "ส่งออก CSV"}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              className="admin-audit-btn-refresh"
              onClick={() => fetchAuditLogs()}
              disabled={loading}
              title="รีเฟรชข้อมูลปัจจุบัน"
            >
              <RotateCw size={16} className={loading ? "spin" : ""} />
              <span>รีเฟรช</span>
            </button>
          </div>
        </header>

        {/* =======================================================
            2. Filter Bar
           ======================================================= */}
        <div className="admin-audit-filter-card">
          {/* Mobile Filter Trigger Button */}
          <div className="admin-audit-mobile-filter-trigger">
            <button
              type="button"
              className="btn-open-mobile-filter"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            >
              <Filter size={16} />
              <span>ตัวกรองข้อมูล {hasActiveFilters && "(กำลังใช้งาน)"}</span>
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-clear-filter-text"
                onClick={handleClearFilters}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div className={`admin-audit-filter-grid ${isMobileFilterOpen ? "open" : ""}`}>
            {/* 1. Action Filter */}
            <div className="admin-audit-filter-item">
              <label htmlFor="filter-action" className="admin-audit-filter-label">การกระทำ</label>
              <select
                id="filter-action"
                className="admin-audit-select"
                value={actionFilter}
                onChange={handleActionChange}
              >
                <option value="">ทุกการกระทำ</option>
                {Object.entries(ACTION_MAP).map(([actionKey, info]) => (
                  <option key={actionKey} value={actionKey}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Actor Filter (Debounced) */}
            <div className="admin-audit-filter-item">
              <label htmlFor="filter-actor" className="admin-audit-filter-label">ผู้กระทำ (ชื่อผู้ใช้ / ID)</label>
              <input
                id="filter-actor"
                type="text"
                className="admin-audit-input"
                placeholder="ชื่อผู้ใช้ หรือ ID เช่น jane_writer"
                value={actorUserIdInput}
                onChange={handleActorUserIdChange}
              />
            </div>

            {/* 3. Target Type Filter */}
            <div className="admin-audit-filter-item">
              <label htmlFor="filter-target" className="admin-audit-filter-label">ประเภทเป้าหมาย</label>
              <select
                id="filter-target"
                className="admin-audit-select"
                value={targetTypeFilter}
                onChange={handleTargetTypeChange}
              >
                <option value="">ทุกประเภท</option>
                {Object.entries(TARGET_TYPE_MAP).map(([typeKey, label]) => (
                  <option key={typeKey} value={typeKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Status Filter */}
            <div className="admin-audit-filter-item">
              <label htmlFor="filter-status" className="admin-audit-filter-label">สถานะ</label>
              <select
                id="filter-status"
                className="admin-audit-select"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="">ทุกสถานะ</option>
                {metadata.statuses && metadata.statuses.length > 0 ? (
                  metadata.statuses.map((st) => (
                    <option key={st} value={st}>
                      {st === "SUCCESS" ? "สำเร็จ" : st === "FAILURE" ? "ไม่สำเร็จ" : st}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="SUCCESS">สำเร็จ</option>
                    <option value="FAILURE">ไม่สำเร็จ</option>
                  </>
                )}
              </select>
            </div>

            {/* 5. Date Range Filter */}
            <div className="admin-audit-filter-item admin-audit-filter-item--date">
              <label className="admin-audit-filter-label">ช่วงวันที่</label>
              <div className="admin-audit-date-range-group">
                <input
                  type="datetime-local"
                  className="admin-audit-input admin-audit-input--date"
                  value={dateFromFilter}
                  onChange={handleDateFromChange}
                  title="จากวันที่"
                />
                <span className="admin-audit-date-sep">ถึง</span>
                <input
                  type="datetime-local"
                  className="admin-audit-input admin-audit-input--date"
                  value={dateToFilter}
                  onChange={handleDateToChange}
                  title="ถึงวันที่"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Action Row */}
          {hasActiveFilters && (
            <div className="admin-audit-filter-actions">
              <button
                type="button"
                className="btn-clear-filter"
                onClick={handleClearFilters}
              >
                <X size={14} />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            </div>
          )}
        </div>

        {/* Validation Error Banner */}
        {filterValidationMsg && (
          <div className="admin-audit-banner admin-audit-banner--warning">
            <AlertCircle size={18} />
            <span>{filterValidationMsg}</span>
          </div>
        )}

        {/* Server/API Error Banner */}
        {error && (
          <div className="admin-audit-banner admin-audit-banner--error">
            <AlertCircle size={18} />
            <div className="admin-audit-banner__content">
              <span>{error}</span>
              <button type="button" className="btn-retry-banner" onClick={fetchAuditLogs}>
                ลองอีกครั้ง
              </button>
            </div>
          </div>
        )}

        {/* =======================================================
            3. Table & Card List
           ======================================================= */}
        <div className="admin-audit-table-card">
          
          {/* Desktop Table View */}
          <div className="admin-audit-table-wrapper">
            <table className="admin-audit-table">
              <thead>
                <tr>
                  <th style={{ width: "170px" }}>เวลา</th>
                  <th style={{ width: "130px" }}>ผู้กระทำ</th>
                  <th>การกระทำ</th>
                  <th style={{ width: "150px" }}>เป้าหมาย</th>
                  <th style={{ width: "110px" }}>สถานะ</th>
                  <th style={{ width: "120px" }}>ไอพี</th>
                  <th style={{ width: "110px", textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading Skeleton Rows
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="admin-audit-row-skeleton">
                      <td><div className="skeleton-bar" style={{ width: "80%" }} /></td>
                      <td><div className="skeleton-bar" style={{ width: "70%" }} /></td>
                      <td><div className="skeleton-bar" style={{ width: "60%" }} /></td>
                      <td><div className="skeleton-bar" style={{ width: "50%" }} /></td>
                      <td><div className="skeleton-bar" style={{ width: "60%" }} /></td>
                      <td><div className="skeleton-bar" style={{ width: "75%" }} /></td>
                      <td><div className="skeleton-bar" style={{ width: "100%" }} /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  // Empty State Row
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-audit-empty-state">
                        <Inbox size={48} className="empty-icon" />
                        <h3>ไม่พบประวัติการใช้งาน</h3>
                        {hasActiveFilters && <p>ลองปรับตัวกรองใหม่อีกครั้ง</p>}
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Data Rows
                  logs.map((log) => {
                    const actionInfo = ACTION_MAP[log.action] || {
                      label: log.action,
                      group: "gray",
                      color: "#475569",
                      bg: "#f1f5f9",
                      border: "#cbd5e1",
                    };

                    return (
                      <tr
                        key={log.log_id}
                        className="admin-audit-row"
                        onClick={() => fetchLogDetail(log.log_id)}
                      >
                        {/* เวลา */}
                        <td>
                          <span
                            className="admin-audit-time"
                            title={formatFullThaiDateTime(log.created_at)}
                          >
                            {formatShortThaiDateTime(log.created_at)}
                          </span>
                        </td>

                        {/* ผู้กระทำ */}
                        <td>
                          <span className="admin-audit-actor">
                            {renderActorName(log.actor_user_id, log.actor_role, log.actor_username)}
                          </span>
                        </td>

                        {/* การกระทำ */}
                        <td>
                          <span
                            className="admin-audit-action-badge"
                            style={{
                              backgroundColor: actionInfo.bg,
                              color: actionInfo.color,
                              borderColor: actionInfo.border,
                            }}
                          >
                            {actionInfo.label}
                          </span>
                        </td>

                        {/* เป้าหมาย */}
                        <td>
                          <span className="admin-audit-target">
                            {renderTargetName(log.target_type, log.target_id, log.target_name)}
                          </span>
                        </td>

                        {/* สถานะ */}
                        <td>
                          {renderStatusBadge(log.status)}
                        </td>

                        {/* ไอพี */}
                        <td>
                          <span className="admin-audit-ip font-mono">
                            {log.ip_address || "-"}
                          </span>
                        </td>

                        {/* ดูรายละเอียด */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-view-detail"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchLogDetail(log.log_id);
                            }}
                          >
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="admin-audit-mobile-card-list">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={`m-skeleton-${idx}`} className="admin-audit-mobile-card skeleton">
                  <div className="skeleton-bar" style={{ width: "40%", height: "16px", marginBottom: "8px" }} />
                  <div className="skeleton-bar" style={{ width: "70%", height: "20px", marginBottom: "8px" }} />
                  <div className="skeleton-bar" style={{ width: "50%", height: "14px" }} />
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="admin-audit-empty-state">
                <Inbox size={48} className="empty-icon" />
                <h3>ไม่พบประวัติการใช้งาน</h3>
                {hasActiveFilters && <p>ลองปรับตัวกรองใหม่อีกครั้ง</p>}
              </div>
            ) : (
              logs.map((log) => {
                const actionInfo = ACTION_MAP[log.action] || {
                  label: log.action,
                  group: "gray",
                  color: "#475569",
                  bg: "#f1f5f9",
                  border: "#cbd5e1",
                };

                return (
                  <div
                    key={`mobile-${log.log_id}`}
                    className="admin-audit-mobile-card"
                    onClick={() => fetchLogDetail(log.log_id)}
                  >
                    <div className="mobile-card-header">
                      <span className="mobile-card-time">
                        {formatShortThaiDateTime(log.created_at)}
                      </span>
                      {renderStatusBadge(log.status)}
                    </div>

                    <div className="mobile-card-body">
                      <span
                        className="admin-audit-action-badge"
                        style={{
                          backgroundColor: actionInfo.bg,
                          color: actionInfo.color,
                          borderColor: actionInfo.border,
                        }}
                      >
                        {actionInfo.label}
                      </span>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">ผู้กระทำ:</span>
                        <span className="mobile-card-value">
                          {renderActorName(log.actor_user_id, log.actor_role, log.actor_username)}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">เป้าหมาย:</span>
                        <span className="mobile-card-value">
                          {renderTargetName(log.target_type, log.target_id, log.target_name)}
                        </span>
                      </div>
                    </div>

                    <div className="mobile-card-footer">
                      <span className="mobile-card-ip">IP: {log.ip_address || "-"}</span>
                      <span className="mobile-card-btn-text">แตะเพื่อดูรายละเอียด →</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* =======================================================
              4. Pagination
             ======================================================= */}
          <div className="admin-audit-pagination">
            <div className="admin-audit-pagination__left">
              <span className="admin-audit-page-info">
                หน้า <strong>{page}</strong> จาก <strong>{totalPages}</strong>
              </span>

              <div className="admin-audit-limit-selector">
                <label htmlFor="select-limit" className="limit-label">แสดงต่อหน้า</label>
                <select
                  id="select-limit"
                  className="admin-audit-select admin-audit-select--limit"
                  value={limit}
                  onChange={handleLimitChange}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="admin-audit-pagination__right">
              <button
                type="button"
                className="btn-page-nav"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={16} />
                <span>ก่อนหน้า</span>
              </button>

              <button
                type="button"
                className="btn-page-nav"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              >
                <span>ถัดไป</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* =======================================================
          5. Detail Modal / Drawer
         ======================================================= */}
      {detailModalOpen && (
        <div className="admin-audit-modal-backdrop" onClick={() => setDetailModalOpen(false)}>
          <div className="admin-audit-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="admin-audit-modal-header">
              <div className="modal-header-title-wrap">
                <FileText size={20} className="modal-header-icon" />
                <h3 className="admin-audit-modal-title">
                  รายละเอียดรายการ #{selectedLogId}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setDetailModalOpen(false)}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="admin-audit-modal-body">
              {detailLoading ? (
                <div className="admin-audit-modal-loading">
                  <Loader2 size={36} className="spin loading-icon" />
                  <p>กำลังโหลดรายละเอียดประวัติ...</p>
                </div>
              ) : detailError ? (
                <div className="admin-audit-modal-error">
                  <AlertCircle size={36} className="error-icon" />
                  <h4>{detailError}</h4>
                  <button
                    type="button"
                    className="btn-retry-modal"
                    onClick={() => fetchLogDetail(selectedLogId)}
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                </div>
              ) : detailData ? (
                <div className="admin-audit-detail-wrapper">
                  
                  {/* Summary Section */}
                  <div className="detail-section">
                    <h4 className="detail-section-title">สรุปข้อมูล</h4>
                    <table className="admin-audit-detail-table">
                      <tbody>
                        <tr>
                          <td className="detail-label">ผู้กระทำ</td>
                          <td className="detail-value">
                            {renderActorName(detailData.actor_user_id, detailData.actor_role, detailData.actor_username)}
                          </td>
                        </tr>
                        <tr>
                          <td className="detail-label">การกระทำ</td>
                          <td className="detail-value">
                            {ACTION_MAP[detailData.action]?.label || detailData.action}
                          </td>
                        </tr>
                        <tr>
                          <td className="detail-label">เป้าหมาย</td>
                          <td className="detail-value">
                            {renderTargetName(detailData.target_type, detailData.target_id, detailData.target_name)}
                          </td>
                        </tr>
                        {detailData.metadata?.novel_title && (
                          <tr>
                            <td className="detail-label">นิยาย</td>
                            <td className="detail-value" style={{ fontWeight: 600, color: "#0284c7" }}>
                              {detailData.metadata.novel_title} {detailData.metadata.novel_id ? `(#${detailData.metadata.novel_id})` : ""}
                            </td>
                          </tr>
                        )}
                        {detailData.metadata?.chapter_title && (
                          <tr>
                            <td className="detail-label">ตอน</td>
                            <td className="detail-value" style={{ fontWeight: 600, color: "#475569" }}>
                              {detailData.metadata.chapter_title} {detailData.metadata.chapter_id ? `(#${detailData.metadata.chapter_id})` : ""}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="detail-label">สถานะ</td>
                          <td className="detail-value">
                            {renderStatusBadge(detailData.status)}
                          </td>
                        </tr>
                        <tr>
                          <td className="detail-label">ไอพี</td>
                          <td className="detail-value font-mono">
                            {detailData.ip_address || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td className="detail-label">วันที่/เวลา</td>
                          <td className="detail-value">
                            {formatFullThaiDateTime(detailData.created_at)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Metadata Section */}
                  <div className="detail-section">
                    <h4 className="detail-section-title">ข้อมูลเพิ่มเติม</h4>
                    {detailData.metadata && Object.keys(detailData.metadata).length > 0 ? (
                      <table className="admin-audit-detail-table admin-audit-detail-table--metadata">
                        <thead>
                          <tr>
                            <th style={{ width: "40%" }}>ข้อมูล</th>
                            <th>ค่า</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(detailData.metadata).map(([metaKey, metaVal]) => {
                            const labelThai = METADATA_KEY_MAP[metaKey] || metaKey;
                            const formattedVal = formatMetadataValue(metaKey, metaVal, detailData.metadata);

                            return (
                              <tr key={metaKey}>
                                <td className="detail-label">{labelThai}</td>
                                <td className="detail-value">{formattedVal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-audit-metadata-empty">
                        <p>ไม่มีข้อมูลเพิ่มเติม</p>
                      </div>
                    )}
                  </div>

                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="admin-audit-modal-footer">
              <button
                type="button"
                className="btn-modal-dismiss"
                onClick={() => setDetailModalOpen(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
