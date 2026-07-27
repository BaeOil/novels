import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationPage.css";
import NotificationItem from "../../../components/Notification/NotificationItem";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const normalizeNotification = (item = {}) => {
  const type = item.type === "follow" ? "follower" : item.type || "system";
  const actorName = item.actor_name || item.actor?.name || "StoryVerse System";
  const actorColor = item.actor_color || item.actor?.avatarColor || "#E91E8C";
  const actorAvatar = item.actor_avatar || item.actor?.avatar || "";

  return {
    id: item.id ?? item.notification_id,
    type,
    read: Boolean(item.is_read ?? item.read),
    actor: {
      id: item.actor_id ?? item.actor?.id ?? 0,
      name: actorName,
      avatar: actorAvatar,
      avatarColor: actorColor,
    },
    title: item.title ?? null,
    body: item.message ?? item.body ?? "",
    cover: item.cover_image ?? item.cover ?? item.novelCover ?? null,
    novelCover: item.cover_image ?? item.cover ?? item.novelCover ?? null,
    referenceId: item.reference_id ?? item.referenceId ?? null,
    referenceType: item.reference_type ?? item.referenceType ?? "system",
    createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
    time: item.time ?? item.created_at ?? item.createdAt ?? new Date().toISOString(),
  };
};

const buildHeaders = (extra = {}) => {
  const token = localStorage.getItem("token") || "";
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: buildHeaders(options.headers || {}),
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
};

const TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "unread", label: "ยังไม่อ่าน" },
  { key: "system", label: "ระบบ" },
  { key: "novel_update", label: "นิยาย" },
  { key: "comment", label: "คอมเมนต์" },
  { key: "like", label: "ถูกใจ ❤️" },
  { key: "follower", label: "ผู้ติดตาม" },
];

function relativeTime(date) {
  const diff = (Date.now() - new Date(date)) / 1000;

  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 172800) return "เมื่อวาน";

  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

function groupLabel(date) {
  const diff = (Date.now() - new Date(date)) / 86400000;

  if (diff < 1) return "วันนี้";
  if (diff < 2) return "เมื่อวาน";
  if (diff < 7) return "สัปดาห์นี้";

  return "เก่ากว่านี้";
}

export default function NotificationPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  const unreadCount = items.filter((i) => !i.read).length;

  const loadNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setItems([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    try {
      const payload = await requestJson(`/notifications?limit=50`);
      const data = payload?.data ?? payload;
      const list = Array.isArray(data) ? data : Array.isArray(data?.notifications) ? data.notifications : [];
      setItems(list.map(normalizeNotification));
      setError("");
    } catch (err) {
      console.error("โหลดแจ้งเตือนไม่สำเร็จ", err);
      setError("โหลดการแจ้งเตือนไม่สำเร็จ");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const token = localStorage.getItem("token");
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setItems((prev) => [normalizeNotification(payload), ...prev]);
      } catch {
        // ignore heartbeat
      }
    };

    window.addEventListener("notifications-updated", loadNotifications);
    return () => {
      eventSource.close();
      window.removeEventListener("notifications-updated", loadNotifications);
    };
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (tab === "all") return true;
        if (tab === "unread") return !item.read;
        return item.type === tab;
      })
      .map((item) => ({
        ...item,
        relativeTime: relativeTime(item.time),
      }));
  }, [items, tab]);

  const grouped = useMemo(() => {
    const result = {};

    filtered.forEach((item) => {
      const label = groupLabel(item.time);
      if (!result[label]) result[label] = [];
      result[label].push(item);
    });

    return result;
  }, [filtered]);

  const markRead = async (id) => {
    try {
      await requestJson(`/notifications/${id}/read`, { method: "PATCH" });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error("mark read failed", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;
    try {
      if (!notification.read) {
        await markRead(notification.id);
      }
    } catch (err) {
      // markRead already logs
    }

    const refType = notification.referenceType || notification.reference_type || "system";
    const refId = notification.referenceId ?? notification.reference_id ?? null;

    try {
      if (refType === "novel" && refId) {
        navigate(`/novel/${refId}`);
        return;
      }
      if (refType === "chapter" && refId) {
        navigate(`/novel/${refId}`);
        return;
      }
      if (refType === "user" && refId) {
        navigate(`/writer/${refId}/profile`);
        return;
      }
    } catch (err) {
      console.error("navigation failed", err);
    }
  };

  const markAllRead = async () => {
    try {
      await requestJson(`/notifications/read-all`, { method: "PATCH" });
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error("mark all read failed", err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await requestJson(`/notifications/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error("delete notification failed", err);
    }
  };

  const clearAll = async () => {
    try {
      await requestJson(`/notifications`, { method: "DELETE" });
      setItems([]);
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (err) {
      console.error("clear all failed", err);
    }
  };
  const hasItems = items.length > 0;

  return (
    <div className="notification-page">
      {/* ================= HEADER ================= */}
      <header className="notification-header">
        <div className="notification-header-left">
          <button type="button" className="back-button" onClick={() => navigate(-1)} aria-label="ย้อนกลับ">
            ←
          </button>
          <div>
            <h1>🔔 การแจ้งเตือน</h1>
            <p>
              {unreadCount > 0
                ? `${unreadCount} รายการที่ยังไม่ได้อ่าน`
                : "อ่านครบทุกรายการแล้ว"}
            </p>
          </div>
        </div>

        <div className="notification-header-right">
          {unreadCount > 0 && (
            <button type="button" className="read-all-button" onClick={markAllRead}>
              อ่านทั้งหมด
            </button>
          )}

          <button
            type="button"
            className="clear-button"
            onClick={clearAll}
            disabled={!hasItems}
          >
            ล้างทั้งหมด
          </button>
        </div>
      </header>

      {/* ================= TAB ================= */}
      <div className="notification-tabs" role="tablist" aria-label="กรองการแจ้งเตือน">
        {TABS.map((tabItem) => {
          const count =
            tabItem.key === "all"
              ? items.length
              : tabItem.key === "unread"
              ? unreadCount
              : items.filter((item) => item.type === tabItem.key).length;

          return (
            <button
              type="button"
              key={tabItem.key}
              role="tab"
              aria-selected={tab === tabItem.key}
              className={tab === tabItem.key ? "tab active" : "tab"}
              onClick={() => setTab(tabItem.key)}
            >
              {tabItem.label}
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ================= CONTENT ================= */}
      <div className="notification-content">
        {loading ? (
          <div className="notification-empty">
            <div className="empty-icon notification-spinner">⏳</div>
            <h2>กำลังโหลดการแจ้งเตือน…</h2>
          </div>
        ) : error ? (
          <div className="notification-empty notification-empty-error">
            <div className="empty-icon">⚠️</div>
            <h2>{error}</h2>
            <p>ลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อของคุณ</p>
            <button type="button" onClick={loadNotifications}>
              ลองอีกครั้ง
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="notification-empty">
            <div className="empty-icon">
              {hasItems ? "🔍" : "🔔"}
            </div>
            <h2>
              {hasItems ? "ไม่มีรายการในหมวดนี้" : "ยังไม่มีการแจ้งเตือน"}
            </h2>
            <p>
              {hasItems
                ? "ลองเลือกแท็บอื่นเพื่อดูการแจ้งเตือนประเภทอื่น"
                : "การแจ้งเตือนใหม่จะปรากฏที่นี่"}
            </p>
            {hasItems ? (
              <button type="button" onClick={() => setTab("all")}>
                ดูทั้งหมด
              </button>
            ) : (
              <button type="button" onClick={() => navigate("/")}>
                ไปสำรวจนิยาย
              </button>
            )}
          </div>
        ) : (
          ["วันนี้", "เมื่อวาน", "สัปดาห์นี้", "เก่ากว่านี้"]
            .filter((group) => grouped[group])
            .map((group) => (
              <section key={group} className="notification-group">
                <h3 className="group-title">{group}</h3>
                <div className="notification-group-list">
                  {grouped[group].map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={handleNotificationClick}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
    </div>
  );
}