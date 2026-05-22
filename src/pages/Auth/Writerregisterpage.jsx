// ══════════════════════════════════════════════════════════
//  หน้าสมัครเป็นนักเขียน — 4 ขั้นตอน (ปรับแต่งเชื่อมตรง Go Router)
//
//  Step 1: ข้อมูลส่วนตัว  (ชื่อ / นามปากกา / อีเมล + รูปโปรไฟล์)
//  Step 2: แนะนำตัว       (bio + ประเภทนิยาย)
//  Step 3: ช่องทางติดต่อ  (FB / IG / Twitter / อื่นๆ)
//  Step 4: ยืนยันข้อมูล   (summary + checkbox)
//
//  🛡️ Security Guard: ดักสิทธิ์คนที่เป็นนักเขียนอยู่แล้วไม่ให้เข้าซ้ำ
//  🚀 API Endpoint: POST /api/writers/apply (multipart/form-data)
// ══════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from "react";
import "./WriterRegisterPage.css";
import { useNavigate } from "react-router-dom";

// ดึงค่า Base URL ของ API หลังบ้านจาก .env (ถ้าไม่มีจะใช้ localhost:8080 แทน)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const STEPS = [
    { num: 1, label: "ข้อมูลส่วนตัว" },
    { num: 2, label: "แนะนำตัว" },
    { num: 3, label: "ช่องทางติดต่อ" },
    { num: 4, label: "ยืนยันข้อมูล" },
];

const GENRE_OPTIONS = [
    "ผจญภัย", "แฟนตาซี", "โรแมนติก", "ดราม่า",
    "สยองขวัญ", "ไซไฟ", "จิตวิทยา", "ระทึกขวัญ",
    "LGBTQ+", "มิตรภาพ", "สืบสวน",
];

// ─────────────────────────────────────────────
//  Sub Component: Step Indicator
// ─────────────────────────────────────────────
const StepIndicator = ({ current }) => (
    <div className="wr-steps" role="list" aria-label="ขั้นตอนการสมัคร">
        {STEPS.map((step, i) => {
            const isDone = current > step.num;
            const isActive = current === step.num;
            return (
                <React.Fragment key={step.num}>
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
                    {i < STEPS.length - 1 && (
                        <div className={`wr-step__line ${isDone ? "wr-step__line--done" : ""}`} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

// ─────────────────────────────────────────────
//  Sub Component: Avatar Upload
// ─────────────────────────────────────────────
const AvatarUpload = ({ preview, onChange }) => {
    const inputRef = useRef(null);

    const handleFile = (file) => {
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            alert("รองรับไฟล์รูปภาพประเภท PNG, JPG, WEBP เท่านั้นครับ"); 
            return;
        }
        if (file.size > 5 * 1024 * 1024) { 
            alert("ขนาดรูปภาพต้องไม่เกิน 5MB นะครับ"); 
            return; 
        }
        const url = URL.createObjectURL(file);
        onChange(file, url);
    };

    return (
        <div className="wr-avatar">
            <button
                type="button"
                className="wr-avatar__circle"
                onClick={() => inputRef.current?.click()}
                aria-label="อัปโหลดรูปโปรไฟล์นักเขียน"
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

                <div className="wr-avatar__overlay">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M7 9l2-3h4l2 3h2a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1h2z"
                            stroke="white" strokeWidth="1.5" fill="none" />
                        <circle cx="11" cy="13" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
                    </svg>
                </div>

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
//  Sub Component: Genre Pills
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
//  Sub Component: Summary Card
// ─────────────────────────────────────────────
const SummaryCard = ({ data }) => {
    const rows = [
        { label: "ชื่อ - นามสกุล", value: data.fullName || "—" },
        { label: "นามปากกา", value: data.penName || "—" },
        { label: "แนะนำตัว", value: data.bio || "—" },
        { label: "ประเภทนิยายที่แต่ง", value: data.genres.length ? data.genres.join(", ") : "—" },
        { label: "อีเมล", value: data.email || "—" },
        { label: "ช่องทางติดต่อหลัก", value: data.mainContact || "—" },
        { label: "ช่องทางอื่นๆ", value: data.otherLinks || "—" },
    ];
    return (
        <div className="wr-summary">
            <div className="wr-summary__avatar">
                {data.avatarPreview ? (
                    <img src={data.avatarPreview} alt="รูปโปรไฟล์" className="wr-summary__avatar-img" />
                ) : (
                    <div className="wr-summary__avatar-placeholder">
                        <span>✍️</span>
                    </div>
                )}
            </div>

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
//  Main Component: WriterRegisterPage
// ══════════════════════════════════════════════════════════
const WriterRegisterPage = ({ onComplete, onBack }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [form, setForm] = useState({
        avatarFile: null,
        avatarPreview: null,
        fullName: "",
        penName: "",
        email: "",
        bio: "",
        genres: [],
        mainContact: "",
        otherLinks: "",
        confirmed: false,
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── 🛡️ Guard Section: ตรวจเช็ค Token และสิทธิ์นักเขียน ──
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userJson = localStorage.getItem("user");

        if (!token) {
            alert("กรุณาเข้าสู่ระบบก่อนทำการสมัครสมาชิกนักเขียนนะครับ");
            navigate("/login-register");
            return;
        }

        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                // ดักจับว่าถ้า user นั้นเป็น writer อยู่แล้ว ไม่ให้สมัครซ้ำซ้อน
                if (user.role === "writer" || user.is_writer === true) {
                    alert("คุณเป็นนักเขียนในระบบอยู่แล้ว สามารถสร้างผลงานได้เลยครับ 🎉");
                    navigate("/writer/dashboard");
                    return;
                }
            } catch (e) {
                console.error("Failed to parse local user status:", e);
            }
        }
        setCheckingAuth(false);
    }, [navigate]);

    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    };

    // ── Validation Logic ──────────────────────────────────
    const validateStep = (s) => {
        const e = {};
        if (s === 1) {
            if (!form.fullName.trim()) e.fullName = "กรุณากรอกชื่อ-นามสกุล";
            if (!form.penName.trim()) e.penName = "กรุณากรอกนามปากกา";
            if (!form.email.trim()) e.email = "กรุณากรอกอีเมล";
            else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
        }
        if (s === 2) {
            if (!form.bio.trim()) e.bio = "กรุณาแนะนำตัวตนของคุณสั้นๆ";
            if (form.genres.length === 0) e.genres = "กรุณาเลือกประเภทนิยายอย่างน้อย 1 ประเภท";
        }
        if (s === 3) {
            if (!form.mainContact.trim()) e.mainContact = "กรุณากรอกช่องทางติดต่อหลัก";
        }
        if (s === 4) {
            if (!form.confirmed) e.confirmed = "กรุณากดรับรองว่าข้อมูลทั้งหมดเป็นความจริง";
        }
        return e;
    };

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

    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
            setErrors({});
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            onBack?.();
        }
    };

    // ── 🚀 สั่งยิงเชื่อมต่อจริงผ่าน Multipart Form-Data เข้า Go หลังบ้าน ──
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();

            // มัดรวมแพ็กเกจส่งข้อมูลให้ Go หลังบ้านรับด้วย r.FormValue()
            formData.append("full_name", form.fullName);
            formData.append("pen_name", form.penName);
            formData.append("email", form.email);
            formData.append("bio", form.bio);
            formData.append("genres", JSON.stringify(form.genres)); // ส่งแบบ Array สตริง
            formData.append("main_contact", form.mainContact);
            formData.append("other_links", form.otherLinks);
            
            if (form.avatarFile) {
                formData.append("avatar", form.avatarFile); // คีย์ "avatar" สำหรับแกะไฟล์รูป
            }

            // ยิงไปที่ท่อ /api/writers/apply ตามที่ระบุไว้ใน Go Router ของคุณ
            const response = await fetch(`${API_BASE_URL}/api/writers/apply`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                    // ⚠️ ห้ามใส่ Content-Type: application/json เพราะเป็นไฟล์ Multipart
                },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.message || "การส่งใบสมัครล้มเหลว กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง");
            }

            alert("🎉 ส่งใบสมัครเป็นนักเขียนสำเร็จแล้ว! รอเจ้าหน้าที่แอดมินอนุมัตินะครับ");
            navigate("/"); 
            onComplete?.();

        } catch (error) {
            console.error("Submission Error:", error);
            alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการติดต่อฐานข้อมูลหลังบ้าน");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="wr-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <p style={{ color: "var(--pink-500)", fontSize: "1.2rem", fontWeight: "bold" }}>กำลังตรวจสอบสิทธิ์การเข้าถึงระบบ...</p>
            </div>
        );
    }

    return (
        <div className="wr-page">
            <div className="wr-header">
                <h1 className="wr-header__title">สมัครเป็นนักเขียน</h1>
                <p className="wr-header__sub">กรอกข้อมูลเพื่อยืนยันตัวตนของคุณในฐานะนักเขียน</p>
            </div>

            <StepIndicator current={step} />

            {/* STEP 1: ข้อมูลส่วนตัว */}
            {step === 1 && (
                <div className="wr-step-content wr-step-content--split">
                    <div className="wr-step-left">
                        <AvatarUpload
                            preview={form.avatarPreview}
                            onChange={(file, url) => { setField("avatarFile", file); setField("avatarPreview", url); }}
                        />
                    </div>

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
                                    placeholder="กรอกนามปากกาที่ใช้แต่งนิยาย"
                                    value={form.penName}
                                    onChange={(e) => setField("penName", e.target.value)} />
                            </div>
                            {errors.penName && <p className="wr-field__error" role="alert">{errors.penName}</p>}
                        </div>

                        <div className="wr-field">
                            <label className="wr-label" htmlFor="email">อีเมล</label>
                            <div className={`wr-input-wrap ${errors.email ? "wr-input-wrap--error" : ""}`}>
                                <input id="email" className="wr-input" type="email"
                                    placeholder="example@email.com"
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

            {/* STEP 2: แนะนำตัว */}
            {step === 2 && (
                <div className="wr-step-content">
                    <h2 className="wr-section-title">แนะนำตัว</h2>

                    <div className="wr-field">
                        <label className="wr-label" htmlFor="bio">แนะนำเกี่ยวกับคุณ</label>
                        <div className={`wr-input-wrap ${errors.bio ? "wr-input-wrap--error" : ""}`}>
                            <textarea id="bio" className="wr-textarea"
                                placeholder="อธิบายความเป็นตัวคุณ สไตล์งานเขียน หรือผลงานของคุณสั้นๆ...."
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

            {/* STEP 3: ช่องทางติดต่อ */}
            {step === 3 && (
                <div className="wr-step-content">
                    <h2 className="wr-section-title">ช่องทางติดต่อ</h2>

                    <div className="wr-field">
                        <label className="wr-label" htmlFor="mainContact">ช่องทางติดต่อหลัก</label>
                        <div className={`wr-input-wrap ${errors.mainContact ? "wr-input-wrap--error" : ""}`}>
                            <input
                                id="mainContact"
                                className="wr-input"
                                type="text"
                                placeholder="แนบลิงก์โซเชียลมีเดียหลัก เช่น Facebook / IG / Twitter หรือเบอร์โทรติดต่อ"
                                value={form.mainContact}
                                onChange={(e) => setField("mainContact", e.target.value)}
                            />
                        </div>
                        {errors.mainContact && <p className="wr-field__error" role="alert">{errors.mainContact}</p>}
                    </div>

                    <div className="wr-field" style={{ marginTop: 20 }}>
                        <label className="wr-label" htmlFor="otherLinks">ช่องทางอื่นๆ</label>
                        <div className="wr-input-wrap">
                            <textarea
                                id="otherLinks"
                                className="wr-textarea wr-textarea--sm"
                                placeholder="แนบลิงก์ผลงานเก่าๆ บล็อก หรือช่องทางการติดตามเพิ่มเติม (ไม่บังคับ)"
                                rows={4}
                                value={form.otherLinks}
                                onChange={(e) => setField("otherLinks", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="wr-step-nav">
                        <button className="wr-btn wr-btn--outline" onClick={handlePrev}>ย้อนกลับ</button>
                        <button className="wr-btn wr-btn--primary" onClick={handleNext}>ถัดไป</button>
                    </div>
                </div>
            )}

            {/* STEP 4: ยืนยันข้อมูล */}
            {step === 4 && (
                <div className="wr-step-content">
                    <div className="wr-confirm-header">
                        <h2 className="wr-section-title">ยืนยันข้อมูล</h2>
                        <p className="wr-confirm-sub">กรุณาตรวจสอบข้อมูลของคุณอย่างละเอียดอีกครั้งก่อนยืนยันส่งเอกสาร</p>
                    </div>

                    <SummaryCard data={form} />

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
                            <span className="wr-checkbox__label">ฉันยอมรับและยืนยันว่าข้อมูลทั้งหมดที่ระบุไว้ข้างต้นเป็นความจริงทุกประการ</span>
                        </label>
                        {errors.confirmed && <p className="wr-field__error" role="alert">{errors.confirmed}</p>}
                    </div>

                    <div className="wr-step-nav">
                        <button className="wr-btn wr-btn--outline" onClick={handlePrev} disabled={isSubmitting}>ย้อนกลับ</button>
                        <button
                            className="wr-btn wr-btn--primary"
                            onClick={handleNext}
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting ? "กำลังส่งข้อมูลใบสมัคร..." : "ส่งใบสมัครเป็นนักเขียน"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WriterRegisterPage;
