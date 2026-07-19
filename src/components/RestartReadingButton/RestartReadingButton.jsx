import React from "react";
// สามารถเอาบรรทัด import "./RestartReadingButton.css" ออกได้เลย 
// เพราะเราจะไปใช้ class จาก rp__ending-btn แทน

const RestartReadingButton = ({ onRestart, disabled = false, className = "" }) => {
  return (
    <button
      type="button"
      // เปลี่ยนมาใช้ class แบบเดียวกับปุ่ม "กลับหน้ารายละเอียด"
      className={`rp__ending-btn rp__ending-btn--outline ${className}`} 
      onClick={onRestart}
      disabled={disabled}
      aria-label="เริ่มอ่านใหม่"
    >
      🔄 เริ่มอ่านใหม่
    </button>
  );
};

export default RestartReadingButton;