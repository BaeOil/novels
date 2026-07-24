// src/components/Notification/NotificationItem.jsx

import "./NotificationItem.css";

const formatRelativeTime = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;

  if (diff < 60) return "เมื่อกี้";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 172800) return "เมื่อวาน";
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;

  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
};

const TYPE_CONFIG = {
  novel_update: {
    icon: "📖",
    action: "อัปเดตนิยายของคุณ",
  },
  comment: {
    icon: "💬",
    action: "แสดงความคิดเห็นในนิยายของคุณ",
  },
  like: {
    icon: "❤️",
    action: "กดถูกใจนิยายของคุณ",
  },
  follower: {
    icon: "👤",
    action: "เริ่มติดตามคุณแล้ว",
  },
  system: {
    icon: "✨",
    action: "ส่งการแจ้งเตือนให้คุณ",
  },
};

export default function NotificationItem({
  notification,
  onClick,
  onDelete,
}) {
  const type = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;

  return (
    <div
      className={`notification-item ${notification.read ? "" : "unread"} cursor-pointer hover:bg-slate-50`}
      onClick={() => onClick && onClick(notification)}
    >
      <div className="notification-avatar-wrapper">
        <div
          className="notification-avatar"
          style={{
            background: notification.actor.avatarColor,
          }}
        >
          {notification.actor.name.charAt(0)}
        </div>

        <span className="notification-type-badge">
          {type.icon}
        </span>
      </div>

      <div className="notification-main">
        <div className="notification-top">
          <div className="notification-user">
            <strong>{notification.actor.name}</strong>
            <span>{type.action}</span>
            {!notification.read && (
              <span className="notification-dot" />
            )}
          </div>

          <span className="notification-time">
            {formatRelativeTime(notification.time)}
          </span>
        </div>

        <div className="notification-card">
          {notification.novelCover && (
            <img
              src={notification.novelCover}
              alt=""
              className="notification-cover"
            />
          )}

          {notification.title && (
            <div className="notification-title">
              {notification.title}
            </div>
          )}

          {notification.body && (
            <div className="notification-message">
              {notification.body}
            </div>
          )}
        </div>

        <div className="notification-footer">
          <button
            className="notification-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
          >
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
}