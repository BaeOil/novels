package repository

import (
	"context"
	"database/sql"
	"novel-be/internal/dto"
	"novel-be/internal/models" // 👈 มั่นใจว่ามีอิมพอร์ตโมเดลตัวจริงเข้ามาใช้งานแล้ว
)

type sqlWriterRepository struct {
	db *sql.DB
}

func NewWriterRepository(db *sql.DB) WriterRepository {
	return &sqlWriterRepository{db: db}
}

// 🟢 ปรับปรุงฟังก์ชันนี้ให้ตรงตามสัญญา (want GetWriterByID(int) (*models.Writer, error))
func (r *sqlWriterRepository) GetWriterByID(id int) (*models.Writer, error) {
	query := `SELECT writer_id, user_id, pen_name, bio, email_writer, contact_info FROM writers WHERE writer_id = $1`

	var w models.Writer
	err := r.db.QueryRow(query, id).Scan(&w.WriterID, &w.UserID, &w.PenName, &w.Bio, &w.EmailWriter, &w.ContactInfo)
	if err != nil {
		return nil, err
	}

	return &w, nil
}

func (r *sqlWriterRepository) GetWriterByUserID(userID int) (*models.Writer, error) {
	query := `SELECT writer_id, user_id, pen_name, bio, email_writer, contact_info, status FROM writers WHERE user_id = $1 AND status = 'approved' LIMIT 1`

	var w models.Writer
	err := r.db.QueryRow(query, userID).Scan(&w.WriterID, &w.UserID, &w.PenName, &w.Bio, &w.EmailWriter, &w.ContactInfo, &w.Status)
	if err != nil {
		return nil, err
	}

	return &w, nil
}

func (r *sqlWriterRepository) GetLatestWriterApplicationByUserID(userID int) (*models.Writer, error) {
	query := `SELECT writer_id, user_id, pen_name, bio, email_writer, contact_info, status FROM writers WHERE user_id = $1 ORDER BY applied_at DESC LIMIT 1`

	var w models.Writer
	err := r.db.QueryRow(query, userID).Scan(&w.WriterID, &w.UserID, &w.PenName, &w.Bio, &w.EmailWriter, &w.ContactInfo, &w.Status)
	if err != nil {
		return nil, err
	}

	return &w, nil
}

func (r *sqlWriterRepository) GetUserRoleByUserID(userID int) (string, error) {
	query := `SELECT role FROM users WHERE user_id = $1`
	var role string
	err := r.db.QueryRow(query, userID).Scan(&role)
	if err != nil {
		return "", err
	}
	return role, nil
}

// ✍️ 1. ส่งคำขอเข้าตาราง writers (เริ่มต้นสถานะ 'pending')
func (r *sqlWriterRepository) Apply(ctx context.Context, userID uint, req dto.WriterApplyRequest, contactJSON string) error {
	// 1. เปิด Transaction เพราะเราจะบันทึกมากกว่า 1 ตารางพร้อมกัน
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 2. บันทึกข้อมูลใบสมัครเข้าตาราง writers ก่อน และเอา writer_id กลับออกมา
	var writerID int
	queryWriter := `
		INSERT INTO writers (user_id, name_lastname, pen_name, bio, email_writer, contact_info, status, applied_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
		RETURNING writer_id
	`
	err = tx.QueryRowContext(ctx, queryWriter, userID, req.NameLastname, req.PenName, req.Bio, req.EmailWriter, contactJSON).Scan(&writerID)
	if err != nil {
		return err
	}

	// 3. วนลูปเอาหมวดหมู่ที่นักเขียนติ๊กเลือก บันทึกลงตาราง writer_categories
	if len(req.CategoryIDs) > 0 {
		queryCategory := `INSERT INTO writer_categories (writer_id, category_id) VALUES ($1, $2)`
		for _, catID := range req.CategoryIDs {
			_, err := tx.ExecContext(ctx, queryCategory, writerID, catID)
			if err != nil {
				return err
			}
		}
	}

	// 4. บันทึกทุกอย่างพร้อมกันลงฐานข้อมูล
	return tx.Commit()
}

// 🔍 2. แอดมินดึงรายการคำขอทั้งหมดที่ยังไม่อนุมัติ (status = 'pending')
func (r *sqlWriterRepository) GetPendingRequests(ctx context.Context) ([]dto.WriterRequestResponse, error) {
	query := `
		SELECT w.writer_id, w.user_id, u.username, w.name_lastname, w.pen_name, w.bio, w.email_writer, w.contact_info::text, w.status, w.applied_at
		FROM writers w
		JOIN users u ON w.user_id = u.user_id
		WHERE w.status = 'pending'
		ORDER BY w.applied_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []dto.WriterRequestResponse
	for rows.Next() {
		var resp dto.WriterRequestResponse
		err := rows.Scan(&resp.WriterID, &resp.UserID, &resp.Username, &resp.NameLastname, &resp.PenName, &resp.Bio, &resp.EmailWriter, &resp.ContactInfo, &resp.Status, &resp.AppliedAt)
		if err != nil {
			return nil, err
		}
		requests = append(requests, resp)
	}
	return requests, nil
}

// 🎯 3. แอดมินกดอนุมัติ (อัปเดตตาราง writers และปรับ role ตาราง users เป็น 'writer' พร้อมกัน)
func (r *sqlWriterRepository) ApproveWriter(ctx context.Context, writerID uint) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var userID uint
	queryUpdateWriter := `
		UPDATE writers 
		SET status = 'approved', approved_at = NOW() 
		WHERE writer_id = $1 
		RETURNING user_id
	`
	err = tx.QueryRowContext(ctx, queryUpdateWriter, writerID).Scan(&userID)
	if err != nil {
		return err
	}

	queryUpdateUser := `UPDATE users SET role = 'writer', updated_at = NOW() WHERE user_id = $1`
	_, err = tx.ExecContext(ctx, queryUpdateUser, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ❌ แอดมินกดปฏิเสธคำขอ (อัปเดตสถานะในตาราง writers เป็น 'rejected')
func (r *sqlWriterRepository) RejectWriter(ctx context.Context, writerID uint) error {
	query := `
		UPDATE writers 
		SET status = 'rejected' 
		WHERE writer_id = $1 AND status = 'pending'
	`
	_, err := r.db.ExecContext(ctx, query, writerID)
	return err
}
