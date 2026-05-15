// src/pages/Writer/CreateNovel/CreateNovelPage.jsx
//
// ══════════════════════════════════════════════════════════════
//  หน้าสร้างนิยายเรื่องใหม่ — ฝั่งนักเขียน
//
//  Form fields:
//    - ชื่อเรื่อง (required)
//    - คำโปรย   (required, max 200 chars)
//    - หมวดหมู่  (multi-select, required)
//    - แนะนำเรื่อง (required)
//    - ภาพปก    (cover upload)
//    - สถานะเรื่อง toggle (เผยแพร่ / ฉบับร่าง)
//    - สถานะจบ  toggle  (จบแล้ว / ยังไม่จบ)
//
//  TODO: POST /api/v1/novels เมื่อ Backend พร้อม
// ══════════════════════════════════════════════════════════════

import React, { useState } from "react";
import "./CreateNovelPage.css";
import MultiSelect from "../../../components/MultiSelect/MultiSelect";
import CoverUpload from "../../../components/CoverUpload/CoverUpload";
import Toggle from "../../../components/Toggle/Toggle";
import { NOVEL_CATEGORIES } from "../../../data/mockWriterData";

// ── ค่า default ของ form ──────────────────────────────────────
const INITIAL_FORM = {
    title: "",
    tagline: "",
    categories: ["ผจญภัย", "มิตรภาพ"],  // ตาม mock ในรูป
    description: "",
    coverFile: null,
    coverPreview: null,
    isPublished: true,    // toggle สถานะเรื่อง (เผยแพร่)
    isCompleted: false,   // toggle สถานะจบ    (ยังไม่จบ)
};

// ── Validation rules ─────────────────────────────────────────
const validate = (form) => {
    const errors = {};
    if (!form.title.trim())
        errors.title = "กรุณากรอกชื่อเรื่อง";
    if (!form.tagline.trim())
        errors.tagline = "กรุณากรอกคำโปรย";
    if (form.tagline.length > 200)
        errors.tagline = "คำโปรยต้องไม่เกิน 200 ตัวอักษร";
    if (form.categories.length === 0)
        errors.categories = "กรุณาเลือกหมวดหมู่อย่างน้อย 1 หมวด";
    if (!form.description.trim())
        errors.description = "กรุณากรอกแนะนำเรื่อง";
    return errors;
};

// ════════════════════════════════════════════════════════════
const CreateNovelPage = ({ onNavigate }) => {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Field change helper ──────────────────────────────────
    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        // ล้าง error ของ field นั้น เมื่อเริ่มแก้ไข
        if (errors[key]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    // ── Submit ───────────────────────────────────────────────
    const handleSubmit = async () => {
        const newErrors = validate(form);
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // เลื่อนหน้าไปหา field แรกที่ error
            const firstKey = Object.keys(newErrors)[0];
            document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setIsSubmitting(true);

        // TODO: เชื่อม API เมื่อ Backend พร้อม:
        // const formData = new FormData();
        // formData.append("title",       form.title);
        // formData.append("tagline",     form.tagline);
        // formData.append("categories",  JSON.stringify(form.categories));
        // formData.append("description", form.description);
        // formData.append("isPublished", form.isPublished);
        // formData.append("isCompleted", form.isCompleted);
        // if (form.coverFile) formData.append("cover", form.coverFile);
        //
        // const res = await fetch("/api/v1/novels", {
        //   method: "POST",
        //   headers: { Authorization: `Bearer ${token}` },
        //   body: formData,
        // });
        // const data = await res.json();
        // onNavigate("chapters", data.id);

        // Mock: simulate API delay
        setTimeout(() => {
            setIsSubmitting(false);
            alert(`✅ สร้างนิยาย "${form.title}" สำเร็จ!`);
            onNavigate("dashboard");
        }, 800);
    };

    const taglineLen = form.tagline.length;

    // ════════════════════════════════════════════════════════
    return (
        <div className="cnp">
            {/* ── Page heading ── */}
            <div className="cnp__header">
                <h1 className="cnp__title">สร้างนิยายเรื่องใหม่</h1>
                <p className="cnp__sub">กรอกข้อมูลเบื้องต้นเพื่อเริ่มต้นเรื่องราวใหม่ของคุณ</p>
            </div>

            {/* ── Main card ── */}
            <div className="cnp__form-wrap">
                <div className="cnp__card">

                    {/* ── Card section header ── */}
                    <div className="cnp__section-header">
                        <h2 className="cnp__section-title">รายละเอียดนิยาย</h2>
                        <p className="cnp__section-sub">ข้อมูลเหล่านี้จะแสดงให้นักอ่านเห็นในหน้ารายละเอียดนิยาย</p>
                    </div>

                    {/* ── Two-column layout ── */}
                    <div className="cnp__columns">

                        {/* ════ Left: form fields ════ */}
                        <div className="cnp__left">

                            {/* ── ชื่อเรื่อง ── */}
                            <div className="cnp__field" id="field-title">
                                <label className="cnp__label" htmlFor="inp-title">
                                    ชื่อเรื่อง <span className="cnp__required">*</span>
                                </label>
                                <input
                                    id="inp-title"
                                    type="text"
                                    className={`cnp__input ${errors.title ? "cnp__input--error" : ""}`}
                                    placeholder="ตั้งชื่อเรื่องของคุณ...."
                                    value={form.title}
                                    onChange={(e) => setField("title", e.target.value)}
                                    maxLength={100}
                                    aria-required="true"
                                    aria-describedby={errors.title ? "err-title" : undefined}
                                />
                                {errors.title && (
                                    <p className="cnp__error" id="err-title" role="alert">{errors.title}</p>
                                )}
                            </div>

                            {/* ── คำโปรย ── */}
                            <div className="cnp__field" id="field-tagline">
                                <label className="cnp__label" htmlFor="inp-tagline">
                                    คำโปรย <span className="cnp__required">*</span>
                                </label>
                                <textarea
                                    id="inp-tagline"
                                    className={`cnp__textarea cnp__textarea--sm ${errors.tagline ? "cnp__input--error" : ""}`}
                                    placeholder="บอกเล่าเรื่องราวของคุณสั้นๆ"
                                    value={form.tagline}
                                    onChange={(e) => setField("tagline", e.target.value)}
                                    maxLength={200}
                                    aria-required="true"
                                />
                                <div className="cnp__char-row">
                                    <p className={`cnp__char-count ${taglineLen > 180 ? "cnp__char-count--warn" : ""}`}>
                                        {taglineLen} / 200 ตัวอักษร
                                    </p>
                                    {errors.tagline && (
                                        <p className="cnp__error" role="alert">{errors.tagline}</p>
                                    )}
                                </div>
                            </div>

                            {/* ── หมวดหมู่ ── */}
                            <div className="cnp__field" id="field-categories">
                                <label className="cnp__label">
                                    หมวดหมู่ <span className="cnp__required">*</span>
                                </label>
                                <MultiSelect
                                    options={NOVEL_CATEGORIES}
                                    value={form.categories}
                                    onChange={(val) => setField("categories", val)}
                                    placeholder="เลือกหมวดหมู่..."
                                    max={5}
                                />
                                {errors.categories && (
                                    <p className="cnp__error" role="alert">{errors.categories}</p>
                                )}
                            </div>

                            {/* ── แนะนำเรื่อง ── */}
                            <div className="cnp__field" id="field-description">
                                <label className="cnp__label" htmlFor="inp-description">
                                    แนะนำเรื่อง <span className="cnp__required">*</span>
                                </label>
                                <textarea
                                    id="inp-description"
                                    className={`cnp__textarea cnp__textarea--lg ${errors.description ? "cnp__input--error" : ""}`}
                                    placeholder="แนะนำเรื่องราวเกี่ยวกับนิยายของคุณ...."
                                    value={form.description}
                                    onChange={(e) => setField("description", e.target.value)}
                                    aria-required="true"
                                />
                                {errors.description && (
                                    <p className="cnp__error" role="alert">{errors.description}</p>
                                )}
                            </div>

                        </div>

                        {/* ════ Right: cover + settings ════ */}
                        <div className="cnp__right">

                            {/* ── Cover upload ── */}
                            <div className="cnp__cover-wrap">
                                <CoverUpload
                                    value={form.coverPreview}
                                    onChange={(file, preview) => {
                                        setField("coverFile", file);
                                        setField("coverPreview", preview);
                                    }}
                                />
                            </div>

                            {/* ── การตั้งค่าเบื้องต้น ── */}
                            <div className="cnp__settings">
                                <h3 className="cnp__settings-title">การตั้งค่าเบื้องต้น</h3>

                                {/* สถานะเรื่อง */}
                                <div className="cnp__setting-row">
                                    <span className="cnp__setting-label">สถานะเรื่อง</span>
                                    <div className="cnp__setting-control">
                                        <Toggle
                                            id="toggle-published"
                                            checked={form.isPublished}
                                            onChange={(val) => setField("isPublished", val)}
                                        />
                                        <span className={`cnp__setting-status ${form.isPublished ? "cnp__setting-status--on" : ""}`}>
                                            {form.isPublished ? "เผยแพร่" : "ฉบับร่าง"}
                                        </span>
                                    </div>
                                </div>

                                {/* สถานะจบ */}
                                <div className="cnp__setting-row">
                                    <span className="cnp__setting-label">สถานะจบ</span>
                                    <div className="cnp__setting-control">
                                        <Toggle
                                            id="toggle-completed"
                                            checked={form.isCompleted}
                                            onChange={(val) => setField("isCompleted", val)}
                                        />
                                        <span className={`cnp__setting-status ${form.isCompleted ? "cnp__setting-status--on" : ""}`}>
                                            {form.isCompleted ? "จบแล้ว" : "ยังไม่จบ"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ── Footer buttons ── */}
                    <div className="cnp__footer">
                        {/* ยกเลิก */}
                        <button
                            type="button"
                            className="cnp__btn cnp__btn--cancel"
                            onClick={() => onNavigate("dashboard")}
                            disabled={isSubmitting}
                        >
                            ยกเลิก
                        </button>

                        {/* ย้อนกลับ */}
                        <button
                            type="button"
                            className="cnp__btn cnp__btn--back"
                            onClick={() => onNavigate("dashboard")}
                            disabled={isSubmitting}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            ย้อนกลับ
                        </button>

                        {/* สร้างนิยายและเพิ่มตอนแรก */}
                        <button
                            type="button"
                            className="cnp__btn cnp__btn--submit"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="cnp__spinner" aria-hidden="true" />
                                    กำลังสร้าง...
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                        <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    สร้างนิยายและเพิ่มตอนแรก
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CreateNovelPage;