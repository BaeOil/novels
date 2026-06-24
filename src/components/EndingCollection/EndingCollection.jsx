import React, { useState, useEffect } from "react";
import "./EndingCollection.css";

const endingTypeMeta = {
  good: { label: "True Ending", color: "#C8960C", icon: "👑", bg: "#FEF8E0", glow: "#F5C842" },
  bad: { label: "Bad Ending", color: "#9B2020", icon: "💀", bg: "#FDECEA", glow: "#E05C5C" },
  secret: { label: "Secret Ending", color: "#6D28D9", icon: "🌙", bg: "#EDE9FE", glow: "#8B5CF6" },
  unknown: { label: "Unknown Ending", color: "#4B5563", icon: "❓", bg: "#F3F4F6", glow: "#9CA3AF" },
};

const filterOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "true", label: "True Ending" },
  { value: "bad", label: "Bad Ending" },
  { value: "secret", label: "Secret Ending" },
  { value: "unknown", label: "Unknown" },
];

const EndingCollection = ({ isOpen, endings, onClose, onViewStoryMap }) => {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const unlockedEndings = endings.filter((item) => item.is_unlocked);
  const visibleEndings = unlockedEndings.filter((item) =>
    filter === "all" ? true : (item.ending_type || item.type) === filter
  );

  useEffect(() => {
    if (!isOpen) {
      setFilter("all");
      setSelected(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="ending-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ending-collection-heading" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ending-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ending-modal__close" type="button" onClick={onClose} aria-label="ปิด Ending Collection">×</button>

        <header className="ending-modal__header">
          <div>
            <p className="ending-modal__subtitle">Ending Collection</p>
            <h2 id="ending-collection-heading">รวมฉากจบที่ปลดล็อกแล้ว</h2>
            <p className="ending-modal__description">ดูเฉพาะตอนจบที่คุณปลดล็อกแล้วเท่านั้น</p>
          </div>
        </header>

        <div className="ending-filter-buttons">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`ending-filter-button ${filter === option.value ? "ending-filter-button--active" : ""}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="ending-grid">
          {visibleEndings.length === 0 ? (
            <div className="ending-empty">ยังไม่มีฉากจบที่ปลดล็อกในหมวดนี้</div>
          ) : visibleEndings.map((ending) => {
            const key = ending.scene_id || ending.id;
            const typeKey = ending.ending_type || ending.type || "unknown";
            const meta = endingTypeMeta[typeKey] || endingTypeMeta.unknown;
            const title = ending.ending_title || ending.title || "ฉากจบไม่ได้ตั้งชื่อ";
            const description = ending.ending_description || ending.endingDescription || ending.description || "ยังไม่มีคำอธิบายตอนจบ";

            return (
              <button
                key={key}
                type="button"
                className="ending-card"
                onClick={() => setSelected(ending)}
              >
                <div className="ending-card__icon" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="ending-card__label" style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </div>
                <h3 className="ending-card__title">{title}</h3>
                <p className="ending-card__meta">{description}</p>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="ending-detail-popup">
            <div className="ending-detail-popup__header" style={{ borderColor: endingTypeMeta[selected.ending_type || selected.type || "unknown"].glow }}>
              <div className="ending-detail-popup__icon">{endingTypeMeta[selected.ending_type || selected.type || "unknown"].icon}</div>
              <span className="ending-detail-popup__type">{endingTypeMeta[selected.ending_type || selected.type || "unknown"].label}</span>
              <h3 className="ending-detail-popup__title">{selected.ending_title || selected.title}</h3>
              <p className="ending-detail-popup__desc">{selected.ending_description || selected.endingDescription || selected.description || "ยังไม่มีรายละเอียดสำหรับฉากจบนี้"}</p>
            </div>
            <div className="ending-detail-popup__body">
              <div className="ending-detail-popup__meta-row">
                <div>
                  <span>ปลดล็อคเมื่อ</span>
                  <strong>{(() => {
                    const unlockedAtRaw = selected.unlocked_at || selected.unlockedAt || selected.reached_at;
                    if (!unlockedAtRaw) {
                      return "ไม่ระบุ";
                    }
                    const parsedDate = new Date(unlockedAtRaw);
                    return Number.isNaN(parsedDate.getTime()) ? unlockedAtRaw : parsedDate.toLocaleDateString();
                  })()}</strong>
                </div>
              </div>
              {selected.path && (
                <div className="ending-detail-popup__path">
                  {selected.path.map((step, idx) => (
                    <span key={idx} className="ending-detail-popup__path-step">
                      {step}
                    </span>
                  ))}
                </div>
              )}
              <div className="ending-detail-popup__actions">
                <button
                  type="button"
                  className="ending-detail-popup__button ending-detail-popup__button--primary"
                  onClick={() => onViewStoryMap?.(selected.scene_id || selected.id)}
                >
                  ดูแผนผังเส้นทาง
                </button>
                <button type="button" className="ending-detail-popup__button ending-detail-popup__button--secondary" onClick={() => setSelected(null)}>
                  กลับ Collection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EndingCollection;
