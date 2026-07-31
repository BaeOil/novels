import React, { useState } from "react";
import "./FollowButton.css";
import { showToast } from "../../utils/toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * FollowButton Component - ปุ่มติดตามนักเขียน
 * @param {object} props
 * @param {number} props.writerId - ID ของนักเขียนที่ต้องการติดตาม
 * @param {string} props.writerName - ชื่อนักเขียน (สำหรับ display/logging)
 * @param {boolean} props.isFollowing - State ว่ากำลังติดตามหรือไม่
 * @param {function} props.onFollowChange - Callback เมื่อสถานะการติดตามเปลี่ยน (รับ isFollowing)
 * @param {string} props.size - ขนาดปุ่ม "small" | "medium" | "large" (default: "medium")
 */
export default function FollowButton({
  writerId,
  writerName = "นักเขียน",
  isFollowing = false,
  onFollowChange,
  size = "medium"
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFollowed, setIsFollowed] = useState(isFollowing);

  const handleFollowClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // Redirect to login page immediately when not logged in
        showToast("กรุณาเข้าสู่ระบบก่อน", { type: "info" });
        window.location.href = "/login-register";
        return;
      }

      const userId = localStorage.getItem("user_id") || (() => {
        const userJson = localStorage.getItem("user");
        if (!userJson) return null;
        try {
          const u = JSON.parse(userJson);
          const idVal = u?.id ?? u?.user_id ?? null;
          if (idVal) localStorage.setItem("user_id", String(idVal));
          return idVal ? String(idVal) : null;
        } catch (e) {
          return null;
        }
      })();

      // Validate writerId (ensure numeric)
      const numericWriterId = Number(writerId);
      if (!numericWriterId || Number.isNaN(numericWriterId)) {
        const msg = "FollowButton: missing writerId";
        console.error(msg);
        showToast(msg, { type: "error" });
        setLoading(false);
        return;
      }

      if (userId && String(userId) === String(numericWriterId)) {
        showToast("คุณไม่สามารถติดตามตัวเองได้", { type: "warning" });
        setLoading(false);
        return;
      }

      // เรียก API ติดตามนักเขียน
      const endpoint = isFollowed
        ? `${API_BASE_URL}/api/writers/${numericWriterId}/unfollow`
        : `${API_BASE_URL}/api/writers/${numericWriterId}/follow`;

      // Debug info (use console.log so it's visible even if debug level filtered)
      console.log("FollowButton: calling endpoint", endpoint, { writerId, isFollowed });
      showToast("กำลังติดตาม...", { type: "info", duration: 1200 });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      // log status and body for debugging follow behavior
      let respBody = null;
      try {
        respBody = await response.json().catch(() => null);
      } catch (e) {
        respBody = null;
      }
      console.debug("FollowButton: response", { status: response.status, ok: response.ok, body: respBody });

      if (!response.ok) {
        const errorText = (respBody && (respBody.message || respBody.error)) || `การติดตามล้มเหลว (${response.status})`;
        showToast(errorText, { type: "error" });
        throw new Error(errorText);
      }

      // อัปเดต state เฉพาะเมื่อ API สำเร็จ
      const newFollowStatus = !isFollowed;
      setIsFollowed(newFollowStatus);
      if (onFollowChange) onFollowChange(newFollowStatus);
      showToast(newFollowStatus ? `ติดตาม ${writerName} แล้ว` : `เลิกติดตาม ${writerName} แล้ว`, { type: "success" });
      console.debug("FollowButton: success", { writerId, newFollowStatus });
    } catch (err) {
      console.error("ติดตามนักเขียนล้มเหลว:", err);
      setError(err.message || "เกิดข้อผิดพลาด");
      // rollback handled by not changing isFollowed until success
    } finally {
      setLoading(false);
    }
  };

  // เพื่อให้ render สะอาด ให้แยก state เป็น variables
  const getIcon = () => {
    if (loading) return "⏳";
    return isFollowed ? "✓" : "+";
  };

  const getText = () => {
    if (loading) return "กำลังดำเนิน...";
    return isFollowed ? "กำลังติดตาม" : "ติดตาม";
  };

  return (
    <button
      className={`follow-button follow-button--${size} ${
        isFollowed ? "follow-button--followed" : ""
      } ${loading ? "follow-button--loading" : ""}`}
      onClick={handleFollowClick}
      disabled={loading}
      title={isFollowed ? `เลิกติดตาม ${writerName}` : `ติดตาม ${writerName}`}
      aria-label={isFollowed ? `เลิกติดตาม ${writerName}` : `ติดตาม ${writerName}`}
    >
      <span className="follow-button__icon">
        {getIcon()}
      </span>
      <span className="follow-button__text">
        {getText()}
      </span>
    </button>
  );
}
