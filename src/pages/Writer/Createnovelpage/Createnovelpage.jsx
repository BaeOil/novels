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
//  Backend API connected:
//    - POST /novels           -> สร้างนิยายใหม่
//    - POST /upload/image      -> อัพโหลดปกนิยาย
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import "./CreateNovelPage.css";
import MultiSelect from "../../../components/MultiSelect/MultiSelect";
import CoverUpload from "../../../components/CoverUpload/CoverUpload";
import Toggle from "../../../components/Toggle/Toggle";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── ค่า default ของ form ──────────────────────────────────────
const INITIAL_FORM = {
    title: "",
    tagline: "",
    categories: [],
    description: "",
    coverFile: null,
    coverPreview: null,
    isPublished: true,    // toggle สถานะเรื่อง (เผยแพร่)
    isCompleted: false,   // toggle สถานะจบ    (ยังไม่จบ)
};

const FALLBACK_CATEGORIES = [
    "แฟนตาซี",
    "โรแมนซ์",
    "ผจญภัย",
    "ลึกลับ",
    "สยองขวัญ",
    "ดราม่า",
    "ตลก",
    "ชีวิต",
    "ไซไฟ",
    "ประวัติศาสตร์",
];

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
    const [submissionError, setSubmissionError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState(null);

    useEffect(() => {
        const loadCategories = async () => {
            setCategoriesLoading(true);
            setCategoriesError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/categories`);
                if (!response.ok) {
                    throw new Error("failed to fetch categories");
                }
                const result = await response.json();
                const categoriesData = Array.isArray(result)
                    ? result
                    : Array.isArray(result?.data)
                        ? result.data
                        : [];
                if (categoriesData.length === 0) {
                    throw new Error("categories response invalid");
                }
                setCategories(categoriesData.map((category) => ({
                    id: category.category_id || category.id,
                    name: category.name,
                })));
            } catch (err) {
                console.error("Category load error:", err);
                setCategories(FALLBACK_CATEGORIES.map((name, index) => ({ id: index + 1, name })));
                setCategoriesError("ไม่สามารถดึงหมวดหมู่จากระบบได้ กำลังใช้ค่าเริ่มต้นแทน");
            } finally {
                setCategoriesLoading(false);
            }
        };
        loadCategories();
    }, []);

    const categoryOptions = categories.map((cat) => cat.name);

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
        setSubmissionError(null);

        try {
            let coverImageUrl = null;
            if (form.coverFile) {
                const uploadForm = new FormData();
                uploadForm.append("image", form.coverFile);

                const uploadResponse = await fetch(`${API_BASE_URL}/upload/image`, {
                    method: "POST",
                    body: uploadForm,
                });

                if (!uploadResponse.ok) {
                    const errorPayload = await uploadResponse.json().catch(() => null);
                    throw new Error(errorPayload?.error || errorPayload?.message || "Upload cover image failed");
                }

                const uploadData = await uploadResponse.json();
                coverImageUrl = uploadData?.full_url || uploadData?.data?.full_url || uploadData?.url;
                if (coverImageUrl) {
                    coverImageUrl = coverImageUrl.replace("http://minio:9000", "http://localhost:9000");
                }
            }

            const categoryIds = categories
                .filter((category) => form.categories.includes(category.name))
                .map((category) => category.id);

            console.log("🐛 DEBUG categoryIds:", {
                selectedNames: form.categories,
                allCategories: categories,
                calculatedIds: categoryIds,
            });

            const payload = {
                title: form.title.trim(),
                captions: form.tagline.trim(),
                introduction: form.description.trim(),
                cover_image: coverImageUrl,
                status: form.isPublished ? "published" : "draft",
                category_ids: categoryIds,
                author_id: 1,
            };

            console.log("📦 DEBUG payload:", payload);

            const response = await fetch(`${API_BASE_URL}/novels`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(result?.error || result?.message || "Failed to create novel");
            }

            const newNovelId = result?.novel_id || result?.data?.novel_id;
            if (!newNovelId) {
                throw new Error("Novel ID not returned from server");
            }

            onNavigate("chapters", { novelId: newNovelId });
        } catch (err) {
            console.error("Create novel error:", err);
            setSubmissionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่รู้จัก");
        } finally {
            setIsSubmitting(false);
        }
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
                    {submissionError && (
                      <div className="cnp__error-banner" role="alert" style={{ marginBottom: "16px" }}>
                        {submissionError}
                      </div>
                    )}

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
                                    options={categoryOptions}
                                    value={form.categories}
                                    onChange={(val) => setField("categories", val)}
                                    placeholder={categoriesLoading ? "กำลังโหลดหมวดหมู่..." : "เลือกหมวดหมู่..."}
                                    max={5}
                                />
                                {categoriesError && (
                                    <p className="cnp__info" style={{ color: "#d97706" }} role="alert">
                                        {categoriesError}
                                    </p>
                                )}
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