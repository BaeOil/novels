// src/pages/Auth/AuthPage.jsx
//
// ══════════════════════════════════════════════════════════
//  หน้าเข้าสู่ระบบ / สมัครสมาชิก
//  Layout: ซ้าย = Decorative panel | ขวา = Form card
//  Tab switcher ด้านบนสลับระหว่าง Login / Register
//
//  TODO: เชื่อม API เมื่อ Backend พร้อม
//   POST /api/v1/auth/login    → { token, user }
//   POST /api/v1/auth/register → { token, user }
// ══════════════════════════════════════════════════════════

import React, { useState } from "react";
import "./AuthPage.css";

// ══════════════════════════════════════════════════════════
//  Icons (inline SVG components)
// ══════════════════════════════════════════════════════════
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="7" r="3.5" stroke="var(--pink-500)" strokeWidth="1.6"/>
    <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="var(--pink-500)" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2" y="4" width="16" height="12" rx="2" stroke="var(--pink-500)" strokeWidth="1.6" fill="none"/>
    <path d="M2 7l8 5 8-5" stroke="var(--pink-500)" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconEyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

const IconEyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 3l14 14M8.5 8.68A2.5 2.5 0 0012.5 12M1 10s3.5-6 9-6c1.39 0 2.7.3 3.87.83M19 10s-1.35 2.31-3.87 4.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6.5 5.5C3.5 6.9 1 10 1 10s3.5 6 9 6c2.1 0 4-.7 5.5-1.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ══════════════════════════════════════════════════════════
//  Sub: Password input with toggle
// ══════════════════════════════════════════════════════════
const PasswordInput = ({ id, value, onChange, placeholder, error }) => {
  const [show, setShow] = useState(false);
  return (
    <div className={`auth-input-wrap ${error ? "auth-input-wrap--error" : ""}`}>
      <input
        id={id}
        type={show ? "text" : "password"}
        className="auth-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={id === "confirm-password" ? "new-password" : "current-password"}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button
        type="button"
        className="auth-input__eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        aria-pressed={show}
      >
        {show ? <IconEyeOpen /> : <IconEyeClosed />}
      </button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  Sub: Left decorative panel
// ══════════════════════════════════════════════════════════
const DecorPanel = () => (
  <div className="auth-decor" aria-hidden="true">
    {/* Book card stack */}
    <div className="auth-decor__cards">
      <div className="auth-decor__card auth-decor__card--back2" />
      <div className="auth-decor__card auth-decor__card--back1" />
      <div className="auth-decor__card auth-decor__card--main">
        {/* Story Verse logo illustration */}
        <div className="auth-decor__logo-art">
          <div className="auth-decor__hat">🎩</div>
          <div className="auth-decor__book-text">
            <span className="auth-decor__story">STORY</span>
            <span className="auth-decor__diamond">✦</span>
            <span className="auth-decor__verse">VERSE</span>
          </div>
        </div>
      </div>
    </div>

    {/* Brand name */}
    <div className="auth-decor__brand">
      <span className="auth-decor__brand-story">Story </span>
      <span className="auth-decor__brand-verse">Verse</span>
    </div>

    {/* Tagline */}
    <p className="auth-decor__tagline">
      แพลตฟอร์มนิยายทางเลือกรูปแบบใหม่ ที่ให้คุณเป็นผู้กำหนดเส้นทาง
      เลือกปลดล็อก และค้นพบตอนจบที่แตกต่าง
    </p>

    {/* Feature pills */}
    <div className="auth-decor__pills">
      <div className="auth-decor__pill">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1l1.4 3.9H13l-3.4 2.4 1.3 3.9L7 9l-3.9 2.2 1.3-3.9L1 5l4.6-.1z" fill="currentColor"/>
        </svg>
        นิยายทางเลือก
      </div>
      <div className="auth-decor__pill">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="3.5" cy="7" r="1.5" fill="currentColor" opacity=".7"/>
          <circle cx="10.5" cy="3" r="1.5" fill="currentColor" opacity=".7"/>
          <circle cx="10.5" cy="11" r="1.5" fill="currentColor" opacity=".7"/>
          <path d="M5 6.3L9 3.7M5 7.7L9 10.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Story Tree
      </div>
      <div className="auth-decor__pill">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 3h10v8H2z" stroke="currentColor" strokeWidth="1.3" fill="none" rx="1"/>
          <path d="M4 6h6M4 8.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        หลายตอนจบ
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════
//  Sub: Login form
// ══════════════════════════════════════════════════════════
const LoginForm = ({ onSwitchToRegister }) => {
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [remember,  setRemember]  = useState(false);
  const [errors,    setErrors]    = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = "กรุณากรอกอีเมล";
    if (!password.trim()) e.password = "กรุณากรอกรหัสผ่าน";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setIsLoading(true);
    setErrors({});
    // TODO: POST /api/v1/auth/login
    // const res = await fetch("/api/v1/auth/login", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email, password }),
    // });
    // const data = await res.json();
    // if (!res.ok) { setErrors({ general: data.message }); setIsLoading(false); return; }
    // localStorage.setItem("token", data.token);
    // onLoginSuccess(data.user);

    setTimeout(() => {
      setIsLoading(false);
      alert("✅ เข้าสู่ระบบสำเร็จ! (mock)");
    }, 900);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form__heading">
        <p className="auth-form__welcome">ยินดีต้อนรับ</p>
        <h2 className="auth-form__title">เข้าสู่ระบบได้ที่นี่</h2>
      </div>

      {/* General error */}
      {errors.general && (
        <div className="auth-form__error-banner" role="alert">⚠️ {errors.general}</div>
      )}

      {/* Email */}
      <div className="auth-field">
        <div className="auth-field__label-row">
          <IconMail />
          <label className="auth-label" htmlFor="login-email">อีเมล</label>
        </div>
        <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
          <input
            id="login-email"
            type="email"
            className="auth-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); errors.email && setErrors((p) => ({ ...p, email: "" })); }}
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && <p className="auth-field__error" role="alert">{errors.email}</p>}
      </div>

      {/* Password */}
      <div className="auth-field">
        <div className="auth-field__label-row">
          <label className="auth-label" htmlFor="login-password">รหัสผ่าน</label>
        </div>
        <PasswordInput
          id="login-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); errors.password && setErrors((p) => ({ ...p, password: "" })); }}
          placeholder="กรอกรหัสผ่านของคุณ"
          error={errors.password}
        />
        {errors.password && <p className="auth-field__error" role="alert">{errors.password}</p>}
      </div>

      {/* Remember + Forgot */}
      <div className="auth-form__row">
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="auth-checkbox__input"
          />
          <span className="auth-checkbox__box" />
          <span className="auth-checkbox__label">จดจำฉัน</span>
        </label>
        <button type="button" className="auth-form__forgot">ลืมรหัสผ่าน</button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="auth-submit"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? <span className="auth-submit__spinner" /> : "เข้าสู่ระบบ"}
      </button>

      {/* Switch */}
      <p className="auth-form__switch">
        ยังไม่มีบัญชีใช่ไหม?{" "}
        <button type="button" className="auth-form__switch-link" onClick={onSwitchToRegister}>
          สมัครสมาชิก
        </button>
      </p>
    </form>
  );
};

// ══════════════════════════════════════════════════════════
//  Sub: Register form
// ══════════════════════════════════════════════════════════
const RegisterForm = ({ onSwitchToLogin }) => {
  const [username,      setUsername]      = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [confirm,       setConfirm]       = useState("");
  const [remember,      setRemember]      = useState(false);
  const [profileImage,  setProfileImage]  = useState(null);  // ✅ เพิ่ม state นี้
  const [errors,        setErrors]        = useState({});
  const [isLoading,     setIsLoading]     = useState(false);

  // ✅ เพิ่ม handler สำหรับอัพโหลดรูป
  const handleProfileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตรวจสอบว่าเป็น image file
    if (!file.type.startsWith('image/')) {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    // ตรวจสอบขนาดไฟล์ (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องน้อยกว่า 5MB");
      return;
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
    } catch (err) {
      console.error("Error creating object URL:", err);
      alert("เกิดข้อผิดพลาดในการอัพโหลดรูป");
    }
  };

  const validate = () => {
    const e = {};
    if (!username.trim())           e.username = "กรุณากรอกชื่อผู้ใช้";
    if (!email.trim())              e.email    = "กรุณากรอกอีเมล";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!password.trim())           e.password = "กรุณากรอกรหัสผ่าน";
    else if (password.length < 8)   e.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    if (!confirm.trim())            e.confirm  = "กรุณายืนยันรหัสผ่าน";
    else if (confirm !== password)  e.confirm  = "รหัสผ่านไม่ตรงกัน";
    return e;
  };

  const clearFieldError = (field) =>
    errors[field] && setErrors((p) => { const n = { ...p }; delete n[field]; return n; });

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setIsLoading(true);
    setErrors({});
    // TODO: POST /api/v1/auth/register with profileImage
    // const formData = new FormData();
    // formData.append('username', username);
    // formData.append('email', email);
    // formData.append('password', password);
    // if (profileImage) formData.append('profileImage', profileImage);
    // const res = await fetch("/api/v1/auth/register", {
    //   method: "POST",
    //   body: formData,
    // });

    setTimeout(() => {
      setIsLoading(false);
      alert("✅ สมัครสมาชิกสำเร็จ! (mock)");
    }, 900);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form__heading">
        <h2 className="auth-form__title auth-form__title--center">สมัครสมาชิกได้ที่นี่</h2>
      </div>

      {errors.general && (
        <div className="auth-form__error-banner" role="alert">⚠️ {errors.general}</div>
      )}

      {/* ✅ เพิ่มส่วนรูปโปรไฟล์ */}
      <div className="auth-field auth-field--profile">
        <label className="auth-profile-label">รูปโปรไฟล์</label>
        
        <label htmlFor="profile-upload" className="auth-profile-circle">
          <input
            id="profile-upload"
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="auth-profile-input"
            onChange={handleProfileChange}
            aria-label="อัพโหลดรูปโปรไฟล์"
          />

          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile Preview"
              className="auth-profile-image"
            />
          ) : (
            <div className="auth-profile-placeholder">
              <span className="auth-profile-icon">📷</span>
              <span className="auth-profile-text">เพิ่มรูป</span>
            </div>
          )}
        </label>

        <p className="auth-profile-hint">JPG, PNG (สูงสุด 5MB)</p>
      </div>

      {/* Username */}
      <div className="auth-field">
        <div className="auth-field__label-row">
          <IconUser />
          <label className="auth-label" htmlFor="reg-username">ชื่อผู้ใช้</label>
        </div>
        <div className={`auth-input-wrap ${errors.username ? "auth-input-wrap--error" : ""}`}>
          <input
            id="reg-username"
            type="text"
            className="auth-input"
            placeholder="ตั้งชื่อผู้ใช้ของคุณ"
            value={username}
            onChange={(e) => { setUsername(e.target.value); clearFieldError("username"); }}
            autoComplete="username"
            aria-invalid={!!errors.username}
          />
        </div>
        {errors.username && <p className="auth-field__error" role="alert">{errors.username}</p>}
      </div>

      {/* Email */}
      <div className="auth-field">
        <div className="auth-field__label-row">
          <IconMail />
          <label className="auth-label" htmlFor="reg-email">อีเมล</label>
        </div>
        <div className={`auth-input-wrap ${errors.email ? "auth-input-wrap--error" : ""}`}>
          <input
            id="reg-email"
            type="email"
            className="auth-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && <p className="auth-field__error" role="alert">{errors.email}</p>}
      </div>

      {/* Password */}
      <div className="auth-field">
        <div className="auth-field__label-row">
          <label className="auth-label" htmlFor="reg-password">รหัสผ่าน</label>
        </div>
        <PasswordInput
          id="reg-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
          placeholder="ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร"
          error={errors.password}
        />
        {errors.password && <p className="auth-field__error" role="alert">{errors.password}</p>}
      </div>

      {/* Confirm password */}
      <div className="auth-field">
        <div className="auth-field__label-row">
          <label className="auth-label" htmlFor="confirm-password">ยืนยันรหัสผ่าน</label>
        </div>
        <PasswordInput
          id="confirm-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); clearFieldError("confirm"); }}
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          error={errors.confirm}
        />
        {errors.confirm && <p className="auth-field__error" role="alert">{errors.confirm}</p>}
      </div>

      {/* Remember */}
      <div className="auth-form__row auth-form__row--single">
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="auth-checkbox__input"
          />
          <span className="auth-checkbox__box" />
          <span className="auth-checkbox__label">จดจำฉัน</span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="auth-submit"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? <span className="auth-submit__spinner" /> : "สมัครสมาชิก"}
      </button>

      {/* Switch */}
      <p className="auth-form__switch">
        มีบัญชีอยู่แล้วใช่ไหม?{" "}
        <button type="button" className="auth-form__switch-link" onClick={onSwitchToLogin}>
          เข้าสู่ระบบ
        </button>
      </p>
    </form>
  );
};

// ══════════════════════════════════════════════════════════
//  Main: AuthPage
// ══════════════════════════════════════════════════════════
const AuthPage = ({ initialTab = "login" }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // "login" | "register"

  return (
    <div className="auth-page">

      {/* ── Tab switcher (top center) ── */}
      <div className="auth-tabs" role="tablist" aria-label="เลือกโหมด">
        <button
          className={`auth-tab ${activeTab === "login" ? "auth-tab--active" : ""}`}
          role="tab"
          aria-selected={activeTab === "login"}
          onClick={() => setActiveTab("login")}
        >
          เข้าสู่ระบบ
        </button>
        <button
          className={`auth-tab ${activeTab === "register" ? "auth-tab--active" : ""}`}
          role="tab"
          aria-selected={activeTab === "register"}
          onClick={() => setActiveTab("register")}
        >
          สมัครสมาชิก
        </button>
      </div>

      {/* ── Main content: 2 columns ── */}
      <div className="auth-layout">

        {/* Left: decorative */}
        <DecorPanel />

        {/* Right: form card */}
        <div className="auth-card-wrap">
          <div className="auth-card" role="tabpanel">
            {activeTab === "login" ? (
              <LoginForm onSwitchToRegister={() => setActiveTab("register")} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setActiveTab("login")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;