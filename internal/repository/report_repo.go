package repository

import (
	"context"
	"database/sql"
	"errors"

	"novel-be/internal/dto"
	"novel-be/internal/models"
)

type ReportRepository interface {
	CreateReport(ctx context.Context, report models.Report) error
	GetPendingReports(ctx context.Context) ([]dto.ReportResponse, error)
	GetStatus(ctx context.Context, reportID int) (string, error)
	UpdateReportStatus(ctx context.Context, reportID int, status string) error
	CreateAppeal(ctx context.Context, authorUserID int, appeal dto.CreateAppealRequest) error
}

func (r *sqlReportRepository) GetStatus(ctx context.Context, reportID int) (string, error) {
	var status string
	err := r.db.QueryRowContext(ctx, `SELECT status FROM reports WHERE report_id = $1`, reportID).Scan(&status)
	return status, err
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
	// ✅ JOIN ตาราง writers และใช้ชื่อคอลัมน์ที่ถูกต้อง[cite: 10]
	query := `
		SELECT 
			r.report_id, 
			r.user_id, 
			u.username, 
			r.novel_id, 
			n.title AS novel_title, 
			r.reason, 
			r.status, 
			r.created_at,
			n.cover_image,      -- 🟢 ดึงรูปปก
			n.introduction,     -- 🟢 ดึงคำโปรย (หรือจะใช้ n.captions ก็ได้ครับ)
			w.pen_name,         -- 🟢 ดึงนามปากกาจากตาราง writers
			w.user_id AS author_user_id
		FROM reports r
		LEFT JOIN users u ON r.user_id = u.user_id
		LEFT JOIN novels n ON r.novel_id = n.novel_id
		LEFT JOIN writers w ON n.author_id = w.writer_id
		ORDER BY r.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []dto.ReportResponse
	for rows.Next() {
		var resp dto.ReportResponse
		// 🟢 ใช้ sql.NullString และ sql.NullInt32 ป้องกัน error เวลา DB ส่งค่า NULL มาให้
		var coverImage, introduction, penName sql.NullString
		var authorUserID sql.NullInt32 // 🟢 เพิ่มตัวแปรมารับค่า AuthorUserID

		err := rows.Scan(
			&resp.ReportID,
			&resp.UserID,
			&resp.Username,
			&resp.NovelID,
			&resp.NovelTitle,
			&resp.Reason,
			&resp.Status,
			&resp.CreatedAt,
			&coverImage,
			&introduction,
			&penName,
			&authorUserID, // 🟢 เพิ่มมารับค่าตรงนี้
		)
		if err != nil {
			return nil, err
		}

		// 🟢 แปลงจากค่าที่ครอบ Null ไว้ กลับเป็นชนิดข้อมูลปกติ เพื่อส่งให้ Frontend
		if coverImage.Valid {
			resp.NovelCover = coverImage.String
		}
		if introduction.Valid {
			resp.NovelSynopsis = introduction.String
		}
		if penName.Valid {
			resp.AuthorPenName = penName.String
		}
		if authorUserID.Valid {
			resp.AuthorUserID = int(authorUserID.Int32) // 🟢 แปลงเป็น int ตาม DTO
		}

		reports = append(reports, resp)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return reports, nil
}

// 📌 3. ฟังก์ชันอัปเดตสถานะ Report, แบนนิยาย และแจ้งเตือน (ฝั่งแอดมินกดจัดการ)
func (r *sqlReportRepository) UpdateReportStatus(ctx context.Context, reportID int, status string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 🟢 1. แก้ไข SQL: ดึง status เดิมของรายงานตัวนี้มาด้วย (เพื่อเช็คว่าเป็น pending หรือ appeal_pending)
	var reporterID, novelID int
	var currentReportStatus string
	err = tx.QueryRowContext(ctx, `SELECT user_id, novel_id, status FROM reports WHERE report_id = $1`, reportID).Scan(&reporterID, &novelID, &currentReportStatus)
	if err != nil {
		return err
	}

	// 2. ดึง user_id ของนักเขียน และชื่อเรื่อง (title)
	var writerUserID int
	var novelTitle string
	queryAuthor := `
		SELECT w.user_id, n.title 
		FROM novels n
		JOIN writers w ON n.author_id = w.writer_id
		WHERE n.novel_id = $1
	`
	err = tx.QueryRowContext(ctx, queryAuthor, novelID).Scan(&writerUserID, &novelTitle)
	if err != nil {
		return err
	}

	// 3. อัปเดตสถานะรายงานตัวนี้ในตาราง reports
	_, err = tx.ExecContext(ctx, `UPDATE reports SET status = $1 WHERE report_id = $2`, status, reportID)
	if err != nil {
		return err
	}

	// ==========================================
	// 🟢 กรณีแอดมินกดอนุมัติ (Resolved)
	// ==========================================
	if status == "resolved" {

		// 🟢 กรณีที่ 1: เป็นคำขอปลดแบน (appeal_pending) -> แอดมินอนุมัติให้ปลดแบน
		if currentReportStatus == "appeal_pending" {
			// ปลดแบนนิยาย (เปลี่ยน status กลับเป็น active หรือ draft ตามต้องการ)
			_, err = tx.ExecContext(ctx,
				`UPDATE novels SET status = 'active', updated_at = NOW() WHERE novel_id = $1`,
				novelID,
			)
			if err != nil {
				return err
			}

			// แจ้งเตือนหานักเขียนว่าได้รับการปลดแบนแล้ว
			writerMsg := "คำขอปลดแบนสำหรับนิยายเรื่อง '" + novelTitle + "' ของคุณได้รับการอนุมัติเรียบร้อยแล้ว"
			_, err = tx.ExecContext(ctx,
				`INSERT INTO notifications (user_id, type, reference_id, reference_type, message, is_read, created_at) 
				 VALUES ($1, 'system', $2, 'novel', $3, false, NOW())`,
				writerUserID, novelID, writerMsg,
			)
			if err != nil {
				return err
			}

		} else {
			// 🟢 กรณีที่ 2: เป็นการรายงานทั่วไป (pending) -> นิยายผิดจริง สั่งแบนนิยาย
			_, err = tx.ExecContext(ctx,
				`UPDATE novels SET is_published = false, status = 'banned', updated_at = NOW() WHERE novel_id = $1`,
				novelID,
			)
			if err != nil {
				return err
			}

			// สร้างแจ้งเตือนหานักเขียน
			writerMsg := "นิยายเรื่อง '" + novelTitle + "' ของคุณถูกระงับการเผยแพร่ เนื่องจากได้รับการรายงานและตรวจสอบพบว่าผิดเงื่อนไขการใช้งาน"
			_, err = tx.ExecContext(ctx,
				`INSERT INTO notifications (user_id, type, reference_id, reference_type, message, is_read, created_at) 
				 VALUES ($1, 'system', $2, 'novel', $3, false, NOW())`,
				writerUserID, novelID, writerMsg,
			)
			if err != nil {
				return err
			}

			// สร้างแจ้งเตือนกลับหาคนรายงาน (reporterID)
			reporterMsg := "การรายงานนิยายเรื่อง '" + novelTitle + "' ของคุณได้รับการตรวจสอบแล้ว ระบบได้ทำการระงับเนื้อหาดังกล่าวเรียบร้อย"
			_, err = tx.ExecContext(ctx,
				`INSERT INTO notifications (user_id, type, reference_id, reference_type, message, is_read, created_at) 
				 VALUES ($1, 'system', $2, 'novel', $3, false, NOW())`,
				reporterID, novelID, reporterMsg,
			)
			if err != nil {
				return err
			}
		}
	}

	// ==========================================
	// 🔴 กรณีแอดมินปฏิเสธ (Rejected)
	// ==========================================
	if status == "rejected" {
		if currentReportStatus == "appeal_pending" {
			// นักเขียนขอปลดแบน แต่แอดมินปฏิเสธ (ไม่ยอมปลดแบนให้)
			writerMsg := "คำขอปลดแบนสำหรับนิยายเรื่อง '" + novelTitle + "' ถูกปฏิเสธ นิยายของคุณยังคงถูกระงับการเผยแพร่"
			_, err = tx.ExecContext(ctx,
				`INSERT INTO notifications (user_id, type, reference_id, reference_type, message, is_read, created_at) 
				 VALUES ($1, 'system', $2, 'novel', $3, false, NOW())`,
				writerUserID, novelID, writerMsg,
			)
			if err != nil {
				return err
			}
		} else {
			// คนอ่านรายงานเข้ามา แต่แอดมินตรวจแล้วไม่ผิด
			reporterMsg := "การรายงานนิยายเรื่อง '" + novelTitle + "' ของคุณได้รับการตรวจสอบแล้ว ไม่พบความผิดปกติของเนื้อหาตามที่แจ้ง"
			_, err = tx.ExecContext(ctx,
				`INSERT INTO notifications (user_id, type, reference_id, reference_type, message, is_read, created_at) 
				 VALUES ($1, 'system', $2, 'novel', $3, false, NOW())`,
				reporterID, novelID, reporterMsg,
			)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

// 📌 4. ฟังก์ชันสำหรับนักเขียนยื่นขอปลดแบน
func (r *sqlReportRepository) CreateAppeal(ctx context.Context, authorUserID int, appeal dto.CreateAppealRequest) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// ตรวจสอบก่อนว่านิยายเรื่องนี้เป็นของนักเขียนคนนี้จริงไหม และโดนแบนอยู่จริงหรือไม่
	var novelTitle string
	queryCheck := `
		SELECT n.title 
		FROM novels n
		JOIN writers w ON n.author_id = w.writer_id
		WHERE n.novel_id = $1 AND w.user_id = $2 AND n.status = 'banned'
	`
	err = tx.QueryRowContext(ctx, queryCheck, appeal.NovelID, authorUserID).Scan(&novelTitle)
	if err != nil {
		return errors.New("unauthorized or novel is not currently banned")
	}

	// บันทึกรายการขอปลดแบนลงตาราง reports (กำหนดสถานะเป็น appeal_pending)
	appealReason := "[ขอปลดแบน]: " + appeal.Reason
	queryInsert := `
		INSERT INTO reports (user_id, novel_id, reason, status, created_at)
		VALUES ($1, $2, $3, 'appeal_pending', NOW())
	`
	_, err = tx.ExecContext(ctx, queryInsert, authorUserID, appeal.NovelID, appealReason)
	if err != nil {
		return err
	}

	return tx.Commit()
}
