package repository

import (
	"database/sql"
	"novel-be/internal/models"
)

// ======= Reading Repository Methods =======

func (r *postgresReadingRepository) GetReadingProgress(userID, novelID int) (*models.ReadingProgress, error) {
	row := r.db.QueryRow(`
		SELECT progress_id, user_id, novel_id, current_scene_id, updated_at
		FROM reading_progress
		WHERE user_id = $1 AND novel_id = $2
	`, userID, novelID)

	var progress models.ReadingProgress

	err := row.Scan(
		&progress.ProgressID,
		&progress.UserID,
		&progress.NovelID,
		&progress.CurrentSceneID,
		&progress.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return &progress, nil
}

func (r *postgresReadingRepository) SaveReadingProgress(userID, novelID, sceneID int) error {
	// 1. เริ่มทำ Transaction (เพื่อให้แน่ใจว่าบันทึกลง 2 ตารางพร้อมกันแบบไม่ตกหล่น)
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	// ถ้ามีอะไรผิดพลาดกลางทาง ให้ Rollback ยกเลิกคำสั่งทั้งหมด
	defer tx.Rollback()

	// 2. คำสั่งที่ 1: เซฟจุดปัจจุบัน (อัปเดต Bookmark ค้างไว้)
	progressQuery := `
		INSERT INTO reading_progress (
			user_id,
			novel_id,
			current_scene_id,
			updated_at
		)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, novel_id)
		DO UPDATE SET
			current_scene_id = EXCLUDED.current_scene_id,
			updated_at = CURRENT_TIMESTAMP
	`
	if _, err := tx.Exec(progressQuery, userID, novelID, sceneID); err != nil {
		return err
	}

	// 3. คำสั่งที่ 2: ปลดล็อกฉากลงประวัติ (เพื่อให้หน้า Story Map เห็นว่าอ่านผ่านแล้ว)
	// ใช้ ON CONFLICT DO NOTHING ถ้านักอ่านเดินวนกลับมาฉากเดิม จะได้ไม่ Error
	historyQuery := `
		INSERT INTO user_scene_history (
			user_id, 
			scene_id, 
			visited_at
		)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, scene_id) DO NOTHING
	`
	if _, err := tx.Exec(historyQuery, userID, sceneID); err != nil {
		return err
	}

	// 4. ถ้าผ่านทั้ง 2 คำสั่ง ให้ยืนยัน (Commit) บันทึกลง Database จริงๆ
	return tx.Commit()
}

func (r *postgresReadingRepository) InsertSceneHistory(userID int, sceneID int) error {
	query := `
		INSERT INTO user_scene_history (user_id, scene_id, visited_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, scene_id) DO NOTHING
	`

	_, err := r.db.Exec(query, userID, sceneID)
	return err
}

func (r *postgresReadingRepository) InsertChoiceHistory(history models.ChoiceHistory) error {
	query := `
		INSERT INTO user_choice_history (
			user_id,
			choice_id
		)
		VALUES ($1, $2)
	`

	_, err := r.db.Exec(query, history.UserID, history.ChoiceID)

	return err
}

func (r *postgresReadingRepository) InsertUserEnding(userID, novelID, sceneID int) error {
	// ใช้ ON CONFLICT DO NOTHING เพื่อที่ว่าถ้านักอ่านกดอ่านซ้ำ จะได้ไม่ขึ้น Error แจ้งเตือนซ้ำซ้อน
	query := `
		INSERT INTO user_endings (user_id, scene_id) 
		VALUES ($1, $2) 
		ON CONFLICT (user_id, scene_id) DO NOTHING
	`
	_, err := r.db.Exec(query, userID, sceneID)
	return err
}
