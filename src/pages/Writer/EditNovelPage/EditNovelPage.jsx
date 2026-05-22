import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import "./EditNovelPage.css";
import MultiSelect from "../../../components/MultiSelect/MultiSelect";
import CoverUpload from "../../../components/CoverUpload/CoverUpload";
import Toggle from "../../../components/Toggle/Toggle";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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
    
    const plainDescription = form.description
        .replace(/<(.|\n)*?>/g, "")
        .trim();

    if (!plainDescription)
        errors.description = "กรุณากรอกแนะนำเรื่อง";
    
    return errors;
};

const EditNovelPage = ({ onNavigate }) => {
    const navigate = useNavigate();
    const { novelId } = useParams();
    const token = localStorage.getItem("token");

    const [form, setForm] = useState({
        title: "",
        tagline: "",
        categories: [],
        description: "",
        coverFile: null,
        coverPreview: null,
        isPublished: true,
        isCompleted: false,
    });

    const [errors, setErrors] = useState({});
    const [submissionError, setSubmissionError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // ── Load categories ──────────────────────────────────
    useEffect(() => {
        const loadCategories = async () => {
            setCategoriesLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/categories`);
                if (!response.ok) throw new Error("failed to fetch categories");
                const result = await response.json();
                const categoriesData = Array.isArray(result)
                    ? result
                    : Array.isArray(result?.data)
                        ? result.data
                        : [];
                if (categoriesData.length === 0) throw new Error("categories response invalid");
                setCategories(categoriesData.map((category) => ({
                    id: category.category_id || category.id,
                    name: category.name,
                })));
            } catch (err) {
                console.error("Category load error:", err);
                setCategories(FALLBACK_CATEGORIES.map((name, index) => ({ id: index + 1, name })));
            } finally {
                setCategoriesLoading(false);
            }
        };
        loadCategories();
    }, []);

    // ── Load novel data ──────────────────────────────────
    useEffect(() => {
        const loadNovel = async () => {
            if (!novelId) return;
            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/novels/${novelId}`);
                if (!response.ok) throw new Error("failed to fetch novel");
                const result = await response.json();
                const novelData = result.data || result;

                setForm({
                    title: novelData.title || "",
                    tagline: novelData.tagline || "",
                    categories: novelData.categories || [],
                    description: novelData.description || "",
                    coverFile: null,
                    coverPreview: novelData.cover_url || null,
                    isPublished: novelData.status === "published",
                    isCompleted: novelData.is_completed || false,
                });
            } catch (err) {
                console.error("Load novel error:", err);
                setSubmissionError("ไม่สามารถโหลดข้อมูลนิยายได้");
            } finally {
                setIsLoading(false);
            }
        };
        loadNovel();
    }, [novelId]);

    const categoryOptions = categories.map((cat) => cat.name);

    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const handleSubmit = async () => {
        const newErrors = validate(form);
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setSubmissionError(null);

        try {
            const formData = new FormData();
            formData.append("title", form.title);
            formData.append("tagline", form.tagline);
            formData.append("categories", JSON.stringify(form.categories));
            formData.append("description", form.description);
            formData.append("isPublished", form.isPublished);
            formData.append("isCompleted", form.isCompleted);
            
            if (form.coverFile) {
                formData.append("cover", form.coverFile);
            }

            const response = await fetch(`${API_BASE_URL}/novels/${novelId}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error("Update failed");

            alert("✅ อัพเดทข้อมูลนิยายสำเร็จ!");
            navigate(`/writer/${novelId}/chapters`);
        } catch (error) {
            console.error("Submit error:", error);
            setSubmissionError("❌ เกิดข้อผิดพลาด: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setShowCancelModal(true);
    };

    const handleConfirmCancel = () => {
        setShowCancelModal(false);
        navigate(`/writer/${novelId}/chapters`);
    };

    const taglineLen = form.tagline.length;

    if (isLoading) {
        return (
            <div className="enp" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <div style={{ textAlign: "center" }}>
                    <p>🔄 กำลังโหลดข้อมูลนิยาย...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="enp">
            <div className="enp__header">
                <h1 className="enp__title">แก้ไขข้อมูลนิยาย</h1>
                <p className="enp__sub">ปรับปรุงข้อมูลเบื้องต้นของนิยายของคุณ</p>
            </div>

            <div className="enp__form-wrap">
                <div className="enp__card">
                    {submissionError && (
                        <div className="enp__error-banner" role="alert" style={{ marginBottom: "16px" }}>
                            {submissionError}
                        </div>
                    )}

                    <div className="enp__section-header">
                        <h2 className="enp__section-title">รายละเอียดนิยาย</h2>
                        <p className="enp__section-sub">ข้อมูลที่คุณแก้ไขจะแสดงให้นักอ่านเห็น</p>
                    </div>

                    <div className="enp__columns">
                        <div className="enp__left">
                            {/* ชื่อเรื่อง */}
                            <div className="enp__field">
                                <label className="enp__label" htmlFor="inp-title">
                                    ชื่อเรื่อง <span className="enp__required">*</span>
                                </label>
                                <input
                                    id="inp-title"
                                    type="text"
                                    className={`enp__input ${errors.title ? "enp__input--error" : ""}`}
                                    value={form.title}
                                    onChange={(e) => setField("title", e.target.value)}
                                    maxLength={100}
                                />
                                {errors.title && <p className="enp__error" role="alert">{errors.title}</p>}
                            </div>

                            {/* คำโปรย */}
                            <div className="enp__field">
                                <label className="enp__label" htmlFor="inp-tagline">
                                    คำโปรย <span className="enp__required">*</span>
                                </label>
                                <textarea
                                    id="inp-tagline"
                                    className={`enp__textarea enp__textarea--sm ${errors.tagline ? "enp__input--error" : ""}`}
                                    value={form.tagline}
                                    onChange={(e) => setField("tagline", e.target.value)}
                                    maxLength={200}
                                />
                                <div className="enp__char-row">
                                    <p className={`enp__char-count ${taglineLen > 180 ? "enp__char-count--warn" : ""}`}>
                                        {taglineLen} / 200 ตัวอักษร
                                    </p>
                                    {errors.tagline && <p className="enp__error" role="alert">{errors.tagline}</p>}
                                </div>
                            </div>

                            {/* หมวดหมู่ */}
                            <div className="enp__field">
                                <label className="enp__label">
                                    หมวดหมู่ <span className="enp__required">*</span>
                                </label>
                                <MultiSelect
                                    options={categoryOptions}
                                    value={form.categories}
                                    onChange={(val) => setField("categories", val)}
                                    placeholder={categoriesLoading ? "กำลังโหลด..." : "เลือกหมวดหมู่..."}
                                    max={5}
                                />
                                {errors.categories && <p className="enp__error" role="alert">{errors.categories}</p>}
                            </div>

                            {/* แนะนำเรื่อง */}
                            <div className="enp__field">
                                <label className="enp__label">
                                    แนะนำเรื่อง <span className="enp__required">*</span>
                                </label>
                                <div className={`enp__quill-wrap ${errors.description ? "enp__quill-wrap--error" : ""}`}>
                                    <ReactQuill
                                        theme="snow"
                                        value={form.description}
                                        onChange={(value) => setField("description", value)}
                                        placeholder="แนะนำเรื่องราว..."
                                    />
                                </div>
                                {errors.description && <p className="enp__error" role="alert">{errors.description}</p>}
                            </div>
                        </div>

                        <div className="enp__right">
                            {/* Cover upload */}
                            <div className="enp__cover-wrap">
                                <CoverUpload
                                    value={form.coverPreview}
                                    onChange={(file, preview) => {
                                        setField("coverFile", file);
                                        setField("coverPreview", preview);
                                    }}
                                />
                            </div>

                            {/* Settings */}
                            <div className="enp__settings">
                                <h3 className="enp__settings-title">การตั้งค่า</h3>

                                <div className="enp__setting-row">
                                    <span className="enp__setting-label">สถานะเรื่อง</span>
                                    <div className="enp__setting-control">
                                        <Toggle
                                            id="toggle-published"
                                            checked={form.isPublished}
                                            onChange={(val) => setField("isPublished", val)}
                                        />
                                        <span className={`enp__setting-status ${form.isPublished ? "enp__setting-status--on" : ""}`}>
                                            {form.isPublished ? "เผยแพร่" : "ฉบับร่าง"}
                                        </span>
                                    </div>
                                </div>

                                <div className="enp__setting-row">
                                    <span className="enp__setting-label">สถานะจบ</span>
                                    <div className="enp__setting-control">
                                        <Toggle
                                            id="toggle-completed"
                                            checked={form.isCompleted}
                                            onChange={(val) => setField("isCompleted", val)}
                                        />
                                        <span className={`enp__setting-status ${form.isCompleted ? "enp__setting-status--on" : ""}`}>
                                            {form.isCompleted ? "จบแล้ว" : "ยังไม่จบ"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="enp__footer">
                        <button
                            type="button"
                            className="enp__btn enp__btn--cancel"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            ยกเลิก
                        </button>

                        <button
                            type="button"
                            className="enp__btn enp__btn--submit"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="enp__spinner" />
                                    กำลังอัพเดท...
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                        <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    อัพเดทข้อมูลนิยาย
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>ยกเลิกการแก้ไข</h2>
                        <p>คุณต้องการยกเลิกการแก้ไขนิยายหรือไม่?</p>
                        <p style={{ color: "#999", fontSize: "14px" }}>การเปลี่ยนแปลงที่ยังไม่บันทึกจะสูญหาย</p>
                        
                        <div className="modal-buttons">
                            <button
                                className="btn btn--outline"
                                onClick={() => setShowCancelModal(false)}
                            >
                                ไม่ยกเลิก
                            </button>
                            <button
                                className="btn btn--danger"
                                onClick={handleConfirmCancel}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditNovelPage;