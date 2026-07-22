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
	WriterID     uint      `json:"writer_id"`
	UserID       uint      `json:"user_id"`
	Username     string    `json:"username"` // ดึงมาจากตาราง users เอาไว้ให้แอดมินรู้ว่าเป็นใคร
	NameLastname string    `json:"name_lastname"`
	PenName      string    `json:"pen_name"`
	Bio          string    `json:"bio"`
	EmailWriter  string    `json:"email_writer"`
	ContactInfo  string    `json:"contact_info"` // พ่นเป็น string JSON ออกไปหน้าบ้าน
	Status       string    `json:"status"`
	AppliedAt    time.Time `json:"applied_at"`
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
