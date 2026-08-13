package dto

import "time"

// WriterApplyRequest รับข้อมูลตอนยื่นคำขอสมัครเป็นนักเขียน
type WriterApplyRequest struct {
	NameLastname    string   `json:"name_lastname"`
	PenName         string   `json:"pen_name"`
	Bio             string   `json:"bio"`
	CategoryIDs     []int    `json:"category_ids"`
	Genres          []string `json:"genres"`
	EmailWriter     string   `json:"email_writer"`
	ContactRequired string   `json:"contact_required"` // 👈 ช่องทางติดต่อที่ 1 (บังคับ)
	ContactOptional string   `json:"contact_optional"` // 👈 ช่องทางติดต่อที่ 2 (ไม่บังคับ)
	AvatarURL       string   `json:"avatar_url,omitempty"`
}

// WriterRequestResponse สำหรับส่งกลับไปให้หน้าแอดมินดูคำขอ
type WriterRequestResponse struct {
	WriterID             uint       `json:"writer_id"`
	UserID               uint       `json:"user_id"`
	Username             string     `json:"username"`    // ดึงมาจากตาราง users เอาไว้ให้แอดมินรู้ว่าเป็นใคร
	PicProfile           string     `json:"pic_profile,omitempty"` // รูปโปรไฟล์บัญชีผู้ใช้ จากตาราง users (ใช้ระบุตัวตนในตาราง list)
	NameLastname         string     `json:"name_lastname"`
	PenName              string     `json:"pen_name"`
	Bio                  string     `json:"bio"`
	AvatarURL            string     `json:"avatar_url,omitempty"` // รูปที่แนบมาตอนยื่นใบสมัครนักเขียน จากตาราง writers
	EmailWriter          string     `json:"email_writer"`
	ContactInfo          string     `json:"contact_info"` // พ่นเป็น string JSON ออกไปหน้าบ้าน
	Genres               []string   `json:"genres"`
	Status               string     `json:"status"`
	AppliedAt            time.Time  `json:"applied_at"`
	ApprovedAt           *time.Time `json:"approved_at,omitempty"`
	RejectedAt           *time.Time `json:"rejected_at,omitempty"`
	ActedByAdminID       *uint      `json:"acted_by_admin_id,omitempty"`
	ActedByAdminUsername *string    `json:"acted_by_admin_username,omitempty"`
	RejectionReason      *string    `json:"rejection_reason,omitempty"`
	// เผื่อกรณีผู้ใช้คนนี้เคยสมัครมาก่อนแล้ว (ถูกปฏิเสธแล้วแก้ไขส่งใหม่) แอดมินจะได้เห็นบริบทว่าเคยมีปัญหาอะไรมาก่อน
	PreviousAttemptCount    int     `json:"previous_attempt_count,omitempty"`
	PreviousRejectionReason *string `json:"previous_rejection_reason,omitempty"`
}

// UpdateWriterProfileRequest สำหรับรับข้อมูลอัปเดตโปรไฟล์นักเขียน
type UpdateWriterProfileRequest struct {
	PenName         string      `json:"pen_name"`
	Bio             string      `json:"bio"`
	AvatarURL       string      `json:"avatar_url"`
	ContactInfo     interface{} `json:"contact_info"`
	ContactRequired string      `json:"contact_required,omitempty"`
	ContactOptional string      `json:"contact_optional,omitempty"`
	EmailWriter     string      `json:"email_writer,omitempty"`
	CategoryIDs     []int       `json:"category_ids"`
}