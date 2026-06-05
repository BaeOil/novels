import React from "react";
import "./RestartReadingButton.css";

const RestartReadingButton = ({ onRestart, disabled = false }) => {
  return (
    <button
      type="button"
      className="restart-reading-button"
      onClick={onRestart}
      disabled={disabled}
      aria-label="เริ่มอ่านใหม่"
    >
      🔄 เริ่มอ่านใหม่
    </button>
  );
};

export default RestartReadingButton;
