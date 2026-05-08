// src/components/ChoiceButtons/ChoiceButtons.jsx
import React, { useState } from "react";
import "./ChoiceButtons.css";

/**
 * ChoiceButtons — ปุ่มเลือกตัวเลือกท้ายตอน
 * @param {string} prompt - คำถาม / prompt แสดงเหนือปุ่ม
 * @param {Array} choices - [{id, text, nextChapterId}]
 * @param {function} onChoose - callback(choice) เมื่อเลือก
 */
const ChoiceButtons = ({ prompt, choices = [], onChoose }) => {
  const [selected, setSelected] = useState(null);

  const handleChoose = (choice) => {
    if (selected) return; // ป้องกันกดซ้ำ
    setSelected(choice.id);
    // เล็กน้อย delay ก่อน navigate เพื่อให้เห็น animation
    setTimeout(() => {
      onChoose?.(choice);
      setSelected(null);
    }, 300);
  };

  return (
    <div className="choices" role="group" aria-label="ตัวเลือก">
      {/* Ornament */}
      <div className="choices__ornament" aria-hidden="true">
        <span className="choices__dot">✦</span>
        <span className="choices__dot">✦</span>
        <span className="choices__dot">✦</span>
      </div>

      {/* Prompt */}
      {prompt && <p className="choices__prompt">{prompt}</p>}

      {/* Buttons */}
      <div className="choices__list">
        {choices.map((choice) => (
          <button
            key={choice.id}
            className={`choices__btn ${selected === choice.id ? "choices__btn--selected" : ""}`}
            onClick={() => handleChoose(choice)}
            aria-label={choice.text}
            disabled={!!selected}
          >
            {choice.text}
            {selected === choice.id && (
              <span className="choices__btn-check" aria-hidden="true">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChoiceButtons;