import React from "react";
import "./EndingSettings.css";

const TYPES = [
  {
    value: "good",
    icon: "🌸",
    label: "Good Ending",
    hint: "ตอนจบที่ตัวละครได้รับผลลัพธ์ที่ดี",
    className: "good",
  },
  {
    value: "bad",
    icon: "💀",
    label: "Bad Ending",
    hint: "ตอนจบที่ตัวละครหรือโลกเสียหาย",
    className: "bad",
  },
  {
    value: "true",
    icon: "👑",
    label: "True Ending",
    hint: "ตอนจบที่เปิดเผยความจริงทั้งหมด",
    className: "true",
  },
  {
    value: "secret",
    icon: "🌙",
    label: "Secret Ending",
    hint: "ตอนจบลับที่ต้องค้นหาเส้นทางพิเศษ",
    className: "secret",
  },
];

export default function EndingSettings({
  sceneTitle = "แสงสุดท้ายแห่งอาณาจักร",
  isEnding = true,
  endingTitle = "",
  endingType = "true",
  endingDescription = "",
  endingDescriptionEnabled = false,
  onToggleEnding,
  onToggleEndingDescriptionEnabled,
  onChangeEndingTitle,
  onChangeEndingType,
  onChangeEndingDescription,
  onSave,
  onClose,
}) {
  const [descriptionEnabled, setDescriptionEnabled] = React.useState(Boolean(endingDescriptionEnabled || endingDescription));

  React.useEffect(() => {
    setDescriptionEnabled(Boolean(endingDescriptionEnabled || endingDescription));
  }, [endingDescriptionEnabled, endingDescription]);

  const handleToggleDescription = () => {
    const next = !descriptionEnabled;
    setDescriptionEnabled(next);
    onToggleEndingDescriptionEnabled?.(next);
  };
  const current = TYPES.find((t) => t.value === endingType) || TYPES[0];
  const previewTitle = endingTitle.trim() || sceneTitle;

  return (
    <div className="ending-page">
      <div className="ending-card">
        <div className="ending-header">
          <div>
            <h3>🏁 Ending Scene</h3>
            <p>
              เมื่อผู้อ่านมาถึงฉากนี้ ระบบจะบันทึกตอนจบและเพิ่มลงใน
              Ending Collection
            </p>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={isEnding}
              onChange={() => onToggleEnding?.(!isEnding)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {isEnding && (
          <>
            <div className="section">
              <label>ประเภทตอนจบ</label>

              <div className="type-grid">
                {TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`type-card ${
                      endingType === item.value ? "active" : ""
                    }`}
                    onClick={() => onChangeEndingType?.(item.value)}
                  >
                    <div className="icon">{item.icon}</div>
                    <div>{item.label}</div>
                  </button>
                ))}
              </div>

              <div className="type-hint">{current.hint}</div>
            </div>

            <div className="section">
              <label>
                ชื่อตอนจบ
                <span className="optional">
                  (ไม่กรอก = ใช้ชื่อ Scene)
                </span>
              </label>

              <input
                className="input"
                value={endingTitle}
                onChange={(e) => onChangeEndingTitle?.(e.target.value)}
                placeholder={sceneTitle}
              />
            </div>

            <div className="section section--toggle-row">
              <div>
                <label>คำอธิบายตอนจบ</label>
                <p className="section__hint">เลือกว่าต้องการเพิ่มคำอธิบายตอนจบหรือไม่</p>
              </div>
              <label className="switch switch--small">
                <input type="checkbox" checked={descriptionEnabled} onChange={handleToggleDescription} />
                <span className="slider" />
              </label>
            </div>

            {descriptionEnabled ? (
              <div className="section">
                <textarea
                  className="input"
                  style={{ minHeight: "96px", resize: "vertical" }}
                  value={endingDescription}
                  onChange={(e) => onChangeEndingDescription?.(e.target.value)}
                  placeholder="เขียนคำอธิบายสั้น ๆ สำหรับตอนจบนี้"
                />
              </div>
            ) : (
              <div className="section section--muted">
                <p>คำอธิบายจะไม่แสดงใน Ending Collection ถ้ายังไม่เปิดใช้งาน</p>
              </div>
            )}

            <div className="section">
              <label>Preview Ending Collection</label>

              <div className={`preview-card ${current.className}`}>
                <div className="preview-icon">{current.icon}</div>

                <div>
                  <span className="badge">
                    {current.label}
                  </span>

                  <h4>{previewTitle}</h4>

                  <p className="preview-description">
                    {descriptionEnabled
                      ? endingDescription.trim() || "ยังไม่มีคำอธิบายตอนจบ"
                      : "คำอธิบายตอนจบจะไม่แสดงหากปิดการใช้งาน"}
                  </p>

                  <small>
                    จะแสดงใน Ending Collection
                    หลังจากนักอ่านปลดล็อกตอนจบนี้
                  </small>
                </div>
              </div>
            </div>

            <button className="save-btn" type="button" onClick={() => onSave?.()}>
              บันทึกการตั้งค่าตอนจบ
            </button>
          </>
        )}
      </div>
    </div>
  );
}