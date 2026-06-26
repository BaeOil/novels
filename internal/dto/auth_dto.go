package dto

import (
	"errors"
	"mime/multipart"
	"regexp"
	"strings"
)

// RegisterRequest รับข้อมูลจากฟอร์มสมัครสมาชิกแบบฟอร์ม (Form-Data)
type RegisterRequest struct {
	Username string                `form:"username"`
	Email    string                `form:"email"`
	Password string                `form:"password"`
	Avatar   *multipart.FileHeader `form:"avatar"` // รองรับการอัปโหลดไฟล์รูปเข้า MinIO
}

func (r *RegisterRequest) Validate() error {
	r.Username = strings.TrimSpace(r.Username)
	r.Email = strings.TrimSpace(r.Email)
	if r.Username == "" {
		return errors.New("username is required")
	}
	if r.Email == "" {
		return errors.New("email is required")
	}
	if r.Password == "" {
		return errors.New("password is required")
	}
	if len(r.Password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	if !regexp.MustCompile(`[A-Za-z]`).MatchString(r.Password) || !regexp.MustCompile(`\d`).MatchString(r.Password) {
		return errors.New("password must contain both letters and numbers")
	}
	return nil
}

// LoginRequest รับข้อมูล JSON ตอนเข้าสู่ระบบ
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// AuthResponse ผลลัพธ์ส่งกลับไปหน้าบ้านพร้อมตั๋ว JWT
type AuthResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	User         struct {
		ID         uint   `json:"id"`
		Username   string `json:"username"`
		Email      string `json:"email"`
		PicProfile string `json:"pic_profile"`
		Role       string `json:"role"`
	} `json:"user"`
}
