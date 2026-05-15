// src/components/CoverUpload/CoverUpload.jsx
import React, { useState, useRef } from "react";
import "./CoverUpload.css";

/**
 * CoverUpload — อัปโหลดภาพปกนิยาย
 * รองรับ drag & drop + click to select
 * TODO: เชื่อม MinIO upload API เมื่อพร้อม
 *   POST /api/v1/upload/cover → { url: "https://..." }
 *
 * @param {string}   value     - URL ปัจจุบัน (ถ้ามี)
 * @param {function} onChange  - callback(file, previewUrl)
 */
const CoverUpload = ({ value, onChange }) => {
  const [preview, setPreview] = useState(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("รองรับเฉพาะไฟล์ PNG, JPG, WEBP เท่านั้น");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("ไฟล์ต้องไม่เกิน 5MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange?.(file, url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onChange?.(null, null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={`cup ${isDragging ? "cup--drag" : ""} ${preview ? "cup--has-image" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="อัปโหลดภาพปก"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="cup__input"
        onChange={handleChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {preview ? (
        /* ── มีภาพแล้ว ── */
        <div className="cup__preview">
          <img src={preview} alt="ภาพปก" className="cup__img" />
          <div className="cup__overlay">
            <button
              type="button"
              className="cup__change-btn"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              เปลี่ยนภาพ
            </button>
            <button
              type="button"
              className="cup__remove-btn"
              onClick={handleRemove}
              aria-label="ลบภาพ"
            >
              ลบ
            </button>
          </div>
        </div>
      ) : (
        /* ── ยังไม่มีภาพ ── */
        <div className="cup__placeholder">
          <div className="cup__placeholder-icon" aria-hidden="true">🖼️</div>
          <p className="cup__placeholder-text">คลิกหรือลากไฟล์มาวางที่นี่</p>
          <p className="cup__placeholder-hint">PNG, JPG · แนะนำ 400×600 px</p>
        </div>
      )}
    </div>
  );
};

export default CoverUpload;