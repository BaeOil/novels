// src/components/ChoiceButtons/ChoiceButtons.jsx
import React, { useState } from "react";
import "./ChoiceButtons.css";

const ChoiceButtons = ({ prompt, choices = [], onChoose }) => {
  const [selected, setSelected] = useState(null);

  const handleChoose = (choice) => {
    if (selected !== null) return;

    if (choice.is_unavailable) {
      onChoose?.(choice);
      return;
    }

    setSelected(choice.id);

    window.setTimeout(() => {
      onChoose?.(choice);
      setSelected(null);
    }, 300);
  };

  return (
    <div className="choices" role="group" aria-label="ตัวเลือก">
      <div className="choices__ornament" aria-hidden="true">
        <span className="choices__dot">✦</span>
        <span className="choices__dot">✦</span>
        <span className="choices__dot">✦</span>
      </div>

      {prompt && <p className="choices__prompt">{prompt}</p>}

      <div className="choices__list">
        {choices.map((choice) => {
          const isSelected = selected === choice.id;
          const isUnavailable = choice.is_unavailable === true;

          return (
            <button
              key={choice.id}
              type="button"
              className={`choices__btn${isSelected ? " choices__btn--selected" : ""}${isUnavailable ? " choices__btn--unavailable" : ""}`}
              onClick={() => handleChoose(choice)}
              aria-label={`${choice.text}${isUnavailable ? " กำลังเขียน" : ""}`}
              disabled={selected !== null}
            >
              <span className="choices__btn-content">
                <span className="choices__btn-text">{choice.text}</span>
                {isUnavailable && (
                  <span className="choices__status" aria-label="ปลายทางกำลังเขียน">
                    <span className="choices__status-dot" aria-hidden="true" />
                    กำลังเขียน
                  </span>
                )}
              </span>

              {isSelected && !isUnavailable && (
                <span className="choices__btn-check" aria-hidden="true">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {choices.some((choice) => choice.is_unavailable) && (
        <p className="choices__hint">
          <span aria-hidden="true">✍️</span>
          เส้นทางที่มีป้าย “กำลังเขียน” จะเปิดอ่านได้เมื่อนักเขียนเผยแพร่ฉากถัดไป
        </p>
      )}
    </div>
  );
};

export default ChoiceButtons;
