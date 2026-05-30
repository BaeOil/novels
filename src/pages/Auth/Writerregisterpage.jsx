import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom"; // 1. เพิ่มการ Import ReactDOM เข้ามาตรงนี้
import "./WriterRegisterPage.css";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";

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
//  Sub Component: Cancel Confirmation Modal
// ─────────────────────────────────────────────
const CancelConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    
    // 2. ใช้ ReactDOM.createPortal ครอบ เพื่อส่งกล่องนี้ไปอยู่ชั้นนอกสุดของหน้าเว็บ
    return ReactDOM.createPortal(
        <div className="wr-modal-overlay">
            <div className="wr-modal">
                <h3 className="wr-modal__title">ยกเลิกการสมัคร</h3>
                <p className="wr-modal__text">คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการสมัครเป็นนักเขียน? ข้อมูลทั้งหมดที่กรอกมาจะไม่ถูกบันทึกนะครับ</p>
                <div className="wr-modal__actions">
                    <button type="button" className="wr-btn wr-btn--outline" onClick={onCancel}>
                        กรอกข้อมูลต่อ
                    </button>
                    <button type="button" className="wr-btn wr-btn--danger" onClick={onConfirm}>
                        ใช่, ยกเลิกเลย
                    </button>
                </div>
            </div>
        </div>,
        document.body // ส่งไปต่อท้ายแท็ก body โดยตรง ไม่ให้โดนเลย์เอาต์หน้าฟอร์มบีบ
    );
};

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

// ======================================================
//  Main Component: WriterRegisterPage
// ======================================================
const WriterRegisterPage = ({ onComplete, onBack }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);

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
    const [writerAppStatus, setWriterAppStatus] = useState("none");
    const [writerAppLoading, setWriterAppLoading] = useState(true);
    const [writerAppError, setWriterAppError] = useState(null);
    const hasPerformedAuthCheck = useRef(false);

    useEffect(() => {
        const fetchWriterApplication = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setWriterAppLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/writers/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        setWriterAppStatus("none");
                    } else {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.message || data.error || `HTTP ${res.status}`);
                    }
                } else {
                    const data = await res.json();
                    setWriterAppStatus(data.status || "none");
                }
            } catch (err) {
                console.error("Failed to load writer application status:", err);
                setWriterAppError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจสอบสถานะคำขอ");
            } finally {
                setWriterAppLoading(false);
            }
        };

        fetchWriterApplication();
    }, []);

    useEffect(() => {
        if (hasPerformedAuthCheck.current) return;
        hasPerformedAuthCheck.current = true;

        const token = localStorage.getItem("token");
        const userJson = localStorage.getItem("user");

        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                if (user.role === "writer" || user.is_writer === true) {
                    alert("คุณเป็นนักเขียนอยู่แล้ว ไม่สามารถสมัครซ้ำได้ครับ 🎉");
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
            // สเต็ปที่ 1 ถ้ากดย้อนกลับ จะเป็นการเปิด Modal ยืนยันยกเลิกการสมัครแทน
            setCancelModalOpen(true);
        }
    };

    const handleCancelConfirm = () => {
        setCancelModalOpen(false);
        navigate("/");
        if (onBack) onBack();
    };

    const handleCancelModal = () => {
        setCancelModalOpen(false);
    };

    const handleSubmit = async () => {
        if (writerAppStatus === "pending") {
            alert("คุณได้ยื่นคำขอเป็นนักเขียนแล้ว กรุณารอการอนุมัติหรือปฏิเสธก่อนสมัครใหม่");
            return;
        }
        if (writerAppStatus === "approved") {
            alert("คำขอของคุณได้รับการอนุมัติแล้ว ไม่สามารถสมัครใหม่ได้อีก");
            navigate("/writer/dashboard");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();

            formData.append("full_name", form.fullName);
            formData.append("pen_name", form.penName);
            formData.append("email", form.email);
            formData.append("bio", form.bio);
            formData.append("genres", JSON.stringify(form.genres));
            formData.append("main_contact", form.mainContact);
            formData.append("other_links", form.otherLinks);
            
            if (form.avatarFile) {
                formData.append("avatar", form.avatarFile);
            }

            const response = await fetch(`${API_BASE_URL}/api/writers/apply`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
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

    if (checkingAuth || writerAppLoading) {
        return <div className="wr-loading">กำลังตรวจสอบสิทธิ์และสถานะคำขอ...</div>;
    }

    if (writerAppStatus === "approved") {
        return (
            <div className="wr-page">
                <div className="wr-header-wrapper">
                    <div className="wr-header">
                        <h1 className="wr-header__title">คุณได้รับอนุมัติแล้ว</h1>
                        <p className="wr-header__sub">คุณสามารถเข้าสู่ระบบและใช้งานพื้นที่นักเขียนได้ทันที</p>
                    </div>
                </div>
                <div className="wr-card">
                    <p>คำขอสมัครนักเขียนของคุณได้รับการอนุมัติแล้ว ไม่สามารถยื่นคำขอซ้ำได้อีก</p>
                    <button type="button" className="wr-btn wr-btn--primary" onClick={() => navigate("/writer/dashboard")}>ไปที่ Writer Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <div className="wr-page">
                {/* [แก้ไข] นำ wr-cancel-btn (ปุ่มกากบาท) ออกจากส่วนหัวทั้งหมดตามหลัก UX */}
                <div className="wr-header-wrapper">
                    <div className="wr-header">
                        <h1 className="wr-header__title">สมัครเป็นนักเขียน</h1>
                        <p className="wr-header__sub">กรอกข้อมูลเพื่อยืนยันตัวตนของคุณในฐานะนักเขียน</p>
                    </div>
                </div>

                {writerAppStatus === "pending" && (
                    <div className="wr-form-notice wr-form-notice--warning">
                        คุณได้ส่งคำขอสมัครเป็นนักเขียนไปแล้ว กรุณารอแอดมินอนุมัติหรือปฏิเสธก่อนสมัครใหม่
                    </div>
                )}

                {writerAppStatus === "rejected" && (
                    <div className="wr-form-notice wr-form-notice--info">
                        คำขอครั้งก่อนถูกปฏิเสธ คุณสามารถแก้ข้อมูลและยื่นสมัครใหม่ได้
                    </div>
                )}

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

                            {/* [แก้ไข] เพิ่มปุ่มยกเลิกในฐานะปุ่มย้อนกลับของหน้าแรกสุด */}
                            <div className="wr-step-nav" style={{ marginTop: 24 }}>
                                <button type="button" className="wr-btn wr-btn--outline" onClick={handlePrev}>
                                    ยกเลิกการสมัคร
                                </button>
                                <button type="button" className="wr-btn wr-btn--primary" onClick={handleNext}>
                                    ถัดไป
                                </button>
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
                            <button type="button" className="wr-btn wr-btn--outline" onClick={handlePrev}>ย้อนกลับ</button>
                            <button type="button" className="wr-btn wr-btn--primary" onClick={handleNext}>ถัดไป</button>
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
                            <button type="button" className="wr-btn wr-btn--outline" onClick={handlePrev}>ย้อนกลับ</button>
                            <button type="button" className="wr-btn wr-btn--primary" onClick={handleNext}>ถัดไป</button>
                        </div>
                    </div>
                )}

                {/* STEP 4: ยืนยันข้อมูล */}
                {step === 4 && (
                    <div className="wr-step-content">
                        <div className="wr-confirm-header-wrapper">
                            <div className="wr-confirm-header">
                                <h2 className="wr-section-title">ยืนยันข้อมูล</h2>
                                <p className="wr-confirm-sub">ตรวจสอบข้อมูลของคุณ</p>
                            </div>
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
                                <span className="wr-checkbox__label">ฉันยอมรับข้อมูลที่ให้ไว้เป็นความจริง</span>
                            </label>
                            {errors.confirmed && <p className="wr-field__error" role="alert">{errors.confirmed}</p>}
                        </div>

                        <div className="wr-step-nav">
                            <button type="button" className="wr-btn wr-btn--outline" onClick={handlePrev}>ย้อนกลับ</button>
                            <button
                                type="button"
                                className="wr-btn wr-btn--primary"
                                onClick={handleNext}
                                disabled={isSubmitting || writerAppStatus === "pending" || writerAppStatus === "approved"}
                                aria-busy={isSubmitting}
                            >
                                {isSubmitting ? <span className="wr-spinner" /> : "ยืนยันและส่งใบสมัคร"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal ถูกย้ายเข้ามาอยู่ในจุดที่จะดึงสไตล์ Overlay กลางจอได้ง่ายขึ้น */}
                <CancelConfirmModal
                    isOpen={cancelModalOpen}
                    onConfirm={handleCancelConfirm}
                    onCancel={handleCancelModal}
                />
            </div>
        </>
    );
};

export default WriterRegisterPage;
