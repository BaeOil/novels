// src/pages/Auth/WriterRegister/WriterRegisterPage.jsx
//
// ══════════════════════════════════════════════════════════
//  หน้าสมัครเป็นนักเขียน — 4 ขั้นตอน
//
//  Step 1: ข้อมูลส่วนตัว  (ชื่อ / นามปากกา / อีเมล + รูปโปรไฟล์)
//  Step 2: แนะนำตัว       (bio + ประเภทนิยาย)
//  Step 3: ช่องทางติดต่อ  (FB / IG / Twitter / อื่นๆ)
//  Step 4: ยืนยันข้อมูล   (summary + checkbox)
//
//  TODO: POST /api/v1/auth/register/writer
// ══════════════════════════════════════════════════════════

import React, { useState, useRef } from "react";
import "./WriterRegisterPage.css";

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const STEPS = [
    { num: 1, label: "ข้อมูลส่วนตัว" },
    { num: 2, label: "แนะนำตัว" },
    { num: 3, label: "ช่องทางติดต่อ" },
    { num: 4, label: "ยืนยันข้อมูล" },
];

const GENRE_OPTIONS = [
    "ผจญภัย", "แฟนตาซี", "โรแมนติก", "ดราม่า",
    "สยองขวัญ", "ไซไฟ", "จิตวิกยา", "ระทึกขวัญ",
    "LGBTQ+", "มิตรภาพ", "สืบสวน",
];

// ─────────────────────────────────────────────
//  Sub: Step indicator
// ─────────────────────────────────────────────
const StepIndicator = ({ current }) => (
    <div className="wr-steps" role="list" aria-label="ขั้นตอนการสมัคร">
        {STEPS.map((step, i) => {
            const isDone = current > step.num;
            const isActive = current === step.num;
            return (
                <React.Fragment key={step.num}>
                    {/* Step item */}
                    <div
                        className={`wr-step ${isActive ? "wr-step--active" : ""} ${isDone ? "wr-step--done" : ""}`}
                        role="listitem"
                        aria-current={isActive ? "step" : undefined}
                    >
                        <div className="wr-step__circle">
                            {isDone ? (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M2.5 7l3.5 3.5 5.5-6" stroke="white" strokeWidth="1.8"
                                        strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : step.num}
                        </div>
                        <span className="wr-step__label">{step.label}</span>
                    </div>

                    {/* Connector line (ยกเว้นตัวสุดท้าย) */}
                    {i < STEPS.length - 1 && (
                        <div className={`wr-step__line ${isDone ? "wr-step__line--done" : ""}`} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

// ─────────────────────────────────────────────
//  Sub: Avatar upload
// ─────────────────────────────────────────────
const AvatarUpload = ({ preview, onChange }) => {
    const inputRef = useRef(null);

    const handleFile = (file) => {
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            alert("รองรับ PNG, JPG, WEBP เท่านั้น"); return;
        }
        if (file.size > 5 * 1024 * 1024) { alert("ไฟล์ต้องไม่เกิน 5MB"); return; }
        const url = URL.createObjectURL(file);
        onChange(file, url);
    };

    return (
        <div className="wr-avatar">
            <button
                type="button"
                className="wr-avatar__circle"
                onClick={() => inputRef.current?.click()}
                aria-label="อัปโหลดรูปโปรไฟล์"
            >
                {preview ? (
                    <img src={preview} alt="รูปโปรไฟล์" className="wr-avatar__img" />
                ) : (
                    <div className="wr-avatar__placeholder">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="18" r="9" stroke="var(--gray-300)" strokeWidth="2" />
                            <path d="M6 42c0-9.941 8.059-18 18-18s18 8.059 18 18"
                                stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                )}

                {/* Camera overlay */}
                <div className="wr-avatar__overlay">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M7 9l2-3h4l2 3h2a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1h2z"
                            stroke="white" strokeWidth="1.5" fill="none" />
                        <circle cx="11" cy="13" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
                    </svg>
                </div>

                {/* Edit badge */}
                <div className="wr-avatar__badge" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="1" y="1" width="10" height="10" rx="2" fill="white" />
                        <path d="M4 8l1.5-1.5L8 4l1 1-2.5 2.5L5 8H4z" fill="var(--pink-500)" strokeWidth="0" />
                    </svg>
                </div>
            </button>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="wr-avatar__input"
                onChange={(e) => handleFile(e.target.files?.[0])}
                aria-hidden="true"
                tabIndex={-1}
            />
            <p className="wr-avatar__label">รูปโปรไฟล์นักเขียน</p>
        </div>
    );
};

// ─────────────────────────────────────────────
//  Sub: Genre pill selector
// ─────────────────────────────────────────────
const GenrePills = ({ selected, onChange }) => {
    const toggle = (genre) => {
        if (selected.includes(genre)) {
            onChange(selected.filter((g) => g !== genre));
        } else {
            onChange([...selected, genre]);
        }
    };
    return (
        <div className="wr-genres" role="group" aria-label="เลือกประเภทนิยาย">
            {GENRE_OPTIONS.map((genre) => (
                <button
                    key={genre}
                    type="button"
                    className={`wr-genre-pill ${selected.includes(genre) ? "wr-genre-pill--active" : ""}`}
                    onClick={() => toggle(genre)}
                    aria-pressed={selected.includes(genre)}
                >
                    {genre}
                </button>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────
//  Sub: Social input row
// ─────────────────────────────────────────────
const SocialRow = ({ icon, placeholder, value, onChange }) => (
    <div className="wr-social-row">
        <div className="wr-social-icon">{icon}</div>
        <div className="wr-input-wrap">
            <input
                className="wr-input"
                type="url"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    </div>
);

// Social icons (emoji-based, matching the pink outlined circles in screenshot)
const FbIcon = () => (
    <div className="wr-social-icon__circle wr-social-icon__circle--fb">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>
    </div>
);
const IgIcon = () => (
    <div className="wr-social-icon__circle wr-social-icon__circle--ig">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
    </div>
);
const TwIcon = () => (
    <div className="wr-social-icon__circle wr-social-icon__circle--tw">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
        </svg>
    </div>
);

// ─────────────────────────────────────────────
//  Sub: Confirm summary card
// ─────────────────────────────────────────────
const SummaryCard = ({ data }) => {
    const rows = [
        { label: "ชื่อ - นามสกุล", value: data.fullName || "—" },
        { label: "นามปากกา", value: data.penName || "—" },
        { label: "แนะนำตัว", value: data.bio || "—" },
        { label: "ประเภทนิยายที่แต่ง", value: data.genres.length ? data.genres.join(" , ") : "—" },
        { label: "อีเมล", value: data.email || "—" },
        { label: "ช่องทางติดต่อ", value: data.mainContact || "—" },
    ];
    return (
        <div className="wr-summary">
            {/* Avatar */}
            <div className="wr-summary__avatar">
                {data.avatarPreview ? (
                    <img src={data.avatarPreview} alt="รูปโปรไฟล์" className="wr-summary__avatar-img" />
                ) : (
                    <div className="wr-summary__avatar-placeholder">
                        <span>🐱</span>
                    </div>
                )}
            </div>

            {/* Info rows */}
            <div className="wr-summary__info">
                {rows.map((row) => (
                    <div key={row.label} className="wr-summary__row">
                        <span className="wr-summary__label">{row.label}</span>
                        <span className="wr-summary__value">{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════
const WriterRegisterPage = ({ onComplete, onBack }) => {
    const [step, setStep] = useState(1);

    // ── Form data ──────────────────────────────────────────
    const [form, setForm] = useState({
        // Step 1
        avatarFile: null,
        avatarPreview: null,
        fullName: "",
        penName: "",
        email: "",
        // Step 2
        bio: "",
        genres: [],
        // Step 3
        mainContact: "",
        otherLinks: "",
        // Step 4
        confirmed: false,
    });

    // ── Validation errors ─────────────────────────────────
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    };

    // ── Validate per step ─────────────────────────────────
    const validateStep = (s) => {
        const e = {};
        if (s === 1) {
            if (!form.fullName.trim()) e.fullName = "กรุณากรอกชื่อ-นามสกุล";
            if (!form.penName.trim()) e.penName = "กรุณากรอกนามปากกา";
            if (!form.email.trim()) e.email = "กรุณากรอกอีเมล";
            else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
        }
        if (s === 2) {
            if (!form.bio.trim()) e.bio = "กรุณาแนะนำตัวสั้นๆ";
            if (form.genres.length === 0) e.genres = "กรุณาเลือกประเภทนิยายอย่างน้อย 1 ประเภท";
        }
        if (s === 3) {
            if (!form.mainContact.trim()) {
                e.mainContact = "กรุณากรอกช่องทางติดต่อหลัก";
            }
        }
        if (s === 4) {
            if (!form.confirmed) e.confirmed = "กรุณายืนยันว่าข้อมูลเป็นความจริง";
        }
        return e;
    };

    // ── Next step ─────────────────────────────────────────
    const handleNext = () => {
        const e = validateStep(step);
        if (Object.keys(e).length) { setErrors(e); return; }
        setErrors({});
        if (step < 4) {
            setStep(step + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            handleSubmit();
        }
    };

    // ── Back ──────────────────────────────────────────────
    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
            setErrors({});
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            onBack?.();
        }
    };

    // ── Submit ────────────────────────────────────────────
    const handleSubmit = async () => {
        setIsSubmitting(true);
        // TODO: POST /api/v1/auth/register/writer
        // const formData = new FormData();
        // Object.entries(form).forEach(([k,v]) => {
        //   if (k === "genres") formData.append(k, JSON.stringify(v));
        //   else if (k !== "avatarPreview") formData.append(k, v);
        // });
        // await fetch("/api/v1/auth/register/writer", { method:"POST", body: formData });
        setTimeout(() => {
            setIsSubmitting(false);
            onComplete?.();
            alert("✅ สมัครเป็นนักเขียนสำเร็จ!");
        }, 1000);
    };

    // ════════════════════════════════════════════════════
    return (
        <div className="wr-page">
            {/* ── Page header ── */}
            <div className="wr-header">
                <h1 className="wr-header__title">สมัครเป็นนักเขียน</h1>
                <p className="wr-header__sub">กรอกข้อมูลเพื่อยืนยันตัวตนของคุณในฐานะนักเขียน</p>
            </div>

            {/* ── Step indicator ── */}
            <StepIndicator current={step} />

            {/* ══════════════════════════════════════
          STEP 1: ข้อมูลส่วนตัว
      ══════════════════════════════════════ */}
            {step === 1 && (
                <div className="wr-step-content wr-step-content--split">
                    {/* Left: avatar upload */}
                    <div className="wr-step-left">
                        <AvatarUpload
                            preview={form.avatarPreview}
                            onChange={(file, url) => { setField("avatarFile", file); setField("avatarPreview", url); }}
                        />
                    </div>

                    {/* Right: form card */}
                    <div className="wr-card">
                        <h2 className="wr-card__title">ข้อมูลส่วนตัว</h2>

                        <div className="wr-field">
                            <label className="wr-label" htmlFor="fullName">ชื่อ - นามสกุล</label>
                            <div className={`wr-input-wrap ${errors.fullName ? "wr-input-wrap--error" : ""}`}>
                                <input id="fullName" className="wr-input" type="text"
                                    placeholder="กรอกชื่อ - นามสกุลของคุณ"
                                    value={form.fullName}
                                    onChange={(e) => setField("fullName", e.target.value)} />
                            </div>
                            {errors.fullName && <p className="wr-field__error" role="alert">{errors.fullName}</p>}
                        </div>

                        <div className="wr-field">
                            <label className="wr-label" htmlFor="penName">นามปากกา</label>
                            <div className={`wr-input-wrap ${errors.penName ? "wr-input-wrap--error" : ""}`}>
                                <input id="penName" className="wr-input" type="text"
                                    placeholder="กรอกนามปากกา"
                                    value={form.penName}
                                    onChange={(e) => setField("penName", e.target.value)} />
                            </div>
                            {errors.penName && <p className="wr-field__error" role="alert">{errors.penName}</p>}
                        </div>

                        <div className="wr-field">
                            <label className="wr-label" htmlFor="email">อีเมล</label>
                            <div className={`wr-input-wrap ${errors.email ? "wr-input-wrap--error" : ""}`}>
                                <input id="email" className="wr-input" type="email"
                                    placeholder="กรอกอีเมล"
                                    value={form.email}
                                    onChange={(e) => setField("email", e.target.value)} />
                            </div>
                            {errors.email && <p className="wr-field__error" role="alert">{errors.email}</p>}
                        </div>

                        <div className="wr-card__footer wr-card__footer--right">
                            <button className="wr-btn wr-btn--primary" onClick={handleNext}>ถัดไป</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
          STEP 2: แนะนำตัว
      ══════════════════════════════════════ */}
            {step === 2 && (
                <div className="wr-step-content">
                    <h2 className="wr-section-title">แนะนำตัว</h2>

                    <div className="wr-field">
                        <label className="wr-label" htmlFor="bio">แนะนำเกี่ยวกับคุณ</label>
                        <div className={`wr-input-wrap ${errors.bio ? "wr-input-wrap--error" : ""}`}>
                            <textarea id="bio" className="wr-textarea"
                                placeholder="อธิบายความเป็นตัวคุณหรือผลงานของคุณสั้นๆ...."
                                rows={5}
                                value={form.bio}
                                onChange={(e) => setField("bio", e.target.value)} />
                        </div>
                        {errors.bio && <p className="wr-field__error" role="alert">{errors.bio}</p>}
                    </div>

                    <div className="wr-field">
                        <label className="wr-label">ประเภทนิยายที่แต่ง (เลือกได้มากกว่า 1 ประเภท)</label>
                        <GenrePills selected={form.genres} onChange={(val) => setField("genres", val)} />
                        {errors.genres && <p className="wr-field__error" role="alert">{errors.genres}</p>}
                    </div>

                    <div className="wr-step-nav">
                        <button className="wr-btn wr-btn--outline" onClick={handlePrev}>ย้อนกลับ</button>
                        <button className="wr-btn wr-btn--primary" onClick={handleNext}>ถัดไป</button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
    STEP 3: ช่องทางติดต่อ
══════════════════════════════════════ */}
            {step === 3 && (
                <div className="wr-step-content">
                    <h2 className="wr-section-title">ช่องทางติดต่อ</h2>

                    {/* ช่องทางหลัก (บังคับกรอก) */}
                    <div className="wr-field">
                        <label className="wr-label" htmlFor="mainContact">
                            ช่องทางติดต่อหลัก
                        </label>

                        <div
                            className={`wr-input-wrap ${errors.mainContact ? "wr-input-wrap--error" : ""
                                }`}
                        >
                            <input
                                id="mainContact"
                                className="wr-input"
                                type="text"
                                placeholder="แนบลิงก์เฟสบุ๊ค/อินสตาแกรม/ทวิตเตอร์"
                                value={form.mainContact}
                                onChange={(e) => setField("mainContact", e.target.value)}
                            />
                        </div>

                        {errors.mainContact && (
                            <p className="wr-field__error" role="alert">
                                {errors.mainContact}
                            </p>
                        )}
                    </div>

                    {/* ช่องทางอื่นๆ */}
                    <div className="wr-field" style={{ marginTop: 20 }}>
                        <label className="wr-label" htmlFor="otherLinks">
                            ช่องทางอื่นๆ
                        </label>

                        <div className="wr-input-wrap">
                            <textarea
                                id="otherLinks"
                                className="wr-textarea wr-textarea--sm"
                                placeholder="แนบลิงก์ (ไม่บังคับ)"
                                rows={4}
                                value={form.otherLinks}
                                onChange={(e) => setField("otherLinks", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="wr-step-nav">
                        <button
                            className="wr-btn wr-btn--outline"
                            onClick={handlePrev}
                        >
                            ย้อนกลับ
                        </button>

                        <button
                            className="wr-btn wr-btn--primary"
                            onClick={handleNext}
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
             STEP 4: ยืนยันข้อมูล
            ══════════════════════════════════════ */}
            {step === 4 && (
                <div className="wr-step-content">
                    <div className="wr-confirm-header">
                        <h2 className="wr-section-title">ยืนยันข้อมูล</h2>
                        <p className="wr-confirm-sub">ตรวจสอบข้อมูลของคุณ</p>
                    </div>

                    <SummaryCard data={form} />

                    {/* Confirm checkbox */}
                    <div className="wr-confirm-check" style={{ marginTop: 20 }}>
                        <label className="wr-checkbox" htmlFor="confirmed">
                            <input
                                id="confirmed"
                                type="checkbox"
                                className="wr-checkbox__input"
                                checked={form.confirmed}
                                onChange={(e) => setField("confirmed", e.target.checked)}
                            />
                            <span className={`wr-checkbox__box ${form.confirmed ? "wr-checkbox__box--checked" : ""}`} />
                            <span className="wr-checkbox__label">ฉันยอมรับข้อมูลที่ให้ไว้เป็นความจริง</span>
                        </label>
                        {errors.confirmed && <p className="wr-field__error" role="alert">{errors.confirmed}</p>}
                    </div>

                    <div className="wr-step-nav">
                        <button className="wr-btn wr-btn--outline" onClick={handlePrev}>ย้อนกลับ</button>
                        <button
                            className="wr-btn wr-btn--primary"
                            onClick={handleNext}
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting ? <span className="wr-spinner" /> : "ถัดไป"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WriterRegisterPage;