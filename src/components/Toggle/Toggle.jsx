// src/components/Toggle/Toggle.jsx
import React from "react";
import "./Toggle.css";

/**
 * Toggle — สวิตช์ on/off
 * @param {boolean}  checked   - สถานะ
 * @param {function} onChange  - callback(newValue)
 * @param {string}   label     - ป้ายกำกับ (optional)
 * @param {string}   id        - id สำหรับ accessibility
 */
const Toggle = ({ checked = false, onChange, label, id }) => {
  return (
    <label className="toggle-wrap" htmlFor={id}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle ${checked ? "toggle--on" : "toggle--off"}`}
        onClick={() => onChange?.(!checked)}
      >
        <span className="toggle__thumb" />
      </button>
      {label && (
        <span className={`toggle__label ${checked ? "toggle__label--on" : ""}`}>
          {checked ? "เผยแพร่" : "ยังไม่จบ"}
        </span>
      )}
    </label>
  );
};

export default Toggle;