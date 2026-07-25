package repository

import (
	"context"
	"database/sql"
	"novel-be/internal/dto" // เปลี่ยนชื่อ module 'novel-be' ตามที่คุณใช้จริงนะครับ
	"novel-be/internal/models"
)

type ReportRepository interface {
	CreateReport(ctx context.Context, report models.Report) error
	GetPendingReports(ctx context.Context) ([]dto.ReportResponse, error)
	UpdateReportStatus(ctx context.Context, reportID int, status string) error
}

type sqlReportRepository struct {
	db *sql.DB
}

func NewReportRepository(db *sql.DB) ReportRepository {
	return &sqlReportRepository{db: db}
}

// 📌 1. ฟังก์ชันสร้าง Report ลง Database (ฝั่งคนอ่าน)
func (r *sqlReportRepository) CreateReport(ctx context.Context, report models.Report) error {
	query := `
		INSERT INTO reports (user_id, novel_id, reason, status, created_at)
		VALUES ($1, $2, $3, 'pending', NOW())
	`
	_, err := r.db.ExecContext(ctx, query, report.UserID, report.NovelID, report.Reason)
	return err
}

// 📌 2. ฟังก์ชันดึงรายการ Report ทั้งหมดที่ยังไม่อนุมัติ (ฝั่งแอดมิน)
func (r *sqlReportRepository) GetPendingReports(ctx context.Context) ([]dto.ReportResponse, error) {
	// สังเกตตรงนี้ครับ! เราทำการ JOIN ตาราง users และ novels เพื่อดึงชื่อมาให้แอดมินดู
	query := `
		SELECT 
			r.report_id, 
			r.user_id, 
			u.username, 
			r.novel_id, 
			n.title AS novel_title, 
			r.reason, 
			r.status, 
			r.created_at
		FROM reports r
		LEFT JOIN users u ON r.user_id = u.user_id
		LEFT JOIN novels n ON r.novel_id = n.novel_id
		WHERE r.status = 'pending'
		ORDER BY r.created_at ASC
	`
	
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []dto.ReportResponse
	for rows.Next() {
		var resp dto.ReportResponse
		err := rows.Scan(
			&resp.ReportID,
			&resp.UserID,
			&resp.Username,
			&resp.NovelID,
			&resp.NovelTitle,
			&resp.Reason,
			&resp.Status,
			&resp.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		reports = append(reports, resp)
	}
	
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	return reports, nil
}

// 📌 3. ฟังก์ชันอัปเดตสถานะ Report (ฝั่งแอดมินกดจัดการ)
func (r *sqlReportRepository) UpdateReportStatus(ctx context.Context, reportID int, status string) error {
	query := `
		UPDATE reports
		SET status = $1
		WHERE report_id = $2
	`
	_, err := r.db.ExecContext(ctx, query, status, reportID)
	return err
}