// src/components/GenreTag/GenreTag.jsx
import React from "react";
import "./GenreTag.css";

/**
 * GenreTag — แสดงหมวดหมู่นิยาย
 * @param {string} label - ชื่อหมวดหมู่
 * @param {string} variant - "primary" | "outline" (default: "primary")
 */
const GenreTag = ({ label, variant = "primary" }) => {
  return (
    <span className={`genre-tag genre-tag--${variant}`} aria-label={`หมวดหมู่: ${label}`}>
      {label}
    </span>
  );
};

export default GenreTag;
