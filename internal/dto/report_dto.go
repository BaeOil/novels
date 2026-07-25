package dto

import "time"

// CreateReportRequest ใช้รับข้อมูลตอนคนอ่านกดส่งรีพอร์ต
type CreateReportRequest struct {
	NovelID int    `json:"novel_id"`
	Reason  string `json:"reason"`
}

// ReportResponse ใช้สำหรับส่งข้อมูลกลับไปให้หน้า Admin Dashboard (อาจจะมีชื่อนิยายหรือชื่อคนรีพอร์ตพ่วงไปด้วย)
type ReportResponse struct {
	ReportID   int       `json:"report_id"`
	UserID     int       `json:"user_id"`
	Username   string    `json:"username,omitempty"`    // ชื่อคนรายงาน (ให้แอดมินดู)
	NovelID    int       `json:"novel_id"`
	NovelTitle string    `json:"novel_title,omitempty"` // ชื่อนิยาย (ให้แอดมินดู)
	Reason     string    `json:"reason"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

// UpdateReportStatusRequest ใช้ตอนแอดมินกดเปลี่ยนสถานะ (เช่น เป็น 'resolved' หรือ 'rejected')
type UpdateReportStatusRequest struct {
	Status string `json:"status"`
}