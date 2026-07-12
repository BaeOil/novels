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

const getStatusFlags = (statusValue) => {
    const status = String(statusValue || "").toLowerCase().trim();
    const isCompleted = status === "completed" || status === "complete" || status === "finished" || status.startsWith("completed");
    const isPublished = status === "published" || status === "publish" || status === "active" || status === "เผยแพร่" || status === "completed-published";
    return { isCompleted, isPublished };
};

const getStatusFromFlags = ({ isCompleted, isPublished }) => {
    if (isCompleted && isPublished) return "completed-published";
    if (isCompleted) return "completed-draft";
    if (isPublished) return "published";
    return "draft";
};

const getStatusLabel = ({ isCompleted, isPublished }) => {
    if (isCompleted && isPublished) return "จบแล้ว + เผยแพร่";
    if (isCompleted) return "จบแล้ว + ฉบับร่าง";
    if (isPublished) return "เผยแพร่";
    return "ฉบับร่าง";
};

const validate = (form) => {
    const errors = {};
    if (!form.title.trim()) {
        errors.title = "กรุณากรอกชื่อเรื่อง";
    }
    if (!form.tagline.trim()) {
        errors.tagline = "กรุณากรอกคำโปรย";
    }
    if (form.tagline.length > 200) {
        errors.tagline = "คำโปรยต้องไม่เกิน 200 ตัวอักษร";
    }
    if (form.categories.length === 0) {
        errors.categories = "กรุณาเลือกหมวดหมู่อย่างน้อย 1 หมวด";
    }

    const plainDescription = form.description ? form.description.replace(/<(.|\n)*?>/g, "").trim() : "";
    if (!plainDescription) {
        errors.description = "กรุณากรอกแนะนำเรื่อง";
    }

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
    const [originalStatus, setOriginalStatus] = useState("draft");

    const [errors, setErrors] = useState({});
    const [submissionError, setSubmissionError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesLoaded, setCategoriesLoaded] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

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
                setCategoriesLoaded(true);
            } catch (err) {
                console.error("Category load error:", err);
                setCategories(FALLBACK_CATEGORIES.map((name, index) => ({ id: index + 1, name })));
            } finally {
                setCategoriesLoading(false);
            }
        };
        loadCategories();
    }, []);

    useEffect(() => {
        const loadNovel = async () => {
            console.log("EditNovelPage: mounted, novelId=", novelId);
            if (!novelId) {
                console.warn("EditNovelPage: no novelId in route params", { novelId });
                return;
            }
            setIsLoading(true);

            // Try a couple of fallback strategies in case the path id isn't numeric
            const candidates = [novelId];
            const digits = (novelId || "").match(/\d+/)?.[0];
            if (digits && digits !== novelId) candidates.push(digits);

            let lastErr = null;

            console.log("EditNovelPage: candidates=", candidates);
            for (const idCandidate of candidates) {
                try {
                    console.log("EditNovelPage: attempting fetch for id", idCandidate);
                    console.debug("EditNovelPage: attempting novel fetch", { idCandidate });
                    const response = await fetch(`${API_BASE_URL}/novels/${idCandidate}`);
                    console.log("EditNovelPage: fetch response status", { idCandidate, status: response.status });
                    if (!response.ok) {
                        lastErr = new Error(`novel fetch failed (${response.status})`);
                        console.error("EditNovelPage: fetch returned non-ok", { idCandidate, status: response.status });
                        // try next candidate
                        continue;
                    }
                    const result = await response.json();
                    console.log("EditNovelPage: raw API result", result);
                    let novelData = result.data || result.novel || result;
                    // Some API responses wrap the actual novel under `data.novel` or `novel`
                    if (novelData && typeof novelData === "object" && novelData.novel && typeof novelData.novel === "object") {
                        console.log("EditNovelPage: unwrapping nested novel from novelData.novel");
                        novelData = novelData.novel;
                    }
                    console.log("EditNovelPage: resolved novelData", novelData);

                    const categoryNames = Array.isArray(novelData.categories)
                        ? novelData.categories.map((category) => {
                            if (!category) return null;
                            if (typeof category === "string") return category;
                            return category.name || category.title || category.label || null;
                        }).filter(Boolean)
                        : [];

                    const coverPreview = novelData.cover_image || novelData.coverImage || novelData.cover_url || novelData.coverUrl || null;

                    const statusStr = String(novelData.status || novelData.Status || "").toLowerCase().trim();
                    const { isCompleted, isPublished } = getStatusFlags(statusStr);

                    setForm({
                        title: novelData.title || "",
                        tagline: novelData.captions || novelData.tagline || "",
                        categories: categoryNames,
                        description: novelData.introduction || novelData.description || "",
                        coverFile: null,
                        coverPreview,
                        isPublished,
                        isCompleted,
                    });
                    console.debug("EditNovelPage: populating form with fetched novel data", {
                        title: novelData.title,
                        tagline: novelData.captions || novelData.tagline,
                        statusStr,
                        isPublished,
                        isCompleted,
                    });
                    setOriginalStatus(statusStr || "draft");
                    lastErr = null;
                    break; // success
                } catch (err) {
                    console.error("Load novel attempt failed for id", idCandidate, err);
                    lastErr = err;
                }
            }

            if (lastErr) {
                setSubmissionError("ไม่สามารถโหลดข้อมูลนิยายได้ — ตรวจสอบ novelId หรือเซิร์ฟเวอร์");
            }

            setIsLoading(false);
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

        const wasPublished = ["published", "completed-published", "publish", "active", "เผยแพร่"].includes(String(originalStatus || "").toLowerCase().trim());
        if (form.isPublished && !wasPublished) {
            const confirmPublish = window.confirm(
                "คุณกำลังเปลี่ยนสถานะนิยายเป็นเผยแพร่\n\nเมื่อตีพิมพ์แล้วนักอ่านจะมองเห็นเรื่องนี้\n\nต้องการดำเนินการต่อหรือไม่?"
            );
            if (!confirmPublish) {
                setIsSubmitting(false);
                return;
            }
        }

        setIsSubmitting(true);
        setSubmissionError(null);

        try {
            let coverImageUrl = null;

            if (form.coverFile) {
                const imageFormData = new FormData();
                imageFormData.append("image", form.coverFile);

                const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                    body: imageFormData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    coverImageUrl = uploadData.data?.full_url || uploadData.full_url || null;
                    console.log("EditNovelPage: cover upload result", uploadData, "using url", coverImageUrl);
                } else {
                    console.error("EditNovelPage: cover upload failed", uploadRes.status);
                }
            }

            const selectedCategoryIds = categories
                .filter((cat) => form.categories.includes(cat.name))
                .map((cat) => cat.id);

            const finalStatus = getStatusFromFlags({
                isCompleted: form.isCompleted,
                isPublished: form.isPublished,
            });

            const novelPayload = {
                title: form.title,
                captions: form.tagline,
                introduction: form.description,
                status: finalStatus,
            };
            if (categoriesLoaded) {
                novelPayload.category_ids = selectedCategoryIds;
            }

            if (coverImageUrl) {
                novelPayload.cover_image = coverImageUrl;
            }

            const response = await fetch(`${API_BASE_URL}/novels/${novelId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(novelPayload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || "Update failed");
            }

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
            <div className="cnp" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <div style={{ textAlign: "center" }}>
                    <p>🔄 กำลังโหลดข้อมูลนิยาย...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="cnp">
            <div className="cnp__header">
                <h1 className="cnp__title">แก้ไขข้อมูลนิยาย</h1>
                <p className="cnp__sub">ปรับปรุงข้อมูลเบื้องต้นของนิยายของคุณ</p>
            </div>

            <div className="cnp__form-wrap">
                <div className="cnp__card">
                    {submissionError && (
                        <div className="cnp__error-banner" role="alert" style={{ marginBottom: "16px" }}>
                            {submissionError}
                        </div>
                    )}

                    <div className="cnp__section-header">
                        <h2 className="cnp__section-title">รายละเอียดนิยาย</h2>
                        <p className="cnp__section-sub">ข้อมูลเหล่านี้จะแสดงให้นักอ่านเห็นในหน้ารายละเอียดนิยาย</p>
                    </div>

                    <div className="cnp__columns">
                        <div className="cnp__left">
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
                                />
                                {errors.title && <p className="cnp__error" role="alert">{errors.title}</p>}
                            </div>

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
                                    {errors.tagline && <p className="cnp__error" role="alert">{errors.tagline}</p>}
                                </div>
                            </div>

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
                                {errors.categories && <p className="cnp__error" role="alert">{errors.categories}</p>}
                            </div>

                            <div className="cnp__field" id="field-description">
                                <label className="cnp__label" htmlFor="inp-description">
                                    แนะนำเรื่อง <span className="cnp__required">*</span>
                                </label>
                                <div className={`cnp__quill-wrap ${errors.description ? "cnp__quill-wrap--error" : ""}`}>
                                    <ReactQuill
                                        theme="snow"
                                        value={form.description}
                                        onChange={(value) => setField("description", value)}
                                        placeholder="แนะนำเรื่องราวเกี่ยวกับนิยายของคุณ...."
                                        className="cnp__quill"
                                    />
                                </div>
                                {errors.description && <p className="cnp__error" role="alert">{errors.description}</p>}
                            </div>
                        </div>

                        <div className="cnp__right">
                            <div className="cnp__cover-wrap">
                                <CoverUpload
                                    value={form.coverPreview}
                                    onChange={(file, preview) => {
                                        setField("coverFile", file);
                                        setField("coverPreview", preview);
                                    }}
                                />
                            </div>

                            <div className="cnp__settings">
                                <h3 className="cnp__settings-title">การตั้งค่าเบื้องต้น</h3>

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
                                <div className="cnp__setting-row" style={{ marginTop: 8 }}>
                                    <span className="cnp__setting-label">สถานะปัจจุบัน</span>
                                    <span className="cnp__setting-status cnp__setting-status--on" style={{ marginLeft: 8 }}>
                                        {getStatusLabel({ isCompleted: form.isCompleted, isPublished: form.isPublished })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="cnp__footer">
                        <button
                            type="button"
                            className="cnp__btn cnp__btn--cancel"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            ยกเลิก
                        </button>

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
